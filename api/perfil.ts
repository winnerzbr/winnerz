/**
 * Uma Jornada mostrada no perfil público, com as fotos dos momentos.
 *
 *   GET /api/perfil?h=<@>&j=<jogo>&k=<código do link, opcional>
 *   GET /api/perfil?h=<@>&museu=1&k=<código do link, opcional>   → o Museu aberto no perfil (migração 0015)
 *   GET /api/perfil?h=<@>&p=1&k=<código do link, opcional>       → o perfil inteiro, com o mural de cenas (migração 0016)
 *   GET /api/perfil?t=<código>                                    → um trecho compartilhado da Jornada (migração 0049)
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

/** Id da conta dona do @ (para só assinar fotos que estão na pasta dela). */
async function ownerOf(c: { url: string; headers: Record<string, string> }, handle: string | null | undefined): Promise<string | null> {
  if (!handle) return null;
  try {
    // O @ vale sem diferença de maiúsculas (como nas funções do banco); confere o igual exato depois do ilike.
    const r = await fetch(`${c.url}/rest/v1/profiles?select=id,handle&handle=ilike.${encodeURIComponent(handle)}&limit=20`, { headers: c.headers });
    const rows = r.ok ? ((await r.json()) as { id?: string; handle?: string }[]) : [];
    return rows.find((x) => x.handle?.toLowerCase() === handle.toLowerCase())?.id ?? null;
  } catch { return null; }
}

/**
 * Assina por 1 hora os caminhos das fotos e troca imagePath por image (nunca devolve o caminho).
 * Só assina o que está na pasta do dono do perfil ("<id>/..."): uma foto de outra pessoa nunca sai daqui.
 */
async function signAll(c: { url: string; headers: Record<string, string> }, items: Ev[], owner: string | null) {
  for (const e of items) if (e.imagePath && (!owner || !e.imagePath.startsWith(`${owner}/`))) delete e.imagePath;
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
  const t = one(req.query?.t).slice(0, 40);
  if (t) {
    // Um trecho: quem decide é a snip_get (bloqueio, moderação, suspensão); aqui só assinamos a foto.
    try {
      const viewer = await viewerId(c, req);
      const r = await fetch(`${c.url}/rest/v1/rpc/snip_get`, { method: 'POST', headers: c.headers, body: JSON.stringify({ p_token: t, p_viewer: viewer }) });
      if (!r.ok) return res.status(r.status === 404 ? 503 : 502).json({ error: 'Para abrir trechos, rode a migração 0049 no Supabase.' });
      const data = (await r.json()) as (Ev & { owner?: { handle?: string } }) | null;
      res.setHeader('Cache-Control', 'private, no-store');
      if (!data) return res.status(404).json({ error: 'not_found' });
      await signAll(c, [data], await ownerOf(c, data.owner?.handle));
      return res.status(200).json(data);
    } catch {
      return res.status(500).json({ error: 'Não consegui carregar o trecho.' });
    }
  }
  const viewer = h ? await viewerId(c, req) : null;
  if (h && (await blocked(c, h, viewer))) return res.status(404).json({ error: 'not_found' });
  // Com a conta de quem pede, valem as regras de "só amigos" (migração 0025); sem ela, cai na função de sempre.
  const rpc = async (fn: string, body: Record<string, unknown>, asFn = `${fn}_as`) => {
    if (viewer) {
      const r = await fetch(`${c.url}/rest/v1/rpc/${asFn}`, { method: 'POST', headers: c.headers, body: JSON.stringify({ ...body, p_viewer: viewer }) });
      if (r.status !== 404) return r;
    }
    return fetch(`${c.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: c.headers, body: JSON.stringify(body) });
  };
  if (h && one(req.query?.p) === '1') {
    try {
      const r = await rpc('public_profile_v4', { p_handle: h, p_key: k || null }, 'public_profile_as');
      if (!r.ok) return res.status(r.status === 404 ? 501 : 502).json({ error: 'Para o perfil novo, rode a migração 0016 no Supabase.' });
      const data = (await r.json()) as { mural?: Ev[] } | null;
      res.setHeader('Cache-Control', viewer ? 'private, no-store' : 'private, max-age=60');
      if (!data) return res.status(404).json({ error: 'not_found' });
      await signAll(c, data.mural ?? [], await ownerOf(c, h));
      if (data.mural) data.mural = data.mural.filter((e) => e.image);
      return res.status(200).json(data);
    } catch {
      return res.status(500).json({ error: 'Não consegui carregar o perfil.' });
    }
  }
  if (h && one(req.query?.museu) === '1') {
    try {
      const r = await rpc('public_museum', { p_handle: h, p_key: k || null });
      if (!r.ok) return res.status(r.status === 404 ? 503 : 502).json({ error: 'Para mostrar o Museu no perfil, rode a migração 0015 no Supabase.' });
      const data = (await r.json()) as { rooms?: { pieces?: Ev[] }[] } | null;
      res.setHeader('Cache-Control', viewer ? 'private, no-store' : 'private, max-age=60');
      if (!data) return res.status(404).json({ error: 'not_found' });
      await signAll(c, (data.rooms ?? []).flatMap((x) => x.pieces ?? []), await ownerOf(c, h));
      return res.status(200).json(data);
    } catch {
      return res.status(500).json({ error: 'Não consegui carregar o Museu.' });
    }
  }
  if (!h || !j) return res.status(400).json({ error: 'Faltou o perfil ou o jogo.' });
  try {
    const r = await rpc('public_journey', { p_handle: h, p_key: k || null, p_slug: j });
    if (!r.ok) return res.status(r.status === 404 ? 503 : 502).json({ error: 'Para mostrar Jornadas no perfil, rode a migração 0013 no Supabase.' });
    const data = (await r.json()) as { events?: Ev[] } | null;
    res.setHeader('Cache-Control', viewer ? 'private, no-store' : 'private, max-age=60');
    if (!data) return res.status(404).json({ error: 'not_found' });
    await signAll(c, data.events ?? [], await ownerOf(c, h));
    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ error: 'Não consegui carregar a Jornada.' });
  }
}
