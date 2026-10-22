/**
 * O site dentro do app de celular do WinnerZ (Capacitor). Fora do app nada aqui roda.
 *
 * O que o app ganha além do site:
 * - widgets da Jornada e do Radar na tela inicial (o site manda os dados prontos para exibir);
 * - a sessão aberta fixa na barra de avisos, com o tempo correndo;
 * - avisos do Radar agendados no próprio celular (um dia antes e no dia), sem servidor;
 * - toques nos widgets e nos avisos abrem o app já na tela certa.
 *
 * A ponte com o app é a do próprio Capacitor (window.Capacitor, que o app injeta na página):
 * o site não carrega nenhuma biblioteca a mais por causa disso.
 */
import { getState, subscribe, openSession, lastNote } from '../data/store';
import type { State, Game } from '../data/types';
import { navigate } from './router';
import { loadRadar, daysUntil, type RadarInfo } from './radar';
import { localDay } from './dates';
import { SUPABASE_ON } from './env';

type Ponte = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  nativePromise?: (plugin: string, metodo: string, opcoes?: object) => Promise<unknown>;
  nativeCallback?: (plugin: string, metodo: string, opcoes: object, cb: (dados: unknown, erro?: unknown) => void) => string;
  Plugins?: Record<string, Record<string, (o?: object) => unknown>>;
};
const ponte = (): Ponte | undefined => (window as unknown as { Capacitor?: Ponte }).Capacitor;

/** Está rodando dentro do app (Android ou iPhone)? */
export function noApp(): boolean {
  try { return !!ponte()?.isNativePlatform?.(); } catch { return false; }
}
export function plataformaApp(): 'android' | 'ios' | null {
  if (!noApp()) return null;
  const p = ponte()?.getPlatform?.();
  return p === 'android' || p === 'ios' ? p : null;
}

async function chamar<T = unknown>(plugin: string, metodo: string, opcoes: object = {}): Promise<T | null> {
  const c = ponte();
  if (!c || !noApp()) return null;
  try {
    if (c.nativePromise) return (await c.nativePromise(plugin, metodo, opcoes)) as T;
    const p = c.Plugins?.[plugin];
    if (p?.[metodo]) return (await p[metodo](opcoes)) as T;
  } catch (e) {
    console.warn(`[app] ${plugin}.${metodo} falhou`, e);
  }
  return null;
}
function ouvir(plugin: string, evento: string, cb: (dados: unknown) => void) {
  const c = ponte();
  if (!c || !noApp()) return;
  try {
    if (c.nativeCallback) c.nativeCallback(plugin, 'addListener', { eventName: evento }, (d) => { if (d) cb(d); });
    else c.Plugins?.[plugin]?.addListener?.({ eventName: evento } as object);
  } catch (e) { console.warn(`[app] ouvir ${plugin}.${evento} falhou`, e); }
}

// ── Preferências dos avisos no celular (ficam neste aparelho) ───────────────────
export type AvisosApp = { dia1: boolean; nodia: boolean; data: boolean; sessao: boolean };
const CHAVE_AVISOS = 'wz.app.avisos';
export function avisosApp(): AvisosApp {
  const pad: AvisosApp = { dia1: true, nodia: true, data: true, sessao: true };
  try { return { ...pad, ...JSON.parse(localStorage.getItem(CHAVE_AVISOS) ?? '{}') }; } catch { return pad; }
}
export function salvarAvisosApp(a: AvisosApp) {
  try { localStorage.setItem(CHAVE_AVISOS, JSON.stringify(a)); } catch { /* sem armazenamento */ }
  ultimoRadar = '';
  void agendarRadar(true);
  void sincronizarSessao(true);
}
export async function pedirPermissaoAvisos(): Promise<boolean> {
  const r = await chamar<{ display?: string }>('LocalNotifications', 'requestPermissions');
  return r?.display === 'granted';
}
export async function permissaoAvisos(): Promise<'granted' | 'denied' | 'prompt' | null> {
  const r = await chamar<{ display?: string }>('LocalNotifications', 'checkPermissions');
  const d = r?.display;
  return d === 'granted' || d === 'denied' ? d : d ? 'prompt' : null;
}

// ── Links: widgets e avisos abrem o app na tela certa ──────────────────────────
function abrirEndereco(url: string) {
  try {
    const u = new URL(url, location.origin);
    if (!/(^|\.)winnerz\.com\.br$/.test(u.hostname) && u.origin !== location.origin) return;
    const destino = u.pathname + u.search + u.hash;
    if (destino && destino !== location.pathname + location.search) navigate(destino);
  } catch { /* endereço estranho: ignora */ }
}

// ── Dados dos widgets ───────────────────────────────────────────────────────────
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const diaMes = (dia: string) => { const [, m, d] = dia.split('-').map(Number); return `${d} de ${MESES[m - 1]}`; };
const diaSemana = (dia: string) => SEMANA[new Date(dia + 'T12:00:00Z').getUTCDay()];
const horas = (min: number) => (min < 60 ? `${min} min` : `${(Math.round(min / 6) / 10).toString().replace('.', ',')} h`);

function radarDoEstado(s: State): Game[] {
  return Object.values(s.myGames).filter((m) => m.onRadar && s.games[m.gameId]?.igdbId).map((m) => s.games[m.gameId]);
}

function dadosJornada(s: State) {
  const aberta = openSession(s);
  if (aberta) {
    const j = s.journeys.find((x) => x.id === aberta.journeyId), g = j && s.games[j.gameId];
    if (g) return { estado: 'aberta', titulo: g.title, gameId: g.id, slug: g.slug, inicio: Date.parse(aberta.startedAt), objetivo: aberta.goal ?? '' };
  }
  const vistas = new Set<string>();
  const feitas = s.sessions.filter((x) => x.endedAt).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  for (const ses of feitas) {
    if (vistas.has(ses.journeyId)) continue;
    vistas.add(ses.journeyId);
    const j = s.journeys.find((x) => x.id === ses.journeyId), g = j && s.games[j.gameId];
    if (!j || !g) continue;
    const hs = s.histories.filter((h) => h.journeyId === j.id);
    const atual = hs.find((h) => h.state === 'ativa' || h.state === 'pausada');
    if (!atual) continue;
    const doJogo = s.sessions.filter((x) => x.journeyId === j.id && x.endedAt);
    const minutos = doJogo.reduce((t, x) => t + (x.minutes ?? 0), 0);
    const dias = daysUntil(localDay(), localDay(0, new Date(ses.endedAt!)));
    return {
      estado: 'parado', titulo: g.title, gameId: g.id, slug: g.slug,
      recado: lastNote(s, j.id)?.note ?? '',
      quando: dias <= 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`,
      resumo: `${doJogo.length} ${doJogo.length === 1 ? 'sessão' : 'sessões'}${minutos ? ` · ${horas(minutos)}` : ''}`,
    };
  }
  return { estado: 'vazio' };
}

type ItemRadar = { titulo: string; grande: string; unidade: string; data: string; quando: string; agora: boolean };
function dadosRadar(jogos: Game[], info: Record<number, RadarInfo>): ItemRadar[] {
  const hoje = localDay();
  const linhas = jogos.map((g) => ({ g, i: info[g.igdbId!] })).filter(({ i }) => i && (i.status === 'previsto' || (i.status === 'lancado' && i.day && daysUntil(i.day, hoje) === 0)));
  const comDia = linhas.filter(({ i }) => i!.precision === 'dia' && i!.day && daysUntil(i!.day, hoje) >= 0).sort((a, b) => a.i!.day!.localeCompare(b.i!.day!));
  const semDia = linhas.filter((l) => !comDia.includes(l)).sort((a, b) => (a.i!.sort ?? 'z').localeCompare(b.i!.sort ?? 'z'));
  return [...comDia, ...semDia].slice(0, 3).map(({ g, i }) => {
    if (i!.precision === 'dia' && i!.day) {
      const n = daysUntil(i!.day, hoje), saiu = i!.status === 'lancado';
      return {
        titulo: g.title,
        grande: n === 0 ? (saiu ? 'Saiu hoje' : 'Hoje') : n === 1 ? 'Amanhã' : String(n),
        unidade: n > 1 ? 'dias' : '',
        data: n <= 6 ? `${diaSemana(i!.day)}, ${diaMes(i!.day)}` : diaMes(i!.day),
        quando: n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n <= 60 ? `em ${n} dias` : diaMes(i!.day),
        agora: n <= 1,
      };
    }
    const rotulo = i!.label.replace(/^Sai (em |no |na )?/, '');
    return { titulo: g.title, grande: '', unidade: '', data: rotulo, quando: rotulo, agora: false };
  });
}

let radarInfo: Record<number, RadarInfo> = {};
let radarChave = '';
async function atualizarRadarInfo(s: State) {
  const jogos = radarDoEstado(s), chave = jogos.map((g) => g.igdbId).sort().join(',');
  if (chave === radarChave) return false;
  radarChave = chave;
  radarInfo = jogos.length ? await loadRadar(jogos.map((g) => g.igdbId!)) : {};
  return true;
}

let ultimoWidget = '';
async function atualizarWidgets() {
  const s = getState();
  if (!s.ready || !s.profile) return;
  const dados = { jornada: dadosJornada(s), radar: dadosRadar(radarDoEstado(s), radarInfo) };
  const json = JSON.stringify(dados);
  if (json === ultimoWidget) return;
  ultimoWidget = json;
  await chamar('WinnerzNativo', 'atualizarWidgets', dados);
}

// ── Sessão aberta na barra de avisos ────────────────────────────────────────────
let sessaoMostrada = '';
async function sincronizarSessao(forcar = false) {
  const s = getState();
  const aberta = s.ready ? openSession(s) : null;
  const chave = aberta && avisosApp().sessao ? aberta.id : '';
  if (chave === sessaoMostrada && !forcar) return;
  sessaoMostrada = chave;
  if (!aberta || !chave) { await chamar('WinnerzNativo', 'sessaoFechar'); return; }
  const j = s.journeys.find((x) => x.id === aberta.journeyId), g = j && s.games[j.gameId];
  await chamar('WinnerzNativo', 'sessaoAbrir', { titulo: g?.title ?? 'Sessão aberta', inicio: Date.parse(aberta.startedAt) });
}

// ── Avisos do Radar, agendados no próprio celular ───────────────────────────────
/** Número fixo por jogo e tipo de aviso (o Android pede um inteiro). */
const idAviso = (igdbId: number, tipo: number) => 400000000 + (igdbId % 9000000) * 10 + tipo;
const quando = (dia: string, hora: number) => new Date(`${dia}T${String(hora).padStart(2, '0')}:00:00-03:00`);
const CHAVE_DATAS = 'wz.app.radarDatas';
let ultimoRadar = '';

async function agendarRadar(forcar = false) {
  const s = getState();
  if (!s.ready || !s.profile) return;
  const jogos = radarDoEstado(s), pref = avisosApp();
  const assinatura = JSON.stringify([jogos.map((g) => g.igdbId), radarInfo, pref]);
  if (assinatura === ultimoRadar && !forcar) return;
  ultimoRadar = assinatura;
  if ((await permissaoAvisos()) !== 'granted') return;

  await chamar('LocalNotifications', 'createChannel', { id: 'radar', name: 'Radar', description: 'Lançamentos que você acompanha no Radar', importance: 4, visibility: 1 });
  const agora = Date.now(), hoje = localDay();
  const novos: object[] = [];
  let datas: Record<string, string> = {};
  try { datas = JSON.parse(localStorage.getItem(CHAVE_DATAS) ?? '{}'); } catch { datas = {}; }
  const novasDatas: Record<string, string> = {};

  for (const g of jogos) {
    const i = radarInfo[g.igdbId!];
    if (!i) continue;
    const marca = `${i.status}|${i.precision}|${i.day ?? i.label}`;
    novasDatas[g.igdbId!] = marca;
    const extra = { tipo: 'radar', url: `/jogos/${g.slug}` };
    // Mudou a data desde a última vez que o app olhou: avisa agora.
    const antes = datas[g.igdbId!];
    if (pref.data && antes && antes !== marca && i.status !== 'lancado') {
      const nova = i.precision === 'dia' && i.day ? diaMes(i.day) : i.label.replace(/^Sai /, '').toLowerCase();
      novos.push({ id: idAviso(g.igdbId!, 3), channelId: 'radar', title: `${g.title} mudou de data`, body: i.status === 'cancelado' ? 'O lançamento foi cancelado.' : `Agora: ${nova}. Está no seu Radar.`, schedule: { at: new Date(agora + 5000).toISOString(), allowWhileIdle: true }, extra, smallIcon: 'ic_stat_winnerz' });
    }
    if (i.status !== 'previsto' || i.precision !== 'dia' || !i.day) continue;
    const n = daysUntil(i.day, hoje);
    if (pref.dia1 && n >= 1) {
      const at = quando(localDay(-1, new Date(i.day + 'T12:00:00-03:00')), 10);
      if (at.getTime() > agora) novos.push({ id: idAviso(g.igdbId!, 1), channelId: 'radar', title: `Amanhã sai ${g.title}`, body: `Está no seu Radar. Sai amanhã, ${diaSemana(i.day)}, ${diaMes(i.day)}.`, schedule: { at: at.toISOString(), allowWhileIdle: true }, extra, smallIcon: 'ic_stat_winnerz' });
    }
    if (pref.nodia && n >= 0) {
      const at = quando(i.day, 9);
      if (at.getTime() > agora) novos.push({ id: idAviso(g.igdbId!, 2), channelId: 'radar', title: `Hoje sai ${g.title}`, body: 'O dia chegou. Está no seu Radar.', schedule: { at: at.toISOString(), allowWhileIdle: true }, extra, smallIcon: 'ic_stat_winnerz' });
    }
  }
  try { localStorage.setItem(CHAVE_DATAS, JSON.stringify(novasDatas)); } catch { /* sem armazenamento */ }

  // Tira os avisos do Radar que já não valem (jogo saiu do Radar, data mudou, aviso desligado) e agenda os de agora.
  const pend = await chamar<{ notifications?: { id: number; extra?: { tipo?: string } }[] }>('LocalNotifications', 'getPending');
  const velhos = (pend?.notifications ?? []).filter((n) => n.extra?.tipo === 'radar' || (n.id >= 400000000 && n.id < 500000000)).map((n) => ({ id: n.id }));
  if (velhos.length) await chamar('LocalNotifications', 'cancel', { notifications: velhos });
  if (novos.length) await chamar('LocalNotifications', 'schedule', { notifications: novos });
}

// ── Avisos do servidor (Firebase): respostas, jogatinas, amigos, lançamentos… mesmo com o app fechado ─────────
export type AvisosServidor = { ligado: boolean; conversas: boolean; grupos: boolean; amigos: boolean; jornada: boolean; reacoes: boolean };
const CHAVE_PUSH = 'wz.app.push';
export function avisosServidor(): AvisosServidor {
  const pad: AvisosServidor = { ligado: true, conversas: true, grupos: true, amigos: true, jornada: true, reacoes: false };
  try { return { ...pad, ...JSON.parse(localStorage.getItem(CHAVE_PUSH) ?? '{}') }; } catch { return pad; }
}
export function salvarAvisosServidor(a: AvisosServidor) {
  try { localStorage.setItem(CHAVE_PUSH, JSON.stringify(a)); } catch { /* sem armazenamento */ }
  void registrarPush();
}
let pushOk: boolean | null = null;
/** O app instalado já vem com o Firebase? (as versões de teste mais antigas, não) */
export async function pushNoApp(): Promise<boolean> {
  if (!noApp()) return false;
  if (pushOk === null) pushOk = !!(await chamar<{ ok?: boolean }>('WinnerzNativo', 'temPush'))?.ok;
  return pushOk;
}
const CHAVE_TOKEN = 'wz.app.pushToken';
let pushToken = (() => { try { return localStorage.getItem(CHAVE_TOKEN) ?? ''; } catch { return ''; } })();
async function banco() {
  if (!SUPABASE_ON) return null;
  try { const { getClient } = await import('../data/supabaseAdapter'); return await getClient(); } catch { return null; }
}
async function gravarToken() {
  const sb = await banco(); const p = plataformaApp();
  if (!sb || !pushToken || !p || !getState().profile) return;
  const a = avisosServidor();
  const { error } = await sb.rpc('push_register', { p_token: pushToken, p_platform: p, p_prefs: { conversas: a.conversas, grupos: a.grupos, amigos: a.amigos, jornada: a.jornada, reacoes: a.reacoes } });
  if (error) console.warn('[app] push_register', error.message);
}
async function apagarToken() {
  const sb = await banco();
  if (sb && pushToken) await sb.rpc('push_unregister', { p_token: pushToken });
}
/** Pede a permissão (se ainda não tem), cria os canais e registra o celular. Desligado: tira o celular da lista. */
export async function registrarPush(pedir = false): Promise<'ok' | 'sem' | 'negado' | 'desligado'> {
  if (!(await pushNoApp()) || !getState().profile) return 'sem';
  if (!avisosServidor().ligado) { await apagarToken(); return 'desligado'; }
  let perm = (await chamar<{ receive?: string }>('PushNotifications', 'checkPermissions'))?.receive;
  if (perm !== 'granted' && pedir) perm = (await chamar<{ receive?: string }>('PushNotifications', 'requestPermissions'))?.receive;
  if (perm !== 'granted') return perm === 'denied' ? 'negado' : 'sem';
  await chamar('PushNotifications', 'createChannel', { id: 'comunidade', name: 'Comunidade', description: 'Respostas, menções, jogatinas, clubes e amigos', importance: 4, visibility: 1 });
  await chamar('PushNotifications', 'createChannel', { id: 'jornada', name: 'Jornada', description: 'Lançamentos, voltar a um jogo e resumos', importance: 3, visibility: 1 });
  await chamar('PushNotifications', 'register');
  if (pushToken) await gravarToken();
  return 'ok';
}

// ── Início ──────────────────────────────────────────────────────────────────────
let iniciado = false;
export function iniciarNativo() {
  if (iniciado || !noApp()) return;
  iniciado = true;
  document.documentElement.classList.add('no-app', `no-app-${plataformaApp() ?? 'x'}`);

  ouvir('App', 'appUrlOpen', (d) => { const url = (d as { url?: string }).url; if (url) abrirEndereco(url); });
  void chamar<{ url?: string }>('App', 'getLaunchUrl').then((r) => { if (r?.url) abrirEndereco(r.url); });
  ouvir('LocalNotifications', 'localNotificationActionPerformed', (d) => {
    const url = (d as { notification?: { extra?: { url?: string } } }).notification?.extra?.url;
    if (url) navigate(url);
  });

  // Avisos do servidor: o token chega por evento; tocar no aviso abre a tela dele.
  ouvir('PushNotifications', 'registration', (d) => {
    const t = (d as { value?: string }).value;
    if (!t) return;
    pushToken = t;
    try { localStorage.setItem(CHAVE_TOKEN, t); } catch { /* sem armazenamento */ }
    void gravarToken();
  });
  ouvir('PushNotifications', 'pushNotificationActionPerformed', (d) => {
    const url = (d as { notification?: { data?: { url?: string } } }).notification?.data?.url;
    if (url && url.startsWith('/')) navigate(url);
  });

  let conta = '';
  let espera: ReturnType<typeof setTimeout> | undefined;
  const aoMudar = () => {
    // Entrou numa conta: registra o celular. Saiu: tira da lista (o celular não recebe avisos de quem saiu).
    const atual = getState().profile?.id ?? '';
    if (atual !== conta) {
      const antes = conta; conta = atual;
      if (atual) void registrarPush(false);
      else if (antes) void apagarToken();
    }
    clearTimeout(espera);
    espera = setTimeout(async () => {
      const s = getState();
      if (!s.ready) return;
      void sincronizarSessao();
      const mudou = await atualizarRadarInfo(s);
      await atualizarWidgets();
      if (mudou) await agendarRadar();
    }, 1200);
  };
  subscribe(aoMudar);
  aoMudar();
  // As datas do Radar mudam fora do app: confere de novo a cada 6 horas e quando o app volta para a frente.
  const reconferir = () => { radarChave = ''; aoMudar(); };
  setInterval(reconferir, 6 * 3600 * 1000);
  ouvir('App', 'appStateChange', (d) => { if ((d as { isActive?: boolean }).isActive) reconferir(); });
}
