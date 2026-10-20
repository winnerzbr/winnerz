/**
 * Galera (fase 1, migração 0078): figurinhas de pessoas no álbum. Quem quiser envia a sua; o Studio aprova; ela pode
 * sair como +1 nos pacotes de outras pessoas. Com conta, tudo passa pelas funções do banco; na demonstração, fica
 * neste navegador, com pessoas fictícias.
 */
import { getState } from './store';
import type { PersonRef } from './communityApi';
import { avatarUrl } from '../lib/avatar';
import { setupNote } from '../lib/setupNote';
import { track } from '../lib/track';

export type GaleraScene = 'planicies' | 'litoral' | 'megacidade';
export const GALERA_SCENES: { id: GaleraScene; name: string }[] = [
  { id: 'planicies', name: 'Planícies Antigas' }, { id: 'litoral', name: 'Litoral Neon' }, { id: 'megacidade', name: 'Megacidade' },
];
export interface GaleraCard {
  owner: string | null; handle: string | null; number: number | null; fundador: boolean;
  scene: GaleraScene; game: string; name: string; phrase: string; portrait: string | null;
  retired?: boolean; drawnAt?: string; pasted?: boolean;
}
export interface GaleraRefused { reason: 'avatar' | 'imagem' | 'frase' | 'outro' | 'denuncia'; note: string; at: string }
export interface GaleraMine {
  number: number | null; fundador: boolean; handle: string | null; avatar: string | null; why: string | null;
  card: { live: GaleraCard | null; pending: GaleraCard | null; refused: GaleraRefused | null; paused: boolean; hidden: boolean; submittedAt: string | null } | null;
}
export interface GaleraDraft { scene: GaleraScene; game: string; name: string; phrase: string; useAvatar: boolean }
/** cards: as que você tirou; slots: os números de quem está na Galera (os espaços do álbum, sem dizer quem é). */
export interface GaleraCollection { cards: GaleraCard[]; total: number; slots: number[] }
export interface GaleraQueueItem { person: PersonRef | null; pending: GaleraCard; live: GaleraCard | null; submittedAt: string }
export interface GaleraReportItem { person: PersonRef | null; card: GaleraCard | null; count: number; reasons: string[]; firstAt: string }
export interface GaleraStudio { queue: GaleraQueueItem[]; reports: GaleraReportItem[]; active: number; chance: number }
export type GaleraStatus = 'fora' | 'analise' | 'recusada' | 'ativa' | 'pausada';

export const REFUSE_TEXT: Record<string, string> = {
  avatar: 'O avatar tem personagem ou marca de outra empresa.',
  imagem: 'A imagem não está de acordo com as regras.',
  frase: 'A frase não está de acordo com as regras.',
  outro: 'Ela não está de acordo com as regras.',
  denuncia: 'Depois de uma denúncia, ela passou a sair com o avatar padrão e sem a frase.',
};

/** Em que pé está a figurinha da pessoa. */
export function galeraStatus(m: GaleraMine | null): GaleraStatus {
  const c = m?.card;
  if (!c) return 'fora';
  if (c.live) return c.paused ? 'pausada' : 'ativa';
  if (c.pending) return 'analise';
  return c.refused ? 'recusada' : 'fora';
}
/** Endereço do retrato: caminho no bucket 'avatares', endereço pronto, ou nada (avatar padrão do WinnerZ). */
export function portraitSrc(v: string | null | undefined): string | null {
  if (!v) return null;
  if (v.startsWith('/')) return v;
  return avatarUrl(v);
}
export const sceneName = (s: GaleraScene) => GALERA_SCENES.find((x) => x.id === s)?.name ?? '';

const MSG: Record<string, string> = {
  galera_handle: 'Escolha o seu @ no perfil antes de fazer a sua figurinha.',
  galera_blocked: 'Sua conta está suspensa no momento.',
  galera_new: 'Contas novas fazem a figurinha depois de 7 dias ou da primeira sessão registrada.',
  galera_scene: 'Escolha um dos cenários.',
  galera_game: 'O nome do jogo pode ter até 80 letras.',
  galera_name: 'O nome pode ter até 24 letras.',
  galera_phrase: 'A frase pode ter até 60 letras.',
  galera_portrait: 'Não consegui usar essa foto. Tente de novo.',
  galera_reason: 'Escolha um motivo.',
  galera_report_dup: 'Você já denunciou esta figurinha. A administração vai olhar.',
  galera_chance: 'A chance precisa ficar entre 0% e 100%.',
  galera_action: 'Ação desconhecida.',
  not_admin: 'Só a administração pode fazer isso.',
  not_found: 'Não achei essa figurinha.',
  not_logged: 'Entre na sua conta para ver a Galera.',
};
const ok = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(MSG).find((x) => m.includes(x));
    if (k) throw new Error(MSG[k]);
    if (/galera_|studio_galera/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error(setupNote('Falta rodar a migração 0078 no Supabase.'));
    throw new Error(m);
  }
  return r.data;
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';
const rpc = async <T>(fn: string, args?: Record<string, unknown>): Promise<T> => ok(await (await client()).rpc(fn, args)) as T;

/* ---- Demonstração ------------------------------------------------------------------------------ */
const DK = 'wz.demo.galera';
interface DPerson { owner: string; handle: string; number: number; live: Omit<GaleraCard, 'owner' | 'handle' | 'number' | 'fundador'> | null; pending: Omit<GaleraCard, 'owner' | 'handle' | 'number' | 'fundador'> | null; paused: boolean; hidden: boolean; submittedAt: string }
interface DState { me: GaleraMine; people: DPerson[]; owned: { owner: string; number: number; drawnAt: string; pasted?: boolean }[]; rolls: Record<string, string | null>; reports: { owner: string; reason: string; at: string }[]; chance: number }
const ago = (d: number) => new Date(Date.now() - d * 86400_000).toISOString();
function seed(): DState {
  const v = (scene: GaleraScene, game: string, name: string, phrase: string, portrait: string | null) => ({ scene, game, name, phrase, portrait });
  return {
    me: { number: 3, fundador: true, handle: 'voce', avatar: null, why: null, card: null },
    people: [
      { owner: 'demo-duda', handle: 'duda', number: 7, live: v('litoral', 'Hollow Knight', 'Duda', 'Exploro cada canto antes de seguir.', '/demo/galera/duda.svg'), pending: null, paused: false, hidden: false, submittedAt: ago(9) },
      { owner: 'demo-carol', handle: 'carol', number: 123, live: v('megacidade', 'Persona 5 Royal', 'Carol', 'Mais um palácio e eu durmo.', '/demo/galera/carol.svg'), pending: null, paused: false, hidden: false, submittedAt: ago(6) },
      { owner: 'demo-novato', handle: 'novato_23', number: 118, live: v('planicies', 'Stardew Valley', '', '', null), pending: null, paused: false, hidden: false, submittedAt: ago(3) },
      { owner: 'demo-rafa', handle: 'rafa', number: 142, live: null, pending: v('planicies', 'Need for Speed', 'Rafa', 'Corrida, só corrida.', '/demo/galera/rafa.svg'), paused: false, hidden: false, submittedAt: ago(1) },
    ],
    owned: [{ owner: 'demo-duda', number: 7, drawnAt: ago(5), pasted: true }],
    rolls: {}, reports: [], chance: 0.25,
  };
}
function dLoad(): DState { try { const v = JSON.parse(localStorage.getItem(DK) || 'null'); if (v && Array.isArray(v.people)) return v; } catch { /* começa de novo */ } return seed(); }
function dSave(d: DState) { try { localStorage.setItem(DK, JSON.stringify(d)); } catch { /* só nesta visita */ } }
const dCard = (p: DPerson, v: DPerson['live']): GaleraCard | null => v ? { ...v, owner: p.owner, handle: p.handle, number: p.number, fundador: p.number <= 100 } : null;
const dMe = (d: DState): GaleraMine => ({ ...d.me, avatar: getState().profile?.avatar ?? null });
const dMeCard = (d: DState, v: DPerson['live']): GaleraCard | null => v ? { ...v, owner: 'demo-voce', handle: d.me.handle, number: d.me.number, fundador: true } : null;
const dSelf = (d: DState): DPerson | undefined => d.people.find((p) => p.owner === 'demo-voce');
function dSyncMe(d: DState) {
  const p = dSelf(d);
  const prev = d.me.card;
  d.me.card = p ? { live: dMeCard(d, p.live), pending: dMeCard(d, p.pending), refused: prev?.refused ?? null, paused: p.paused, hidden: p.hidden, submittedAt: p.submittedAt } : (prev?.refused ? { live: null, pending: null, refused: prev.refused, paused: false, hidden: false, submittedAt: null } : null);
}
const dStudio = (d: DState): GaleraStudio => ({
  queue: d.people.filter((p) => p.pending).map((p) => ({ person: { id: p.owner, handle: p.handle }, pending: (p.owner === 'demo-voce' ? dMeCard(d, p.pending) : dCard(p, p.pending))!, live: p.owner === 'demo-voce' ? dMeCard(d, p.live) : dCard(p, p.live), submittedAt: p.submittedAt })),
  reports: [...new Set(d.reports.map((r) => r.owner))].map((o) => { const p = d.people.find((x) => x.owner === o); const rs = d.reports.filter((r) => r.owner === o); return { person: p ? { id: p.owner, handle: p.handle } : null, card: p ? dCard(p, p.live) : null, count: rs.length, reasons: [...new Set(rs.map((r) => r.reason))], firstAt: rs[0].at }; }),
  active: d.people.filter((p) => p.live && !p.paused && !p.hidden).length, chance: d.chance,
});

/** Copia a foto do perfil para a pasta da pessoa, para a figurinha não mudar se a foto do perfil mudar. */
async function copyAvatar(): Promise<string | null> {
  const s = getState();
  const url = s.profile?.avatar;
  const uid = s.profile?.id;
  if (!url || !uid) return null;
  const blob = await fetch(url).then((r) => { if (!r.ok) throw new Error('foto'); return r.blob(); });
  const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp';
  const path = `${uid}/galera-${Date.now()}.${ext}`;
  const { error } = await (await client()).storage.from('avatares').upload(path, blob, { contentType: blob.type || 'image/webp', upsert: false, cacheControl: '31536000' });
  if (error) throw new Error(MSG.galera_portrait);
  return path;
}

export const galeraApi = {
  async me(): Promise<GaleraMine> {
    if (!supa()) { const d = dLoad(); dSyncMe(d); return dMe(d); }
    return rpc<GaleraMine>('galera_me');
  },
  async submit(f: GaleraDraft): Promise<GaleraMine> {
    const draft = { scene: f.scene, game: f.game.trim().slice(0, 80), name: f.name.trim().slice(0, 24), phrase: f.phrase.trim().slice(0, 60) };
    if (!supa()) {
      const d = dLoad();
      const portrait = f.useAvatar ? (getState().profile?.avatar ?? null) : null;
      let p = dSelf(d);
      if (!p) { p = { owner: 'demo-voce', handle: 'voce', number: d.me.number ?? 3, live: null, pending: null, paused: false, hidden: false, submittedAt: '' }; d.people.push(p); }
      p.pending = { ...draft, portrait }; p.submittedAt = new Date().toISOString();
      if (d.me.card) d.me.card.refused = null;
      dSyncMe(d); dSave(d); track('galera.enviar'); return dMe(d);
    }
    const portrait = f.useAvatar ? await copyAvatar() : null;
    const r = await rpc<GaleraMine>('galera_submit', { p: { ...draft, portrait } });
    track('galera.enviar');
    return r;
  },
  async cancel(): Promise<GaleraMine> {
    if (!supa()) { const d = dLoad(); const p = dSelf(d); if (p) { p.pending = null; if (!p.live) d.people = d.people.filter((x) => x !== p); } dSyncMe(d); dSave(d); return dMe(d); }
    return rpc<GaleraMine>('galera_cancel');
  },
  async pause(paused: boolean): Promise<GaleraMine> {
    if (!supa()) { const d = dLoad(); const p = dSelf(d); if (p) p.paused = paused; dSyncMe(d); dSave(d); return dMe(d); }
    return rpc<GaleraMine>('galera_pause', { p_paused: paused });
  },
  async leave(): Promise<GaleraMine> {
    if (!supa()) { const d = dLoad(); d.people = d.people.filter((p) => p.owner !== 'demo-voce'); d.me.card = null; dSave(d); return dMe(d); }
    const paths = await rpc<string[]>('galera_leave');
    if (paths?.length) await (await client()).storage.from('avatares').remove(paths).catch(() => {});
    return rpc<GaleraMine>('galera_me');
  },
  /** Depois de abrir um pacote: a figurinha da Galera que veio junto (ou nada). Sorteado uma vez por pacote. */
  async roll(packId: string, welcome: boolean): Promise<GaleraCard | null> {
    if (!supa()) {
      const d = dLoad();
      if (packId in d.rolls) { const o = d.rolls[packId]; const p = d.people.find((x) => x.owner === o); return p ? dCard(p, p.live) : null; }
      let pick: DPerson | null = null;
      if (Math.random() < (welcome ? 1 : d.chance)) {
        const pool = d.people.filter((p) => p.live && !p.paused && !p.hidden && p.owner !== 'demo-voce' && !d.owned.some((o) => o.owner === p.owner));
        pick = pool[Math.floor(Math.random() * pool.length)] ?? null;
      }
      d.rolls[packId] = pick?.owner ?? null;
      if (pick) d.owned.push({ owner: pick.owner, number: pick.number, drawnAt: new Date().toISOString() });
      dSave(d);
      if (pick) track('galera.tirou');
      return pick ? dCard(pick, pick.live) : null;
    }
    const c = await rpc<GaleraCard | null>('galera_roll', { p_pack: packId });
    if (c) track('galera.tirou');
    return c;
  },
  async collection(): Promise<GaleraCollection> {
    if (!supa()) {
      const d = dLoad();
      const cards = d.owned.map((o) => { const p = d.people.find((x) => x.owner === o.owner); const c = p ? dCard(p, p.live) : null; return c ? { ...c, drawnAt: o.drawnAt, pasted: !!o.pasted } : { owner: null, handle: null, number: o.number, fundador: false, scene: 'planicies' as GaleraScene, game: '', name: '', phrase: '', portrait: null, retired: true, drawnAt: o.drawnAt, pasted: true }; })
        .sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
      const live = d.people.filter((p) => p.live && p.owner !== 'demo-voce');
      return { cards, total: live.length, slots: live.map((p) => p.number).sort((a, b) => a - b) };
    }
    const r = await rpc<GaleraCollection>('galera_collection');
    return { cards: r.cards ?? [], total: r.total ?? 0, slots: r.slots ?? [] };
  },
  /** Cola no Álbum da Galera. */
  async paste(owner: string): Promise<void> {
    if (!supa()) { const d = dLoad(); const o = d.owned.find((x) => x.owner === owner); if (o) o.pasted = true; dSave(d); return; }
    await rpc<boolean>('galera_paste', { p_owner: owner });
  },
  async report(owner: string, reason: 'imagem' | 'frase' | 'outro'): Promise<void> {
    if (!supa()) {
      const d = dLoad();
      if (d.reports.some((r) => r.owner === owner)) throw new Error(MSG.galera_report_dup);
      d.reports.push({ owner, reason, at: new Date().toISOString() });
      const p = d.people.find((x) => x.owner === owner); if (p) p.hidden = true;
      dSave(d); return;
    }
    await rpc('galera_report', { p_owner: owner, p_reason: reason });
    track('galera.denunciar');
  },
  resetDemo() { try { localStorage.removeItem(DK); } catch { /* sem armazenamento */ } },
};

export const studioGaleraApi = {
  async load(): Promise<GaleraStudio> {
    if (!supa()) return dStudio(dLoad());
    const r = await rpc<GaleraStudio>('studio_galera');
    return { queue: r.queue ?? [], reports: r.reports ?? [], active: r.active ?? 0, chance: Number(r.chance ?? 0.25) };
  },
  async decide(user: string, action: 'aprovar' | 'padrao' | 'recusar', reason?: string, note?: string): Promise<GaleraStudio> {
    if (!supa()) {
      const d = dLoad(); const p = d.people.find((x) => x.owner === user);
      if (!p?.pending) throw new Error(MSG.not_found);
      if (action === 'recusar') {
        if (!reason) throw new Error(MSG.galera_reason);
        if (p.owner === 'demo-voce') d.me.card = { ...(d.me.card ?? { live: null, pending: null, paused: false, hidden: false, submittedAt: null }), refused: { reason: reason as GaleraRefused['reason'], note: note ?? '', at: new Date().toISOString() } };
        p.pending = null; if (!p.live) d.people = d.people.filter((x) => x !== p);
      } else {
        p.live = action === 'padrao' ? { ...p.pending, portrait: null } : p.pending; p.pending = null; p.hidden = false;
        if (p.owner === 'demo-voce' && d.me.card) d.me.card.refused = null;
      }
      dSyncMe(d); dSave(d); return dStudio(d);
    }
    return rpc<GaleraStudio>('studio_galera_decide', { p_user: user, p_action: action, p_reason: reason ?? null, p_note: note ?? null });
  },
  async closeReport(owner: string, keep: boolean, note?: string): Promise<GaleraStudio> {
    if (!supa()) {
      const d = dLoad(); const p = d.people.find((x) => x.owner === owner);
      if (p) { p.hidden = false; if (!keep && p.live) p.live = { ...p.live, portrait: null, phrase: '' }; }
      d.reports = d.reports.filter((r) => r.owner !== owner);
      dSave(d); return dStudio(d);
    }
    return rpc<GaleraStudio>('studio_galera_report', { p_owner: owner, p_keep: keep, p_note: note ?? null });
  },
  async chance(n: number): Promise<GaleraStudio> {
    if (!supa()) { const d = dLoad(); d.chance = Math.max(0, Math.min(1, n)); dSave(d); return dStudio(d); }
    return rpc<GaleraStudio>('studio_galera_chance', { p_chance: n });
  },
};
