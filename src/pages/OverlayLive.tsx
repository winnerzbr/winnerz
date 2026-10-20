/**
 * Sistema de live, etapa 1: as cenas do overlay do canal para o OBS (fonte de navegador em 1920 × 1080, o palco escala
 * para o tamanho da fonte). /overlay/<endereço>?cena=jogando | conversa | comecando | javolto | encerrando.
 * Fontes à parte: ?so=alertas (só os alertas), ?so=chat (só o chat) e ?so=widgets (mortes, metas, enquete e sorteio).
 * ?som=0 desliga o som dos alertas. ?cena=creditos é a rolagem do fim (etapa 3a).
 * A câmera é outra fonte do OBS, posta dentro da moldura (?cam=esquerda troca o lado na cena Jogando).
 * Os alertas vêm de live_events (o servidor grava o que a Twitch avisa) e mostram o IAmiguinho reagindo.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Figura } from '../components/IAmiguinho';
import { CENA_CARA, type SofaLinha } from '../data/sofaApi';
import { liveApi, type LiveEvento, type LivePrefs, type TipoAlerta } from '../data/liveApi';
import type { Reacao } from '../lib/iamiguinhoRosto';
import { somDoAlerta, somDoWidget, type SomWidget } from '../lib/sonsLive';
import { Rolagem, temWidget, useCreditos, usePainel, Widgets } from './OverlayWidgets';

export type CenaLive = 'jogando' | 'conversa' | 'comecando' | 'javolto' | 'encerrando' | 'creditos';
export const CENAS_LIVE: { id: CenaLive; nome: string; dica: string }[] = [
  { id: 'jogando', nome: 'Jogando', dica: 'Jogo, câmera no canto, alertas e o balão do IAmiguinho. Fundo transparente: a captura do jogo fica atrás.' },
  { id: 'conversa', nome: 'Conversa', dica: 'Câmera grande, o assunto do papo e o chat.' },
  { id: 'comecando', nome: 'Começando', dica: 'Contagem para a live começar e o jogo de hoje.' },
  { id: 'javolto', nome: 'Já volto', dica: 'A pausa, com o IAmiguinho de guarda.' },
  { id: 'encerrando', nome: 'Encerrando', dica: 'Resumo da sessão, momentos e a próxima live.' },
  { id: 'creditos', nome: 'Créditos', dica: 'A rolagem do fim, como no cinema: raids, inscrições, apoios, quem chegou e quem mais falou no chat.' },
];
export const cenaValida = (v: string | null): CenaLive | null => (CENAS_LIVE.some((c) => c.id === v) ? (v as CenaLive) : null);

type Jogo = { title: string; cover: string } | null;
type Sessao = { startedAt: string; number: number } | null;
type Momentos = { count: number; fotos: { title: string; image: string | null }[] } | null;
export type DadosCena = { game: Jogo; session: Sessao; moment: { title: string } | null; live?: LivePrefs | null; canal?: string | null; momentos?: Momentos };

const params = () => (typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search));

/* ---- O palco: 1920 × 1080, escalado para a fonte do OBS ---- */
function Palco({ children, fundo = false }: { children: ReactNode; fundo?: boolean }) {
  const [k, setK] = useState(1);
  useEffect(() => {
    const medir = () => setK(Math.min(window.innerWidth / 1920, window.innerHeight / 1080) || 1);
    medir(); window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, []);
  return <div className={`lv${fundo ? ' lv--fundo' : ''}`} style={{ transform: `scale(${k})` } as CSSProperties}>{children}</div>;
}

const tempo = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(x).padStart(2, '0')}`; };
const LOGO = '/brand/forjado.svg';

function Moldura({ className, selo }: { className: string; selo?: string }) {
  return (
    <div className={`lv-cam ${className}`} aria-hidden="true">
      <i className="lv-cam__c lv-cam__c--tl" /><i className="lv-cam__c lv-cam__c--tr" /><i className="lv-cam__c lv-cam__c--bl" /><i className="lv-cam__c lv-cam__c--br" />
      {selo && <span className="lv-cam__selo"><i />{selo}</span>}
    </div>
  );
}

function Redes({ live, discord = false }: { live?: LivePrefs | null; discord?: boolean }) {
  const l = [live?.youtube, live?.twitch, discord ? live?.discord : ''].filter((x): x is string => !!x);
  if (!l.length) return null;
  return <span className="lv-redes">{l.map((x, i) => <span key={x}>{i > 0 && <b aria-hidden="true">/</b>}{x}</span>)}</span>;
}

function Barra({ live, children }: { live?: LivePrefs | null; children?: ReactNode }) {
  return (
    <div className="lv-barra">
      <i className="lv-horizonte" aria-hidden="true" />
      <img src={LOGO} alt="WinnerZ" className="lv-barra__logo" />
      <span className="lv-barra__temp"><i aria-hidden="true" />{live?.temporada ? `Temporada ${live.temporada} · ao vivo por temporadas` : 'Ao vivo por temporadas'}</span>
      <span className="lv-barra__meio">{children}</span>
      <Redes live={live} />
    </div>
  );
}

/* ---- O balão do IAmiguinho: a fala do sofá (12 s) ou, nas cenas paradas, uma fala da casa ---- */
const FALAS_CASA: Partial<Record<CenaLive, string[]>> = {
  creditos: ['meu nome tá nos créditos. finalmente reconhecimento', 'obrigado a todos. principalmente a mim', 'fiquem até o fim, tem cena pós-créditos. mentira, não tem'],
  comecando: ['aquecendo os dedos. os meus, pq quem joga já tá tremendo lol', 'temporada nova, mesma confiança. zero motivo, muita confiança', 'pega a pipoca que hoje tem chefe. e tem morte. principalmente morte'],
  javolto: ['fiquei de guarda. se o chefe aparecer eu finjo que tô dormindo. plano perfeito, sem erros', 'foi beber água. eu fiquei aqui segurando a live. de nada', 'pausa estratégica. ou fuga. a gente nunca sabe'],
  conversa: ['papo bom. tô aqui balançando a cabeça fingindo que entendo, real', 'podem continuar, eu tô anotando tudo. mentira, não tô'],
  encerrando: ['acabou por hoje. eu ajudei bastante. torcendo. de longe.', 'live boa. a próxima vai ser melhor. ou igual. a gente vê'],
};
function useFalaCasa(cena: CenaLive): string | null {
  const l = FALAS_CASA[cena];
  const [i, setI] = useState(() => Math.floor(Math.random() * 10));
  useEffect(() => { if (!l) return; const t = setInterval(() => setI((x) => x + 1), 20000); return () => clearInterval(t); }, [l]);
  return l ? l[i % l.length] : null;
}
function Balao({ cena, sofa, className, rotulo = 'IAmiguinho', comFigura = true }: { cena: CenaLive; sofa: SofaLinha | null; className: string; rotulo?: string; comFigura?: boolean }) {
  const t = sofa?.falou_em ? Date.parse(sofa.falou_em) : 0;
  const doSofa = sofa?.fala && !sofa.calado && t && Date.now() - t < 12000 ? sofa : null;
  const casa = useFalaCasa(cena);
  const fala = doSofa?.fala ?? (cena === 'encerrando' && sofa?.fala && !sofa.calado ? sofa.fala : casa);
  if (!fala) return null;
  const cara = doSofa ? (CENA_CARA[doSofa.cena ?? 'normal'] ?? 'sorriso-confiante') : 'sorriso-confiante';
  return (
    <div className={`lv-balao ${className}`} key={doSofa?.falou_em ?? fala} role="status">
      {comFigura && <Figura img={`cara-${cara}`} className="lv-balao__cara" width={76} height={76} lazy={false} enfeite={false} />}
      <span><span className="lv-k lv-k--iam">{rotulo}</span><span className="lv-balao__fala">{fala}</span></span>
    </div>
  );
}

/* ---- Alertas ---- */
const REACAO: Record<TipoAlerta, Reacao | 'feliz'> = { follow: 'feliz', sub: 'apaixonado', resub: 'apaixonado', gift: 'berrando', cheer: 'oculos', raid: 'berrando', superchat: 'apaixonado', member: 'apaixonado' };
const COR: Record<TipoAlerta, string> = { follow: 'iam', sub: 'ambar', resub: 'ambar', gift: 'ouro', cheer: 'ouro', raid: 'raid', superchat: 'ouro', member: 'ambar' };
const FALA_ALERTA: Record<TipoAlerta, string[]> = {
  follow: ['chegou bem na hora de ver ele errar', 'chegou no caos organizado. organizado é exagero', 'mais uma testemunha. ótimo'],
  sub: ['agora é oficial: você apoia isso aqui. corajoso', 'obrigado! vou fingir que foi por minha causa'],
  resub: ['ainda aqui? respeito. e preocupação', 'mais um mês acreditando. fé é isso'],
  gift: ['presente pra galera! isso sim é jogada boa', 'distribuindo inscrição igual eu distribuo palpite errado'],
  cheer: ['bits na conta. nenhuma habilidade comprada, infelizmente', 'obrigado! vou gastar tudo em confiança'],
  raid: ['chegou reforço! cuidado, ele tá no modo morrer', 'raid! sentem aí, a desgraça é ao vivo'],
  superchat: ['super chat! agora ele é obrigado a ler', 'valeu! isso paga pelo menos um tutorial'],
  member: ['virou membro! agora não tem mais volta', 'agora é da família. a gente erra junto'],
};
function tituloAlerta(e: LiveEvento): { k: string; nome: string; extra?: string } {
  const v = e.valor ?? 0;
  switch (e.tipo) {
    case 'follow': return { k: e.origem === 'youtube' ? 'Novo inscrito no YouTube' : 'Novo seguidor', nome: e.quem };
    case 'sub': return { k: v > 1 ? `Inscrição nível ${v}` : 'Inscrição', nome: e.quem };
    case 'resub': return { k: `Inscrição · ${v} ${v === 1 ? 'mês' : 'meses'}`, nome: e.quem };
    case 'gift': return { k: e.origem === 'youtube' ? `${v} ${v === 1 ? 'assinatura' : 'assinaturas'} de membro de presente` : `${v} ${v === 1 ? 'inscrição' : 'inscrições'} de presente`, nome: e.quem };
    case 'cheer': return { k: `${v.toLocaleString('pt-BR')} bits`, nome: e.quem };
    case 'raid': return { k: 'Raid chegando', nome: e.quem, extra: `+ ${v.toLocaleString('pt-BR')} ${v === 1 ? 'pessoa' : 'pessoas'}` };
    case 'superchat': return { k: 'Super Chat', nome: e.quem, extra: e.extra || (v ? (v / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : undefined) };
    default: return { k: v ? `Membro há ${v} ${v === 1 ? 'mês' : 'meses'}` : e.extra ? `Novo membro · ${e.extra}` : 'Novo membro', nome: e.quem };
  }
}
/** O som de cada tipo de alerta (lib/sonsLive: cada um bem diferente do outro). */
let somCtx: AudioContext | null = null;
const ctxSom = () => (somCtx ??= new AudioContext());
/** No OBS a fonte de navegador toca som sozinha; num navegador comum, o som só sai depois de um clique na página. */
const noObs = () => typeof window !== 'undefined' && 'obsstudio' in window;
function useSomLiberado(ligado: boolean): { bloqueado: boolean; liberar: () => void } {
  const [bloqueado, setBloqueado] = useState(false);
  useEffect(() => {
    if (!ligado || params().get('som') === '0') return;
    let c: AudioContext;
    try { c = ctxSom(); } catch { return; }
    const ver = () => setBloqueado(c.state !== 'running');
    ver(); // sem clique, o resume() do navegador fica esperando para sempre: o estado de agora já diz se está bloqueado
    void c.resume().then(ver).catch(() => null);
    c.addEventListener('statechange', ver);
    const tocar = () => { void c.resume().then(ver).catch(() => null); };
    window.addEventListener('pointerdown', tocar); window.addEventListener('keydown', tocar);
    return () => { c.removeEventListener('statechange', ver); window.removeEventListener('pointerdown', tocar); window.removeEventListener('keydown', tocar); };
  }, [ligado]);
  return { bloqueado, liberar: () => { void ctxSom().resume().then(() => { setBloqueado(false); tocarSom('follow'); }).catch(() => null); } };
}
function tocarSom(tipo: TipoAlerta) {
  try { const c = ctxSom(); if (c.state === 'suspended') void c.resume(); somDoAlerta(c, tipo); } catch { /* sem som */ }
}
function tocarWidget(tipo: SomWidget) {
  if (params().get('som') === '0') return;
  try { const c = ctxSom(); if (c.state === 'suspended') void c.resume(); somDoWidget(c, tipo); } catch { /* sem som */ }
}
/** A fila de alertas: pergunta ao banco a cada 2 s e mostra um de cada vez. */
/** Quanto tempo cada alerta fica na tela (o raid fica mais). */
export const DURACAO_ALERTA = (tipo: TipoAlerta) => (tipo === 'raid' ? 8500 : 6500);
const SAIDA_ALERTA = 450;
function useAlertas(ligado: boolean): { e: LiveEvento; saindo: boolean } | null {
  const [fila, setFila] = useState<LiveEvento[]>([]);
  const [atual, setAtual] = useState<LiveEvento | null>(null);
  const [saindo, setSaindo] = useState(false);
  const ultimo = useRef<number | null>(null);
  useEffect(() => {
    if (!ligado) return;
    let vivo = true;
    const ler = async () => {
      try {
        const l = await liveApi.eventos(ultimo.current);
        if (!vivo) return;
        if (ultimo.current == null) { ultimo.current = l[0]?.id ?? 0; return; } // a primeira leitura só marca onde parou
        if (l.length) { ultimo.current = l[l.length - 1].id; setFila((f) => [...f, ...l].slice(-30)); }
      } catch { /* sem rede: tenta de novo */ }
    };
    void ler();
    const t = setInterval(ler, 2000);
    return () => { vivo = false; clearInterval(t); };
  }, [ligado]);
  // Pega o próximo da fila quando a tela está livre.
  useEffect(() => {
    if (atual || !fila.length) return;
    const [e, ...resto] = fila;
    setFila(resto); setSaindo(false); setAtual(e);
    if (params().get('som') !== '0') tocarSom(e.tipo);
  }, [fila, atual]);
  // O tempo de cada alerta: fica, sai com animação e libera a tela (o relógio é do alerta, não da fila).
  useEffect(() => {
    if (!atual) return;
    const d = DURACAO_ALERTA(atual.tipo);
    const t1 = setTimeout(() => setSaindo(true), d - SAIDA_ALERTA);
    const t2 = setTimeout(() => setAtual(null), d + 250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [atual]);
  return atual ? { e: atual, saindo } : null;
}
function Alerta({ e, saindo }: { e: LiveEvento; saindo: boolean }) {
  const t = tituloAlerta(e);
  const reacao = REACAO[e.tipo];
  const fala = FALA_ALERTA[e.tipo][e.id % FALA_ALERTA[e.tipo].length];
  return (
    <div className={`lv-alerta is-${COR[e.tipo]}${e.tipo === 'raid' ? ' is-grande' : ''}${saindo ? ' is-saindo' : ''}`} role="status">
      <Figura img="cara-sorriso-confiante" expressao={reacao === 'feliz' ? 'feliz' : reacao} className={`lv-alerta__cara${reacao !== 'feliz' ? ` iam-reage--${reacao}` : ''}`} width={112} height={98} lazy={false} enfeite={false} />
      <span className="lv-alerta__txt">
        <span className="lv-alerta__k">{t.k}</span>
        <span className="lv-alerta__nome">{t.nome}{t.extra && <span className="lv-alerta__extra">{t.extra}</span>}</span>
        <span className="lv-alerta__fala">{fala}</span>
      </span>
      <i className="lv-alerta__tempo" aria-hidden="true" style={{ animationDuration: `${DURACAO_ALERTA(e.tipo) / 1000}s` }} />
    </div>
  );
}

/* ---- Chat da Twitch (leitura anônima, sem login) ---- */
type Msg = { id: number; quem: string; texto: string; cor?: string; pl: 'tw' | 'yt'; membro?: boolean };
function lerChat(canal: string, onMsg: (m: Omit<Msg, 'id' | 'pl'>) => void): () => void {
  const nome = canal.trim().replace(/^#/, '').toLowerCase();
  if (!/^[a-z0-9_]{3,25}$/.test(nome)) return () => {};
  let fechado = false, ws: WebSocket | null = null;
  const abrir = () => {
    ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    ws.onopen = () => { ws!.send('CAP REQ :twitch.tv/tags'); ws!.send('PASS SCHMOOPIIE'); ws!.send(`NICK justinfan${10000 + Math.floor(Math.random() * 80000)}`); ws!.send(`JOIN #${nome}`); };
    ws.onmessage = (ev) => {
      for (const l of String(ev.data).split('\r\n')) {
        if (!l) continue;
        if (l.startsWith('PING')) { ws!.send('PONG :tmi.twitch.tv'); continue; }
        const m = /^(?:@(\S+) )?:([^!]+)!\S+ PRIVMSG #\S+ :(.*)$/.exec(l);
        if (!m) continue;
        const tags = Object.fromEntries((m[1] ?? '').split(';').map((p) => p.split('=') as [string, string]));
        const texto = m[3].replace(/\u0001ACTION |\u0001/g, '').trim();
        if (texto) onMsg({ quem: (tags['display-name'] || m[2]).slice(0, 30), texto: texto.slice(0, 200), cor: /^#[0-9a-f]{6}$/i.test(tags.color ?? '') ? tags.color : undefined });
      }
    };
    ws.onclose = () => { if (!fechado) setTimeout(() => { if (!fechado) abrir(); }, 4000); };
  };
  abrir();
  return () => { fechado = true; ws?.close(); };
}
function Chat({ canal, className, max = 12 }: { canal?: string | null; className: string; max?: number }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const n = useRef(0);
  const c = params().get('canal') || canal || '';
  useEffect(() => {
    if (!c) return;
    return lerChat(c, (m) => setMsgs((l) => [...l, { ...m, pl: 'tw' as const, id: ++n.current }].slice(-max)));
  }, [c, max]);
  // O chat do YouTube: o servidor grava (a Central da live lê o YouTube) e o overlay pega as novas a cada 2 s.
  useEffect(() => {
    let vivo = true, desde: number | null = null;
    const ler = async () => {
      try {
        const l = await liveApi.chatYoutube(desde);
        if (!vivo || !l.length) { if (desde == null) desde = 0; return; }
        desde = l[l.length - 1].id;
        setMsgs((x) => [...x, ...l.map((m) => ({ id: ++n.current, quem: m.quem, texto: m.texto, pl: 'yt' as const, membro: m.membro }))].slice(-max));
      } catch { /* tenta de novo */ }
    };
    void ler();
    const t = setInterval(ler, 2000);
    return () => { vivo = false; clearInterval(t); };
  }, [max]);
  return (
    <div className={`lv-chat ${className}`} aria-live="polite">
      {!c && !msgs.length && <span className="lv-chat__vazio">Ligue a Twitch ou o YouTube na Central da live para o chat aparecer aqui.</span>}
      {msgs.map((m) => {
        const iam = m.quem.toLowerCase() === 'iamiguinho';
        return (
          <div key={m.id} className={`lv-chat__msg${iam ? ' is-iam' : ''}`}>
            {!iam && <span className={`lv-chat__pl is-${m.pl}`}>{m.pl === 'yt' ? 'YT' : 'TW'}</span>}
            <b style={iam ? undefined : ({ color: m.pl === 'yt' ? (m.membro ? '#8FDC9B' : '#C9CED4') : m.cor ?? '#C9CED4' } as CSSProperties)}>{iam ? 'IAmiguinho' : m.quem}</b> {m.texto}
          </div>
        );
      })}
    </div>
  );
}

/* ---- As cenas ---- */
export function OverlayLive({ cena, so, d, sofa }: { cena: CenaLive | null; so: string | null; d: DadosCena | null; sofa: SofaLinha | null }) {
  const alerta = useAlertas(so === 'alertas' || (!!cena && cena !== 'creditos'));
  const som = useSomLiberado(so === 'alertas' || so === 'widgets' || !!cena);
  const { p: painel, desvio } = usePainel(so === 'widgets' || cena === 'jogando' || cena === 'conversa' || cena === 'javolto', tocarWidget);
  const creditos = useCreditos(cena === 'creditos');
  const avisoSom = som.bloqueado && !noObs() ? <button type="button" className="lv-som" onClick={som.liberar}>Clique aqui para ligar o som dos alertas</button> : null;
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setAgora(Date.now()), 1000); return () => clearInterval(t); }, []);
  const live = d?.live ?? null;
  const alertas = <>{avisoSom}<div className={`lv-alertas${cena === 'conversa' ? ' lv-alertas--conversa' : ''}`}>{alerta && <Alerta key={alerta.e.id} e={alerta.e} saindo={alerta.saindo} />}</div></>;
  const camLado = params().get('cam') === 'esquerda' || live?.camLado === 'esquerda' ? 'esquerda' : 'direita';
  const decorrido = d?.session ? tempo(agora - Date.parse(d.session.startedAt)) : null;

  if (so === 'alertas') return <Palco>{alertas}</Palco>;
  if (so === 'chat') return <div className="lv-solo-chat"><Chat canal={d?.canal} className="lv-chat--solo" max={16} /></div>;
  if (so === 'widgets') return <Palco>{avisoSom}<Widgets p={painel} desvio={desvio} className="lv-widgets--jogando" /></Palco>;

  if (cena === 'jogando') return (
    <Palco>
      {d?.game && (
        <div className="lv-jogo">
          {d.game.cover && <img src={d.game.cover} alt="" />}
          <span className="lv-jogo__info">
            <span className="lv-k lv-k--agora"><i aria-hidden="true" />{d.session ? 'Jogando agora' : 'Em foco'}</span>
            <span className="lv-jogo__titulo">{d.game.title}</span>
            {d.session && <span className="lv-mono">Sessão {d.session.number}<b aria-hidden="true">/</b>{decorrido}</span>}
          </span>
        </div>
      )}
      <Widgets p={painel} desvio={desvio} className="lv-widgets--jogando" limite={camLado === 'direita' ? 590 : 800} />
      {alertas}
      <Balao cena="jogando" sofa={sofa} className={`lv-balao--jogando is-${camLado === 'direita' ? 'esquerda' : 'direita'}`} />
      <Moldura className={`lv-cam--jogando is-${camLado}`} selo="Ao vivo" />
      <Barra live={live}>{d?.moment && <><span className="lv-k">Último momento</span>{d.moment.title}</>}</Barra>
    </Palco>
  );

  if (cena === 'conversa') return (
    <Palco fundo>
      <Moldura className="lv-cam--conversa" selo="Ao vivo · WinnerZ" />
      <div className="lv-papo"><span className="lv-k">Papo de hoje</span><span className="lv-papo__t">{live?.papo || 'Conversa com o chat'}</span></div>
      <div className="lv-lado">
        <Widgets p={painel} desvio={desvio} mortes={false} className="lv-widgets--conversa" />
        {d?.game && !temWidget(painel, false) && (
          <div className="lv-depois">
            {d.game.cover && <img src={d.game.cover} alt="" />}
            <span><span className="lv-k">Depois do papo</span><span className="lv-depois__t">{d.game.title}</span>{d.session && <span className="lv-mono">Sessão {d.session.number}</span>}</span>
          </div>
        )}
        <Chat canal={d?.canal} className={`lv-chat--conversa${temWidget(painel, false) ? ' is-curto' : ''}`} />
        <Balao cena="conversa" sofa={sofa} className="lv-balao--conversa" />
      </div>
      {alertas}
      <Barra live={live}><span className="lv-k">Figurinhas</span>Códigos da live em winnerz.com.br/codigo</Barra>
    </Palco>
  );

  if (cena === 'comecando') {
    const falta = live?.comecaEm ? Date.parse(live.comecaEm) - agora : null;
    return (
      <Palco fundo>
        {d?.game?.cover && <img className="lv-fundo-capa" src={d.game.cover} alt="" />}
        <i className="lv-veu lv-veu--lado" aria-hidden="true" />
        <i className="lv-horizonte lv-horizonte--varre" aria-hidden="true" />
        <div className="lv-comeco">
          <img src={LOGO} alt="WinnerZ" className="lv-comeco__logo" />
          <span className="lv-k lv-k--agora lv-k--g"><i aria-hidden="true" />{falta != null && falta > 0 ? 'A live começa em' : 'A live já vai começar'}</span>
          <span className={`lv-relogio${falta != null && falta > 0 ? '' : ' lv-relogio--texto'}`}>{falta != null && falta > 0 ? tempo(falta) : 'Já já'}</span>
          <span className="lv-comeco__sub">{live?.temporada ? `Temporada ${live.temporada}. Sim, a live voltou.` : 'Sim, a live voltou.'}</span>
        </div>
        {d?.game && (
          <div className="lv-hoje">
            {d.game.cover && <img src={d.game.cover} alt="" />}
            <span><span className="lv-k">Hoje na tela</span><span className="lv-hoje__t">{d.game.title}</span>{d.session && <span className="lv-hoje__s">Sessão {d.session.number}{d.moment ? ` · de onde parou: ${d.moment.title}` : ''}</span>}</span>
          </div>
        )}
        <Figura img="pose-controle" className="lv-iam lv-iam--comeco" width={560} height={560} lazy={false} />
        <Balao cena="comecando" sofa={sofa} className="lv-balao--comeco" comFigura={false} />
        {alertas}
        <div className="lv-rodape"><span>Figurinhas da live: winnerz.com.br/codigo</span><Redes live={live} discord /></div>
      </Palco>
    );
  }

  if (cena === 'javolto') return (
    <Palco fundo>
      <i className="lv-horizonte lv-horizonte--volto" aria-hidden="true" />
      <div className="lv-volto">
        <img src={LOGO} alt="WinnerZ" className="lv-volto__logo" />
        <span className="lv-volto__t">Já<br />volto</span>
        <span className="lv-volto__pausa"><i aria-hidden="true" />pausa de uns {live?.pausaMin ?? 5} minutos</span>
      </div>
      <Figura img="pose-dormindo" className="lv-iam lv-iam--volto" width={520} height={480} lazy={false} />
      <div className="lv-volto__cards">
        <div className="lv-card lv-card--ambar"><span className="lv-k lv-k--ambar">Enquanto isso</span><span className="lv-card__t">Pegue uma figurinha: winnerz.com.br/codigo</span></div>
        <Balao cena="javolto" sofa={sofa} className="lv-balao--volto" comFigura={false} />
      </div>
      <Widgets p={painel} desvio={desvio} mortes={false} className="lv-widgets--volto" />
      {alertas}
    </Palco>
  );

  if (cena === 'encerrando') {
    const m = d?.momentos;
    return (
      <Palco fundo>
        {d?.game?.cover && <img className="lv-fundo-capa lv-fundo-capa--fim" src={d.game.cover} alt="" />}
        <i className="lv-veu lv-veu--baixo" aria-hidden="true" />
        <div className="lv-fim">
          <span className="lv-k lv-k--g"><i aria-hidden="true" />Fim da sessão</span>
          <span className="lv-fim__t">{d?.game?.title ?? 'Até a próxima'}</span>
          <div className="lv-fim__nums">
            <span><span className="lv-k">Tempo</span><b>{decorrido ?? '—'}</b></span>
            <span><span className="lv-k">Sessão</span><b>{d?.session?.number ?? '—'}</b></span>
            <span><span className="lv-k">Momentos</span><b>{m?.count ?? 0}</b></span>
          </div>
          {!!m?.fotos.length && <div className="lv-fim__fotos">{m.fotos.map((f) => f.image && <img key={f.image} src={f.image} alt={f.title} />)}</div>}
        </div>
        <Moldura className="lv-cam--fim" />
        <Balao cena="encerrando" sofa={sofa} className="lv-balao--fim" rotulo="O resumo do IAmiguinho" />
        <i className="lv-horizonte lv-horizonte--fim" aria-hidden="true" />
        <div className="lv-proxima">
          <span><span className="lv-k">Próxima live</span><span className="lv-proxima__t">{live?.proxima || 'Quando a temporada voltar'}</span></span>
          <span className="lv-proxima__dir"><img src={LOGO} alt="WinnerZ" /><Redes live={live} /></span>
        </div>
        {alertas}
      </Palco>
    );
  }
  if (cena === 'creditos') return (
    <Palco fundo>
      {d?.game?.cover && <img className="lv-fundo-capa lv-fundo-capa--fim" src={d.game.cover} alt="" />}
      <i className="lv-veu lv-veu--creditos" aria-hidden="true" />
      <Rolagem c={creditos} canal={d?.canal || live?.twitch?.replace(/^.*twitch\.tv\//i, '') || live?.youtube} jogo={d?.game?.title} />
      <Figura img="pose-controle" className="lv-iam lv-iam--creditos" width={520} height={520} lazy={false} />
      <Balao cena="creditos" sofa={sofa} className="lv-balao--creditos" comFigura={false} />
      <i className="lv-horizonte lv-horizonte--fim" aria-hidden="true" />
      <div className="lv-proxima">
        <span><span className="lv-k">Próxima live</span><span className="lv-proxima__t">{live?.proxima || 'Quando a temporada voltar'}</span></span>
        <span className="lv-proxima__dir"><img src={LOGO} alt="WinnerZ" /><Redes live={live} /></span>
      </div>
      {avisoSom}
    </Palco>
  );
  return null;
}

/** Os endereços de cada cena (para a Central da live). */
export function enderecosCenas(base: string) {
  return base ? [
    ...CENAS_LIVE.map((c) => ({ id: c.id, nome: c.nome, dica: c.dica, url: `${base}?cena=${c.id}` })),
    { id: 'alertas', nome: 'Só os alertas', dica: 'Para pôr os alertas por cima de qualquer cena sua.', url: `${base}?so=alertas` },
    { id: 'chat', nome: 'Só o chat', dica: 'O chat da Twitch e do YouTube, para encaixar onde quiser.', url: `${base}?so=chat` },
    { id: 'widgets', nome: 'Só os widgets', dica: 'Mortes, metas, enquete e sorteio no canto de cima, à direita, por cima de qualquer cena sua.', url: `${base}?so=widgets` },
  ] : [];
}
