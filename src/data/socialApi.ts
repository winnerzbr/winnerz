/**
 * Seguir e amigos (Etapa 6, entrega 3). Seguir não pede aprovação; quando os dois se seguem, viram amigos.
 * Com conta, tudo passa pelas funções do banco (migração 0025). Na demonstração, há pessoas de exemplo.
 */
import { getState } from './store';
import { DEMO_PEOPLE, demoActivity, demoFollowing, demoFollowsMe, demoPerson, demoRemoveFollower, demoSetFollow } from './demoPeople';

export interface FollowState { following: boolean; followedBy: boolean; followers: number; followingCount: number; blocked: boolean; self: boolean }
export interface Person { id: string; handle: string | null; avatar?: string | null; bio?: string | null; at: string; mutual: boolean }
export interface People { following: Person[]; followers: Person[] }
export interface Activity { kind: 'jogando' | 'zerou' | 'momento'; handle: string; avatar?: string | null; title: string; slug: string; cover?: string | null; at: string; detail?: string | null; shared: boolean }

const MSG: Record<string, string> = {
  follow_blocked: 'Não dá para seguir este perfil.',
  follow_self: 'Esse perfil é seu.',
  follow_limit: 'Você já seguiu 200 perfis hoje. Volte amanhã.',
  target_not_found: 'Não achei esse perfil.',
  not_logged: 'Entre na sua conta para seguir.',
};
const ok = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(MSG).find((x) => m.includes(x));
    if (k) throw new Error(MSG[k]);
    if (/follow_|my_people|friends_activity|remove_follower|schema cache/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0025 no Supabase.');
    throw new Error(m);
  }
  return r.data;
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';

function demoState(handle: string): FollowState | null {
  const p = demoPerson(handle);
  if (!p) return { following: false, followedBy: false, followers: 0, followingCount: 0, blocked: false, self: true };
  const following = demoFollowing().includes(p.handle);
  return { following, followedBy: demoFollowsMe(p), followers: (p.followsYou ? 3 : 1) + (following ? 1 : 0), followingCount: p.followsYou ? 4 : 2, blocked: false, self: false };
}

export const socialApi = {
  async state(handle: string): Promise<FollowState | null> {
    if (!supa()) return demoState(handle);
    const r = await (await client()).rpc('follow_state', { p_handle: handle });
    if (r.error) return null; // sem a 0025, o botão não aparece
    return r.data as FollowState | null;
  },
  async follow(handle: string): Promise<FollowState | null> {
    if (!supa()) { demoSetFollow(demoPerson(handle)?.handle ?? handle, true); return demoState(handle); }
    return ok(await (await client()).rpc('follow_user', { p_handle: handle })) as FollowState;
  },
  async unfollow(handle: string): Promise<FollowState | null> {
    if (!supa()) { demoSetFollow(demoPerson(handle)?.handle ?? handle, false); return demoState(handle); }
    return ok(await (await client()).rpc('unfollow_user', { p_handle: handle })) as FollowState;
  },
  async removeFollower(id: string, handle: string | null): Promise<void> {
    if (!supa()) { if (handle) demoRemoveFollower(handle); return; }
    ok(await (await client()).rpc('remove_follower', { p_id: id }));
  },
  async people(): Promise<People> {
    if (!supa()) {
      const ing = demoFollowing();
      const row = (p: (typeof DEMO_PEOPLE)[number], mutual: boolean): Person => ({ id: p.id, handle: p.handle, bio: p.bio, avatar: null, at: p.since, mutual });
      return {
        following: DEMO_PEOPLE.filter((p) => ing.includes(p.handle)).map((p) => row(p, demoFollowsMe(p))),
        followers: DEMO_PEOPLE.filter((p) => demoFollowsMe(p)).map((p) => row(p, ing.includes(p.handle))),
      };
    }
    return (ok(await (await client()).rpc('my_people')) as People | null) ?? { following: [], followers: [] };
  },
  async activity(): Promise<Activity[]> {
    if (!supa()) return demoActivity();
    return (ok(await (await client()).rpc('friends_activity', { p_limit: 40 })) as Activity[] | null) ?? [];
  },
};
