/**
 * Capítulos do jogo (J3): a lista montada pela comunidade, o capítulo em que você está, a resposta para
 * "Dá para parar aqui?" e as sugestões de objetivo pequeno para a sessão. Sem React e sem a store, para testar.
 */
export type StopKind = 'qualquer' | 'fim' | 'pontos' | 'longe';
export interface OutlinePart { id: string; name: string; pct: number; minutes?: number; stop?: StopKind; note?: string; spoiler?: boolean;
  /** A região, o ato ou o mundo do item (quando o jogo se divide assim). */ group?: string;
  /** Tipo curto quando a estrutura mistura coisas: chefe, área, masmorra, opcional. */ kind?: string }

/** Como o jogo se divide (migração 0060). */
export type Structure = 'capitulos' | 'missoes' | 'areas' | 'chefes' | 'atos' | 'episodios' | 'fases' | 'mundos' | 'etapas';
export const UNIT: Record<Structure, { one: string; many: string; title: string; a: 'o' | 'a' }> = {
  capitulos: { one: 'Capítulo', many: 'capítulos', title: 'Capítulos', a: 'o' },
  missoes: { one: 'Missão', many: 'missões', title: 'Missões', a: 'a' },
  areas: { one: 'Área', many: 'áreas', title: 'Áreas', a: 'a' },
  chefes: { one: 'Chefe', many: 'chefes', title: 'Chefes', a: 'o' },
  atos: { one: 'Ato', many: 'atos', title: 'Atos', a: 'o' },
  episodios: { one: 'Episódio', many: 'episódios', title: 'Episódios', a: 'o' },
  fases: { one: 'Fase', many: 'fases', title: 'Fases', a: 'a' },
  mundos: { one: 'Mundo', many: 'mundos', title: 'Mundos', a: 'o' },
  etapas: { one: 'Etapa', many: 'etapas', title: 'Etapas', a: 'a' },
};
export const unitOf = (o?: { structure?: Structure | null } | null) => UNIT[o?.structure ?? 'capitulos'] ?? UNIT.capitulos;
export interface OutlineSource { label: string; url: string; license?: string }
export interface GameOutline {
  gameId: string; parts: OutlinePart[]; version: number; updatedAt?: string | null; edits?: number; editors?: number; canEdit?: boolean; admin?: boolean;
  structure?: Structure;
  /** De onde veio: montada pela comunidade ou rascunho da IA (C1, migração 0058). */
  origin?: 'comunidade' | 'ia';
  sources?: OutlineSource[];
  /** Confirmações desta versão; com 3 (ou uma edição de pessoa), vira "Confirmado pela comunidade". */
  confirms?: number; confirmed?: boolean; mine?: boolean;
  /** O rascunho automático: em andamento, feito, sem lista (a IA não conhece) ou erro. */
  job?: 'rodando' | 'feito' | 'sem_lista' | 'erro' | null;
  /** O motivo da última tentativa (quando não deu lista). */
  jobNote?: string | null;
}
export type PartLogEntry = { id: string; at: string; src?: 'voce' | 'steam' | 'ra' };

export const STOP_LABEL: Record<StopKind, string> = {
  qualquer: 'Salva a qualquer hora',
  fim: 'Melhor parar no fim',
  pontos: 'Só em pontos de save',
  longe: 'Pontos de save longe',
};

/** O capítulo de quem está em p% (o último que começa até ali). Sem %, nenhum. */
export function partAt(parts: OutlinePart[], progress?: number | null, partId?: string | null): OutlinePart | null {
  if (partId) { const p = parts.find((x) => x.id === partId); if (p) return p; }
  if (progress == null || !parts.length) return null;
  let cur: OutlinePart | null = null;
  for (const p of [...parts].sort((a, b) => a.pct - b.pct)) if (p.pct <= progress) cur = p;
  return cur ?? null;
}

export function nextPart(parts: OutlinePart[], cur: OutlinePart | null): OutlinePart | null {
  const sorted = [...parts].sort((a, b) => a.pct - b.pct);
  if (!cur) return sorted[0] ?? null;
  const i = sorted.findIndex((p) => p.id === cur.id);
  return i >= 0 ? sorted[i + 1] ?? null : null;
}

const mins = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}`);

/** "Dá para parar aqui?": a resposta curta, o tom (sim, talvez, não) e a dica de quem montou. */
export function stopAdvice(part: OutlinePart | null): { tone: 'sim' | 'talvez' | 'nao' | 'sem'; title: string; text: string } {
  if (!part || !part.stop) return { tone: 'sem', title: 'Ninguém contou ainda', text: part ? 'Este capítulo ainda não tem a informação de onde dá para parar. Se você souber, conte para a comunidade.' : 'Diga em que capítulo você está para ver se dá para parar.' };
  const len = part.minutes ? ` Este capítulo costuma levar uns ${mins(part.minutes)}.` : '';
  switch (part.stop) {
    case 'qualquer': return { tone: 'sim', title: 'Dá, sim', text: 'O jogo salva a qualquer hora. Pode largar quando quiser.' };
    case 'fim': return { tone: 'talvez', title: 'Melhor no fim do capítulo', text: `O jogo guarda o progresso quando o capítulo termina.${len}` };
    case 'pontos': return { tone: 'talvez', title: 'Só em pontos de save', text: `Procure o próximo ponto de save antes de largar.${len}` };
    case 'longe': return { tone: 'nao', title: 'Melhor ainda não', text: `O próximo ponto seguro costuma ficar longe.${len}` };
  }
}

/** Sugestões de objetivo pequeno: do seu recado, da Cápsula, dos pontos para voltar e do capítulo. Sem repetir. */
export function goalSuggestions(inp: { note?: string; capsuleNext?: string; waypoint?: string; part?: OutlinePart | null; next?: OutlinePart | null; short?: boolean }): string[] {
  const out: string[] = [];
  // Um recado longo vira só a primeira frase (o objetivo é pequeno).
  const first = (t: string) => (t.length > 80 ? (t.split(/(?<=[.!?])\s/)[0] ?? t).replace(/[.!?]$/, '') : t);
  const add = (t?: string | null) => { const v = t ? first(t.replace(/\s+/g, ' ').trim()) : undefined; if (v && v.length <= 140 && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v); };
  add(inp.capsuleNext);
  add(inp.note);
  if (inp.waypoint) add(`Voltar a: ${inp.waypoint}`);
  const p = inp.part;
  if (p && (!inp.short || (p.minutes ?? 999) <= 30)) add(`Terminar ${p.spoiler ? 'o capítulo atual' : p.name}`);
  if (p?.stop === 'pontos' || p?.stop === 'longe') add('Chegar ao próximo ponto de save');
  if (!p && inp.next && !inp.next.spoiler) add(`Começar ${inp.next.name}`);
  if (inp.short) add('Só uma volta curta, sem meta');
  return out.slice(0, 5);
}

/** Lista pronta para gravar: nomes aparados, % entre 0 e 100, em ordem. */
export function cleanParts(parts: OutlinePart[]): OutlinePart[] {
  return parts
    .map((p) => ({ ...p, group: p.group?.trim().slice(0, 40) || undefined, kind: p.kind?.trim().toLowerCase().slice(0, 20) || undefined, name: p.name.replace(/\s+/g, ' ').trim().slice(0, 60), pct: Math.max(0, Math.min(100, Math.round(Number(p.pct) || 0))), note: p.note?.trim().slice(0, 140) || undefined, minutes: p.minutes ? Math.max(1, Math.min(600, Math.round(p.minutes))) : undefined }))
    .filter((p) => p.name)
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 60);
}

/**
 * Quando a pessoa chegou a cada capítulo. Marcar um capítulo grava a chegada; marcar um anterior é correção e
 * apaga as chegadas dali para a frente. Marcar o mesmo de novo não muda nada.
 */
export function logPart(log: PartLogEntry[] | undefined, parts: { id: string; pct: number }[], part: { id: string; pct: number } | null, at: string, src: PartLogEntry['src'] = 'voce'): PartLogEntry[] {
  const cur = (log ?? []).filter((e) => parts.some((p) => p.id === e.id));
  if (!part) return cur;
  if (cur.at(-1)?.id === part.id) return cur;
  const pctOf = (id: string) => parts.find((p) => p.id === id)?.pct ?? 0;
  const kept = cur.filter((e) => pctOf(e.id) < part.pct && e.id !== part.id);
  return [...kept, { id: part.id, at, src }].slice(-80);
}

/** Os capítulos já passados (com a data em que a pessoa chegou), o atual e os que vêm depois, em ordem. */
export function partsTimeline(parts: OutlinePart[], log: PartLogEntry[] | undefined, cur: OutlinePart | null) {
  const sorted = [...parts].sort((a, b) => a.pct - b.pct);
  const curIdx = cur ? sorted.findIndex((p) => p.id === cur.id) : -1;
  const when = new Map<string, PartLogEntry>();
  for (const e of log ?? []) if (!when.has(e.id)) when.set(e.id, e);
  return sorted.map((p, i) => ({ part: p, n: i + 1, total: sorted.length, state: (i < curIdx ? 'passou' : i === curIdx ? 'atual' : 'frente') as 'passou' | 'atual' | 'frente', at: when.get(p.id)?.at, src: when.get(p.id)?.src }));
}

/* ---- S1: achar o item pelo que a pessoa escreveu ------------------------------------------------------------- */

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const ORDINAL_RE = /^(?:cap|capitulo|chapter|ch|missao|mission|m|fase|level|nivel|ato|act|ep|episodio|episode|etapa|mundo|world|area|parte|part)?\s*(\d{1,3})$/;
/** Distância de edição pequena (até 2), para aceitar erro de digitação em palavras de 4 letras ou mais. */
function near(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, miss = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++miss > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return miss + (a.length - i) + (b.length - j) <= 1;
}

/**
 * Os itens da lista que combinam com o texto, do mais provável para o menos: sem acento e sem maiúscula,
 * aceita "cap 3" ou "3" (o terceiro item), palavras pela metade e um erro de digitação. Procura também no grupo.
 */
export function findParts(parts: OutlinePart[], query: string, limit = 6): OutlinePart[] {
  const q = fold(query);
  if (!q) return [];
  const sorted = [...parts].sort((a, b) => a.pct - b.pct);
  const scored = new Map<string, number>();
  const n = q.match(ORDINAL_RE);
  if (n) { const p = sorted[Number(n[1]) - 1]; if (p) scored.set(p.id, 70); }
  const words = q.split(' ').filter(Boolean);
  for (const p of sorted) {
    const name = fold(p.name), all = `${name} ${fold(p.group ?? '')}`.trim();
    const toks = all.split(' ');
    let s = 0;
    if (name === q) s = 100;
    else if (name.startsWith(q)) s = 85;
    else if (` ${name} `.includes(` ${q} `) || name.includes(q)) s = 75;
    else {
      const hit: number[] = words.map((w) => toks.some((t) => t === w) ? 3 : toks.some((t) => t.startsWith(w) && w.length >= 2) ? 2 : w.length >= 4 && toks.some((t) => near(t, w)) ? 1 : 0);
      if (hit.every((x) => x > 0)) s = 40 + Math.min(20, hit.reduce((a: number, b) => a + b, 0) * 2);
      else if (hit.filter((x) => x > 0).length >= Math.max(1, Math.ceil(words.length * 0.6)) && words.length > 1) s = 25;
    }
    if (s) scored.set(p.id, Math.max(scored.get(p.id) ?? 0, s));
  }
  return sorted.filter((p) => scored.has(p.id)).sort((a, b) => scored.get(b.id)! - scored.get(a.id)! || a.pct - b.pct).slice(0, limit);
}

/** O item atual e os próximos (atalhos do fim da sessão). */
export function partsAround(parts: OutlinePart[], cur: OutlinePart | null, ahead = 2): OutlinePart[] {
  const sorted = [...parts].sort((a, b) => a.pct - b.pct);
  const i = cur ? sorted.findIndex((p) => p.id === cur.id) : -1;
  return i < 0 ? sorted.slice(0, ahead + 1) : sorted.slice(i, i + 1 + ahead);
}
