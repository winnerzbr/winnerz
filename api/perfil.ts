/**
 * Uma Jornada mostrada no perfil público, com as fotos dos momentos.
 *
 *   GET /api/perfil?h=<@>&j=<jogo>&k=<código do link, opcional>
 *   GET /api/perfil?h=<@>&museu=1&k=<código do link, opcional>   → o Museu aberto no perfil (migração 0015)
 *   GET /api/perfil?h=<@>&p=1&k=<código do link, opcional>       → o perfil inteiro, com o mural de cenas (migração 0016)
 *
 * Quem decide o que pode ser visto é a função public_journey do banco (migração 0013): ela só devolve a Jornada
 * se a pessoa marcou "Mostrar no meu perfil" e se quem pede pode ver o pilar Jornada. Aqui só assinamos os
 * endereços temporários das fotos (o Storage é privado), por 1 hora.
 */

type Req = { method?: string; query?: Record<string, string | string[] | undefined>; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void };

const BUCKET = 'momentos';
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } as Record<string, string> };
}

type Ev = { imagePath?: string | null; image?: string };

/** Assina por 1 hora os caminhos das fotos e troca imagePath por image (nunca devolve o caminho). */
async function signAll(c: { url: string; headers: Record<string, string> }, items: Ev[]) {
  const paths = [...new Set(items.map((e) => e.imagePath).filter((x): x is string => !!x))];
  let map = new Map<string, string>();
  if (paths.length) {
    const s = await fetch(`${c.url}/storage/v1/object/sign/${BUCKET}`, { method: 'POST', headers: c.headers, body: JSON.stringify({ expiresIn: 3600, paths }) });
    const signed = s.ok ? ((await s.json()) as { path?: string; signedURL?: string }[]) : [];
    map = new Map(signed.filter((x) => x.path && x.signedURL).map((x) => [x.path!, `${c.url}/storage/v1${x.signedURL}`]));
  }
  for (const e of items) { if (e.imagePath) e.image = map.get(e.imagePath); delete e.imagePath; }
}

/**
 * Quem está pedindo (se mandou o token da conta). Serve só para respeitar o bloqueio: quem foi bloqueado
 * não vê o perfil de quem bloqueou enquanto estiver na própria conta (migração 0024).
 */
async function viewerId(c: { url: string; headers: Record<string, string> }, req: Req): Promise<string | null> {
  const auth = one(req.headers?.authorization ?? req.headers?.Authorization);
  const token = /^Bearer\s+(.+)$/i.exec(auth)?.[1];
  if (!token) return null;
  try {
    const r = await fetch(`${c.url}/auth/v1/user`, { headers: { apikey: c.headers.apikey, Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const u = (await r.json()) as { id?: string };
    return u.id ?? null;
  } catch { return null; }
}

async function blocked(c: { url: string; headers: Record<string, string> }, handle: string, viewer: string | null): Promise<boolean> {
  if (!viewer) return false;
  try {
    const r = await fetch(`${c.url}/rest/v1/rpc/viewer_blocked`, { method: 'POST', headers: c.headers, body: JSON.stringify({ p_handle: handle, p_viewer: viewer }) });
    return r.ok ? (await r.json()) === true : false; // sem a 0024 ainda, ninguém está bloqueado
  } catch { return false; }
}

export default async function handler(req: Req, res: Res) {
  const c = db();
  if (!c) return res.status(503).json({ error: 'O servidor ainda não tem SUPABASE_URL e SUPABASE_SECRET_KEY.' });
  if (req.method && req.method !== 'GET') return res.status(405).json({ error: 'Método não aceito.' });
  const h = one(req.query?.h).slice(0, 40), j = one(req.query?.j).slice(0, 120), k = one(req.query?.k).slice(0, 64);
  if (h && (await blocked(c, h, await viewerId(c, req)))) return res.status(404).json({ error: 'not_found' });
  if (h && one(req.query?.p) === '1') {
    try {
      const r = await fetch(`${c.url}/rest/v1/rpc/public_profile_v4`, { method: 'POST', headers: c.headers, body: JSON.stringify({ p_handle: h, p_key: k || null }) });
      if (!r.ok) return res.status(r.status === 404 ? 501 : 502).json({ error: 'Para o perfil novo, rode a migração 0016 no Supabase.' });
      const data = (await r.json()) as { mural?: Ev[] } | null;
      res.setHeader('Cache-Control', 'private, max-age=60');
      if (!data) return res.status(404).json({ error: 'not_found' });
      await signAll(c, data.mural ?? []);
      if (data.mural) data.mural = data.mural.filter((e) => e.image);
      return res.status(200).json(data);
    } catch {
      return res.status(500).json({ error: 'Não consegui carregar o perfil.' });
    }
  }
  if (h && one(req.query?.museu) === '1') {
    try {
      const r = await fetch(`${c.url}/rest/v1/rpc/public_museum`, { method: 'POST', headers: c.headers, body: JSON.stringify({ p_handle: h, p_key: k || null }) });
      if (!r.ok) return res.status(r.status === 404 ? 503 : 502).json({ error: 'Para mostrar o Museu no perfil, rode a migração 0015 no Supabase.' });
      const data = (await r.json()) as { rooms?: { pieces?: Ev[] }[] } | null;
      res.setHeader('Cache-Control', 'private, max-age=60');
      if (!data) return res.status(404).json({ error: 'not_found' });
      await signAll(c, (data.rooms ?? []).flatMap((x) => x.pieces ?? []));
      return res.status(200).json(data);
    } catch {
      return res.status(500).json({ error: 'Não consegui carregar o Museu.' });
    }
  }
  if (!h || !j) return res.status(400).json({ error: 'Faltou o perfil ou o jogo.' });
  try {
    const r = await fetch(`${c.url}/rest/v1/rpc/public_journey`, { method: 'POST', headers: c.headers, body: JSON.stringify({ p_handle: h, p_key: k || null, p_slug: j }) });
    if (!r.ok) return res.status(r.status === 404 ? 503 : 502).json({ error: 'Para mostrar Jornadas no perfil, rode a migração 0013 no Supabase.' });
    const data = (await r.json()) as { events?: Ev[] } | null;
    res.setHeader('Cache-Control', 'private, max-age=60');
    if (!data) return res.status(404).json({ error: 'not_found' });
    await signAll(c, data.events ?? []);
    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ error: 'Não consegui carregar a Jornada.' });
  }
}
