/**
 * E7.3 · Pontos do canal na Twitch (migração 0069): ligar a conta da Twitch (login pela própria Twitch) e, no Studio,
 * autorizar o canal e escolher a recompensa. O resto acontece no servidor (/api/pontes), quando a Twitch avisa.
 */
import { getState } from './store';

export interface MyTwitch { linked: { login: string; display: string | null; at: string } | null; reward: string | null; channel: string | null; packs: number }
export interface StudioTwitch {
  channel: { login: string | null; authorized: boolean; rewardTitle: string; packKind: 'onix' | 'prisma'; subStatus: string | null; updatedAt: string } | null;
  links: number; recent: { login: string | null; reward: string | null; at: string; state: 'entregue' | 'pendente' | 'limite'; handle: string | null }[];
}

const supa = () => getState().mode === 'supabase';
const client = async () => (await import('./supabaseAdapter')).getClient();
const MIG = 'Falta rodar a migração 0069 no Supabase.';
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const r = await (await client()).rpc(fn, args);
  if (r.error) throw new Error(/not find|does not exist|schema cache/i.test(r.error.message) ? MIG : /not_admin/.test(r.error.message) ? 'Só a administração pode fazer isso.' : r.error.message);
  return r.data as T;
}
async function api(body: Record<string, unknown>): Promise<any> {
  const { accessToken } = await import('./supabaseAdapter');
  const res = await fetch('/api/pontes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? 'A Twitch não respondeu agora.');
  return j;
}

export const twitchApi = {
  async mine(): Promise<MyTwitch | null> {
    if (!supa()) return { linked: null, reward: 'Figurinha WinnerZ', channel: 'winnerz', packs: 0 };
    try { return await rpc<MyTwitch>('my_twitch'); } catch { return null; }
  },
  /** Vai para o login da Twitch; a volta cai nas Preferências. */
  async link() {
    if (!supa()) throw new Error('Na demonstração não dá para ligar a Twitch.');
    const r = await api({ link: 'twitch' });
    window.location.assign(r.url);
  },
  async unlink() { if (supa()) await rpc('twitch_unlink'); },
  async studio(): Promise<StudioTwitch> {
    if (!supa()) return { channel: null, links: 0, recent: [] };
    return rpc<StudioTwitch>('studio_twitch');
  },
  async save(rewardTitle: string, packKind: 'onix' | 'prisma'): Promise<StudioTwitch> {
    if (!supa()) throw new Error('Na demonstração não dá para configurar a Twitch.');
    return rpc<StudioTwitch>('studio_twitch_set', { p: { rewardTitle, packKind } });
  },
  /** A conta do canal autoriza o WinnerZ a ler os resgates (abre o login da Twitch). */
  async authorizeChannel() {
    if (!supa()) throw new Error('Na demonstração não dá para autorizar o canal.');
    const r = await api({ twitchCanal: true });
    window.location.assign(r.url);
  },
  async resubscribe(): Promise<string> {
    const r = await api({ twitchSub: true });
    return String(r.status ?? '');
  },
};
