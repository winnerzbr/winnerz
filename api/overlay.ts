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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sign(text: string): Promise<string> {
  const secret = process.env.RADAR_SECRET || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`overlay:${text}`)));
  return [...mac.slice(0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Valor seguro dentro de um filtro do PostgREST. */
const q = (v: string) => encodeURIComponent(v);

async function get(path: string): Promise<any[]> {
  const c = db()!;
  const r = await fetch(`${c.url}/rest/v1/${path}`, { headers: c.headers });
  return r.ok ? ((await r.json()) as any[]) : [];
}

/** Só assina foto da própria pessoa (momentos/<id da pessoa>/...), nunca caminho com "..". */
async function signedPhoto(user: string, path?: string | null): Promise<string | null> {
  if (!path || !path.startsWith(`${user}/`) || path.split('/').some((p) => p === '..' || p === '.' || !p)) return null;
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
      const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}) as { rotate?: boolean };
      // Um "segredo do link" guardado no perfil: gerar de novo invalida o endereço antigo.
      const [p] = await get(`profiles?select=prefs&id=eq.${q(user)}`);
      let nonce: string = p?.prefs?.overlayNonce ?? '';
      if (!nonce || body.rotate) {
        nonce = [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('');
        const c = db()!;
        await fetch(`${c.url}/rest/v1/profiles?id=eq.${q(user)}`, { method: 'PATCH', headers: { ...c.headers, Prefer: 'return=minimal' }, body: JSON.stringify({ prefs: { ...(p?.prefs ?? {}), overlayNonce: nonce } }) });
      }
      return res.status(200).json({ path: `/overlay/${user}.${nonce}.${await sign(`${user}.${nonce}`)}` });
    }
    const k = typeof req.query.k === 'string' ? req.query.k : '';
    const [user, nonce, sig] = k.split('.');
    if (!user || !UUID.test(user) || !nonce || !/^[0-9a-f]{16}$/.test(nonce) || sig !== (await sign(`${user}.${nonce}`))) return res.status(403).json({ error: 'Endereço do overlay inválido.' });

    const [profile] = await get(`profiles?select=prefs&id=eq.${q(user)}`);
    if (profile?.prefs?.overlayNonce !== nonce) return res.status(403).json({ error: 'Este endereço foi trocado. Gere o novo nas Preferências.' });
    const [open] = await get(`sessions?select=journey_id,started_at&user_id=eq.${q(user)}&ended_at=is.null&order=started_at.desc&limit=1`);
    const prefs = profile?.prefs ?? {};
    const focus: unknown[] = Array.isArray(prefs.focusIds) ? prefs.focusIds : prefs.focusJourneyId ? [prefs.focusJourneyId] : [];
    // Nada do que vem das preferências entra num filtro sem conferir: só um id no formato certo.
    const candidate = [open?.journey_id, ...focus].find((x): x is string => typeof x === 'string' && UUID.test(x));
    const empty = { game: null, session: null, moment: null };
    if (!candidate) return res.status(200).json(empty);
    const [journey] = await get(`journeys?select=id,game_id&id=eq.${q(candidate)}&user_id=eq.${q(user)}`);
    if (!journey) return res.status(200).json(empty);
    const jid = String(journey.id);
    const [game] = await get(`games?select=title,cover&id=eq.${q(String(journey.game_id))}`);
    const sessions = open && open.journey_id === jid ? await get(`sessions?select=id&journey_id=eq.${q(jid)}&user_id=eq.${q(user)}`) : [];
    const [moment] = await get(`timeline_events?select=title,image_path,kind&journey_id=eq.${q(jid)}&user_id=eq.${q(user)}&kind=in.(momento,ponto)&order=at.desc&limit=1`);
    // Só o que aparece na tela da live: sem notas, sem datas.
    return res.status(200).json({
      game: game ? { title: game.title, cover: game.cover } : null,
      session: open && open.journey_id === jid ? { startedAt: open.started_at, number: sessions.length } : null,
      moment: moment ? { title: moment.title, image: await signedPhoto(user, moment.image_path), kind: moment.kind } : null,
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Algo deu errado.' });
  }
}
