/**
 * Corrigir informação (Etapa 5, entrega 7): sugestões de correção, fila da administração e painel de qualidade.
 * Com conta, tudo passa pelas funções do banco (migração 0021), que conferem quem pode o quê.
 * Na demonstração, a fila fica neste navegador e a correção vale só aqui.
 */
import { actions, getState } from './store';
import type { Game, GameFixes } from './types';
import { applyFixes, type FixField } from '../lib/fixes';
import { gameFromApi } from '../components/AddGameDialog';

export type ReportStatus = 'aberta' | 'aceita' | 'recusada';
export interface MyReport { id: string; field: FixField; proposed: unknown; note?: string; status: ReportStatus; reply?: string; createdAt: string }
export interface QueueItem extends MyReport {
  gameId: string; slug: string; title: string; cover?: string; igdbId?: number;
  current: unknown; source?: string; reviewedAt?: string; handle?: string; sameOpen: number; game: Game;
}
export interface QualityItem { id: string; slug: string; title: string; cover?: string; year?: number; igdbId?: number; uses: number }
export interface Quality { inUse: number; openQueue: number; groups: Record<string, { total: number; items: QualityItem[] }> }

export const QUALITY_GROUPS: { k: string; label: string; hint: string }[] = [
  { k: 'sinopse_em_ingles', label: 'Sinopse em inglês', hint: 'A tradução automática não rodou. "Atualizar do IGDB" tenta de novo.' },
  { k: 'sem_sinopse', label: 'Sem sinopse', hint: 'Nem o IGDB tem um texto para esses jogos.' },
  { k: 'sem_capa', label: 'Sem capa', hint: 'Aparecem com a capa genérica do site.' },
  { k: 'sem_ano', label: 'Sem ano', hint: 'Ficam fora da linha do tempo e das estatísticas por época.' },
  { k: 'sem_plataforma', label: 'Sem plataforma', hint: 'Atrapalham os filtros e as estantes por console.' },
  { k: 'repetidos', label: 'Nomes repetidos', hint: 'Fichas diferentes com o mesmo nome: podem ser o mesmo jogo duas vezes.' },
  { k: 'fora_do_igdb', label: 'Fora do catálogo', hint: 'Fichas criadas à mão, sem ligação com o IGDB.' },
  { k: 'corrigidos', label: 'Já corrigidos', hint: 'Fichas com alguma correção aceita.' },
];

const ok = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) {
    const m = r.error.message;
    if (/report_game|report_queue|data_quality|fix_game|my_reports|game_reports|schema cache/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0021 no Supabase.');
    throw new Error(m);
  }
  return r.data;
};
const client = async () => (await import('./supabaseAdapter')).getClient();

/** Uma ficha que acabou de sair do banco é a verdade: inclusive quando uma correção foi desfeita. */
const fromDb = (row: any): Game => ({ ...gameFromApi(row), fixes: row.fixes ?? {} });

const myFromRow = (r: any): MyReport => ({ id: r.id, field: r.field, proposed: r.proposed, note: r.note ?? undefined, status: r.status, reply: r.reply ?? undefined, createdAt: r.created_at });

interface FixesApi {
  report(gameId: string, field: FixField, value: unknown, note: string, source: string): Promise<void>;
  mine(gameId: string): Promise<MyReport[]>;
  queue(status: ReportStatus): Promise<QueueItem[]>;
  review(item: QueueItem, accept: boolean, value: unknown, reply: string): Promise<void>;
  fix(gameId: string, field: FixField, value: unknown): Promise<void>;
  unfix(gameId: string, field: FixField): Promise<void>;
  quality(): Promise<Quality>;
}

const supabaseApi: FixesApi = {
  async report(gameId, field, value, note, source) {
    const sb = await client();
    ok(await sb.rpc('report_game', { p_game: gameId, p_field: field, p_value: value, p_note: note || null, p_source: source || null }));
  },
  async mine(gameId) {
    const sb = await client();
    return ((ok(await sb.rpc('my_reports', { p_game: gameId })) as any[]) ?? []).map(myFromRow);
  },
  async queue(status) {
    const sb = await client();
    return ((ok(await sb.rpc('report_queue', { p_status: status })) as any[]) ?? []).map((r) => ({
      ...myFromRow(r), gameId: r.game_id, slug: r.slug, title: r.title, cover: r.cover ?? undefined, igdbId: r.igdb_id ?? undefined,
      current: r.current, source: r.source ?? undefined, reviewedAt: r.reviewed_at ?? undefined, handle: r.handle ?? undefined,
      sameOpen: r.same_open ?? 0, game: fromDb(r.game),
    }));
  },
  async review(item, accept, value, reply) {
    const sb = await client();
    const row = ok(await sb.rpc('review_report', { p_id: item.id, p_accept: accept, p_value: value ?? null, p_reply: reply || null }));
    if (row) actions.mergeGames([fromDb(row)]);
  },
  async fix(gameId, field, value) {
    const sb = await client();
    actions.mergeGames([fromDb(ok(await sb.rpc('fix_game', { p_game: gameId, p_field: field, p_value: value })))]);
  },
  async unfix(gameId, field) {
    const sb = await client();
    actions.mergeGames([fromDb(ok(await sb.rpc('unfix_game', { p_game: gameId, p_field: field })))]);
  },
  async quality() {
    const sb = await client();
    const j = ok(await sb.rpc('data_quality')) as any;
    const groups: Quality['groups'] = {};
    for (const [k, v] of Object.entries((j?.grupos ?? {}) as Record<string, any>)) {
      groups[k] = { total: v.total, items: (v.itens ?? []).map((x: any) => ({ id: x.id, slug: x.slug, title: x.title, cover: x.cover ?? undefined, year: x.year ?? undefined, igdbId: x.igdb_id ?? undefined, uses: x.usos })) };
    }
    return { inUse: j?.jogos_em_uso ?? 0, openQueue: j?.fila_aberta ?? 0, groups };
  },
};

/* Demonstração ----------------------------------------------------------------------------- */
type DemoReport = MyReport & { gameId: string; current: unknown; source?: string; reviewedAt?: string };
const KEY = 'wz.fixes.demo.v1';
const load = (): DemoReport[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const save = (l: DemoReport[]) => { try { localStorage.setItem(KEY, JSON.stringify(l.slice(-300))); } catch { /* cheio */ } };
const COL: Partial<Record<FixField, keyof Game>> = { title: 'title', year: 'year', developer: 'developer', publisher: 'publisher', platforms: 'platforms', summary: 'summary', cover: 'cover' };
const valueOf = (g: Game, f: FixField) => (COL[f] ? (g as unknown as Record<string, unknown>)[COL[f]!] ?? null : null);

function demoFix(gameId: string, field: FixField, value: unknown) {
  const g = getState().games[gameId];
  if (!g || field === 'outro') return;
  const at = new Date().toISOString();
  const fx: GameFixes = { ...(g.fixes ?? {}), [field]: { v: value, was: g.fixes?.[field]?.was ?? valueOf(g, field), at } };
  if (field === 'summary') fx.summary_source = { v: 'Revisado pela comunidade', was: g.fixes?.summary_source?.was ?? g.summarySource ?? null, at };
  actions.mergeGames([applyFixes(g, fx)]);
}

const demoApi: FixesApi = {
  async report(gameId, field, value, note, source) {
    const g = getState().games[gameId];
    if (!g) throw new Error('Jogo não encontrado.');
    const l = load();
    const open = l.find((r) => r.gameId === gameId && r.field === field && r.status === 'aberta');
    const base = { proposed: value, note: note || undefined, source: source || undefined, current: valueOf(g, field), createdAt: new Date().toISOString() };
    if (open) Object.assign(open, base);
    else l.push({ id: `demo-${Math.random().toString(36).slice(2, 10)}`, gameId, field, status: 'aberta', ...base });
    save(l);
  },
  async mine(gameId) { return load().filter((r) => r.gameId === gameId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); },
  async queue(status) {
    const games = getState().games;
    const l = load().filter((r) => r.status === status && games[r.gameId]);
    return l.sort((a, b) => (status === 'aberta' ? a.createdAt.localeCompare(b.createdAt) : (b.reviewedAt ?? '').localeCompare(a.reviewedAt ?? ''))).map((r) => {
      const g = games[r.gameId];
      return { ...r, slug: g.slug, title: g.title, cover: g.cover, igdbId: g.igdbId, handle: 'voce', sameOpen: 0, game: g };
    });
  },
  async review(item, accept, value, reply) {
    if (accept && item.field !== 'outro') demoFix(item.gameId, item.field, value ?? item.proposed);
    const l = load();
    const r = l.find((x) => x.id === item.id);
    if (r) { r.status = accept ? 'aceita' : 'recusada'; r.reply = reply || undefined; r.reviewedAt = new Date().toISOString(); if (accept && value != null) r.proposed = value; }
    save(l);
  },
  async fix(gameId, field, value) { demoFix(gameId, field, value); },
  async unfix(gameId, field) {
    const g = getState().games[gameId];
    if (!g?.fixes?.[field]) return;
    const { [field]: gone, ...rest } = g.fixes;
    const back: Record<string, unknown> = { [COL[field]!]: gone.was ?? undefined };
    if (field === 'summary' && rest.summary_source) { back.summarySource = rest.summary_source.was ?? undefined; delete rest.summary_source; }
    actions.mergeGames([{ ...g, ...back, fixes: rest } as Game]);
  },
  async quality() {
    const s = getState();
    const uses = new Map<string, number>();
    for (const id of [...s.copies.map((c) => c.gameId), ...s.journeys.map((j) => j.gameId), ...s.wishes.map((w) => w.gameId)]) uses.set(id, (uses.get(id) ?? 0) + 1);
    const used = [...uses.keys()].map((id) => s.games[id]).filter((g): g is Game => !!g);
    const titles = new Map<string, number>();
    for (const g of used) titles.set(g.title.toLowerCase(), (titles.get(g.title.toLowerCase()) ?? 0) + 1);
    const tests: Record<string, (g: Game) => boolean> = {
      sem_capa: (g) => !g.cover, sem_ano: (g) => g.year == null, sem_sinopse: (g) => !g.summary,
      sinopse_em_ingles: (g) => /ingl/i.test(g.summarySource ?? ''), sem_plataforma: (g) => !g.platforms.length,
      fora_do_igdb: (g) => !g.igdbId, repetidos: (g) => (titles.get(g.title.toLowerCase()) ?? 0) > 1,
      corrigidos: (g) => !!g.fixes && Object.keys(g.fixes).length > 0,
    };
    const groups: Quality['groups'] = {};
    for (const [k, t] of Object.entries(tests)) {
      const hit = used.filter(t).map((g) => ({ id: g.id, slug: g.slug, title: g.title, cover: g.cover, year: g.year, igdbId: g.igdbId, uses: uses.get(g.id) ?? 0 }))
        .sort((a, b) => b.uses - a.uses || a.title.localeCompare(b.title, 'pt-BR'));
      if (hit.length) groups[k] = { total: hit.length, items: hit.slice(0, 60) };
    }
    return { inUse: used.length, openQueue: load().filter((r) => r.status === 'aberta').length, groups };
  },
};

export const fixesApi: FixesApi = new Proxy({} as FixesApi, {
  get: (_t, k: keyof FixesApi) => (getState().mode === 'supabase' ? supabaseApi : demoApi)[k],
});

/** Quem pode revisar: a administração (e qualquer um na demonstração, para conhecer a tela). */
export const canReview = () => { const s = getState(); return !!s.isAdmin || s.mode === 'demo'; };
