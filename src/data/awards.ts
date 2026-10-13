/**
 * WinnerZ Awards (versão simples): edições, categorias, indicados (jogos do IGDB) e um voto
 * por categoria por conta. O resultado só aparece na data de revelação.
 * Com conta, tudo fica no Supabase (as regras de quem vê e quem vota estão no banco, migração 0006).
 * No modo demonstração, uma edição de exemplo fica neste navegador.
 */
import { getState } from './store';
import { getClient } from './supabaseAdapter';
import type { Game } from './types';
import { igdbSize } from '../lib/backdrop';

export type Award = {
  id: string; year: number; title: string; intro?: string; votingOpens?: string; votingCloses?: string;
  /** Quando o resultado chega para a administração (para gravar o vídeo da revelação). Antes disso, ninguém vê. */
  resultsAt?: string;
  /** Quando o resultado aparece para todo mundo no site (depois do vídeo). Vazio = junto com o de cima. */
  publicResultsAt?: string;
  published: boolean;
};
export type AwardGame = { id: string; slug: string; title: string; cover: string; year?: number; developer?: string; backdrop?: string; artworks?: string[]; screenshots?: string[] };
/** art: a imagem escolhida para a votação (arte oficial ou captura, sem logo); focus: o ponto da imagem que fica à vista ("50% 40%"). */
export type Nominee = { id: string; categoryId: string; gameId: string; game: AwardGame; position: number; art?: string; focus?: string };
export type Category = { id: string; awardId: string; name: string; description?: string; position: number; nominees: Nominee[] };
export type AwardFull = {
  award: Award;
  categories: Category[];
  /** categoria → indicado escolhido por você */
  myVotes: Record<string, string>;
  voters: number;
  /** indicado → votos; null enquanto o resultado não foi revelado */
  results: Record<string, number> | null;
};

export type Phase = 'rascunho' | 'antes' | 'aberta' | 'apurando' | 'resultado';
const at = (x?: string) => (x ? Date.parse(x) : NaN);
/** Quando o resultado fica público: a data pública, ou a da administração se não houver. */
export const publicAt = (a: Award) => a.publicResultsAt ?? a.resultsAt;

/** Fase para o público. */
export function phaseOf(a: Award, now = Date.now()): Phase {
  if (!a.published) return 'rascunho';
  if (publicAt(a) && at(publicAt(a)) <= now) return 'resultado';
  if (!a.votingOpens || at(a.votingOpens) > now) return 'antes';
  if ((!a.votingCloses || at(a.votingCloses) > now) && !(a.resultsAt && at(a.resultsAt) <= now)) return 'aberta';
  return 'apurando';
}

/** A administração vê o resultado (na apresentação) só a partir da data marcada; nunca antes. */
export function adminResultsOpen(a: Award, now = Date.now()) {
  return a.published && !!a.resultsAt && at(a.resultsAt) <= now;
}

export interface AwardsApi {
  list(): Promise<Award[]>;
  load(id: string): Promise<AwardFull>;
  vote(categoryId: string, nomineeId: string | null): Promise<void>;
  saveAward(a: Partial<Award> & { year: number; title: string }): Promise<Award>;
  saveCategory(c: { id?: string; awardId: string; name: string; description?: string; position?: number }): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  addNominee(categoryId: string, game: Game, position: number): Promise<void>;
  deleteNominee(id: string): Promise<void>;
  /** Arte e enquadramento do indicado na votação (null volta para a escolha automática). */
  setNomineeArt(id: string, art: string | null, focus: string | null): Promise<void>;
}

const gameOf = (g: Pick<Game, 'id' | 'slug' | 'title' | 'cover' | 'year'> & Partial<Pick<Game, 'developer' | 'backdrop' | 'artworks' | 'screenshots'>>): AwardGame => ({
  id: g.id, slug: g.slug, title: g.title, cover: g.cover, year: g.year, developer: g.developer || undefined, backdrop: g.backdrop || undefined, artworks: g.artworks ?? undefined, screenshots: g.screenshots ?? undefined,
});

/** Imagens que podem aparecer na votação: artes oficiais primeiro (costumam vir sem logo), depois o fundo e as capturas. */
export function artChoices(g: AwardGame): string[] {
  return [...new Set([...(g.artworks ?? []), g.backdrop, ...(g.screenshots ?? [])].filter((x): x is string => !!x).map((u) => igdbSize(u, 't_1080p')))];
}
/** A arte do indicado: a escolhida na montagem, ou a primeira arte oficial; sem nenhuma, a capa. */
export function nomineeArt(n: Nominee): string {
  return n.art || artChoices(n.game)[0] || (n.game.cover ? igdbSize(n.game.cover, 't_1080p') : '');
}

/* ---- Supabase --------------------------------------------------------------------------- */

const awardFromRow = (r: any): Award => ({
  id: r.id, year: r.year, title: r.title, intro: r.intro ?? undefined, published: !!r.published,
  votingOpens: r.voting_opens ?? undefined, votingCloses: r.voting_closes ?? undefined, resultsAt: r.results_at ?? undefined, publicResultsAt: r.public_results_at ?? undefined,
});
const ok = <T>(r: { data: T; error: { message: string } | null }): T => { if (r.error) throw new Error(r.error.message); return r.data; };

const supabaseApi: AwardsApi = {
  async list() {
    const sb = await getClient();
    return (ok(await sb.from('awards').select('*').order('year', { ascending: false })) as any[]).map(awardFromRow);
  },
  async load(id) {
    const sb = await getClient();
    const award = awardFromRow(ok(await sb.from('awards').select('*').eq('id', id).single()));
    const cats = ok(await sb.from('award_categories').select('*').eq('award_id', id).order('position')) as any[];
    const ids = cats.map((c) => c.id);
    const noms = ids.length ? (ok(await sb.from('award_nominees').select('*, games(id,slug,title,cover,year,developer,backdrop,artworks,screenshots)').in('category_id', ids).order('position')) as any[]) : [];
    const me = getState().profile;
    const votes = me && ids.length ? (ok(await sb.from('award_votes').select('category_id,nominee_id').in('category_id', ids)) as any[]) : [];
    const voters = Number((await sb.rpc('award_voters', { p_award: id })).data ?? 0);
    const revealed = phaseOf(award) === 'resultado' || (getState().isAdmin && adminResultsOpen(award));
    let results: Record<string, number> | null = null;
    if (revealed && award.published) {
      const rows = ok(await sb.rpc('award_results', { p_award: id })) as any[];
      results = Object.fromEntries((rows ?? []).map((r) => [r.nominee_id, r.votes]));
    }
    return {
      award, voters, results,
      myVotes: Object.fromEntries(votes.map((v) => [v.category_id, v.nominee_id])),
      categories: cats.map((c) => ({
        id: c.id, awardId: c.award_id, name: c.name, description: c.description ?? undefined, position: c.position,
        nominees: noms.filter((n) => n.category_id === c.id && n.games).map((n) => ({ id: n.id, categoryId: n.category_id, gameId: n.game_id, position: n.position, art: n.art ?? undefined, focus: n.focus ?? undefined, game: gameOf({ ...n.games, cover: n.games.cover ?? '', year: n.games.year ?? undefined }) })),
      })),
    };
  },
  async vote(categoryId, nomineeId) {
    const sb = await getClient();
    if (!nomineeId) { ok(await sb.from('award_votes').delete().eq('category_id', categoryId)); return; }
    ok(await sb.from('award_votes').upsert({ user_id: getState().profile?.id, category_id: categoryId, nominee_id: nomineeId }, { onConflict: 'user_id,category_id' }));
  },
  async saveAward(a) {
    const sb = await getClient();
    const row = { year: a.year, title: a.title, intro: a.intro ?? null, voting_opens: a.votingOpens ?? null, voting_closes: a.votingCloses ?? null, results_at: a.resultsAt ?? null, public_results_at: a.publicResultsAt ?? null, published: !!a.published };
    const r = a.id ? await sb.from('awards').update(row).eq('id', a.id).select().single() : await sb.from('awards').insert(row).select().single();
    return awardFromRow(ok(r));
  },
  async saveCategory(c) {
    const sb = await getClient();
    const row = { award_id: c.awardId, name: c.name, description: c.description ?? null, ...(c.position != null ? { position: c.position } : {}) };
    ok(c.id ? await sb.from('award_categories').update(row).eq('id', c.id) : await sb.from('award_categories').insert(row));
  },
  async deleteCategory(id) { const sb = await getClient(); ok(await sb.from('award_categories').delete().eq('id', id)); },
  async addNominee(categoryId, game, position) {
    const sb = await getClient();
    ok(await sb.from('award_nominees').upsert({ category_id: categoryId, game_id: game.id, position }, { onConflict: 'category_id,game_id', ignoreDuplicates: true }));
  },
  async deleteNominee(id) { const sb = await getClient(); ok(await sb.from('award_nominees').delete().eq('id', id)); },
  async setNomineeArt(id, art, focus) {
    const sb = await getClient();
    const r = await sb.from('award_nominees').update({ art, focus }).eq('id', id);
    if (r.error && /column|art|focus/i.test(r.error.message)) throw new Error('Para guardar a arte dos indicados, rode a migração 0010 no Supabase (SQL Editor).');
    ok(r);
  },
};

/* ---- Demonstração (neste navegador) ------------------------------------------------------ */

type DemoDb = { awards: Award[]; categories: Omit<Category, 'nominees'>[]; nominees: Omit<Nominee, 'game'>[]; votes: Record<string, string>; others: Record<string, number> };
const KEY = 'wz.awards.demo.v1';
const DEMO_CATS = ['Jogo do Ano', 'Melhor Narrativa', 'Melhor Direção de Arte', 'Melhor Trilha Sonora', 'Melhor Jogo de Ação e Aventura', 'Melhor RPG', 'Melhor Jogo Independente', 'Jogo Mais Aguardado'];
const rid = () => Math.random().toString(36).slice(2, 10);

function demoDb(): DemoDb {
  try { const x = localStorage.getItem(KEY); if (x) return JSON.parse(x); } catch { /* recomeça */ }
  const now = Date.now(), day = 86400000;
  const a: Award = { id: 'demo-2026', year: 2026, title: 'WinnerZ Awards 2026', intro: 'Edição de demonstração: a votação está aberta e o resultado aparece na data marcada.', published: true,
    votingOpens: new Date(now - day).toISOString(), votingCloses: new Date(now + 14 * day).toISOString(), resultsAt: new Date(now + 15 * day).toISOString() };
  const games = Object.values(getState().games).filter((g) => g.cover).slice(0, 8);
  const categories = DEMO_CATS.map((name, i) => ({ id: `c${i}`, awardId: a.id, name, position: i + 1 }));
  const nominees = categories.flatMap((c, i) => games.slice(i % 3, (i % 3) + 5).map((g, k) => ({ id: `n${i}-${k}`, categoryId: c.id, gameId: g.id, position: k })));
  const others = Object.fromEntries(nominees.map((n, k) => [n.id, (k * 7) % 13]));
  const db: DemoDb = { awards: [a], categories, nominees, votes: {}, others };
  saveDemo(db);
  return db;
}
function saveDemo(db: DemoDb) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* só nesta visita */ } }

const demoApi: AwardsApi = {
  async list() { return [...demoDb().awards].sort((a, b) => b.year - a.year); },
  async load(id) {
    const db = demoDb(), games = getState().games;
    const award = db.awards.find((a) => a.id === id)!;
    const categories = db.categories.filter((c) => c.awardId === id).sort((a, b) => a.position - b.position).map((c) => ({
      ...c, nominees: db.nominees.filter((n) => n.categoryId === c.id && games[n.gameId]).sort((a, b) => a.position - b.position).map((n) => ({ ...n, game: gameOf(games[n.gameId]) })),
    }));
    const revealed = phaseOf(award) === 'resultado' || adminResultsOpen(award);
    const results = revealed ? Object.fromEntries(db.nominees.map((n) => [n.id, (db.others[n.id] ?? 0) + (Object.values(db.votes).includes(n.id) ? 1 : 0)])) : null;
    return { award, categories, myVotes: Object.fromEntries(Object.entries(db.votes).filter(([c]) => categories.some((x) => x.id === c))), voters: 42 + (Object.keys(db.votes).length ? 1 : 0), results };
  },
  async vote(categoryId, nomineeId) {
    const db = demoDb();
    if (phaseOf(db.awards.find((a) => db.categories.find((c) => c.id === categoryId)?.awardId === a.id)!) !== 'aberta') throw new Error('A votação não está aberta.');
    if (nomineeId) db.votes[categoryId] = nomineeId; else delete db.votes[categoryId];
    saveDemo(db);
  },
  async saveAward(a) {
    const db = demoDb();
    const full: Award = { ...a, id: a.id ?? `demo-${rid()}`, published: !!a.published };
    db.awards = [...db.awards.filter((x) => x.id !== full.id), full];
    saveDemo(db);
    return full;
  },
  async saveCategory(c) {
    const db = demoDb();
    if (c.id) db.categories = db.categories.map((x) => (x.id === c.id ? { ...x, ...c, id: x.id } : x));
    else db.categories.push({ id: rid(), awardId: c.awardId, name: c.name, description: c.description, position: c.position ?? db.categories.length + 1 });
    saveDemo(db);
  },
  async deleteCategory(id) { const db = demoDb(); db.categories = db.categories.filter((c) => c.id !== id); db.nominees = db.nominees.filter((n) => n.categoryId !== id); delete db.votes[id]; saveDemo(db); },
  async addNominee(categoryId, game, position) {
    const db = demoDb();
    if (!db.nominees.some((n) => n.categoryId === categoryId && n.gameId === game.id)) db.nominees.push({ id: rid(), categoryId, gameId: game.id, position });
    saveDemo(db);
  },
  async deleteNominee(id) { const db = demoDb(); db.nominees = db.nominees.filter((n) => n.id !== id); for (const [c, n] of Object.entries(db.votes)) if (n === id) delete db.votes[c]; saveDemo(db); },
  async setNomineeArt(id, art, focus) { const db = demoDb(); db.nominees = db.nominees.map((n) => (n.id === id ? { ...n, art: art ?? undefined, focus: focus ?? undefined } : n)); saveDemo(db); },
};

/** Quem monta as edições: administração (no banco) ou qualquer um no modo demonstração. */
export function canAdmin() { const s = getState(); return s.isAdmin || s.mode === 'demo'; }

export function awardsApi(): AwardsApi { return getState().mode === 'supabase' ? supabaseApi : demoApi; }
