/**
 * Vídeos dos capítulos (C4): o código do vídeo e o minuto de um link do YouTube colado à mão, e qual vídeo mostrar
 * quando há mais de um (canal WinnerZ, escolhido por quem joga, achado na busca em português, depois em inglês).
 */
export interface PartVideo { partId: string; source: 'canal' | 'pessoa' | 'auto'; lang: 'pt' | 'en' | '?'; videoId: string; start: number }

const ID = /^[A-Za-z0-9_-]{6,20}$/;
/** "1h2m3s", "90", "90s", "1:30" → segundos. */
function secs(t: string | null): number {
  if (!t) return 0;
  if (/^\d+s?$/.test(t)) return parseInt(t, 10);
  if (/^\d{1,2}(:\d{2}){1,2}$/.test(t)) return t.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(t);
  return m && (m[1] || m[2] || m[3]) ? Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0) : 0;
}

/** O vídeo e o minuto de um link do YouTube (watch, youtu.be, shorts, live, embed). Senão, null. */
export function ytParse(raw: string): { id: string; start: number } | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  const h = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  const seg = u.pathname.split('/').filter(Boolean);
  const t = secs(u.searchParams.get('t') ?? u.searchParams.get('start') ?? (u.hash.match(/t=([^&]+)/)?.[1] ?? null));
  let id = '';
  if (h === 'youtu.be') id = seg[0] ?? '';
  else if (h === 'youtube.com' || h === 'youtube-nocookie.com') id = u.searchParams.get('v') ?? (['shorts', 'live', 'embed', 'v'].includes(seg[0] ?? '') ? seg[1] ?? '' : '');
  return ID.test(id) ? { id, start: Math.min(86400, t) } : null;
}

const RANK = (v: PartVideo) => (v.source === 'canal' ? 0 : v.source === 'pessoa' ? 1 : v.lang === 'pt' ? 2 : 3);
/** Os vídeos de um item, do que mostrar primeiro ao último. */
export function videosOf(all: PartVideo[] | undefined, partId: string): PartVideo[] {
  return (all ?? []).filter((v) => v.partId === partId).sort((a, b) => RANK(a) - RANK(b));
}

/** "12:34" ou "1:02:03". */
export const clock = (s: number) => `${Math.floor(s / 3600) ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}` : Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
export const embedUrl = (v: { videoId: string; start: number }) => `https://www.youtube-nocookie.com/embed/${v.videoId}?rel=0&playsinline=1&autoplay=1${v.start ? `&start=${v.start}` : ''}`;
export const watchUrl = (v: { videoId: string; start: number }) => `https://www.youtube.com/watch?v=${v.videoId}${v.start ? `&t=${v.start}s` : ''}`;
