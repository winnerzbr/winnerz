/**
 * Apagar a conta (LGPD), com prazo para desistir.
 *
 *   GET  /api/conta              (com login)  → { deleteAfter: ISO | null }
 *   POST /api/conta              (com login)  { action: "agendar" | "cancelar" }
 *   GET  /api/conta?purge=1      (agendado pela Vercel, uma vez por dia) → apaga as contas cujo prazo venceu
 *
 * Ao agendar, a conta continua funcionando por 7 dias. Depois disso, a rotina diária apaga as fotos
 * da pessoa no Storage e o usuário; o banco apaga o resto em cascata (Jornadas, coleção, notas, votos).
 * Usa SUPABASE_URL + SUPABASE_SECRET_KEY (as mesmas do IGDB). A rotina só roda com CRON_SECRET configurado
 * (a Vercel manda esse segredo sozinha nas chamadas agendadas); sem ele, fica desligada.
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

/**
 * Apaga todas as fotos da pessoa (pasta <id>/ no bucket) e confere que a pasta ficou vazia.
 * Qualquer falha lança erro: aí a conta NÃO é apagada agora e a rotina tenta de novo no dia seguinte,
 * para nunca sobrar foto sem dono no Storage.
 */
async function removePhotos(id: string): Promise<void> {
  const c = db()!;
  const list = async () => {
    const r = await fetch(`${c.url}/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: c.headers, body: JSON.stringify({ prefix: `${id}/`, limit: 1000, offset: 0 }) });
    if (!r.ok) throw new Error(`listar fotos: ${r.status}`);
    return ((await r.json()) as { name: string }[]).filter((x) => x.name);
  };
  for (let round = 0; round < 50; round++) {
    const items = await list();
    if (!items.length) return;
    const r = await fetch(`${c.url}/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: c.headers, body: JSON.stringify({ prefixes: items.map((x) => `${id}/${x.name}`) }) });
    if (!r.ok) throw new Error(`apagar fotos: ${r.status}`);
    const gone = (await r.json().catch(() => [])) as unknown[];
    if (Array.isArray(gone) && gone.length === 0) throw new Error('apagar fotos: nenhuma foi removida');
  }
  if ((await list()).length) throw new Error('apagar fotos: ainda restam fotos');
}

async function purge(): Promise<{ removed: number; failed: number }> {
  const c = db()!;
  let removed = 0, failed = 0;
  const now = Date.now();
  const due: string[] = [];
  for (let page = 1; page <= 50; page++) {
    const r = await fetch(`${c.url}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: c.headers });
    if (!r.ok) throw new Error(`listar contas: ${r.status}`);
    const users = ((await r.json()) as { users?: AdminUser[] }).users ?? [];
    for (const u of users) {
      const when = u.app_metadata?.delete_after;
      if (typeof when === 'string' && Date.parse(when) <= now) due.push(u.id);
    }
    if (users.length < 200) break;
  }
  for (const id of due) {
    try {
      // Só apaga a conta depois de confirmar que as fotos sumiram; se algo falhar, fica para amanhã.
      await removePhotos(id);
      const r = await fetch(`${c.url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: c.headers });
      if (!r.ok) throw new Error(`apagar conta: ${r.status}`);
      removed++;
    } catch (e) {
      failed++;
      console.error('conta: exclusão adiada para a próxima rodada', id, e instanceof Error ? e.message : e);
    }
  }
  return { removed, failed };
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!db()) return res.status(503).json({ error: 'O servidor ainda não tem SUPABASE_URL e SUPABASE_SECRET_KEY.' });
  try {
    const q = req.query ?? {};
    if (req.method === 'GET' && q.purge) {
      // Sem CRON_SECRET configurado, a rotina não roda: ninguém de fora consegue dispará-la.
      const secret = process.env.CRON_SECRET;
      if (!secret) return res.status(503).json({ error: 'Rotina desligada: falta a variável CRON_SECRET na Vercel.' });
      if (header(req, 'authorization') !== `Bearer ${secret}`) return res.status(401).json({ error: 'Sem permissão.' });
      return res.status(200).json(await purge());
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
