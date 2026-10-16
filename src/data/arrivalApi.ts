/**
 * Os jogos da Chegada: os clássicos das plataformas que a pessoa marcou e os lançamentos mais aguardados do IGDB
 * (ver api/igdb.ts, ?chegada=). Guardados no navegador por um dia para não pesar no IGDB. Na demonstração, saem
 * dos jogos de exemplo.
 */
import type { Game } from './types';
import { demoGames } from './demo';
import { gameFromApi } from '../components/AddGameDialog';
import { localDay } from '../lib/dates';

const DAY = 86_400_000;
const isDemo = (mode: 'demo' | 'supabase') => mode === 'demo';

async function cached(key: string, url: string): Promise<Game[]> {
  try {
    const c = JSON.parse(localStorage.getItem(key) ?? 'null') as { at: number; games: Game[] } | null;
    if (c && Date.now() - c.at < DAY && Array.isArray(c.games) && c.games.length) return c.games;
  } catch { /* sem cache */ }
  const r = await fetch(url);
  if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return [];
  const rows = await r.json();
  if (!Array.isArray(rows)) return [];
  const games = rows.map(gameFromApi).filter((g) => g.id && g.slug && g.cover);
  try { if (games.length) localStorage.setItem(key, JSON.stringify({ at: Date.now(), games })); } catch { /* cheio ou bloqueado */ }
  return games;
}

/** Até 20 clássicos das plataformas (nomes do IGDB). Sem resposta, a grade de boas-vindas de sempre. */
export async function arrivalClassics(mode: 'demo' | 'supabase', platforms: string[]): Promise<Game[]> {
  const today = localDay();
  if (isDemo(mode)) return demoGames.filter((g) => !g.releasedOn || g.releasedOn <= today).slice(0, 20);
  const p = [...platforms].sort().join(',');
  let list = await cached(`wz.chegada.c.${p}`, `/api/igdb?chegada=classicos&p=${encodeURIComponent(p)}`).catch(() => [] as Game[]);
  if (list.length < 8) list = [...list, ...(await cached('wz.welcome.v1', '/api/igdb?welcome=1&v=1').catch(() => [] as Game[]))];
  const seen = new Set<string>();
  return list.filter((g) => (!g.releasedOn || g.releasedOn <= today) && !seen.has(g.id) && seen.add(g.id)).slice(0, 20);
}

/** Até 16 lançamentos mais aguardados (sem data entram também). */
export async function arrivalUpcoming(mode: 'demo' | 'supabase'): Promise<Game[]> {
  const today = localDay();
  if (isDemo(mode)) return demoGames.filter((g) => !!g.releasedOn && g.releasedOn > today);
  const list = await cached('wz.chegada.l', '/api/igdb?chegada=lancamentos').catch(() => [] as Game[]);
  return list.filter((g) => !g.releasedOn || g.releasedOn > today).slice(0, 16);
}
