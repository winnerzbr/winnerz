/**
 * Central de avisos: o sino do topo e a página /avisos. Com conta, os avisos ficam guardados no banco
 * (migração 0034), cada um com lido e não lido; na demonstração, são montados a partir dos dados de exemplo.
 */
import { useSyncExternalStore } from 'react';
import { getState } from './store';
import { fixAuthors, type NewsItem, type PersonRef } from './communityApi';
import type { CommunityPrefs } from './types';

export type NotifGroup = 'comunidade' | 'grupos' | 'amigos' | 'jornada' | 'sistema';
export type NotifFilter = 'tudo' | 'naolidos' | NotifGroup;
export interface Notif {
  id: string; ids: string[]; kind: string; group: NotifGroup; title: string | null; excerpt: string | null; link: string | null;
  data: Record<string, unknown>; at: string; read: boolean; reactions: string[]; actorCount: number; actors: PersonRef[];
}
export interface NotifPage { items: Notif[]; more: boolean }
export interface NotifCount { new: number; unread: number }

export const FILTERS: { k: NotifFilter; label: string }[] = [
  { k: 'tudo', label: 'Tudo' },
  { k: 'naolidos', label: 'Não lidos' },
  { k: 'comunidade', label: 'Comunidade' },
  { k: 'grupos', label: 'Jogatinas e clubes' },
  { k: 'amigos', label: 'Amigos' },
  { k: 'jornada', label: 'Jornada' },
  { k: 'sistema', label: 'Moderação e site' },
];

const MIGRATION = 'Falta rodar a migração 0034 no Supabase.';
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const r = await (await client()).rpc(fn, args);
  if (r.error) {
    if (/notif_|site_announce|schema cache/i.test(r.error.message) && /not find|does not exist|schema cache/i.test(r.error.message)) throw new Error(MIGRATION);
    throw new Error(r.error.message);
  }
  return fixAuthors(r.data as T);
}

export const notifApi = {
  async count(): Promise<NotifCount> {
    if (!supa()) return demo.count();
    if (!getState().profile) return { new: 0, unread: 0 };
    return (await rpc<NotifCount | null>('notif_count')) ?? { new: 0, unread: 0 };
  },
  async list(filter: NotifFilter = 'tudo', before?: string | null, limit = 30): Promise<NotifPage> {
    if (!supa()) return demo.list(filter, before, limit);
    if (!getState().profile) return { items: [], more: false };
    return (await rpc<NotifPage | null>('notif_list', { p_filter: filter, p_before: before ?? null, p_limit: limit })) ?? { items: [], more: false };
  },
  /** Abriu o sino: o número some (os avisos continuam não lidos até a pessoa abrir ou marcar). */
  async seen(): Promise<void> {
    if (!supa()) demo.seen();
    else await rpc('notif_seen');
    setCount({ ...(count ?? { unread: 0 }), new: 0 });
  },
  async read(ids: string[], on = true): Promise<void> {
    if (!supa()) demo.read(ids, on);
    else await rpc('notif_read', { p_ids: ids, p_on: on });
    void refreshNotifs();
  },
  async readAll(filter: NotifFilter = 'tudo'): Promise<void> {
    if (!supa()) demo.readAll(filter);
    else await rpc('notif_read_all', { p_filter: filter });
    void refreshNotifs();
  },
  /** Studio: aviso do site para todo mundo que tem conta. */
  async announce(title: string, body: string, link: string): Promise<{ sent: number }> {
    if (!supa()) return demo.announce(title, body, link);
    return rpc<{ sent: number }>('site_announce', { p_title: title, p_body: body, p_link: link });
  },
  async announcements(): Promise<{ id: string; title: string; body: string; link: string | null; at: string; sent: number; read: number }[]> {
    if (!supa()) return demo.announcements();
    return (await rpc<{ id: string; title: string; body: string; link: string | null; at: string; sent: number; read: number }[] | null>('site_announcements_list')) ?? [];
  },
  async myData(): Promise<unknown[]> {
    if (!supa()) return (await demo.list('tudo', null, 60)).items.map((n) => ({ tipo: n.kind, titulo: n.title, texto: n.excerpt, endereco: n.link, quando: n.at, lido: n.read }));
    return (await rpc<unknown[] | null>('my_notifications_data')) ?? [];
  },
};

/* ------------------------------------------------------------------ */
/* Contador compartilhado (sino), atualizado de tempos em tempos        */
/* ------------------------------------------------------------------ */
let count: NotifCount | null = null;
let loading = false;
let timer: ReturnType<typeof setInterval> | null = null;
const subs = new Set<() => void>();
function setCount(c: NotifCount) { count = c; subs.forEach((f) => f()); }
export async function refreshNotifs(): Promise<NotifCount | null> {
  try { setCount(await notifApi.count()); } catch { /* sem rede ou sem a migração: o sino fica como estava */ }
  return count;
}
export function useNotifCount(): NotifCount | null {
  return useSyncExternalStore((f) => {
    subs.add(f);
    const s = getState();
    if (!count && !loading && (s.mode === 'demo' || s.profile)) { loading = true; void refreshNotifs().finally(() => { loading = false; }); }
    if (!timer && typeof window !== 'undefined') {
      timer = setInterval(() => { if (document.visibilityState === 'visible' && (getState().mode === 'demo' || getState().profile)) void refreshNotifs(); }, 60_000);
      window.addEventListener('focus', () => void refreshNotifs());
    }
    return () => { subs.delete(f); };
  }, () => count, () => null);
}

/* ------------------------------------------------------------------ */
/* Demonstração                                                         */
/* ------------------------------------------------------------------ */
const KEY = 'wz.demo.avisos';
type DState = { read: string[]; seenAt: string; site: { id: string; title: string; body: string; link: string | null; at: string }[] };
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
function load(): DState {
  try { const x = JSON.parse(localStorage.getItem(KEY) || 'null') as DState | null; if (x) return x; } catch { /* começa de novo */ }
  return { read: [], seenAt: hoursAgo(30), site: [{ id: 's-awards', title: 'As indicações do WinnerZ Awards abrem em breve', body: 'Separe os jogos que marcaram o seu ano.', link: '/awards', at: hoursAgo(26) }] };
}
function save(d: DState) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* sem espaço: segue */ } }
const groupOf = (k: string): NotifGroup => (['resposta', 'acompanhando', 'mencao', 'reacao'].includes(k) ? 'comunidade' : k.startsWith('clube_') || k.startsWith('jogatina') || k === 'parte' ? 'grupos' : k === 'seguiu' || k === 'pacto' || k === 'pacto_zerou' || k === 'lista_convite' ? 'amigos' : k === 'lancamento' || k === 'retomada' || k === 'semana' || k === 'mes' || k === 'revisao' || k.startsWith('album_') ? 'jornada' : 'sistema');
const PREF: Record<string, keyof CommunityPrefs> = {
  reacao: 'aviso_reacoes', seguiu: 'aviso_seguidores', jogatina_convite: 'aviso_convites', clube_convite: 'aviso_convites', lista_convite: 'aviso_convites',
  jogatina_lembrete: 'aviso_lembretes', jogatina_mudou: 'aviso_lembretes', lancamento: 'aviso_lancamentos', retomada: 'aviso_retomada', semana: 'aviso_semana', mes: 'aviso_mes', revisao: 'aviso_revisao', pacto: 'aviso_pactos', pacto_zerou: 'aviso_pactos',
};
function linkOf(n: NewsItem): string {
  if (n.kind === 'resposta' || n.kind === 'mencao' || n.kind === 'acompanhando') return `/conversa/${n.ref}${n.id !== n.ref ? `#r-${n.id}` : ''}`;
  if (n.kind === 'clube_resposta' || n.kind === 'clube_mencao') return `/clube/${n.slug}#m-${n.id}`;
  if (n.kind === 'jogatina_resposta' || n.kind === 'jogatina_mencao') return `/jogatina/${n.slug}#m-${n.id}`;
  if (n.kind === 'jogatina' || n.kind === 'jogatina_convite') return `/jogatina/${n.slug}`;
  return `/clube/${n.slug}${n.kind === 'parte' ? `#parte-${n.ref}` : ''}`;
}
async function demoAll(): Promise<Notif[]> {
  const st = load();
  const { communityApi, demoPersonRef } = await import('./communityApi');
  const news = await communityApi.news();
  const mk = (id: string, kind: string, at: string, more: Partial<Notif>): Notif => ({
    id, ids: [id], kind, group: groupOf(kind), title: null, excerpt: null, link: null, data: {}, at, read: st.read.includes(id), reactions: [], actorCount: 0, actors: [], ...more,
  });
  const out: Notif[] = news.items.map((n) => {
    const kind = n.kind === 'jogatina' ? 'jogatina_lembrete' : n.kind;
    return mk(`${kind}:${n.id}`, kind, n.at, { title: n.title, excerpt: n.excerpt ?? null, link: linkOf(n), actors: n.author ? [n.author] : [], actorCount: n.author ? 1 : 0 });
  });
  out.push(mk('reacao:p-yakuza', 'reacao', hoursAgo(3), { title: 'Qual Yakuza para começar?', link: '/conversa/p-yakuza', reactions: ['gg', 'haha'], actors: [demoPersonRef('demo-carol'), demoPersonRef('demo-rafa')], actorCount: 3 }));
  out.push(mk('seguiu:demo-duda', 'seguiu', hoursAgo(9), { actors: [demoPersonRef('demo-duda')], actorCount: 1, data: { friends: true } }));
  out.push(mk('lancamento:astro', 'lancamento', hoursAgo(20), { title: 'Astro Bot', link: '/jogos/astro-bot', data: { cover: '/demo/cover-astro.webp' } }));
  st.site.forEach((s) => out.push(mk(`site:${s.id}`, 'site', s.at, { title: s.title, excerpt: s.body || null, link: s.link })));
  // Resumo da semana passada (segunda de manhã) e o convite de pacto da demonstração.
  { const now = new Date(); const mon = new Date(now); mon.setHours(8, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    out.push(mk(`semana:${mon.toISOString().slice(0, 10)}`, 'semana', mon.toISOString(), { link: '/jornada/ritmo#semana', data: { sessions: 4, minutes: 370, games: ['The Last of Us Part II', 'Astro Bot'], more: 0, done: [], with: ['Ana'] } }));
    { const m1 = new Date(now.getFullYear(), now.getMonth(), 1, 9); const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      out.push(mk(`mes:${m1.toISOString().slice(0, 7)}`, 'mes', m1.toISOString(), { link: '/jornada/ritmo#mes', data: { month: `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2, '0')}`, sessions: 6, rest: 4, restOk: 3, restAnswered: 4, top: 'Astro Bot' } }));
      const q1 = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1, 9);
      out.push(mk(`revisao:${q1.toISOString().slice(0, 7)}`, 'revisao', q1.toISOString(), { link: '/jornada/revisao', data: {} })); }
    out.push(mk('pacto:pacto-demo', 'pacto', hoursAgo(50), { title: 'The Last of Us Part II', link: '/jornada/ritmo#pactos', actors: [demoPersonRef('demo-duda')], actorCount: 1, data: { goal: 'zerar', until: '2026-11-30' } })); }
  // Retomada: jogos em andamento sem sessão há 14 dias ou mais (como o banco faz).
  { const { daysAway, currentHistory, lastSession } = await import('./store'); const gs = getState();
    for (const j of gs.journeys) {
      const h = currentHistory(gs, j.id), g = gs.games[j.gameId], d = daysAway(gs, j.id), last = lastSession(gs, j.id);
      if (!g || !h || h.state !== 'ativa' || j.mood === 'silencioso' || d == null || d < 14 || d > 120 || !last) continue;
      const at = new Date(Date.parse(last.endedAt ?? last.startedAt) + 14 * 86_400_000).toISOString();
      out.push(mk(`retomada:${j.id}:${last.id}`, 'retomada', at, { title: g.title, excerpt: last.whereStopped ?? null, link: `/jornada/${g.slug}/voltar`, data: { cover: g.cover, lastAt: last.endedAt ?? last.startedAt } }));
    } }
  const pref = getState().prefs.comunidade ?? {};
  return out.filter((n) => !PREF[n.kind] || pref[PREF[n.kind]] !== false).sort((a, b) => b.at.localeCompare(a.at));
}
const demo = {
  async count(): Promise<NotifCount> {
    const all = await demoAll(); const st = load();
    return { new: all.filter((n) => !n.read && n.at > st.seenAt).length, unread: all.filter((n) => !n.read).length };
  },
  async list(filter: NotifFilter, before: string | null | undefined, limit: number): Promise<NotifPage> {
    const l = (await demoAll()).filter((n) => (filter === 'tudo' || (filter === 'naolidos' ? !n.read : n.group === filter)) && (!before || n.at < before));
    return { items: l.slice(0, limit), more: l.length > limit };
  },
  seen() { const st = load(); st.seenAt = new Date().toISOString(); save(st); },
  read(ids: string[], on: boolean) { const st = load(); st.read = on ? [...new Set([...st.read, ...ids])] : st.read.filter((x) => !ids.includes(x)); save(st); },
  async readAll(filter: NotifFilter) { const l = await demo.list(filter, null, 500); demo.read(l.items.flatMap((n) => n.ids), true); },
  announce(title: string, body: string, link: string): { sent: number } {
    if (title.trim().length < 3) throw new Error('O título precisa ter pelo menos 3 caracteres.');
    const st = load(); st.site.unshift({ id: `s-${Date.now().toString(36)}`, title: title.trim(), body: body.trim(), link: link.trim() || null, at: new Date().toISOString() }); save(st);
    return { sent: 1 };
  },
  announcements() { return load().site.map((s) => ({ ...s, sent: 1, read: load().read.includes(`site:${s.id}`) ? 1 : 0 })); },
};
