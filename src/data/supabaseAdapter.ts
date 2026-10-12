import type { SupabaseClient } from '@supabase/supabase-js';
import type { Adapter, Action } from './store';
import { emptyState } from './store';
import type { State, Game, Review, History, Session, TimelineEvent, Copy, Journey } from './types';
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

/* Fotos no Storage --------------------------------------------------------- */

const BUCKET = 'momentos';
const SIGNED_FOR = 60 * 60 * 24 * 7; // links das fotos valem 7 dias
let storageReady = false;

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
  return Object.fromEntries((data ?? []).filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl]));
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
});
const historyFromRow = (r: any): History => ({
  id: r.id, journeyId: r.journey_id, ordinal: r.ordinal, title: r.title, state: r.state,
  startedAt: r.started_at, completedAt: r.completed_at ?? undefined, progress: r.progress ?? undefined,
  mode: r.mode ?? undefined,
  letter: r.letter_text ? { text: r.letter_text, openedAt: r.letter_opened_at ?? undefined } : undefined,
});
const sessionFromRow = (r: any): Session => ({
  id: r.id, journeyId: r.journey_id, historyId: r.history_id, startedAt: r.started_at,
  endedAt: r.ended_at ?? undefined, minutes: r.minutes ?? undefined, note: r.note ?? undefined,
  whereStopped: r.where_stopped ?? undefined, feeling: r.feeling ?? undefined,
});
const eventFromRow = (r: any): TimelineEvent => ({
  id: r.id, journeyId: r.journey_id, historyId: r.history_id, sessionId: r.session_id ?? undefined,
  kind: r.kind, at: r.at, title: r.title, text: r.text ?? undefined, quote: r.quote ?? undefined,
  image: r.image ?? undefined, imagePath: r.image_path ?? undefined, resolved: r.resolved, dateLabel: r.date_label ?? undefined,
});
const copyFromRow = (r: any): Copy => ({
  id: r.id, gameId: r.game_id, platform: r.platform, kind: r.kind, items: r.items ?? undefined,
  condition: r.condition ?? undefined, origin: r.origin ?? undefined, note: r.note ?? undefined, special: r.special,
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
});
const sessionToRow = (x: Session) => ({
  id: x.id, journey_id: x.journeyId, history_id: x.historyId, started_at: x.startedAt, ended_at: x.endedAt ?? null,
  minutes: x.minutes ?? null, note: x.note ?? null, where_stopped: x.whereStopped ?? null, feeling: x.feeling ?? null,
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
  return row;
};
const journeyToRow = (j: Journey) => ({ id: j.id, game_id: j.gameId, mood: j.mood, paused_note: j.pausedNote ?? null });

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

    const [profile, copies, wishes, favs, journeys, histories, sessions, events, myReviews] = await Promise.all([
      sb.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      sb.from('copies').select('*'),
      sb.from('wishes').select('*'),
      sb.from('favorites').select('*'),
      sb.from('journeys').select('*'),
      sb.from('histories').select('*'),
      sb.from('sessions').select('*'),
      sb.from('timeline_events').select('*').order('at'),
      sb.from('reviews').select('*, profiles(display_name)').eq('user_id', user.id),
    ]);

    const gameIds = new Set<string>();
    for (const r of [...(copies.data ?? []), ...(wishes.data ?? []), ...(favs.data ?? []), ...(journeys.data ?? []), ...(myReviews.data ?? [])]) gameIds.add(r.game_id);
    const games = gameIds.size ? check(await sb.from('games').select('*').in('id', [...gameIds])) : [];

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
      games: Object.fromEntries((games as any[]).map((g) => [g.id, gameFromRow(g)])),
      copies: (copies.data ?? []).map(copyFromRow),
      wishes: (wishes.data ?? []).map((w: any) => ({ gameId: w.game_id, note: w.note ?? undefined })),
      favorites: (favs.data ?? []).map((f: any) => f.game_id),
      journeys: (journeys.data ?? []).map((j: any) => ({ id: j.id, gameId: j.game_id, mood: j.mood, pausedNote: j.paused_note ?? undefined })),
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
      case 'event.update':
        if (a.patch.imagePath !== undefined) check(await sb.from('timeline_events').update({ image_path: a.patch.imagePath || null, image: null }).eq('id', a.eventId));
        return;
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
      case 'review.save': {
        const r = a.review;
        check(await sb.from('reviews').upsert({
          id: r.id, game_id: r.gameId, normalized: r.rating.normalized, original_scale: r.rating.originalScale,
          original_value: r.rating.originalValue, title: r.title, text: r.text, spoiler: !!r.spoiler,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,game_id' }));
        return;
      }
      case 'copy.add': {
        const c = a.copy;
        check(await sb.from('copies').insert({ id: c.id, game_id: c.gameId, platform: c.platform, kind: c.kind, items: c.items ?? null, condition: c.condition ?? null, origin: c.origin ?? null, note: c.note ?? null, special: !!c.special }));
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
