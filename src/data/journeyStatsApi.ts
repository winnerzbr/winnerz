/**
 * Jornadas da comunidade na ficha do jogo (migração 0050): números anônimos de todo mundo que registrou o jogo
 * (migração 0052).
 * Nada aparece com menos de 5 pessoas. Na demonstração, os números são de exemplo.
 */
import { getState } from './store';

export interface Median { n: number; mediana: number; p25?: number; p75?: number }
export interface JourneyStats {
  enough: boolean; k: number; pessoas?: number;
  /** null: menos de 5 (não mostramos para não apontar ninguém). */
  zeraram?: number | null; jogando?: number | null; pausaram?: number | null; largaram?: number | null; rejogaram?: number | null;
  dias?: Median | null; horas?: Median | null; sessoes?: Median | null; minutos?: number | null; progressoAoPausar?: number | null;
  pausas?: { part: string; n: number; name?: string | null; pct?: number | null }[];
  exemplo?: boolean;
}

function demo(slug: string): JourneyStats {
  // Números fixos por jogo, só para mostrar como fica.
  let h = 0; for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pessoas = 18 + (h % 60), zer = Math.round(pessoas * (0.35 + (h % 40) / 100));
  return {
    enough: true, k: 5, exemplo: true, pessoas, zeraram: zer, jogando: 5 + (h % 9), pausaram: 6 + (h % 5), largaram: (h % 7) + 2 >= 5 ? (h % 7) + 2 : null, rejogaram: h % 3 ? 5 + (h % 4) : null,
    dias: { n: Math.max(5, zer - 3), mediana: 14 + (h % 40), p25: 8 + (h % 10), p75: 30 + (h % 60) },
    horas: { n: Math.max(5, Math.round(zer / 2)), mediana: 12 + (h % 30) },
    sessoes: { n: Math.max(5, zer - 4), mediana: 8 + (h % 14) }, minutos: 45 + (h % 50), progressoAoPausar: 30 + (h % 8) * 5,
    pausas: [],
  };
}

export const journeyStatsApi = {
  async get(slug: string): Promise<JourneyStats | null> {
    if (getState().mode !== 'supabase') return demo(slug);
    const r = await (await (await import('./supabaseAdapter')).getClient()).rpc('game_journey_stats', { p_game: slug });
    return r.error ? null : (r.data as JourneyStats | null);
  },
};
