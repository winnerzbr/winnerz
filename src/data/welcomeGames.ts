import { useEffect, useState } from 'react';
import type { Game } from './types';
import { demoGames } from './demo';
import { gameFromApi } from '../components/AddGameDialog';
import { localDay } from '../lib/dates';

/**
 * A grade das boas-vindas: clássicos de várias épocas (escolhidos no servidor, ver api/igdb.ts) e um
 * lançamento grande para o Radar. Guardados no navegador por uma semana para não pesar no IGDB.
 */
const KEY = 'wz.welcome.v1';
const WEEK = 7 * 86_400_000;
export const WELCOME_PICKS = 15;

export interface WelcomeGames { picks: Game[]; upcoming: Game | null; ready: boolean }

function split(list: Game[]): Omit<WelcomeGames, 'ready'> {
  const today = localDay();
  const isNext = (g: Game) => !!g.releasedOn && g.releasedOn > today;
  return { picks: list.filter((g) => !isNext(g) && g.cover).slice(0, WELCOME_PICKS), upcoming: list.find(isNext) ?? null };
}

async function fetchList(): Promise<Game[]> {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { at: number; games: Game[] } | null;
    if (c && Date.now() - c.at < WEEK && Array.isArray(c.games) && c.games.length) return c.games;
  } catch { /* sem cache */ }
  const r = await fetch('/api/igdb?welcome=1&v=1');
  if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return [];
  const rows = await r.json();
  if (!Array.isArray(rows)) return [];
  const games = rows.map(gameFromApi).filter((g) => g.id && g.slug);
  try { if (games.length) localStorage.setItem(KEY, JSON.stringify({ at: Date.now(), games })); } catch { /* cheio ou bloqueado */ }
  return games;
}

export function useWelcomeGames(mode: 'demo' | 'supabase'): WelcomeGames {
  const [list, setList] = useState<Game[] | null>(mode === 'demo' ? [...demoGames] : null);
  useEffect(() => {
    if (mode === 'demo') return;
    let alive = true;
    fetchList().then((g) => alive && setList(g)).catch(() => alive && setList([]));
    return () => { alive = false; };
  }, [mode]);
  return { ...split(list ?? []), ready: list !== null };
}
