/**
 * IAmiguinho no sofá (migração 0080): o co-apresentador das lives do canal. Só a administração usa, pela cabine em
 * /studio/sofa. A cabine manda a tela para /api/iamiguinho (kind 'sofa'); a fala vai para a linha sofa_live, que o
 * overlay da live lê. Na demonstração, as falas são de exemplo e ficam neste navegador (o /overlay/demo mostra).
 */
import { getState } from './store';

export type SofaNivel = 'torcedor' | 'parceiro' | 'sem-perdao';
export const SOFA_NIVEIS: { id: SofaNivel; name: string; hint: string }[] = [
  { id: 'torcedor', name: 'Fã que só torce', hint: 'Comemora e incentiva, sem provocar.' },
  { id: 'parceiro', name: 'Parceiro de sofá', hint: 'Torce, com uma provocação leve de vez em quando.' },
  { id: 'sem-perdao', name: 'Amigo que não perdoa', hint: 'Provoca a jogada com gosto, sempre com carinho.' },
];
export type SofaCena = 'morte' | 'chefe' | 'vitoria' | 'cenario' | 'menu' | 'dialogo' | 'carregando' | 'normal' | 'outro';
export const CENA_NOME: Record<SofaCena, string> = {
  morte: 'Morte', chefe: 'Chefe', vitoria: 'Vitória', cenario: 'Cenário novo', menu: 'Menu', dialogo: 'Diálogo', carregando: 'Carregando', normal: 'Jogando', outro: 'Outra cena',
};
/** A cara dele no balão, conforme a cena. */
export const CENA_CARA: Record<SofaCena, string> = {
  morte: 'surpreso', chefe: 'curioso', vitoria: 'comemorando', cenario: 'curioso', menu: 'sonolento', dialogo: 'pensando', carregando: 'sonolento', normal: 'sorriso-confiante', outro: 'feliz',
};
export interface SofaLook { fala: string | null; cena?: SofaCena; momento?: boolean; parou?: string; calado?: boolean; diag?: string[] }
/** Etapa 4b: como ele leu o seu humor na conversa por voz. */
export type SofaHumor = 'brincando' | 'serio' | 'frustrado' | 'focado';
export interface SofaConversa { fala: string | null; humor: SofaHumor | null; diag?: string[] }
export interface SofaLinha { ligado: boolean; calado: boolean; fala: string | null; cena: SofaCena | null; falou_em: string | null }

const supa = () => getState().mode === 'supabase';
const token = async () => (await import('./supabaseAdapter')).accessToken();
async function post<T>(body: Record<string, unknown>): Promise<T> {
  const r = await fetch('/api/iamiguinho', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` }, body: JSON.stringify({ kind: 'sofa', ...body }) });
  const j = await r.json().catch(() => ({})) as T & { error?: string };
  if (!r.ok) throw new Error(j.error ?? 'O sofá não respondeu agora.');
  return j;
}

/* ---- Demonstração ------------------------------------------------------------------------------ */
const DK = 'wz.demo.sofa';
const DEMO: { fala: string | null; cena: SofaCena; momento?: boolean; parou?: string }[] = [
  { fala: null, cena: 'normal' },
  { fala: 'Esse pulo foi tão confiante que eu quase acreditei junto.', cena: 'morte' },
  { fala: null, cena: 'normal' },
  { fala: 'Chefe com três barras de vida. Eu já estaria procurando o tutorial de novo.', cena: 'chefe', momento: true, parou: 'Na arena do chefe da Torre' },
  { fala: 'Que paisagem. Se eu soubesse jogar, parava aqui só para olhar.', cena: 'cenario', momento: true },
  { fala: null, cena: 'menu' },
  { fala: 'Venceu! Isso merece uma comemoração e talvez um pão cacetinho.', cena: 'vitoria', momento: true, parou: 'Depois do chefe da Torre' },
];
let demoI = 0;
export function demoSofa(): SofaLinha {
  try { return { ligado: false, calado: false, fala: null, cena: null, falou_em: null, ...JSON.parse(localStorage.getItem(DK) ?? '{}') }; } catch { return { ligado: false, calado: false, fala: null, cena: null, falou_em: null }; }
}
const demoSet = (p: Partial<SofaLinha>) => { try { localStorage.setItem(DK, JSON.stringify({ ...demoSofa(), ...p })); } catch { /* nada */ } };

/* ---- API ---------------------------------------------------------------------------------------- */
export const sofaApi = {
  async olhar(p: { image: string; jogo?: string; nivel: SofaNivel; chamado?: boolean; recentes: string[]; chat: string[]; segundos: number }): Promise<SofaLook> {
    if (!supa()) {
      await new Promise((ok) => setTimeout(ok, 900));
      if (demoSofa().calado) return { fala: null, calado: true };
      const d = DEMO[demoI++ % DEMO.length];
      const fala = d.fala ?? (p.chamado ? 'Estou vendo, estou vendo. Fingindo que entendi tudo, mas vendo.' : null);
      if (fala) demoSet({ ligado: true, fala, cena: d.cena, falou_em: new Date().toISOString() });
      return { fala, cena: d.cena, momento: d.momento, parou: d.parou ?? '' };
    }
    return post<SofaLook>({ acao: 'olhar', ...p });
  },
  /** "Ô iamiguinho!": você fala, ele responde (com a memória de vocês) e lê o seu humor. */
  async conversa(p: { texto: string; jogo?: string; image?: string }): Promise<SofaConversa> {
    if (!supa()) {
      await new Promise((ok) => setTimeout(ok, 1100));
      const frustrado = /morr|dif[ií]cil|n[aã]o aguento|desisto|travad|raiva|socorro|ajuda/i.test(p.texto);
      const fala = frustrado
        ? 'Ei, respira. Você já chegou mais longe que eu em qualquer jogo da vida. A próxima tentativa é a boa, sério.'
        : /piada/i.test(p.texto) ? 'Fiz backup da minha autoestima. Arquivo corrompido. Tentei de novo e veio com 0 KB, pelo menos ficou leve.'
        : 'Ouvi, ouvi. Fingindo que entendi tudo, mas com muita confiança. Pode continuar que eu tô aqui.';
      if (!demoSofa().calado) demoSet({ ligado: true, fala, cena: 'normal', falou_em: new Date().toISOString() });
      return { fala, humor: frustrado ? 'frustrado' : 'brincando' };
    }
    return post<SofaConversa>({ acao: 'conversa', ...p });
  },
  async estado(p: { ligado?: boolean; calado?: boolean }): Promise<SofaLinha | null> {
    if (!supa()) { demoSet({ ...p, ...(p.calado ? { fala: null } : {}) }); return demoSofa(); }
    return (await post<{ linha: SofaLinha | null }>({ acao: 'estado', ...p })).linha;
  },
  async fim(p: { jogo?: string; falas: { fala: string; cena: string }[]; minutos: number }): Promise<{ resumo: string; parou: string }> {
    if (!supa()) {
      demoSet({ ligado: false, fala: null });
      return { resumo: 'Sessão de respeito: um chefe de três barras caiu, a paisagem ganhou uma pausa e eu comemorei como se a vitória fosse minha.', parou: 'Depois do chefe da Torre' };
    }
    return post({ acao: 'fim', ...p });
  },
  /** A fala em voz alta (Fish Audio; o Google só quando a chave da Fish não está no servidor). Na demonstração não há voz. */
  async voz(texto: string): Promise<{ audio: string; tipo: string; servico?: 'fish' | 'google' } | null> {
    if (!supa()) return null;
    const r = await post<{ audio?: string | null; tipo?: string; diag?: string[]; servico?: 'fish' | 'google' }>({ acao: 'voz', texto });
    if (!r.audio) throw new Error(`A voz não saiu agora (${r.servico === 'fish' ? 'Fish Audio' : r.servico === 'google' ? 'Google' : 'voz'}: ${(r.diag ?? []).join(', ') || 'sem resposta'}).`);
    return { audio: r.audio, tipo: r.tipo ?? 'audio/wav', servico: r.servico };
  },
  /** O overlay da live lê a fala do momento (sem login). */
  async linha(): Promise<SofaLinha | null> {
    if (!supa()) return demoSofa();
    const { getClient } = await import('./supabaseAdapter');
    const r = await (await getClient()).from('sofa_live').select('ligado,calado,fala,cena,falou_em').eq('id', 1).maybeSingle();
    return (r.data as SofaLinha | null) ?? null;
  },
};

/* ---- Chat da Twitch (só leitura, sem login: o modo anônimo do chat) ------------------------------------- */
export type ChatEstado = 'desligado' | 'conectando' | 'ligado' | 'erro';
export function twitchChat(canal: string, onMsg: (texto: string) => void, onEstado: (e: ChatEstado) => void): () => void {
  const nome = canal.trim().replace(/^#/, '').toLowerCase();
  if (!/^[a-z0-9_]{3,25}$/.test(nome)) { onEstado('erro'); return () => {}; }
  let fechado = false;
  let ws: WebSocket | null = null;
  const abrir = () => {
    onEstado('conectando');
    ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    ws.onopen = () => { ws!.send('PASS SCHMOOPIIE'); ws!.send(`NICK justinfan${10000 + Math.floor(Math.random() * 80000)}`); ws!.send(`JOIN #${nome}`); };
    ws.onmessage = (e) => {
      for (const l of String(e.data).split('\r\n')) {
        if (!l) continue;
        if (l.startsWith('PING')) { ws!.send('PONG :tmi.twitch.tv'); continue; }
        if (/ JOIN #/.test(l) || / 366 /.test(l)) onEstado('ligado');
        const m = /PRIVMSG #[^ ]+ :(.*)$/.exec(l);
        if (m) { const t = m[1].replace(/\u0001ACTION |\u0001/g, '').trim(); if (t) onMsg(t.slice(0, 200)); }
      }
    };
    ws.onerror = () => onEstado('erro');
    ws.onclose = () => { if (!fechado) { onEstado('conectando'); setTimeout(() => { if (!fechado) abrir(); }, 4000); } };
  };
  abrir();
  return () => { fechado = true; ws?.close(); onEstado('desligado'); };
}

/* ---- Imagem ---------------------------------------------------------------------------------------- */
export function quadro(v: HTMLVideoElement, max: number, q = 0.75): { data: string; canvas: HTMLCanvasElement } | null {
  const w = v.videoWidth, h = v.videoHeight;
  if (!w || !h) return null;
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
  return { data: c.toDataURL('image/jpeg', q), canvas: c };
}
