/**
 * Corrigir informação: as correções aceitas ficam travadas na ficha (games.fixes, migração 0021).
 * Aqui ficam os nomes dos campos, a conferência do que a pessoa sugere (a mesma regra do banco)
 * e a regra para uma ficha nova do IGDB não desfazer uma correção.
 */
import type { Game, GameFixes } from '../data/types';

export type FixField = 'title' | 'year' | 'developer' | 'publisher' | 'platforms' | 'summary' | 'cover' | 'outro';

export const FIX_FIELDS: { k: FixField; label: string; hint: string }[] = [
  { k: 'title', label: 'Nome', hint: 'O nome oficial do jogo, como na capa.' },
  { k: 'year', label: 'Ano de lançamento', hint: 'O ano do primeiro lançamento, em qualquer plataforma.' },
  { k: 'platforms', label: 'Plataformas', hint: 'Em quais consoles e computadores o jogo saiu.' },
  { k: 'developer', label: 'Desenvolvedora', hint: 'O estúdio que fez o jogo.' },
  { k: 'publisher', label: 'Publicadora', hint: 'A empresa que lançou o jogo.' },
  { k: 'summary', label: 'Sinopse', hint: 'Uma tradução melhor, ou um texto sem spoiler.' },
  { k: 'cover', label: 'Capa', hint: 'Um link de imagem do IGDB (images.igdb.com).' },
  { k: 'outro', label: 'Outra coisa', hint: 'Conte o que está errado; a equipe confere.' },
];
export const fixLabel = (k: string) => FIX_FIELDS.find((f) => f.k === k)?.label ?? k;

/** Coluna do banco → campo da ficha no site. */
const KEY: Record<string, keyof Game> = {
  title: 'title', year: 'year', developer: 'developer', publisher: 'publisher', platforms: 'platforms',
  summary: 'summary', summary_source: 'summarySource', cover: 'cover',
};

/** Aplica as correções numa ficha. */
export function applyFixes(g: Game, fixes?: GameFixes): Game {
  if (!fixes || !Object.keys(fixes).length) return g;
  const out: Game = { ...g, fixes };
  for (const [col, f] of Object.entries(fixes)) {
    const k = KEY[col];
    if (k && f && 'v' in f) (out as unknown as Record<string, unknown>)[k] = f.v ?? undefined;
  }
  return out;
}

/** Ficha nova chegando: mantém as correções que ela não trouxe (o cache do catálogo pode ser de antes da correção). */
export function keepFixes(prev: Game | undefined, next: Game): Game {
  return applyFixes(next, next.fixes ?? prev?.fixes);
}

/** O que está na ficha agora, num formato para mostrar. */
export function shownValue(g: Game, k: FixField): string {
  switch (k) {
    case 'year': return g.year ? String(g.year) : '';
    case 'platforms': return g.platforms.join(', ');
    case 'outro': return '';
    default: return String((g as unknown as Record<string, unknown>)[k] ?? '');
  }
}

/** Mostra um valor sugerido (vem do banco como JSON). */
export function showProposed(v: unknown): string {
  if (Array.isArray(v)) return v.join(', ');
  if (v == null) return '';
  return String(v);
}

/** Campos da ficha que já foram corrigidos (para o selo "revisado pela comunidade"). */
export const fixedFields = (g: Game) => new Set(Object.keys(g.fixes ?? {}).filter((k) => k !== 'summary_source'));

const COVER = /^https:\/\/images\.igdb\.com\/igdb\/image\/upload\/t_[a-z0-9_]+\/[a-z0-9]+\.(jpg|png|webp)$/;

/** Confere a sugestão antes de mandar (a mesma regra do banco). Devolve o valor pronto ou o erro em português. */
export function checkFix(k: FixField, raw: string | string[], current: Game): { value: unknown } | { error: string } {
  if (k === 'outro') return { value: null };
  if (k === 'platforms') {
    const list = [...new Set((raw as string[]).map((x) => x.trim()).filter(Boolean))];
    if (!list.length) return { error: 'Marque pelo menos uma plataforma.' };
    if (list.length > 40 || list.some((x) => x.length > 80)) return { error: 'Lista de plataformas grande demais.' };
    const same = list.length === current.platforms.length && list.every((x) => current.platforms.includes(x));
    return same ? { error: 'Isso já é o que a ficha mostra.' } : { value: list };
  }
  const t = String(raw).trim();
  if (k === 'year') {
    const n = Number(t);
    if (!/^\d{4}$/.test(t) || n < 1950 || n > 2100) return { error: 'Use o ano com quatro números, por exemplo 2004.' };
    return n === current.year ? { error: 'Isso já é o que a ficha mostra.' } : { value: n };
  }
  if (k === 'cover') {
    const u = t.replace(/^http:/, 'https:').replace(/^\/\//, 'https://');
    if (!COVER.test(u)) return { error: 'Cole o link de uma imagem do IGDB (começa com https://images.igdb.com/igdb/image/upload/).' };
    return u === current.cover ? { error: 'Essa já é a capa da ficha.' } : { value: u };
  }
  const max = k === 'summary' ? 4000 : k === 'title' ? 200 : 120;
  const min = k === 'summary' ? 20 : 1;
  if (t.length < min) return { error: k === 'summary' ? 'A sinopse precisa de pelo menos 20 letras.' : 'Escreva o valor certo.' };
  if (t.length > max) return { error: `Use no máximo ${max} letras.` };
  return t === shownValue(current, k) ? { error: 'Isso já é o que a ficha mostra.' } : { value: t };
}
