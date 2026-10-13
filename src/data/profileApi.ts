/**
 * Perfil e privacidade: endereço (winnerz.com.br/@nome), apresentação e quem vê cada pilar.
 * Com conta, tudo passa por funções do banco (migração 0011), que devolvem ao público só o que foi liberado.
 * No modo demonstração, o perfil fica neste navegador e a página pública é montada com os seus dados daqui.
 */
import { getState } from './store';
import type { DatePrecision } from './types';

export type Visibility = 'privado' | 'link' | 'publico';
export type Pillar = 'jornada' | 'colecao' | 'notas';
export const PILLARS: { key: Pillar; label: string; hint: string }[] = [
  { key: 'jornada', label: 'Jornada', hint: 'Jogos em andamento com o progresso e os que você zerou, com a data. Recados, fotos e sessões continuam só seus.' },
  { key: 'colecao', label: 'Coleção', hint: 'Quantos jogos, em quais plataformas, e as capas. Preços, onde comprou e anotações continuam só seus.' },
  { key: 'notas', label: 'Notas e análises', hint: 'Suas notas e os textos das análises. Análises com spoiler aparecem sem o texto.' },
];

export type MyProfile = { handle: string | null; bio: string | null; visibility: Partial<Record<Pillar, Visibility>>; shareKey: string };

export type PublicProfile = {
  name: string; handle: string; bio: string | null; since: string; onlyLink: boolean;
  jornada?: {
    playing: { title: string; slug: string; cover: string | null; progress: number | null; startedAt: string; startedPrecision: DatePrecision; ordinal: number }[];
    completed: { title: string; slug: string; cover: string | null; completedAt: string | null; completedPrecision: DatePrecision; ordinal: number }[];
    journeys: number; finished: number;
  };
  colecao?: { count: number; platforms: { platform: string; n: number }[]; items: { title: string; slug: string; cover: string | null; platform: string }[] };
  notas?: { title: string; slug: string; cover: string | null; normalized: number; originalScale: 'TEN_POINT' | 'FIVE_STAR'; originalValue: number; reviewTitle: string; text: string; spoiler: boolean; at: string }[];
};

export const HANDLE_RE = /^[a-z0-9_]{3,24}$/;
export const visOf = (p: MyProfile | null, k: Pillar): Visibility => p?.visibility?.[k] ?? 'privado';

const MSG: Record<string, string> = {
  handle_taken: 'Esse endereço já tem dono. Tente outro.',
  handle_format: 'Use de 3 a 24 letras minúsculas, números ou _ (sem espaço nem acento).',
  handle_reserved: 'Esse endereço é reservado do site. Tente outro.',
};
function friendly(e: { message?: string } | null): Error {
  const m = e?.message ?? '';
  const key = Object.keys(MSG).find((k) => m.includes(k));
  if (key) return new Error(MSG[key]);
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
  if (!me.handle || me.handle !== handle.toLowerCase()) return null;
  const s = getState();
  const show = (k: Pillar) => visOf(me, k) === 'publico' || (visOf(me, k) === 'link' && key === me.shareKey);
  if (!show('jornada') && !show('colecao') && !show('notas')) return null;
  const gameOfJ = (jid: string) => { const j = s.journeys.find((x) => x.id === jid); return j ? s.games[j.gameId] : undefined; };
  const out: PublicProfile = { name: s.profile?.name ?? 'Você', handle: me.handle, bio: me.bio, since: '2026-01-01T12:00:00Z', onlyLink: !(['jornada', 'colecao', 'notas'] as Pillar[]).some((k) => visOf(me, k) === 'publico') };
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
  if (show('notas')) {
    out.notas = s.reviews.filter((r) => r.mine && s.games[r.gameId]).map((r) => ({
      title: s.games[r.gameId].title, slug: s.games[r.gameId].slug, cover: s.games[r.gameId].cover, normalized: r.rating.normalized,
      originalScale: r.rating.originalScale, originalValue: r.rating.originalValue, reviewTitle: r.title, text: r.spoiler ? '' : r.text, spoiler: !!r.spoiler, at: r.writtenAt,
    }));
  }
  return out;
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
  async save(handle: string, bio: string, visibility: Partial<Record<Pillar, Visibility>>): Promise<MyProfile> {
    const h = handle.trim().toLowerCase();
    if (h && !HANDLE_RE.test(h)) throw new Error(MSG.handle_format);
    if (supa()) return rpc<MyProfile>('set_my_profile', { p_handle: h || null, p_bio: bio, p_visibility: visibility });
    const next = { ...demoGet(), handle: h || null, bio: bio.trim().slice(0, 160) || null, visibility };
    demoSet(next); return next;
  },
  async rotateKey(): Promise<MyProfile> {
    if (supa()) return rpc<MyProfile>('rotate_share_key');
    const next = { ...demoGet(), shareKey: rid() }; demoSet(next); return next;
  },
  async publicOf(handle: string, key?: string | null): Promise<PublicProfile | null> {
    if (supa()) return rpc<PublicProfile | null>('public_profile', { p_handle: handle, p_key: key ?? null });
    return demoPublic(handle, key);
  },
};

/** O endereço para compartilhar: com o código secreto quando algum pilar está em "só com link". */
export function profileUrl(p: MyProfile, withKey = true): string | null {
  if (!p.handle) return null;
  const needsKey = (['jornada', 'colecao', 'notas'] as Pillar[]).some((k) => visOf(p, k) === 'link');
  return `${location.origin}/@${p.handle}${withKey && needsKey ? `?k=${p.shareKey}` : ''}`;
}
