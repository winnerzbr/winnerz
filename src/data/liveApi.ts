/**
 * Sistema de live (migração 0082): os alertas da Twitch e do YouTube que o overlay mostra, a Central da live
 * no Studio (estado do canal, testes) e os textos das cenas. O overlay não tem login: lê os alertas do dia direto do
 * banco (só o tipo, o nome público e o número). Na demonstração, tudo fica neste navegador.
 */
import { getState } from './store';

export type TipoAlerta = 'follow' | 'sub' | 'resub' | 'gift' | 'cheer' | 'raid' | 'superchat' | 'member';
export interface LiveEvento { id: number; origem: 'twitch' | 'youtube' | 'teste'; tipo: TipoAlerta; quem: string; valor: number | null; extra?: string | null; created_at: string }
export interface ChatYoutube { id: number; quem: string; texto: string; membro: boolean; created_at: string }
export interface YoutubeEstado { servidor: boolean; ligado: boolean; canal: string | null; status: string | null; aoVivo: boolean; migracao: boolean }
export interface VoltaYoutube { ativa: boolean; esperarMs: number; status: string; mensagens?: number; alertas?: number }
export interface LivePrefs { temporada?: string; youtube?: string; twitch?: string; discord?: string; papo?: string; proxima?: string; comecaEm?: string | null; pausaMin?: number; camLado?: 'direita' | 'esquerda' }
export interface Inscricao { tipo: string; id: string | null; status: string }
export interface BotEstado { migracao: boolean; login: string | null; canalPermite: boolean; mesmaConta: boolean; migracao85?: boolean; aviso?: string | null }

/* ---- Etapa 3b: o bot no chat (migração 0085) ---- */
export interface BotConfig { responde_mencoes?: boolean; ligado: boolean; pontos_nome: string; pontos_msg: number; pontos_assistir: number; mod_links: boolean; mod_links_ok: string; mod_caps: boolean; mod_palavras: string; mod_acao: 'apagar' | 'castigo'; mod_segundos: number; mod_isentos_subs: boolean; status: string | null }
export interface Comando { nome: string; resposta: string; soMod: boolean; ativo: boolean; usos: number }
export interface AvisoBot { id: string; texto: string; aCadaMin: number; minMsgs: number; ativo: boolean; ultimoEm: string | null }
export interface BotDados { config: BotConfig; comandos: Comando[]; avisos: AvisoBot[]; top: { nome: string; pontos: number; pl: string }[]; pessoas: number }
export type AcaoBot = 'config' | 'comando-salvar' | 'comando-apagar' | 'aviso-salvar' | 'aviso-apagar' | 'pontos-zerar';
/* ---- Etapa 4a: a memória do IAmiguinho (migração 0086) ---- */
export interface PessoaMemoria { quem: string; nome: string; pl: 'tw' | 'yt'; conversas: number; primeiraVez: string; ultimaVez: string; fatos: { t: string; em: string }[]; recentes: { p: string; r: string; em: string }[] }
export interface Memoria { responde: boolean; total: number; pessoas: PessoaMemoria[] }
export type AcaoMemoria = 'apagar' | 'apagar-fato' | 'apagar-tudo' | 'mencoes';
const MK = 'wz.demo.memoria';
const dias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
const MEMORIA_DEMO = (): Memoria => ({ responde: true, total: 3, pessoas: [
  { quem: 'tw:1', nome: 'dona_fenix', pl: 'tw', conversas: 34, primeiraVez: dias(120), ultimaVez: dias(0), fatos: [{ t: 'joga Hollow Knight', em: dias(90) }, { t: 'acha o Radahn injusto', em: dias(12) }, { t: 'pediu para ser chamada de Fê', em: dias(40) }],
    recentes: [{ p: 'IAmiguinho, hoje passa do chefe?', r: 'Passa. Eu confio. Eu também confiava no meu tutorial número 48, mas dessa vez é diferente.', em: dias(0) }] },
  { quem: 'yt:UCx', nome: 'Ana Joga', pl: 'yt', conversas: 6, primeiraVez: dias(30), ultimaVez: dias(2), fatos: [{ t: 'zerou Celeste duas vezes', em: dias(20) }], recentes: [{ p: 'IAmiguinho conta uma piada', r: 'Comprei um jogo de 40 reais e baixei 120 GB de patch. Agora o jogo é que me deve.', em: dias(2) }] },
  { quem: 'tw:3', nome: 'pixel_torto', pl: 'tw', conversas: 1, primeiraVez: dias(1), ultimaVez: dias(1), fatos: [], recentes: [{ p: 'oi IAmiguinho', r: 'Oi! Cheguei atrasado, mas cheguei. Já é uma vitória.', em: dias(1) }] },
] });
const lerMemoriaDemo = (): Memoria => { try { return (JSON.parse(localStorage.getItem(MK) ?? 'null') as Memoria | null) ?? MEMORIA_DEMO(); } catch { return MEMORIA_DEMO(); } };
function memoriaDemo(acao: AcaoMemoria, a: Record<string, unknown>): Memoria {
  const d = lerMemoriaDemo();
  if (acao === 'apagar') d.pessoas = d.pessoas.filter((x) => x.quem !== a.quem);
  if (acao === 'apagar-fato') d.pessoas = d.pessoas.map((x) => (x.quem === a.quem ? { ...x, fatos: x.fatos.filter((_, i) => i !== Number(a.i)) } : x));
  if (acao === 'apagar-tudo') d.pessoas = [];
  if (acao === 'mencoes') d.responde = a.ligado !== false;
  d.total = d.pessoas.length;
  try { localStorage.setItem(MK, JSON.stringify(d)); } catch { /* nada */ }
  const b = String(a.busca ?? '').toLowerCase();
  return b ? { ...d, pessoas: d.pessoas.filter((x) => x.nome.toLowerCase().includes(b)) } : d;
}
const BK = 'wz.demo.bot';
const BOT_DEMO = (): BotDados => ({
  config: { ligado: true, pontos_nome: 'pontos', pontos_msg: 5, pontos_assistir: 10, mod_links: true, mod_links_ok: 'winnerz.com.br twitch.tv youtube.com youtu.be', mod_caps: false, mod_palavras: '', mod_acao: 'apagar', mod_segundos: 60, mod_isentos_subs: true, status: null },
  comandos: [
    { nome: '!discord', resposta: 'Entra no Discord do canal: {discord}', soMod: false, ativo: true, usos: 12 },
    { nome: '!figurinha', resposta: 'Figurinhas da live: winnerz.com.br/codigo', soMod: false, ativo: true, usos: 31 },
    { nome: '!redes', resposta: 'YouTube: {youtube} · Twitch: {twitch} · Discord: {discord}', soMod: false, ativo: true, usos: 4 },
    { nome: '!so', resposta: 'Conheçam o canal de {alvo}: twitch.tv/{alvo}', soMod: true, ativo: true, usos: 2 },
    { nome: '!tempo', resposta: 'No ar há {tempo}.', soMod: false, ativo: true, usos: 6 },
  ],
  avisos: [{ id: 'padrao', texto: 'Curtindo a live? Segue o canal e pega uma figurinha em winnerz.com.br/codigo', aCadaMin: 20, minMsgs: 15, ativo: false, ultimoEm: null }],
  top: [{ nome: 'dona_fenix', pontos: 1240, pl: 'tw' }, { nome: 'pixel_torto', pontos: 985, pl: 'tw' }, { nome: 'Ana Joga', pontos: 610, pl: 'yt' }, { nome: 'npc_feliz', pontos: 420, pl: 'tw' }, { nome: 'chefe_final', pontos: 155, pl: 'tw' }],
  pessoas: 37,
});
const lerBotDemo = (): BotDados => { try { return (JSON.parse(localStorage.getItem(BK) ?? 'null') as BotDados | null) ?? BOT_DEMO(); } catch { return BOT_DEMO(); } };
function botDemo(acao: AcaoBot, a: Record<string, unknown>): BotDados {
  const d = lerBotDemo();
  if (acao === 'config') d.config = { ...d.config, ...(a as Partial<BotConfig>) };
  if (acao === 'comando-salvar') {
    let nome = String(a.nome ?? '').trim().toLowerCase(); if (!nome.startsWith('!')) nome = `!${nome}`;
    if (!/^![a-z0-9_]{1,24}$/.test(nome)) throw new Error('O comando precisa ser ! seguido de letras sem acento, números ou _ (até 24).');
    if (['!top', '!pontos', '!comandos', '!morte', '!mortes'].includes(nome)) throw new Error('Esse comando já é da casa.');
    if (!String(a.resposta ?? '').trim()) throw new Error('Escreva a resposta do comando.');
    d.comandos = d.comandos.filter((c) => c.nome !== nome && c.nome !== a.antigo);
    d.comandos.push({ nome, resposta: String(a.resposta).trim().slice(0, 400), soMod: !!a.soMod, ativo: a.ativo !== false, usos: 0 });
    d.comandos.sort((x, y) => x.nome.localeCompare(y.nome));
  }
  if (acao === 'comando-apagar') d.comandos = d.comandos.filter((c) => c.nome !== a.nome);
  if (acao === 'aviso-salvar') {
    if (!String(a.texto ?? '').trim()) throw new Error('Escreva o texto do aviso.');
    const novo = { id: String(a.id || Math.random().toString(36).slice(2, 14)), texto: String(a.texto).trim().slice(0, 400), aCadaMin: Number(a.aCadaMin) || 20, minMsgs: Number(a.minMsgs) || 0, ativo: a.ativo !== false, ultimoEm: null };
    d.avisos = d.avisos.some((x) => x.id === novo.id) ? d.avisos.map((x) => (x.id === novo.id ? novo : x)) : [...d.avisos, novo];
  }
  if (acao === 'aviso-apagar') d.avisos = d.avisos.filter((x) => x.id !== a.id);
  if (acao === 'pontos-zerar') { d.top = []; d.pessoas = 0; }
  try { localStorage.setItem(BK, JSON.stringify(d)); } catch { /* nada */ }
  return d;
}
export interface LiveEstado { canal: string | null; status: string | null; subs: Inscricao[] | null; twitch: boolean; callback?: string; youtube?: YoutubeEstado; bot?: BotEstado }

/* ---- Etapa 3a: os widgets da tela (migração 0084) ---- */
export type TipoMeta = 'seguidores' | 'inscritos' | 'bits';
export interface Meta { id: string; tipo: TipoMeta; titulo: string; alvo: number; atual: number; mostrar: boolean }
export interface Enquete { id: string; pergunta: string; opcoes: string[]; votos: number[]; aberta: boolean; mostrar: boolean; abertaEm?: string; fechaEm?: string | null }
export interface Sorteio { id: string; palavra: string; aberto: boolean; mostrar: boolean; participantes: number; ganhador: string | null; sorteadoEm?: string }
export interface Painel { mortes: number; mortesRotulo: string | null; mostrarMortes: boolean; metas: Meta[]; enquete: Enquete | null; sorteio: Sorteio | null; inicio: string | null; agora: string }
export interface Creditos { seguidores: string[]; inscritos: string[]; apoios: string[]; raids: string[]; conversa: string[] }
export type AcaoPainel = 'mortes' | 'metas' | 'enquete-abrir' | 'enquete-fechar' | 'enquete-mostrar' | 'enquete-tirar' | 'sorteio-abrir' | 'sorteio-fechar' | 'sorteio-sortear' | 'sorteio-mostrar' | 'sorteio-tirar' | 'nova-live';
export const NOME_META: Record<TipoMeta, string> = { seguidores: 'Seguidores (Twitch) e inscritos (YouTube)', inscritos: 'Inscrições (Twitch) e membros (YouTube)', bits: 'Bits' };
export const TITULO_META: Record<TipoMeta, string> = { seguidores: 'Meta de seguidores', inscritos: 'Meta de inscrições', bits: 'Meta de bits' };
const PAINEL_VAZIO = (): Painel => ({ mortes: 0, mortesRotulo: null, mostrarMortes: false, metas: [], enquete: null, sorteio: null, inicio: null, agora: new Date().toISOString() });

export type TesteAlerta = TipoAlerta | 'yt-inscrito';
export const TIPOS_ALERTA: { tipo: TesteAlerta; nome: string }[] = [
  { tipo: 'follow', nome: 'Seguidor' }, { tipo: 'sub', nome: 'Inscrição' }, { tipo: 'resub', nome: 'Renovação' },
  { tipo: 'gift', nome: 'Presente' }, { tipo: 'cheer', nome: 'Bits' }, { tipo: 'raid', nome: 'Raid' },
  { tipo: 'yt-inscrito', nome: 'Inscrito (YouTube)' }, { tipo: 'superchat', nome: 'Super Chat' }, { tipo: 'member', nome: 'Membro' },
];
export const NOME_INSCRICAO: Record<string, string> = {
  pontos: 'Pontos do canal (figurinhas)', follow: 'Seguidores', sub: 'Inscrições', resub: 'Renovações', gift: 'Inscrições de presente', cheer: 'Bits', raid: 'Raids',
  online: 'Início da live', chat: 'Chat (pela conta do IAmiguinho)',
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

/* Demonstração dos widgets: o painel fica neste navegador e o "chat" de mentira vota e entra no sorteio sozinho. */
const PK = 'wz.demo.painel';
const NOMES_DEMO = ['pixel_torto', 'ana_joga', 'chefe_final', 'mestre_do_save', 'lagarta_veloz', 'boss_de_quinta', 'quase_zerou', 'combo_quebrado', 'speedrun_lento', 'npc_feliz', 'joystick_veio', 'dona_fenix'];
type PainelDemo = Painel & { _votos?: number[]; _gente?: string[]; _metasDesde?: Record<string, string> };
const lerPainelDemo = (): PainelDemo => { try { return { ...PAINEL_VAZIO(), ...(JSON.parse(localStorage.getItem(PK) ?? 'null') ?? {}) } as PainelDemo; } catch { return PAINEL_VAZIO(); } };
const gravarPainelDemo = (p: PainelDemo) => { try { localStorage.setItem(PK, JSON.stringify(p)); } catch { /* nada */ } };
const vivoDemo = (p: PainelDemo): Painel => {
  const agora = Date.now();
  const e = p.enquete;
  if (e?.aberta && e.fechaEm && Date.parse(e.fechaEm) <= agora) e.aberta = false;
  if (e?.aberta) e.votos = e.votos.map((v, i) => v + (Math.random() < 0.55 ? Math.floor(Math.random() * (3 - i * 0.6)) : 0));
  const so = p.sorteio;
  if (so?.aberto && Math.random() < 0.7) so.participantes += 1 + Math.floor(Math.random() * 2);
  const ev = lerDemo();
  p.metas = p.metas.map((m) => {
    const desde = Date.parse(p._metasDesde?.[m.id] ?? '0');
    const l = ev.filter((x) => Date.parse(x.created_at) >= desde);
    const atual = m.tipo === 'seguidores' ? l.filter((x) => x.tipo === 'follow').length
      : m.tipo === 'inscritos' ? l.reduce((n, x) => n + (x.tipo === 'gift' ? x.valor ?? 1 : ['sub', 'resub', 'member'].includes(x.tipo) ? 1 : 0), 0)
      : l.reduce((n, x) => n + (x.tipo === 'cheer' ? x.valor ?? 0 : 0), 0);
    return { ...m, atual };
  });
  gravarPainelDemo(p);
  const { _votos, _gente, _metasDesde, ...publico } = p; void _votos; void _gente; void _metasDesde;
  return { ...publico, agora: new Date().toISOString() };
};
function acaoDemo(acao: AcaoPainel, a: Record<string, unknown>): Painel {
  const p = lerPainelDemo();
  const novoId = () => Math.random().toString(36).slice(2, 14);
  switch (acao) {
    case 'mortes':
      if (typeof a.valor === 'number') p.mortes = a.valor; else p.mortes = Math.max(0, p.mortes + (Number(a.delta) || 0));
      if (typeof a.rotulo === 'string') p.mortesRotulo = a.rotulo.trim().slice(0, 40) || null;
      if (typeof a.mostrar === 'boolean') p.mostrarMortes = a.mostrar;
      break;
    case 'metas': {
      const desde = { ...(p._metasDesde ?? {}) };
      p.metas = ((a.metas as Partial<Meta & { recomecar?: boolean }>[]) ?? []).slice(0, 3).map((m) => {
        const id = m.id && p.metas.some((x) => x.id === m.id) ? m.id : novoId();
        if (!desde[id] || m.recomecar) desde[id] = new Date().toISOString();
        return { id, tipo: m.tipo ?? 'seguidores', titulo: (m.titulo ?? '').slice(0, 40), alvo: Math.max(1, Number(m.alvo) || 10), atual: 0, mostrar: m.mostrar !== false };
      });
      p._metasDesde = desde;
      break;
    }
    case 'enquete-abrir': {
      const opcoes = ((a.opcoes as string[]) ?? []).map((x) => String(x).trim().slice(0, 40)).filter(Boolean).slice(0, 5);
      if (opcoes.length < 2) throw new Error('A enquete precisa de pelo menos duas opções.');
      const seg = Number(a.segundos) || 0;
      p.enquete = { id: novoId(), pergunta: String(a.pergunta ?? '').trim().slice(0, 90), opcoes, votos: opcoes.map(() => 0), aberta: true, mostrar: true, abertaEm: new Date().toISOString(), fechaEm: seg ? new Date(Date.now() + seg * 1000).toISOString() : null };
      break;
    }
    case 'enquete-fechar': if (p.enquete) { p.enquete.aberta = false; p.enquete.fechaEm = new Date().toISOString(); } break;
    case 'enquete-mostrar': if (p.enquete) p.enquete.mostrar = a.mostrar !== false; break;
    case 'enquete-tirar': p.enquete = null; break;
    case 'sorteio-abrir': p.sorteio = { id: novoId(), palavra: String(a.palavra ?? '').trim().toLowerCase().replace(/\s+/g, '').slice(0, 24) || '!sorteio', aberto: true, mostrar: true, participantes: 0, ganhador: null }; p._gente = []; break;
    case 'sorteio-fechar': if (p.sorteio) p.sorteio.aberto = false; break;
    case 'sorteio-sortear': {
      if (!p.sorteio?.participantes) throw new Error('Ninguém entrou no sorteio (ou todos já ganharam).');
      const ja = p._gente ?? [];
      const livres = NOMES_DEMO.filter((x) => !ja.includes(x));
      if (!livres.length) throw new Error('Ninguém entrou no sorteio (ou todos já ganharam).');
      const g = livres[Math.floor(Math.random() * livres.length)];
      p._gente = [...ja, g];
      p.sorteio = { ...p.sorteio, aberto: false, mostrar: true, ganhador: g, sorteadoEm: new Date().toISOString() };
      break;
    }
    case 'sorteio-mostrar': if (p.sorteio) p.sorteio.mostrar = a.mostrar !== false; break;
    case 'sorteio-tirar': p.sorteio = null; break;
    case 'nova-live': p.inicio = new Date().toISOString(); break;
  }
  return vivoDemo(p);
}

export const liveApi = {
  /** O painel dos widgets (o overlay pergunta a cada 2 s; sem login). */
  async painel(): Promise<Painel | null> {
    if (!supa()) return vivoDemo(lerPainelDemo());
    const { getClient } = await import('./supabaseAdapter');
    const r = await (await getClient()).rpc('live_painel_ler');
    return r.error ? null : ((r.data as Painel | null) ?? null);
  },
  /** Quem apareceu na live (para os créditos). */
  async creditos(): Promise<Creditos | null> {
    if (!supa()) return { seguidores: NOMES_DEMO.slice(0, 7), inscritos: NOMES_DEMO.slice(7, 10), apoios: ['dona_fenix', 'npc_feliz'], raids: ['canal_amigo'], conversa: [...NOMES_DEMO].reverse().slice(0, 10) };
    const { getClient } = await import('./supabaseAdapter');
    const r = await (await getClient()).rpc('live_creditos');
    return r.error ? null : ((r.data as Creditos | null) ?? null);
  },
  /** A Central muda o painel (só a administração). */
  async acao(acao: AcaoPainel, a: Record<string, unknown> = {}): Promise<Painel> {
    if (!supa()) return acaoDemo(acao, a);
    const { getClient } = await import('./supabaseAdapter');
    const r = await (await getClient()).rpc('live_painel_acao', { p_acao: acao, p: a });
    if (r.error) throw new Error(/live_painel_acao|function/i.test(r.error.message) && /not find|does not exist|schema cache/i.test(r.error.message) ? 'Falta rodar a migração 0084 no Supabase.' : r.error.message.slice(0, 140));
    return r.data as Painel;
  },
  /** Ligar a conta do IAmiguinho na Twitch (o bot): entra na Twitch com a conta dele e volta para a Central. */
  async ligarBot(): Promise<void> {
    const r = await pontes<{ url: string }>({ twitchBot: true });
    location.href = r.url;
  },
  /** O bot no chat: regras, comandos, avisos e o top dos pontos (só a administração). */
  async bot(): Promise<BotDados | null> {
    if (!supa()) return lerBotDemo();
    const { getClient } = await import('./supabaseAdapter');
    const r = await (await getClient()).rpc('live_bot_ler');
    if (r.error) { if (/live_bot_ler|function/i.test(r.error.message) && /not find|does not exist|schema cache/i.test(r.error.message)) return null; throw new Error(r.error.message.slice(0, 140)); }
    return r.data as BotDados;
  },
  async botAcao(acao: AcaoBot, a: Record<string, unknown> = {}): Promise<BotDados> {
    if (!supa()) return botDemo(acao, a);
    const { getClient } = await import('./supabaseAdapter');
    const r = await (await getClient()).rpc('live_bot_admin', { p_acao: acao, p: a });
    if (r.error) throw new Error(/live_bot_admin|function/i.test(r.error.message) && /not find|does not exist|schema cache/i.test(r.error.message) ? 'Falta rodar a migração 0085 no Supabase.' : r.error.message.slice(0, 140));
    return r.data as BotDados;
  },
  /** Quem o IAmiguinho lembra (só a administração). */
  async memoria(busca = ''): Promise<Memoria | null> {
    if (!supa()) { const d = lerMemoriaDemo(); const b = busca.toLowerCase(); return b ? { ...d, pessoas: d.pessoas.filter((x) => x.nome.toLowerCase().includes(b)) } : d; }
    const { getClient } = await import('./supabaseAdapter');
    const r = await (await getClient()).rpc('iam_memoria_ler', { p_busca: busca });
    if (r.error) { if (/iam_memoria_ler|function/i.test(r.error.message) && /not find|does not exist|schema cache/i.test(r.error.message)) return null; throw new Error(r.error.message.slice(0, 140)); }
    return r.data as Memoria;
  },
  async memoriaAcao(acao: AcaoMemoria, a: Record<string, unknown> = {}): Promise<Memoria> {
    if (!supa()) return memoriaDemo(acao, a);
    const { getClient } = await import('./supabaseAdapter');
    const r = await (await getClient()).rpc('iam_memoria_admin', { p_acao: acao, p: a });
    if (r.error) throw new Error(/iam_memoria_admin|function/i.test(r.error.message) && /not find|does not exist|schema cache/i.test(r.error.message) ? 'Falta rodar a migração 0086 no Supabase.' : r.error.message.slice(0, 140));
    return r.data as Memoria;
  },
  async desligarBot(): Promise<string> { return (await pontes<{ status: string }>({ live: 'bot-desligar' })).status; },
  /** Os alertas novos depois do id (o overlay pergunta a cada 2 s). Sem desde, só o último id (para não repetir os antigos). */
  async eventos(desde: number | null): Promise<LiveEvento[]> {
    if (!supa()) { const l = lerDemo(); return desde == null ? l.slice(-1) : l.filter((e) => e.id > desde); }
    const { getClient } = await import('./supabaseAdapter');
    const sb = await getClient();
    const ler = (cols: string) => { const q = sb.from('live_events').select(cols); return desde == null ? q.order('id', { ascending: false }).limit(1) : q.gt('id', desde).order('id', { ascending: true }).limit(20); };
    let r = await ler('id,origem,tipo,quem,valor,extra,created_at');
    if (r.error) r = await ler('id,origem,tipo,quem,valor,created_at'); // sem a 0083 ainda
    return (r.data as unknown as LiveEvento[] | null) ?? [];
  },
  /** As mensagens novas do chat do YouTube (o servidor grava; o overlay lê). Sem desde, só marca onde está. */
  async chatYoutube(desde: number | null): Promise<ChatYoutube[]> {
    if (!supa()) return [];
    const { getClient } = await import('./supabaseAdapter');
    const sb = await getClient();
    const q = sb.from('live_chat').select('id,quem,texto,membro,created_at');
    const r = desde == null ? await q.order('id', { ascending: false }).limit(8) : await q.gt('id', desde).order('id', { ascending: true }).limit(50);
    const l = (r.data as ChatYoutube[] | null) ?? [];
    return desde == null ? l.reverse() : l;
  },
  async estado(): Promise<LiveEstado> {
    if (!supa()) return { canal: 'seu_canal', status: '9 de 9 ligadas', subs: Object.keys(NOME_INSCRICAO).map((tipo) => ({ tipo, id: null, status: 'enabled' })), twitch: true, youtube: { servidor: true, ligado: true, canal: 'Seu canal', status: 'ligado', aoVivo: false, migracao: true }, bot: { migracao: true, login: 'iamiguinho', canalPermite: true, mesmaConta: false, migracao85: true, aviso: null } };
    return pontes<LiveEstado>({ live: 'estado' });
  },
  async teste(tipo: TesteAlerta): Promise<void> {
    if (!supa()) {
      const l = lerDemo();
      const yt = tipo === 'yt-inscrito' || tipo === 'superchat' || tipo === 'member';
      const t: TipoAlerta = tipo === 'yt-inscrito' ? 'follow' : tipo;
      l.push({ id: (l[l.length - 1]?.id ?? 0) + 1, origem: yt ? 'youtube' : 'teste', tipo: t, ...EXEMPLO[t], ...(tipo === 'superchat' ? { extra: 'R$ 20,00' } : {}), created_at: new Date().toISOString() });
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
  async youtubeLigar(): Promise<void> {
    const r = await pontes<{ url: string }>({ live: 'youtube-ligar' });
    location.href = r.url;
  },
  async youtubeDesligar(): Promise<void> { await pontes({ live: 'youtube-desligar' }); },
  /** Uma volta de leitura do YouTube (a Central chama de tempos em tempos durante a live). */
  async youtubePuxar(intervalo: number): Promise<VoltaYoutube> {
    if (!supa()) return { ativa: true, esperarMs: intervalo * 1000, status: 'Demonstração: sem YouTube de verdade.', mensagens: 0, alertas: 0 };
    return pontes<VoltaYoutube>({ live: 'youtube', intervalo });
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
