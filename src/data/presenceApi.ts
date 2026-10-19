/**
 * Presença opcional (Comunidade, entrega F; migração 0046). "Online agora" e "jogando X agora", só para amigos e só
 * para quem ligou nas Preferências (de mão dupla: quem esconde a sua não vê a dos outros). Na demonstração, as pessoas
 * de exemplo aparecem quando você liga.
 */
import { useEffect, useState } from 'react';
import { getState, useStore } from './store';
import type { PersonRef } from './communityApi';
import { FEATURES } from '../lib/features';

export type Presence = { online: boolean; game: { id?: string | null; slug?: string | null; title: string; cover?: string | null; since?: string; via?: string } | null };
export type FriendNow = { person: PersonRef; presence: Presence };

const supa = () => getState().mode === 'supabase';
const on = () => getState().prefs.comunidade?.presenca === 'amigos';
const client = async () => (await import('./supabaseAdapter')).getClient();

const DEMO: FriendNow[] = [
  { person: { id: 'demo-duda', handle: 'duda', avatar: null }, presence: { online: true, game: { id: 'astro', slug: 'astro-bot', title: 'Astro Bot', cover: '/demo/cover-astro.webp', since: new Date(Date.now() - 40 * 60_000).toISOString(), via: 'site' } } },
  { person: { id: 'demo-rafa', handle: 'rafa', avatar: null }, presence: { online: true, game: null } },
];

export const presenceApi = {
  async ping() { if (supa() && on()) await (await client()).rpc('presence_ping'); },
  async off() { if (supa()) await (await client()).rpc('presence_off'); },
  async friends(): Promise<FriendNow[]> {
    if (!on()) return [];
    if (!supa()) return DEMO;
    const r = await (await client()).rpc('friends_presence');
    return r.error ? [] : (r.data as FriendNow[]);
  },
  async of(handle: string): Promise<Presence | null> {
    if (!on()) return null;
    if (!supa()) return DEMO.find((d) => d.person.handle === handle.toLowerCase())?.presence ?? null;
    const r = await (await client()).rpc('presence_of', { p_handle: handle });
    return r.error ? null : (r.data as Presence | null);
  },
};

/** Batimento: a cada 2 minutos com a aba visível, só para quem ligou a presença. */
export function usePresencePing() {
  const enabled = useStore((s) => s.mode === 'supabase' && !!s.profile && s.prefs.comunidade?.presenca === 'amigos') && FEATURES.presenca;
  useEffect(() => {
    if (!enabled) return;
    void presenceApi.ping();
    const t = setInterval(() => { if (document.visibilityState === 'visible') void presenceApi.ping(); }, 120_000);
    const vis = () => { if (document.visibilityState === 'visible') void presenceApi.ping(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [enabled]);
}

export function usePresenceOf(handle?: string | null): Presence | null {
  const enabled = useStore((s) => s.prefs.comunidade?.presenca === 'amigos') && FEATURES.presenca;
  const [p, setP] = useState<Presence | null>(null);
  useEffect(() => {
    if (!handle || !enabled) { setP(null); return; }
    let alive = true;
    const load = () => presenceApi.of(handle).then((x) => { if (alive) setP(x); }).catch(() => null);
    void load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [handle, enabled]);
  return p;
}

export function useFriendsNow(): FriendNow[] | null {
  const enabled = useStore((s) => s.prefs.comunidade?.presenca === 'amigos') && FEATURES.presenca;
  const [l, setL] = useState<FriendNow[] | null>(null);
  useEffect(() => {
    if (!enabled) { setL(null); return; }
    let alive = true;
    const load = () => presenceApi.friends().then((x) => { if (alive) setL(x); }).catch(() => null);
    void load();
    const t = setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [enabled]);
  return l;
}
