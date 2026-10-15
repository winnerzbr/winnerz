/**
 * Pontes (Jornada 2, J4): sessões inferidas pela Steam e pelo RetroAchievements.
 *
 *   POST /api/pontes (com login) { link: "steam", value: "<link do perfil>" }  → liga a Steam (o tempo já jogado não vira sessão)
 *   POST /api/pontes (com login) { link: "ra", value: "<usuário>" }            → liga o RetroAchievements
 *   POST /api/pontes (com login) { link: "playnite" }                         → gera a chave pessoal da extensão do Playnite (mostrada uma vez)
 *   POST /api/pontes (extensão do Playnite, cabeçalho X-WinnerZ-Token) { playnite: { event: "start" | "stop", game, startedAt?, endedAt? } }
 *   POST /api/pontes (com login) { sync: true, force?: true }                  → busca agora (no máximo a cada 10 minutos; com force, a cada 1)
 *   GET  /api/pontes?cron=1  (agendado pela Vercel, uma vez por dia)           → busca de todo mundo que ligou alguma ponte
 *
 * Steam: compara o tempo total de cada jogo com a última leitura; a diferença vira uma sessão que termina no
 * "última vez jogado". RetroAchievements: conquistas desbloqueadas desde a última busca, agrupadas por jogo e por
 * proximidade (pausa de mais de 90 minutos separa), com os nomes das conquistas e o status do jogo ("rich presence").
 * O servidor só grava o que leu (inferred_sessions); quem registra na Jornada é o site, com a escolha da pessoa.
 *
 * Variáveis na Vercel: SUPABASE_URL + SUPABASE_SECRET_KEY, STEAM_API_KEY (já usada no importador),
 * RA_API_KEY (chave "Web API" de uma conta do RetroAchievements), TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET (IGDB)
 * e CRON_SECRET (a Vercel manda sozinha na rotina diária). Precisa da migração 0039.
 * Nada aqui escreve chaves, tokens ou dados de pessoas no log.
 */

type Req = { method?: string; body?: unknown; query?: Record<string, string | string[] | undefined>; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void };
type Account = { user_id: string; provider: 'steam' | 'ra' | 'playnite'; external_id: string; display?: string | null; last_sync_at?: string | null };
type Row = Record<string, unknown>;

const SYNC_EVERY_MIN = 10;
const MIN_DELTA = 5; // minutos: menos que isso não vira sessão
const RA_GAP = 90 * 60_000;
const RA_LEAD = 15; // minutos antes da primeira conquista (ninguém desbloqueia no primeiro segundo)

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const headers: Record<string, string> = { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json' };
  return { url, headers };
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

/* ---- Banco (REST com a chave do servidor) ------------------------------------------------- */
async function sel<T = Row>(path: string): Promise<T[]> {
  const c = db()!;
  const r = await fetch(`${c.url}/rest/v1/${path}`, { headers: c.headers });
  if (!r.ok) throw new Error(r.status === 404 ? 'Falta rodar a migração 0039 no Supabase.' : `Banco respondeu ${r.status}`);
  return (await r.json()) as T[];
}
async function upsert(table: string, rows: Row[], onConflict: string, ignore = false) {
  if (!rows.length) return;
  const c = db()!;
  for (let i = 0; i < rows.length; i += 500) {
    const r = await fetch(`${c.url}/rest/v1/${table}?on_conflict=${onConflict}`, { method: 'POST', headers: { ...c.headers, Prefer: `resolution=${ignore ? 'ignore' : 'merge'}-duplicates,return=minimal` }, body: JSON.stringify(rows.slice(i, i + 500)) });
    if (!r.ok) throw new Error(`Banco respondeu ${r.status} ao gravar`);
  }
}
async function patch(table: string, filter: string, body: Row) {
  const c = db()!;
  const r = await fetch(`${c.url}/rest/v1/${table}?${filter}`, { method: 'PATCH', headers: { ...c.headers, Prefer: 'return=minimal' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`Banco respondeu ${r.status} ao atualizar`);
}
const inList = (xs: (string | number)[]) => `(${xs.map((x) => `"${String(x).replace(/"/g, '')}"`).join(',')})`;

/* ---- IGDB (só para achar a ficha do jogo) ------------------------------------------------- */
let token: { value: string; expires: number } | null = null;
async function igdb(endpoint: string, body: string): Promise<any[]> {
  const id = process.env.TWITCH_CLIENT_ID, secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return [];
  if (!token || token.expires < Date.now() + 60_000) {
    const t = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, { method: 'POST' });
    if (!t.ok) return [];
    const j = (await t.json()) as { access_token: string; expires_in: number };
    token = { value: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  }
  const r = await fetch(`https://api.igdb.com/v4/${endpoint}`, { method: 'POST', headers: { 'Client-ID': id, Authorization: `Bearer ${token.value}`, 'Content-Type': 'text/plain' }, body });
  return r.ok ? ((await r.json()) as any[]) : [];
}
async function igdbBySteam(appids: (string | number)[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!appids.length) return out;
  let rows = await igdb('external_games', `where uid = (${appids.map((a) => `"${a}"`).join(',')}) & external_game_source = 1; fields game,uid; limit 500;`);
  if (!rows.length) rows = await igdb('external_games', `where uid = (${appids.map((a) => `"${a}"`).join(',')}) & category = 1; fields game,uid; limit 500;`);
  for (const r of rows) if (r.game && !out.has(String(r.uid))) out.set(String(r.uid), r.game);
  return out;
}
const RA_PLATFORM: Record<string, string> = {
  'snes/super famicom': 'super nintendo', 'nes/famicom': 'nintendo entertainment system', 'genesis/mega drive': 'genesis', 'mega drive/genesis': 'genesis',
  gamecube: 'gamecube', 'master system': 'master system', saturn: 'saturn', 'pc engine/turbografx-16': 'turbografx',
};
/** "Legend of Zelda, The: A Link to the Past" → "The Legend of Zelda: A Link to the Past"; tira marcas do RA (~Hack~, [Subset]). */
export function raCleanTitle(t: string): string {
  let s = t.replace(/~[^~]+~/g, '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/^(.+?), (The|A|An)(\b.*)$/i, (_m, a, art, rest) => `${art} ${a}${rest}`);
  return s.replace(/"/g, '').trim();
}
async function igdbGuess(title: string, consoleName?: string): Promise<number | undefined> {
  const clean = raCleanTitle(title);
  if (!clean) return undefined;
  const rows = await igdb('games', `search "${clean}"; fields id,name,platforms.name; limit 8;`);
  const want = (RA_PLATFORM[(consoleName ?? '').toLowerCase()] ?? (consoleName ?? '')).toLowerCase();
  let best: { id: number; score: number } | undefined;
  rows.forEach((g, i) => {
    const plats = (g.platforms ?? []).map((p: any) => String(p.name ?? '').toLowerCase());
    const score = (want && plats.some((p: string) => p.includes(want) || want.includes(p)) ? 3 : 0) + (String(g.name).toLowerCase() === clean.toLowerCase() ? 2 : 0) - i * 0.1;
    if (!best || score > best.score) best = { id: g.id, score };
  });
  return best?.id;
}
async function gameIdsByIgdb(ids: number[]): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  const uniq = [...new Set(ids.filter(Boolean))];
  if (!uniq.length) return out;
  for (const g of await sel<{ id: string; igdb_id: number }>(`games?select=id,igdb_id&igdb_id=in.(${uniq.join(',')})`)) out.set(g.igdb_id, g.id);
  return out;
}

/* ---- Steam ------------------------------------------------------------------------------- */
async function resolveSteam(input: string): Promise<string | { error: string }> {
  const key = process.env.STEAM_API_KEY!;
  const raw = input.trim().replace(/\/+$/, '');
  let id = /^\d{17}$/.test(raw) ? raw : /\/profiles\/(\d{17})/.exec(raw)?.[1];
  if (!id) {
    const vanity = /\/id\/([^/?#]+)/.exec(raw)?.[1] ?? (/^[\w-]{2,32}$/.test(raw) ? raw : '');
    if (!vanity) return { error: 'Não reconheci esse perfil. Cole o endereço do seu perfil da Steam.' };
    const v = (await fetch(`https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/?key=${key}&vanityurl=${encodeURIComponent(vanity)}`).then((r) => r.json()).catch(() => null)) as any;
    id = v?.response?.success === 1 ? v.response.steamid : undefined;
    if (!id) return { error: 'Não achei esse perfil na Steam. Confira o endereço.' };
  }
  return id;
}
type Owned = { appid: number; name: string; playtime_forever: number; rtime_last_played?: number };
async function steamOwned(steamId: string): Promise<Owned[] | null> {
  const o = (await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${process.env.STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`).then((r) => r.json()).catch(() => null)) as any;
  return o?.response?.games ?? null;
}
async function steamNow(steamId: string): Promise<{ appid: string; title: string; persona?: string } | null> {
  const o = (await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${process.env.STEAM_API_KEY}&steamids=${steamId}`).then((r) => r.json()).catch(() => null)) as any;
  const p = o?.response?.players?.[0];
  if (!p) return null;
  return p.gameid ? { appid: String(p.gameid), title: String(p.gameextrainfo ?? 'um jogo'), persona: p.personaname } : { appid: '', title: '', persona: p.personaname };
}
const PRIVATE = 'A Steam não mostrou seus jogos. Deixe "Detalhes do jogo" como público nas configurações de privacidade da Steam.';

async function linkSteam(user: string, value: string) {
  if (!process.env.STEAM_API_KEY) return { error: 'A chave da Steam ainda não foi configurada no servidor (STEAM_API_KEY).' };
  const id = await resolveSteam(value.slice(0, 200));
  if (typeof id !== 'string') return id;
  const owned = await steamOwned(id);
  if (!owned) return { error: PRIVATE };
  const now = await steamNow(id);
  await upsert('linked_accounts', [{ user_id: user, provider: 'steam', external_id: id, display: now?.persona ?? null, last_sync_at: new Date().toISOString(), last_error: null }], 'user_id,provider');
  // O tempo de antes de ligar fica como ponto de partida: não vira sessão.
  await upsert('bridge_snapshots', owned.filter((g) => g.playtime_forever > 0).map((g) => ({ user_id: user, provider: 'steam', ext_game: String(g.appid), total_minutes: g.playtime_forever, updated_at: new Date().toISOString() })), 'user_id,provider,ext_game');
  return { ok: true, display: now?.persona ?? null, games: owned.length };
}

async function syncSteam(acc: Account): Promise<{ added: number; now: Row | null }> {
  const owned = await steamOwned(acc.external_id);
  if (!owned) throw new Error(PRIVATE);
  const snaps = new Map((await sel<{ ext_game: string; total_minutes: number }>(`bridge_snapshots?select=ext_game,total_minutes&user_id=eq.${acc.user_id}&provider=eq.steam`)).map((s) => [s.ext_game, s.total_minutes]));
  const changed: Row[] = [];
  const found: { g: Owned; delta: number }[] = [];
  for (const g of owned) {
    if (!g.playtime_forever) continue;
    const prev = snaps.get(String(g.appid));
    if (prev === g.playtime_forever) continue;
    changed.push({ user_id: acc.user_id, provider: 'steam', ext_game: String(g.appid), total_minutes: g.playtime_forever, updated_at: new Date().toISOString() });
    if (prev != null && g.playtime_forever - prev >= MIN_DELTA) found.push({ g, delta: Math.min(1440, g.playtime_forever - prev) });
  }
  let added = 0;
  if (found.length) {
    const ids = await igdbBySteam(found.map((f) => f.g.appid));
    const games = await gameIdsByIgdb([...ids.values()]);
    const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const recent = await sel<{ id: string; ext_game: string; started_at: string; ended_at: string; minutes: number; status: string }>(`inferred_sessions?select=id,ext_game,started_at,ended_at,minutes,status&user_id=eq.${acc.user_id}&provider=eq.steam&ext_game=in.${inList(found.map((f) => f.g.appid))}&ended_at=gte.${since}&status=neq.ignorada`);
    const fresh: Row[] = [];
    for (const { g, delta } of found) {
      const last = g.rtime_last_played ? g.rtime_last_played * 1000 : Date.now();
      const start = last - delta * 60_000;
      // Continuação de uma sessão lida há pouco (a pessoa abriu o site no meio do jogo): estende a mesma.
      const cont = recent.find((r) => r.ext_game === String(g.appid) && start - Date.parse(r.ended_at) <= 60 * 60_000);
      if (cont) {
        await patch('inferred_sessions', `id=eq.${cont.id}`, { ended_at: new Date(last).toISOString(), minutes: Math.min(1440, cont.minutes + delta), status: 'pendente' });
      } else {
        const igdbId = ids.get(String(g.appid));
        fresh.push({ user_id: acc.user_id, provider: 'steam', key: `steam:${g.appid}:${Math.floor(last / 1000)}`, ext_game: String(g.appid), title: g.name ?? `App ${g.appid}`, console: 'PC (Steam)',
          igdb_id: igdbId ?? null, game_id: igdbId ? games.get(igdbId) ?? null : null, started_at: new Date(start).toISOString(), ended_at: new Date(last).toISOString(), minutes: delta });
      }
      added += 1;
    }
    await upsert('inferred_sessions', fresh, 'user_id,key', true);
  }
  await upsert('bridge_snapshots', changed, 'user_id,provider,ext_game');
  const n = await steamNow(acc.external_id);
  let now: Row | null = null;
  if (n?.appid) {
    const id = (await igdbBySteam([n.appid])).get(n.appid);
    now = { provider: 'steam', extGame: n.appid, title: n.title, igdbId: id ?? null, gameId: id ? (await gameIdsByIgdb([id])).get(id) ?? null : null };
  }
  return { added, now };
}

/* ---- RetroAchievements ------------------------------------------------------------------- */
async function ra(endpoint: string, params: Record<string, string | number>): Promise<any> {
  const q = new URLSearchParams({ y: process.env.RA_API_KEY ?? '', ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const r = await fetch(`https://retroachievements.org/API/${endpoint}.php?${q}`);
  if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'O RetroAchievements recusou a chave do servidor (RA_API_KEY).' : `O RetroAchievements respondeu ${r.status}`);
  return r.json();
}
const raTime = (s: string) => Date.parse(s.replace(' ', 'T') + 'Z'); // o RetroAchievements fala em UTC

async function linkRa(user: string, value: string) {
  if (!process.env.RA_API_KEY) return { error: 'O RetroAchievements ainda não foi ligado no servidor (falta RA_API_KEY na Vercel).' };
  const name = value.trim().replace(/^.*retroachievements\.org\/user\//i, '').replace(/[/?#].*$/, '').slice(0, 40);
  if (!/^[\w.-]{2,40}$/.test(name)) return { error: 'Digite o seu nome de usuário do RetroAchievements.' };
  let p: any;
  try { p = await ra('API_GetUserProfile', { u: name }); } catch (e) { return { error: e instanceof Error ? e.message : 'O RetroAchievements não respondeu.' }; }
  if (!p?.User) return { error: 'Não achei esse usuário no RetroAchievements.' };
  await upsert('linked_accounts', [{ user_id: user, provider: 'ra', external_id: p.ULID ?? p.User, display: p.User, last_sync_at: new Date().toISOString(), last_error: null }], 'user_id,provider');
  return { ok: true, display: p.User };
}

type Unlock = { Date: string; Title: string; GameID: number; GameTitle: string; ConsoleName?: string };
/** Agrupa as conquistas por jogo e por proximidade: pausa de mais de 90 minutos começa outra sessão. */
export function raClusters(list: Unlock[]): { game: number; title: string; console?: string; first: number; last: number; names: string[] }[] {
  const out: { game: number; title: string; console?: string; first: number; last: number; names: string[] }[] = [];
  const sorted = [...list].map((u) => ({ ...u, t: raTime(u.Date) })).filter((u) => Number.isFinite(u.t)).sort((a, b) => a.t - b.t);
  for (const u of sorted) {
    const cur = [...out].reverse().find((c) => c.game === u.GameID);
    if (cur && u.t - cur.last <= RA_GAP) { cur.last = u.t; cur.names.push(u.Title); }
    else out.push({ game: u.GameID, title: u.GameTitle, console: u.ConsoleName, first: u.t, last: u.t, names: [u.Title] });
  }
  return out;
}
const unlockText = (names: string[]) => `${names.length} ${names.length === 1 ? 'conquista' : 'conquistas'}: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` e mais ${names.length - 3}` : ''}`;

async function syncRa(acc: Account): Promise<{ added: number; now: Row | null }> {
  const from = Math.floor(Date.parse(acc.last_sync_at ?? new Date().toISOString()) / 1000);
  const to = Math.floor(Date.now() / 1000);
  const list = (await ra('API_GetAchievementsEarnedBetween', { u: acc.external_id, f: from, t: to })) as Unlock[];
  const [profile, recentPlayed] = await Promise.all([
    ra('API_GetUserProfile', { u: acc.external_id }).catch(() => null),
    ra('API_GetUserRecentlyPlayedGames', { u: acc.external_id, c: 1 }).catch(() => []),
  ]);
  const presence: string | undefined = profile?.RichPresenceMsg ? String(profile.RichPresenceMsg).slice(0, 200) : undefined;
  const lastGame: number | undefined = profile?.LastGameID;
  const clusters = Array.isArray(list) ? raClusters(list) : [];
  let added = 0;
  if (clusters.length) {
    const maps = new Map((await sel<{ ext_game: string; game_id: string }>(`bridge_games?select=ext_game,game_id&user_id=eq.${acc.user_id}&provider=eq.ra`)).map((m) => [m.ext_game, m.game_id]));
    const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
    const recent = await sel<{ id: string; ext_game: string; started_at: string; ended_at: string; detail: string | null }>(`inferred_sessions?select=id,ext_game,started_at,ended_at,detail&user_id=eq.${acc.user_id}&provider=eq.ra&ended_at=gte.${since}&status=neq.ignorada`);
    const fresh: Row[] = [];
    const guesses = new Map<number, number | undefined>();
    for (const c of clusters) {
      const ext = String(c.game);
      const pres = c.game === lastGame && c === clusters.filter((x) => x.game === c.game).at(-1) ? presence ?? null : null;
      const cont = recent.find((r) => r.ext_game === ext && c.first - Date.parse(r.ended_at) <= RA_GAP);
      if (cont) {
        const started = Date.parse(cont.started_at);
        await patch('inferred_sessions', `id=eq.${cont.id}`, { ended_at: new Date(c.last).toISOString(), minutes: Math.max(RA_LEAD, Math.min(1440, Math.round((c.last - started) / 60_000))), detail: `${cont.detail ? `${cont.detail}; ` : ''}${unlockText(c.names)}`.slice(0, 400), ...(pres ? { presence: pres } : {}), status: 'pendente' });
      } else {
        if (!maps.has(ext) && !guesses.has(c.game)) guesses.set(c.game, await igdbGuess(c.title, c.console));
        fresh.push({ user_id: acc.user_id, provider: 'ra', key: `ra:${c.game}:${Math.floor(c.first / 1000)}`, ext_game: ext, title: raCleanTitle(c.title) || c.title, console: c.console ?? null,
          igdb_id: guesses.get(c.game) ?? null, game_id: maps.get(ext) ?? null, started_at: new Date(c.first - RA_LEAD * 60_000).toISOString(), ended_at: new Date(c.last).toISOString(),
          minutes: Math.max(RA_LEAD, Math.min(1440, Math.round((c.last - c.first) / 60_000) + RA_LEAD)), detail: unlockText(c.names), presence: pres });
      }
      added += 1;
    }
    const known = await gameIdsByIgdb(fresh.map((f) => f.igdb_id as number).filter(Boolean));
    for (const f of fresh) if (!f.game_id && f.igdb_id) f.game_id = known.get(f.igdb_id as number) ?? null;
    await upsert('inferred_sessions', fresh, 'user_id,key', true);
  }
  let now: Row | null = null;
  const rp = Array.isArray(recentPlayed) ? recentPlayed[0] : null;
  if (rp?.LastPlayed && Date.now() - raTime(rp.LastPlayed) < 20 * 60_000) {
    now = { provider: 'ra', extGame: String(rp.GameID), title: raCleanTitle(rp.Title) || rp.Title, console: rp.ConsoleName ?? null, detail: presence ?? null };
  }
  return { added, now };
}

/* ---- Playnite ---------------------------------------------------------------------------- */
const sha256 = async (t: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map((b) => b.toString(16).padStart(2, '0')).join('');

async function linkPlaynite(user: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const token = `wzpn_${Buffer.from(bytes).toString('base64url')}`;
  await upsert('linked_accounts', [{ user_id: user, provider: 'playnite', external_id: await sha256(token), display: 'Playnite', last_sync_at: new Date().toISOString(), last_error: null, now_playing: null, now_at: null }], 'user_id,provider');
  return { ok: true, token };
}

type PnGame = { id?: string; name?: string; platform?: string; source?: string; gameId?: string };
export function playniteSession(g: PnGame, startedAt: string | undefined, endedAt: string | undefined, now = Date.now()): { start: number; end: number; minutes: number } | null {
  const end = Math.min(now, Date.parse(endedAt ?? '') || now);
  const start = Date.parse(startedAt ?? '');
  if (!Number.isFinite(start) || start >= end) return null;
  const minutes = Math.round((end - start) / 60_000);
  if (minutes < 2 || minutes > 1440 || !g.name) return null;
  return { start, end, minutes };
}

/** A extensão avisa que um jogo abriu (start) ou fechou (stop). */
async function playniteEvent(token: string, body: { playnite?: { event?: string; game?: PnGame; startedAt?: string; endedAt?: string } }) {
  if (!/^wzpn_[\w-]{20,60}$/.test(token)) return { status: 401, json: { error: 'Chave inválida.' } };
  const rows = await sel<Account>(`linked_accounts?select=user_id,provider,external_id&provider=eq.playnite&external_id=eq.${await sha256(token)}&limit=1`);
  const acc = rows[0];
  if (!acc) return { status: 401, json: { error: 'Chave não reconhecida. Gere uma nova nas Preferências do WinnerZ.' } };
  const ev = body.playnite ?? {};
  const g: PnGame = { id: String(ev.game?.id ?? '').slice(0, 64), name: String(ev.game?.name ?? '').slice(0, 160), platform: String(ev.game?.platform ?? '').slice(0, 60) || undefined, source: String(ev.game?.source ?? '').slice(0, 40) || undefined, gameId: String(ev.game?.gameId ?? '').slice(0, 40) || undefined };
  const at = new Date().toISOString();
  if (!g.id || !g.name) return { status: 400, json: { error: 'Jogo sem nome.' } };
  // Jogo da Steam no Playnite: o número da Steam acha a ficha com segurança. Os outros: pelo nome e pela plataforma.
  const steamApp = /steam/i.test(g.source ?? '') && /^\d+$/.test(g.gameId ?? '') ? g.gameId! : null;
  const igdbId = steamApp ? (await igdbBySteam([steamApp])).get(steamApp) : await igdbGuess(g.name, g.platform);
  const gameId = igdbId ? (await gameIdsByIgdb([igdbId])).get(igdbId) ?? null : null;
  if (ev.event === 'start') {
    await patch('linked_accounts', `user_id=eq.${acc.user_id}&provider=eq.playnite`, { now_playing: { provider: 'playnite', extGame: g.id, title: g.name, detail: g.platform ?? null, igdbId: igdbId ?? null, gameId }, now_at: at, last_sync_at: at, last_error: null });
    return { status: 200, json: { ok: true } };
  }
  if (ev.event !== 'stop') return { status: 400, json: { error: 'Evento desconhecido.' } };
  await patch('linked_accounts', `user_id=eq.${acc.user_id}&provider=eq.playnite`, { now_playing: null, now_at: null, last_sync_at: at, last_error: null });
  const ses = playniteSession(g, ev.startedAt, ev.endedAt);
  if (!ses) return { status: 200, json: { ok: true, skipped: true } };
  if (steamApp && gameId) await upsert('bridge_games', [{ user_id: acc.user_id, provider: 'playnite', ext_game: g.id, game_id: gameId }], 'user_id,provider,ext_game', true);
  await upsert('inferred_sessions', [{ user_id: acc.user_id, provider: 'playnite', key: `pn:${g.id}:${Math.floor(ses.start / 1000)}`, ext_game: g.id, title: g.name, console: g.platform ?? null,
    igdb_id: igdbId ?? null, game_id: gameId, started_at: new Date(ses.start).toISOString(), ended_at: new Date(ses.end).toISOString(), minutes: ses.minutes, detail: g.source ? `Aberto pelo Playnite (${g.source})` : 'Aberto pelo Playnite' }], 'user_id,key', true);
  return { status: 200, json: { ok: true, minutes: ses.minutes } };
}

/* ---- Busca ------------------------------------------------------------------------------- */
async function syncOne(acc: Account): Promise<number> {
  if (acc.provider === 'playnite') return 0; // o Playnite avisa sozinho; não há o que buscar
  const startedAt = new Date().toISOString();
  try {
    const r = acc.provider === 'steam' ? await syncSteam(acc) : await syncRa(acc);
    await patch('linked_accounts', `user_id=eq.${acc.user_id}&provider=eq.${acc.provider}`, { last_sync_at: startedAt, last_error: null, now_playing: r.now, now_at: r.now ? startedAt : null });
    return r.added;
  } catch (e) {
    await patch('linked_accounts', `user_id=eq.${acc.user_id}&provider=eq.${acc.provider}`, { last_error: (e instanceof Error ? e.message : 'Falhou').slice(0, 200) }).catch(() => null);
    return 0;
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!db()) return res.status(503).json({ error: 'O servidor ainda não tem SUPABASE_URL e SUPABASE_SECRET_KEY.' });
  try {
    const q = req.query ?? {};
    if (req.method === 'GET' && q.cron) {
      const secret = process.env.CRON_SECRET;
      if (!secret) return res.status(503).json({ error: 'Rotina desligada: falta a variável CRON_SECRET na Vercel.' });
      if (header(req, 'authorization') !== `Bearer ${secret}`) return res.status(401).json({ error: 'Sem permissão.' });
      const until = Date.now() + 45_000;
      const accounts = await sel<Account>('linked_accounts?select=user_id,provider,external_id,last_sync_at&order=last_sync_at.asc.nullsfirst&limit=200');
      let done = 0, added = 0;
      for (const a of accounts) { if (Date.now() > until) break; added += await syncOne(a); done += 1; }
      // Aproveita a rotina diária para atualizar os cargos ligados do Discord (sem gastar outra rotina da Vercel).
      const host = header(req, 'x-forwarded-host') ?? header(req, 'host');
      const roles = host ? await fetch(`https://${host}/api/discord?cron=1`, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(12_000) }).then((r) => r.ok).catch(() => false) : false;
      return res.status(200).json({ accounts: done, added, discordRoles: roles });
    }
    // Extensão do Playnite: entra pela chave pessoal, não pelo login do site.
    const pnToken = header(req, 'x-winnerz-token');
    if (pnToken && req.method === 'POST') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}) as Parameters<typeof playniteEvent>[1];
      const r = await playniteEvent(pnToken.trim(), body);
      return res.status(r.status).json(r.json);
    }
    const user = await requireUser(req);
    if (!user) return res.status(401).json({ error: 'Entre na sua conta.' });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}) as { link?: string; value?: string; sync?: boolean; force?: boolean };
    if (body.link === 'playnite') return res.status(200).json(await linkPlaynite(user));
    if (body.link === 'steam' || body.link === 'ra') {
      const r = body.link === 'steam' ? await linkSteam(user, String(body.value ?? '')) : await linkRa(user, String(body.value ?? ''));
      return res.status('error' in r ? 400 : 200).json(r);
    }
    if (body.sync) {
      const wait = (body.force ? 1 : SYNC_EVERY_MIN) * 60_000;
      const mine = await sel<Account>(`linked_accounts?select=user_id,provider,external_id,last_sync_at&user_id=eq.${user}`);
      let added = 0, ran = 0;
      for (const a of mine) {
        if (a.last_sync_at && Date.now() - Date.parse(a.last_sync_at) < wait) continue;
        added += await syncOne(a); ran += 1;
      }
      return res.status(200).json({ ran, added });
    }
    return res.status(400).json({ error: 'Pedido não reconhecido.' });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Algo deu errado.' });
  }
}
