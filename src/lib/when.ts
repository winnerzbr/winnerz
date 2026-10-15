/** Datas e horas em português, no horário de Brasília (jogatinas, agenda dos clubes). */
export const TZ = 'America/Sao_Paulo';
export const dayKey = (d: Date) => d.toLocaleDateString('sv-SE', { timeZone: TZ });

/** "21h", "20h30". */
export function hourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).replace(/^0/, '').replace(':00', 'h').replace(':', 'h');
}

/** "hoje", "amanhã", "ontem" ou null. */
export function relDay(iso: string): string | null {
  const k = dayKey(new Date(iso));
  if (k === dayKey(new Date())) return 'hoje';
  if (k === dayKey(new Date(Date.now() + 86_400_000))) return 'amanhã';
  if (k === dayKey(new Date(Date.now() - 86_400_000))) return 'ontem';
  return null;
}

/** "hoje, 21h", "amanhã, 20h30", "sábado, 18 de out, 21h". */
export function whenLabel(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const hm = hourLabel(iso);
  const rel = relDay(iso);
  if (rel) return `${rel}, ${hm}`;
  const far = Math.abs(d.getTime() - Date.now()) > 6 * 86_400_000;
  return `${d.toLocaleDateString('pt-BR', far ? { day: 'numeric', month: 'short', timeZone: TZ } : { weekday: 'long', day: 'numeric', month: 'short', timeZone: TZ }).replace('.', '')}, ${hm}`;
}

/** "Sexta, 17 de outubro". */
export function dayLong(iso: string): string {
  const s = new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).replace('-feira', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "1 de out" a partir de "2026-10-01". */
export const dateShort = (ymd?: string | null) => (ymd ? new Date(`${ymd}T12:00:00-03:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: TZ }).replace('.', '') : '');
export const dateOf = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: TZ }).replace('.', '') : '');

/** "1 h 20", "45 min", "2 dias". */
export function spanLabel(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 60) return `${m} min`;
  if (m < 48 * 60) { const h = Math.floor(m / 60), r = m % 60; return r ? `${h} h ${r}` : `${h} h`; }
  return `${Math.round(m / 1440)} dias`;
}

/** Valor para <input type="datetime-local"> no fuso do navegador. */
export const localInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso); const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
};
