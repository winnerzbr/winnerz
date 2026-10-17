/** Um evento para a agenda da pessoa: arquivo .ics (Apple, Outlook, Google) e o link do Google Agenda. */
export type CalEvent = { id: string; title: string; start: string; end?: string | null; details?: string | null; url?: string | null };

const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
/** Texto seguro dentro do .ics (vírgula, ponto e vírgula, barra e quebra de linha escapados). */
export const icsText = (t: string) => t.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\;');
/** Linhas do .ics com no máximo 75 caracteres (as seguintes começam com espaço). */
function fold(line: string): string {
  const out: string[] = [];
  for (let i = 0; i < line.length; i += i === 0 ? 75 : 74) out.push((i === 0 ? '' : ' ') + line.slice(i, i === 0 ? 75 : i + 74));
  return out.join('\r\n');
}
const endOf = (e: CalEvent) => e.end ?? new Date(Date.parse(e.start) + 2 * 3600_000).toISOString();

export function icsFile(e: CalEvent, now = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//WinnerZ//Agenda//PT-BR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:${e.id}@winnerz.com.br`, `DTSTAMP:${stamp(now.toISOString())}`, `DTSTART:${stamp(e.start)}`, `DTEND:${stamp(endOf(e))}`,
    `SUMMARY:${icsText(e.title)}`,
    ...(e.details ? [`DESCRIPTION:${icsText(e.details)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function googleLink(e: CalEvent): string {
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${stamp(e.start)}/${stamp(endOf(e))}`, details: [e.details, e.url].filter(Boolean).join('\n'), ctz: 'America/Sao_Paulo' });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** Baixa o .ics no navegador. */
export function downloadIcs(e: CalEvent) {
  const blob = new Blob([icsFile(e)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${e.title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'evento'}.ics`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
