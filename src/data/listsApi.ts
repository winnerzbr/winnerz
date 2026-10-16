/**
 * Listas compartilhadas (Comunidade, entrega H; migração 0048). Listas de jogos com nota por jogo, ordem livre ou
 * numerada, quem vê (só eu, amigos, link, todo mundo) e até 10 amigos editando junto. Com conta, tudo passa pelas
 * funções do banco. Na demonstração, ficam neste navegador, com duas listas de pessoas de exemplo.
 */
import { getState } from './store';
import type { GameMini, PersonRef } from './communityApi';
import { DEMO_PEOPLE, demoIsFriend } from './demoPeople';
import { demoGames } from './demo';

export type ListVisibility = 'privada' | 'amigos' | 'link' | 'publica';
export type ListRole = 'dona' | 'edita' | null;
export interface ListCover { title: string; cover?: string | null; slug: string }
export interface GameList {
  id: string; title: string; description: string; visibility: ListVisibility; ranked: boolean;
  owner: PersonRef; updatedAt: string; createdAt: string; hidden: boolean;
  count: number; covers: ListCover[]; editors: PersonRef[]; saves: number; saved: boolean; role: ListRole; key?: string | null;
  /** Nas listas da ficha do jogo: a nota que deixaram para aquele jogo. */
  note?: string;
}
export interface GameListItem { game: GameMini; note: string; position: number; addedBy?: PersonRef | null; addedAt: string }
export interface GameListFull extends GameList { items: GameListItem[] }
export interface MyLists { minhas: GameList[]; comigo: GameList[]; salvas: GameList[] }
export interface ListDraft { id?: string; title: string; description: string; visibility: ListVisibility; ranked: boolean }

export const VISIBILITY: { k: ListVisibility; label: string; hint: string }[] = [
  { k: 'privada', label: 'Só eu', hint: 'Só você e quem edita junto.' },
  { k: 'amigos', label: 'Amigos', hint: 'Seus amigos veem no seu perfil.' },
  { k: 'link', label: 'Quem tiver o link', hint: 'Não aparece no perfil nem na busca.' },
  { k: 'publica', label: 'Todo mundo', hint: 'No seu perfil, na ficha dos jogos e na busca.' },
];
export const VIS_LABEL: Record<ListVisibility, string> = { privada: 'Só eu', amigos: 'Amigos', link: 'Com o link', publica: 'Pública' };

const MSG: Record<string, string> = {
  list_title: 'Dê um nome com pelo menos 2 letras.',
  list_visibility: 'Escolha quem vê a lista.',
  list_limit: 'Você chegou ao limite de 60 listas. Apague alguma para criar outra.',
  list_full: 'Esta lista já tem 300 jogos.',
  list_only_friends: 'Só dá para convidar amigos (vocês dois se seguem).',
  list_editors_full: 'No máximo 10 pessoas editando junto.',
  game_not_found: 'Não achei esse jogo.',
  bad_term: 'Tem uma palavra que não é aceita aqui.',
  target_not_found: 'Não achei esse perfil.',
  not_allowed: 'Só quem criou ou edita a lista pode mudar.',
  not_found: 'Esta lista não existe ou não está aberta para você.',
  not_logged: 'Entre na sua conta para usar listas.',
};
const MIGRATION = 'Falta rodar a migração 0048 no Supabase.';
const ok = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(MSG).find((x) => m.includes(x));
    if (k) throw new Error(MSG[k]);
    if (/lists?_\w+|game_list|schema cache/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error(MIGRATION);
    throw new Error(m);
  }
  return r.data;
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';
const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => ok(await (await client()).rpc(fn, args)) as T;

/* ---- Demonstração ------------------------------------------------------------------------------ */
type DItem = { game: GameMini; note: string; by: string; at: string };
type DList = { id: string; owner: string; title: string; description: string; visibility: ListVisibility; ranked: boolean; key: string; editors: string[]; saves: string[]; items: DItem[]; createdAt: string; updatedAt: string };
const DK = 'wz.demo.listas';
const ME = 'voce';
const ago = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);
const mini = (id: string): GameMini => { const g = demoGames.find((x) => x.id === id)!; return { id: g.id, slug: g.slug, title: g.title, cover: g.cover, backdrop: g.backdrop ?? null }; };
const di = (id: string, by: string, note = '', d = 3): DItem => ({ game: mini(id), note, by, at: ago(d) });
function dLoad(): DList[] {
  try { const v = JSON.parse(localStorage.getItem(DK) || 'null'); if (Array.isArray(v)) return v; } catch { /* começa de novo */ }
  return [
    { id: 'demo-l1', owner: 'duda', title: 'Os que todo mundo com PS5 devia jogar', description: 'Na ordem em que eu recomendaria. Discordem nos comentários do Discord.', visibility: 'publica', ranked: true, key: 'k1', editors: [], saves: ['carol'],
      items: [di('astro', 'duda', 'Alegria pura, do começo ao fim.'), di('elden', 'duda', 'Paciência e um escudo.'), di('tlou2', 'duda', 'Pesado, mas inesquecível.')], createdAt: ago(40), updatedAt: ago(2) },
    { id: 'demo-l2', owner: 'carol', title: 'RPG japonês para começar', description: 'Para quem nunca jogou e quer entender a graça.', visibility: 'publica', ranked: false, key: 'k2', editors: ['duda'], saves: [],
      items: [di('p5r', 'carol', 'O mais estiloso. Vai com calma no calendário.'), di('yakuza', 'duda', 'Não é bem RPG, mas a história é novela das boas.')], createdAt: ago(20), updatedAt: ago(6) },
    { id: 'demo-l3', owner: ME, title: 'Para zerar com calma', description: 'Os que eu quero terminar sem pressa.', visibility: 'amigos', ranked: false, key: 'k3', editors: [], saves: [],
      items: [di('mgs2', ME, 'Rever as cutscenes todas.'), di('infamous', ME)], createdAt: ago(10), updatedAt: ago(1) },
  ];
}
function dSave(v: DList[]) { try { localStorage.setItem(DK, JSON.stringify(v)); } catch { /* só nesta visita */ } }
const myDemoHandle = (): string => { try { return JSON.parse(localStorage.getItem('wz.profile.demo.v1') || 'null')?.handle || 'voce'; } catch { return 'voce'; } };
const ref = (h: string): PersonRef => ({ id: h === ME ? 'demo-me' : `demo-${h}`, handle: h === ME ? myDemoHandle() : h, avatar: null });
const role = (l: DList): ListRole => (l.owner === ME ? 'dona' : l.editors.includes(ME) ? 'edita' : null);
const friend = (h: string) => { const p = DEMO_PEOPLE.find((x) => x.handle === h); return !!p && demoIsFriend(p); };
const seeable = (l: DList, key?: string | null) => !!role(l) || l.visibility === 'publica' || (l.visibility === 'amigos' && friend(l.owner)) || (l.visibility === 'link' && key === l.key);
function card(l: DList): GameList {
  return {
    id: l.id, title: l.title, description: l.description, visibility: l.visibility, ranked: l.ranked, owner: ref(l.owner), updatedAt: l.updatedAt, createdAt: l.createdAt, hidden: false,
    count: l.items.length, covers: l.items.slice(0, 4).map((i) => ({ title: i.game.title, cover: i.game.cover, slug: i.game.slug })),
    editors: l.editors.map(ref), saves: l.saves.length, saved: l.saves.includes(ME), role: role(l), key: role(l) ? l.key : null,
  };
}
const full = (l: DList): GameListFull => ({ ...card(l), items: l.items.map((i, n) => ({ game: i.game, note: i.note, position: n, addedBy: i.by !== l.owner ? ref(i.by) : null, addedAt: i.at })) });
function dEdit(id: string, fn: (l: DList) => void, needRole = true): DList {
  const all = dLoad(); const l = all.find((x) => x.id === id);
  if (!l) throw new Error(MSG.not_found);
  if (needRole && !role(l)) throw new Error(MSG.not_allowed);
  fn(l); l.updatedAt = new Date().toISOString(); dSave(all); return l;
}
const findGame = (g: string | GameMini): GameMini | null => {
  if (typeof g !== 'string') return g;
  const x = demoGames.find((d) => d.id === g || d.slug === g); return x ? mini(x.id) : null;
};

/* ---- API --------------------------------------------------------------------------------------- */
export const listsApi = {
  async mine(): Promise<MyLists> {
    if (supa()) return rpc<MyLists>('lists_mine');
    const all = dLoad();
    const by = (a: DList, b: DList) => b.updatedAt.localeCompare(a.updatedAt);
    return { minhas: all.filter((l) => l.owner === ME).sort(by).map(card), comigo: all.filter((l) => l.editors.includes(ME)).sort(by).map(card), salvas: all.filter((l) => l.saves.includes(ME) && seeable(l, l.key) && l.visibility !== 'privada').map(card) };
  },
  async get(id: string, key?: string | null): Promise<GameListFull> {
    if (supa()) return rpc<GameListFull>('list_get', { p_id: id, p_key: key || null });
    const l = dLoad().find((x) => x.id === id);
    if (!l || !seeable(l, key)) throw new Error(MSG.not_found);
    return full(l);
  },
  async of(handle: string): Promise<GameList[]> {
    if (supa()) { try { return await rpc<GameList[]>('lists_of', { p_handle: handle }); } catch { return []; } }
    const h = handle.toLowerCase();
    const who = h === myDemoHandle().toLowerCase() ? ME : h;
    return dLoad().filter((l) => l.owner === who && l.items.length && (l.visibility === 'publica' || (l.visibility === 'amigos' && (who === ME || friend(who))))).map(card);
  },
  async withGame(slug: string, limit = 6): Promise<GameList[]> {
    if (supa()) { try { return await rpc<GameList[]>('lists_with_game', { p_game: slug, p_limit: limit }); } catch { return []; } }
    return dLoad().filter((l) => (l.visibility === 'publica' || (l.visibility === 'amigos' && (l.owner === ME || friend(l.owner)))) && l.items.some((i) => i.game.slug === slug || i.game.id === slug))
      .sort((a, b) => b.saves.length - a.saves.length).slice(0, limit)
      .map((l) => ({ ...card(l), note: l.items.find((i) => i.game.slug === slug || i.game.id === slug)?.note ?? '' }));
  },
  async save(d: ListDraft): Promise<GameList> {
    if (supa()) return rpc<GameList>('list_save', { p: { id: d.id ?? null, title: d.title, description: d.description, visibility: d.visibility, ranked: d.ranked } });
    if (d.title.trim().length < 2) throw new Error(MSG.list_title);
    if (!d.id) {
      const all = dLoad(); const now = new Date().toISOString();
      const l: DList = { id: `demo-${uid()}`, owner: ME, title: d.title.trim(), description: d.description.trim(), visibility: d.visibility, ranked: d.ranked, key: uid(), editors: [], saves: [], items: [], createdAt: now, updatedAt: now };
      all.unshift(l); dSave(all); return card(l);
    }
    return card(dEdit(d.id, (l) => { l.title = d.title.trim(); l.description = d.description.trim(); l.ranked = d.ranked; if (l.owner === ME) l.visibility = d.visibility; }));
  },
  async remove(id: string): Promise<void> {
    if (supa()) { await rpc('list_delete', { p_id: id }); return; }
    dSave(dLoad().filter((l) => !(l.id === id && l.owner === ME)));
  },
  async newKey(id: string): Promise<string> {
    if (supa()) return rpc<string>('list_new_key', { p_id: id });
    return dEdit(id, (l) => { l.key = uid(); }).key;
  },
  /** game: id ou slug do jogo (com conta); na demonstração, também o jogo inteiro vindo da busca. */
  async add(id: string, game: string | GameMini, note = ''): Promise<GameListFull> {
    if (supa()) return rpc<GameListFull>('list_add', { p_id: id, p_game: typeof game === 'string' ? game : game.id || game.slug, p_note: note });
    const g = findGame(game); if (!g) throw new Error(MSG.game_not_found);
    return full(dEdit(id, (l) => {
      const have = l.items.find((i) => i.game.slug === g.slug);
      if (have) { if (note.trim()) have.note = note.trim(); } else l.items.push({ game: g, note: note.trim(), by: ME, at: new Date().toISOString() });
    }));
  },
  async removeGame(id: string, slug: string): Promise<void> {
    if (supa()) { await rpc('list_remove', { p_id: id, p_game: slug }); return; }
    dEdit(id, (l) => { l.items = l.items.filter((i) => i.game.slug !== slug && i.game.id !== slug); });
  },
  async note(id: string, slug: string, note: string): Promise<void> {
    if (supa()) { await rpc('list_note', { p_id: id, p_game: slug, p_note: note }); return; }
    dEdit(id, (l) => { const i = l.items.find((x) => x.game.slug === slug); if (i) i.note = note.trim().slice(0, 280); });
  },
  async move(id: string, order: string[]): Promise<void> {
    if (supa()) { await rpc('list_move', { p_id: id, p_order: order }); return; }
    dEdit(id, (l) => { l.items.sort((a, b) => order.indexOf(a.game.slug) - order.indexOf(b.game.slug)); });
  },
  async addEditor(id: string, handle: string): Promise<GameList> {
    const h = handle.trim().replace(/^@/, '').toLowerCase();
    if (supa()) return rpc<GameList>('list_editor_add', { p_id: id, p_handle: h });
    if (!DEMO_PEOPLE.some((p) => p.handle === h)) throw new Error(MSG.target_not_found);
    if (!friend(h)) throw new Error(MSG.list_only_friends);
    return card(dEdit(id, (l) => { if (l.owner !== ME) throw new Error(MSG.not_allowed); if (l.editors.length >= 10) throw new Error(MSG.list_editors_full); if (!l.editors.includes(h)) l.editors.push(h); }));
  },
  /** Quem criou tira alguém; quem edita sai sozinho (person = a própria pessoa). */
  async removeEditor(id: string, person: PersonRef): Promise<void> {
    if (supa()) { await rpc('list_editor_remove', { p_id: id, p_user: person.id }); return; }
    dEdit(id, (l) => { const h = person.id === 'demo-me' ? ME : person.handle ?? ''; l.editors = l.editors.filter((e) => e !== h); });
  },
  /** "Baixar tudo": as listas que você criou. */
  async export(): Promise<unknown[]> {
    if (supa()) { const r = await (await client()).rpc('list_export'); return r.error ? [] : (r.data as unknown[]); }
    return dLoad().filter((l) => l.owner === ME).map((l) => ({ title: l.title, description: l.description, visibility: l.visibility, ranked: l.ranked, createdAt: l.createdAt, games: l.items.map((i) => ({ title: i.game.title, note: i.note })) }));
  },
  async bookmark(id: string, on: boolean, key?: string | null): Promise<{ saved: boolean; saves: number }> {
    if (supa()) return rpc('list_bookmark', { p_id: id, p_on: on, p_key: key || null });
    const l = dEdit(id, (x) => { x.saves = x.saves.filter((s) => s !== ME); if (on) x.saves.push(ME); }, false);
    return { saved: on, saves: l.saves.length };
  },
};

/** Busca da demonstração: as suas, as que você edita e as que estão à vista. */
export function demoListSearch(t: string, limit: number): GameList[] {
  const n = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return dLoad().filter((l) => l.items.length && (role(l) || l.visibility === 'publica' || (l.visibility === 'amigos' && friend(l.owner))) && (n(l.title).includes(t) || n(l.description).includes(t))).slice(0, limit).map(card);
}

/** Endereço para compartilhar: com a chave quando a lista é "quem tiver o link". */
export function listUrl(l: Pick<GameList, 'id' | 'visibility' | 'key'>): string {
  return `${location.origin}/lista/${l.id}${l.visibility === 'link' && l.key ? `?k=${l.key}` : ''}`;
}
