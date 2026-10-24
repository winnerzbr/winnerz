/**
 * Apagar a conta (LGPD), com prazo para desistir.
 *
 *   GET  /api/conta              (com login)  → { deleteAfter: ISO | null }
 *   POST /api/conta              (com login)  { action: "agendar" | "cancelar" }
 *   GET  /api/conta?purge=1      (agendado pela Vercel, uma vez por dia) → apaga as contas cujo prazo venceu
 *
 *   Modo TV (migração 0081): entrar na TV pelo celular.
 *   POST /api/conta  { tv: "novo" }                      (sem login, na TV)  → { code, secret, expiresIn }
 *   POST /api/conta  { tv: "aprovar", code }             (com login, no celular) → { ok: true }
 *   POST /api/conta  { tv: "esperar", code, secret }     (sem login, na TV)  → { pronto: false } | { pronto: true, tokenHash }
 *     Com o código confirmado (até 10 minutos), gera uma entrada de uso único para a conta (o "link mágico" do Supabase,
 *     sem enviar e-mail) e a TV entra com verifyOtp. O e-mail da conta nunca sai do servidor nem vai para o registro.
 *
 *   Entrar com a Steam (migração 0091). A Steam usa OpenID 2.0, que o Supabase não faz sozinho:
 *   GET  /steam/entrar?volta=/x           (reescrito para ?steam=entrar)  → manda para o login da Steam
 *   GET  /steam/volta                     (reescrito para ?steam=volta)   → a Steam devolve aqui; conferimos com a própria
 *        Steam (check_authentication), achamos ou criamos a conta e geramos uma entrada de uso único (o "link mágico",
 *        sem enviar e-mail). O site entra com ela em /entrar/steam (o número vai depois do #, fora dos registros).
 *        Só vale no navegador que começou: um cookie com um número aleatório, que também vai assinado no endereço de volta.
 *        Conta nova pela Steam ganha um e-mail interno (<SteamID>@steam.winnerz.com.br) que nunca recebe nada.
 *   POST /api/conta (com login) { steam: "ligar" }     → { url } para ligar a Steam à conta aberta (o pedido vai num cookie)
 *   POST /api/conta (com login) { steam: "desligar" }  → tira a Steam da conta (não vale para conta criada pela Steam)
 *   O nome da Steam vem da STEAM_API_KEY (a mesma do importador); sem ela, a conta nasce como "Jogador".
 *
 * Ao agendar, a conta continua funcionando por 7 dias. Depois disso, a rotina diária apaga as fotos
 * da pessoa no Storage (momentos, avatares e as imagens das conversas) e o usuário; o banco apaga o resto em cascata
 * (Jornadas, coleção, notas, votos). Postagens e respostas que receberam resposta de outras pessoas ficam, sem texto,
 * imagens nem nome (gatilho account_detach, migração 0029), para não apagar a conversa dos outros.
 * Usa SUPABASE_URL + SUPABASE_SECRET_KEY (as mesmas do IGDB). A rotina só roda com CRON_SECRET configurado
 * (a Vercel manda esse segredo sozinha nas chamadas agendadas); sem ele, fica desligada.
 * Com RESEND_API_KEY e MAIL_FROM (ex.: "WinnerZ <entrar@winnerz.com.br>"), a pessoa recebe um e-mail
 * quando a exclusão é agendada e outro quando a conta é apagada. Sem elas, nada é enviado.
 */

type Req = { method?: string; body?: unknown; query?: Record<string, string | string[] | undefined>; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string | string[]) => void; end?: () => void };

const GRACE_DAYS = 7;
const TV_MIN = 10;
const TV_LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
/** Pastas do Storage com arquivos da pessoa (cada uma usa <id da pessoa>/ como prefixo). */
const BUCKETS = ['momentos', 'avatares', 'comunidade'];

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
  if (!key || !from || !to || emailDaSteam(to)) return;
  const esc = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
  const html = `<div style="background:#07080A;padding:32px 16px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:520px;margin:0 auto;background:#111318;border:1px solid #23262d;border-radius:18px;padding:32px;color:#F3EBDD">`
    + `<h1 style="margin:0 0 14px;font-size:22px">${esc(title)}</h1>${lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#C9C1B3">${esc(l)}</p>`).join('')}`
    + `</div><p style="text-align:center;margin:16px 0 0;font-size:12px;color:#5E5A53">WinnerZ · Onde jogos viram histórias.</p></div>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, text: [title, '', ...lines].join('\n') }),
    });
    // Só o código: a resposta da Resend pode repetir o endereço de e-mail.
    if (!r.ok) console.error('resend', r.status);
  } catch (e) { console.error('resend', e instanceof Error ? e.name : typeof e); }
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
        'Como você pediu, a sua conta do WinnerZ foi apagada, com as Jornadas, a coleção, as notas, as fotos, as postagens e todo o resto.',
        'Se um dia quiser voltar, é só criar uma conta nova com este e-mail. Obrigado por ter jogado com a gente.',
      ]);
    } catch (e) {
      failed++;
      console.error('conta: exclusão adiada para a próxima rodada', e instanceof Error ? e.name : typeof e);
    }
  }
  return { removed, failed };
}

/* ---- Modo TV: entrar pelo celular (migração 0081) ------------------------------------------------------------ */

const sha = async (t: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('');
async function rest(path: string, init?: RequestInit) {
  const c = db()!;
  return fetch(`${c.url}/rest/v1/${path}`, { ...init, headers: { ...c.headers, ...(init?.headers as Record<string, string> | undefined) } });
}
/** Contador do banco (migração 0075): devolve false se passou do limite. Sem a migração, deixa passar. */
async function hit(bucket: string, limit: number): Promise<boolean> {
  const r = await rest('rpc/api_hit', { method: 'POST', body: JSON.stringify({ p_bucket: bucket, p_limit: limit, p_cost: 1 }) }).catch(() => null);
  if (!r?.ok) return true;
  return (await r.json()) !== -1;
}
type TvRow = { code: string; secret_hash: string; user_id: string | null; created_at: string; approved_at: string | null; used_at: string | null };

async function tv(req: Req, res: Res, body: { tv?: string; code?: unknown; secret?: unknown }) {
  const code = typeof body.code === 'string' ? body.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) : '';
  const fresh = (r: TvRow) => Date.now() - Date.parse(r.created_at) < TV_MIN * 60_000;
  const row = async (): Promise<TvRow | null> => {
    const r = await rest(`tv_pair?select=*&code=eq.${code}`);
    if (!r.ok) throw new Error('Falta rodar a migração 0081 no Supabase.');
    return ((await r.json()) as TvRow[])[0] ?? null;
  };

  if (body.tv === 'novo') {
    // Por aparelho de origem, no máximo 30 códigos por dia (o resumo do endereço, nunca o endereço).
    const ip = (header(req, 'x-forwarded-for') ?? '').split(',')[0].trim() || 'sem-ip';
    if (!(await hit(`tv:${(await sha(`tv:${ip}`)).slice(0, 24)}`, 30))) return res.status(429).json({ error: 'Muitos códigos pedidos daqui hoje. Tente amanhã.' });
    if (Math.random() < 0.2) await rest(`tv_pair?created_at=lt.${new Date(Date.now() - 3600_000).toISOString()}`, { method: 'DELETE' }).catch(() => null);
    const secret = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
    for (let i = 0; i < 5; i++) {
      const n = [...crypto.getRandomValues(new Uint8Array(6))].map((b) => TV_LETRAS[b % TV_LETRAS.length]).join('');
      const r = await rest('tv_pair', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ code: n, secret_hash: await sha(secret) }) });
      if (r.ok) return res.status(200).json({ code: n, secret, expiresIn: TV_MIN * 60 });
      if (r.status !== 409) throw new Error('Falta rodar a migração 0081 no Supabase.');
    }
    return res.status(503).json({ error: 'Não consegui gerar um código agora. Tente de novo.' });
  }

  if (body.tv === 'aprovar') {
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ error: 'Entre na sua conta no celular para ligar a TV.' });
    if (code.length !== 6) return res.status(400).json({ error: 'O código tem 6 letras e números.' });
    const r = await row();
    if (!r || !fresh(r) || r.used_at) return res.status(404).json({ error: 'Esse código não vale mais. Peça um novo na TV.' });
    if (r.user_id && r.user_id !== user) return res.status(409).json({ error: 'Esse código já foi usado por outra conta.' });
    const u = await rest(`tv_pair?code=eq.${code}&user_id=is.null`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: user, approved_at: new Date().toISOString() }) });
    if (!u.ok) throw new Error(`tv aprovar ${u.status}`);
    return res.status(200).json({ ok: true });
  }

  if (body.tv === 'esperar') {
    const secret = typeof body.secret === 'string' ? body.secret.slice(0, 100) : '';
    if (code.length !== 6 || !secret) return res.status(400).json({ error: 'Pedido inválido.' });
    const r = await row();
    if (!r || !sameText(r.secret_hash, await sha(secret))) return res.status(404).json({ error: 'Código desconhecido.' });
    if (!fresh(r) || r.used_at) return res.status(410).json({ error: 'O código venceu. Peça um novo.' });
    if (!r.user_id) return res.status(200).json({ pronto: false });
    // Marca como usado antes de gerar a entrada: duas perguntas ao mesmo tempo não geram duas.
    const m = await rest(`tv_pair?code=eq.${code}&used_at=is.null`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ used_at: new Date().toISOString() }) });
    if (!m.ok || !((await m.json()) as unknown[]).length) return res.status(410).json({ error: 'O código já foi usado.' });
    const user = await getUser(r.user_id);
    if (!user.email) return res.status(409).json({ error: 'Esta conta não tem e-mail. Entre pela tela de entrada.' });
    const c = db()!;
    const g = await fetch(`${c.url}/auth/v1/admin/generate_link`, { method: 'POST', headers: c.headers, body: JSON.stringify({ type: 'magiclink', email: user.email }) });
    if (!g.ok) { console.error('conta: tv sem link', g.status); return res.status(502).json({ error: 'Não consegui entrar agora. Peça um novo código.' }); }
    const j = (await g.json()) as { hashed_token?: string; properties?: { hashed_token?: string } };
    const tokenHash = j.hashed_token ?? j.properties?.hashed_token;
    if (!tokenHash) return res.status(502).json({ error: 'Não consegui entrar agora. Peça um novo código.' });
    return res.status(200).json({ pronto: true, tokenHash });
  }
  return res.status(400).json({ error: 'Ação desconhecida.' });
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!db()) return res.status(503).json({ error: 'O servidor ainda não tem SUPABASE_URL e SUPABASE_SECRET_KEY.' });
  try {
    const q = req.query ?? {};
    if (req.method === 'GET' && (q.steam === 'entrar' || q.steam === 'volta')) {
      // Estas duas são páginas (o navegador vai e volta da Steam): erro vira aviso na tela de entrada, não JSON.
      try { return await (q.steam === 'entrar' ? steamEntrar(req, res) : steamVolta(req, res)); }
      catch (e) { const f = failure('steam', e); return irPara(res, /migração 0091/.test(f.error) ? '/entrar#erro=steam-migracao' : '/entrar#erro=steam-falhou'); }
    }
    if (req.method === 'POST') {
      const b = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}) as { tv?: string; steam?: string };
      if (typeof b.tv === 'string') return await tv(req, res, b);
      if (typeof b.steam === 'string') return await steamConta(req, res, b.steam);
    }
    if (req.method === 'GET' && q.purge) {
      // Sem CRON_SECRET configurado, a rotina não roda: ninguém de fora consegue dispará-la.
      const secret = process.env.CRON_SECRET;
      if (!secret) return res.status(503).json({ error: 'Rotina desligada: falta a variável CRON_SECRET na Vercel.' });
      if (!sameText(header(req, 'authorization') ?? '', `Bearer ${secret}`)) return res.status(401).json({ error: 'Sem permissão.' });
      // Vídeos dos capítulos achados na busca do YouTube: no máximo 30 dias guardados (migração 0063).
      const c = db()!;
      const videos = await fetch(`${c.url}/rest/v1/rpc/video_purge`, { method: 'POST', headers: { ...c.headers, 'Content-Type': 'application/json' }, body: '{}' })
        .then((r) => (r.ok ? r.json() : null)).catch(() => null);
      return res.status(200).json({ ...(await purge()), videos });
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
    return res.status(500).json(failure('conta', e));
  }
}

/** Compara dois textos em tempo constante (não dá pista de quantos caracteres acertou). */
function sameText(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Erro sem detalhes internos: só um código curto para achar no registro da Vercel (avisos de migração continuam). */
function failure(where: string, err: unknown) {
  const diag = Math.random().toString(36).slice(2, 8);
  const msg = err instanceof Error ? err.message : '';
  console.error(`${where} diag=${diag}`, err instanceof Error ? err.name : typeof err, msg.replace(/https?:\/\/\S+/g, '<url>').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '<email>').replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, '<id>').replace(/[A-Za-z0-9_-]{24,}/g, '<chave>').slice(0, 120));
  if (/^Falta rodar a migração \d{4}/.test(msg)) return { error: msg.slice(0, 120), diag };
  return { error: 'Algo deu errado. Tente de novo em instantes.', diag };
}

/* ---- Entrar com a Steam (migração 0091) ---------------------------------------------------------------------- */

const STEAM_OPENID = 'https://steamcommunity.com/openid/login';
const STEAM_ID_URL = /^https:\/\/steamcommunity\.com\/openid\/id\/(7656119\d{10})$/;
const STEAM_COOKIE = 'wz_steam';
const STEAM_MIN = 15;
export const STEAM_DOMINIO = 'steam.winnerz.com.br';
export const emailDaSteam = (email: string | undefined | null) => typeof email === 'string' && email.toLowerCase().endsWith(`@${STEAM_DOMINIO}`);
const STEAM_LIGAR = 'wz_steam_ligar';
const steamCookie = (value: string, maxAge: number, nome = STEAM_COOKIE) => `${nome}=${value}; Path=/steam; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

/** Para onde voltar depois de entrar: só um caminho deste site ("/algo"), nunca outro endereço. */
export function voltaSegura(v: unknown): string {
  const t = typeof v === 'string' ? v.trim() : '';
  if (!t.startsWith('/') || t.startsWith('//') || t.includes('\\') || t.length > 300 || /[\u0000-\u001f]/.test(t)) return '/';
  return t;
}

/** O endereço do login da Steam, que devolve para returnTo. */
export function urlSteam(origin: string, returnTo: string): string {
  const p = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': origin,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return `${STEAM_OPENID}?${p.toString()}`;
}

/** Primeira conferência da resposta da Steam (antes de perguntar à própria Steam): devolve o SteamID ou null. */
export function lerRespostaSteam(q: Record<string, string>, returnTo: string): string | null {
  if (q['openid.ns'] !== 'http://specs.openid.net/auth/2.0' || q['openid.mode'] !== 'id_res') return null;
  if (q['openid.op_endpoint'] !== STEAM_OPENID || q['openid.return_to'] !== returnTo) return null;
  if (q['openid.claimed_id'] !== q['openid.identity']) return null;
  const signed = String(q['openid.signed'] ?? '').split(',');
  for (const f of ['op_endpoint', 'claimed_id', 'identity', 'return_to', 'response_nonce', 'assoc_handle']) if (!signed.includes(f)) return null;
  return STEAM_ID_URL.exec(String(q['openid.claimed_id'] ?? ''))?.[1] ?? null;
}

async function hmac(text: string): Promise<string> {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(`steam-login:${db()!.headers.apikey}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
}
type SteamEstado = { n: string; v: string; t: number; u?: string };
async function assinar(p: object): Promise<string> {
  const body = Buffer.from(JSON.stringify(p)).toString('base64url');
  return `${body}.${await hmac(body)}`;
}
async function abrir<T extends { t: number }>(s: unknown): Promise<T | null> {
  const [body, sig] = String(s ?? '').split('.');
  if (!body || !sig || !sameText(sig, await hmac(body))) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as T; return p.t > Date.now() ? p : null; } catch { return null; }
}

function origemDe(req: Req): string {
  const host = String(header(req, 'x-forwarded-host') ?? header(req, 'host') ?? '').split(',')[0].trim().toLowerCase();
  if (!/^[a-z0-9.-]+(:\d+)?$/.test(host)) throw new Error('host inválido');
  return `${/^(localhost|127\.)/.test(host) ? 'http' : 'https'}://${host}`;
}
const qs = (req: Req): Record<string, string> => Object.fromEntries(Object.entries(req.query ?? {}).map(([k, v]) => [k, Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '')]));
const irPara = (res: Res, to: string) => { res.setHeader('Location', to); res.status(302); return res.end ? res.end() : res.json({ to }); };

async function steamEntrar(req: Req, res: Res) {
  const q = qs(req);
  const origin = origemDe(req);
  const ip = (header(req, 'x-forwarded-for') ?? '').split(',')[0].trim() || 'sem-ip';
  if (!(await hit(`steam:${(await sha(`steam:${ip}`)).slice(0, 24)}`, 60))) return irPara(res, '/entrar#erro=steam-limite');
  // Ligar a Steam à conta aberta: o pedido assinado fica num cookie gravado pelo próprio site (POST com login), e não no
  // endereço. Assim um link montado por outra pessoa não liga a Steam de quem clicou à conta dela.
  let u: string | undefined;
  if (q.ligar) {
    const l = await abrir<{ u: string; t: number; k: string }>(cookieOf(header(req, 'cookie'), STEAM_LIGAR));
    if (!l || l.k !== 'ligar') { res.setHeader('Set-Cookie', steamCookie('', 0, STEAM_LIGAR)); return irPara(res, '/preferencias#erro=steam-ligar'); }
    u = l.u;
  }
  const n = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  const estado: SteamEstado = { n, v: voltaSegura(q.volta), t: Date.now() + STEAM_MIN * 60_000, ...(u ? { u } : {}) };
  const returnTo = `${origin}/steam/volta?s=${encodeURIComponent(await assinar(estado))}`;
  res.setHeader('Set-Cookie', [steamCookie(n, STEAM_MIN * 60), steamCookie('', 0, STEAM_LIGAR)]);
  return irPara(res, urlSteam(origin, returnTo));
}

async function steamVolta(req: Req, res: Res) {
  const q = qs(req);
  const nonce = cookieOf(header(req, 'cookie'), STEAM_COOKIE);
  res.setHeader('Set-Cookie', steamCookie('', 0));
  const erro = (codigo: string, ligar = false) => irPara(res, `${ligar ? '/preferencias' : '/entrar'}#erro=steam-${codigo}`);
  if (q['openid.mode'] === 'cancel') return erro('cancelou');
  const estado = await abrir<SteamEstado>(q.s);
  if (!estado) return erro('venceu');
  if (!nonce || !sameText(nonce, estado.n)) return erro('navegador', !!estado.u);
  const origin = origemDe(req);
  const returnTo = `${origin}/steam/volta?s=${encodeURIComponent(q.s)}`;
  const steamId = lerRespostaSteam(q, returnTo);
  if (!steamId) return erro('invalida', !!estado.u);
  // A palavra final é da Steam: ela confere a assinatura da resposta (e não aceita a mesma resposta duas vezes).
  const confere = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (k.startsWith('openid.')) confere.set(k, v);
  confere.set('openid.mode', 'check_authentication');
  const r = await fetch(STEAM_OPENID, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: confere.toString() }).catch(() => null);
  const texto = r?.ok ? await r.text() : '';
  if (!/^is_valid:true$/m.test(texto)) return erro('invalida', !!estado.u);

  const achar = async (): Promise<string | null> => {
    const a = await rest(`steam_logins?select=user_id&steam_id=eq.${steamId}`);
    if (!a.ok) throw new Error('Falta rodar a migração 0091 no Supabase.');
    return ((await a.json()) as { user_id: string }[])[0]?.user_id ?? null;
  };

  if (estado.u) {
    // Ligar a Steam à conta aberta.
    const dono = await achar();
    if (dono && dono !== estado.u) return erro('outra-conta', true);
    if (!dono) {
      await rest(`steam_logins?user_id=eq.${estado.u}`, { method: 'DELETE' });
      const ins = await rest('steam_logins', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ steam_id: steamId, user_id: estado.u }) });
      if (!ins.ok) return erro(ins.status === 409 ? 'outra-conta' : 'falhou', true);
    }
    return irPara(res, '/preferencias?steam=ligada#contas');
  }

  let user = await achar();
  if (!user) user = await criarContaSteam(steamId);
  if (!user) return erro('falhou');
  const conta = await getUser(user);
  if (!conta.email) return erro('falhou');
  const c = db()!;
  const g = await fetch(`${c.url}/auth/v1/admin/generate_link`, { method: 'POST', headers: c.headers, body: JSON.stringify({ type: 'magiclink', email: conta.email }) });
  if (!g.ok) { console.error('conta: steam sem link', g.status); return erro('falhou'); }
  const j = (await g.json()) as { hashed_token?: string; properties?: { hashed_token?: string } };
  const th = j.hashed_token ?? j.properties?.hashed_token;
  if (!th) return erro('falhou');
  return irPara(res, `/entrar/steam#th=${encodeURIComponent(th)}&volta=${encodeURIComponent(estado.v)}`);
}

/** Conta nova pela Steam: nome da Steam (se a chave estiver configurada) e o e-mail interno, que nunca recebe nada. */
async function criarContaSteam(steamId: string): Promise<string | null> {
  const c = db()!;
  let name = '', avatar = '';
  const key = process.env.STEAM_API_KEY;
  if (key) {
    const p = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`)
      .then((r) => (r.ok ? r.json() : null)).catch(() => null) as { response?: { players?: { personaname?: string; avatarfull?: string }[] } } | null;
    const pl = p?.response?.players?.[0];
    name = String(pl?.personaname ?? '').trim().slice(0, 60);
    avatar = /^https:\/\/[a-z0-9.-]+\.(steamstatic|akamaihd)\.(com|net)\//.test(String(pl?.avatarfull ?? '')) ? String(pl!.avatarfull) : '';
  }
  const r = await fetch(`${c.url}/auth/v1/admin/users`, {
    method: 'POST', headers: c.headers,
    body: JSON.stringify({ email: `${steamId}@${STEAM_DOMINIO}`, email_confirm: true, user_metadata: { ...(name ? { name } : {}), ...(avatar ? { avatar_url: avatar } : {}) }, app_metadata: { steam_id: steamId } }),
  });
  if (!r.ok) {
    // Duas entradas ao mesmo tempo: a outra já criou. Procura de novo.
    const again = await rest(`steam_logins?select=user_id&steam_id=eq.${steamId}`);
    const row = again.ok ? ((await again.json()) as { user_id: string }[])[0] : undefined;
    if (!row) console.error('conta: steam criar', r.status);
    return row?.user_id ?? null;
  }
  const id = ((await r.json()) as { id?: string }).id;
  if (!id) return null;
  const ins = await rest('steam_logins', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ steam_id: steamId, user_id: id }) });
  if (ins.ok) return id;
  // Outra entrada ganhou a corrida: apaga a conta que sobrou e usa a dela.
  await fetch(`${c.url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: c.headers }).catch(() => null);
  const again = await rest(`steam_logins?select=user_id&steam_id=eq.${steamId}`);
  return again.ok ? ((await again.json()) as { user_id: string }[])[0]?.user_id ?? null : null;
}

async function steamConta(req: Req, res: Res, acao: string) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: 'Entre na sua conta.' });
  if (acao === 'ligar') {
    const ligar = await assinar({ u: user, k: 'ligar', t: Date.now() + 10 * 60_000 });
    res.setHeader('Set-Cookie', steamCookie(ligar, 600, STEAM_LIGAR));
    return res.status(200).json({ url: `/steam/entrar?volta=${encodeURIComponent('/preferencias')}&ligar=1` });
  }
  if (acao === 'desligar') {
    const u = await getUser(user);
    if (emailDaSteam(u.email)) return res.status(409).json({ error: 'Esta conta foi criada pela Steam: sem ela, não teria como entrar.' });
    const r = await rest(`steam_logins?user_id=eq.${user}`, { method: 'DELETE' });
    if (!r.ok) throw new Error('Falta rodar a migração 0091 no Supabase.');
    return res.status(200).json({ ok: true });
  }
  return res.status(400).json({ error: 'Ação desconhecida.' });
}

/** Lê um cookie do pedido. */
function cookieOf(raw: string | undefined, name: string): string {
  for (const part of String(raw ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}
