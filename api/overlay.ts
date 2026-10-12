/**
 * Overlay de live (fonte de navegador do OBS): o jogo em foco, a sessão aberta e o último momento guardado.
 * O OBS não tem o seu login, então o endereço leva uma assinatura (como o calendário do Radar).
 *
 *   POST /api/overlay {link:true}   (com login) → { path: "/overlay/<id>.<assinatura>" }
 *   GET  /api/overlay?k=<id>.<sig>             → dados públicos mínimos para o overlay
 *
 * Só sai o que aparece na tela da live: título e capa do jogo, horário de início da sessão, o último momento.
 */

type Req = { method?: string; query: Record<string, string | string[] | undefined>; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void };

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const headers: Record<string, string> = { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json' };
  return { url, key, headers };
}
const header = (req: Req, k: string) => { const v = req.headers?.[k] ?? req.headers?.[k.toLowerCase()]; return Array.isArray(v) ? v[0] : v; };

async function requireUser(req: Req): Promise<string | null> {
  const c = db();
  const token = (header(req, 'authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!c || !token) return null;
  const r = await fetch(`${c.url}/auth/v1/user`, { headers: { apikey: c.headers.apikey, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return ((await r.json()) as { id?: string }).id ?? null;
}

async function sign(text: string): Promise<string> {
  const secret = process.env.RADAR_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`overlay:${text}`)));
  return [...mac.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function get(path: string): Promise<any[]> {
  const c = db()!;
  const r = await fetch(`${c.url}/rest/v1/${path}`, { headers: c.headers });
  return r.ok ? ((await r.json()) as any[]) : [];
}

async function signedPhoto(path?: string | null): Promise<string | null> {
  if (!path) return null;
  const c = db()!;
  const r = await fetch(`${c.url}/storage/v1/object/sign/momentos/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: c.headers, body: JSON.stringify({ expiresIn: 3600 }) });
  if (!r.ok) return null;
  const j = (await r.json()) as { signedURL?: string; signedUrl?: string };
  const u = j.signedURL ?? j.signedUrl;
  return u ? `${c.url}/storage/v1${u.startsWith('/') ? '' : '/'}${u}` : null;
}

export default async function handler(req: Req, res: Res) {
  try {
    res.setHeader('Cache-Control', 'no-store');
    if (!db()) return res.status(503).json({ error: 'Banco não configurado.' });
    if (req.method === 'POST') {
      const user = await requireUser(req);
      if (!user) return res.status(401).json({ error: 'Entre na sua conta.' });
      return res.status(200).json({ path: `/overlay/${user}.${await sign(user)}` });
    }
    const k = typeof req.query.k === 'string' ? req.query.k : '';
    const [user, sig] = k.split('.');
    if (!user || !/^[0-9a-f-]{36}$/i.test(user) || sig !== (await sign(user))) return res.status(403).json({ error: 'Endereço do overlay inválido.' });

    const [profile] = await get(`profiles?select=prefs&id=eq.${user}`);
    const [open] = await get(`sessions?select=id,journey_id,history_id,started_at&user_id=eq.${user}&ended_at=is.null&order=started_at.desc&limit=1`);
    const focus: string[] = profile?.prefs?.focusIds ?? (profile?.prefs?.focusJourneyId ? [profile.prefs.focusJourneyId] : []);
    const journeyId: string | undefined = open?.journey_id ?? focus[0];
    if (!journeyId) return res.status(200).json({ game: null, session: null, moment: null });
    const [journey] = await get(`journeys?select=id,game_id&id=eq.${journeyId}&user_id=eq.${user}`);
    if (!journey) return res.status(200).json({ game: null, session: null, moment: null });
    const [game] = await get(`games?select=title,cover,slug&id=eq.${encodeURIComponent(journey.game_id)}`);
    const sessions = await get(`sessions?select=id&journey_id=eq.${journeyId}&user_id=eq.${user}`);
    const [moment] = await get(`timeline_events?select=title,quote,text,image_path,at,kind&journey_id=eq.${journeyId}&user_id=eq.${user}&kind=in.(momento,ponto)&order=at.desc&limit=1`);
    return res.status(200).json({
      game: game ? { title: game.title, cover: game.cover } : null,
      session: open ? { startedAt: open.started_at, number: sessions.length } : null,
      moment: moment ? { title: moment.title, text: moment.quote ?? moment.text ?? null, at: moment.at, image: await signedPhoto(moment.image_path), kind: moment.kind } : null,
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Algo deu errado.' });
  }
}
