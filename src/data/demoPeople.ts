/**
 * Pessoas de exemplo da demonstração (fictícias), para dar para testar seguir, amizade, afinidade, "só amigos",
 * silenciar, bloquear e a atividade dos amigos sem ter outra conta. Nada disso existe com o banco ligado.
 */
import type { Game } from './types';
import { demoGames } from './demo';
import type { PublicProfile } from './profileApi';

type Vis = 'publico' | 'amigos' | 'privado';
export interface DemoPerson {
  id: string; handle: string; bio: string; followsYou: boolean; since: string;
  visibility: { jornada: Vis; colecao: Vis };
  playing: string[]; done: string[]; shelf: string[]; top: string[]; defining?: string;
  moments: { game: string; title: string; days: number }[];
}

export const DEMO_PEOPLE: DemoPerson[] = [
  {
    id: 'demo-duda', handle: 'duda', bio: 'Zerando tudo da Sony desde o PS1.', followsYou: true, since: '2026-03-02T12:00:00Z',
    visibility: { jornada: 'amigos', colecao: 'publico' },
    playing: ['astro'], done: ['elden', 'kz2', 'mgs2', 'tlou2'], shelf: ['astro', 'elden', 'kz2', 'mgs2', 'nfs', 'tlou2'], top: ['mgs2', 'tlou2', 'elden'], defining: 'mgs2',
    moments: [{ game: 'astro', title: 'O chefe do gelo, finalmente', days: 2 }, { game: 'elden', title: 'Malenia caiu', days: 20 }],
  },
  {
    id: 'demo-carol', handle: 'carol', bio: 'RPG japonês e café.', followsYou: false, since: '2026-05-18T12:00:00Z',
    visibility: { jornada: 'publico', colecao: 'publico' },
    playing: ['p5r'], done: ['yakuza', 'tlou2'], shelf: ['p5r', 'yakuza', 'tlou2', 'infamous'], top: ['p5r', 'yakuza', 'tlou2'],
    moments: [{ game: 'p5r', title: 'O primeiro palácio', days: 1 }],
  },
  {
    id: 'demo-rafa', handle: 'rafa', bio: 'Corrida, só corrida.', followsYou: true, since: '2026-08-09T12:00:00Z',
    visibility: { jornada: 'publico', colecao: 'privado' },
    playing: ['nfs'], done: ['dderby'], shelf: [], top: [],
    moments: [{ game: 'dderby', title: 'Primeira vitória no estádio', days: 5 }],
  },
];

const K = { following: 'wz.demo.following', removed: 'wz.demo.removed' };
const load = (k: string): string[] => { try { return JSON.parse(localStorage.getItem(k) || '[]') as string[]; } catch { return []; } };
const save = (k: string, v: string[]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* só nesta visita */ } };

export const demoPerson = (handle: string) => DEMO_PEOPLE.find((p) => p.handle.toLowerCase() === handle.toLowerCase()) ?? null;
export const demoFollowing = () => load(K.following);
export const demoFollowsMe = (p: DemoPerson) => p.followsYou && !load(K.removed).includes(p.handle);
export const demoIsFriend = (p: DemoPerson) => demoFollowing().includes(p.handle) && demoFollowsMe(p);
export function demoSetFollow(handle: string, on: boolean) {
  const l = demoFollowing().filter((h) => h !== handle);
  save(K.following, on ? [...l, handle] : l);
}
export function demoRemoveFollower(handle: string) { save(K.removed, [...new Set([...load(K.removed), handle])]); }

const gameOf = (id: string): Game | undefined => demoGames.find((g) => g.id === id);
const ref = (g: Game) => ({ title: g.title, slug: g.slug, cover: g.cover ?? null });
const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

/** O perfil público de uma pessoa de exemplo, do jeito que o banco devolveria para você. */
export function demoPersonProfile(p: DemoPerson): PublicProfile {
  const friend = demoIsFriend(p);
  const see = (v: Vis) => v === 'publico' || (v === 'amigos' && friend);
  const games = (ids: string[]) => ids.map(gameOf).filter((g): g is Game => !!g);
  const out: PublicProfile = {
    name: p.handle, handle: p.handle, bio: p.bio, avatar: null, since: p.since, onlyLink: false,
    friendsOnly: (p.visibility.jornada === 'amigos' || p.visibility.colecao === 'amigos') && !friend,
    followers: (p.followsYou ? 3 : 1) + (demoFollowing().includes(p.handle) ? 1 : 0), following: p.followsYou ? 4 : 2,
    links: [],
  };
  if (see(p.visibility.jornada)) {
    out.jornada = {
      playing: games(p.playing).map((g, i) => ({ ...ref(g), progress: 30 + i * 10, startedAt: ago(9 + i), startedPrecision: 'dia', ordinal: 1 })),
      completed: games(p.done).map((g, i) => ({ ...ref(g), completedAt: ago(40 + i * 60), completedPrecision: 'mes', ordinal: 1 })),
      journeys: p.playing.length + p.done.length, finished: p.done.length, paused: [],
    };
  }
  if (see(p.visibility.colecao)) {
    const shelf = games(p.shelf);
    const by: Record<string, number> = {};
    shelf.forEach((g) => { const pl = g.platforms[0] ?? 'Outra'; by[pl] = (by[pl] ?? 0) + 1; });
    out.colecao = { count: shelf.length, platforms: Object.entries(by).map(([platform, n]) => ({ platform, n })), items: shelf.map((g) => ({ ...ref(g), platform: g.platforms[0] ?? 'Outra' })) };
  }
  const def = p.defining ? gameOf(p.defining) : undefined;
  out.stage = {
    defining: def ? { ...ref(def), backdrop: def.backdrop ?? null, year: def.year ?? null, text: null } : undefined,
    top: games(p.top).map((g) => ({ ...ref(g), quote: null })),
    since: null, cover: null,
  };
  return out;
}

/** Atividade das pessoas de exemplo que são suas amigas. */
export function demoActivity() {
  const out: { kind: 'jogando' | 'zerou' | 'momento'; handle: string; avatar: null; title: string; slug: string; cover: string | null; at: string; detail: string | null; shared: boolean }[] = [];
  for (const p of DEMO_PEOPLE) {
    if (!demoIsFriend(p) || p.visibility.jornada === 'privado') continue;
    p.playing.forEach((id, i) => { const g = gameOf(id); if (g) out.push({ kind: 'jogando', handle: p.handle, avatar: null, ...ref(g), at: ago(9 + i), detail: null, shared: false }); });
    p.done.slice(0, 2).forEach((id, i) => { const g = gameOf(id); if (g) out.push({ kind: 'zerou', handle: p.handle, avatar: null, ...ref(g), at: ago(40 + i * 60), detail: null, shared: false }); });
    p.moments.forEach((m) => { const g = gameOf(m.game); if (g) out.push({ kind: 'momento', handle: p.handle, avatar: null, ...ref(g), at: ago(m.days), detail: m.title, shared: false }); });
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}
