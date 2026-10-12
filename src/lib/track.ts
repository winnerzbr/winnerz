import { SUPABASE_ON } from './env';

/**
 * Métricas de uso anônimas: só o nome do recurso e o dia, sem nada da pessoa.
 * Cada recurso conta no máximo uma vez por visita, para medir quem usa, não quantos cliques.
 */
const seen = new Set<string>();
export function track(event: string) {
  if (!SUPABASE_ON || seen.has(event)) return;
  seen.add(event);
  import('../data/supabaseAdapter')
    .then(async ({ getClient }) => (await getClient()).from('usage_counts').insert({ event: event.slice(0, 60) }))
    .catch(() => { /* métrica nunca atrapalha o uso */ });
}
