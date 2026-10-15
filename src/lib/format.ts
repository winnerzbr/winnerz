const tz = 'America/Sao_Paulo';

export function dayMonth(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: tz }).replace('.', '');
}
export function dayMonthYear(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: tz });
}
export function longDay(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz });
}
export function hourMin(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz });
}
export function shortDate(iso: string) {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: sameYear ? undefined : 'numeric', timeZone: tz }).replace('.', '').replace(' de ', ' ');
}
export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "há 4 dias", "ontem", "hoje" — sem cobrança. */
export function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? 'há um mês' : `há ${months} meses`;
  const years = Math.floor(days / 365);
  return years === 1 ? 'há um ano' : `há ${years} anos`;
}

/** Texto para a distância entre dois registros ("seis anos depois"). */
const words = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez'];
export function gapLabel(fromIso: string, toIso: string) {
  const years = Math.floor((new Date(toIso).getTime() - new Date(fromIso).getTime()) / (365.25 * 86_400_000));
  if (years < 1) return null;
  const w = years <= 10 ? words[years] : String(years);
  return years === 1 ? 'um ano depois' : `${w} anos depois`;
}

/** Duração de sessão: "35 min", "1 h", "1 h 40". */
export const durLabel = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}`);
