/**
 * Tradutor de tela (migração 0079): a foto da TV (ou a janela do jogo) vai para /api/retomada, que lê e traduz com o
 * glossário do jogo. O glossário e o caderno moram no banco; a foto nunca é guardada. Na demonstração, tudo fica
 * neste navegador, com uma tradução de exemplo.
 */
import { getState } from './store';
import { setupNote } from '../lib/setupNote';
import { track } from '../lib/track';

export type TrMode = 'dialogo' | 'menu' | 'longo' | 'explicar' | 'estudo';
export const TR_MODES: { id: TrMode; name: string; hint: string }[] = [
  { id: 'dialogo', name: 'Diálogo', hint: 'Falas, com o nome de quem fala' },
  { id: 'menu', name: 'Menu', hint: 'Itens, opções e status, curtinho' },
  { id: 'longo', name: 'Texto longo', hint: 'Cartas, livros e descrições' },
  { id: 'explicar', name: 'Explicar', hint: 'Traduz e explica enigmas e trocadilhos' },
  { id: 'estudo', name: 'Estudo', hint: 'Mostra a leitura e o sentido literal' },
];
export type TrKind = 'pessoa' | 'lugar' | 'item' | 'golpe' | 'outro';
export const TR_KINDS: { id: TrKind; name: string }[] = [
  { id: 'pessoa', name: 'Personagem' }, { id: 'lugar', name: 'Lugar' }, { id: 'item', name: 'Item' }, { id: 'golpe', name: 'Golpe' }, { id: 'outro', name: 'Outro' },
];
export interface TrLine { who: string; src: string; pt: string; reading?: string; literal?: string; box?: number[] | null }
export interface TrTerm { src: string; pt: string; kind: TrKind; origin?: 'ia' | 'pessoa'; people?: number }
export interface TrResult { lines: TrLine[]; explain: string; lang: string; legible: 'sim' | 'parcial' | 'nao'; terms: TrTerm[]; noteId: number | null; better: boolean; used: number; limit: number }
export interface TrNote { id: number; mode: TrMode; lang: string | null; lines: { who: string; src: string; pt: string }[]; explain: string | null; at: string }
export interface TrMine { terms: TrTerm[]; galera: TrTerm[]; notes: TrNote[]; share: boolean }

export const LANG_NAME: Record<string, string> = { ja: 'japonês', en: 'inglês', zh: 'chinês', ko: 'coreano', fr: 'francês', de: 'alemão', es: 'espanhol', it: 'italiano', ru: 'russo', pt: 'português' };

const ok = <T>(r: { data: T; error: { message?: string } | null }): T => {
  if (r.error) {
    const m = r.error.message ?? '';
    if (/tr_/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error(setupNote('Falta rodar a migração 0079 no Supabase.'));
    if (/tr_termo/.test(m)) throw new Error('O termo precisa ter de 1 a 60 letras.');
    if (/tr_cheio/.test(m)) throw new Error('Este glossário chegou a 400 termos. Apague alguns para criar novos.');
    if (/tr_jogo/.test(m)) throw new Error('Não achei esse jogo.');
    throw new Error(m);
  }
  return r.data;
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';
const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => ok(await (await client()).rpc(fn, args)) as T;
const token = async () => (await import('./supabaseAdapter')).accessToken();

/* ---- Demonstração ------------------------------------------------------------------------------ */
const DK = 'wz.demo.tradutor';
type DState = Record<string, { terms: TrTerm[]; notes: TrNote[] }>;
const load = (): DState => { try { return JSON.parse(localStorage.getItem(DK) ?? '{}') as DState; } catch { return {}; } };
const save = (s: DState) => { try { localStorage.setItem(DK, JSON.stringify(s)); } catch { /* sem espaço: segue */ } };
const DEMO_GALERA: TrTerm[] = [
  { src: 'ハルカゼ村', pt: 'Vila Harukaze', kind: 'lugar', people: 3 },
  { src: 'ほしのかけら', pt: 'Fragmento de estrela', kind: 'item', people: 2 },
  { src: 'ソラ', pt: 'Sora', kind: 'pessoa', people: 1 },
];
/** Uma tela de exemplo por modo (a demonstração não chama a IA). */
function demoResult(mode: TrMode): Omit<TrResult, 'noteId' | 'used' | 'limit' | 'better'> {
  if (mode === 'menu') return {
    lang: 'ja', legible: 'sim', explain: '', terms: [{ src: 'ほしのかけら', pt: 'Fragmento de estrela', kind: 'item' }],
    lines: [
      { who: '', src: 'どうぐ', pt: 'Itens', box: [7, 12, 20, 9] }, { who: '', src: 'そうび', pt: 'Equipar', box: [7, 24, 20, 9] },
      { who: '', src: 'ほしのかけら ×3', pt: 'Fragmento de estrela ×3', box: [36, 12, 46, 9] }, { who: '', src: 'セーブ', pt: 'Salvar', box: [7, 36, 20, 9] },
    ],
  };
  const lines: TrLine[] = [
    { who: 'Mina', src: 'タケル、こっちよ！森の奥から煙が見える。', pt: 'Takeru, por aqui! Dá para ver fumaça vindo do fundo da floresta.', box: [13, 69.5, 70, 7.5],
      ...(mode === 'estudo' ? { reading: 'Takeru, kocchi yo! Mori no oku kara kemuri ga mieru.', literal: 'Takeru, para cá! Floresta, fundo, de onde, fumaça, é visível.' } : {}) },
    { who: 'Mina', src: 'ハルカゼ村のみんなを呼んできて。', pt: 'Vai chamar o pessoal da Vila Harukaze.', box: [13, 78.5, 70, 7.5],
      ...(mode === 'estudo' ? { reading: 'Harukaze-mura no minna o yonde kite.', literal: 'Vila Harukaze, de, todos, chamar e voltar.' } : {}) },
  ];
  return {
    lang: 'ja', legible: 'sim', lines, terms: [{ src: 'ミナ', pt: 'Mina', kind: 'pessoa' }, { src: 'タケル', pt: 'Takeru', kind: 'pessoa' }, { src: 'ハルカゼ村', pt: 'Vila Harukaze', kind: 'lugar' }],
    explain: mode === 'explicar' ? '“Yonde kite” é “vá chamar e volte”: a Mina não quer só que avisem a vila, quer que o Takeru traga as pessoas até ela. O “yo” no fim da primeira frase é o jeito dela de chamar atenção, como um “ó!” em português.' : '',
  };
}
let demoUsed = 12;

/* ---- API ------------------------------------------------------------------------------------- */
export const tradutorApi = {
  /** Quanto já usou neste mês (null se a IA não está ligada). */
  async usage(): Promise<{ used: number; limit: number } | null> {
    if (!supa()) return { used: demoUsed, limit: 400 };
    try {
      const r = await fetch('/api/retomada', { headers: { Authorization: `Bearer ${await token()}` } });
      if (!r.ok) return null;
      const j = await r.json() as { enabled?: boolean; tr?: { used: number; limit: number } };
      return j.enabled && j.tr ? j.tr : null;
    } catch { return null; }
  },

  async translate(gameId: string, image: string, mode: TrMode, better = false): Promise<TrResult> {
    track(better ? 'tradutor.melhor' : `tradutor.${mode}`);
    if (!supa()) {
      await new Promise((ok) => setTimeout(ok, 1400));
      const base = demoResult(mode);
      const s = load();
      const g = (s[gameId] ??= { terms: [], notes: [] });
      const note: TrNote = { id: Date.now(), mode, lang: base.lang, lines: base.lines.map((l) => ({ who: l.who, src: l.src, pt: l.pt })), explain: base.explain || null, at: new Date().toISOString() };
      g.notes.unshift(note);
      for (const t of base.terms) if (!g.terms.some((x) => x.src === t.src)) g.terms.push({ ...t, origin: 'ia' });
      save(s);
      demoUsed += better || mode === 'explicar' ? 5 : 1;
      return { ...base, noteId: note.id, better: better || mode === 'explicar', used: demoUsed, limit: 400 };
    }
    const r = await fetch('/api/retomada', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ kind: 'traduzir', game: gameId, image, mode, better, prev: better ? 'estranha' : undefined }),
    });
    const j = await r.json().catch(() => ({})) as TrResult & { error?: string };
    if (!r.ok) throw new Error(j.error ?? 'A IA não respondeu agora. Tente de novo.');
    return j;
  },

  async mine(gameId: string): Promise<TrMine> {
    if (!supa()) { const g = load()[gameId]; return { terms: g?.terms ?? [], galera: DEMO_GALERA.filter((t) => !g?.terms.some((x) => x.src === t.src)), notes: g?.notes ?? [], share: getState().prefs.trGalera !== false }; }
    return rpc<TrMine>('tr_my', { p_game: gameId });
  },

  /** Cria ou corrige um termo (pt vazio apaga). */
  async setTerm(gameId: string, src: string, pt: string, kind: TrKind): Promise<void> {
    if (!supa()) {
      const s = load(); const g = (s[gameId] ??= { terms: [], notes: [] });
      const k = src.trim().toLowerCase();
      g.terms = g.terms.filter((t) => t.src.trim().toLowerCase() !== k);
      if (pt.trim()) g.terms.push({ src: src.trim(), pt: pt.trim(), kind, origin: 'pessoa' });
      g.terms.sort((a, b) => a.src.localeCompare(b.src));
      save(s); return;
    }
    await rpc('tr_term_set', { p_game: gameId, p_src: src, p_pt: pt, p_kind: kind });
    track('tradutor.termo');
  },

  /** Apaga uma tradução do caderno (ou todas, sem id). */
  async deleteNote(gameId: string, id?: number): Promise<void> {
    if (!supa()) { const s = load(); const g = s[gameId]; if (g) { g.notes = id == null ? [] : g.notes.filter((n) => n.id !== id); save(s); } return; }
    await rpc('tr_note_delete', { p_game: gameId, p_id: id ?? null });
  },

  resetDemo() { try { localStorage.removeItem(DK); } catch { /* nada */ } },
};

/* ---- Imagem ----------------------------------------------------------------------------------- */

/** Lado maior da imagem enviada: o bastante para ler fontes pequenas sem pesar. */
export const TR_MAX = 1568;

/** Desenha um quadro (vídeo, imagem ou bitmap) reduzido num canvas. */
export function grab(src: CanvasImageSource & { videoWidth?: number; videoHeight?: number; width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }, max = TR_MAX): HTMLCanvasElement | null {
  const w = src.videoWidth || src.naturalWidth || Number(src.width) || 0;
  const h = src.videoHeight || src.naturalHeight || Number(src.height) || 0;
  if (!w || !h) return null;
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

/**
 * Confere a foto antes de gastar uma tradução: escura demais ou tremida.
 * Escura: brilho médio baixo. Tremida: pouca diferença entre pixels vizinhos (bordas fracas) numa versão pequena.
 */
export function quality(c: HTMLCanvasElement): { dark: boolean; blurry: boolean } {
  const s = document.createElement('canvas');
  const k = Math.min(1, 320 / Math.max(c.width, c.height));
  s.width = Math.max(1, Math.round(c.width * k)); s.height = Math.max(1, Math.round(c.height * k));
  const x = s.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(c, 0, 0, s.width, s.height);
  const d = x.getImageData(0, 0, s.width, s.height).data;
  const g = new Float32Array(s.width * s.height);
  let sum = 0;
  for (let i = 0; i < g.length; i++) { const v = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; g[i] = v; sum += v; }
  let edge = 0, n = 0;
  for (let y = 1; y < s.height - 1; y++) for (let xx = 1; xx < s.width - 1; xx++) {
    const i = y * s.width + xx;
    const lap = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - s.width] - g[i + s.width];
    edge += lap * lap; n++;
  }
  return { dark: sum / g.length < 38, blurry: n > 0 && edge / n < 60 };
}

export const canvasData = (c: HTMLCanvasElement) => c.toDataURL('image/jpeg', 0.85);
