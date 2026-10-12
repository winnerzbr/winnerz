/**
 * Leitor mínimo de planilhas .xlsx (e .csv), sem dependências.
 * Um .xlsx é um arquivo zip com XML dentro; o navegador descompacta sozinho (DecompressionStream).
 * Lê só valores (texto, número, verdadeiro/falso). Fórmulas chegam com o último valor calculado.
 */
export type Cell = string | number | boolean | null;
export type Sheet = { name: string; rows: Cell[][] };

const dec = new TextDecoder();

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const out = new Response(new Blob([data as BlobPart]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}

/** Lê o diretório central do zip e devolve os arquivos pedidos (por nome). */
async function unzip(buf: ArrayBuffer, wanted: (name: string) => boolean): Promise<Map<string, string>> {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65_557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Este arquivo não parece ser uma planilha .xlsx.');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = new Map<string, string>();
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true), elen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + elen + clen;
    if (!wanted(name)) continue;
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    const raw = u8.subarray(start, start + csize);
    const data = method === 0 ? raw : method === 8 ? await inflate(raw) : null;
    if (data) files.set(name, dec.decode(data));
  }
  return files;
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
export function unescapeXml(s: string) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e.toLowerCase()] ?? _);
}

function attrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/([\w:]+)="([^"]*)"/g)) out[m[1]] = unescapeXml(m[2]);
  return out;
}

/** Junta o texto de <t> de um trecho (ignora a leitura fonética <rPh>). */
function texts(xml: string) {
  return [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => unescapeXml(m[1])).join('');
}

function colIndex(ref: string) {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSheet(xml: string, shared: string[]): Cell[][] {
  const rows: Cell[][] = [];
  const data = xml.slice(xml.indexOf('<sheetData'), xml.lastIndexOf('</sheetData>'));
  let auto = 0;
  for (const rm of data.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const ra = attrs(rm[1]);
    const r = ra.r ? Number(ra.r) - 1 : auto;
    auto = r + 1;
    const row: Cell[] = [];
    let col = 0;
    for (const cm of (rm[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const a = attrs(cm[1]);
      const c = a.r ? colIndex(a.r) : col;
      col = c + 1;
      const body = cm[2] ?? '';
      const v = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      let val: Cell = null;
      if (a.t === 's') val = v != null ? shared[Number(v)] ?? null : null;
      else if (a.t === 'inlineStr') val = texts(body);
      else if (a.t === 'str' || a.t === 'e') val = v != null ? unescapeXml(v) : null;
      else if (a.t === 'b') val = v === '1';
      else if (v != null && v !== '') val = Number(v);
      if (val !== null && val !== '') row[c] = val;
    }
    rows[r] = Array.from(row, (x) => x ?? null);
  }
  return Array.from(rows, (x) => x ?? []);
}

export async function readXlsx(buf: ArrayBuffer): Promise<Sheet[]> {
  const files = await unzip(buf, (n) => n === 'xl/workbook.xml' || n === 'xl/_rels/workbook.xml.rels' || n === 'xl/sharedStrings.xml' || n.startsWith('xl/worksheets/sheet'));
  const wb = files.get('xl/workbook.xml');
  if (!wb) throw new Error('Não encontrei as abas desta planilha.');
  const shared = [...(files.get('xl/sharedStrings.xml') ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));
  const rels = new Map<string, string>();
  for (const m of (files.get('xl/_rels/workbook.xml.rels') ?? '').matchAll(/<Relationship\b([^>]*)\/?>/g)) {
    const a = attrs(m[1]);
    rels.set(a.Id, a.Target.startsWith('/') ? a.Target.slice(1) : `xl/${a.Target}`);
  }
  const sheets: Sheet[] = [];
  for (const m of wb.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const a = attrs(m[1]);
    const path = rels.get(a['r:id']);
    const xml = path ? files.get(path) : undefined;
    if (xml) sheets.push({ name: a.name, rows: parseSheet(xml, shared) });
  }
  return sheets;
}

/** CSV ou TSV (separador detectado: ; , ou tab), com aspas. Números no formato brasileiro viram número. */
export function readCsv(text: string, name = 'Planilha'): Sheet[] {
  const first = text.split(/\r?\n/, 1)[0] ?? '';
  const sep = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows: Cell[][] = [];
  let row: Cell[] = [], cur = '', q = false;
  const push = () => { const t = cur.trim(); row.push(t === '' ? null : /^-?\d+([.,]\d+)?$/.test(t) ? Number(t.replace(',', '.')) : t); cur = ''; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; continue; }
    if (ch === '"') q = true;
    else if (ch === sep) push();
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; push(); rows.push(row); row = []; }
    else cur += ch;
  }
  if (cur || row.length) { push(); rows.push(row); }
  return [{ name, rows }];
}

export async function readSpreadsheet(file: File): Promise<Sheet[]> {
  const n = file.name.toLowerCase();
  if (n.endsWith('.csv') || n.endsWith('.tsv') || n.endsWith('.txt')) return readCsv(await file.text(), file.name.replace(/\.\w+$/, ''));
  if (n.endsWith('.xls')) throw new Error('Arquivos .xls (Excel antigo) não são lidos. No Excel, use Salvar como → .xlsx.');
  return readXlsx(await file.arrayBuffer());
}
