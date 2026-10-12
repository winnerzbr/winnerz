import type { SupabaseClient } from '@supabase/supabase-js';
import type { Adapter, Action } from './store';
import { emptyState } from './store';
import type { State, Game, Review, History, Session, TimelineEvent, Copy, Journey, MyGame } from './types';
import { SUPABASE_URL, SUPABASE_KEY } from '../lib/env';

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
let v4 = false;
/** A migração 0006 já rodou? */
let v6 = false;
export function schemaV6() { return v6; }
let v8 = false;
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
  ttb: r.ttb ?? undefined, releasedOn: r.released_on ?? undefined,
});
const historyFromRow = (r: any): History => ({
  id: r.id, journeyId: r.journey_id, ordinal: r.ordinal, title: r.title, state: r.state,
  startedAt: r.started_at, completedAt: r.completed_at ?? undefined, progress: r.progress ?? undefined,
  mode: r.mode ?? undefined,
  letter: r.letter_text ? { text: r.letter_text, openedAt: r.letter_opened_at ?? undefined } : undefined,
  startedPrecision: r.started_precision ?? undefined, completedPrecision: r.completed_precision ?? undefined,
  hours: r.hours != null ? Number(r.hours) : undefined, note: r.note ?? undefined, capsule: r.capsule ?? undefined,
});
const sessionFromRow = (r: any): Session => ({
  id: r.id, journeyId: r.journey_id, historyId: r.history_id, startedAt: r.started_at,
  endedAt: r.ended_at ?? undefined, minutes: r.minutes ?? undefined, note: r.note ?? undefined,
  whereStopped: r.where_stopped ?? undefined, feeling: r.feeling ?? undefined, companions: r.companions?.length ? r.companions : undefined,
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
});
const sessionToRow = (x: Session) => ({
  id: x.id, journey_id: x.journeyId, history_id: x.historyId, started_at: x.startedAt, ended_at: x.endedAt ?? null,
  minutes: x.minutes ?? null, note: x.note ?? null, where_stopped: x.whereStopped ?? null, feeling: x.feeling ?? null,
  ...(v8 ? { companions: x.companions?.length ? x.companions : null } : {}),
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
    const [profile, copies, wishes, favs, journeys, histories, sessions, events, myReviews, mine] = await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      selectAll(() => sb.from('copies').select('*').order('created_at').order('id')),
      selectAll(() => sb.from('wishes').select('*').order('created_at').order('game_id')),
      selectAll(() => sb.from('favorites').select('*').order('created_at').order('game_id')),
      selectAll(() => sb.from('journeys').select('*').order('created_at').order('id')),
      selectAll(() => sb.from('histories').select('*').order('id')),
      selectAll(() => sb.from('sessions').select('*').order('started_at').order('id')),
      selectAll(() => sb.from('timeline_events').select('*').order('at').order('id')),
      selectAll(() => sb.from('reviews').select('*, profiles(display_name)').eq('user_id', user.id).order('created_at').order('id')),
      v4 ? selectAll(() => sb.from('my_games').select('*').order('game_id')) : Promise.resolve({ data: [], error: null }),
    ]);

    const gameIds = new Set<string>();
    for (const r of [...copies.data, ...wishes.data, ...favs.data, ...journeys.data, ...myReviews.data, ...mine.data]) gameIds.add(r.game_id);
    // Muitos ids não cabem num endereço só: busca em grupos.
    const ids = [...gameIds];
    const games: any[] = [];
    for (let i = 0; i < ids.length; i += 150) games.push(...(check(await sb.from('games').select('*').in('id', ids.slice(i, i + 150))) as any[]));

    // Fotos: confere se a migração 0003 rodou e gera os links temporários de uma vez só.
    storageReady = !(await sb.from('timeline_events').select('image_path').limit(1)).error;
    const evs = (events.data ?? []).map(eventFromRow);
    const signed = await signPaths(evs.filter((e) => e.imagePath).map((e) => e.imagePath!));
    for (const e of evs) if (e.imagePath) e.image = signed[e.imagePath];

    const p = profile.data;
    const name: string = p?.display_name ?? user.email?.split('@')[0] ?? 'Jogador';
    return {
      ...base,
      profile: { id: user.id, name, initial: name.slice(0, 1).toUpperCase() },
      prefs: { ...base.prefs, ...(p?.prefs ?? {}) },
      schemaV4: v4,
      schemaV6: v6,
      schemaV8: v8,
      isAdmin: !!p?.is_admin,
      loadIncomplete,
      myGames: Object.fromEntries(mine.data.map((m: any) => [m.game_id, myGameFromRow(m)])),
      games: Object.fromEntries((games as any[]).map((g) => [g.id, gameFromRow(g)])),
      copies: (copies.data ?? []).map(copyFromRow),
      wishes: (wishes.data ?? []).map((w: any) => ({ gameId: w.game_id, note: w.note ?? undefined })),
      favorites: (favs.data ?? []).map((f: any) => f.game_id),
      journeys: (journeys.data ?? []).map((j: any) => ({ id: j.id, gameId: j.game_id, mood: j.mood, pausedNote: j.paused_note ?? undefined, createdAt: j.created_at ?? undefined })),
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
        check(await sb.from('copies').delete().eq('id', a.copyId));
        return;
      case 'mygame.set':
        if (!v4) return;
        check(await sb.from('my_games').upsert(myGameToRow(a.mine), { onConflict: 'user_id,game_id' }));
        return;
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
        if (!v4) throw new Error('Rode a migração 0004 para cadastrar jogos sem ficha do IGDB.');
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
