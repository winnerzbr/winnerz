/**
 * Pontes (J4): Steam e RetroAchievements. Ligar, desligar e buscar passam pela /api/pontes (com a chave do servidor);
 * o que chegou vem pela função my_bridges() (migração 0039). Na demonstração, há uma Steam e um RetroAchievements
 * de exemplo, com sessões inventadas para dar para testar sem conta.
 */
import { useEffect, useState } from 'react';
import { getState } from './store';

export type Provider = 'steam' | 'ra';
export type NowPlaying = { provider: Provider; extGame: string; title: string; console?: string | null; detail?: string | null; igdbId?: number | null; gameId?: string | null };
export type BridgeAccount = { provider: Provider; display?: string | null; auto: boolean; lastSyncAt?: string | null; error?: string | null; nowPlaying?: NowPlaying | null };
export type BridgeItem = {
  id: string; provider: Provider; extGame: string; title: string; console?: string | null; igdbId?: number | null; gameId?: string | null; confirmed: boolean;
  startedAt: string; endedAt: string; minutes: number; detail?: string | null; presence?: string | null; status: 'pendente' | 'registrada' | 'ignorada'; sessionId?: string | null;
};
export type Bridges = { accounts: BridgeAccount[]; items: BridgeItem[]; maps: Record<string, string> };

export const PROVIDER_NAME: Record<Provider, string> = { steam: 'Steam', ra: 'RetroAchievements' };
export const BY: Record<Provider, string> = { steam: 'pela Steam', ra: 'pelo RetroAchievements' };

const supa = () => getState().mode === 'supabase';
const client = async () => (await import('./supabaseAdapter')).getClient();
const MIGRATION = 'Falta rodar a migração 0039 no Supabase.';

async function api(body: Record<string, unknown>): Promise<any> {
  const { accessToken } = await import('./supabaseAdapter');
  const res = await fetch('/api/pontes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? 'As pontes não responderam agora.');
  return j;
}

/* ---- Demonstração ---------------------------------------------------------------------- */
const DKEY = 'wz.demo.pontes';
type Demo = { accounts: BridgeAccount[]; items: BridgeItem[]; maps: Record<string, string> };
const ago = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
function demoLoad(): Demo { try { return JSON.parse(localStorage.getItem(DKEY) || 'null') ?? { accounts: [], items: [], maps: {} }; } catch { return { accounts: [], items: [], maps: {} }; } }
function demoSave(d: Demo) { try { localStorage.setItem(DKEY, JSON.stringify(d)); } catch { /* só nesta visita */ } }
function demoSeed(p: Provider): BridgeItem[] {
  if (p === 'steam') return [
    { id: 'demo-st-1', provider: 'steam', extGame: '2531310', title: 'The Last of Us Part II Remastered', console: 'PC (Steam)', gameId: 'tlou2', confirmed: true, startedAt: ago(27.5), endedAt: ago(26), minutes: 90, status: 'pendente' },
    { id: 'demo-st-2', provider: 'steam', extGame: '1245620', title: 'ELDEN RING', console: 'PC (Steam)', gameId: 'elden', confirmed: true, startedAt: ago(4), endedAt: ago(2.2), minutes: 108, status: 'pendente' },
  ];
  return [{ id: 'demo-ra-1', provider: 'ra', extGame: '2721', title: 'Metal Gear Solid 2: Sons of Liberty', console: 'PlayStation 2', gameId: 'mgs2', confirmed: false, startedAt: ago(30), endedAt: ago(29), minutes: 62,
    detail: '3 conquistas: Tanker, Olga Gurlukovich, Sem alarmes', presence: 'Plant · Strut E · 2 rações', status: 'pendente' }];
}

/* ---- Estado compartilhado (a sincronização roda uma vez; as telas leem daqui) --------------- */
let current: Bridges | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());
function set(b: Bridges | null) { current = b; emit(); }

export const bridgeApi = {
  peek: () => current,
  async status(): Promise<Bridges | null> {
    if (!supa()) { const d = demoLoad(); set({ accounts: d.accounts, items: d.items.filter((i) => i.status === 'pendente'), maps: d.maps }); return current; }
    const r = await (await client()).rpc('my_bridges');
    if (r.error) { set(null); return null; } // sem a 0039: as pontes ficam escondidas
    set(r.data as Bridges);
    return current;
  },
  async link(provider: Provider, value: string): Promise<string | null> {
    if (!supa()) {
      const d = demoLoad();
      const name = provider === 'steam' ? 'voce_na_steam' : value.trim() || 'voce';
      d.accounts = [...d.accounts.filter((a) => a.provider !== provider), { provider, display: name, auto: true, lastSyncAt: new Date().toISOString(), nowPlaying: provider === 'steam' ? { provider, extGame: '1245620', title: 'ELDEN RING', gameId: 'elden' } : null }];
      d.items = [...d.items.filter((i) => i.provider !== provider), ...demoSeed(provider)];
      demoSave(d); await bridgeApi.status();
      return name;
    }
    const r = await api({ link: provider, value });
    await bridgeApi.status();
    return r.display ?? null;
  },
  async unlink(provider: Provider) {
    if (!supa()) { const d = demoLoad(); d.accounts = d.accounts.filter((a) => a.provider !== provider); d.items = d.items.filter((i) => i.provider !== provider || i.status === 'registrada'); demoSave(d); await bridgeApi.status(); return; }
    const r = await (await client()).rpc('bridge_unlink', { p_provider: provider });
    if (r.error) throw new Error(/does not exist|schema cache/i.test(r.error.message) ? MIGRATION : r.error.message);
    await bridgeApi.status();
  },
  async setAuto(provider: Provider, auto: boolean) {
    if (!supa()) { const d = demoLoad(); d.accounts = d.accounts.map((a) => (a.provider === provider ? { ...a, auto } : a)); demoSave(d); await bridgeApi.status(); return; }
    await (await client()).rpc('bridge_set_auto', { p_provider: provider, p_auto: auto });
    await bridgeApi.status();
  },
  /** Busca agora (o servidor respeita o intervalo mínimo). Devolve quantas sessões chegaram. */
  async sync(force = false): Promise<number> {
    if (!supa()) return 0;
    try { const r = await api({ sync: true, force }); return Number(r.added) || 0; } catch { return 0; }
  },
  async mark(id: string, status: 'registrada' | 'ignorada', sessionId?: string | null, gameId?: string | null) {
    if (!supa()) {
      const d = demoLoad();
      const it = d.items.find((i) => i.id === id);
      d.items = d.items.map((i) => (i.id === id ? { ...i, status, sessionId: sessionId ?? i.sessionId, gameId: gameId ?? i.gameId } : i));
      if (status === 'registrada' && it && gameId) d.maps[`${it.provider}:${it.extGame}`] = gameId;
      demoSave(d);
    } else {
      const r = await (await client()).rpc('bridge_mark', { p_id: id, p_status: status, p_session: sessionId ?? null, p_game: gameId ?? null });
      if (r.error) throw new Error(r.error.message);
    }
    if (current) set({ ...current, items: current.items.filter((i) => i.id !== id) });
  },
};

export function useBridges(): Bridges | null {
  const [, tick] = useState(0);
  useEffect(() => { const f = () => tick((n) => n + 1); listeners.add(f); return () => { listeners.delete(f); }; }, []);
  return current;
}
