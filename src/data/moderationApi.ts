/**
 * Moderação e regras (Etapa 6, entrega 2): regras da comunidade, denúncias, bloquear e silenciar, avisos da
 * moderação para a pessoa e a fila do Studio. Com conta, tudo passa pelas funções do banco (migração 0024).
 * Na demonstração, fica neste navegador (a mesma pessoa denuncia, modera e recebe os avisos, para dar para testar).
 */
import { useSyncExternalStore } from 'react';
import { getState } from './store';

import type { ReportKind, Snapshot } from '../lib/moderation';
import { setupNote } from '../lib/setupNote';
export type { ReportKind, Snapshot } from '../lib/moderation';
export type ReportReason = 'ofensa' | 'spoiler' | 'spam' | 'improprio' | 'outro';
export type BlockKind = 'bloquear' | 'silenciar';
export type ModAction = 'arquivar' | 'avisar' | 'ocultar' | 'suspender' | 'limpar_bio' | 'trocar_arroba' | 'tirar_imagens';

export const REASONS: { k: ReportReason; label: string; hint: string }[] = [
  { k: 'ofensa', label: 'Ofensa ou ódio', hint: 'Xingamento, preconceito, ataque a alguém.' },
  { k: 'spoiler', label: 'Spoiler sem aviso', hint: 'Conta o que acontece no jogo sem avisar.' },
  { k: 'spam', label: 'Spam ou propaganda', hint: 'Divulgação, golpe, conteúdo repetido.' },
  { k: 'improprio', label: 'Conteúdo impróprio', hint: 'Sexual, violência real, dados de outra pessoa.' },
  { k: 'outro', label: 'Outro motivo', hint: 'Conte na observação.' },
];
export const REASON_LABEL: Record<ReportReason, string> = Object.fromEntries(REASONS.map((r) => [r.k, r.label])) as Record<ReportReason, string>;

export const KIND_LABEL: Record<ReportKind, string> = { perfil: 'Perfil', jornada: 'Jornada', vitrine: 'Vitrine', momento: 'Foto de momento', museu: 'Museu', comunidade: 'Comunidade', postagem: 'Postagem', resposta: 'Resposta', clube: 'Clube', jogatina: 'Jogatina', mensagem: 'Mensagem direta', lista: 'Lista de jogos' };

/** Ações possíveis para cada tipo de alvo, na ordem em que aparecem na fila. */
export const ACTIONS_FOR: Record<ReportKind, ModAction[]> = {
  perfil: ['avisar', 'limpar_bio', 'tirar_imagens', 'trocar_arroba', 'suspender', 'arquivar'],
  jornada: ['ocultar', 'avisar', 'suspender', 'arquivar'],
  vitrine: ['ocultar', 'avisar', 'suspender', 'arquivar'],
  momento: ['ocultar', 'avisar', 'suspender', 'arquivar'],
  museu: ['ocultar', 'avisar', 'suspender', 'arquivar'],
  comunidade: ['ocultar', 'avisar', 'suspender', 'arquivar'],
  postagem: ['ocultar', 'avisar', 'suspender', 'arquivar'],
  resposta: ['ocultar', 'avisar', 'suspender', 'arquivar'],
  clube: ['ocultar', 'avisar', 'suspender', 'arquivar'],
  jogatina: ['ocultar', 'avisar', 'suspender', 'arquivar'],
  mensagem: ['ocultar', 'avisar', 'suspender', 'arquivar'],
  lista: ['ocultar', 'avisar', 'suspender', 'arquivar'],
};
/** Nome da ação "ocultar" conforme onde o conteúdo aparece. */
export const HIDE_LABEL: Partial<Record<ReportKind, string>> = { comunidade: 'Tirar do ar', postagem: 'Tirar da comunidade', resposta: 'Tirar da conversa', clube: 'Tirar do ar', jogatina: 'Tirar do ar', mensagem: 'Tirar da conversa', lista: 'Tirar do ar' };
export const ACTION_LABEL: Record<ModAction, string> = {
  arquivar: 'Arquivar (sem problema)', avisar: 'Avisar a pessoa', ocultar: 'Tirar do perfil', suspender: 'Suspender o perfil',
  limpar_bio: 'Apagar a bio', trocar_arroba: 'Pedir outro @', tirar_imagens: 'Tirar foto e capa',
};
export const ACTION_DONE: Record<ModAction, string> = {
  arquivar: 'Arquivada', avisar: 'Aviso enviado', ocultar: 'Tirado do perfil', suspender: 'Perfil suspenso',
  limpar_bio: 'Bio apagada', trocar_arroba: '@ trocado', tirar_imagens: 'Foto e capa retiradas',
};

export interface Notice { id: string; kind: string; text: string; at: string }
export interface ModStatus { rulesAcceptedAt: string | null; suspendedUntil: string | null; notices: Notice[] }
export interface BlockRow { id: string; handle: string | null; avatar?: string | null; kind: BlockKind; at: string }
export interface QueueItem {
  kind: ReportKind; ref: string; owner: string; handle: string | null; count: number; reasons: ReportReason[]; notes: string[];
  firstAt: string; lastAt: string; snapshot: Snapshot; now: Snapshot | null; history: number; suspendedUntil: string | null;
}
export interface LogItem {
  id: string; kind: ReportKind; ref: string; action: ModAction; message?: string | null; until?: string | null; reports: number;
  at: string; undoneAt?: string | null; owner: string; handle?: string | null; by?: string | null;
}

const MSG: Record<string, string> = {
  report_limit: 'Você já mandou 10 denúncias hoje. A moderação olha uma por uma; volte amanhã se precisar.',
  report_self: 'Isso é seu. Para tirar do perfil, use as opções de compartilhar.',
  target_not_found: 'Não achei o que você quer denunciar. Talvez já tenha saído do perfil.',
  block_self: 'Não dá para bloquear a si mesmo.',
  not_logged: 'Entre na sua conta para fazer isso.',
  not_admin: 'Só a administração pode fazer isso.',
  handle_taken: 'Outra pessoa já pegou esse @ enquanto isso; não deu para devolver.',
};
const ok = <T>(r: { data: T; error: { message: string } | null }): T => {
  if (r.error) {
    const m = r.error.message;
    const k = Object.keys(MSG).find((x) => m.includes(x));
    if (k) throw new Error(MSG[k]);
    if (/content_reports_kind_check/.test(m)) throw new Error('Falta rodar as migrações 0026 e 0028 no Supabase.');
    if (/report_content|my_moderation|moderation_|block_user|my_blocks|accept_rules|schema cache/i.test(m) && /not find|does not exist|schema cache/i.test(m)) throw new Error(setupNote('Falta rodar a migração 0024 no Supabase.'));
    throw new Error(m);
  }
  return r.data;
};
const client = async () => (await import('./supabaseAdapter')).getClient();
const supa = () => getState().mode === 'supabase';

/* ---- demonstração ---- */
const DK = { st: 'wz.demo.mod', rep: 'wz.demo.reports', blk: 'wz.demo.blocks', log: 'wz.demo.modlog' };
const load = <T>(k: string, d: T): T => { try { const x = localStorage.getItem(k); return x ? (JSON.parse(x) as T) : d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* só nesta visita */ } };
const uid = () => Math.random().toString(16).slice(2) + Date.now().toString(16);
type DemoReport = { id: string; kind: ReportKind; handle: string; ref: string; reason: ReportReason; note?: string; snapshot: Snapshot; at: string; status: 'aberta' | 'resolvida' | 'arquivada' };
const demoStatus = (): ModStatus => load<ModStatus>(DK.st, { rulesAcceptedAt: null, suspendedUntil: null, notices: [] });

/* ---- situação da própria pessoa (regras, suspensão, avisos), compartilhada pelas telas ---- */
let status: ModStatus | null = null;
let loading: Promise<ModStatus | null> | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const setStatus = (s: ModStatus | null) => { status = s; emit(); };

export async function refreshModeration(): Promise<ModStatus | null> {
  if (!supa()) { setStatus(demoStatus()); return status; }
  const sb = await client();
  const r = await sb.rpc('my_moderation');
  if (r.error) { setStatus({ rulesAcceptedAt: null, suspendedUntil: null, notices: [] }); return status; } // sem a 0024 ainda
  setStatus((r.data as ModStatus | null) ?? { rulesAcceptedAt: null, suspendedUntil: null, notices: [] });
  return status;
}
function ensureLoaded() {
  if (status || loading) return;
  loading = refreshModeration().finally(() => { loading = null; });
}
export function useModeration(): ModStatus | null {
  return useSyncExternalStore((f) => { subs.add(f); ensureLoaded(); return () => { subs.delete(f); }; }, () => status, () => null);
}
export function resetModeration() { status = null; emit(); }

/* ---- aceite das regras: quem ainda não aceitou vê as regras antes de deixar algo público ---- */
type Ask = { resolve: (ok: boolean) => void } | null;
let ask: Ask = null;
const askSubs = new Set<() => void>();
export function useRulesAsk(): Ask { return useSyncExternalStore((f) => { askSubs.add(f); return () => { askSubs.delete(f); }; }, () => ask, () => null); }
export function answerRules(accepted: boolean) {
  const a = ask; ask = null; askSubs.forEach((f) => f());
  a?.resolve(accepted);
}
/** Devolve true se a pessoa já aceitou ou aceitou agora. Use antes de qualquer coisa que deixe conteúdo público. */
export async function ensureRules(): Promise<boolean> {
  const s = status ?? (await refreshModeration());
  if (s?.rulesAcceptedAt) return true;
  return new Promise<boolean>((resolve) => { ask = { resolve }; askSubs.forEach((f) => f()); });
}

/* ---- bloqueios: lista compartilhada pelas telas ---- */
let blocks: BlockRow[] | null = null;
const blockSubs = new Set<() => void>();
async function loadBlocks(): Promise<BlockRow[]> {
  if (!supa()) blocks = load<BlockRow[]>(DK.blk, []);
  else {
    const r = await (await client()).rpc('my_blocks');
    blocks = r.error ? [] : ((r.data as BlockRow[] | null) ?? []);
  }
  blockSubs.forEach((f) => f());
  return blocks;
}
let blocksLoading = false;
export function useBlocks(): BlockRow[] | null {
  return useSyncExternalStore((f) => {
    blockSubs.add(f);
    if (!blocks && !blocksLoading) { blocksLoading = true; void loadBlocks().catch(() => { blocks = []; }).finally(() => { blocksLoading = false; }); }
    return () => { blockSubs.delete(f); };
  }, () => blocks, () => null);
}

export const moderationApi = {
  async acceptRules(): Promise<void> {
    if (!supa()) { const s = demoStatus(); s.rulesAcceptedAt = new Date().toISOString(); save(DK.st, s); setStatus(s); return; }
    ok(await (await client()).rpc('accept_rules'));
    await refreshModeration();
  },
  async ack(id: string): Promise<void> {
    if (!supa()) { const s = demoStatus(); s.notices = s.notices.filter((n) => n.id !== id); save(DK.st, s); setStatus(s); return; }
    ok(await (await client()).rpc('ack_notice', { p_id: id }));
    if (status) setStatus({ ...status, notices: status.notices.filter((n) => n.id !== id) });
  },
  async report(kind: ReportKind, handle: string, ref: string, reason: ReportReason, note: string, snapshot: Snapshot = {}): Promise<'ok' | 'atualizada'> {
    if (!supa()) {
      const list = load<DemoReport[]>(DK.rep, []);
      const r = ['perfil', 'museu'].includes(kind) ? '' : ref;
      const same = list.find((x) => x.status === 'aberta' && x.kind === kind && x.handle.toLowerCase() === handle.toLowerCase() && x.ref === r);
      if (same) { same.reason = reason; same.note = note.trim() || same.note; same.at = new Date().toISOString(); save(DK.rep, list); return 'atualizada'; }
      list.push({ id: uid(), kind, handle, ref: r, reason, note: note.trim() || undefined, snapshot, at: new Date().toISOString(), status: 'aberta' });
      save(DK.rep, list);
      return 'ok';
    }
    return ok(await (await client()).rpc('report_content', { p_kind: kind, p_handle: handle, p_ref: ref, p_reason: reason, p_note: note.trim() || null })) as 'ok' | 'atualizada';
  },
  async block(handle: string, kind: BlockKind): Promise<void> {
    if (!supa()) {
      const list = load<BlockRow[]>(DK.blk, []).filter((b) => (b.handle ?? '').toLowerCase() !== handle.toLowerCase());
      list.unshift({ id: `demo-${handle.toLowerCase()}`, handle, kind, at: new Date().toISOString() });
      save(DK.blk, list);
    } else ok(await (await client()).rpc('block_user', { p_handle: handle, p_kind: kind }));
    await loadBlocks();
  },
  async unblock(id: string): Promise<void> {
    if (!supa()) save(DK.blk, load<BlockRow[]>(DK.blk, []).filter((b) => b.id !== id));
    else ok(await (await client()).rpc('unblock_user', { p_id: id }));
    await loadBlocks();
  },
  async queue(): Promise<QueueItem[]> {
    if (!supa()) {
      const groups = new Map<string, QueueItem>();
      for (const r of load<DemoReport[]>(DK.rep, []).filter((x) => x.status === 'aberta')) {
        const k = `${r.kind}|${r.handle.toLowerCase()}|${r.ref}`;
        const g = groups.get(k) ?? { kind: r.kind, ref: r.ref, owner: `demo-${r.handle.toLowerCase()}`, handle: r.handle, count: 0, reasons: [], notes: [], firstAt: r.at, lastAt: r.at, snapshot: r.snapshot, now: r.snapshot, history: 0, suspendedUntil: null };
        g.count++; if (!g.reasons.includes(r.reason)) g.reasons.push(r.reason); if (r.note) g.notes.push(r.note);
        if (r.at < g.firstAt) g.firstAt = r.at; if (r.at > g.lastAt) { g.lastAt = r.at; g.snapshot = r.snapshot; }
        groups.set(k, g);
      }
      const log = load<LogItem[]>(DK.log, []);
      return [...groups.values()].map((g) => ({ ...g, history: log.filter((l) => l.owner === g.owner && !l.undoneAt && l.action !== 'arquivar').length })).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    }
    return (ok(await (await client()).rpc('moderation_queue')) as QueueItem[] | null) ?? [];
  },
  async act(item: Pick<QueueItem, 'kind' | 'owner' | 'ref' | 'handle'>, action: ModAction, message: string, days?: number): Promise<{ id: string; reports: number }> {
    if (!supa()) {
      const list = load<DemoReport[]>(DK.rep, []);
      let n = 0;
      for (const r of list) if (r.status === 'aberta' && r.kind === item.kind && `demo-${r.handle.toLowerCase()}` === item.owner && r.ref === item.ref) { r.status = action === 'arquivar' ? 'arquivada' : 'resolvida'; n++; }
      save(DK.rep, list);
      const until = action === 'suspender' ? new Date(Date.now() + (days ?? 7) * 86_400_000).toISOString() : null;
      const entry: LogItem = { id: uid(), kind: item.kind, ref: item.ref, action, message: message.trim() || null, until, reports: n, at: new Date().toISOString(), owner: item.owner, handle: item.handle, by: null };
      save(DK.log, [entry, ...load<LogItem[]>(DK.log, [])]);
      // Na demonstração, o aviso chega para você mesmo, para ver como fica.
      if (action !== 'arquivar') {
        const s = demoStatus();
        s.notices.unshift({ id: entry.id, kind: action, text: demoNotice(item.kind, action, until) + (message.trim() ? ` Mensagem da moderação: ${message.trim()}` : ''), at: entry.at });
        if (until) s.suspendedUntil = until;
        save(DK.st, s); setStatus(s);
      }
      return { id: entry.id, reports: n };
    }
    const r = ok(await (await client()).rpc('moderation_act', { p_kind: item.kind, p_owner: item.owner, p_ref: item.ref, p_action: action, p_message: message.trim() || null, p_days: days ?? null })) as { id: string; reports: number };
    return r;
  },
  async log(): Promise<LogItem[]> {
    if (!supa()) return load<LogItem[]>(DK.log, []);
    return (ok(await (await client()).rpc('moderation_log_list', { p_limit: 100 })) as LogItem[] | null) ?? [];
  },
  async undo(id: string): Promise<void> {
    if (!supa()) {
      const log = load<LogItem[]>(DK.log, []);
      const l = log.find((x) => x.id === id);
      if (l) {
        l.undoneAt = new Date().toISOString(); save(DK.log, log);
        const s = demoStatus(); s.notices = s.notices.filter((n) => n.id !== id);
        if (l.action === 'suspender') s.suspendedUntil = null;
        save(DK.st, s); setStatus(s);
      }
      return;
    }
    ok(await (await client()).rpc('moderation_undo', { p_log: id }));
  },
};

function demoNotice(kind: ReportKind, action: ModAction, until: string | null): string {
  const what = kind === 'jornada' ? 'Uma Jornada' : kind === 'vitrine' ? 'Uma vitrine' : kind === 'momento' ? 'Uma foto de momento' : kind === 'museu' ? 'O seu Museu'
    : kind === 'clube' ? 'Um clube seu' : kind === 'jogatina' ? 'Uma jogatina sua' : kind === 'comunidade' ? 'Uma comunidade sua' : kind === 'postagem' ? 'Uma postagem sua' : kind === 'resposta' ? 'Uma resposta sua' : 'O seu perfil';
  switch (action) {
    case 'avisar': return `A moderação revisou uma denúncia sobre ${what.toLowerCase()} e pede atenção às regras da comunidade.`;
    case 'ocultar': return ['comunidade', 'postagem', 'resposta', 'clube', 'jogatina'].includes(kind) ? `${what} saiu do ar por decisão da moderação. Só você ainda consegue ver.` : `${what} saiu do seu perfil público por decisão da moderação. Continua no seu diário, só para você.`;
    case 'suspender': return `O seu perfil público fica fora do ar até ${until ? new Date(until).toLocaleDateString('pt-BR') : ''}. O seu diário continua funcionando normalmente.`;
    case 'limpar_bio': return 'A sua bio foi apagada pela moderação.';
    case 'trocar_arroba': return 'O seu @ precisou ser trocado por decisão da moderação. Escolha um novo para continuar.';
    case 'tirar_imagens': return 'A foto e a capa do seu perfil foram retiradas pela moderação.';
    default: return '';
  }
}

export { targetLabel, targetLink } from '../lib/moderation';
