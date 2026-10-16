import type { SupabaseClient } from '@supabase/supabase-js';
import type { Adapter, Action } from './store';
import { emptyState } from './store';
import type { State, Game, Review, History, Session, TimelineEvent, Copy, Journey, MyGame, Hardware, Loan, Showcase, MuseumRoom, Museum } from './types';
import { SUPABASE_URL, SUPABASE_KEY } from '../lib/env';
import { avatarUrl } from '../lib/avatar';

/**
 * Modo Supabase: lê e grava nas tabelas definidas em supabase/migrations.
 * As políticas de RLS garantem que cada pessoa só acesse o que é seu.
 */

let client: SupabaseClient | null = null;

export async function getClient(): Promise<SupabaseClient> {
  if (client) return client;
  const { createClient } = await import('@supabase/supabase-js');
  client = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

/** Token da sessão atual, para as funções do servidor conferirem quem é (calendário do Radar, Steam). */
export async function accessToken(): Promise<string | null> {
  const sb = await getClient();
  return (await sb.auth.getSession()).data.session?.access_token ?? null;
}

/* Fotos no Storage --------------------------------------------------------- */

const BUCKET = 'momentos';
const SIGNED_FOR = 60 * 60 * 24 * 7; // links das fotos valem 7 dias
let storageReady = false;
/** A migração 0004 (Etapa 2) já rodou? Sem ela, as colunas novas não são enviadas. */
let v14 = false;
let v15 = false;
let v4 = false;
/** A migração 0006 já rodou? */
let v6 = false;
export function schemaV6() { return v6; }
let v8 = false;
/** A migração 0037 já rodou? (progresso por sessão e capítulos narrados) */
let v37 = false;
export function schemaV37() { return v37; }
/** A migração 0038 já rodou? (capítulo da História e objetivo da sessão) */
let v38 = false;
let v58 = false;
let v61 = false;
export function schemaV38() { return v38; }
/** A migração 0039 já rodou? (pontes: Steam e RetroAchievements) */
let v39 = false;
export function schemaV39() { return v39; }
/** A migração 0043 já rodou? (intenção da sessão: "jogar como descanso") */
let v43 = false;
export function schemaV43() { return v43; }
/** Alguma página não carregou: o importador fica bloqueado para não duplicar o que não apareceu. */
let loadIncomplete = false;
export function schemaV4() { return v4; }

/** A migração 0003 já rodou? Sem ela, as fotos continuam indo no registro, como antes. */
export function photoStorageReady() { return storageReady; }

export function photoPath(userId: string, eventId: string) { return `${userId}/${eventId}.jpg`; }

/** Envia a foto, tentando de novo duas vezes se a conexão falhar. */
export async function uploadPhoto(path: string, blob: Blob): Promise<void> {
  const sb = await getClient();
  let last: unknown;
  for (let i = 0; i < 3; i++) {
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true, cacheControl: '31536000' });
    if (!error) return;
    last = error;
    await new Promise((r) => setTimeout(r, 800 * (i + 1)));
  }
  throw last;
}

async function signPaths(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const sb = await getClient();
  const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths, SIGNED_FOR);
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl as string]));
}

/** Fotos antigas, gravadas dentro do banco, vão para o Storage uma vez, em segundo plano. */
export async function moveLegacyPhotos(events: TimelineEvent[], userId: string, onMoved: (eventId: string, imagePath: string) => void) {
  if (!storageReady) return;
  const sb = await getClient();
  for (const e of events) {
    if (e.imagePath || !e.image?.startsWith('data:')) continue;
    try {
      const blob = await (await fetch(e.image)).blob();
      const path = photoPath(userId, e.id);
      await uploadPhoto(path, blob);
      const { error } = await sb.from('timeline_events').update({ image_path: path, image: null }).eq('id', e.id);
      if (!error) onMoved(e.id, path);
    } catch { /* tenta de novo na próxima visita */ }
  }
}

/* Conversões banco ↔ app ------------------------------------------------ */
const gameFromRow = (r: any): Game => ({
  id: r.id, slug: r.slug, igdbId: r.igdb_id ?? undefined, title: r.title, cover: r.cover ?? '',
  backdrop: r.backdrop ?? undefined, year: r.year ?? undefined, developer: r.developer ?? undefined,
  publisher: r.publisher ?? undefined, platforms: r.platforms ?? [], genres: r.genres ?? undefined,
  summary: r.summary ?? undefined, summarySource: r.summary_source ?? undefined,
  releases: r.releases ?? undefined, screenshots: r.screenshots ?? undefined,
  summaryOriginal: r.summary_original ?? undefined, themes: r.themes ?? undefined, modes: r.modes ?? undefined,
  artworks: r.artworks ?? undefined, videos: r.videos ?? undefined,
  source: r.source ?? 'igdb', createdBy: r.created_by ?? undefined,
  ttb: r.ttb ?? undefined, releasedOn: r.released_on ?? undefined, fixes: r.fixes ?? undefined,
});
const historyFromRow = (r: any): History => ({
  id: r.id, journeyId: r.journey_id, ordinal: r.ordinal, title: r.title, state: r.state,
  startedAt: r.started_at, completedAt: r.completed_at ?? undefined, progress: r.progress ?? undefined,
  mode: r.mode ?? undefined,
  letter: r.letter_text ? { text: r.letter_text, openedAt: r.letter_opened_at ?? undefined } : undefined,
  startedPrecision: r.started_precision ?? undefined, completedPrecision: r.completed_precision ?? undefined,
  hours: r.hours != null ? Number(r.hours) : undefined, note: r.note ?? undefined, capsule: r.capsule ?? undefined,
  narrations: r.narrations && Object.keys(r.narrations).length ? r.narrations : undefined,
  part: r.part ?? undefined,
  partLog: Array.isArray(r.part_log) && r.part_log.length ? r.part_log : undefined,
});
const sessionFromRow = (r: any): Session => ({
  id: r.id, journeyId: r.journey_id, historyId: r.history_id, startedAt: r.started_at,
  endedAt: r.ended_at ?? undefined, minutes: r.minutes ?? undefined, note: r.note ?? undefined,
  whereStopped: r.where_stopped ?? undefined, feeling: r.feeling ?? undefined, companions: r.companions?.length ? r.companions : undefined,
  progress: r.progress ?? undefined,
  goal: r.goal ?? undefined, goalDone: r.goal_done ?? undefined, source: r.source ?? undefined,
  intent: r.intent ?? undefined, intentMet: r.intent_met ?? undefined,
  partMarks: r.part_marks && typeof r.part_marks === 'object' && (r.part_marks.from || r.part_marks.to || r.part_marks.done?.length) ? r.part_marks : undefined,
});
const eventFromRow = (r: any): TimelineEvent => ({
  id: r.id, journeyId: r.journey_id, historyId: r.history_id, sessionId: r.session_id ?? undefined,
  kind: r.kind, at: r.at, title: r.title, text: r.text ?? undefined, quote: r.quote ?? undefined,
  image: r.image ?? undefined, imagePath: r.image_path ?? undefined, resolved: r.resolved, dateLabel: r.date_label ?? undefined,
  precision: r.date_precision ?? undefined,
});
const copyFromRow = (r: any): Copy => ({
  id: r.id, gameId: r.game_id, createdAt: r.created_at ?? undefined, platform: r.platform, kind: r.kind, items: r.items ?? undefined,
  condition: r.condition ?? undefined, origin: r.origin ?? undefined, note: r.note ?? undefined, special: r.special,
  region: r.region ?? undefined, edition: r.edition ?? undefined, boxCondition: r.box_condition ?? undefined,
  purchasedOn: r.purchased_on ?? undefined, purchasePlace: r.purchase_place ?? undefined,
  pricePaid: r.price_paid != null ? Number(r.price_paid) : undefined, priceNow: r.price_now != null ? Number(r.price_now) : undefined,
});
const hardwareFromRow = (r: any): Hardware => ({
  id: r.id, kind: r.kind, name: r.name, platform: r.platform ?? undefined, model: r.model ?? undefined, edition: r.edition ?? undefined,
  region: r.region ?? undefined, condition: r.condition ?? undefined, items: r.items ?? undefined, serial: r.serial ?? undefined,
  origin: r.origin ?? undefined, purchasedOn: r.purchased_on ?? undefined, purchasePlace: r.purchase_place ?? undefined,
  pricePaid: r.price_paid != null ? Number(r.price_paid) : undefined, note: r.note ?? undefined, createdAt: r.created_at ?? undefined,
});
const hardwareToRow = (h: Hardware) => ({
  id: h.id, kind: h.kind, name: h.name, platform: h.platform ?? null, model: h.model ?? null, edition: h.edition ?? null, region: h.region ?? null,
  condition: h.condition ?? null, items: h.items ?? null, serial: h.serial ?? null, origin: h.origin ?? null, purchased_on: h.purchasedOn ?? null,
  purchase_place: h.purchasePlace ?? null, price_paid: h.pricePaid ?? null, note: h.note ?? null,
});
const loanFromRow = (r: any): Loan => ({
  id: r.id, copyId: r.copy_id ?? undefined, hardwareId: r.hardware_id ?? undefined, person: r.person, lentOn: r.lent_on,
  dueOn: r.due_on ?? undefined, returnedOn: r.returned_on ?? undefined, note: r.note ?? undefined, createdAt: r.created_at ?? undefined,
});
const loanToRow = (l: Loan) => ({
  id: l.id, copy_id: l.copyId ?? null, hardware_id: l.hardwareId ?? null, person: l.person, lent_on: l.lentOn,
  due_on: l.dueOn ?? null, returned_on: l.returnedOn ?? null, note: l.note ?? null,
});
const showcaseFromRow = (r: any): Showcase => ({
  id: r.id, title: r.title, description: r.description ?? undefined, kind: r.kind, rule: r.rule ?? undefined,
  items: Array.isArray(r.items) ? r.items : [], position: r.position ?? 0, shared: !!r.shared, modHidden: !!r.mod_hidden || undefined, createdAt: r.created_at ?? undefined,
});
const showcaseToRow = (x: Showcase) => ({
  id: x.id, title: x.title, description: x.description ?? null, kind: x.kind, rule: x.rule ?? null,
  items: x.kind === 'curada' ? x.items : [], position: x.position, shared: !!x.shared, updated_at: new Date().toISOString(),
});
const roomFromRow = (r: any): MuseumRoom => ({
  id: r.id, position: r.position ?? 0, title: r.title, text: r.text ?? undefined, pieces: Array.isArray(r.pieces) ? r.pieces : [], createdAt: r.created_at ?? undefined,
});
// A foto vai pelo caminho; o endereço temporário (image) nunca é gravado.
const roomToRow = (x: MuseumRoom) => ({
  id: x.id, position: x.position, title: x.title, text: x.text ?? null, updated_at: new Date().toISOString(),
  pieces: x.pieces.map((p) => (p.t === 'f' ? { t: 'f', id: p.id, path: p.path, caption: p.caption } : p)).filter((p) => p.t !== 'f' || (p as { path?: string }).path),
});

const myGameFromRow = (r: any): MyGame => ({
  gameId: r.game_id, priority: r.priority ?? undefined, estHours: r.est_hours != null ? Number(r.est_hours) : undefined,
  wontPlay: !!r.wont_play, genre: r.genre ?? undefined, note: r.note ?? undefined,
  notNowUntil: r.not_now_until ?? undefined, notNowReason: r.not_now_reason ?? undefined,
  steamMinutes: r.steam_minutes ?? undefined, onRadar: r.on_radar || undefined,
});
export const reviewFromRow = (r: any, me: string | null): Review => {
  const name: string = r.profiles?.display_name ?? 'Jogador';
  return {
    id: r.id, gameId: r.game_id, mine: r.user_id === me,
    author: { name, initial: name.slice(0, 1).toUpperCase(), color: '#3B3229' },
    rating: { normalized: r.normalized, originalScale: r.original_scale, originalValue: Number(r.original_value) },
    title: r.title, text: r.text, context: r.context ?? undefined, spoiler: r.spoiler, writtenAt: r.created_at,
  };
};

const historyToRow = (h: History) => ({
  id: h.id, journey_id: h.journeyId, ordinal: h.ordinal, title: h.title, state: h.state,
  started_at: h.startedAt, completed_at: h.completedAt ?? null, progress: h.progress ?? null, mode: h.mode ?? null,
  letter_text: h.letter?.text ?? null, letter_opened_at: h.letter?.openedAt ?? null,
  ...(v4 ? { started_precision: h.startedPrecision ?? 'dia', completed_precision: h.completedPrecision ?? 'dia', hours: h.hours ?? null, note: h.note ?? null } : {}),
  ...(v8 ? { capsule: h.capsule ?? null } : {}),
  ...(v37 ? { narrations: h.narrations ?? {} } : {}),
  ...(v38 ? { part: h.part ?? null } : {}),
  ...(v58 ? { part_log: h.partLog?.length ? h.partLog : null } : {}),
});
const sessionToRow = (x: Session) => ({
  id: x.id, journey_id: x.journeyId, history_id: x.historyId, started_at: x.startedAt, ended_at: x.endedAt ?? null,
  minutes: x.minutes ?? null, note: x.note ?? null, where_stopped: x.whereStopped ?? null, feeling: x.feeling ?? null,
  ...(v8 ? { companions: x.companions?.length ? x.companions : null } : {}),
  ...(v37 ? { progress: x.progress ?? null } : {}),
  ...(v38 ? { goal: x.goal ?? null, goal_done: x.goalDone ?? null } : {}),
  ...(v39 ? { source: x.source ?? null } : {}),
  ...(v43 ? { intent: x.intent ?? null, intent_met: x.intentMet ?? null } : {}),
  ...(v61 ? { part_marks: x.partMarks ?? null } : {}),
});
const eventToRow = (e: TimelineEvent) => {
  const row: Record<string, unknown> = {
    id: e.id, journey_id: e.journeyId, history_id: e.historyId, session_id: e.sessionId ?? null, kind: e.kind,
    at: e.at, title: e.title, text: e.text ?? null, quote: e.quote ?? null,
    // Foto no Storage: o banco guarda só o caminho. Links temporários e fotos locais nunca vão para o banco.
    image: e.imagePath || e.image?.startsWith('blob:') || e.image?.includes('/storage/v1/') ? null : e.image ?? null,
    resolved: !!e.resolved, date_label: e.dateLabel ?? null,
  };
  if (e.imagePath) row.image_path = e.imagePath;
  if (v4) row.date_precision = e.precision ?? 'dia';
  return row;
};
const journeyToRow = (j: Journey) => ({ id: j.id, game_id: j.gameId, mood: j.mood, paused_note: j.pausedNote ?? null });
const copyToRow = (c: Copy) => ({
  id: c.id, game_id: c.gameId, platform: c.platform, kind: c.kind, items: c.items ?? null, condition: c.condition ?? null,
  origin: c.origin ?? null, note: c.note ?? null, special: !!c.special,
  ...(v4 ? {
    region: c.region ?? null, edition: c.edition ?? null, box_condition: c.boxCondition ?? null, purchased_on: c.purchasedOn ?? null,
    purchase_place: c.purchasePlace ?? null, price_paid: c.pricePaid ?? null, price_now: c.priceNow ?? null,
  } : {}),
});
const myGameToRow = (m: MyGame) => ({
  game_id: m.gameId, priority: m.priority ?? null, est_hours: m.estHours ?? null, wont_play: !!m.wontPlay,
  genre: m.genre ?? null, note: m.note ?? null, updated_at: new Date().toISOString(),
  ...(v6 ? { not_now_until: m.notNowUntil ?? null, not_now_reason: m.notNowReason ?? null, steam_minutes: m.steamMinutes ?? null, on_radar: !!m.onRadar } : {}),
});
const reviewToRow = (r: Review) => ({
  id: r.id, game_id: r.gameId, normalized: r.rating.normalized, original_scale: r.rating.originalScale,
  original_value: r.rating.originalValue, title: r.title, text: r.text, spoiler: !!r.spoiler, updated_at: new Date().toISOString(),
});
const manualGameToRow = (g: Game) => ({
  id: g.id, slug: g.slug, title: g.title, cover: g.cover || null, year: g.year ?? null, platforms: g.platforms,
  genres: g.genres ?? null, source: 'manual', created_by: g.createdBy ?? null, igdb_id: null,
});

/**
 * Perfil de quem entrou. Desde a migração 0009 as preferências são privadas e vêm pela
 * função my_prefs(); num banco sem a 0009, lê a linha inteira como antes.
 */
async function loadProfile(sb: SupabaseClient, uid: string): Promise<{ data: any; error: any }> {
  const [row, prefs, mine, guest] = await Promise.all([
    sb.from('profiles').select('display_name, is_admin').eq('id', uid).maybeSingle(),
    sb.rpc('my_prefs'),
    sb.rpc('my_profile'),
    sb.rpc('am_site_guest'),
  ]);
  if (!row.error && !prefs.error) return { data: row.data ? { ...row.data, prefs: prefs.data ?? {}, avatar: (mine.data as { avatar?: string } | null)?.avatar ?? null, is_guest: guest.data === true } : null, error: null };
  return sb.from('profiles').select('*').eq('id', uid).maybeSingle();
}

/**
 * O Supabase devolve no máximo 1000 linhas por pedido; coleções grandes vêm em páginas
 * (ordenadas por um campo único, para nenhuma linha pular ou repetir entre páginas).
 * Uma página que falha é tentada de novo; se falhar de novo, a carga é marcada como incompleta.
 */
async function selectAll(build: () => any, page = 1000): Promise<{ data: any[]; error: any }> {
  const out: any[] = [];
  for (let from = 0; ; from += page) {
    let { data, error } = await build().range(from, from + page - 1);
    if (error) ({ data, error } = await build().range(from, from + page - 1));
    if (error) { loadIncomplete = true; return { data: out, error }; }
    out.push(...(data ?? []));
    if (!data || data.length < page) return { data: out, error: null };
  }
}

/** Grava muitas linhas em lotes, para importações grandes. */
async function insertMany(table: string, rows: Record<string, unknown>[], opts: { upsert?: string } = {}) {
  const sb = await getClient();
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400);
    const q = opts.upsert ? sb.from(table).upsert(chunk, { onConflict: opts.upsert }) : sb.from(table).insert(chunk);
    check(await q);
  }
}

async function removePhotos(paths: string[]) {
  if (!paths.length || !storageReady) return;
  const sb = await getClient();
  await sb.storage.from(BUCKET).remove(paths).catch(() => {});
}

function check<T>(res: { data: T; error: any }): T {
  if (res.error) throw res.error;
  return res.data;
}

export const supabaseAdapter: Adapter = {
  async load(): Promise<State> {
    const sb = await getClient();
    const base: State = { ...emptyState(), mode: 'supabase', ready: true };
    const { data: auth } = await sb.auth.getUser();
    const user = auth.user;
    if (!user) return base;

    loadIncomplete = false;
    const probe = await sb.from('my_games').select('game_id').limit(1);
    v4 = !probe.error;
    v6 = v4 && !(await sb.from('my_games').select('not_now_until,on_radar').limit(1)).error;
    v8 = !(await sb.from('histories').select('capsule').limit(1)).error && !(await sb.from('sessions').select('companions').limit(1)).error;
    v37 = v8 && !(await sb.from('sessions').select('progress').limit(1)).error && !(await sb.from('histories').select('narrations').limit(1)).error;
    v38 = v37 && !(await sb.from('sessions').select('goal,goal_done').limit(1)).error && !(await sb.from('histories').select('part').limit(1)).error;
    v39 = v38 && !(await sb.from('sessions').select('source').limit(1)).error;
    v58 = v38 && !(await sb.from('histories').select('part_log').limit(1)).error;
    v43 = v39 && !(await sb.from('sessions').select('intent,intent_met').limit(1)).error;
    v61 = v43 && !(await sb.from('sessions').select('part_marks').limit(1)).error;
    v14 = !(await sb.from('hardware').select('id').limit(1)).error && !(await sb.from('copies').select('deleted_at').limit(1)).error;
    v15 = v14 && !(await sb.from('loans').select('id').limit(1)).error && !(await sb.from('museum_rooms').select('id').limit(1)).error;
    if (v14) {
      // Lixeira: o que passou de 30 dias sai de vez.
      const old = new Date(Date.now() - 30 * 86400000).toISOString();
      await Promise.all([sb.from('copies').delete().lt('deleted_at', old), sb.from('hardware').delete().lt('deleted_at', old)]).catch(() => null);
    }
    const [profile, copies, wishes, favs, journeys, histories, sessions, events, myReviews, mine] = await Promise.all([
      loadProfile(sb, user.id),
      selectAll(() => (v14 ? sb.from('copies').select('*').is('deleted_at', null) : sb.from('copies').select('*')).order('created_at').order('id')),
      selectAll(() => sb.from('wishes').select('*').order('created_at').order('game_id')),
      selectAll(() => sb.from('favorites').select('*').order('created_at').order('game_id')),
      selectAll(() => sb.from('journeys').select('*').order('created_at').order('id')),
      selectAll(() => sb.from('histories').select('*').order('id')),
      selectAll(() => sb.from('sessions').select('*').order('started_at').order('id')),
      selectAll(() => sb.from('timeline_events').select('*').order('at').order('id')),
      selectAll(() => sb.from('reviews').select('*, profiles(display_name)').eq('user_id', user.id).order('created_at').order('id')),
      v4 ? selectAll(() => sb.from('my_games').select('*').order('game_id')) : Promise.resolve({ data: [], error: null }),
    ]);

    const [trashCopies, hardware] = v14
      ? await Promise.all([
        selectAll(() => sb.from('copies').select('*').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }).order('id')),
        selectAll(() => sb.from('hardware').select('*').order('created_at').order('id')),
      ])
      : [{ data: [] as any[], error: null }, { data: [] as any[], error: null }];

    const [loans, showcases, rooms, museum] = v15
      ? await Promise.all([
        selectAll(() => sb.from('loans').select('*').order('created_at').order('id')),
        selectAll(() => sb.from('showcases').select('*').order('position').order('id')),
        selectAll(() => sb.from('museum_rooms').select('*').order('position').order('id')),
        sb.rpc('my_museum'),
      ])
      : [{ data: [] as any[] }, { data: [] as any[] }, { data: [] as any[] }, { data: {} }];
    const museumRooms = ((rooms.data ?? []) as any[]).map(roomFromRow);

    const gameIds = new Set<string>();
    for (const r of [...copies.data, ...trashCopies.data, ...wishes.data, ...favs.data, ...journeys.data, ...myReviews.data, ...mine.data]) gameIds.add(r.game_id);
    // Muitos ids não cabem num endereço só: busca em grupos.
    const ids = [...gameIds];
    const games: any[] = [];
    for (let i = 0; i < ids.length; i += 150) games.push(...(check(await sb.from('games').select('*').in('id', ids.slice(i, i + 150))) as any[]));

    // Fotos: confere se a migração 0003 rodou e gera os links temporários de uma vez só.
    storageReady = !(await sb.from('timeline_events').select('image_path').limit(1)).error;
    const evs = (events.data ?? []).map(eventFromRow);
    const roomPaths = museumRooms.flatMap((r) => r.pieces.flatMap((p) => (p.t === 'f' && p.path ? [p.path] : [])));
    const signed = await signPaths([...evs.filter((e) => e.imagePath).map((e) => e.imagePath!), ...roomPaths]);
    for (const e of evs) if (e.imagePath) e.image = signed[e.imagePath];
    for (const r of museumRooms) for (const p of r.pieces) if (p.t === 'f' && p.path) p.image = signed[p.path];

    const p = profile.data;
    const name: string = p?.display_name ?? user.email?.split('@')[0] ?? 'Jogador';
    return {
      ...base,
      profile: { id: user.id, name, initial: name.slice(0, 1).toUpperCase(), avatar: avatarUrl(p?.avatar) },
      prefs: { ...base.prefs, ...(p?.prefs ?? {}) },
      schemaV4: v4,
      schemaV6: v6,
      schemaV8: v8,
      schemaV43: v43,
      isAdmin: !!p?.is_admin,
      isGuest: !!p?.is_guest,
      loadIncomplete,
      myGames: Object.fromEntries(mine.data.map((m: any) => [m.game_id, myGameFromRow(m)])),
      games: Object.fromEntries((games as any[]).map((g) => [g.id, gameFromRow(g)])),
      copies: (copies.data ?? []).map(copyFromRow),
      trashCopies: (trashCopies.data ?? []).map((r: any) => ({ ...copyFromRow(r), deletedAt: r.deleted_at })),
      hardware: (hardware.data ?? []).filter((r: any) => !r.deleted_at).map(hardwareFromRow),
      trashHardware: (hardware.data ?? []).filter((r: any) => r.deleted_at).map((r: any) => ({ ...hardwareFromRow(r), deletedAt: r.deleted_at })),
      schemaV14: v14,
      schemaV15: v15,
      loans: (loans.data ?? []).map(loanFromRow),
      showcases: (showcases.data ?? []).map(showcaseFromRow),
      rooms: museumRooms,
      museum: (museum.data && typeof museum.data === 'object' ? museum.data : {}) as Museum,
      wishes: (wishes.data ?? []).map((w: any) => ({ gameId: w.game_id, note: w.note ?? undefined })),
      favorites: (favs.data ?? []).map((f: any) => f.game_id),
      journeys: (journeys.data ?? []).map((j: any) => ({ id: j.id, gameId: j.game_id, mood: j.mood, pausedNote: j.paused_note ?? undefined, createdAt: j.created_at ?? undefined, shared: !!j.shared, modHidden: !!j.mod_hidden || undefined })),
      histories: (histories.data ?? []).map(historyFromRow),
      sessions: (sessions.data ?? []).map(sessionFromRow),
      events: evs,
      reviews: (myReviews.data ?? []).map((r: any) => reviewFromRow(r, user.id)),
    };
  },

  async persist(a: Action, next: State) {
    const sb = await getClient();
    switch (a.type) {
      case 'prefs':
        if (next.profile) check(await sb.from('profiles').update({ prefs: next.prefs }).eq('id', next.profile.id));
        try { localStorage.setItem('wz.prefs', JSON.stringify(next.prefs)); } catch { /* nada */ }
        return;
      case 'favorite':
        if (a.value) check(await sb.from('favorites').upsert({ game_id: a.gameId }));
        else check(await sb.from('favorites').delete().eq('game_id', a.gameId));
        return;
      case 'wish':
        if (a.value) check(await sb.from('wishes').upsert({ game_id: a.gameId }));
        else check(await sb.from('wishes').delete().eq('game_id', a.gameId));
        return;
      case 'journey.create':
        check(await sb.from('journeys').insert(journeyToRow(a.journey)));
        check(await sb.from('histories').insert(historyToRow(a.history)));
        check(await sb.from('timeline_events').insert(eventToRow(a.event)));
        return;
      case 'history.create':
        check(await sb.from('histories').insert(historyToRow(a.history)));
        check(await sb.from('timeline_events').insert(eventToRow(a.event)));
        return;
      case 'session.start':
        check(await sb.from('sessions').insert(sessionToRow(a.session)));
        return;
      case 'session.add':
        check(await sb.from('sessions').insert(sessionToRow(a.session)));
        check(await sb.from('timeline_events').insert(eventToRow(a.event)));
        return;
      case 'session.finish':
        check(await sb.from('sessions').update(sessionToRow(a.session)).eq('id', a.session.id));
        check(await sb.from('timeline_events').insert(eventToRow(a.event)));
        if (a.progress) check(await sb.from('histories').update({ progress: a.progress.value }).eq('id', a.progress.historyId));
        return;
      case 'event.add':
        check(await sb.from('timeline_events').insert(eventToRow(a.event)));
        return;
      case 'event.update': {
        const p = a.patch, row: Record<string, unknown> = {};
        if (p.imagePath !== undefined) { row.image_path = p.imagePath || null; row.image = null; }
        if ('title' in p) row.title = p.title;
        if ('text' in p) row.text = p.text ?? null;
        if ('quote' in p) row.quote = p.quote ?? null;
        if ('at' in p) row.at = p.at;
        if ('dateLabel' in p) row.date_label = p.dateLabel ?? null;
        if ('precision' in p && v4) row.date_precision = p.precision ?? 'dia';
        if (Object.keys(row).length) check(await sb.from('timeline_events').update(row).eq('id', a.eventId));
        return;
      }
      case 'event.resolve':
        check(await sb.from('timeline_events').update({ resolved: true }).eq('id', a.eventId));
        return;
      case 'progress':
        check(await sb.from('histories').update({ progress: a.value }).eq('id', a.historyId));
        return;
      case 'history.complete':
        check(await sb.from('histories').update(historyToRow(a.history)).eq('id', a.history.id));
        check(await sb.from('sessions').update({ ended_at: a.event.at }).eq('history_id', a.history.id).is('ended_at', null));
        check(await sb.from('timeline_events').insert(eventToRow(a.event)));
        return;
      case 'history.letterOpen':
        check(await sb.from('histories').update({ letter_opened_at: a.at }).eq('id', a.historyId));
        return;
      case 'review.save':
        check(await sb.from('reviews').upsert(reviewToRow(a.review), { onConflict: 'user_id,game_id' }));
        return;
      case 'copy.add':
        check(await sb.from('copies').insert(copyToRow(a.copy)));
        return;
      case 'copy.update':
        check(await sb.from('copies').update(copyToRow(a.copy)).eq('id', a.copy.id));
        return;
      case 'copy.delete':
        if (v14) check(await sb.from('copies').update({ deleted_at: new Date().toISOString() }).eq('id', a.copyId));
        else check(await sb.from('copies').delete().eq('id', a.copyId));
        return;
      case 'loan.save':
        check(await sb.from('loans').upsert(loanToRow(a.loan)));
        return;
      case 'loan.delete':
        check(await sb.from('loans').delete().eq('id', a.id));
        return;
      case 'showcase.save':
        check(await sb.from('showcases').upsert(showcaseToRow(a.sc)));
        return;
      case 'showcase.delete':
        check(await sb.from('showcases').delete().eq('id', a.id));
        return;
      case 'showcases.order':
        for (const x of next.showcases) if (a.ids.includes(x.id)) check(await sb.from('showcases').update({ position: x.position }).eq('id', x.id));
        return;
      case 'museum.meta':
        check(await sb.rpc('set_my_museum', { p_title: a.museum.title ?? '', p_intro: a.museum.intro ?? '', p_shared: !!a.museum.shared }));
        return;
      case 'room.save': {
        check(await sb.from('museum_rooms').upsert(roomToRow(a.room)));
        // Fotos que saíram da sala saem do Storage também.
        if (a.dropPaths?.length) await removePhotos(a.dropPaths);
        return;
      }
      case 'room.delete':
        check(await sb.from('museum_rooms').delete().eq('id', a.id));
        await removePhotos(a.paths);
        return;
      case 'rooms.order':
        for (const x of next.rooms) if (a.ids.includes(x.id)) check(await sb.from('museum_rooms').update({ position: x.position }).eq('id', x.id));
        return;
      case 'hardware.add':
        check(await sb.from('hardware').insert(hardwareToRow(a.hw)));
        return;
      case 'hardware.update':
        check(await sb.from('hardware').update(hardwareToRow(a.hw)).eq('id', a.hw.id));
        return;
      case 'hardware.delete':
        check(await sb.from('hardware').update({ deleted_at: new Date().toISOString() }).eq('id', a.id));
        return;
      case 'trash.restore':
        check(await sb.from(a.what === 'copy' ? 'copies' : 'hardware').update({ deleted_at: null }).eq('id', a.id));
        return;
      case 'trash.purge':
        check(await sb.from(a.what === 'copy' ? 'copies' : 'hardware').delete().eq('id', a.id).not('deleted_at', 'is', null));
        return;
      case 'trash.empty':
        check(await sb.from('copies').delete().not('deleted_at', 'is', null));
        check(await sb.from('hardware').delete().not('deleted_at', 'is', null));
        return;
      case 'mygame.set':
        if (!v4) return;
        check(await sb.from('my_games').upsert(myGameToRow(a.mine), { onConflict: 'user_id,game_id' }));
        return;
      case 'journey.share': {
        const r = await sb.from('journeys').update({ shared: a.shared }).eq('id', a.journeyId);
        if (r.error) throw new Error(/public_limit/.test(r.error.message) ? 'Calma: contas novas mostram no máximo 20 coisas por hora no perfil. Tente daqui a pouco.' : /shared|column|schema/i.test(r.error.message) ? 'Para mostrar Jornadas no perfil, rode a migração 0013 no Supabase.' : r.error.message);
        return;
      }
      case 'journey.update':
        check(await sb.from('journeys').update(journeyToRow(a.journey)).eq('id', a.journey.id));
        return;
      case 'journey.delete':
        // Histórias, sessões e acontecimentos saem juntos (on delete cascade).
        check(await sb.from('journeys').delete().eq('id', a.journeyId));
        await removePhotos(a.imagePaths);
        return;
      case 'history.update':
        check(await sb.from('histories').update(historyToRow(a.history)).eq('id', a.history.id));
        if (a.journey) check(await sb.from('journeys').update(journeyToRow(a.journey)).eq('id', a.journey.id));
        if (a.event) check(await sb.from('timeline_events').insert(eventToRow(a.event)));
        return;
      case 'history.delete':
        check(await sb.from('histories').delete().eq('id', a.historyId));
        await removePhotos(a.imagePaths);
        return;
      case 'session.update':
        check(await sb.from('sessions').update(sessionToRow(a.session)).eq('id', a.session.id));
        return;
      case 'session.delete':
        check(await sb.from('timeline_events').delete().eq('session_id', a.sessionId).eq('kind', 'sessao'));
        check(await sb.from('sessions').delete().eq('id', a.sessionId));
        return;
      case 'event.delete':
        check(await sb.from('timeline_events').delete().eq('id', a.eventId));
        if (a.imagePath) await removePhotos([a.imagePath]);
        return;
      case 'game.create':
        if (!v4) throw new Error('Rode a migração 0004 para cadastrar jogos sem ficha do catálogo.');
        check(await sb.from('games').insert(manualGameToRow(a.game)));
        return;
      case 'game.relink': {
        const f = a.fromId, t = a.to.id;
        if (a.mergeFrom && a.mergeInto) {
          // Os dois jogos tinham Jornada: as Histórias da antiga passam para a do jogo novo.
          for (const h of next.histories.filter((x) => x.journeyId === a.mergeInto)) check(await sb.from('histories').update({ journey_id: h.journeyId, ordinal: h.ordinal }).eq('id', h.id));
          check(await sb.from('sessions').update({ journey_id: a.mergeInto }).eq('journey_id', a.mergeFrom));
          check(await sb.from('timeline_events').update({ journey_id: a.mergeInto }).eq('journey_id', a.mergeFrom));
          check(await sb.from('journeys').delete().eq('id', a.mergeFrom));
        } else {
          check(await sb.from('journeys').update({ game_id: t }).eq('game_id', f));
        }
        check(await sb.from('copies').update({ game_id: t }).eq('game_id', f));
        await sb.from('wishes').update({ game_id: t }).eq('game_id', f);
        await sb.from('wishes').delete().eq('game_id', f);
        await sb.from('favorites').update({ game_id: t }).eq('game_id', f);
        await sb.from('favorites').delete().eq('game_id', f);
        await sb.from('reviews').update({ game_id: t }).eq('game_id', f).eq('user_id', next.profile?.id ?? '');
        await sb.from('reviews').delete().eq('game_id', f).eq('user_id', next.profile?.id ?? '');
        if (v4) {
          const m = next.myGames[t];
          if (m) check(await sb.from('my_games').upsert(myGameToRow(m), { onConflict: 'user_id,game_id' }));
          await sb.from('my_games').delete().eq('game_id', f);
          await sb.from('games').delete().eq('id', f).eq('source', 'manual');
        }
        return;
      }
      case 'copies.deleteMany':
        for (let i = 0; i < a.ids.length; i += 200) check(await sb.from('copies').delete().in('id', a.ids.slice(i, i + 200)));
        return;
      case 'journeys.deleteMany':
        // Histórias, sessões e acontecimentos saem juntos (on delete cascade).
        for (let i = 0; i < a.ids.length; i += 200) check(await sb.from('journeys').delete().in('id', a.ids.slice(i, i + 200)));
        return;
      case 'games.relinkMany': {
        // Uma função no banco (migração 0005) faz tudo de uma vez, em lotes de 200 jogos.
        for (let i = 0; i < a.pairs.length; i += 200) {
          const pairs = a.pairs.slice(i, i + 200).map((p) => ({ src: p.fromId, dst: p.to.id }));
          const { error } = await sb.rpc('relink_games', { pairs });
          if (error) throw new Error(/relink_games|PGRST202|function/i.test(error.message ?? '') ? 'Rode a migração 0005 no Supabase (SQL Editor) para ligar os jogos às fichas.' : error.message);
        }
        return;
      }
      case 'import.bulk': {
        const d = a.data;
        const manual = d.games.filter((g) => g.source === 'manual');
        if (manual.length && !v4) throw new Error('Rode a migração 0004 antes de importar a planilha.');
        await insertMany('games', manual.map(manualGameToRow));
        await insertMany('copies', d.copies.map(copyToRow));
        if (v4) await insertMany('my_games', d.myGames.map(myGameToRow), { upsert: 'user_id,game_id' });
        await insertMany('journeys', d.journeys.map(journeyToRow));
        await insertMany('histories', d.histories.map(historyToRow));
        await insertMany('timeline_events', d.events.map(eventToRow));
        await insertMany('reviews', d.reviews.map(reviewToRow), { upsert: 'user_id,game_id' });
        return;
      }
      case 'games.merge':
      case 'reviews.merge':
        return; // vêm do servidor; nada a gravar
    }
  },
};

/** Busca as análises públicas e a estatística de um jogo. */
export async function fetchReviews(gameId: string, me: string | null) {
  const sb = await getClient();
  const [list, stats] = await Promise.all([
    sb.from('reviews').select('*, profiles(display_name)').eq('game_id', gameId).order('created_at', { ascending: false }).limit(30),
    sb.from('review_stats').select('*').eq('game_id', gameId).maybeSingle(),
  ]);
  return {
    reviews: (list.data ?? []).map((r: any) => reviewFromRow(r, me)),
    stats: stats.data ? { count: stats.data.count, avg: stats.data.avg, dist10: stats.data.dist10 } : undefined,
  };
}

export async function fetchGameBySlug(slug: string): Promise<Game | null> {
  const sb = await getClient();
  const { data } = await sb.from('games').select('*').eq('slug', slug).maybeSingle();
  return data ? gameFromRow(data) : null;
}
