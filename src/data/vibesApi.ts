/**
 * Clima dos jogos (migração 0044): notas de 0 a 3 (relaxa, desafia, intensidade, história, sessões curtas) e
 * uma frase de como a comunidade vê o jogo. Lidas do banco; as que faltam são pedidas ao servidor em lote, em
 * segundo plano, e ficam guardadas para todo mundo. Na demonstração, um punhado fixo.
 */
import type { Game, ID } from './types';
import { getState } from './store';

export type Vibe = { relax: number; challenge: number; intensity: number; story: number; short: number; note?: string | null };
const cache = new Map<ID, Vibe>();
const asked = new Set<ID>();
let listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
const supa = () => getState().mode === 'supabase';

const DEMO: Record<string, Vibe> = {
  tlou2: { relax: 0, challenge: 2, intensity: 3, story: 3, short: 1, note: 'Narrativa pesada e tensa; a comunidade destaca o peso emocional.' },
  astro: { relax: 3, challenge: 1, intensity: 1, story: 0, short: 3, note: 'Plataforma leve e alegre, visto como puro conforto.' },
  yakuza: { relax: 1, challenge: 1, intensity: 2, story: 3, short: 2, note: 'História longa com humor; muitas atividades curtas na cidade.' },
  p5r: { relax: 1, challenge: 2, intensity: 1, story: 3, short: 0, note: 'RPG longo, puxado pela história e pelo calendário.' },
  kz2: { relax: 0, challenge: 2, intensity: 3, story: 1, short: 2, note: 'FPS pesado e frenético, lembrado pelo peso dos controles.' },
  nfs: { relax: 2, challenge: 1, intensity: 2, story: 0, short: 3, note: 'Corridas rápidas de arcade: ótimo em partidas curtas.' },
  mgs2: { relax: 0, challenge: 2, intensity: 2, story: 3, short: 1, note: 'Furtividade e trama densa; divide opiniões pela história.' },
};

export const vibesApi = {
  get: (id: ID): Vibe | undefined => (supa() ? cache.get(id) : DEMO[id]),
  subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; },
  /** Lê do banco as que faltam e pede ao servidor a classificação das que ninguém tem ainda. */
  async ensure(games: Game[]) {
    if (!supa()) return;
    const want = games.filter((g) => !cache.has(g.id) && !asked.has(g.id));
    if (!want.length) return;
    want.forEach((g) => asked.add(g.id));
    try {
      const { getClient, accessToken } = await import('./supabaseAdapter');
      const sb = await getClient();
      const ids = want.map((g) => g.id);
      const r = await sb.from('game_vibes').select('game_id,relax,challenge,intensity,story,short,note').in('game_id', ids);
      if (r.error) return; // sem a 0044, a recomendação segue só com o IGDB
      let changed = false;
      for (const row of r.data as (Vibe & { game_id: ID })[]) { cache.set(row.game_id, row); changed = true; }
      if (changed) emit();
      const missing = want.filter((g) => !cache.has(g.id)).slice(0, 25);
      if (!missing.length) return;
      const res = await fetch('/api/retomada', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` },
        body: JSON.stringify({ kind: 'vibes', games: missing.map((g) => ({ id: g.id, title: g.title, year: g.year, platforms: g.platforms.slice(0, 4), genres: g.genres })) }) });
      const j = (await res.json().catch(() => ({}))) as { vibes?: (Vibe & { game_id: ID })[] };
      if (res.ok && j.vibes?.length) { for (const v of j.vibes) cache.set(v.game_id, v); emit(); }
    } catch { /* a recomendação continua sem o clima */ }
  },
};
