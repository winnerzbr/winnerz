/**
 * Álbum de figurinhas (etapa A1, migração 0053). Catálogo da Temporada, coleção da pessoa, pacotes (abrir, colar,
 * pedir revisão) e as ferramentas do Studio (catálogo, dar pacote, retidos e revisões). Com conta, tudo passa pelas
 * funções do banco; na demonstração, fica neste navegador com um álbum de exemplo.
 */
import { useSyncExternalStore } from 'react';
import { getState } from './store';
import type { GameMini, PersonRef } from './communityApi';
import { demoGames } from './demo';
import { SUPABASE_URL } from '../lib/env';
import { shrink } from '../lib/image';
import { drawPack, judgeFinish, vaultCheck, type Drawn, type HoldRule, type PackSignals, type Tier, type VaultGive } from '../lib/album';

export type PackKind = 'onix' | 'prisma';
export type PackOrigin = 'jornada' | 'memoria' | 'studio' | 'boas_vindas' | 'codigo' | 'twitch';
export type PackState = 'retido' | 'fechado' | 'aberto' | 'desfeito' | 'negado';
export interface AlbumPage { id: string; position: number; kicker: string; title: string; body: string; banner: string | null; legendary: boolean }
export interface AlbumBook { id: string; slug: string; season: number; title: string; subtitle: string; cover: string | null; position: number; published: boolean; pages: AlbumPage[] }
export interface Sticker { id: string; season: number; number: number; name: string; tier: Tier; art: string | null; credit: string; pageId: string | null; slot: number; active: boolean }
export interface AlbumItem { id: string; qty: number; pasted: boolean }
export interface PackReview { state: 'aberta' | 'respondida'; message: string; answer: string | null; createdAt: string }
export interface Pack {
  id: string; kind: PackKind; origin: PackOrigin; state: PackState; rule: HoldRule | null; reason: string | null; historyId: string | null;
  game: GameMini | null; contents: Drawn[] | null; createdAt: string; openedAt: string | null; note: string | null; review: PackReview | null;
}
export interface AlbumState { books: AlbumBook[]; stickers: Sticker[]; items: AlbumItem[]; packs: Pack[]; stats: { opened: number; noRare: number }; tradesIn?: number }
export type TradeState = 'aberta' | 'aceita' | 'recusada' | 'cancelada' | 'expirada' | 'falhou';
/** Uma troca. give e take são do ponto de vista de quem propôs (from): give vai de from para to; take, de to para from. */
export interface Trade { id: string; from: PersonRef | null; to: PersonRef | null; give: string[]; take: string[]; message: string | null; state: TradeState; createdAt: string; decidedAt: string | null; expiresAt: string; mine: boolean }
export interface TradeBoard { open: boolean; newUntil: string | null; received: Trade[]; sent: Trade[]; history: Trade[] }
/** Troca sugerida: give são repetidas minhas que faltam à pessoa; take, repetidas dela que faltam a mim. */
export interface TradeMatch { person: PersonRef; friend: boolean; follow: boolean; give: string[]; take: string[]; pending: boolean }
export type TradeWhy = 'trade_self' | 'trade_closed' | 'trade_new_other';
export interface TradePeer { person: PersonRef; why: TradeWhy | null; take: string[]; theyMiss: string[]; pending: boolean }
export interface StudioPack extends Pack { person: PersonRef | null; grantedBy: PersonRef | null; decidedBy: PersonRef | null; decidedAt: string | null; signals: PackSignals }
export interface Catalog { books: AlbumBook[]; stickers: Sticker[]; owned: Record<string, number> }
export type StudioView = 'retidos' | 'revisoes' | 'historico';

/** Endereço de uma arte: caminho no bucket público 'album', ou a própria imagem (demonstração e endereços externos). */
export function artSrc(v?: string | null): string | null {
  if (!v) return null;
  if (/^(data:|https?:|blob:|\/)/.test(v)) return v;
  return `${SUPABASE_URL}/storage/v1/object/public/album/${v}`;
}

const MSG: Record<string, string> = {
  catalog_empty: 'O álbum ainda não tem figurinhas publicadas. Volte quando a Temporada abrir.',
  pack_not_open: 'Este pacote não pode ser aberto agora.',
  not_held: 'Este pacote não está retido.',
  review_short: 'Conte em poucas palavras o que aconteceu.',
  review_done: 'Este pacote já foi revisado.',
  target_not_found: 'Não achei esse @.',
  pack_qty: 'Escolha de 1 a 20 pacotes.',
  pack_kind: 'Escolha o tipo do pacote.',
  pack_reason: 'Escreva o motivo (pelo menos 3 letras).',
  pack_already_opened: 'Esse pacote já foi aberto e não dá mais para desfazer.',
  album_in_use: 'Esse álbum já tem figurinhas com pessoas. Deixe sem publicar em vez de apagar.',
  sticker_number_taken: 'Já existe uma figurinha com esse número nesta Temporada.',
  not_admin: 'Só a administração pode fazer isso.',
  not_found: 'Não achei esse pacote.',
  not_logged: 'Entre na sua conta para ver o seu álbum.',
  vault_target: 'Essa figurinha não está disponível no Cofre.',
  vault_tier: 'O Cofre troca só por figurinhas Comuns e Incomuns.',
  vault_owned: 'Você já tem essa figurinha.',
  vault_give: 'Escolha as repetidas que entram no Cofre.',
  vault_not_spare: 'Uma das escolhidas não é mais repetida. Confira e tente de novo.',
  vault_count: 'A quantidade de repetidas não bate com o que o Cofre pede.',
  trade_new_account: 'Contas novas podem trocar figurinhas depois de 7 dias.',
  trade_new_other: 'Essa conta é nova e ainda não pode trocar (libera 7 dias depois de criada).',
  trade_self: 'Essa é a sua conta.',
  trade_closed: 'Essa pessoa não está aceitando propostas de troca agora.',
  trade_size: 'Escolha de 1 a 5 figurinhas de cada lado, sem repetir.',
  trade_limit: 'Você já tem 5 propostas em aberto. Espere uma resposta ou cancele alguma.',
  trade_pair_open: 'Já existe uma proposta em aberto entre vocês duas contas.',
  trade_lendaria: 'Lendárias não entram em trocas.',
  trade_not_spare: 'Uma das suas escolhidas não é mais repetida.',
  trade_their_spare: 'Uma das figurinhas pedidas não é mais repetida para essa pessoa.',
  trade_not_open: 'Essa proposta não está mais em aberto.',
  code_unknown: 'Esse código não existe. Confira as letras e os números.',
  code_expired: 'Esse código já venceu.',
  code_used: 'Você já usou esse código.',
  code_full: 'Esse código já foi usado por todo mundo que podia.',
  code_tries: 'Muitas tentativas erradas. Espere uma hora e tente de novo.',
  code_new_account: 'Contas novas resgatam até 3 códigos na primeira semana.',
  code_blocked: 'Sua conta está suspensa no momento.',
  code_sticker: 'Essa figurinha não está disponível.',
  code_format: 'O código precisa de 4 a 24 letras ou números.',
  code_taken: 'Já existe um código igual.',
  code_dates: 'O fim precisa ser depois do começo.',
};
const MIGRATION = 'Falta rodar a migração 0053 no Supabase.';
const ok = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(MSG).find((x) => m.includes(x));
    if (k) throw new Error(MSG[k]);
    if (/album_welcome_pack/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0057 no Supabase.');
    if (/album_drop|studio_drop/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0067 no Supabase.');
    if (/album_redeem|studio_code/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0066 no Supabase.');
    if (/album_trade|studio_album_trades/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0056 no Supabase.');
    if (/album_vault/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0055 no Supabase.');
    if (/album_|studio_pack|studio_album|schema cache/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error(MIGRATION);
    if (/violates check constraint/i.test(m)) throw new Error('Algum campo está fora do formato. Confira nome, número e textos.');
    throw new Error(m);
  }
  return r.data;
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';
const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => ok(await (await client()).rpc(fn, args)) as T;

/* ---- Demonstração ------------------------------------------------------------------------------ */
const DK = 'wz.demo.album';
const ago = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();
const rid = () => Math.random().toString(36).slice(2, 10);
const gm = (id: string): GameMini | null => { const g = demoGames.find((x) => x.id === id); return g ? { id: g.id, slug: g.slug, title: g.title, cover: g.cover, backdrop: g.backdrop ?? null } : null; };
const A = (f: string) => `/demo/album/${f}.webp`;
type DPack = Pack & { userHandle: string; grantedBy?: string | null; decidedAt?: string | null; signals: PackSignals };
interface DPeer { handle: string; friend: boolean; follow: boolean; items: Record<string, number> }
type DTrade = Omit<Trade, 'from' | 'to' | 'mine'> & { fromH: string; toH: string };
interface DState { books: AlbumBook[]; stickers: Sticker[]; items: AlbumItem[]; packs: DPack[]; stats: { opened: number; noRare: number }; counted: string[]; peers?: DPeer[]; trades?: DTrade[]; tradeOpen?: boolean; codes?: LiveCode[]; codeUses?: string[] }

function seed(): DState {
  const b = 'demo-b1';
  const pg = (i: number, kicker: string, title: string, body: string, banner: string, legendary = false): AlbumPage => ({ id: `demo-p${i}`, position: i, kicker, title, body, banner: A(banner), legendary });
  const pages = [
    { ...pg(0, 'Capítulo 01', 'Vila inicial', 'Toda jornada sai de algum lugar. Esta sai daqui, com o mapa ainda em branco.', 'x'), banner: '/figurinhas/t1/casa-da-lareira.webp' },
    pg(1, 'Capítulo 01', 'Portais da floresta', 'Passagens que só aparecem para quem continua andando.', 'copa'),
    pg(2, 'Capítulo 02', 'Ruínas e descobertas', 'O que ficou de pé depois de tudo.', 'ruinas'),
    pg(3, 'Capítulo 03', 'Reinos esquecidos', 'Cada mundo é um convite.', 'reinos'),
    pg(4, 'Capítulo 04', 'Além das nuvens', 'Lá em cima, o caminho continua.', 'castelo'),
    pg(5, 'Página lendária', 'Confluência', 'A figurinha do WinnerZ Awards. Uma por Temporada.', 'confluencia', true),
  ];
  const st = (n: number, page: number, slot: number, name: string, tier: Tier, art: string): Sticker =>
    ({ id: `demo-s${n}`, season: 1, number: n, name, tier, art: A(art), credit: 'Arte: WinnerZ', pageId: `demo-p${page}`, slot, active: true });
  const stickers = [
    st(1, 1, 1, 'Além do portal', 'rara', 'portal'), st(2, 1, 2, 'Cidades nas árvores', 'incomum', 'arvores'), st(3, 1, 3, 'Copa antiga', 'comum', 'copa'),
    st(4, 2, 1, 'Ruínas do oeste', 'comum', 'ruinas'), st(5, 2, 2, 'Guardião branco', 'incomum', 'guardioes'), st(6, 2, 3, 'Cascata escondida', 'comum', 'cascata'),
    st(7, 3, 1, 'Reinos esquecidos', 'rara', 'reinos'), st(8, 3, 2, 'Rio de jade', 'incomum', 'rio'), st(9, 3, 3, 'Flores do vale', 'comum', 'flores'),
    st(10, 4, 1, 'Castelo das nuvens', 'rara', 'castelo'), st(11, 4, 2, 'Ilha flutuante', 'lendaria', 'nuvens'), st(12, 4, 3, 'Arco de luz', 'incomum', 'arco'),
    st(13, 5, 1, 'Confluência', 'lendaria', 'confluencia'),
    ...([['casa-da-lareira', 'Casa da lareira', 'comum'], ['moinho-do-vale', 'Moinho do vale', 'comum'], ['poco-dos-desejos', 'Poço dos desejos', 'comum'], ['ponte-de-pedra', 'Ponte de pedra', 'comum'], ['placa-da-encruzilhada', 'Placa da encruzilhada', 'comum'], ['mapa-em-branco', 'Mapa em branco', 'incomum']] as const)
      .map(([f, name, tier], i): Sticker => ({ id: `demo-v${i + 1}`, season: 1, number: i + 1, name, tier, art: `/figurinhas/t1/${f}.webp`, credit: 'Arte: WinnerZ', pageId: 'demo-p0', slot: i + 1, active: true })),
  ];
  const items: AlbumItem[] = [
    { id: 'demo-s1', qty: 1, pasted: true }, { id: 'demo-s2', qty: 2, pasted: true }, { id: 'demo-s4', qty: 1, pasted: true },
    { id: 'demo-s5', qty: 1, pasted: true }, { id: 'demo-s7', qty: 1, pasted: true }, { id: 'demo-s9', qty: 3, pasted: true },
    { id: 'demo-s11', qty: 1, pasted: true }, { id: 'demo-s3', qty: 1, pasted: true },
    ...[1, 2, 3, 4, 5, 6].map((i) => ({ id: `demo-v${i}`, qty: 1, pasted: true })),
  ];
  const base = { reason: null, historyId: null, contents: null, openedAt: null, note: null, review: null, userHandle: 'voce', signals: {} };
  const packs: DPack[] = [
    { ...base, id: 'demo-k1', kind: 'onix', origin: 'jornada', state: 'fechado', rule: null, game: gm('astro'), createdAt: ago(1) },
    { ...base, id: 'demo-k2', kind: 'prisma', origin: 'studio', state: 'fechado', rule: null, game: null, reason: 'Boas-vindas à Temporada 1', grantedBy: 'winnerz', createdAt: ago(2) },
    { ...base, id: 'demo-k3', kind: 'onix', origin: 'jornada', state: 'retido', rule: 'tempo', game: gm('elden'), createdAt: ago(4),
      signals: { elapsedH: 6.5, needH: 30, ttbH: 60, bridgeMin: 0, accountDays: 120, weekPacks: 0 } },
    { ...base, id: 'demo-k4', kind: 'onix', origin: 'memoria', state: 'aberto', rule: null, game: null, createdAt: ago(20), openedAt: ago(20),
      contents: [{ id: 'demo-s9', tier: 'comum', dup: false }, { id: 'demo-s2', tier: 'incomum', dup: false }, { id: 'demo-s9', tier: 'comum', dup: true }, { id: 'demo-s4', tier: 'comum', dup: false }, { id: 'demo-s1', tier: 'rara', dup: false }] },
  ];
  return { books: [{ id: b, slug: 'mundos', season: 1, title: 'Mundos para explorar', subtitle: 'Temporada 1', cover: A('castelo'), position: 1, published: true, pages: pages.map((p) => p) }].map((bk) => ({ ...bk, pages })),
    stickers, items, packs, stats: { opened: 1, noRare: 0 }, counted: ['astro', 'elden'] };
}
function dLoad(): DState {
  try { const v = JSON.parse(localStorage.getItem(DK) || 'null'); if (v && Array.isArray(v.books)) return v; } catch { /* começa de novo */ }
  return seed();
}
function dSave(d: DState) { try { localStorage.setItem(DK, JSON.stringify(d)); } catch { /* sem armazenamento */ } }
const dView = (d: DState): AlbumState => ({ books: d.books.filter((b) => b.published || canStudio()), stickers: d.stickers, items: d.items.filter((i) => i.qty > 0),
  packs: d.packs.filter((p) => p.userHandle === 'voce' && p.state !== 'desfeito').sort((a, b) => b.createdAt.localeCompare(a.createdAt)), stats: d.stats,
  tradesIn: dTrades(d).filter((t) => t.toH === 'voce' && t.state === 'aberta').length });
const dStudioPack = (p: DPack): StudioPack => ({ ...p, person: { id: `demo-${p.userHandle}`, handle: p.userHandle }, grantedBy: p.grantedBy ? { id: 'demo-adm', handle: p.grantedBy } : null,
  decidedBy: p.decidedAt ? { id: 'demo-adm', handle: 'winnerz' } : null, decidedAt: p.decidedAt ?? null });
const dCatalog = (d: DState): Catalog => ({ books: d.books, stickers: d.stickers, owned: Object.fromEntries(d.items.filter((i) => i.qty > 0).map((i) => [i.id, 1])) });
const canStudio = () => { const s = getState(); return !!s.isAdmin || s.mode === 'demo'; };

/* ---- Estado compartilhado (página, menu e Studio leem o mesmo) ---------------------------------- */
let cache: AlbumState | null = null;
let cacheErr = '';
let loading: Promise<AlbumState> | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
function set(s: AlbumState) { cache = s; cacheErr = ''; emit(); }

async function fetchState(): Promise<AlbumState> {
  if (!supa()) return dView(dLoad());
  const r = await rpc<AlbumState>('album_state');
  return { books: r.books ?? [], stickers: r.stickers ?? [], items: r.items ?? [], packs: r.packs ?? [], stats: r.stats ?? { opened: 0, noRare: 0 }, tradesIn: r.tradesIn ?? 0 };
}
export function reloadAlbum(): Promise<AlbumState> {
  loading = fetchState().then((s) => { set(s); return s; }).catch((e) => { cacheErr = e instanceof Error ? e.message : 'Não consegui abrir o álbum agora.'; emit(); throw e; }).finally(() => { loading = null; });
  return loading;
}
/** O estado do álbum da pessoa, carregado uma vez e atualizado a cada ação. */
export function useAlbum(): { state: AlbumState | null; error: string } {
  const s = useSyncExternalStore((f) => { subs.add(f); if (!cache && !loading) void reloadAlbum().catch(() => {}); return () => { subs.delete(f); }; }, () => cache, () => null);
  const e = useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => cacheErr, () => '');
  return { state: s, error: e };
}
/** Pacotes fechados (para o selo no menu). */
export function useClosedPacks(): number {
  return useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => (cache ? cache.packs.filter((p) => p.state === 'fechado').length : 0), () => 0);
}
export function resetAlbumCache() { cache = null; cacheErr = ''; emit(); }
/** O estado do álbum agora (sem assinar mudanças). */
export const albumNow = (): AlbumState | null => cache;

export const albumApi = {
  async open(packId: string): Promise<Drawn[]> {
    if (!supa()) {
      const d = dLoad();
      const p = d.packs.find((x) => x.id === packId);
      if (!p) throw new Error(MSG.not_found);
      if (p.state === 'aberto' && p.contents) return p.contents;
      if (p.state !== 'fechado') throw new Error(MSG.pack_not_open);
      const pool = d.stickers.filter((s) => s.active && d.books.some((b) => b.published && b.pages.some((pg) => pg.id === s.pageId)));
      const owned = Object.fromEntries(d.items.map((i) => [i.id, i.qty]));
      let r;
      try { r = drawPack(pool, owned, d.stats.noRare); } catch { throw new Error(MSG.catalog_empty); }
      for (const c of r.contents) {
        const it = d.items.find((i) => i.id === c.id);
        if (it) it.qty += 1; else d.items.push({ id: c.id, qty: 1, pasted: false });
      }
      p.state = 'aberto'; p.contents = r.contents; p.openedAt = new Date().toISOString();
      d.stats = { opened: d.stats.opened + 1, noRare: r.rare ? 0 : d.stats.noRare + 1 };
      dSave(d); set(dView(d));
      return r.contents;
    }
    const c = await rpc<Drawn[]>('album_open', { p_pack: packId });
    void reloadAlbum().catch(() => {});
    return c;
  },
  /** Cola uma figurinha (atualiza na hora; o banco confirma depois). */
  async paste(stickerId: string): Promise<void> {
    if (cache) set({ ...cache, items: cache.items.map((i) => (i.id === stickerId ? { ...i, pasted: true } : i)) });
    if (!supa()) { const d = dLoad(); const it = d.items.find((i) => i.id === stickerId); if (it) it.pasted = true; dSave(d); return; }
    try { await rpc<boolean>('album_paste', { p_sticker: stickerId }); } catch (e) { void reloadAlbum().catch(() => {}); throw e; }
  },
  async reviewAsk(packId: string, message: string): Promise<void> {
    if (!supa()) {
      if (message.trim().length < 3) throw new Error(MSG.review_short);
      const d = dLoad(); const p = d.packs.find((x) => x.id === packId);
      if (!p || (p.state !== 'retido' && p.state !== 'negado')) throw new Error(MSG.not_held);
      p.review = { state: 'aberta', message: message.trim().slice(0, 400), answer: null, createdAt: new Date().toISOString() };
      dSave(d); set(dView(d)); return;
    }
    await rpc('album_review_ask', { p_pack: packId, p_message: message });
    await reloadAlbum();
  },
  /** Depois de zerar: o pacote que a Jornada deu (ou guardou) por esta história, se houver. */
  async afterFinish(historyId: string, gameId: string): Promise<Pack | null> {
    if (!supa()) {
      const d = dLoad();
      const s = getState();
      const h = s.histories.find((x) => x.id === historyId);
      const g = s.games[gameId];
      if (!h || d.counted.includes(gameId)) return null;
      const weekPacks = d.packs.filter((p) => p.origin === 'jornada' && p.state !== 'retido' && Date.now() - Date.parse(p.createdAt) < 7 * 86400_000).length;
      const j = judgeFinish({ counted: false, elapsedH: (Date.now() - Date.parse(h.startedAt)) / 3600_000, ttbH: g?.ttb?.n ?? g?.ttb?.h ?? null, bridgeMin: 0, accountDays: 90, weekPacks });
      if (!j) return null;
      d.counted.push(gameId);
      const p: DPack = { id: `demo-k${rid()}`, kind: 'onix', origin: 'jornada', state: j.state, rule: j.rule, reason: null, historyId, game: gm(gameId) ?? (g ? { id: g.id, slug: g.slug, title: g.title, cover: g.cover } : null),
        contents: null, createdAt: new Date().toISOString(), openedAt: null, note: null, review: null, userHandle: 'voce', signals: j.signals };
      d.packs.push(p); dSave(d); set(dView(d));
      return p;
    }
    await new Promise((r) => setTimeout(r, 900));
    const st = await reloadAlbum().catch(() => null);
    return st?.packs.find((p) => p.historyId === historyId) ?? null;
  },
  /** O pacote de boas-vindas da Chegada (um por conta; criado na primeira vez). */
  async welcome(): Promise<Pack> {
    if (!supa()) {
      const d = dLoad();
      let p = d.packs.find((x) => x.origin === 'boas_vindas' && x.userHandle === 'voce');
      if (!p) {
        p = { id: `demo-k${rid()}`, kind: 'prisma', origin: 'boas_vindas', state: 'fechado', rule: null, reason: 'Boas-vindas ao WinnerZ', historyId: null, game: null,
          contents: null, createdAt: new Date().toISOString(), openedAt: null, note: null, review: null, userHandle: 'voce', signals: {} };
        d.packs.push(p); dSave(d); set(dView(d));
      }
      return p;
    }
    try {
      const p = await rpc<Pack>('album_welcome_pack');
      void reloadAlbum().catch(() => {});
      return p;
    } catch (e) {
      if (e instanceof Error && /0053/.test(e.message)) throw new Error('Falta rodar a migração 0057 no Supabase.');
      throw e;
    }
  },
  /** Cofre: troca repetidas por uma figurinha que falta. Devolve a figurinha nova (que vai para a bandeja). */
  async vault(targetId: string, give: VaultGive): Promise<Sticker> {
    const clean = give.filter((g) => g.n > 0);
    if (!supa()) {
      const d = dLoad();
      const t = d.stickers.find((s) => s.id === targetId && s.active && d.books.some((b) => b.published && b.pages.some((pg) => pg.id === s.pageId)));
      if (!t) throw new Error(MSG.vault_target);
      const items = Object.fromEntries(d.items.map((i) => [i.id, i]));
      const err = vaultCheck(t, clean, items);
      if (err) throw new Error(MSG[err]);
      for (const g of clean) { const it = d.items.find((i) => i.id === g.id); if (it) it.qty -= g.n; }
      const it = d.items.find((i) => i.id === t.id);
      if (it) it.qty += 1; else d.items.push({ id: t.id, qty: 1, pasted: false });
      dSave(d); set(dView(d));
      return t;
    }
    const s = await rpc<Sticker>('album_vault', { p_target: targetId, p_give: clean });
    await reloadAlbum().catch(() => {});
    return s;
  },
  resetDemo() { try { localStorage.removeItem(DK); } catch { /* sem armazenamento */ } resetAlbumCache(); },
};

/* ---- Studio ---------------------------------------------------------------------------------------- */
const dMutate = (f: (d: DState) => void): Catalog => { const d = dLoad(); f(d); dSave(d); cache = null; return dCatalog(d); };
export const studioAlbumApi = {
  async catalog(): Promise<Catalog> {
    if (!supa()) return dCatalog(dLoad());
    const r = await rpc<Catalog>('studio_album_catalog');
    return { books: r.books ?? [], stickers: r.stickers ?? [], owned: r.owned ?? {} };
  },
  async saveBook(b: Partial<AlbumBook>): Promise<Catalog> {
    if (!supa()) return dMutate((d) => {
      const cur = d.books.find((x) => x.id === b.id);
      if (cur) Object.assign(cur, { ...b, pages: cur.pages });
      else d.books.push({ id: `demo-b${rid()}`, slug: b.slug ?? rid(), season: b.season ?? 1, title: b.title ?? 'Álbum', subtitle: b.subtitle ?? '', cover: b.cover ?? null, position: b.position ?? d.books.length + 1, published: !!b.published, pages: [] });
    });
    const { pages: _p, ...rest } = b;
    return rpc<Catalog>('studio_album_book_save', { p: rest });
  },
  async deleteBook(id: string): Promise<Catalog> {
    if (!supa()) return dMutate((d) => { d.books = d.books.filter((x) => x.id !== id); });
    return rpc<Catalog>('studio_album_book_delete', { p_id: id });
  },
  async savePage(bookId: string, p: Partial<AlbumPage>): Promise<Catalog> {
    if (!supa()) return dMutate((d) => {
      const bk = d.books.find((x) => x.id === bookId); if (!bk) return;
      const cur = bk.pages.find((x) => x.id === p.id);
      if (cur) Object.assign(cur, p);
      else bk.pages.push({ id: `demo-p${rid()}`, position: p.position ?? bk.pages.length + 1, kicker: p.kicker ?? '', title: p.title ?? 'Página', body: p.body ?? '', banner: p.banner ?? null, legendary: !!p.legendary });
      bk.pages.sort((a, b) => a.position - b.position);
    });
    return rpc<Catalog>('studio_album_page_save', { p: { ...p, bookId } });
  },
  async deletePage(id: string): Promise<Catalog> {
    if (!supa()) return dMutate((d) => { for (const b of d.books) b.pages = b.pages.filter((x) => x.id !== id); for (const s of d.stickers) if (s.pageId === id) s.pageId = null; });
    return rpc<Catalog>('studio_album_page_delete', { p_id: id });
  },
  async saveSticker(s: Partial<Sticker>): Promise<Catalog> {
    if (!supa()) return dMutate((d) => {
      if (d.stickers.some((x) => x.number === s.number && x.season === (s.season ?? 1) && x.id !== s.id)) throw new Error(MSG.sticker_number_taken);
      const cur = d.stickers.find((x) => x.id === s.id);
      if (cur) Object.assign(cur, s);
      else d.stickers.push({ id: `demo-s${rid()}`, season: s.season ?? 1, number: s.number ?? d.stickers.length + 1, name: s.name ?? 'Figurinha', tier: s.tier ?? 'comum', art: s.art ?? null, credit: s.credit ?? '', pageId: s.pageId ?? null, slot: s.slot ?? 0, active: s.active ?? true });
    });
    return rpc<Catalog>('studio_album_sticker_save', { p: s });
  },
  async deleteSticker(id: string): Promise<Catalog> {
    if (!supa()) return dMutate((d) => { d.stickers = d.stickers.filter((x) => x.id !== id); d.items = d.items.filter((x) => x.id !== id); });
    return rpc<Catalog>('studio_album_sticker_delete', { p_id: id });
  },
  /** Envia uma arte (reduzida no navegador) e devolve o caminho para guardar no catálogo. */
  async upload(file: File): Promise<string> {
    const blob = await shrink(file, 1200);
    if (!supa()) return await new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(blob); });
    const path = `t1/${Date.now().toString(36)}-${rid()}.jpg`;
    const { error } = await (await client()).storage.from('album').upload(path, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '31536000' });
    if (error) throw new Error(/row-level|policy|not authorized/i.test(error.message) ? 'Só a administração envia artes do álbum.' : /bucket/i.test(error.message) ? MIGRATION : error.message);
    return path;
  },
  async packs(view: StudioView): Promise<StudioPack[]> {
    if (!supa()) {
      const d = dLoad();
      const l = d.packs.filter((p) => view === 'retidos' ? p.state === 'retido' : view === 'revisoes' ? p.review?.state === 'aberta' : p.origin === 'studio' || !!p.decidedAt);
      return l.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(dStudioPack);
    }
    return (await rpc<StudioPack[]>('studio_packs', { p_view: view })) ?? [];
  },
  async counts(): Promise<{ retidos: number; revisoes: number }> {
    if (!supa()) { const d = dLoad(); return { retidos: d.packs.filter((p) => p.state === 'retido').length, revisoes: d.packs.filter((p) => p.review?.state === 'aberta').length }; }
    return rpc('studio_pack_counts');
  },
  async give(handle: string, qty: number, kind: PackKind, reason: string): Promise<void> {
    if (!supa()) {
      const h = handle.trim().replace(/^@/, '');
      if (!h) throw new Error(MSG.target_not_found);
      if (qty < 1 || qty > 20) throw new Error(MSG.pack_qty);
      if (reason.trim().length < 3) throw new Error(MSG.pack_reason);
      const d = dLoad();
      for (let i = 0; i < qty; i++) d.packs.push({ id: `demo-k${rid()}`, kind, origin: 'studio', state: 'fechado', rule: null, reason: reason.trim().slice(0, 200), historyId: null, game: null, contents: null,
        createdAt: new Date(Date.now() + i).toISOString(), openedAt: null, note: null, review: null, userHandle: h.toLowerCase() === 'voce' ? 'voce' : h, grantedBy: 'winnerz', signals: {} });
      dSave(d); cache = null; return;
    }
    await rpc('studio_pack_give', { p_handle: handle, p_qty: qty, p_kind: kind, p_reason: reason });
  },
  async undo(id: string): Promise<void> {
    if (!supa()) { const d = dLoad(); const p = d.packs.find((x) => x.id === id); if (!p || p.state !== 'fechado' || p.origin !== 'studio') throw new Error(MSG.pack_already_opened); p.state = 'desfeito'; p.decidedAt = new Date().toISOString(); dSave(d); cache = null; return; }
    await rpc('studio_pack_undo', { p_pack: id });
  },
  async decide(id: string, release: boolean, note: string): Promise<void> {
    if (!supa()) {
      if (!release && note.trim().length < 3) throw new Error(MSG.pack_reason);
      const d = dLoad(); const p = d.packs.find((x) => x.id === id);
      if (!p || (p.state !== 'retido' && p.state !== 'negado')) throw new Error(MSG.not_held);
      p.state = release ? 'fechado' : 'negado'; p.note = note.trim() || null; p.decidedAt = new Date().toISOString();
      if (p.review) p.review = { ...p.review, state: 'respondida', answer: note.trim() || 'Liberado.' };
      dSave(d); cache = null; return;
    }
    await rpc('studio_pack_decide', { p_pack: id, p_release: release, p_note: note });
  },
};

/* ---- Trocas (etapa A3, migração 0056) -------------------------------------------------------------------- */
const DAY = 86400_000;
function dPeers(d: DState): DPeer[] {
  if (!d.peers) d.peers = [
    { handle: 'lia', friend: true, follow: true, items: { 'demo-s6': 2, 'demo-s8': 3, 'demo-s10': 2, 'demo-s3': 1, 'demo-s13': 2 } },
    { handle: 'caio', friend: false, follow: true, items: { 'demo-s12': 2, 'demo-s6': 2, 'demo-s1': 2 } },
    { handle: 'bia', friend: false, follow: false, items: { 'demo-s8': 2, 'demo-s4': 1, 'demo-s12': 3 } },
  ];
  return d.peers;
}
function dTrades(d: DState): DTrade[] {
  if (!d.trades) {
    const at = new Date(Date.now() - 2 * 3600_000).toISOString();
    d.trades = [{ id: 'demo-t1', fromH: 'caio', toH: 'voce', give: ['demo-s12'], take: ['demo-s9'], message: 'Tenho a Arco de luz sobrando, topa?', state: 'aberta', createdAt: at, decidedAt: null, expiresAt: new Date(Date.parse(at) + 7 * DAY).toISOString() }];
  }
  for (const t of d.trades) if (t.state === 'aberta' && Date.parse(t.expiresAt) < Date.now()) { t.state = 'expirada'; t.decidedAt = t.expiresAt; }
  return d.trades;
}
const dPerson = (h: string): PersonRef => ({ id: `demo-${h}`, handle: h === 'voce' ? (getState().profile?.name ?? 'voce') : h });
const dTradeView = (t: DTrade): Trade => ({ ...t, from: dPerson(t.fromH), to: dPerson(t.toH), mine: t.fromH === 'voce' });
const dTradeable = (d: DState) => new Set(d.stickers.filter((s) => s.active && s.tier !== 'lendaria' && d.books.some((b) => b.published && b.pages.some((pg) => pg.id === s.pageId))).map((s) => s.id));
const dMyQty = (d: DState, id: string) => d.items.find((i) => i.id === id)?.qty ?? 0;
function dMatch(d: DState, p: DPeer) {
  const ok = dTradeable(d);
  const give = [...ok].filter((id) => dMyQty(d, id) >= 2 && !(p.items[id] > 0));
  const take = [...ok].filter((id) => (p.items[id] ?? 0) >= 2 && dMyQty(d, id) === 0);
  const pending = dTrades(d).some((t) => t.state === 'aberta' && ((t.fromH === 'voce' && t.toH === p.handle) || (t.fromH === p.handle && t.toH === 'voce')));
  return { give, take, pending };
}
function dMove(d: DState, from: 'voce' | DPeer, to: 'voce' | DPeer, id: string) {
  if (from === 'voce') { const it = d.items.find((i) => i.id === id); if (it) it.qty -= 1; } else from.items[id] = (from.items[id] ?? 0) - 1;
  if (to === 'voce') { const it = d.items.find((i) => i.id === id); if (it) it.qty += 1; else d.items.push({ id, qty: 1, pasted: false }); } else to.items[id] = (to.items[id] ?? 0) + 1;
}

export const tradeApi = {
  async board(): Promise<TradeBoard> {
    if (!supa()) {
      const d = dLoad(); const ts = dTrades(d); dPeers(d); dSave(d);
      const v = ts.map(dTradeView);
      return { open: d.tradeOpen ?? true, newUntil: null, received: v.filter((t) => !t.mine && t.state === 'aberta'), sent: v.filter((t) => t.mine && t.state === 'aberta'),
        history: v.filter((t) => t.state !== 'aberta').sort((a, b) => (b.decidedAt ?? b.createdAt).localeCompare(a.decidedAt ?? a.createdAt)) };
    }
    const r = await rpc<TradeBoard>('album_trade_state');
    return { open: r.open ?? true, newUntil: r.newUntil ?? null, received: r.received ?? [], sent: r.sent ?? [], history: r.history ?? [] };
  },
  async setOpen(open: boolean): Promise<boolean> {
    if (!supa()) { const d = dLoad(); d.tradeOpen = open; dSave(d); return open; }
    return rpc<boolean>('album_trade_prefs_set', { p_open: open });
  },
  async matches(): Promise<TradeMatch[]> {
    if (!supa()) {
      const d = dLoad();
      return dPeers(d).map((p) => ({ person: dPerson(p.handle), friend: p.friend, follow: p.follow, ...dMatch(d, p) }))
        .filter((m) => m.give.length && m.take.length).sort((a, b) => Number(b.friend) - Number(a.friend) || Number(b.follow) - Number(a.follow));
    }
    return (await rpc<TradeMatch[]>('album_trade_matches')) ?? [];
  },
  async peer(handle: string): Promise<TradePeer> {
    const h = handle.trim().replace(/^@/, '').toLowerCase();
    if (!supa()) {
      const d = dLoad(); const p = dPeers(d).find((x) => x.handle === h);
      if (h === 'voce' || h === (getState().profile?.name ?? '').toLowerCase()) return { person: dPerson('voce'), why: 'trade_self', take: [], theyMiss: [], pending: false };
      if (!p) throw new Error(`${MSG.target_not_found} Na demonstração, experimente @lia, @caio ou @bia.`);
      const m = dMatch(d, p);
      return { person: dPerson(p.handle), why: null, take: m.take, theyMiss: m.give, pending: m.pending };
    }
    return rpc<TradePeer>('album_trade_peer', { p_handle: h });
  },
  async propose(handle: string, give: string[], take: string[], message: string): Promise<Trade> {
    const h = handle.trim().replace(/^@/, '').toLowerCase();
    if (!supa()) {
      const d = dLoad(); const p = dPeers(d).find((x) => x.handle === h); const ts = dTrades(d); const ok = dTradeable(d);
      if (!p) throw new Error(MSG.target_not_found);
      if (give.length < 1 || give.length > 5 || take.length < 1 || take.length > 5 || new Set(give).size !== give.length || new Set(take).size !== take.length) throw new Error(MSG.trade_size);
      if (ts.filter((t) => t.fromH === 'voce' && t.state === 'aberta').length >= 5) throw new Error(MSG.trade_limit);
      if (dMatch(d, p).pending) throw new Error(MSG.trade_pair_open);
      if ([...give, ...take].some((id) => !ok.has(id))) throw new Error(MSG.trade_lendaria);
      if (give.some((id) => dMyQty(d, id) < 2)) throw new Error(MSG.trade_not_spare);
      if (take.some((id) => (p.items[id] ?? 0) < 2)) throw new Error(MSG.trade_their_spare);
      const at = new Date().toISOString();
      const t: DTrade = { id: `demo-t${rid()}`, fromH: 'voce', toH: p.handle, give, take, message: message.trim().slice(0, 200) || null, state: 'aberta', createdAt: at, decidedAt: null, expiresAt: new Date(Date.now() + 7 * DAY).toISOString() };
      ts.push(t); dSave(d); return dTradeView(t);
    }
    return rpc<Trade>('album_trade_propose', { p_handle: h, p_give: give, p_take: take, p_message: message });
  },
  /** Aceitar ou recusar uma proposta recebida. Aceita: as novas vão para a bandeja. */
  async answer(id: string, accept: boolean): Promise<Trade> {
    if (!supa()) {
      const d = dLoad(); const t = dTrades(d).find((x) => x.id === id);
      if (!t || t.toH !== 'voce') throw new Error(MSG.not_found);
      if (t.state !== 'aberta') throw new Error(MSG.trade_not_open);
      const p = dPeers(d).find((x) => x.handle === t.fromH)!;
      t.decidedAt = new Date().toISOString();
      if (!accept) t.state = 'recusada';
      else if (t.give.some((g) => (p.items[g] ?? 0) < 2) || t.take.some((g) => dMyQty(d, g) < 2)) t.state = 'falhou';
      else { t.give.forEach((g) => dMove(d, p, 'voce', g)); t.take.forEach((g) => dMove(d, 'voce', p, g)); t.state = 'aceita'; }
      dSave(d); set(dView(d)); return dTradeView(t);
    }
    const t = await rpc<Trade>('album_trade_answer', { p_trade: id, p_accept: accept });
    await reloadAlbum().catch(() => {});
    return t;
  },
  async cancel(id: string): Promise<Trade> {
    if (!supa()) {
      const d = dLoad(); const t = dTrades(d).find((x) => x.id === id);
      if (!t || t.fromH !== 'voce') throw new Error(MSG.not_found);
      if (t.state !== 'aberta') throw new Error(MSG.trade_not_open);
      t.state = 'cancelada'; t.decidedAt = new Date().toISOString(); dSave(d); return dTradeView(t);
    }
    return rpc<Trade>('album_trade_cancel', { p_trade: id });
  },
  /** Studio: todas as trocas (só consulta). */
  async studio(): Promise<Trade[]> {
    if (!supa()) { const d = dLoad(); return dTrades(d).map((t) => ({ ...dTradeView(t), mine: false })).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
    return (await rpc<Trade[]>('studio_album_trades')) ?? [];
  },
};

/* ---- E7.1 · Códigos de live (migração 0066) ---------------------------------------------------------------- */
export type CodeSource = 'studio' | 'drop' | 'twitch';
export interface LiveCode {
  id: string; code: string; source: CodeSource; title: string | null; kind: 'pacote' | 'figurinha'; packKind: PackKind; qty: number; stickerId: string | null;
  maxUses: number | null; uses: number; startsAt: string; endsAt: string | null; note: string; active: boolean; createdAt: string;
}
export interface Redeemed { kind: 'pacote' | 'figurinha'; packs: Pack[]; sticker: Sticker | null; note: string }
/** "wz-7kq 2m9" → "WZ-7KQ2M9": o mesmo jeito que o banco limpa. */
export const cleanCode = (v: string) => v.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => `WZ${Array.from(crypto.getRandomValues(new Uint8Array(7)), (b) => ABC[b % 32]).join('')}`;
function dCodes(d: DState): LiveCode[] {
  if (!d.codes) d.codes = [{ id: 'demo-c1', code: 'WZLIVE', source: 'studio', title: 'Live de exemplo', kind: 'pacote', packKind: 'prisma', qty: 1, stickerId: null, maxUses: null, uses: 0,
    startsAt: new Date(Date.now() - DAY).toISOString(), endsAt: null, note: 'Código da live de exemplo', active: true, createdAt: new Date(Date.now() - DAY).toISOString() }];
  return d.codes;
}

/* ---- E7.2 · Drop na live (migração 0067) ---- */
export interface DropNow { id: string; title: string; endsAt: string; kind: 'pacote' | 'figurinha'; packKind: PackKind; left: number | null; mine: boolean }
export interface DropStart { title: string; minutes: number; maxUses?: number | null; kind: 'pacote' | 'figurinha'; packKind: PackKind; qty?: number; stickerId?: string | null; note: string }
function dDropLive(d: DState): LiveCode | undefined {
  const now = Date.now();
  return dCodes(d).filter((c) => c.source === 'drop' && c.active && Date.parse(c.startsAt) <= now && c.endsAt && Date.parse(c.endsAt) > now && (c.maxUses == null || c.uses < c.maxUses))
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0];
}
/** Demonstração: o drop no ar deste navegador, com o código (o overlay de teste mostra). */
export function demoDrop(): (DropNow & { code: string }) | null {
  if (supa()) return null;
  const d = dLoad(); const c = dDropLive(d);
  return c ? { id: c.id, code: c.code, title: c.title ?? 'Drop na live', endsAt: c.endsAt!, kind: c.kind, packKind: c.packKind, left: c.maxUses == null ? null : c.maxUses - c.uses, mine: (d.codeUses ?? []).includes(c.id) } : null;
}

export const codeApi = {
  /** O drop no ar agora, sem o código (ele só aparece na tela da live). */
  async dropNow(): Promise<DropNow | null> {
    if (!supa()) { const x = demoDrop(); if (!x) return null; const { code: _c, ...rest } = x; return rest; }
    try { return await rpc<DropNow | null>('album_drop_now'); } catch { return null; }
  },
  async dropStart(p: DropStart): Promise<LiveCode[]> {
    if (!supa()) {
      if (p.note.trim().length < 3) throw new Error(MSG.pack_reason);
      const d = dLoad(); const list = dCodes(d); const now = new Date();
      for (const c of list) if (c.source === 'drop' && c.endsAt && Date.parse(c.endsAt) > now.getTime()) c.endsAt = now.toISOString();
      list.push({ id: `demo-c${rid()}`, code: newCode(), source: 'drop', title: p.title.trim() || 'Drop na live', kind: p.kind, packKind: p.packKind, qty: Math.max(1, Math.min(5, p.qty ?? 1)),
        stickerId: p.kind === 'figurinha' ? p.stickerId ?? null : null, maxUses: p.maxUses ?? null, uses: 0, startsAt: now.toISOString(),
        endsAt: new Date(now.getTime() + Math.max(1, Math.min(60, p.minutes)) * 60000).toISOString(), note: p.note.trim(), active: true, createdAt: now.toISOString() });
      dSave(d); return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return rpc<LiveCode[]>('studio_drop_start', { p });
  },
  async dropStop(): Promise<LiveCode[]> {
    if (!supa()) { const d = dLoad(); const list = dCodes(d); const now = new Date().toISOString(); for (const c of list) if (c.source === 'drop' && c.endsAt && c.endsAt > now) c.endsAt = now; dSave(d); return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
    return rpc<LiveCode[]>('studio_drop_stop');
  },
  /** Resgatar um código: o pacote vai para Pacotes; a figurinha, para a bandeja. */
  async redeem(raw: string): Promise<Redeemed> {
    const code = cleanCode(raw);
    if (code.length < 4) throw new Error(MSG.code_unknown);
    if (!supa()) {
      const d = dLoad(); const c = dCodes(d).find((x) => x.code === code);
      const now = Date.now();
      if (!c || !c.active || Date.parse(c.startsAt) > now) throw new Error(MSG.code_unknown);
      if (c.endsAt && Date.parse(c.endsAt) <= now) throw new Error(MSG.code_expired);
      if ((d.codeUses ?? []).includes(c.id)) throw new Error(MSG.code_used);
      if (c.maxUses != null && c.uses >= c.maxUses) throw new Error(MSG.code_full);
      d.codeUses = [...(d.codeUses ?? []), c.id]; c.uses += 1;
      if (c.kind === 'figurinha') {
        const st = d.stickers.find((x) => x.id === c.stickerId && x.active);
        if (!st) throw new Error(MSG.code_sticker);
        const it = d.items.find((i) => i.id === st.id);
        if (it) it.qty += 1; else d.items.push({ id: st.id, qty: 1, pasted: false });
        dSave(d); set(dView(d));
        return { kind: 'figurinha', packs: [], sticker: st, note: c.note };
      }
      const packs: DPack[] = Array.from({ length: c.qty }, () => ({ id: `demo-k${rid()}`, kind: c.packKind, origin: 'codigo' as const, state: 'fechado' as const, rule: null, reason: c.note, historyId: null, game: null,
        contents: null, createdAt: new Date().toISOString(), openedAt: null, note: null, review: null, userHandle: 'voce', signals: {} }));
      d.packs.push(...packs); dSave(d); set(dView(d));
      return { kind: 'pacote', packs, sticker: null, note: c.note };
    }
    const r = await rpc<Redeemed & { error?: string }>('album_redeem', { p_code: code });
    if (r.error) throw new Error(MSG[r.error] ?? MSG.code_unknown);
    await reloadAlbum().catch(() => {});
    return r;
  },
  async list(): Promise<LiveCode[]> {
    if (!supa()) { const d = dLoad(); const c = dCodes(d); dSave(d); return [...c].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
    return rpc<LiveCode[]>('studio_codes');
  },
  /** Cria (sem id) ou edita (validade, limite, motivo, ligado). Código vazio: o banco sorteia um. */
  async save(c: Partial<LiveCode>): Promise<LiveCode[]> {
    if (!supa()) {
      const d = dLoad(); const list = dCodes(d);
      const note = (c.note ?? '').trim();
      if (note.length < 3) throw new Error(MSG.pack_reason);
      if (c.endsAt && Date.parse(c.endsAt) <= Date.parse(c.startsAt ?? new Date().toISOString())) throw new Error(MSG.code_dates);
      if (c.id) { const cur = list.find((x) => x.id === c.id); if (cur) Object.assign(cur, { title: c.title ?? cur.title, maxUses: c.maxUses ?? null, endsAt: c.endsAt ?? null, note, active: c.active ?? cur.active }); }
      else {
        const code = c.code ? cleanCode(c.code) : newCode();
        if (code.length < 4) throw new Error(MSG.code_format);
        if (list.some((x) => x.code === code)) throw new Error(MSG.code_taken);
        if (c.kind === 'figurinha' && !d.stickers.some((x) => x.id === c.stickerId)) throw new Error(MSG.code_sticker);
        list.push({ id: `demo-c${rid()}`, code, source: 'studio', title: c.title ?? null, kind: c.kind ?? 'pacote', packKind: c.packKind ?? 'onix', qty: Math.max(1, Math.min(5, c.qty ?? 1)),
          stickerId: c.kind === 'figurinha' ? c.stickerId ?? null : null, maxUses: c.maxUses ?? null, uses: 0, startsAt: c.startsAt ?? new Date().toISOString(), endsAt: c.endsAt ?? null, note, active: true, createdAt: new Date().toISOString() });
      }
      dSave(d); return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return rpc<LiveCode[]>('studio_code_save', { p: c });
  },
};
