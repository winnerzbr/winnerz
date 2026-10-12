/**
 * Função da Vercel que conversa com o IGDB.
 * As credenciais da Twitch ficam só aqui no servidor.
 *
 *   GET /api/igdb?q=elden           → busca (até 12 resultados)
 *   GET /api/igdb?id=119133         → ficha completa; também grava no cache "games" do Supabase
 *   POST /api/igdb {match:[{title}]} → até 10 buscas numa chamada (importador da planilha)
 *   POST /api/igdb {cache:[ids]}     → fichas leves de até 100 jogos, gravadas no cache
 *   GET /api/igdb?slug=elden-ring    → ficha completa pelo slug do IGDB (abre qualquer jogo)
 *   GET /api/igdb?meta=1             → listas para os filtros (gêneros, plataformas, modos)
 *   GET /api/igdb?explore=1&...      → Explorar: jogos por gênero, plataforma, época, modo e ordem
 *   GET /api/igdb?related=119133     → universo do jogo: franquia, DLCs, remakes, parecidos
 *
 * Ids: o jogo do IGDB ganha "igdb-<número>" no WinnerZ e nunca muda, mesmo que o IGDB troque o slug.
 * Fichas antigas (id = slug) continuam com o id que já tinham.
 *
 * A sinopse é traduzida para o português uma vez, aqui, e fica guardada no banco.
 *   - DEEPL_API_KEY (opcional, melhor qualidade; o plano gratuito da DeepL dá 500 mil caracteres/mês)
 *   - sem chave: MyMemory, gratuito (TRANSLATE_EMAIL opcional aumenta o limite diário)
 * Gêneros, temas e modos são traduzidos por dicionário no site (src/lib/igdbPt.ts).
 */

type Req = { query: Record<string, string | string[] | undefined>; method?: string; body?: unknown };
type Res = { status: (n: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void };

let token: { value: string; expires: number } | null = null;

async function getToken() {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) throw new Error('TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET não configurados');
  const r = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, { method: 'POST' });
  if (!r.ok) throw new Error(`Twitch respondeu ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  token = { value: j.access_token, expires: Date.now() + j.expires_in * 1000 };
  return token.value;
}

async function igdb(endpoint: string, body: string) {
  const r = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID!, Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'text/plain' },
    body,
  });
  if (!r.ok) throw new Error(`IGDB respondeu ${r.status}`);
  return r.json() as Promise<any[]>;
}

const image = (id?: string, size = 't_cover_big') => (id ? `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg` : '');
const fmtDate = (unix?: number) => (unix ? new Date(unix * 1000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '');


/* ------------------------------------------------------------------ */
/* Tradução da sinopse                                                 */
/* ------------------------------------------------------------------ */

async function deepl(text: string, key: string): Promise<string | null> {
  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const r = await fetch(`${host}/v2/translate`, {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: [text], source_lang: 'EN', target_lang: 'PT-BR' }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { translations?: { text: string }[] };
  return j.translations?.[0]?.text ?? null;
}

/** Quebra em pedaços de até ~450 bytes sem cortar frases (limite do MyMemory é 500). */
function chunks(text: string, max = 450): string[] {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
  const out: string[] = [];
  let cur = '';
  const bytes = (x: string) => new TextEncoder().encode(x).length;
  for (const s of sentences) {
    if (bytes(cur + s) > max && cur) { out.push(cur.trim()); cur = ''; }
    if (bytes(s) > max) {
      for (const w of s.split(' ')) { if (bytes(cur + w + ' ') > max && cur) { out.push(cur.trim()); cur = ''; } cur += w + ' '; }
    } else cur += s;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function mymemory(text: string): Promise<string | null> {
  const email = process.env.TRANSLATE_EMAIL ? `&de=${encodeURIComponent(process.env.TRANSLATE_EMAIL)}` : '';
  const parts = await Promise.all(chunks(text).map(async (c) => {
    const r = await fetch(`https://api.mymemory.translated.net/get?langpair=en|pt-BR${email}&q=${encodeURIComponent(c)}`, { signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { responseStatus?: number | string; responseData?: { translatedText?: string } };
    const t = j.responseData?.translatedText ?? '';
    if (Number(j.responseStatus) !== 200 || !t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) return null;
    return t;
  }));
  return parts.every(Boolean) ? parts.join(' ') : null;
}

async function toPortuguese(text: string): Promise<string | null> {
  try {
    const key = process.env.DEEPL_API_KEY;
    if (key) { const t = await deepl(text, key); if (t) return t; }
    return await mymemory(text);
  } catch {
    return null;
  }
}

const NEW_COLUMNS = ['summary_original', 'artworks', 'videos', 'themes', 'modes'];

function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  // Chaves novas (sb_secret_...) vão só no cabeçalho apikey; a antiga service_role também aceita Bearer.
  const headers: Record<string, string> = { apikey: key, ...(key.startsWith('sb_') ? {} : { Authorization: `Bearer ${key}` }), 'Content-Type': 'application/json' };
  return { url, headers };
}

/** Ids já usados no WinnerZ para estes jogos do IGDB (fichas antigas usam o slug como id). */
async function knownIds(igdbIds: number[]): Promise<Map<number, { id: string; slug: string }>> {
  const c = db();
  const out = new Map<number, { id: string; slug: string }>();
  if (!c || !igdbIds.length) return out;
  const r = await fetch(`${c.url}/rest/v1/games?select=id,slug,igdb_id&igdb_id=in.(${igdbIds.join(',')})`, { headers: c.headers });
  if (r.ok) for (const g of (await r.json()) as any[]) out.set(g.igdb_id, { id: g.id, slug: g.slug });
  return out;
}

/**
 * Grava no cache e devolve só as linhas que ficaram gravadas (o slug pode ganhar o número do IGDB).
 * Sem banco configurado (ambiente local), devolve tudo como veio.
 */
async function cacheGames<T extends Record<string, unknown>>(input: T[]): Promise<T[]> {
  const c = db();
  if (!c || !input.length) return input;
  const send = (body: Record<string, unknown>[]) => fetch(`${c.url}/rest/v1/games?on_conflict=id`, {
    method: 'POST', headers: { ...c.headers, Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(body),
  });
  let strip = (row: Record<string, unknown>) => row;
  let r = await send(input);
  // Banco sem as colunas novas ("source" da 0004, "ttb" e "released_on" da 0006): tenta sem elas; depois sem as colunas da 0002.
  if (r.status === 400) { strip = (row) => Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'source' && k !== 'ttb' && k !== 'released_on')); r = await send(input.map(strip)); }
  if (r.status === 400) { const prev = strip; strip = (row) => Object.fromEntries(Object.entries(prev(row)).filter(([k]) => !NEW_COLUMNS.includes(k))); r = await send(input.map(strip)); }
  if (r.ok) return input;
  // Algum slug já usado por outro jogo (ou outro erro no lote): grava um a um e devolve só o que entrou.
  const out: T[] = [];
  for (const row of input) {
    const one = await send([strip(row)]);
    if (one.ok) { out.push(row); continue; }
    if (one.status === 409) {
      const slug = `${row.slug}-${row.igdb_id}`;
      if ((await send([strip({ ...row, slug })])).ok) out.push({ ...row, slug });
    }
  }
  return out;
}

async function cachedSummary(igdbId: number): Promise<{ summary?: string; summary_original?: string } | null> {
  const c = db();
  if (!c) return null;
  try {
    const r = await fetch(`${c.url}/rest/v1/games?select=summary,summary_original&igdb_id=eq.${igdbId}`, { headers: c.headers });
    return r.ok ? ((await r.json()) as any[])[0] ?? null : null;
  } catch { return null; }
}

/** Dá ao jogo o id do WinnerZ: o que já existe, ou "igdb-<número>". */
async function assignIds<T extends { igdb_id: number; slug: string }>(rows: T[]): Promise<(T & { id: string })[]> {
  const known = await knownIds(rows.map((r) => r.igdb_id));
  return rows.map((r) => { const k = known.get(r.igdb_id); return { ...r, id: k?.id ?? `igdb-${r.igdb_id}`, slug: k?.slug ?? r.slug }; });
}

/* Artes sem logotipos ------------------------------------------------------- */
// O IGDB marca o tipo de cada arte (arte principal, fundo, logotipo...). Logotipo não serve de fundo nem de galeria.
let artTypes: Map<number, string> | null = null;
async function artworkTypes() {
  if (artTypes) return artTypes;
  try {
    const rows = await igdb('artwork_types', 'fields id,name,slug; limit 100;');
    artTypes = new Map(rows.map((r: any) => [r.id as number, `${r.slug ?? ''} ${r.name ?? ''}`.toLowerCase()]));
  } catch { artTypes = new Map(); } // tipos indisponíveis: fica com todas as artes
  return artTypes;
}
async function withoutLogos(arts: any[] = []) {
  const types = await artworkTypes();
  return arts.filter((a) => {
    const t = a.artwork_type != null ? types.get(Number(a.artwork_type)) ?? '' : '';
    return !(/logo/.test(t) && !/key.?art|arte/.test(t));
  });
}

const LIGHT_FIELDS = 'name,slug,first_release_date,cover.image_id,platforms.name,genres.name,themes.name,game_modes.name,player_perspectives.name,artworks.*,screenshots.image_id,involved_companies.company.name,involved_companies.developer';

/** Tempo para zerar (horas), pela média de quem informou no IGDB: rápido, normal e completo. */
async function timesToBeat(ids: number[]): Promise<Map<number, { h?: number; n?: number; c?: number }>> {
  const out = new Map<number, { h?: number; n?: number; c?: number }>();
  if (!ids.length) return out;
  try {
    const rows = await igdb('game_time_to_beats', `where game_id = (${ids.join(',')}); fields game_id,hastily,normally,completely; limit 500;`);
    const hours = (sec?: number) => (sec ? Math.round((sec / 3600) * 2) / 2 : undefined);
    for (const r of rows) out.set(r.game_id, { h: hours(r.hastily), n: hours(r.normally), c: hours(r.completely) });
  } catch { /* sem tempo para zerar: segue sem */ }
  return out;
}

const lightRow = (g: any) => ({
  igdb_id: g.id as number, slug: g.slug as string, title: g.name as string,
  cover: image(g.cover?.image_id), backdrop: image(g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id, 't_1080p') || null,
  year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
  developer: (g.involved_companies ?? []).find((c: any) => c.developer)?.company?.name ?? null,
  platforms: (g.platforms ?? []).map((p: any) => p.name),
  genres: (g.genres ?? []).map((x: any) => x.name).join(', ') || null,
  themes: (g.themes ?? []).map((x: any) => x.name),
  modes: [...(g.game_modes ?? []), ...(g.player_perspectives ?? [])].map((x: any) => x.name),
  released_on: g.first_release_date ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10) : null,
  source: 'igdb',
  updated_at: new Date().toISOString(),
});

const hit = (g: any) => ({
  igdbId: g.id, slug: g.slug, title: g.name,
  year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : undefined,
  cover: image(g.cover?.image_id), platforms: (g.platforms ?? []).map((p: any) => p.name),
});

const sleep = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
const SEARCH_FIELDS = 'name,slug,first_release_date,cover.image_id,platforms.name';

/** Uma busca, com nova tentativa se o IGDB pedir calma (429). */
async function searchOne(title: string) {
  for (let i = 0; i < 3; i++) {
    try { return await igdb('games', `search "${title}"; fields ${SEARCH_FIELDS}; limit 6;`); }
    catch (e) { if (i === 2 || !/429/.test(String(e))) throw e; await sleep(600 * (i + 1)); }
  }
  return [];
}

/**
 * Importador: até 10 títulos por chamada, buscados um a um (a consulta em lote do IGDB não aceita "search"),
 * no máximo 4 por segundo, que é o limite do IGDB.
 */
async function matchMany(items: { title: string }[]) {
  const list = items.slice(0, 10).map((x) => String(x.title ?? '').replace(/["\\]/g, '').slice(0, 120));
  const out: { title: string; candidates: ReturnType<typeof hit>[] }[] = [];
  for (const title of list) {
    const t0 = Date.now();
    const rows = await searchOne(title).catch(() => [] as any[]);
    out.push({ title, candidates: rows.map(hit) });
    await sleep(Math.max(0, 260 - (Date.now() - t0)));
  }
  return out;
}

/** Importador: fichas leves (sem sinopse), gravadas no cache. A ficha completa vem quando a página do jogo abre. */
async function cacheMany(ids: number[]) {
  const clean = [...new Set(ids.map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 100);
  if (!clean.length) return [];
  const rows = await igdb('games', `where id = (${clean.join(',')}); fields ${LIGHT_FIELDS}; limit 100;`);
  for (const r of rows) r.artworks = await withoutLogos(r.artworks);
  const ttb = await timesToBeat(rows.map((r: any) => r.id));
  const withIds = await assignIds(rows.map((r: any) => ({ ...lightRow(r), ttb: ttb.get(r.id) ?? null })));
  // Não apaga sinopse, vídeos etc. de fichas que já estavam completas: só envia os campos leves.
  return cacheGames(withIds);
}

/** Ficha completa (com tradução, mídia sem logotipos e tempo para zerar), gravada no cache. */
async function fullGame(id: number): Promise<{ game: Record<string, unknown>; fresh: boolean } | null> {
  const [g] = await igdb('games', `where id = ${id}; fields name,slug,summary,storyline,first_release_date,cover.image_id,artworks.*,screenshots.image_id,videos.video_id,videos.name,platforms.name,genres.name,themes.name,game_modes.name,player_perspectives.name,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,release_dates.date,release_dates.platform.name; limit 1;`);
  if (!g) return null;
  const dev = (g.involved_companies ?? []).find((c: any) => c.developer)?.company?.name;
  const pub = (g.involved_companies ?? []).find((c: any) => c.publisher)?.company?.name;
  g.artworks = await withoutLogos(g.artworks);
  const backdropId = g.artworks?.[0]?.image_id ?? g.screenshots?.[0]?.image_id;
  // A sinopse curta é melhor que o "storyline", que costuma ser longo e cheio de spoiler.
  const original: string | null = g.summary || g.storyline || null;
  // Ficha já traduzida e o texto original não mudou: reaproveita a tradução (economiza a cota gratuita).
  const prev = await cachedSummary(g.id);
  const translated = original
    ? (prev?.summary_original === original && prev.summary ? prev.summary : await toPortuguese(original))
    : null;
  // Uma data por plataforma: a primeira em que o jogo saiu nela.
  const firstByPlatform = new Map<string, number>();
  for (const r of g.release_dates ?? []) {
    const name = r.platform?.name; if (!name || !r.date) continue;
    if (!firstByPlatform.has(name) || r.date < firstByPlatform.get(name)!) firstByPlatform.set(name, r.date);
  }
  const [ids] = await assignIds([{ igdb_id: g.id as number, slug: g.slug as string }]);
  const game = {
    id: ids.id, igdb_id: g.id, slug: ids.slug, title: g.name, source: 'igdb',
    cover: image(g.cover?.image_id), backdrop: image(backdropId, 't_1080p') || null,
    year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
    developer: dev ?? null, publisher: pub ?? null,
    platforms: (g.platforms ?? []).map((p: any) => p.name),
    genres: (g.genres ?? []).map((x: any) => x.name).join(', ') || null,
    themes: (g.themes ?? []).map((x: any) => x.name),
    modes: [...(g.game_modes ?? []), ...(g.player_perspectives ?? [])].map((x: any) => x.name),
    summary: translated ?? original,
    summary_original: translated ? original : null,
    summary_source: translated ? 'Texto do IGDB, traduzido automaticamente' : 'Texto do IGDB, em inglês',
    releases: [...firstByPlatform].sort((a, b) => a[1] - b[1]).slice(0, 8).map(([platform, date]) => ({ platform, date: fmtDate(date) })),
    screenshots: (g.screenshots ?? []).slice(0, 16).map((s: any) => image(s.image_id, 't_screenshot_big')),
    artworks: (g.artworks ?? []).slice(0, 8).map((s: any) => image(s.image_id, 't_screenshot_big')),
    videos: (g.videos ?? []).filter((v: any) => v.video_id).slice(0, 8).map((v: any) => ({ id: v.video_id, name: v.name ?? '' })),
    ttb: (await timesToBeat([g.id])).get(g.id) ?? null,
    released_on: g.first_release_date ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10) : null,
    updated_at: new Date().toISOString(),
  };
  // Mesmo se o cache falhar, a ficha é mostrada; só não fica guardada.
  const [stored = game] = await cacheGames([game]);
  // Sem tradução (limite gratuito do dia, por exemplo), o CDN guarda por pouco tempo para tentar de novo.
  return { game: stored, fresh: !!translated || !original };
}

/* Explorar ---------------------------------------------------------------------------- */
const PLATFORM_NAMES = ['PlayStation 5', 'PlayStation 4', 'PlayStation 3', 'PlayStation 2', 'PlayStation', 'PlayStation Portable', 'PlayStation Vita',
  'Nintendo Switch 2', 'Nintendo Switch', 'Wii U', 'Wii', 'Nintendo GameCube', 'Nintendo 64', 'Super Nintendo Entertainment System', 'Nintendo 3DS', 'Nintendo DS', 'Game Boy Advance',
  'Xbox Series X|S', 'Xbox One', 'Xbox 360', 'Xbox', 'PC (Microsoft Windows)', 'Sega Mega Drive/Genesis', 'Dreamcast', 'Android', 'iOS'];

async function meta() {
  const [genres, modes, platforms, themes] = await Promise.all([
    igdb('genres', 'fields id,name; limit 100;'),
    igdb('game_modes', 'fields id,name; limit 50;'),
    igdb('platforms', `fields id,name; where name = (${PLATFORM_NAMES.map((n) => `"${n}"`).join(',')}); limit 100;`),
    igdb('themes', 'fields id,name; limit 100;'),
  ]);
  const order = (n: string) => PLATFORM_NAMES.indexOf(n);
  return {
    genres: genres.map((g: any) => ({ id: g.id, name: g.name })),
    modes: modes.map((g: any) => ({ id: g.id, name: g.name })),
    themes: themes.map((g: any) => ({ id: g.id, name: g.name })),
    platforms: platforms.map((p: any) => ({ id: p.id, name: p.name })).sort((a: any, b: any) => order(a.name) - order(b.name)),
  };
}

const ints = (v: unknown) => String(v ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 10);

async function explore(q: Record<string, string | string[] | undefined>) {
  const now = Math.floor(Date.now() / 1000);
  const where: string[] = ['cover != null', 'version_parent = null', 'parent_game = null'];
  const genre = ints(q.genre), platform = ints(q.platform), mode = ints(q.mode), theme = ints(q.theme);
  if (genre.length) where.push(`genres = (${genre.join(',')})`);
  if (platform.length) where.push(`platforms = (${platform.join(',')})`);
  if (mode.length) where.push(`game_modes = (${mode.join(',')})`);
  if (theme.length) where.push(`themes = (${theme.join(',')})`);
  const from = Number(q.from), to = Number(q.to);
  if (from > 1950) where.push(`first_release_date >= ${Math.floor(Date.UTC(from, 0, 1) / 1000)}`);
  if (to > 1950) where.push(`first_release_date < ${Math.floor(Date.UTC(to + 1, 0, 1) / 1000)}`);
  const sort = String(q.sort ?? 'popular');
  let order = 'total_rating_count desc';
  if (sort === 'popular') where.push('total_rating_count > 3');
  if (sort === 'rating') { where.push('total_rating_count >= 15'); order = 'total_rating desc'; }
  if (sort === 'recent') { where.push(`first_release_date < ${now}`, 'first_release_date != null'); order = 'first_release_date desc'; }
  if (sort === 'upcoming') { where.push(`first_release_date > ${now}`); order = 'first_release_date asc'; }
  const page = Math.max(0, Math.min(20, Number(q.page) || 0));
  const rows = await igdb('games', `fields name,slug,first_release_date,cover.image_id,platforms.name,total_rating,total_rating_count; where ${where.join(' & ')}; sort ${order}; limit 36; offset ${page * 36};`);
  return rows.map((g: any) => ({ ...hit(g), rating: g.total_rating ? Math.round(g.total_rating) : undefined, date: g.first_release_date ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10) : undefined }));
}

/* Universo do jogo ---------------------------------------------------------------------- */
async function universe(id: number) {
  const base = 'franchises.name,franchises.games,dlcs,expansions,standalone_expansions,remakes,remasters,parent_game,similar_games,ports';
  let rows: any[];
  try { rows = await igdb('games', `where id = ${id}; fields ${base},collections.name,collections.games; limit 1;`); }
  catch { rows = await igdb('games', `where id = ${id}; fields ${base}; limit 1;`); }
  const g = rows[0];
  if (!g) return { groups: [] };
  const franchise = [...new Set([...(g.franchises ?? []).flatMap((f: any) => f.games ?? []), ...(g.collections ?? []).flatMap((c: any) => c.games ?? [])])].filter((x) => x !== id);
  const plan: [string, number[]][] = [
    ['Da mesma série', franchise.slice(0, 18)],
    ['Expansões e DLCs', [...(g.expansions ?? []), ...(g.standalone_expansions ?? []), ...(g.dlcs ?? [])].slice(0, 12)],
    ['Remakes e remasterizações', [...(g.remakes ?? []), ...(g.remasters ?? [])].slice(0, 8)],
    ['Jogo original', g.parent_game ? [g.parent_game] : []],
    ['Parecidos', (g.similar_games ?? []).slice(0, 12)],
  ];
  const ids = [...new Set(plan.flatMap(([, list]) => list))];
  if (!ids.length) return { groups: [], series: g.franchises?.[0]?.name ?? g.collections?.[0]?.name ?? null };
  const info = await igdb('games', `where id = (${ids.join(',')}); fields name,slug,first_release_date,cover.image_id,platforms.name; limit 100;`);
  const byId = new Map(info.map((x: any) => [x.id, hit(x)]));
  const groups = plan.map(([title, list]) => ({ title, games: list.map((x) => byId.get(x)).filter(Boolean) }))
    .filter((gr) => gr.games.length);
  // Série em ordem de lançamento.
  for (const gr of groups) if (gr.title === 'Da mesma série') (gr.games as any[]).sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
  return { groups, series: g.franchises?.[0]?.name ?? g.collections?.[0]?.name ?? null };
}

export default async function handler(req: Req, res: Res) {
  try {
    if (req.method === 'POST') {
      const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}) as { match?: { title: string }[]; cache?: number[] };
      if (Array.isArray(body.match)) return res.status(200).json(await matchMany(body.match));
      if (Array.isArray(body.cache)) return res.status(200).json(await cacheMany(body.cache));
      return res.status(400).json({ error: 'Envie {match:[...]} ou {cache:[...]}' });
    }
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const id = typeof req.query.id === 'string' ? Number(req.query.id) : NaN;

    if (q) {
      const safe = q.replace(/"/g, '');
      const rows = await igdb('games', `search "${safe}"; fields name,slug,first_release_date,cover.image_id,platforms.name; limit 12;`);
      res.setHeader('Cache-Control', 's-maxage=3600');
      return res.status(200).json(rows.map(hit));
    }

    if (Number.isFinite(id)) {
      const r = await fullGame(id);
      if (!r) return res.status(404).json({ error: 'Jogo não encontrado no IGDB' });
      res.setHeader('Cache-Control', r.fresh ? 's-maxage=86400' : 's-maxage=600');
      return res.status(200).json(r.game);
    }

    const slug = typeof req.query.slug === 'string' ? req.query.slug.replace(/[^a-z0-9-]/gi, '').slice(0, 120) : '';
    if (slug) {
      const [found] = await igdb('games', `where slug = "${slug}"; fields id; limit 1;`);
      const r = found ? await fullGame(found.id) : null;
      if (!r) return res.status(404).json({ error: 'Jogo não encontrado no IGDB' });
      res.setHeader('Cache-Control', r.fresh ? 's-maxage=86400' : 's-maxage=600');
      return res.status(200).json(r.game);
    }

    if (req.query.meta) {
      res.setHeader('Cache-Control', 's-maxage=604800');
      return res.status(200).json(await meta());
    }

    if (req.query.explore) {
      res.setHeader('Cache-Control', 's-maxage=21600');
      return res.status(200).json(await explore(req.query));
    }

    const related = typeof req.query.related === 'string' ? Number(req.query.related) : NaN;
    if (Number.isFinite(related)) {
      res.setHeader('Cache-Control', 's-maxage=86400');
      return res.status(200).json(await universe(related));
    }

    return res.status(400).json({ error: 'Use ?q=, ?id=, ?slug=, ?meta=1, ?explore=1 ou ?related=' });
  } catch (err) {
    return res.status(502).json({ error: err instanceof Error ? err.message : 'Falha ao consultar o IGDB' });
  }
}
