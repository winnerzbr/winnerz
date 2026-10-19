/**
 * Busca na Comunidade (entrega G; migração 0047): pessoas, comunidades, conversas, clubes e jogatinas numa chamada,
 * respeitando o que cada pessoa pode ver. Na demonstração, procura nas pessoas e comunidades de exemplo.
 */
import { getState } from './store';
import type { PersonRef } from './communityApi';
import { DEMO_PEOPLE } from './demoPeople';
import type { GameList } from './listsApi';

export type SearchGame = { title: string; cover?: string | null; slug: string } | null;
export interface CommunityHits {
  pessoas: (PersonRef & { bio?: string })[];
  comunidades: { slug: string; name: string; description: string; official: boolean; members: number }[];
  conversas: { id: string; title: string; excerpt: string | null; spoiler: boolean; author: PersonRef | null; at: string; place: string; game: string | null; replies: number }[];
  clubes: { slug: string; name: string; description: string; format: string; game: SearchGame; members: number }[];
  jogatinas: { id: string; title: string; startsAt: string; game: SearchGame; going: number }[];
  listas: GameList[];
}
export const EMPTY_HITS: CommunityHits = { pessoas: [], comunidades: [], conversas: [], clubes: [], jogatinas: [], listas: [] };
import { FEATURES } from '../lib/features';

const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const searchApi = {
  async community(q: string, limit = 6): Promise<CommunityHits> {
    const t = norm(q.trim());
    if (t.length < 2) return EMPTY_HITS;
    const s = getState();
    if (s.mode !== 'supabase') {
      const { communityApi } = await import('./communityApi');
      const comms = await communityApi.list('').catch(() => []);
      return {
        ...EMPTY_HITS,
        pessoas: DEMO_PEOPLE.filter((p) => norm(p.handle).includes(t) || norm(p.bio).includes(t)).slice(0, limit).map((p) => ({ id: p.id, handle: p.handle, avatar: null, bio: p.bio })),
        listas: await import('./listsApi').then(({ demoListSearch }) => demoListSearch(t, limit)).catch(() => []),
        comunidades: comms.filter((c) => norm(c.name).includes(t) || norm(c.description).includes(t)).slice(0, limit)
          .map((c) => ({ slug: c.slug, name: c.name, description: c.description, official: c.official, members: c.members })),
      };
    }
    if (!s.profile) return EMPTY_HITS;
    const r = await (await import('./supabaseAdapter')).getClient().then((c) => c.rpc('search_community', { p_q: q, p_limit: limit }));
    if (r.error) return EMPTY_HITS;
    const hits = { ...EMPTY_HITS, ...(r.data as CommunityHits) };
    return FEATURES.clubes ? hits : { ...hits, clubes: [] };
  },
};
