/**
 * Acesso por convite com o site fechado (Etapa 6, entrega 1; migração 0023).
 * Com conta, tudo passa pelas funções do banco. Na demonstração, os convites ficam neste navegador.
 */
import { actions, getState } from './store';

export type InviteState = 'valido' | 'invalido' | 'revogado' | 'vencido' | 'esgotado';
export type RedeemResult = 'ok' | 'ja_convidado' | InviteState;
export interface InviteGuest { userId: string; handle?: string; name?: string; joinedAt: string }
export interface Invite { code: string; label: string; maxUses: number; uses: number; expiresAt?: string; revoked: boolean; createdAt: string; guests: InviteGuest[] }

const PENDING = 'wz.invite.pending';
export const pendingInvite = (): string | null => { try { return localStorage.getItem(PENDING); } catch { return null; } };
export const setPendingInvite = (code: string | null) => { try { if (code) localStorage.setItem(PENDING, code); else localStorage.removeItem(PENDING); } catch { /* sem armazenamento */ } };
export const inviteLink = (code: string) => `${location.origin}/convite/${code}`;
export const cleanCode = (c: string) => c.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 32);

const client = async () => (await import('./supabaseAdapter')).getClient();
const ok = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) throw new Error(/invite|site_guest|schema cache/i.test(r.error.message) && /not find|does not exist|schema cache/i.test(r.error.message) ? 'Falta rodar a migração 0023 no Supabase.' : r.error.message);
  return r.data;
};

interface InvitesApi {
  status(code: string): Promise<InviteState>;
  redeem(code: string): Promise<RedeemResult>;
  create(label: string, maxUses: number, days: number | null): Promise<string>;
  list(): Promise<Invite[]>;
  revoke(code: string): Promise<void>;
  removeGuest(userId: string): Promise<void>;
}

const supabaseApi: InvitesApi = {
  async status(code) { const sb = await client(); return (ok(await sb.rpc('invite_status', { p_code: code })) as InviteState) ?? 'invalido'; },
  async redeem(code) {
    const sb = await client();
    const r = ok(await sb.rpc('redeem_invite', { p_code: code })) as RedeemResult;
    if (r === 'ok' || r === 'ja_convidado') actions.setGuest(true);
    return r;
  },
  async create(label, maxUses, days) { const sb = await client(); return ok(await sb.rpc('create_invite', { p_label: label, p_max_uses: maxUses, p_days: days })) as string; },
  async list() {
    const sb = await client();
    return ((ok(await sb.rpc('list_invites')) as any[]) ?? []).map((i) => ({
      code: i.code, label: i.label, maxUses: i.max_uses, uses: i.uses, expiresAt: i.expires_at ?? undefined, revoked: !!i.revoked, createdAt: i.created_at,
      guests: (i.guests ?? []).map((g: any) => ({ userId: g.user_id, handle: g.handle ?? undefined, name: g.name ?? undefined, joinedAt: g.joined_at })),
    }));
  },
  async revoke(code) { const sb = await client(); ok(await sb.rpc('revoke_invite', { p_code: code })); },
  async removeGuest(userId) { const sb = await client(); ok(await sb.rpc('remove_guest', { p_user: userId })); },
};

/* Demonstração: os convites ficam neste navegador, para conhecer a tela. */
const KEY = 'wz.invites.demo.v1';
const load = (): Invite[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const save = (l: Invite[]) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* cheio */ } };
const stateOf = (i?: Invite): InviteState => (!i ? 'invalido' : i.revoked ? 'revogado' : i.expiresAt && Date.parse(i.expiresAt) < Date.now() ? 'vencido' : i.uses >= i.maxUses ? 'esgotado' : 'valido');

const demoApi: InvitesApi = {
  async status(code) { return stateOf(load().find((i) => i.code === cleanCode(code))); },
  async redeem(code) {
    const l = load(); const i = l.find((x) => x.code === cleanCode(code)); const st = stateOf(i);
    if (st !== 'valido') return st;
    i!.uses++; i!.guests.push({ userId: `demo-${i!.uses}`, name: 'Convidado da demonstração', joinedAt: new Date().toISOString() }); save(l);
    return 'ok';
  },
  async create(label, maxUses, days) {
    const code = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('');
    save([{ code, label: label.trim().slice(0, 60), maxUses: Math.max(1, Math.min(100, maxUses)), uses: 0, expiresAt: days ? new Date(Date.now() + days * 864e5).toISOString() : undefined, revoked: false, createdAt: new Date().toISOString(), guests: [] }, ...load()]);
    return code;
  },
  async list() { return load(); },
  async revoke(code) { save(load().map((i) => (i.code === code ? { ...i, revoked: true } : i))); },
  async removeGuest(userId) { save(load().map((i) => ({ ...i, guests: i.guests.filter((g) => g.userId !== userId) }))); },
};

export const invitesApi: InvitesApi = new Proxy({} as InvitesApi, {
  get: (_t, k: keyof InvitesApi) => (getState().mode === 'supabase' ? supabaseApi : demoApi)[k],
});

export const INVITE_MSG: Record<Exclude<RedeemResult, 'ok' | 'ja_convidado' | 'valido'>, string> = {
  invalido: 'Esse convite não existe. Confira se o link chegou inteiro.',
  revogado: 'Esse convite foi cancelado. Peça um novo para quem te mandou.',
  vencido: 'Esse convite venceu. Peça um novo para quem te mandou.',
  esgotado: 'Esse convite já foi usado por todas as pessoas que ele permitia. Peça um novo para quem te mandou.',
};
