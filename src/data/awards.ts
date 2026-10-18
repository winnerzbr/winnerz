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
  /** E7.4: indicação aberta (quem tem conta sugere até 3 jogos por categoria), antes da votação. Vazio = sem essa fase. */
  nominationsOpens?: string; nominationsCloses?: string;
  /** E7.4: a figurinha do álbum que quem votou pega quando o resultado fica público. */
  stickerId?: string;
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

export type Phase = 'rascunho' | 'indicacoes' | 'antes' | 'aberta' | 'apurando' | 'resultado';
const at = (x?: string) => (x ? Date.parse(x) : NaN);
/** Quando o resultado fica público: a data pública, ou a da administração se não houver. */
export const publicAt = (a: Award) => a.publicResultsAt ?? a.resultsAt;

/** Fase para o público. */
export function phaseOf(a: Award, now = Date.now()): Phase {
  if (!a.published) return 'rascunho';
  if (publicAt(a) && at(publicAt(a)) <= now) return 'resultado';
  if (nominationsOpen(a, now)) return 'indicacoes';
  if (!a.votingOpens || at(a.votingOpens) > now) return 'antes';
  if ((!a.votingCloses || at(a.votingCloses) > now) && !(a.resultsAt && at(a.resultsAt) <= now)) return 'aberta';
  return 'apurando';
}

/** A indicação aberta está valendo agora (e a votação ainda não abriu). */
export function nominationsOpen(a: Award, now = Date.now()) {
  if (!a.published || !a.nominationsOpens || at(a.nominationsOpens) > now) return false;
  if (a.nominationsCloses && at(a.nominationsCloses) <= now) return false;
  return !a.votingOpens || at(a.votingOpens) > now;
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
  nominationsOpens: r.nominations_opens ?? undefined, nominationsCloses: r.nominations_closes ?? undefined, stickerId: r.sticker_id ?? undefined,
});
const ok = <T>(r: { data: T; error: { message: string } | null }): T => { if (r.error) throw new Error(r.error.message); return r.data; };

/** Por que a conta ainda não pode votar (função award_vote_block, migração 0074). */
const VOTE_BLOCK: Record<string, string> = {
  login: 'Entre na sua conta para votar.',
  email: 'Confirme o seu e-mail para votar. Procure a mensagem do WinnerZ na sua caixa de entrada.',
  arroba: 'Escolha o seu @ no perfil para votar.',
  suspensa: 'Sua conta está suspensa no momento e não pode votar.',
};

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
    const r = await sb.from('award_votes').upsert({ user_id: getState().profile?.id, category_id: categoryId, nominee_id: nomineeId }, { onConflict: 'user_id,category_id' });
    if (r.error) {
      // Migração 0074: o banco diz por que a conta ainda não pode votar.
      const why = (await sb.rpc('award_vote_block')).data as string | null;
      if (why && VOTE_BLOCK[why]) throw new Error(VOTE_BLOCK[why]);
    }
    ok(r);
  },
  async saveAward(a) {
    const sb = await getClient();
    const row: Record<string, unknown> = { year: a.year, title: a.title, intro: a.intro ?? null, voting_opens: a.votingOpens ?? null, voting_closes: a.votingCloses ?? null, results_at: a.resultsAt ?? null, public_results_at: a.publicResultsAt ?? null, published: !!a.published };
    // E7.4 (migração 0070): só manda as colunas novas quando há algo nelas, para a edição simples seguir funcionando sem a 0070.
    const extra = { nominations_opens: a.nominationsOpens ?? null, nominations_closes: a.nominationsCloses ?? null, sticker_id: a.stickerId ?? null };
    const write = (x: Record<string, unknown>) => (a.id ? sb.from('awards').update(x).eq('id', a.id).select().single() : sb.from('awards').insert(x).select().single());
    let r = await write({ ...row, ...extra });
    if (r.error && /nominations_|sticker_id|schema cache/i.test(r.error.message)) {
      if (a.nominationsOpens || a.nominationsCloses || a.stickerId) throw new Error('Falta rodar a migração 0070 no Supabase para a indicação aberta e a figurinha da edição.');
      r = await write(row); // sem a 0070: a edição simples continua funcionando
    }
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
    const r = await sb.from('award_nominees').update({ art, focus }).eq('id', id).select('id');
    if (r.error && /column|schema cache|art|focus/i.test(r.error.message)) throw new Error('O banco ainda não tem onde guardar a arte. Rode a migração 0010 no Supabase (SQL Editor → colar → Run) e tente de novo.');
    const rows = ok(r) as unknown[] | null;
    if (!rows || rows.length === 0) throw new Error('O banco não deixou gravar a arte deste indicado. Confira se você entrou com a conta de administração.');
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

/* ---- E7.4 · Awards completo (migração 0070) ------------------------------------------------------- */
export type Suggestion = { categoryId: string; game: AwardGame };
export type SuggestionCount = { categoryId: string; game: AwardGame; n: number };
export type Winner = { categoryId: string; category: string; game: AwardGame; votes: number };
export type AwardSticker = { sticker: import('./albumApi').Sticker; claimed: boolean; voted: boolean; open: boolean } | null;
export type RevealStep = 'categoria' | 'indicados' | 'vencedor' | 'fim';

const MSG70: Record<string, string> = {
  award_nominations_closed: 'A indicação aberta não está valendo agora.',
  award_suggest_limit: 'Você já indicou 3 jogos nesta categoria. Tire um para indicar outro.',
  award_blocked: 'Sua conta está suspensa no momento.',
  award_not_yet: 'A figurinha da edição chega quando o resultado ficar público.',
  award_no_vote: 'A figurinha da edição é de quem votou nesta edição.',
  award_claimed: 'Você já pegou a figurinha desta edição.',
  not_admin: 'Só a administração pode fazer isso.',
  not_found: 'Não achei isso.',
};
async function rpc70<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const r = await (await getClient()).rpc(fn, args);
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(MSG70).find((x) => m.includes(x));
    if (k) throw new Error(MSG70[k]);
    if (/not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0070 no Supabase.');
    throw new Error(m);
  }
  return r.data as T;
}
const DK70 = 'wz.awards.demo.e74';
type D70 = { sug: Record<string, string[]>; claimed: Record<string, boolean>; reveal?: { awardId: string; categoryId: string | null; step: RevealStep } };
const d70 = (): D70 => { try { return JSON.parse(localStorage.getItem(DK70) || 'null') ?? { sug: {}, claimed: {} }; } catch { return { sug: {}, claimed: {} }; } };
const s70 = (d: D70) => { try { localStorage.setItem(DK70, JSON.stringify(d)); } catch { /* só nesta visita */ } };
const demo = () => getState().mode !== 'supabase';
const gm = (id: string): AwardGame | null => { const g = getState().games[id]; return g ? gameOf(g) : null; };

export const awardsPlus = {
  async mySuggestions(awardId: string, catIds: string[]): Promise<Suggestion[]> {
    if (demo()) { const d = d70(); return catIds.flatMap((c) => (d.sug[c] ?? []).map((g) => ({ categoryId: c, game: gm(g)! })).filter((x) => x.game)); }
    try { return await rpc70<Suggestion[]>('award_my_suggestions', { p_award: awardId }); } catch { return []; }
  },
  async suggest(awardId: string, catIds: string[], categoryId: string, game: Game, on: boolean): Promise<Suggestion[]> {
    if (demo()) {
      const d = d70(); const cur = d.sug[categoryId] ?? [];
      if (on && !cur.includes(game.id) && cur.length >= 3) throw new Error(MSG70.award_suggest_limit);
      d.sug[categoryId] = on ? [...new Set([...cur, game.id])] : cur.filter((x) => x !== game.id); s70(d);
      return awardsPlus.mySuggestions(awardId, catIds);
    }
    return rpc70<Suggestion[]>('award_suggest', { p_category: categoryId, p_game: game.id, p_on: on });
  },
  async counts(awardId: string, catIds: string[]): Promise<SuggestionCount[]> {
    if (demo()) { const d = d70(); return catIds.flatMap((c) => (d.sug[c] ?? []).map((g, i) => ({ categoryId: c, game: gm(g)!, n: 3 - i }))).filter((x) => x.game); }
    return rpc70<SuggestionCount[]>('award_suggestion_counts', { p_award: awardId });
  },
  async winners(awardId: string): Promise<Winner[]> {
    if (demo()) {
      const f = await awardsApi().load(awardId);
      if (!f.results || phaseOf(f.award) !== 'resultado') return [];
      return f.categories.filter((c) => c.nominees.length).map((c) => { const w = [...c.nominees].sort((a, b) => (f.results![b.id] ?? 0) - (f.results![a.id] ?? 0) || a.position - b.position)[0]; return { categoryId: c.id, category: c.name, game: w.game, votes: f.results![w.id] ?? 0 }; });
    }
    try { return await rpc70<Winner[]>('award_winners', { p_award: awardId }); } catch { return []; }
  },
  async sticker(awardId: string): Promise<AwardSticker> {
    if (demo()) return null;
    try { return await rpc70<AwardSticker>('award_sticker_state', { p_award: awardId }); } catch { return null; }
  },
  async claimSticker(awardId: string): Promise<AwardSticker> {
    const r = await rpc70<AwardSticker>('award_sticker_claim', { p_award: awardId });
    const { reloadAlbum } = await import('./albumApi'); void reloadAlbum().catch(() => {});
    return r;
  },
  /** A apresentação da revelação diz onde está (o overlay do canal mostra). Falha em silêncio: a apresentação segue. */
  async reveal(awardId: string, categoryId: string | null, step: RevealStep) {
    if (demo()) { const d = d70(); d.reveal = { awardId, categoryId, step }; s70(d); return; }
    try { await rpc70('award_reveal_set', { p_award: awardId, p_category: categoryId, p_step: step }); } catch { /* sem a 0070, só não aparece no overlay */ }
  },
  demoReveal: () => (demo() ? d70().reveal ?? null : null),
};
