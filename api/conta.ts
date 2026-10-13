/**
 * Apagar a conta (LGPD), com prazo para desistir.
 *
 *   GET  /api/conta              (com login)  → { deleteAfter: ISO | null }
 *   POST /api/conta              (com login)  { action: "agendar" | "cancelar" }
 *   GET  /api/conta?purge=1      (agendado pela Vercel, uma vez por dia) → apaga as contas cujo prazo venceu
 *
 * Ao agendar, a conta continua funcionando por 7 dias. Depois disso, a rotina diária apaga as fotos
 * da pessoa no Storage e o usuário; o banco apaga o resto em cascata (Jornadas, coleção, notas, votos).
 * Usa SUPABASE_URL + SUPABASE_SECRET_KEY (as mesmas do IGDB). CRON_SECRET, se existir, protege a rotina.
 */

type Req = { method?: string; body?: unknown; query?: Record<string, string | string[] | undefined>; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void };

const GRACE_DAYS = 7;
const BUCKET = 'momentos';

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const headers: Record<string, string> = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  return { url, headers };
}
const header = (req: Req, k: string) => { const v = req.headers?.[k] ?? req.headers?.[k.toLowerCase()]; return Array.isArray(v) ? v[0] : v; };

type AdminUser = { id: string; app_metadata?: Record<string, unknown> };

async function requireUser(req: Req): Promise<string | null> {
  const c = db();
  const token = (header(req, 'authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!c || !token) return null;
  const r = await fetch(`${c.url}/auth/v1/user`, { headers: { apikey: c.headers.apikey, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return ((await r.json()) as { id?: string }).id ?? null;
}

async function getUser(id: string): Promise<AdminUser> {
  const c = db()!;
  const r = await fetch(`${c.url}/auth/v1/admin/users/${id}`, { headers: c.headers });
  if (!r.ok) throw new Error(`auth ${r.status}`);
  return (await r.json()) as AdminUser;
}

async function setDeleteAfter(id: string, when: string | null) {
  const c = db()!;
  const u = await getUser(id);
  const app_metadata = { ...(u.app_metadata ?? {}), delete_after: when };
  const r = await fetch(`${c.url}/auth/v1/admin/users/${id}`, { method: 'PUT', headers: c.headers, body: JSON.stringify({ app_metadata }) });
  if (!r.ok) throw new Error(`auth ${r.status}`);
}

/** Todas as fotos da pessoa (pasta <id>/ no bucket), em lotes. */
async function removePhotos(id: string) {
  const c = db()!;
  for (let round = 0; round < 50; round++) {
    const r = await fetch(`${c.url}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: c.headers, body: JSON.stringify({ prefix: `${id}/`, limit: 1000, offset: 0 }) });
    if (!r.ok) return;
    const items = ((await r.json()) as { name: string }[]).filter((x) => x.name);
    if (!items.length) return;
    await fetch(`${c.url}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: c.headers, body: JSON.stringify({ prefixes: items.map((x) => `${id}/${x.name}`) }) });
    if (items.length < 1000) return;
  }
}

async function purge(): Promise<number> {
  const c = db()!;
  let removed = 0;
  const now = Date.now();
  const due: string[] = [];
  for (let page = 1; page <= 50; page++) {
    const r = await fetch(`${c.url}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: c.headers });
    if (!r.ok) break;
    const users = ((await r.json()) as { users?: AdminUser[] }).users ?? [];
    for (const u of users) {
      const when = u.app_metadata?.delete_after;
      if (typeof when === 'string' && Date.parse(when) <= now) due.push(u.id);
    }
    if (users.length < 200) break;
  }
  for (const id of due) {
    await removePhotos(id);
    const r = await fetch(`${c.url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: c.headers });
    if (r.ok) removed++;
  }
  return removed;
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!db()) return res.status(503).json({ error: 'O servidor ainda não tem SUPABASE_URL e SUPABASE_SECRET_KEY.' });
  try {
    const q = req.query ?? {};
    if (req.method === 'GET' && q.purge) {
      const secret = process.env.CRON_SECRET;
      if (secret && header(req, 'authorization') !== `Bearer ${secret}`) return res.status(401).json({ error: 'Sem permissão.' });
      return res.status(200).json({ removed: await purge() });
    }
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ error: 'Entre na sua conta.' });
    if (req.method === 'GET') {
      const u = await getUser(user);
      const when = u.app_metadata?.delete_after;
      return res.status(200).json({ deleteAfter: typeof when === 'string' ? when : null, graceDays: GRACE_DAYS });
    }
    if (req.method === 'POST') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as { action?: string } | undefined;
      if (body?.action === 'agendar') {
        const when = new Date(Date.now() + GRACE_DAYS * 86400000).toISOString();
        await setDeleteAfter(user, when);
        return res.status(200).json({ deleteAfter: when });
      }
      if (body?.action === 'cancelar') {
        await setDeleteAfter(user, null);
        return res.status(200).json({ deleteAfter: null });
      }
      return res.status(400).json({ error: 'Ação desconhecida.' });
    }
    return res.status(405).json({ error: 'Método não aceito.' });
  } catch (e) {
    return res.status(500).json({ error: e instanceof Error ? e.message : 'Falhou.' });
  }
}
