/**
 * Discord (J5): ligar a conta, escolher o que o bot publica no canal e cargos ligados.
 * Login e publicação passam pela /api/discord; o estado vem da função my_discord() (migração 0040).
 * Na demonstração não há Discord: a seção explica e o botão não liga nada.
 */
import { getState } from './store';

export type DiscordStatus = { linked: boolean; username?: string | null; avatar?: string | null; shareSessions?: boolean; shareDone?: boolean; shareJogatinas?: boolean; linkedAt?: string };

const supa = () => getState().mode === 'supabase';
const client = async () => (await import('./supabaseAdapter')).getClient();
let cache: DiscordStatus | null = null;

async function api(body: Record<string, unknown>): Promise<any> {
  const { accessToken } = await import('./supabaseAdapter');
  const res = await fetch('/api/discord', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accessToken()}` }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? 'O Discord não respondeu agora.');
  return j;
}

export const discordApi = {
  async status(): Promise<DiscordStatus | null> {
    if (!supa()) return (cache = { linked: false });
    const r = await (await client()).rpc('my_discord');
    if (r.error) return (cache = null); // sem a 0040
    return (cache = r.data as DiscordStatus);
  },
  /** Vai para o login do Discord (volta para as Preferências). */
  async start() {
    if (!supa()) throw new Error('Na demonstração não dá para ligar o Discord. Com a sua conta, funciona.');
    const r = await api({ start: true });
    window.location.assign(r.url);
  },
  async setShare(p: { sessions?: boolean; done?: boolean; jogatinas?: boolean }) {
    const r = await (await client()).rpc('discord_set_share', { p_sessions: p.sessions ?? null, p_done: p.done ?? null, p_jogatinas: p.jogatinas ?? null });
    if (r.error) throw new Error(r.error.message);
    return discordApi.status();
  },
  async unlink() {
    const r = await (await client()).rpc('discord_unlink');
    if (r.error) throw new Error(r.error.message);
    return discordApi.status();
  },
  async roles(): Promise<boolean> { return !!(await api({ roles: true })).ok; },
  async register(): Promise<{ commands: number; roles: number }> { return api({ register: true }); },
  /** Depois de fechar uma sessão, zerar ou marcar uma jogatina: publica no canal se a pessoa escolheu. Nunca atrapalha. */
  publish(kind: 'sessao' | 'zerou' | 'jogatina', id: string) {
    if (!supa() || !getState().profile) return;
    const go = async () => {
      const st = cache ?? (await discordApi.status().catch(() => null));
      if (!st?.linked) return;
      if ((kind === 'sessao' && !st.shareSessions) || (kind === 'zerou' && !st.shareDone) || (kind === 'jogatina' && !st.shareJogatinas)) return;
      await api({ publish: { kind, id } });
    };
    // Espera a gravação no banco terminar antes de pedir a publicação.
    setTimeout(() => { go().catch(() => null); }, 2500);
  },
};
