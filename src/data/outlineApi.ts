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
    if (/outline_confirm/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0058 no Supabase.');
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
// Demonstração: um rascunho da IA ainda sem confirmação (para ver o selo "Inferido · confira").
const AI_SEED: Record<string, OutlinePart[]> = {
  astro: [
    { id: 'c1', name: 'Crash Site', pct: 0, minutes: 30, stop: 'qualquer', group: 'O começo', kind: 'área' },
    { id: 'c2', name: 'Skipping Sands', pct: 8, minutes: 25, stop: 'fim', group: 'Galáxia Tormenta do Bot', kind: 'fase' },
    { id: 'c3', name: 'Bot of War', pct: 18, minutes: 20, stop: 'fim', group: 'Galáxia Tormenta do Bot', kind: 'chefe' },
    { id: 'c4', name: 'Sky Garden', pct: 30, minutes: 25, stop: 'fim', group: 'Galáxia Garra do Polvo', kind: 'fase' },
    { id: 'c5', name: 'Galáxia Supernova Lunar', pct: 55, minutes: 120, stop: 'fim', spoiler: true, group: 'Galáxia Supernova Lunar' },
    { id: 'c6', name: 'Nebulosa Sombria', pct: 78, minutes: 90, stop: 'fim', spoiler: true, group: 'Nebulosa Sombria' },
    { id: 'c7', name: 'O resgate final', pct: 92, minutes: 45, stop: 'longe', spoiler: true, group: 'Nebulosa Sombria', kind: 'chefe' },
  ],
};
const dkey = (g: string) => `wz.demo.outline.${g}`;
function demoGet(gameId: string): GameOutline {
  try { const v = JSON.parse(localStorage.getItem(dkey(gameId)) || 'null'); if (v) return { ...v, canEdit: true }; } catch { /* sem armazenamento */ }
  if (AI_SEED[gameId]) return { gameId, parts: AI_SEED[gameId], version: 1, updatedAt: '2026-10-16T12:00:00Z', edits: 0, editors: 0, canEdit: true, origin: 'ia', structure: 'fases', confirms: 1, confirmed: false, mine: false, job: 'feito',
    sources: [{ label: 'astrobot wiki (Fandom)', url: 'https://astrobot.fandom.com/wiki/Astro_Bot', license: 'CC BY-SA' }] };
  const parts = SEED[gameId] ?? [];
  return { gameId, parts, version: parts.length ? 3 : 0, updatedAt: parts.length ? '2026-09-30T20:00:00Z' : null, edits: parts.length ? 3 : 0, editors: parts.length ? 2 : 0, canEdit: true, origin: 'comunidade', confirmed: true };
}

const cache = new Map<string, GameOutline | null>();
const asked = new Set<string>();
const working = new Set<string>();
type AutoState = 'sem_lista' | 'limite' | 'erro';
const status = new Map<string, { state: AutoState; reason?: string }>();
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
      v = { gameId, parts: clean, version: version + 1, updatedAt: new Date().toISOString(), edits: (cur.edits ?? 0) + 1, editors: Math.max(1, cur.editors ?? 0), canEdit: true, origin: 'comunidade', confirmed: true, sources: cur.sources };
      try { localStorage.setItem(dkey(gameId), JSON.stringify(v)); } catch { /* só nesta visita */ }
    } else {
      v = ok(await (await client()).rpc('outline_save', { p_game: gameId, p_parts: clean, p_version: version, p_note: note ?? null })) as GameOutline;
    }
    cache.set(gameId, v); emit();
    return v;
  },
  /** "Está certo": confirma o rascunho da IA (3 confirmações viram "Confirmado pela comunidade"). */
  async confirm(gameId: string, version: number): Promise<GameOutline> {
    let v: GameOutline;
    if (!supa()) {
      const cur = demoGet(gameId);
      const confirms = (cur.confirms ?? 0) + (cur.mine ? 0 : 1);
      v = { ...cur, confirms, mine: true, confirmed: confirms >= 3 };
      try { localStorage.setItem(dkey(gameId), JSON.stringify(v)); } catch { /* só nesta visita */ }
    } else {
      v = ok(await (await client()).rpc('outline_confirm', { p_game: gameId, p_version: version })) as GameOutline;
    }
    cache.set(gameId, v); emit();
    return v;
  },
  /**
   * Rascunho automático (C1): pede ao servidor para montar a lista de um jogo sem capítulos. Quando outra pessoa
   * já pediu, espera a lista aparecer. Uma vez por jogo nesta visita; sem a IA ligada no servidor, não faz nada.
   */
  async auto(gameId: string, force = false): Promise<GameOutline | null> {
    if (!supa() || (asked.has(gameId) && !force)) return cache.get(gameId) ?? null;
    asked.add(gameId);
    working.add(gameId); status.delete(gameId); emit();
    try {
      const { accessToken } = await import('./supabaseAdapter');
      const r = await fetch('/api/retomada', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` }, body: JSON.stringify({ kind: 'capitulos', game: gameId, force }) });
      const j = (await r.json().catch(() => null)) as { state?: string; reason?: string; error?: string; diag?: string } | null;
      if (!r.ok) status.set(gameId, { state: 'erro', reason: j?.error ?? 'O servidor não respondeu agora.' });
      else if (j?.state && j.state !== 'pronto' && j.state !== 'rodando') status.set(gameId, { state: j.state as AutoState, reason: j.reason && j.diag ? `${j.reason} (${j.diag})` : j.reason });
      if (j?.state === 'rodando') {
        for (let i = 0; i < 24; i++) {
          await new Promise((ok2) => setTimeout(ok2, 5000));
          const o = await outlineApi.get(gameId, true);
          if (o?.parts.length || (o?.job && o.job !== 'rodando')) break;
        }
      }
      return await outlineApi.get(gameId, true);
    } catch { status.set(gameId, { state: 'erro', reason: 'Sem conexão com o servidor.' }); return cache.get(gameId) ?? null; } finally { working.delete(gameId); emit(); }
  },
  /** Como foi a última tentativa do rascunho automático nesta visita (sem lista, limite do dia ou erro, com o motivo). */
  autoStatus: (gameId: string) => status.get(gameId),
  /** O rascunho automático está sendo montado agora (nesta visita). */
  working: (gameId: string) => working.has(gameId),
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
