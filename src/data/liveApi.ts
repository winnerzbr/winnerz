/**
 * Sistema de live (migração 0082): os alertas da Twitch (e, depois, do YouTube) que o overlay mostra, a Central da live
 * no Studio (estado do canal, testes) e os textos das cenas. O overlay não tem login: lê os alertas do dia direto do
 * banco (só o tipo, o nome público e o número). Na demonstração, tudo fica neste navegador.
 */
import { getState } from './store';

export type TipoAlerta = 'follow' | 'sub' | 'resub' | 'gift' | 'cheer' | 'raid' | 'superchat' | 'member';
export interface LiveEvento { id: number; origem: 'twitch' | 'youtube' | 'teste'; tipo: TipoAlerta; quem: string; valor: number | null; created_at: string }
export interface LivePrefs { temporada?: string; youtube?: string; twitch?: string; discord?: string; papo?: string; proxima?: string; comecaEm?: string | null; pausaMin?: number; camLado?: 'direita' | 'esquerda' }
export interface Inscricao { tipo: string; id: string | null; status: string }
export interface LiveEstado { canal: string | null; status: string | null; subs: Inscricao[] | null; twitch: boolean }

export const TIPOS_ALERTA: { tipo: TipoAlerta; nome: string }[] = [
  { tipo: 'follow', nome: 'Seguidor' }, { tipo: 'sub', nome: 'Inscrição' }, { tipo: 'resub', nome: 'Renovação' },
  { tipo: 'gift', nome: 'Presente' }, { tipo: 'cheer', nome: 'Bits' }, { tipo: 'raid', nome: 'Raid' },
];
export const NOME_INSCRICAO: Record<string, string> = {
  pontos: 'Pontos do canal (figurinhas)', follow: 'Seguidores', sub: 'Inscrições', resub: 'Renovações', gift: 'Inscrições de presente', cheer: 'Bits', raid: 'Raids',
};

const supa = () => getState().mode === 'supabase';
const token = async () => (await import('./supabaseAdapter')).accessToken();
async function pontes<T>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch('/api/pontes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify(body) });
  const j = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(j.error ?? 'Não deu certo agora.');
  return j;
}

/* ---- Demonstração ---- */
const DK = 'wz.demo.live';
const lerDemo = (): LiveEvento[] => { try { return JSON.parse(localStorage.getItem(DK) ?? '[]') as LiveEvento[]; } catch { return []; } };
const EXEMPLO: Record<TipoAlerta, { quem: string; valor: number | null }> = {
  follow: { quem: 'quem_seguiu', valor: null }, sub: { quem: 'quem_se_inscreveu', valor: 1 }, resub: { quem: 'quem_voltou', valor: 7 },
  gift: { quem: 'quem_presenteou', valor: 5 }, cheer: { quem: 'quem_mandou_bits', valor: 500 }, raid: { quem: 'canal_amigo', valor: 42 },
  superchat: { quem: 'quem_mandou', valor: 2000 }, member: { quem: 'quem_virou_membro', valor: null },
};

export const liveApi = {
  /** Os alertas novos depois do id (o overlay pergunta a cada 2 s). Sem desde, só o último id (para não repetir os antigos). */
  async eventos(desde: number | null): Promise<LiveEvento[]> {
    if (!supa()) { const l = lerDemo(); return desde == null ? l.slice(-1) : l.filter((e) => e.id > desde); }
    const { getClient } = await import('./supabaseAdapter');
    const sb = await getClient();
    const q = sb.from('live_events').select('id,origem,tipo,quem,valor,created_at');
    const r = desde == null ? await q.order('id', { ascending: false }).limit(1) : await q.gt('id', desde).order('id', { ascending: true }).limit(20);
    return (r.data as LiveEvento[] | null) ?? [];
  },
  async estado(): Promise<LiveEstado> {
    if (!supa()) return { canal: 'seu_canal', status: '7 de 7 ligadas', subs: Object.keys(NOME_INSCRICAO).map((tipo) => ({ tipo, id: null, status: 'enabled' })), twitch: true };
    return pontes<LiveEstado>({ live: 'estado' });
  },
  async teste(tipo: TipoAlerta): Promise<void> {
    if (!supa()) {
      const l = lerDemo();
      l.push({ id: (l[l.length - 1]?.id ?? 0) + 1, origem: 'teste', tipo, ...EXEMPLO[tipo], created_at: new Date().toISOString() });
      try { localStorage.setItem(DK, JSON.stringify(l.slice(-30))); } catch { /* nada */ }
      return;
    }
    await pontes({ live: 'teste', tipo });
  },
  /** Autorizar o canal na Twitch (com os escopos dos alertas) e voltar para a Central da live. */
  async ligarCanal(): Promise<void> {
    const r = await pontes<{ url: string }>({ twitchCanal: true, volta: 'live' });
    location.href = r.url;
  },
  async reinscrever(): Promise<string> { return (await pontes<{ status: string }>({ twitchSub: true })).status; },
  /** O endereço assinado do overlay (o mesmo das Preferências). */
  async endereco(rotate = false): Promise<string> {
    if (!supa()) return `${location.origin}/overlay/demo`;
    const r = await fetch('/api/overlay', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ link: true, rotate }) });
    if (!r.ok) throw new Error('Não deu para gerar o endereço agora.');
    return `${location.origin}${(await r.json()).path}`;
  },
};
