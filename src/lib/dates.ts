/**
 * Datas com precisão. Quem registra o passado raramente lembra o dia exato,
 * e o site não pode fingir que sabe: guardamos a data junto com o quanto ela é precisa.
 */
export type DatePrecision = 'dia' | 'mes' | 'ano' | 'aprox' | 'desconhecida';

export const PRECISIONS: { id: DatePrecision; label: string }[] = [
  { id: 'dia', label: 'Dia exato' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
  { id: 'aprox', label: 'Por volta de' },
  { id: 'desconhecida', label: 'Não lembro' },
];

const TZ = 'America/Sao_Paulo';
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Partes da data no fuso de São Paulo. */
export function partsOf(iso: string) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
  const [y, m, d] = f.split('-').map(Number);
  return { y, m, d };
}

/** Monta o instante guardado para uma data informada com certa precisão (meio do período, ao meio-dia). */
export function isoFor(p: DatePrecision, y?: number, m?: number, d?: number, fallback = new Date().toISOString()): string {
  if (p === 'desconhecida' || !y) return fallback;
  const mm = p === 'dia' || p === 'mes' ? m ?? 7 : 7;
  const dd = p === 'dia' ? d ?? 1 : p === 'mes' ? 15 : 1;
  return `${String(y).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}T12:00:00-03:00`;
}

/** Texto honesto para uma data: "12 out 2026", "março de 2019", "2019", "por volta de 2010". */
export function whenLabel(iso: string | undefined, p: DatePrecision = 'dia', opts: { short?: boolean } = {}): string {
  if (!iso || p === 'desconhecida' || isNaN(new Date(iso).getTime())) return opts.short ? 'sem data' : 'data não informada';
  const { y, m, d } = partsOf(iso);
  if (p === 'ano') return String(y);
  if (p === 'aprox') return `por volta de ${y}`;
  if (p === 'mes') return opts.short ? `${MONTHS[m - 1].slice(0, 3)} ${y}` : `${MONTHS[m - 1]} de ${y}`;
  const sameYear = y === partsOf(new Date().toISOString()).y;
  return opts.short && sameYear ? `${d} ${MONTHS[m - 1].slice(0, 3)}` : `${d} ${MONTHS[m - 1].slice(0, 3)} ${y}`;
}

/** Duas datas só dão "seis anos depois" quando as duas são conhecidas. */
export function comparable(p?: DatePrecision) { return p !== 'desconhecida'; }

/** A data existe de verdade? (rejeita mês 25, 31 de fevereiro, anos fora de 1950–2100) */
export function validDate(y: number, m = 1, d = 1) {
  if (!Number.isInteger(y) || y < 1950 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** Lê datas comuns de planilha: 2020-01-20, 20/01/2020, 01/2020, 2020, número serial do Excel. */
export function parseLooseDate(v: unknown): { iso: string; precision: DatePrecision } | null {
  if (v == null || v === '') return null;
  const r = parseLooseDateRaw(v);
  return r && validDate(r.y, r.m, r.d) ? { iso: isoFor(r.precision, r.y, r.m, r.d), precision: r.precision } : null;
}

function parseLooseDateRaw(v: unknown): { y: number; m?: number; d?: number; precision: DatePrecision } | null {
  if (v instanceof Date && !isNaN(v.getTime())) return { y: v.getUTCFullYear(), m: v.getUTCMonth() + 1, d: v.getUTCDate(), precision: 'dia' };
  if (typeof v === 'number') {
    if (v > 1900 && v < 2200 && Number.isInteger(v)) return { y: v, precision: 'ano' };
    if (v > 20000 && v < 80000) { // serial do Excel (dias desde 1899-12-30)
      const dt = new Date(Math.round((v - 25569) * 86_400_000));
      return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate(), precision: 'dia' };
    }
    return null;
  }
  const s = String(v).trim();
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return { y: +m[1], m: +m[2], d: +m[3], precision: 'dia' };
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/))) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return { y, m: +m[2], d: +m[1], precision: 'dia' };
  }
  if ((m = s.match(/^(\d{1,2})\/(\d{4})$/))) return { y: +m[2], m: +m[1], precision: 'mes' };
  if ((m = s.match(/^(?:por volta de |~|cerca de )(\d{4})$/i))) return { y: +m[1], precision: 'aprox' };
  if ((m = s.match(/^(\d{4})$/))) return { y: +m[1], precision: 'ano' };
  return null;
}

/** AAAA-MM-DD no fuso de quem usa, daqui a `plusDays` dias. */
export function localDay(plusDays = 0, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + plusDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
