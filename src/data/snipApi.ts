/**
 * Trechos da Jornada (migração 0049): um momento ou marco ganha um link próprio que mostra só aquele trecho.
 * Com conta, o link vive no banco e a leitura pública passa pela /api/perfil?t=. Na demonstração, fica neste
 * navegador (e só abre aqui).
 */
import { getState } from './store';
import type { DatePrecision, EventKind } from './types';
import { setupNote } from '../lib/setupNote';

export interface Snip { token: string; eventId: string; withPhoto: boolean; withNote: boolean; views: number; createdAt: string }
export interface SnipRow extends Snip { title: string; kind: EventKind; at: string; game: string; slug: string }
export interface SnipView {
  kind: EventKind; title: string; at: string; precision?: DatePrecision | null; dateLabel?: string | null;
  quote?: string | null; text?: string | null; image?: string | null; eventId: string;
  game: { title: string; slug: string; cover?: string | null; backdrop?: string | null };
  history: { ordinal: number; title: string };
  owner: { handle: string; avatar?: string | null };
}

const MSG: Record<string, string> = {
  snip_letter: 'Cartas não saem da sua Jornada.',
  snip_limit: 'Você chegou ao limite de 500 links de trechos. Desligue alguns em Preferências.',
  not_found: 'Este registro ainda não terminou de salvar. Tente de novo em instantes.',
  not_logged: 'Entre na sua conta para compartilhar.',
};
const ok = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(MSG).find((x) => m.includes(x));
    if (k) throw new Error(MSG[k]);
    if (/snip_|journey_snips|schema cache/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error(setupNote('Falta rodar a migração 0049 no Supabase.'));
    throw new Error(m);
  }
  return r.data;
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';
const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => ok(await (await client()).rpc(fn, args)) as T;

/* ---- Demonstração ---- */
const DK = 'wz.demo.trechos';
type DSnips = Record<string, Snip>;
const dLoad = (): DSnips => { try { return JSON.parse(localStorage.getItem(DK) || '{}') as DSnips; } catch { return {}; } };
const dSave = (v: DSnips) => { try { localStorage.setItem(DK, JSON.stringify(v)); } catch { /* só nesta visita */ } };
const tok = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
const demoHandle = (): string => { try { return JSON.parse(localStorage.getItem('wz.profile.demo.v1') || 'null')?.handle || 'voce'; } catch { return 'voce'; } };

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await (await client()).auth.getSession();
    return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  } catch { return {}; }
}

export const snipApi = {
  async of(eventId: string): Promise<Snip | null> {
    if (supa()) { try { return await rpc<Snip | null>('snip_of', { p_event: eventId }); } catch { return null; } }
    return Object.values(dLoad()).find((x) => x.eventId === eventId) ?? null;
  },
  async set(eventId: string, withPhoto: boolean, withNote: boolean): Promise<Snip> {
    if (supa()) return rpc<Snip>('snip_set', { p_event: eventId, p_photo: withPhoto, p_note: withNote });
    const all = dLoad();
    const have = Object.values(all).find((x) => x.eventId === eventId);
    const s: Snip = have ? { ...have, withPhoto, withNote } : { token: tok(), eventId, withPhoto, withNote, views: 0, createdAt: new Date().toISOString() };
    all[s.token] = s; dSave(all); return s;
  },
  async off(eventId: string): Promise<void> {
    if (supa()) { await rpc('snip_off', { p_event: eventId }); return; }
    const all = dLoad(); for (const [k, v] of Object.entries(all)) if (v.eventId === eventId) delete all[k]; dSave(all);
  },
  async mine(): Promise<SnipRow[]> {
    if (supa()) return rpc<SnipRow[]>('snips_mine');
    const s = getState();
    return Object.values(dLoad()).flatMap((x) => {
      const e = s.events.find((ev) => ev.id === x.eventId); const j = e && s.journeys.find((jj) => jj.id === e.journeyId); const g = j && s.games[j.gameId];
      return e && g ? [{ ...x, title: e.title, kind: e.kind, at: e.at, game: g.title, slug: g.slug }] : [];
    });
  },
  /** A página pública do trecho. null: não existe, foi desligado ou não está aberto para você. */
  async get(token: string): Promise<SnipView | null> {
    if (supa()) {
      const r = await fetch(`/api/perfil?t=${encodeURIComponent(token)}`, { headers: await authHeaders() });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Não consegui carregar o trecho.');
      return (await r.json()) as SnipView;
    }
    const x = dLoad()[token]; if (!x) return null;
    const s = getState(); const e = s.events.find((ev) => ev.id === x.eventId); if (!e) return null;
    const j = s.journeys.find((jj) => jj.id === e.journeyId); const g = j && s.games[j.gameId]; const h = s.histories.find((hh) => hh.id === e.historyId);
    if (!g || !h) return null;
    return {
      kind: e.kind, title: e.title, at: e.at, precision: e.precision, dateLabel: e.dateLabel, eventId: e.id,
      quote: x.withNote ? e.quote : null, text: x.withNote ? e.text : null, image: x.withPhoto ? e.image : null,
      game: { title: g.title, slug: g.slug, cover: g.cover, backdrop: g.backdrop }, history: { ordinal: h.ordinal, title: h.title }, owner: { handle: demoHandle() },
    };
  },
};

export const snipUrl = (token: string) => `${location.origin}/t/${token}`;
/** Só estes saem: momentos, marcos, começos, sessões com recado e pontos para voltar. Cartas, nunca. */
export const SHAREABLE: EventKind[] = ['momento', 'marco', 'inicio', 'sessao', 'ponto'];
