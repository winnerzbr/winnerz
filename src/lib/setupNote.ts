import { getState } from '../data/store';

/** O que quem não é da administração vê no lugar de um aviso técnico (ex.: "falta rodar a migração 0015"). */
export const SETUP_GENERIC = 'Esta parte do site ainda está sendo preparada. Tente de novo mais tarde.';

/**
 * Avisos de configuração do banco servem só para a administração. Para as outras pessoas, vira uma frase simples.
 * Chame na hora de mostrar (nunca ao carregar o arquivo), para já saber quem está usando.
 */
export function setupNote(text: string): string {
  try { return getState().isAdmin ? text : SETUP_GENERIC; } catch { return SETUP_GENERIC; }
}
