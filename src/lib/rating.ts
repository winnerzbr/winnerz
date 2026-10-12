/**
 * Escalas de avaliação — segue o documento "Sistema de Escalas de Avaliação v1.0".
 * A nota pertence a quem avaliou; a escala visual pertence a quem está vendo.
 * Fonte de verdade: score normalizado 0..1000.
 */

export type Scale = 'TEN_POINT' | 'FIVE_STAR';

export interface Rating {
  normalized: number; // 0..1000
  originalScale: Scale;
  originalValue: number;
}

/** Valida e normaliza uma nota digitada na escala do autor. */
export function normalize(value: number, scale: Scale): Rating {
  const max = scale === 'TEN_POINT' ? 10 : 5;
  if (!Number.isFinite(value) || value < 0 || value > max) {
    throw new RangeError(`Nota fora da escala: ${value}`);
  }
  if (Math.round(value * 2) !== value * 2) {
    throw new RangeError('A nota precisa variar de meio em meio ponto.');
  }
  const normalized = Math.round(scale === 'TEN_POINT' ? value * 100 : value * 200);
  return { normalized, originalScale: scale, originalValue: value };
}

/** Valor numérico na escala de quem está vendo. */
export function toScale(normalized: number, scale: Scale): number {
  return scale === 'TEN_POINT' ? normalized / 100 : normalized / 200;
}

/**
 * Texto da nota na escala de quem vê, sem arredondar a opinião de ninguém:
 * 850 em 5 estrelas é "4,25"; médias usam uma casa decimal.
 */
export function formatScore(normalized: number, scale: Scale, opts: { average?: boolean } = {}): string {
  const v = toScale(normalized, scale);
  let s: string;
  if (opts.average) s = v.toFixed(1);
  else if (Math.round(v * 2) === v * 2) s = v.toFixed(1);
  else s = v.toFixed(2);
  return s.replace('.', ',');
}

export function scaleMax(scale: Scale): number {
  return scale === 'TEN_POINT' ? 10 : 5;
}

/** Percentual de preenchimento das estrelas (0..100). */
export function starFill(normalized: number): number {
  return Math.max(0, Math.min(100, normalized / 10));
}

/** Média calculada sempre sobre os valores normalizados. */
export function average(normalizedValues: number[]): number | null {
  if (!normalizedValues.length) return null;
  return normalizedValues.reduce((a, b) => a + b, 0) / normalizedValues.length;
}

/** "Nota original: 8,5/10" quando a escala de quem vê é diferente da de quem avaliou. */
export function originalLabel(r: Rating, viewer: Scale): string | null {
  if (r.originalScale === viewer) return null;
  const v = String(r.originalValue).replace('.', ',');
  return `Nota original: ${v}/${scaleMax(r.originalScale)}`;
}

/** Matiz da cor da nota, de vermelho (0) a verde (1), passando por laranja e amarelo. */
export function scoreHue(fraction: number): number {
  return Math.round(Math.max(0, Math.min(1, fraction)) * 128);
}
