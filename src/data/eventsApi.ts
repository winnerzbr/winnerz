/**
 * E7.5 · Agenda de eventos (migração 0068): os eventos do canal marcados no Studio e as jogatinas abertas do canal.
 * As datas do WinnerZ Awards vêm da própria edição (na página). Na demonstração, a agenda fica neste navegador.
 */
import { getState } from './store';
import { demoGameMini, type GameMini } from './communityApi';

export type EventKind = 'live' | 'jogatina' | 'awards' | 'estreia' | 'outro';
export interface AgendaItem {
  id: string; source: 'canal' | 'jogatina' | 'awards'; kind: EventKind; title: string; startsAt: string; endsAt: string | null;
  link: string | null; game: GameMini | null; note: string | null; canceled: boolean;
}
export interface EventDraft { id?: string; title: string; kind: EventKind; startsAt: string; endsAt?: string | null; link?: string | null; gameId?: string | null; note?: string | null; canceled?: boolean }

export const KIND_LABEL: Record<EventKind, string> = { live: 'Live', jogatina: 'Jogatina', awards: 'WinnerZ Awards', estreia: 'Estreia', outro: 'Evento' };

const MSG: Record<string, string> = {
  not_admin: 'Só a administração pode fazer isso.',
  event_date: 'Confira a data: o fim precisa ser depois do começo.',
  event_link: 'O link precisa começar com https://',
  not_found: 'Não achei esse evento.',
};
const supa = () => getState().mode === 'supabase';
const client = async () => (await import('./supabaseAdapter')).getClient();
async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const r = await (await client()).rpc(fn, args);
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(MSG).find((x) => m.includes(x));
    if (k) throw new Error(MSG[k]);
    if (/event_agenda|studio_event/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error('Falta rodar a migração 0068 no Supabase.');
    throw new Error(m);
  }
  return r.data as T;
}

/* ---- Demonstração ---- */
const DK = 'wz.demo.agenda';
type DEvent = EventDraft & { id: string; createdAt: string };
const day = (d: number, h: number) => { const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, 0, 0, 0); return x.toISOString(); };
function dLoad(): DEvent[] {
  try { const v = JSON.parse(localStorage.getItem(DK) || 'null'); if (Array.isArray(v)) return v; } catch { /* começa de novo */ }
  return [
    { id: 'demo-ev1', title: 'Live: Elden Ring às cegas', kind: 'live', startsAt: day(2, 21), endsAt: day(2, 23), link: 'https://www.twitch.tv/', gameId: 'elden', note: 'Primeira vez no DLC, sem guia.', createdAt: day(-1, 10) },
    { id: 'demo-ev2', title: 'Estreia: detonado de Astro Bot', kind: 'estreia', startsAt: day(5, 19), endsAt: null, link: 'https://www.youtube.com/', gameId: 'astro', note: null, createdAt: day(-1, 10) },
  ];
}
function dSave(v: DEvent[]) { try { localStorage.setItem(DK, JSON.stringify(v)); } catch { /* só nesta visita */ } }
const dItem = (e: DEvent): AgendaItem => ({ id: e.id, source: 'canal', kind: e.kind, title: e.title, startsAt: e.startsAt, endsAt: e.endsAt ?? null, link: e.link ?? null,
  game: demoGameMini(e.gameId ?? null), note: e.note ?? null, canceled: !!e.canceled });
const dAgenda = () => dLoad().filter((e) => Date.parse(e.startsAt) > Date.now() - 86_400_000).map(dItem).sort((a, b) => a.startsAt.localeCompare(b.startsAt));

export const eventsApi = {
  async agenda(days = 90): Promise<AgendaItem[]> {
    if (!supa()) return dAgenda();
    try { return (await rpc<AgendaItem[]>('event_agenda', { p_days: days })) ?? []; } catch { return []; } // sem a 0068: só as datas do Awards
  },
  async save(d: EventDraft): Promise<AgendaItem[]> {
    if (!d.title.trim() || d.title.trim().length < 3) throw new Error('Dê um nome ao evento (pelo menos 3 letras).');
    if (d.link && !/^https?:\/\//i.test(d.link)) throw new Error(MSG.event_link);
    if (d.endsAt && Date.parse(d.endsAt) <= Date.parse(d.startsAt)) throw new Error(MSG.event_date);
    if (!supa()) {
      const list = dLoad();
      const cur = d.id ? list.find((x) => x.id === d.id) : undefined;
      if (cur) Object.assign(cur, d);
      else list.push({ ...d, id: `demo-ev${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() });
      dSave(list); return dAgenda();
    }
    return rpc<AgendaItem[]>('studio_event_save', { p: d });
  },
  async remove(id: string): Promise<AgendaItem[]> {
    if (!supa()) { dSave(dLoad().filter((x) => x.id !== id)); return dAgenda(); }
    return rpc<AgendaItem[]>('studio_event_delete', { p_id: id });
  },
};
