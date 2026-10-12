/**
 * Trilhas: sequências de jogos com um fio (ex.: "Para começar em soulslike", "A saga Metal Gear em ordem").
 * Montadas pela administração; quem joga vê o próprio caminho nelas (zerado, jogando, na estante).
 * Com conta, ficam no Supabase (migração 0008). No modo demonstração, uma trilha de exemplo neste navegador.
 */
import { getState } from './store';
import { getClient } from './supabaseAdapter';
import type { Game } from './types';

export type TrailGame = { id: string; slug: string; title: string; cover: string; year?: number; igdbId?: number };
export type TrailItem = { id: string; gameId: string; note?: string; position: number; game: TrailGame };
export type Trail = { id: string; slug: string; title: string; intro?: string; published: boolean; position: number; items: TrailItem[] };

export interface TrailsApi {
  list(): Promise<Trail[]>;
  saveTrail(t: { id?: string; slug: string; title: string; intro?: string; published: boolean; position?: number }): Promise<Trail>;
  deleteTrail(id: string): Promise<void>;
  addItem(trailId: string, game: Game, position: number): Promise<void>;
  updateItem(id: string, patch: { note?: string; position?: number }): Promise<void>;
  deleteItem(id: string): Promise<void>;
}

const gameOf = (g: any): TrailGame => ({ id: g.id, slug: g.slug, title: g.title, cover: g.cover ?? '', year: g.year ?? undefined, igdbId: g.igdb_id ?? g.igdbId ?? undefined });
const ok = <T>(r: { data: T; error: { message: string } | null }): T => { if (r.error) throw new Error(r.error.message.includes('trails') ? 'Falta rodar a migração 0008 no Supabase.' : r.error.message); return r.data; };

const supabaseApi: TrailsApi = {
  async list() {
    const sb = await getClient();
    const trails = ok(await sb.from('trails').select('*').order('position').order('created_at')) as any[];
    if (!trails.length) return [];
    const items = ok(await sb.from('trail_items').select('*, games(id,slug,title,cover,year,igdb_id)').in('trail_id', trails.map((t) => t.id)).order('position')) as any[];
    return trails.map((t) => ({
      id: t.id, slug: t.slug, title: t.title, intro: t.intro ?? undefined, published: !!t.published, position: t.position,
      items: items.filter((i) => i.trail_id === t.id && i.games).map((i) => ({ id: i.id, gameId: i.game_id, note: i.note ?? undefined, position: i.position, game: gameOf(i.games) })),
    }));
  },
  async saveTrail(t) {
    const sb = await getClient();
    const row = { slug: t.slug, title: t.title, intro: t.intro ?? null, published: t.published, ...(t.position != null ? { position: t.position } : {}) };
    const r = ok(t.id ? await sb.from('trails').update(row).eq('id', t.id).select().single() : await sb.from('trails').insert(row).select().single()) as any;
    return { id: r.id, slug: r.slug, title: r.title, intro: r.intro ?? undefined, published: r.published, position: r.position, items: [] };
  },
  async deleteTrail(id) { const sb = await getClient(); ok(await sb.from('trails').delete().eq('id', id)); },
  async addItem(trailId, game, position) {
    const sb = await getClient();
    ok(await sb.from('trail_items').upsert({ trail_id: trailId, game_id: game.id, position }, { onConflict: 'trail_id,game_id', ignoreDuplicates: true }));
  },
  async updateItem(id, patch) {
    const sb = await getClient();
    ok(await sb.from('trail_items').update({ ...(patch.note !== undefined ? { note: patch.note || null } : {}), ...(patch.position != null ? { position: patch.position } : {}) }).eq('id', id));
  },
  async deleteItem(id) { const sb = await getClient(); ok(await sb.from('trail_items').delete().eq('id', id)); },
};

/* ---- Demonstração ------------------------------------------------------------------------ */

type DemoDb = { trails: Omit<Trail, 'items'>[]; items: (Omit<TrailItem, 'game'> & { trailId: string })[] };
const KEY = 'wz.trilhas.demo.v1';
const rid = () => Math.random().toString(36).slice(2, 10);

function demoDb(): DemoDb {
  try { const x = localStorage.getItem(KEY); if (x) return JSON.parse(x); } catch { /* recomeça */ }
  const ids = ['mgs2', 'kz2', 'infamous', 'tlou2'].filter((id) => getState().games[id]);
  const db: DemoDb = {
    trails: [{ id: 't1', slug: 'classicos-da-playstation', title: 'Clássicos da PlayStation', intro: 'Uma volta pelos jogos que marcaram cada geração, do PS2 ao PS4. Exemplo de trilha.', published: true, position: 0 }],
    items: ids.map((gameId, k) => ({ id: rid(), trailId: 't1', gameId, position: k, note: k === 0 ? 'Comece pelo que inventou o gênero de furtividade moderno.' : undefined })),
  };
  save(db);
  return db;
}
function save(db: DemoDb) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* só nesta visita */ } }

const demoApi: TrailsApi = {
  async list() {
    const db = demoDb(), games = getState().games;
    return db.trails.sort((a, b) => a.position - b.position).map((t) => ({
      ...t, items: db.items.filter((i) => i.trailId === t.id && games[i.gameId]).sort((a, b) => a.position - b.position).map((i) => ({ id: i.id, gameId: i.gameId, note: i.note, position: i.position, game: gameOf(games[i.gameId]) })),
    }));
  },
  async saveTrail(t) {
    const db = demoDb();
    const full = { id: t.id ?? rid(), slug: t.slug, title: t.title, intro: t.intro, published: t.published, position: t.position ?? db.trails.length };
    db.trails = [...db.trails.filter((x) => x.id !== full.id), full];
    save(db);
    return { ...full, items: [] };
  },
  async deleteTrail(id) { const db = demoDb(); db.trails = db.trails.filter((t) => t.id !== id); db.items = db.items.filter((i) => i.trailId !== id); save(db); },
  async addItem(trailId, game, position) { const db = demoDb(); if (!db.items.some((i) => i.trailId === trailId && i.gameId === game.id)) db.items.push({ id: rid(), trailId, gameId: game.id, position }); save(db); },
  async updateItem(id, patch) { const db = demoDb(); db.items = db.items.map((i) => (i.id === id ? { ...i, ...(patch.note !== undefined ? { note: patch.note || undefined } : {}), ...(patch.position != null ? { position: patch.position } : {}) } : i)); save(db); },
  async deleteItem(id) { const db = demoDb(); db.items = db.items.filter((i) => i.id !== id); save(db); },
};

export function trailsApi(): TrailsApi { return getState().mode === 'supabase' ? supabaseApi : demoApi; }
