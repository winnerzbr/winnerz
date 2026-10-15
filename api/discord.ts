/**
 * Discord (Jornada 2, J5).
 *
 *   POST /api/discord  (do Discord, assinado)            → comandos /parei, /jogatina e /jogando (Interactions Endpoint URL)
 *   GET  /api/discord?code=…&state=…  (volta do Discord) → liga a conta e atualiza os cargos ligados (Redirect URI)
 *   POST /api/discord  (com login) { start: true }       → endereço para entrar pelo Discord
 *   POST /api/discord  (com login) { publish: { kind: "sessao" | "zerou" | "jogatina", id } } → publica no canal, se a pessoa escolheu
 *   POST /api/discord  (com login) { roles: true }       → atualiza os seus cargos ligados agora
 *   POST /api/discord  (administração) { register: true } → cadastra os comandos e os cargos ligados no Discord
 *   GET  /api/discord?cron=1  (Vercel, uma vez por dia)   → atualiza os cargos ligados de todo mundo
 *   GET  /api/discord?status=1                           → quais variáveis do Discord estão preenchidas (sem os valores)
 *
 * Variáveis na Vercel: DISCORD_APP_ID, DISCORD_PUBLIC_KEY, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, DISCORD_GUILD_ID,
 * DISCORD_FEED_CHANNEL_ID (onde o bot publica) e, se quiser jogatinas no canal de voz, DISCORD_VOICE_CHANNEL_ID.
 * Mais SUPABASE_URL + SUPABASE_SECRET_KEY e CRON_SECRET. Precisa da migração 0040.
 * Ler a atividade do Discord ("jogando agora") pede um programa ligado o tempo todo; não cabe numa função da Vercel.
 */
import { createHmac, createPublicKey, timingSafeEqual, verify } from 'node:crypto';

export const config = { api: { bodyParser: false } };

type Req = { method?: string; body?: unknown; query?: Record<string, string | string[] | undefined>; headers?: Record<string, string | string[] | undefined> } & AsyncIterable<Uint8Array>;
type Res = { status: (n: number) => Res; json: (b: unknown) => void; send: (b: string) => void; setHeader: (k: string, v: string) => void; end?: () => void };

const API = 'https://discord.com/api/v10';
const env = (k: string) => process.env[k] ?? '';
const header = (req: Req, k: string) => { const v = req.headers?.[k] ?? req.headers?.[k.toLowerCase()]; return Array.isArray(v) ? v[0] : v; };
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const headers: Record<string, string> = { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json' };
  return { url, headers };
}
async function rpc<T = any>(fn: string, args: Record<string, unknown>): Promise<T> {
  const c = db()!;
  const r = await fetch(`${c.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: c.headers, body: JSON.stringify(args) });
  if (!r.ok) throw new Error(r.status === 404 ? 'Falta rodar a migração 0040 no Supabase.' : `Banco respondeu ${r.status}`);
  return (await r.json()) as T;
}
async function rest(method: string, path: string, body?: unknown, prefer?: string): Promise<any> {
  const c = db()!;
  const r = await fetch(`${c.url}/rest/v1/${path}`, { method, headers: { ...c.headers, ...(prefer ? { Prefer: prefer } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`Banco respondeu ${r.status}`);
  return r.status === 204 ? null : r.json().catch(() => null);
}
async function requireUser(req: Req): Promise<string | null> {
  const c = db();
  const token = (header(req, 'authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!c || !token) return null;
  const r = await fetch(`${c.url}/auth/v1/user`, { headers: { apikey: c.headers.apikey, Authorization: `Bearer ${token}` } });
  if (!r.ok) return null;
  return ((await r.json()) as { id?: string }).id ?? null;
}
async function isAdmin(user: string): Promise<boolean> {
  const rows = (await rest('GET', `profiles?select=is_admin&id=eq.${user}`)) as { is_admin?: boolean }[] | null;
  return !!rows?.[0]?.is_admin;
}

/**
 * Corpo cru do pedido (a assinatura do Discord é conferida sobre ele, byte a byte). A Vercel já leu o corpo antes
 * da função rodar e o devolve pelos eventos "data" e "end"; por isso a leitura é por eventos, não por iteração.
 */
function rawBody(req: Req): Promise<string> {
  const r = req as unknown as { on: (ev: string, cb: (c?: unknown) => void) => void };
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve(chunks.length ? Buffer.concat(chunks).toString('utf8') : typeof req.body === 'string' ? req.body : req.body ? JSON.stringify(req.body) : '');
    };
    try {
      r.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(String(c))));
      r.on('end', finish);
      r.on('error', finish);
    } catch { finish(); }
    setTimeout(finish, 4000);
  });
}

/* ---- Assinaturas ------------------------------------------------------------------------- */
export function verifyDiscord(publicKeyHex: string, signatureHex: string, timestamp: string, body: string): boolean {
  try {
    const key = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(publicKeyHex, 'hex')]), format: 'der', type: 'spki' });
    return verify(null, Buffer.from(timestamp + body), key, Buffer.from(signatureHex, 'hex'));
  } catch { return false; }
}
const stateSecret = () => env('DISCORD_CLIENT_SECRET') || env('SUPABASE_SECRET_KEY') || env('SUPABASE_SERVICE_ROLE_KEY');
export function signState(user: string, at = Date.now(), secret = stateSecret()): string {
  const base = `${user}.${at.toString(36)}`;
  return `${base}.${createHmac('sha256', secret).update(`discord:${base}`).digest('base64url').slice(0, 32)}`;
}
export function readState(state: string, secret = stateSecret(), now = Date.now()): string | null {
  const [user, at, mac] = state.split('.');
  if (!user || !at || !mac) return null;
  const want = signState(user, parseInt(at, 36), secret).split('.')[2];
  if (want.length !== mac.length || !timingSafeEqual(Buffer.from(want), Buffer.from(mac))) return null;
  if (now - parseInt(at, 36) > 15 * 60_000) return null;
  return user;
}

/* ---- Discord (REST) ---------------------------------------------------------------------- */
async function bot(method: string, path: string, body?: unknown): Promise<any> {
  const r = await fetch(`${API}${path}`, { method, headers: { Authorization: `Bot ${env('DISCORD_BOT_TOKEN')}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`O Discord respondeu ${r.status}`);
  return r.status === 204 ? null : r.json();
}
const origin = (req: Req) => `https://${one(req.headers?.['x-forwarded-host']) ?? one(req.headers?.host) ?? 'winnerz.com.br'}`;
const redirectUri = (req: Req) => `${origin(req)}/api/discord`;

async function token(form: Record<string, string>) {
  const r = await fetch(`${API}/oauth2/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env('DISCORD_APP_ID'), client_secret: env('DISCORD_CLIENT_SECRET'), ...form }) });
  if (!r.ok) throw new Error('O Discord não aceitou o login. Tente de novo.');
  return (await r.json()) as { access_token: string; refresh_token?: string; expires_in: number };
}
async function saveToken(user: string, t: { access_token: string; refresh_token?: string; expires_in: number }) {
  await rest('POST', 'discord_tokens?on_conflict=user_id', [{ user_id: user, access_token: t.access_token, refresh_token: t.refresh_token ?? null, expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString() }], 'resolution=merge-duplicates,return=minimal');
}
/** Token do Discord da pessoa, renovado se venceu. */
async function userToken(user: string): Promise<string | null> {
  const rows = (await rest('GET', `discord_tokens?select=access_token,refresh_token,expires_at&user_id=eq.${user}`)) as { access_token: string; refresh_token: string | null; expires_at: string }[];
  const t = rows?.[0];
  if (!t) return null;
  if (Date.parse(t.expires_at) > Date.now()) return t.access_token;
  if (!t.refresh_token) return null;
  try { const n = await token({ grant_type: 'refresh_token', refresh_token: t.refresh_token }); await saveToken(user, n); return n.access_token; } catch { return null; }
}
/** Cargos ligados: manda para o Discord os números do WinnerZ da pessoa. */
async function pushRoles(user: string): Promise<boolean> {
  const at = await userToken(user);
  if (!at || !env('DISCORD_APP_ID')) return false;
  const st = await rpc<{ handle?: string; zerados: number; sessoes30: number; desde?: string }>('discord_role_stats', { p_user: user });
  const r = await fetch(`${API}/users/@me/applications/${env('DISCORD_APP_ID')}/role-connection`, {
    method: 'PUT', headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform_name: 'WinnerZ', platform_username: st.handle ?? undefined, metadata: { zerados: String(st.zerados ?? 0), sessoes30: String(st.sessoes30 ?? 0), ...(st.desde ? { desde: st.desde } : {}) } }),
  });
  if (r.ok) await rest('PATCH', `discord_links?user_id=eq.${user}`, { roles_at: new Date().toISOString() }, 'return=minimal').catch(() => null);
  return r.ok;
}

/* ---- Publicar no canal ------------------------------------------------------------------- */
const fmtMin = (m?: number | null) => (!m ? '' : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}`);
export function postFor(p: any, site: string): { content?: string; embeds: any[] } {
  const url = p.kind === 'jogatina' ? `${site}/jogatina/${p.id}` : p.slug ? `${site}/jogos/${p.slug}` : site;
  const who = p.discordId ? `<@${p.discordId}>` : `@${p.handle}`;
  if (p.kind === 'sessao') return { embeds: [{ color: 0xffb25b, description: `${who} jogou **${p.game}**${p.minutes ? ` por ${fmtMin(p.minutes)}` : ''}.`, url, thumbnail: p.cover ? { url: p.cover } : undefined, footer: { text: 'Sessão registrada no WinnerZ' } }] };
  if (p.kind === 'zerou') return { embeds: [{ color: 0xe2be84, title: `Zerou ${p.game}!`, description: `${who} zerou **${p.game}**${p.ordinal > 1 ? ` (História ${p.ordinal})` : ''}. GG!`, url, thumbnail: p.cover ? { url: p.cover } : undefined }] };
  const ts = Math.floor(Date.parse(p.startsAt) / 1000);
  return { embeds: [{ color: 0x9fd3ea, title: p.title, url, description: `${who} marcou uma jogatina de **${p.game}**: <t:${ts}:F> (<t:${ts}:R>).${p.platform ? `\nPlataforma: ${p.platform}.` : ''}\n${url}`, thumbnail: p.cover ? { url: p.cover } : undefined }] };
}
async function publish(user: string, kind: string, id: string, site: string): Promise<{ posted: boolean }> {
  if (!['sessao', 'zerou', 'jogatina'].includes(kind) || !/^[0-9a-f-]{36}$/.test(id)) return { posted: false };
  if (!env('DISCORD_BOT_TOKEN') || !env('DISCORD_FEED_CHANNEL_ID')) return { posted: false };
  const p = await rpc<any>('discord_publish_info', { p_user: user, p_kind: kind, p_ref: id });
  if (!p) return { posted: false };
  try {
    await bot('POST', `/channels/${env('DISCORD_FEED_CHANNEL_ID')}/messages`, { ...postFor(p, site), allowed_mentions: { parse: [] } });
    if (kind === 'jogatina' && env('DISCORD_GUILD_ID')) {
      const start = new Date(p.startsAt), end = new Date(start.getTime() + (p.durationMin ?? 120) * 60_000);
      const voice = env('DISCORD_VOICE_CHANNEL_ID');
      const ev = await bot('POST', `/guilds/${env('DISCORD_GUILD_ID')}/scheduled-events`, {
        name: String(p.title).slice(0, 100), privacy_level: 2, scheduled_start_time: start.toISOString(), scheduled_end_time: end.toISOString(),
        description: `${p.game}${p.platform ? ` · ${p.platform}` : ''}\n${site}/jogatina/${p.id}\n${String(p.description ?? '').slice(0, 600)}`.slice(0, 1000),
        ...(voice ? { entity_type: 2, channel_id: voice } : { entity_type: 3, entity_metadata: { location: `${site}/jogatina/${p.id}` } }),
      }).catch(() => null);
      if (ev?.id) await rest('PATCH', `jogatinas?id=eq.${p.id}`, { discord_event_id: ev.id }, 'return=minimal').catch(() => null);
    }
    if (kind !== 'jogatina') await pushRoles(user).catch(() => false);
    return { posted: true };
  } catch {
    // Não publicou: libera para tentar de novo.
    await rest('DELETE', `discord_posts?kind=eq.${kind}&ref=eq.${id}`).catch(() => null);
    return { posted: false };
  }
}

/* ---- Comandos ---------------------------------------------------------------------------- */
export const COMMANDS = [
  { name: 'parei', description: 'Fecha a sua sessão aberta no WinnerZ', options: [
    { type: 3, name: 'onde', description: 'Onde você parou (opcional)', required: false, max_length: 140 },
    { type: 3, name: 'recado', description: 'Recado para a próxima vez (opcional)', required: false, max_length: 500 },
  ] },
  { name: 'jogatina', description: 'As próximas jogatinas abertas do WinnerZ' },
  { name: 'jogando', description: 'O que você está jogando agora, segundo o WinnerZ' },
];
const ROLE_METADATA = [
  { key: 'zerados', name: 'Jogos zerados', description: 'Quantos jogos a pessoa zerou no WinnerZ', type: 2 },
  { key: 'sessoes30', name: 'Sessões no mês', description: 'Sessões nos últimos 30 dias no WinnerZ', type: 2 },
  { key: 'desde', name: 'Dias no WinnerZ', description: 'Há quantos dias a pessoa está no WinnerZ', type: 6 },
];
const NOT_LINKED = (site: string) => `Sua conta do Discord ainda não está ligada ao WinnerZ. Ligue em ${site}/preferencias#discord.`;
const reply = (content: string, ephemeral = true) => ({ type: 4, data: { content: content.slice(0, 1900), flags: ephemeral ? 64 : 0, allowed_mentions: { parse: [] } } });

async function command(i: any, site: string) {
  const name = i.data?.name;
  const discordId = i.member?.user?.id ?? i.user?.id;
  const opt = (k: string) => (i.data?.options ?? []).find((o: any) => o.name === k)?.value as string | undefined;
  if (name === 'parei') {
    const r = await rpc<any>('discord_finish_session', { p_discord: discordId, p_where: opt('onde') ?? null, p_note: opt('recado') ?? null });
    if (r?.error === 'nao_ligado') return reply(NOT_LINKED(site));
    if (r?.error === 'sem_sessao') return reply('Você não tem sessão aberta no WinnerZ agora.');
    return reply(`Sessão ${r.n} de **${r.game}** fechada${r.minutes ? `: ${fmtMin(r.minutes)}` : ''}.${r.where ? ` Parou em: ${r.where}.` : ''} Bom descanso!`);
  }
  if (name === 'jogando') {
    const r = await rpc<any>('discord_now', { p_discord: discordId });
    if (r?.error === 'nao_ligado') return reply(NOT_LINKED(site));
    if (r?.open) return reply(`Sessão aberta: **${r.open.game}**, desde <t:${Math.floor(Date.parse(r.open.since) / 1000)}:t>. Quando terminar, use /parei.`);
    if (r?.last) return reply(`Nenhuma sessão aberta. A última foi de **${r.last.game}** <t:${Math.floor(Date.parse(r.last.at) / 1000)}:R>${r.last.where ? `, parou em: ${r.last.where}` : ''}.`);
    return reply('Nenhuma sessão registrada ainda.');
  }
  if (name === 'jogatina') {
    const list = await rpc<any[]>('discord_jogatinas', {});
    if (!list?.length) return reply('Nenhuma jogatina aberta marcada agora. Que tal marcar uma no WinnerZ?', false);
    return reply(['**Próximas jogatinas abertas**', ...list.map((j) => `• **${j.title}** · ${j.game} · <t:${Math.floor(Date.parse(j.startsAt) / 1000)}:F>${j.platform ? ` · ${j.platform}` : ''}\n  ${site}/jogatina/${j.id}`)].join('\n'), false);
  }
  return reply('Comando desconhecido.');
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const q = req.query ?? {};
    const site = origin(req);

    // Volta do login do Discord.
    if (req.method === 'GET' && typeof q.code === 'string' && typeof q.state === 'string') {
      const user = readState(q.state);
      if (!user || !db()) { res.setHeader('Location', '/preferencias?discord=erro#discord'); return res.status(302).send(''); }
      try {
        const t = await token({ grant_type: 'authorization_code', code: q.code, redirect_uri: redirectUri(req) });
        const me = (await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${t.access_token}` } }).then((r) => r.json())) as { id: string; username: string; global_name?: string; avatar?: string };
        if (!me?.id) throw new Error('sem usuário');
        // Uma conta do Discord liga a uma conta do WinnerZ só: se estava em outra, sai de lá.
        await rest('DELETE', `discord_links?discord_id=eq.${me.id}&user_id=neq.${user}`).catch(() => null);
        await rest('POST', 'discord_links?on_conflict=user_id', [{ user_id: user, discord_id: me.id, username: me.global_name || me.username, avatar: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=128` : null }], 'resolution=merge-duplicates,return=minimal');
        await saveToken(user, t);
        await pushRoles(user).catch(() => false);
        res.setHeader('Location', '/preferencias?discord=ok#discord');
      } catch { res.setHeader('Location', '/preferencias?discord=erro#discord'); }
      return res.status(302).send('');
    }

    // Conferência rápida da configuração (só diz o que está preenchido, nunca os valores).
    if (req.method === 'GET' && q.status) {
      const has = (k: string) => !!env(k);
      return res.status(200).json({
        DISCORD_APP_ID: has('DISCORD_APP_ID'), DISCORD_PUBLIC_KEY: has('DISCORD_PUBLIC_KEY') && /^[0-9a-f]{64}$/i.test(env('DISCORD_PUBLIC_KEY').trim()),
        DISCORD_CLIENT_SECRET: has('DISCORD_CLIENT_SECRET'), DISCORD_BOT_TOKEN: has('DISCORD_BOT_TOKEN'), DISCORD_GUILD_ID: has('DISCORD_GUILD_ID'),
        DISCORD_FEED_CHANNEL_ID: has('DISCORD_FEED_CHANNEL_ID'), DISCORD_VOICE_CHANNEL_ID: has('DISCORD_VOICE_CHANNEL_ID'), banco: !!db(),
      });
    }

    if (req.method === 'GET' && q.cron) {
      const secret = env('CRON_SECRET');
      if (!secret || header(req, 'authorization') !== `Bearer ${secret}`) return res.status(401).json({ error: 'Sem permissão.' });
      const rows = (await rest('GET', 'discord_links?select=user_id&order=roles_at.asc.nullsfirst&limit=200')) as { user_id: string }[];
      const until = Date.now() + 45_000;
      let ok = 0;
      for (const r of rows ?? []) { if (Date.now() > until) break; if (await pushRoles(r.user_id).catch(() => false)) ok += 1; }
      return res.status(200).json({ updated: ok });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
    const body = await rawBody(req);

    // Comandos vindos do Discord (assinados).
    const sig = header(req, 'x-signature-ed25519'), ts = header(req, 'x-signature-timestamp');
    if (sig && ts) {
      if (!env('DISCORD_PUBLIC_KEY') || !verifyDiscord(env('DISCORD_PUBLIC_KEY').trim(), sig, ts, body)) return res.status(401).json({ error: 'assinatura inválida' });
      const i = JSON.parse(body);
      if (i.type === 1) return res.status(200).json({ type: 1 });
      if (i.type === 2) return res.status(200).json(await command(i, site).catch(() => reply('O WinnerZ não respondeu agora. Tente de novo em instantes.')));
      return res.status(400).json({ error: 'tipo desconhecido' });
    }

    if (!db()) return res.status(503).json({ error: 'O servidor ainda não tem SUPABASE_URL e SUPABASE_SECRET_KEY.' });
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ error: 'Entre na sua conta.' });
    const b = (body ? JSON.parse(body) : {}) as { start?: boolean; publish?: { kind?: string; id?: string }; roles?: boolean; register?: boolean };

    if (b.start) {
      if (!env('DISCORD_APP_ID') || !env('DISCORD_CLIENT_SECRET')) return res.status(503).json({ error: 'O Discord ainda não foi configurado no servidor.' });
      const u = new URL('https://discord.com/oauth2/authorize');
      u.search = new URLSearchParams({ client_id: env('DISCORD_APP_ID'), response_type: 'code', redirect_uri: redirectUri(req), scope: 'identify role_connections.write', state: signState(user), prompt: 'none' }).toString();
      return res.status(200).json({ url: u.toString() });
    }
    if (b.publish) return res.status(200).json(await publish(user, String(b.publish.kind ?? ''), String(b.publish.id ?? ''), site));
    if (b.roles) return res.status(200).json({ ok: await pushRoles(user) });
    if (b.register) {
      if (!(await isAdmin(user))) return res.status(403).json({ error: 'Só a administração.' });
      if (!env('DISCORD_APP_ID') || !env('DISCORD_BOT_TOKEN')) return res.status(503).json({ error: 'Faltam DISCORD_APP_ID e DISCORD_BOT_TOKEN na Vercel.' });
      const guild = env('DISCORD_GUILD_ID');
      await bot('PUT', guild ? `/applications/${env('DISCORD_APP_ID')}/guilds/${guild}/commands` : `/applications/${env('DISCORD_APP_ID')}/commands`, COMMANDS);
      await bot('PUT', `/applications/${env('DISCORD_APP_ID')}/role-connections/metadata`, ROLE_METADATA);
      return res.status(200).json({ ok: true, commands: COMMANDS.length, roles: ROLE_METADATA.length });
    }
    return res.status(400).json({ error: 'Pedido não reconhecido.' });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Algo deu errado.' });
  }
}
