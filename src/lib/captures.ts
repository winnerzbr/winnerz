/**
 * Datas das capturas de tela: do nome do arquivo (PS4/PS5, Steam, Switch, Xbox, Windows, Android),
 * dos dados da foto (EXIF) ou, por último, da data do arquivo. A pessoa confere antes de gravar.
 */
export type CaptureDate = { date: Date; source: 'nome' | 'foto' | 'arquivo' };

function valid(y: number, mo: number, d: number, h = 12, mi = 0, s = 0, now = Date.now()): Date | null {
  if (y < 1995 || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 59) return null;
  const dt = new Date(y, mo - 1, d, h, mi, s);
  if (dt.getMonth() !== mo - 1 || dt.getTime() > now + 2 * 86400000) return null;
  return dt;
}

export function dateFromName(name: string, now = Date.now()): Date | null {
  const base = name.replace(/\.[a-z0-9]+$/i, '');
  // 2023-10-05 12-34-56 / 2023-10-05_12.34.56 / 2023-10-05 at 12.34.56
  let m = /(19|20)(\d{2})[-_.](\d{2})[-_.](\d{2})(?:[ _T-]+(?:at |às )?(\d{2})[-_.:h](\d{2})(?:[-_.:m](\d{2}))?)?/.exec(base);
  if (m) return valid(Number(m[1] + m[2]), Number(m[3]), Number(m[4]), m[5] ? Number(m[5]) : 12, m[6] ? Number(m[6]) : 0, m[7] ? Number(m[7]) : 0, now);
  // 20231005123456 (PS, Steam, Switch) ou 20231005_123456 (celular)
  m = /(?:^|[^\d])((?:19|20)\d{2})(\d{2})(\d{2})[_-]?(\d{2})(\d{2})(\d{2})/.exec(base);
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]), now);
  m = /(?:^|[^\d])((?:19|20)\d{2})(\d{2})(\d{2})(?:[^\d]|$)/.exec(base);
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]), 12, 0, 0, now);
  return null;
}

/** Procura a data do EXIF ("2023:10:05 12:34:56") no começo do arquivo. */
export function dateFromExif(head: Uint8Array, now = Date.now()): Date | null {
  let txt = '';
  for (let i = 0; i < head.length; i++) txt += String.fromCharCode(head[i]);
  const m = /((?:19|20)\d{2}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(txt);
  return m ? valid(Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]), now) : null;
}

export async function captureDate(file: File, now = Date.now()): Promise<CaptureDate> {
  const byName = dateFromName(file.name, now);
  if (byName) return { date: byName, source: 'nome' };
  try {
    const head = new Uint8Array(await file.slice(0, 131072).arrayBuffer());
    const exif = dateFromExif(head, now);
    if (exif) return { date: exif, source: 'foto' };
  } catch { /* sem leitura: usa a data do arquivo */ }
  return { date: new Date(file.lastModified || now), source: 'arquivo' };
}
