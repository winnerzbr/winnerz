/**
 * Capítulos do jogo (J3), montados pela comunidade. Com conta, tudo passa pelas funções do banco (migração 0038),
 * que conferem quem pode editar. Na demonstração, a lista fica neste navegador.
 */
import { useEffect, useState } from 'react';
import { getState, useStore } from './store';
import { cleanParts, type GameOutline, type OutlinePart } from '../lib/outline';

export type OutlineEdit = { id: string; handle?: string | null; at: string; version: number; note?: string | null; count: number };

const MSG: Record<string, string> = {
  outline_forbidden: 'Só quem tem o jogo na Jornada pode editar os capítulos.',
  outline_conflict: 'Alguém editou a lista enquanto você mexia. Abra de novo para ver a versão nova.',
  outline_limit: 'Você já fez 30 edições hoje. Volte amanhã.',
  outline_too_long: 'A lista pode ter até 60 capítulos.',
  not_logged: 'Entre na sua conta para editar.',
};
const ok = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(MSG).find((x) => m.includes(x));
    if (k) throw new Error(MSG[k]);
    if (/outline_/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0038 no Supabase.');
    throw new Error(m);
  }
  return r.data;
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';

// Demonstração: uma lista de exemplo para The Last of Us Part II; as edições ficam neste navegador.
const SEED: Record<string, OutlinePart[]> = {
  tlou2: [
    { id: 'jackson', name: 'Jackson', pct: 0, minutes: 120, stop: 'qualquer', note: 'O jogo salva sozinho com frequência.' },
    { id: 's1', name: 'Seattle, dia 1', pct: 15, minutes: 300, stop: 'fim', note: 'Cada área do centro salva ao entrar.' },
    { id: 's2', name: 'Seattle, dia 2', pct: 40, minutes: 240, stop: 'pontos', note: 'Abrigos e portas trancadas costumam salvar.' },
    { id: 's3', name: 'Seattle, dia 3', pct: 60, minutes: 180, stop: 'fim', spoiler: true },
    { id: 'fazenda', name: 'A fazenda', pct: 85, minutes: 90, stop: 'qualquer', spoiler: true },
    { id: 'santa', name: 'O último capítulo', pct: 92, minutes: 120, stop: 'longe', spoiler: true },
  ],
};
const dkey = (g: string) => `wz.demo.outline.${g}`;
function demoGet(gameId: string): GameOutline {
  try { const v = JSON.parse(localStorage.getItem(dkey(gameId)) || 'null'); if (v) return { ...v, canEdit: true }; } catch { /* sem armazenamento */ }
  const parts = SEED[gameId] ?? [];
  return { gameId, parts, version: parts.length ? 3 : 0, updatedAt: parts.length ? '2026-09-30T20:00:00Z' : null, edits: parts.length ? 3 : 0, editors: parts.length ? 2 : 0, canEdit: true };
}

const cache = new Map<string, GameOutline | null>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

export const outlineApi = {
  peek: (gameId: string) => cache.get(gameId),
  async get(gameId: string, fresh = false): Promise<GameOutline | null> {
    if (!fresh && cache.has(gameId)) return cache.get(gameId)!;
    let v: GameOutline | null;
    if (!supa()) v = demoGet(gameId);
    else {
      const r = await (await client()).rpc('outline_get', { p_game: gameId });
      v = r.error ? null : (r.data as GameOutline | null); // sem a 0038, a página segue sem capítulos
    }
    cache.set(gameId, v); emit();
    return v;
  },
  async save(gameId: string, parts: OutlinePart[], version: number, note?: string): Promise<GameOutline> {
    const clean = cleanParts(parts);
    let v: GameOutline;
    if (!supa()) {
      const cur = demoGet(gameId);
      if (cur.version !== version) throw new Error(MSG.outline_conflict);
      v = { gameId, parts: clean, version: version + 1, updatedAt: new Date().toISOString(), edits: (cur.edits ?? 0) + 1, editors: Math.max(1, cur.editors ?? 0), canEdit: true };
      try { localStorage.setItem(dkey(gameId), JSON.stringify(v)); } catch { /* só nesta visita */ }
    } else {
      v = ok(await (await client()).rpc('outline_save', { p_game: gameId, p_parts: clean, p_version: version, p_note: note ?? null })) as GameOutline;
    }
    cache.set(gameId, v); emit();
    return v;
  },
  async history(gameId: string): Promise<OutlineEdit[]> {
    if (!supa()) { const o = demoGet(gameId); return o.version ? [{ id: 'demo', handle: 'duda', at: o.updatedAt ?? new Date().toISOString(), version: o.version, note: 'Exemplo da demonstração', count: o.parts.length }] : []; }
    return ok(await (await client()).rpc('outline_history', { p_game: gameId })) as OutlineEdit[];
  },
  async revert(gameId: string, editId: string): Promise<GameOutline> {
    const v = ok(await (await client()).rpc('outline_revert', { p_edit: editId })) as GameOutline;
    cache.set(gameId, v); emit();
    return v;
  },
};

/** A lista de capítulos do jogo (carrega uma vez e acompanha as edições). */
export function useOutline(gameId: string | undefined): GameOutline | null | undefined {
  const mode = useStore((s) => s.mode);
  const logged = useStore((s) => !!s.profile);
  const [, tick] = useState(0);
  useEffect(() => {
    const f = () => tick((n) => n + 1);
    listeners.add(f);
    return () => { listeners.delete(f); };
  }, []);
  useEffect(() => {
    if (!gameId || (mode === 'supabase' && !logged)) return;
    if (!cache.has(gameId)) outlineApi.get(gameId).catch(() => null);
  }, [gameId, mode, logged]);
  return gameId ? cache.get(gameId) : undefined;
}
