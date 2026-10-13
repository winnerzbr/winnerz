/**
 * Perfil e privacidade: endereço (winnerz.com.br/@nome), apresentação e quem vê cada pilar.
 * Com conta, tudo passa por funções do banco (migração 0011), que devolvem ao público só o que foi liberado.
 * No modo demonstração, o perfil fica neste navegador e a página pública é montada com os seus dados daqui.
 */
import { getState } from './store';
import type { DatePrecision, HardwareKind } from './types';
import { showcasePieces } from '../lib/showcases';
import { exhibitOf } from '../lib/museum';

export type Visibility = 'privado' | 'link' | 'publico';
export type Pillar = 'jornada' | 'colecao' | 'notas';
export const PILLARS: { key: Pillar; label: string; hint: string }[] = [
  { key: 'jornada', label: 'Jornada', hint: 'Jogos em andamento com o progresso e os que você zerou, com a data. Recados, fotos e sessões continuam só seus.' },
  { key: 'colecao', label: 'Coleção', hint: 'Quantos jogos, em quais plataformas, e as capas. Preços, onde comprou e anotações continuam só seus.' },
  { key: 'notas', label: 'Notas e análises', hint: 'Suas notas e os textos das análises. Análises com spoiler aparecem sem o texto.' },
];

export type ProfileLink = { url: string; label?: string };
export type MyVisibility = Partial<Record<Pillar, Visibility>> & { aoVivo?: 'sim' | 'nao' };
export type MyProfile = { handle: string | null; bio: string | null; visibility: MyVisibility; shareKey: string; links?: ProfileLink[] };

/** Nome do serviço pelo endereço (para o botão do link). */
export function linkLabel(l: ProfileLink): string {
  if (l.label) return l.label;
  try {
    const host = new URL(l.url).hostname.replace(/^www\./, '');
    const known: Record<string, string> = { 'youtube.com': 'YouTube', 'youtu.be': 'YouTube', 'twitch.tv': 'Twitch', 'instagram.com': 'Instagram', 'x.com': 'X', 'twitter.com': 'X', 'tiktok.com': 'TikTok', 'discord.gg': 'Discord', 'discord.com': 'Discord', 'kick.com': 'Kick', 'facebook.com': 'Facebook', 'threads.net': 'Threads', 'bsky.app': 'Bluesky' };
    return known[host] ?? host;
  } catch { return 'Link'; }
}

export type PublicProfile = {
  name: string; handle: string; bio: string | null; since: string; onlyLink: boolean;
  jornada?: {
    playing: { title: string; slug: string; cover: string | null; progress: number | null; startedAt: string; startedPrecision: DatePrecision; ordinal: number }[];
    completed: { title: string; slug: string; cover: string | null; completedAt: string | null; completedPrecision: DatePrecision; ordinal: number }[];
    journeys: number; finished: number;
  };
  colecao?: { count: number; platforms: { platform: string; n: number }[]; items: { title: string; slug: string; cover: string | null; platform: string }[] };
  notas?: { title: string; slug: string; cover: string | null; normalized: number; originalScale: 'TEN_POINT' | 'FIVE_STAR'; originalValue: number; reviewTitle: string; text: string; spoiler: boolean; at: string }[];
  links?: ProfileLink[];
  showcase?: { title: string; slug: string; cover: string | null; backdrop: string | null; stories: number; moments: number; finished: boolean; lastAt: string | null }[];
  live?: { title: string; slug: string; cover: string | null; since: string };
  /** Vitrines que a pessoa marcou para o perfil (só com o pilar Coleção visível). */
  vitrines?: { id: string; title: string; description: string | null; items: PublicPiece[] }[];
  /** Museu aberto no perfil. */
  museu?: { title: string | null; rooms: number } | null;
};

/** Peça como o público vê: capa, título e plataforma, ou o console. Nada da ficha do exemplar. */
export type PublicPiece =
  | { t: 'c'; title: string; slug: string; cover: string | null; platform: string; year?: number | null }
  | { t: 'h'; name: string; platform: string | null; kind: HardwareKind };

export type PublicMuseumPiece =
  | (PublicPiece & { caption?: string | null })
  | { t: 'f'; image?: string; caption?: string | null }
  | { t: 'm'; title: string; quote?: string | null; image?: string; at: string; game: string; slug: string; cover: string | null; caption?: string | null };

export type PublicMuseum = {
  name: string; handle: string; title: string | null; intro: string | null;
  rooms: { id: string; title: string; text: string | null; pieces: PublicMuseumPiece[] }[];
};

export type PublicJourney = {
  name: string; handle: string;
  game: { title: string; slug: string; cover: string | null; backdrop: string | null; year?: number | null; developer?: string | null };
  histories: { id: string; ordinal: number; title: string; state: string; startedAt: string; startedPrecision: DatePrecision; completedAt: string | null; completedPrecision: DatePrecision; progress: number | null }[];
  events: { id: string; historyId: string; kind: 'inicio' | 'sessao' | 'momento' | 'marco'; at: string; dateLabel?: string | null; title: string; text?: string | null; quote?: string | null; image?: string }[];
};

/** O @: 3 a 24 letras sem acento, números ou _. Guarda as maiúsculas escolhidas; é único sem diferenciá-las. */
export const HANDLE_RE = /^[A-Za-z0-9_]{3,24}$/;
export const visOf = (p: MyProfile | null, k: Pillar): Visibility => p?.visibility?.[k] ?? 'privado';

const MSG: Record<string, string> = {
  handle_taken: 'Esse endereço já tem dono. Tente outro.',
  handle_format: 'Use de 3 a 24 letras, números ou _ (sem espaço nem acento).',
  handle_required: 'Escolha o seu @ para continuar.',
  handle_reserved: 'Esse endereço é reservado do site. Tente outro.',
};
function friendly(e: { message?: string } | null): Error {
  const m = e?.message ?? '';
  const key = Object.keys(MSG).find((k) => m.includes(k));
  if (key) return new Error(MSG[key]);
  if (/set_my_links|public_profile_v2|public_journey/i.test(m)) return new Error('Para isso, rode a migração 0013 no Supabase (SQL Editor → colar → Run).');
  if (/set_my_handle|handle_available/i.test(m)) return new Error('Para escolher o @, rode a migração 0012 no Supabase (SQL Editor → colar → Run).');
  if (/my_profile|set_my_profile|public_profile|rotate_share_key|function|schema cache/i.test(m)) return new Error('Para usar o perfil, rode a migração 0011 no Supabase (SQL Editor → colar → Run).');
  return new Error(m || 'Não deu certo. Tente de novo.');
}

/* ---- demonstração ---- */
const KEY = 'wz.profile.demo.v1';
const rid = () => Math.random().toString(16).slice(2, 20);
function demoGet(): MyProfile {
  try { const x = localStorage.getItem(KEY); if (x) return JSON.parse(x); } catch { /* recomeça */ }
  return { handle: null, bio: null, visibility: {}, shareKey: rid() };
}
function demoSet(p: MyProfile) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* só nesta visita */ } }

function demoPublic(handle: string, key?: string | null): PublicProfile | null {
  const me = demoGet();
  if (!me.handle || me.handle.toLowerCase() !== handle.toLowerCase()) return null;
  const s = getState();
  const show = (k: Pillar) => visOf(me, k) === 'publico' || (visOf(me, k) === 'link' && key === me.shareKey);
  if (!show('jornada') && !show('colecao') && !show('notas')) return null;
  const gameOfJ = (jid: string) => { const j = s.journeys.find((x) => x.id === jid); return j ? s.games[j.gameId] : undefined; };
  const out: PublicProfile = { name: me.handle, handle: me.handle, bio: me.bio, since: '2026-01-01T12:00:00Z', onlyLink: !(['jornada', 'colecao', 'notas'] as Pillar[]).some((k) => visOf(me, k) === 'publico') };
  if (show('jornada')) {
    const hs = s.histories;
    out.jornada = {
      playing: hs.filter((h) => h.state === 'ativa').map((h) => ({ h, g: gameOfJ(h.journeyId) })).filter((x) => x.g).sort((a, b) => b.h.startedAt.localeCompare(a.h.startedAt)).slice(0, 12)
        .map(({ h, g }) => ({ title: g!.title, slug: g!.slug, cover: g!.cover, progress: h.progress ?? null, startedAt: h.startedAt, startedPrecision: h.startedPrecision ?? 'dia', ordinal: h.ordinal })),
      completed: hs.filter((h) => h.state === 'concluida').map((h) => ({ h, g: gameOfJ(h.journeyId) })).filter((x) => x.g).sort((a, b) => (b.h.completedAt ?? '').localeCompare(a.h.completedAt ?? '')).slice(0, 30)
        .map(({ h, g }) => ({ title: g!.title, slug: g!.slug, cover: g!.cover, completedAt: h.completedAt ?? null, completedPrecision: h.completedPrecision ?? 'dia', ordinal: h.ordinal })),
      journeys: s.journeys.length, finished: hs.filter((h) => h.state === 'concluida').length,
    };
  }
  if (show('colecao')) {
    const by: Record<string, number> = {};
    s.copies.forEach((c) => { by[c.platform] = (by[c.platform] ?? 0) + 1; });
    out.colecao = {
      count: s.copies.length,
      platforms: Object.entries(by).map(([platform, n]) => ({ platform, n })).sort((a, b) => b.n - a.n),
      items: s.copies.map((c) => ({ c, g: s.games[c.gameId] })).filter((x) => x.g).slice(0, 60).map(({ c, g }) => ({ title: g.title, slug: g.slug, cover: g.cover, platform: c.platform })),
    };
  }
  out.links = me.links ?? [];
  if (show('jornada')) {
    out.showcase = s.journeys.filter((j) => j.shared && s.games[j.gameId]).map((j) => {
      const g = s.games[j.gameId], evs = s.events.filter((e) => e.journeyId === j.id);
      return { title: g.title, slug: g.slug, cover: g.cover, backdrop: g.backdrop ?? null, stories: s.histories.filter((h) => h.journeyId === j.id).length,
        moments: evs.filter((e) => e.kind === 'momento').length, finished: s.histories.some((h) => h.journeyId === j.id && h.state === 'concluida'),
        lastAt: evs.map((e) => e.at).sort().pop() ?? null };
    });
    const open = s.sessions.find((x) => !x.endedAt);
    const oj = open && s.journeys.find((j) => j.id === open.journeyId);
    if (me.visibility.aoVivo === 'sim' && open && oj && s.games[oj.gameId]) out.live = { title: s.games[oj.gameId].title, slug: s.games[oj.gameId].slug, cover: s.games[oj.gameId].cover, since: open.startedAt };
  }
  if (show('colecao')) {
    const pub = (p: ReturnType<typeof showcasePieces>[number]): PublicPiece => (p.kind === 'c'
      ? { t: 'c', title: p.game.title, slug: p.game.slug, cover: p.game.cover, platform: p.copy.platform, year: p.game.year ?? null }
      : { t: 'h', name: p.hw.name, platform: p.hw.platform ?? null, kind: p.hw.kind });
    out.vitrines = [...(s.showcases ?? [])].filter((x) => x.shared).sort((a, b) => a.position - b.position)
      .map((x) => ({ id: x.id, title: x.title, description: x.description ?? null, items: showcasePieces(s, x).slice(0, 60).map(pub) }));
    out.museu = s.museum?.shared && s.rooms?.length ? { title: s.museum.title || null, rooms: s.rooms.length } : null;
  }
  if (show('notas')) {
    out.notas = s.reviews.filter((r) => r.mine && s.games[r.gameId]).map((r) => ({
      title: s.games[r.gameId].title, slug: s.games[r.gameId].slug, cover: s.games[r.gameId].cover, normalized: r.rating.normalized,
      originalScale: r.rating.originalScale, originalValue: r.rating.originalValue, reviewTitle: r.title, text: r.spoiler ? '' : r.text, spoiler: !!r.spoiler, at: r.writtenAt,
    }));
  }
  return out;
}

function demoJourney(handle: string, key: string | null | undefined, slug: string): PublicJourney | null {
  const me = demoGet();
  if (!me.handle || me.handle.toLowerCase() !== handle.toLowerCase()) return null;
  if (!(visOf(me, 'jornada') === 'publico' || (visOf(me, 'jornada') === 'link' && key === me.shareKey))) return null;
  const s = getState();
  const g = Object.values(s.games).find((x) => x.slug === slug);
  const j = g && s.journeys.find((x) => x.gameId === g.id && x.shared);
  if (!g || !j) return null;
  const hs = s.histories.filter((h) => h.journeyId === j.id).sort((a, b) => a.ordinal - b.ordinal);
  return {
    name: me.handle, handle: me.handle,
    game: { title: g.title, slug: g.slug, cover: g.cover, backdrop: g.backdrop ?? null, year: g.year ?? null, developer: g.developer ?? null },
    histories: hs.map((h) => ({ id: h.id, ordinal: h.ordinal, title: h.title, state: h.state, startedAt: h.startedAt, startedPrecision: h.startedPrecision ?? 'dia', completedAt: h.completedAt ?? null, completedPrecision: h.completedPrecision ?? 'dia', progress: h.progress ?? null })),
    events: s.events.filter((e) => e.journeyId === j.id && ['inicio', 'sessao', 'momento', 'marco'].includes(e.kind)).sort((a, b) => a.at.localeCompare(b.at)).map((e) => ({
      id: e.id, historyId: e.historyId, kind: e.kind as PublicJourney['events'][number]['kind'], at: e.at, dateLabel: e.dateLabel ?? null,
      title: e.kind === 'sessao' ? 'Sessão' : e.title, text: e.kind === 'sessao' ? null : e.text ?? null, quote: e.kind === 'momento' ? e.quote ?? null : null,
      image: e.kind === 'sessao' ? undefined : e.image,
    })),
  };
}

function demoMuseum(handle: string, key?: string | null): PublicMuseum | null {
  const me = demoGet();
  if (!me.handle || me.handle.toLowerCase() !== handle.toLowerCase()) return null;
  if (!(visOf(me, 'colecao') === 'publico' || (visOf(me, 'colecao') === 'link' && key === me.shareKey))) return null;
  const s = getState();
  if (!s.museum?.shared) return null;
  const piece = (p: Parameters<typeof exhibitOf>[1]): PublicMuseumPiece | null => {
    const ex = exhibitOf(s, p);
    if (!ex) return null;
    const caption = p.caption ?? null;
    if (p.t === 'c') { const c = s.copies.find((x) => x.id === p.id)!; const g = s.games[c.gameId]; return { t: 'c', title: g.title, slug: g.slug, cover: g.cover, platform: c.platform, year: g.year ?? null, caption }; }
    if (p.t === 'h') { const h = s.hardware.find((x) => x.id === p.id)!; return { t: 'h', name: h.name, platform: h.platform ?? null, kind: h.kind, caption }; }
    if (p.t === 'm') { const e = s.events.find((x) => x.id === p.id)!; const g = s.games[s.journeys.find((j) => j.id === e.journeyId)!.gameId]; return { t: 'm', title: e.title, quote: e.quote ?? null, image: e.image, at: e.at, game: g.title, slug: g.slug, cover: g.cover, caption }; }
    return { t: 'f', image: ex.img, caption };
  };
  return {
    name: me.handle, handle: me.handle, title: s.museum.title || null, intro: s.museum.intro || null,
    rooms: [...s.rooms].sort((a, b) => a.position - b.position).map((r) => ({ id: r.id, title: r.title, text: r.text ?? null, pieces: r.pieces.map(piece).filter((x): x is PublicMuseumPiece => !!x) })),
  };
}

/* ---- API ---- */
const supa = () => getState().mode === 'supabase';
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { getClient } = await import('./supabaseAdapter');
  const { data, error } = await (await getClient()).rpc(fn, args);
  if (error) throw friendly(error);
  return data as T;
}

export const profileApi = {
  async mine(): Promise<MyProfile> { return supa() ? rpc<MyProfile>('my_profile') : demoGet(); },
  async save(handle: string, bio: string, visibility: MyVisibility): Promise<MyProfile> {
    const h = handle.trim();
    if (!h) throw new Error(MSG.handle_required);
    if (!HANDLE_RE.test(h)) throw new Error(MSG.handle_format);
    if (supa()) return rpc<MyProfile>('set_my_profile', { p_handle: h || null, p_bio: bio, p_visibility: visibility });
    const next = { ...demoGet(), handle: h || null, bio: bio.trim().slice(0, 160) || null, visibility };
    demoSet(next); return next;
  },
  /** Primeiro acesso: só o @. */
  async setHandle(handle: string): Promise<MyProfile> {
    const h = handle.trim();
    if (!HANDLE_RE.test(h)) throw new Error(MSG.handle_format);
    if (supa()) return rpc<MyProfile>('set_my_handle', { p_handle: h });
    const next = { ...demoGet(), handle: h }; demoSet(next); return next;
  },
  async available(handle: string): Promise<boolean> {
    if (!supa()) return true;
    return rpc<boolean>('handle_available', { p_handle: handle.trim() });
  },
  async rotateKey(): Promise<MyProfile> {
    if (supa()) return rpc<MyProfile>('rotate_share_key');
    const next = { ...demoGet(), shareKey: rid() }; demoSet(next); return next;
  },
  async publicOf(handle: string, key?: string | null): Promise<PublicProfile | null> {
    if (!supa()) return demoPublic(handle, key);
    const args = { p_handle: handle, p_key: key ?? null };
    try { return await rpc<PublicProfile | null>('public_profile_v3', args); } catch { /* sem a 0015 */ }
    try { return await rpc<PublicProfile | null>('public_profile_v2', args); }
    catch { return rpc<PublicProfile | null>('public_profile', args); }
  },
  async journeyOf(handle: string, key: string | null | undefined, slug: string): Promise<PublicJourney | null> {
    if (!supa()) return demoJourney(handle, key, slug);
    const r = await fetch(`/api/perfil?h=${encodeURIComponent(handle)}&j=${encodeURIComponent(slug)}${key ? `&k=${encodeURIComponent(key)}` : ''}`);
    if (r.status === 404) return null;
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || 'Não consegui carregar a Jornada.');
    return body as PublicJourney;
  },
  async museumOf(handle: string, key: string | null | undefined): Promise<PublicMuseum | null> {
    if (!supa()) return demoMuseum(handle, key);
    const r = await fetch(`/api/perfil?h=${encodeURIComponent(handle)}&museu=1${key ? `&k=${encodeURIComponent(key)}` : ''}`);
    if (r.status === 404) return null;
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || 'Não consegui carregar o Museu.');
    return body as PublicMuseum;
  },
  async setLinks(links: ProfileLink[]): Promise<MyProfile> {
    const clean = links.map((l) => ({ url: l.url.trim(), label: l.label?.trim() || undefined })).filter((l) => /^https:\/\/\S{3,200}$/.test(l.url)).slice(0, 6);
    if (supa()) return rpc<MyProfile>('set_my_links', { p_links: clean });
    const next = { ...demoGet(), links: clean }; demoSet(next); return next;
  },
};

/** O endereço para compartilhar: com o código secreto quando algum pilar está em "só com link". */
export function profileUrl(p: MyProfile, withKey = true): string | null {
  if (!p.handle) return null;
  const needsKey = (['jornada', 'colecao', 'notas'] as Pillar[]).some((k) => visOf(p, k) === 'link');
  return `${location.origin}/@${p.handle.toLowerCase()}${withKey && needsKey ? `?k=${p.shareKey}` : ''}`;
}
