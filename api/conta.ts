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
 * Com RESEND_API_KEY e MAIL_FROM (ex.: "WinnerZ <entrar@winnerz.com.br>"), a pessoa recebe um e-mail
 * quando a exclusão é agendada e outro quando a conta é apagada. Sem elas, nada é enviado.
 */

type Req = { method?: string; body?: unknown; query?: Record<string, string | string[] | undefined>; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void };

const GRACE_DAYS = 7;
/** Pastas do Storage com arquivos da pessoa (cada uma usa <id da pessoa>/ como prefixo). */
const BUCKETS = ['momentos', 'avatares'];

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const headers: Record<string, string> = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  return { url, headers };
}
const header = (req: Req, k: string) => { const v = req.headers?.[k] ?? req.headers?.[k.toLowerCase()]; return Array.isArray(v) ? v[0] : v; };

type AdminUser = { id: string; email?: string; app_metadata?: Record<string, unknown> };

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
 * Apaga todos os arquivos da pessoa (pasta <id>/ em cada bucket) e confere que as pastas ficaram vazias.
 * Qualquer falha lança erro: aí a conta NÃO é apagada agora e a rotina tenta de novo no dia seguinte,
 * para nunca sobrar foto sem dono no Storage. Bucket que ainda não existe (migração não rodada) conta como vazio.
 */
async function removeFiles(id: string, bucket: string): Promise<void> {
  const c = db()!;
  const list = async () => {
    const r = await fetch(`${c.url}/storage/v1/object/list/${bucket}`, { method: 'POST', headers: c.headers, body: JSON.stringify({ prefix: `${id}/`, limit: 1000, offset: 0 }) });
    if (r.status === 400 || r.status === 404) {
      const t = await r.text().catch(() => '');
      if (/not.?found/i.test(t)) return null;
    }
    if (!r.ok) throw new Error(`listar arquivos (${bucket}): ${r.status}`);
    return ((await r.json()) as { name: string }[]).filter((x) => x.name);
  };
  for (let round = 0; round < 50; round++) {
    const items = await list();
    if (!items || !items.length) return;
    const r = await fetch(`${c.url}/storage/v1/object/${bucket}`, { method: 'DELETE', headers: c.headers, body: JSON.stringify({ prefixes: items.map((x) => `${id}/${x.name}`) }) });
    if (!r.ok) throw new Error(`apagar arquivos (${bucket}): ${r.status}`);
    const gone = (await r.json().catch(() => [])) as unknown[];
    if (Array.isArray(gone) && gone.length === 0) throw new Error(`apagar arquivos (${bucket}): nenhum foi removido`);
  }
  if ((await list())?.length) throw new Error(`apagar arquivos (${bucket}): ainda restam arquivos`);
}
async function removePhotos(id: string): Promise<void> {
  for (const b of BUCKETS) await removeFiles(id, b);
}

/** E-mail pelo Resend (opcional). Nunca derruba o pedido: se falhar, só fica no log. */
async function mail(to: string | undefined, subject: string, title: string, lines: string[]) {
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
  if (!key || !from || !to) return;
  const esc = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
  const html = `<div style="background:#07080A;padding:32px 16px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:520px;margin:0 auto;background:#111318;border:1px solid #23262d;border-radius:18px;padding:32px;color:#F3EBDD">`
    + `<h1 style="margin:0 0 14px;font-size:22px">${esc(title)}</h1>${lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#C9C1B3">${esc(l)}</p>`).join('')}`
    + `</div><p style="text-align:center;margin:16px 0 0;font-size:12px;color:#5E5A53">WinnerZ · Onde jogos viram histórias.</p></div>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, text: [title, '', ...lines].join('\n') }),
    });
    if (!r.ok) console.error('resend', r.status, (await r.text().catch(() => '')).slice(0, 200));
  } catch (e) { console.error('resend', e instanceof Error ? e.message : e); }
}
const dateBR = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: 'numeric', month: 'long', year: 'numeric' });

async function purge(): Promise<{ removed: number; failed: number }> {
  const c = db()!;
  let removed = 0, failed = 0;
  const now = Date.now();
  const due: { id: string; email?: string }[] = [];
  for (let page = 1; page <= 50; page++) {
    const r = await fetch(`${c.url}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: c.headers });
    if (!r.ok) throw new Error(`listar contas: ${r.status}`);
    const users = ((await r.json()) as { users?: AdminUser[] }).users ?? [];
    for (const u of users) {
      const when = u.app_metadata?.delete_after;
      if (typeof when === 'string' && Date.parse(when) <= now) due.push({ id: u.id, email: u.email });
    }
    if (users.length < 200) break;
  }
  for (const { id, email } of due) {
    try {
      // Só apaga a conta depois de confirmar que as fotos sumiram; se algo falhar, fica para amanhã.
      await removePhotos(id);
      const r = await fetch(`${c.url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: c.headers });
      if (!r.ok) throw new Error(`apagar conta: ${r.status}`);
      removed++;
      await mail(email, 'Sua conta do WinnerZ foi apagada', 'Conta apagada', [
        'Como você pediu, a sua conta do WinnerZ foi apagada, com as Jornadas, a coleção, as notas, as fotos e todo o resto.',
        'Se um dia quiser voltar, é só criar uma conta nova com este e-mail. Obrigado por ter jogado com a gente.',
      ]);
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
        const u = await getUser(user).catch(() => null);
        await mail(u?.email, 'Sua conta do WinnerZ será apagada', 'A exclusão da sua conta foi agendada', [
          `Recebemos o seu pedido. A conta e tudo o que está nela serão apagados em ${dateBR(when)}.`,
          'Até lá ela continua funcionando. Mudou de ideia? Entre no site e, em Preferências → Conta, toque em "Desistir de apagar".',
          'Se não foi você que pediu, entre no site e cancele agora.',
        ]);
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
