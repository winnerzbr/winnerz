/**
 * Texto das postagens e respostas: formatação simples, sem HTML.
 * **negrito**, *itálico*, links https, listas com "- " ou "1. ", ||trecho com spoiler||, @menção e citação com "> ".
 */
export type Inline =
  | { t: 'text'; v: string }
  | { t: 'b'; c: Inline[] }
  | { t: 'i'; c: Inline[] }
  | { t: 'link'; href: string; v: string }
  | { t: 'spoiler'; c: Inline[] }
  | { t: 'mention'; handle: string };
export type Block =
  | { t: 'p'; c: Inline[] }
  | { t: 'link'; url: string }
  | { t: 'ul'; items: Inline[][] }
  | { t: 'ol'; items: Inline[][] }
  | { t: 'quote'; c: Inline[] };

const URL_RE = /https:\/\/[^\s<>"')\]]+[^\s<>"')\].,;:!?]/;
/** @fulano: letras, números, ponto e sublinhado (o ponto do fim da frase fica de fora). */
const MENTION_RE = /^@([a-zA-Z0-9_](?:[a-zA-Z0-9_.]{0,28}[a-zA-Z0-9_])?)/;

export function inline(src: string, depth = 0): Inline[] {
  const out: Inline[] = [];
  let buf = '';
  const flush = () => { if (buf) { out.push({ t: 'text', v: buf }); buf = ''; } };
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    if (depth < 3) {
      const m = /^\|\|([\s\S]+?)\|\|/.exec(rest) ?? null;
      if (m) { flush(); out.push({ t: 'spoiler', c: inline(m[1], depth + 1) }); i += m[0].length; continue; }
      const b = /^\*\*([^*\n][\s\S]*?)\*\*/.exec(rest);
      if (b) { flush(); out.push({ t: 'b', c: inline(b[1], depth + 1) }); i += b[0].length; continue; }
      const it = /^\*([^*\s][^*\n]*?)\*/.exec(rest);
      if (it && (i === 0 || /[\s(]/.test(src[i - 1]))) { flush(); out.push({ t: 'i', c: inline(it[1], depth + 1) }); i += it[0].length; continue; }
    }
    const at = MENTION_RE.exec(rest);
    if (at && (i === 0 || !/[a-zA-Z0-9_.@]/.test(src[i - 1]))) { flush(); out.push({ t: 'mention', handle: at[1] }); i += at[0].length; continue; }
    const u = new RegExp(`^${URL_RE.source}`).exec(rest);
    if (u && (i === 0 || /[\s(]/.test(src[i - 1]))) { flush(); out.push({ t: 'link', href: u[0], v: u[0].replace(/^https:\/\/(www\.)?/, '') }); i += u[0].length; continue; }
    buf += src[i]; i++;
  }
  flush();
  return out;
}

export function parsePost(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  let para: string[] = [];
  let list: { t: 'ul' | 'ol'; items: string[] } | null = null;
  let quote: string[] | null = null;
  const endPara = () => { if (para.length) { blocks.push({ t: 'p', c: inline(para.join('\n')) }); para = []; } };
  const endList = () => { if (list) { blocks.push({ t: list.t, items: list.items.map((x) => inline(x)) }); list = null; } };
  const endQuote = () => { if (quote) { const t = quote.join('\n').trim(); if (t) blocks.push({ t: 'quote', c: inline(t) }); quote = null; } };
  for (const line of lines) {
    // Citação: linhas começando com "> " (o botão Citar monta assim).
    const q = /^\s*>\s?(.*)$/.exec(line);
    if (q) { endPara(); endList(); (quote ??= []).push(q[1]); continue; }
    endQuote();
    // Link sozinho na linha: vira bloco próprio (o site mostra o vídeo ou o post, quando reconhece).
    const solo = /^\s*<?(https?:\/\/[^\s<>"]+?)>?\s*$/.exec(line);
    if (solo) { endPara(); endList(); blocks.push({ t: 'link', url: solo[1] }); continue; }
    const ul = /^\s*[-•]\s+(.*)$/.exec(line);
    const ol = /^\s*\d{1,3}[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      endPara();
      const t = ul ? 'ul' : 'ol';
      if (list && list.t !== t) endList();
      list ??= { t, items: [] };
      list.items.push((ul ?? ol)![1]);
    } else if (!line.trim()) { endPara(); endList(); }
    else { endList(); para.push(line); }
  }
  endPara(); endList(); endQuote();
  return blocks;
}

/** Texto corrido, sem marcações (para resumos e avisos). Spoiler vira "[spoiler]". */
export function plainText(src: string): string {
  return src.replace(/^\s*>\s?/gm, '').replace(/\|\|[\s\S]+?\|\|/g, '[spoiler]').replace(/\*\*([\s\S]+?)\*\*/g, '$1').replace(/(^|\s)\*([^*\n]+)\*/g, '$1$2').replace(/^\s*[-•]\s+/gm, '• ').replace(/\s+/g, ' ').trim();
}

/** Até onde a pessoa precisa ter chegado no jogo para não levar spoiler: começo, meio ou final. */
export type SpoilerLevel = 'inicio' | 'meio' | 'final';
export interface GameProgress { progress: number | null; completed: boolean; started: boolean }
/**
 * Spoiler fica sempre coberto até a pessoa tocar; a Jornada só ajuda a decidir.
 * true = pela Jornada, já passou daquela parte; false = ainda não; null = o jogo não está na Jornada.
 */
export function spoilerReached(level: SpoilerLevel | null | undefined, p: GameProgress | null): boolean | null {
  if (!level) return true;
  if (!p) return null;
  if (p.completed) return true;
  const pr = p.progress ?? 0;
  if (level === 'inicio') return p.started && pr >= 15;
  if (level === 'meio') return pr >= 50;
  return pr >= 95;
}

/** As pessoas mencionadas num texto (sem repetir, sem o @). */
export function mentionsOf(src: string): string[] {
  const out = new Map<string, string>();
  const walk = (n: Inline[]) => n.forEach((x) => { if (x.t === 'mention') out.set(x.handle.toLowerCase(), x.handle); else if (x.t === 'b' || x.t === 'i' || x.t === 'spoiler') walk(x.c); });
  parsePost(src).forEach((b) => { if (b.t === 'p' || b.t === 'quote') walk(b.c); else if (b.t === 'ul' || b.t === 'ol') b.items.forEach(walk); });
  return [...out.values()];
}

/** Texto para o botão Citar: o trecho em linhas com "> " e quem escreveu. */
export function quoteOf(handle: string | null, text: string, max = 280): string {
  const t = plainText(text).slice(0, max);
  const cut = t.length >= max ? `${t.trimEnd()}…` : t;
  return `> ${handle ? `@${handle}: ` : ''}${cut}\n\n`;
}
