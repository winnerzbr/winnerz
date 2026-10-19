/**
 * Pactos entre amigos (J6): um jogo, um combinado leve e um prazo opcional. Sem sequência, sem "perdeu".
 * Com conta, tudo passa pelas funções do banco (migração 0041). Na demonstração, fica neste navegador.
 */
import { useEffect, useState } from 'react';
import { getState, useStore } from './store';
import { FEATURES } from '../lib/features';
import { setupNote } from '../lib/setupNote';

export type PactPerson = { handle: string | null; avatar?: string | null; me: boolean; status: 'convidado' | 'dentro'; progress?: number | null; lastAt?: string | null; doneAt?: string | null };
export type Pact = {
  id: string; goal: 'zerar' | 'jogar'; until?: string | null; note?: string | null; createdAt: string; endedAt?: string | null;
  game: { id: string; title: string; slug: string; cover?: string | null }; mine: boolean; me: 'convidado' | 'dentro' | 'saiu' | null; people: PactPerson[];
};

const MSG: Record<string, string> = {
  pact_nobody: 'Escolha pelo menos um amigo (quem se segue de volta).',
  pact_too_many: 'Um pacto pode ter até 8 pessoas.',
  pact_limit: 'Você já está em 10 pactos. Saia de algum antes.',
  pact_goal: 'Escolha o combinado.',
  not_logged: 'Entre na sua conta.',
};
const ok = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(MSG).find((x) => m.includes(x));
    if (k) throw new Error(MSG[k]);
    if (/pact_|my_pacts/.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error(setupNote('Falta rodar a migração 0041 no Supabase.'));
    throw new Error(m);
  }
  return r.data;
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';

/* ---- Demonstração ---------------------------------------------------------------------- */
const DKEY = 'wz.demo.pactos';
function demoLoad(): Pact[] {
  try { const v = JSON.parse(localStorage.getItem(DKEY) || 'null'); if (v) return v; } catch { /* começa do exemplo */ }
  const s = getState(), g = s.games.tlou2;
  if (!g) return [];
  const mine = s.histories.filter((h) => h.journeyId === 'j-tlou2').sort((a, b) => b.ordinal - a.ordinal)[0];
  return [{
    id: 'pacto-demo', goal: 'zerar', until: '2026-11-30', note: 'Sem pressa, mas até o fim de novembro', createdAt: '2026-10-01T20:00:00-03:00',
    game: { id: g.id, title: g.title, slug: g.slug, cover: g.cover }, mine: false, me: 'dentro',
    people: [
      { handle: 'voce', me: true, status: 'dentro', progress: mine?.progress ?? null, lastAt: s.sessions.filter((x) => x.journeyId === 'j-tlou2' && x.endedAt).map((x) => x.endedAt!).sort().at(-1) ?? null },
      { handle: 'duda', me: false, status: 'dentro', progress: 62, lastAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
    ],
  }];
}
function demoSave(p: Pact[]) { try { localStorage.setItem(DKEY, JSON.stringify(p)); } catch { /* só nesta visita */ } }

let cache: Pact[] | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

export const pactApi = {
  async mine(): Promise<Pact[] | null> {
    if (!supa()) { cache = demoLoad(); emit(); return cache; }
    const r = await (await client()).rpc('my_pacts');
    cache = r.error ? null : ((r.data as Pact[]) ?? []);
    emit();
    return cache;
  },
  async create(d: { gameId: string; goal: 'zerar' | 'jogar'; until?: string | null; note?: string; handles: string[] }): Promise<Pact> {
    if (!d.handles.length) throw new Error(MSG.pact_nobody);
    if (!supa()) {
      const g = getState().games[d.gameId];
      const p: Pact = { id: `pacto-${Date.now().toString(36)}`, goal: d.goal, until: d.until ?? null, note: d.note ?? null, createdAt: new Date().toISOString(), game: { id: g.id, title: g.title, slug: g.slug, cover: g.cover }, mine: true, me: 'dentro',
        people: [{ handle: 'voce', me: true, status: 'dentro' }, ...d.handles.map((h) => ({ handle: h.replace(/^@/, ''), me: false, status: 'convidado' as const }))] };
      demoSave([p, ...demoLoad()]); await pactApi.mine(); return p;
    }
    const p = ok(await (await client()).rpc('pact_create', { p_game: d.gameId, p_goal: d.goal, p_until: d.until || null, p_note: d.note ?? null, p_handles: d.handles })) as Pact;
    await pactApi.mine();
    return p;
  },
  async respond(id: string, accept: boolean) {
    if (!supa()) { demoSave(demoLoad().map((p): Pact => (p.id === id ? { ...p, me: accept ? 'dentro' : 'saiu' } : p)).filter((p) => p.me !== 'saiu')); await pactApi.mine(); return; }
    ok(await (await client()).rpc('pact_respond', { p_id: id, p_accept: accept }));
    await pactApi.mine();
  },
  async leave(id: string) {
    if (!supa()) { demoSave(demoLoad().filter((p) => p.id !== id)); await pactApi.mine(); return; }
    ok(await (await client()).rpc('pact_leave', { p_id: id }));
    await pactApi.mine();
  },
};

/** Os pactos da pessoa (carrega uma vez; acompanha as mudanças). */
export function usePacts(): Pact[] | null | undefined {
  const mode = useStore((s) => s.mode);
  const logged = useStore((s) => !!s.profile);
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((n) => n + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  useEffect(() => { if (!FEATURES.pactos || (mode === 'supabase' && !logged)) return; if (cache === null || cache === undefined) pactApi.mine().catch(() => null); }, [mode, logged]);
  // Pactos escondidos por enquanto (lib/features.ts): null faz as telas agirem como se não existissem.
  return FEATURES.pactos ? cache : null;
}
