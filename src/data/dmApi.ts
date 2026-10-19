/**
 * Mensagens diretas (Comunidade, entrega E). Com conta, tudo passa pelas funções do banco (migração 0045).
 * Na demonstração, as pessoas de exemplo respondem sozinhas e a conversa fica neste navegador.
 */
import { getState } from './store';
import type { PersonRef } from './communityApi';
import { DEMO_PEOPLE, demoFollowing, demoFollowsMe } from './demoPeople';
import { demoGames } from './demo';
import { setupNote } from '../lib/setupNote';

export type DmCan = 'ok' | 'pedido' | 'aguardando' | 'fechado' | 'bloqueado';
export interface DmGame { id: string; slug: string; title: string; cover?: string | null; year?: number | null }
export interface DmMessage {
  id: string; mine: boolean; body: string; deleted: boolean; hidden: boolean; at: string; editedAt?: string | null;
  game?: DmGame | null; replyTo?: { id: string; mine: boolean; body: string; deleted: boolean } | null;
}
export interface DmThreadRow {
  id: string; person: PersonRef; lastAt: string; pending: 'enviado' | 'recebido' | null; muted: boolean; blocked: boolean; unread: number;
  last: { body: string; deleted: boolean; mine: boolean; game?: string | null; at: string } | null;
}
export interface DmOpen { thread: string | null; person: PersonRef; can: DmCan; pending: 'enviado' | 'recebido' | null; muted: boolean; seenAt?: string | null; messages: DmMessage[]; more: boolean }
export interface DmUnread { unread: number; requests: number }

const MSG: Record<string, string> = {
  dm_blocked: 'Não dá para conversar com este perfil.',
  dm_closed: 'Esta pessoa não está recebendo mensagens novas.',
  dm_waiting: 'Seu pedido ainda não foi aceito. Dá para mandar mais quando a pessoa responder.',
  dm_rate: 'Muitas mensagens em pouco tempo. Espere um minutinho.',
  dm_request_limit: 'Você já mandou muitos pedidos de conversa hoje. Volte amanhã.',
  dm_need_handle: 'Escolha o seu @ antes de mandar mensagens.',
  dm_suspended: 'Seu perfil está suspenso pela moderação; as mensagens voltam quando a suspensão acabar.',
  dm_empty: 'Escreva alguma coisa.',
  dm_edit_late: 'Só dá para editar nos primeiros 15 minutos.',
  dm_self: 'Esse perfil é seu.',
  bad_term: 'A mensagem tem uma palavra que não é aceita aqui.',
  target_not_found: 'Não achei esse perfil.',
  not_logged: 'Entre na sua conta para mandar mensagens.',
};
const MIGRATION = () => setupNote('Falta rodar a migração 0045 no Supabase.');
const ok = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(MSG).find((x) => m.includes(x));
    if (k) throw new Error(MSG[k]);
    if (/dm_\w+|schema cache/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error(MIGRATION());
    throw new Error(m);
  }
  return r.data;
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';

/* ---- Demonstração ------------------------------------------------------------------------------ */
type DThread = { handle: string; msgs: (DmMessage & { author: string })[]; read: string; muted?: boolean; cleared?: string; pending?: 'enviado' | 'recebido' | null };
const DK = 'wz.demo.dm';
const now = () => new Date().toISOString();
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);
const demoRef = (handle: string): PersonRef => ({ id: `demo-${handle}`, handle, avatar: null });
function dLoad(): Record<string, DThread> {
  try { const v = JSON.parse(localStorage.getItem(DK) || 'null'); if (v) return v; } catch { /* começa de novo */ }
  // Uma conversa já começada e um pedido de alguém de fora, para dar para testar.
  return {
    duda: { handle: 'duda', read: ago(3), msgs: [
      { id: 'd1', author: 'duda', mine: false, body: 'Viu que saiu o novo do Astro Bot? Tô no chefe do gelo.', deleted: false, hidden: false, at: ago(26) },
      { id: 'd2', author: 'me', mine: true, body: 'Vi! Ainda não comecei, tá na estante. ||O chefe é aquele polvo?||', deleted: false, hidden: false, at: ago(25) },
      { id: 'd3', author: 'duda', mine: false, body: 'Hahaha é ele. Joga e me conta!', deleted: false, hidden: false, at: ago(2), game: gameRef('astro') },
    ] },
    rafa: { handle: 'rafa', read: 'epoch', pending: 'recebido', msgs: [
      { id: 'r1', author: 'rafa', mine: false, body: 'Oi! Vi seu perfil na Praça, você também curte Need for Speed das antigas? Bora trocar dicas.', deleted: false, hidden: false, at: ago(5) },
    ] },
  };
}
function gameRef(id: string): DmGame | null { const g = demoGames.find((x) => x.id === id); return g ? { id: g.id, slug: g.slug, title: g.title, cover: g.cover, year: g.year } : null; }
function dSave(v: Record<string, DThread>) { try { localStorage.setItem(DK, JSON.stringify(v)); } catch { /* só nesta visita */ } }
function dCan(handle: string, t?: DThread): DmCan {
  if (t?.pending === 'enviado') return 'aguardando';
  if (t) return 'ok';
  const p = DEMO_PEOPLE.find((x) => x.handle === handle);
  if (!p) return 'fechado';
  return demoFollowing().includes(p.handle) && demoFollowsMe(p) ? 'ok' : 'pedido';
}
const strip = (m: DmMessage & { author: string }): DmMessage => { const { author: _a, ...x } = m; return x; };
const REPLIES = ['Haha, boa!', 'Bora marcar uma jogatina?', 'Me conta depois como foi.', 'Fechado!', 'Kkkk verdade.'];

/* ---- Contador (compartilhado com o topo do site) ------------------------------------------------ */
let unreadCache: DmUnread = { unread: 0, requests: 0 };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

export const dmApi = {
  peekUnread: () => unreadCache,
  subscribe(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; },
  async unread(): Promise<DmUnread> {
    if (!supa()) {
      const d = dLoad();
      const v = Object.values(d);
      unreadCache = {
        unread: v.filter((t) => !t.pending && !t.muted && t.msgs.some((m) => !m.mine && !m.deleted && m.at > t.read && m.at > (t.cleared ?? ''))).length,
        requests: v.filter((t) => t.pending === 'recebido').length,
      };
    } else {
      const r = await (await client()).rpc('dm_unread');
      unreadCache = r.error ? { unread: 0, requests: 0 } : (r.data as DmUnread);
    }
    emit();
    return unreadCache;
  },
  async list(): Promise<DmThreadRow[]> {
    if (!supa()) {
      const d = dLoad();
      return Object.values(d).map((t): DmThreadRow => {
        const vis = t.msgs.filter((m) => m.at > (t.cleared ?? ''));
        const last = vis.at(-1);
        return {
          id: t.handle, person: demoRef(t.handle), lastAt: last?.at ?? now(), pending: t.pending ?? null, muted: !!t.muted, blocked: false,
          unread: vis.filter((m) => !m.mine && !m.deleted && m.at > t.read).length,
          last: last ? { body: last.deleted ? '' : last.body.slice(0, 140), deleted: last.deleted, mine: last.mine, game: last.game?.title, at: last.at } : null,
        };
      }).filter((t) => t.last).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    }
    return (ok(await (await client()).rpc('dm_list')) as DmThreadRow[] | null) ?? [];
  },
  async open(handle: string, before?: string): Promise<DmOpen> {
    if (!supa()) {
      const d = dLoad();
      const t = d[handle];
      const known = DEMO_PEOPLE.some((p) => p.handle === handle);
      if (!known && !t) throw new Error(MSG.target_not_found);
      const msgs = (t?.msgs ?? []).filter((m) => m.at > (t?.cleared ?? '')).map(strip);
      return { thread: t ? handle : null, person: demoRef(handle), can: dCan(handle, t), pending: t?.pending ?? null, muted: !!t?.muted, seenAt: t ? ago(0.2) : null, messages: msgs, more: false };
    }
    return ok(await (await client()).rpc('dm_open', { p_handle: handle, p_before: before ?? null, p_limit: 60 })) as DmOpen;
  },
  async send(handle: string, body: string, gameId?: string | null, replyTo?: string | null): Promise<DmMessage> {
    if (!supa()) {
      const d = dLoad();
      const t = d[handle];
      const can = dCan(handle, t);
      if (can === 'aguardando') throw new Error(MSG.dm_waiting);
      if (can === 'fechado') throw new Error(MSG.dm_closed);
      const rep = replyTo ? t?.msgs.find((m) => m.id === replyTo) : null;
      const m = { id: uid(), author: 'me', mine: true, body: body.trim(), deleted: false, hidden: false, at: now(), game: gameId ? gameRef(gameId) : null,
        replyTo: rep ? { id: rep.id, mine: rep.mine, body: rep.body.slice(0, 160), deleted: rep.deleted } : null };
      const next: DThread = t ? { ...t, msgs: [...t.msgs, m], read: m.at, pending: t.pending === 'recebido' ? null : t.pending } : { handle, msgs: [m], read: m.at, pending: can === 'pedido' ? 'enviado' : null };
      d[handle] = next; dSave(d);
      // As pessoas de exemplo respondem (menos a um pedido, que fica esperando).
      if (next.pending !== 'enviado') setTimeout(() => {
        const d2 = dLoad(); const t2 = d2[handle]; if (!t2) return;
        t2.msgs.push({ id: uid(), author: handle, mine: false, body: REPLIES[Math.floor(Math.random() * REPLIES.length)], deleted: false, hidden: false, at: now() });
        dSave(d2); void dmApi.unread();
      }, 2500);
      return strip(m);
    }
    return ok(await (await client()).rpc('dm_send', { p_handle: handle, p_body: body, p_game: gameId ?? null, p_reply: replyTo ?? null })) as DmMessage;
  },
  async read(thread: string) {
    if (!supa()) { const d = dLoad(); if (d[thread]) { d[thread].read = now(); dSave(d); } void dmApi.unread(); return; }
    await (await client()).rpc('dm_read', { p_thread: thread });
    void dmApi.unread();
  },
  async edit(id: string, body: string, thread: string) {
    if (!supa()) { const d = dLoad(); const m = d[thread]?.msgs.find((x) => x.id === id); if (m) { m.body = body.trim(); m.editedAt = now(); dSave(d); } return; }
    ok(await (await client()).rpc('dm_edit', { p_id: id, p_body: body }));
  },
  async remove(id: string, thread: string) {
    if (!supa()) { const d = dLoad(); const m = d[thread]?.msgs.find((x) => x.id === id); if (m) { m.deleted = true; m.body = ''; m.game = null; dSave(d); } return; }
    ok(await (await client()).rpc('dm_delete', { p_id: id }));
  },
  async answer(thread: string, accept: boolean) {
    if (!supa()) { const d = dLoad(); if (d[thread]) { if (accept) d[thread].pending = null; else delete d[thread]; dSave(d); } void dmApi.unread(); return; }
    ok(await (await client()).rpc('dm_answer', { p_thread: thread, p_accept: accept }));
    void dmApi.unread();
  },
  async set(thread: string, patch: { muted?: boolean; clear?: boolean }) {
    if (!supa()) { const d = dLoad(); const t = d[thread]; if (t) { if (patch.muted != null) t.muted = patch.muted; if (patch.clear) t.cleared = now(); dSave(d); } void dmApi.unread(); return; }
    ok(await (await client()).rpc('dm_set', { p_thread: thread, p_muted: patch.muted ?? null, p_clear: !!patch.clear }));
    void dmApi.unread();
  },
  /** "Baixar tudo": as mensagens que você escreveu. */
  async export(): Promise<unknown[]> {
    if (!supa()) return Object.values(dLoad()).flatMap((t) => t.msgs.filter((m) => m.mine && !m.deleted).map((m) => ({ to: t.handle, at: m.at, text: m.body, game: m.game?.title ?? null })));
    const r = await (await client()).rpc('dm_export');
    return r.error ? [] : (r.data as unknown[]);
  },
};
