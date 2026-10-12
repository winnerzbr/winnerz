/**
 * Completa, em segundo plano, as fichas do seu acervo que ainda não têm tempo para zerar,
 * modos e temas (usados no DNA de experiência e no "O que jogar"). Uma vez por mês por jogo,
 * em lotes de 100, sem travar nada: se o IGDB falhar, tenta de novo outro dia.
 */
import { getState, actions } from '../data/store';
import type { Game } from '../data/types';
import { gameFromApi } from '../components/AddGameDialog';

const KEY = 'wz.fatos.v1';
const MONTH = 30 * 24 * 3600 * 1000;
let running = false;

function tried(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; }
}
function remember(t: Record<string, number>) {
  try { localStorage.setItem(KEY, JSON.stringify(t)); } catch { /* sem armazenamento: tenta de novo na próxima visita */ }
}

export async function backfillGameFacts() {
  const s = getState();
  if (running || s.mode !== 'supabase' || !s.schemaV6 || !s.profile) return;
  running = true;
  try {
    const mine = new Set([...s.copies.map((c) => c.gameId), ...s.wishes.map((w) => w.gameId), ...s.journeys.map((j) => j.gameId)]);
    const t = tried(), now = Date.now();
    const need = Object.values(s.games).filter((g) => mine.has(g.id) && g.igdbId && g.ttb == null && !(t[g.igdbId] && now - t[g.igdbId] < MONTH)).map((g) => g.igdbId!);
    for (let i = 0; i < need.length; i += 100) {
      const batch = need.slice(i, i + 100);
      const r = await fetch('/api/igdb', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cache: batch }) });
      if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) break;
      const rows: any[] = await r.json();
      const st = getState();
      const byIgdb = new Map(Object.values(st.games).filter((g) => g.igdbId).map((g) => [g.igdbId!, g]));
      const merged: Game[] = [];
      for (const row of rows) {
        const fresh = gameFromApi(row), old = byIgdb.get(fresh.igdbId!);
        // Só os fatos leves: a sinopse, os vídeos e o resto da ficha de antes continuam.
        if (old) merged.push({ ...old, ttb: fresh.ttb ?? old.ttb, modes: fresh.modes ?? old.modes, themes: fresh.themes ?? old.themes, releasedOn: fresh.releasedOn ?? old.releasedOn, genres: old.genres ?? fresh.genres });
      }
      if (merged.length) actions.mergeGames(merged);
      for (const id of batch) t[id] = now;
      remember(t);
      await new Promise((ok) => setTimeout(ok, 1500));
    }
  } catch { /* tenta outro dia */ } finally { running = false; }
}
