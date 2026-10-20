/**
 * Studio · IAmiguinho no sofá: a cabine do co-apresentador das lives do canal. Só da administração.
 * Roda no computador da live: pega a tela do jogo (câmera virtual do OBS ou a janela), e de tempos em tempos o
 * IAmiguinho olha e decide se fala. A fala aparece aqui e, no overlay da live, num balão. "Olha isso!" chama a
 * atenção dele na hora; "Calar" apaga o balão e segura as falas. No fim, ele resume a sessão e separa as cenas.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '../lib/router';
import { actions, useStore, openSession, currentHistory, uid } from '../data/store';
import { Icon } from '../components/Icon';
import { Figura } from '../components/IAmiguinho';
import { Sheet } from '../components/Sheet';
import { CENA_CARA, CENA_NOME, SOFA_NIVEIS, quadro, sofaApi, twitchChat, type ChatEstado, type SofaCena, type SofaNivel } from '../data/sofaApi';
import { AJUSTE_PADRAO, EFEITOS, MODELOS, ajusteValido, tocar, transformar, type AjusteVoz, type EfeitoVoz } from '../lib/vozRobo';
import { ouvirMic, suportaMic, type EstadoMic } from '../lib/escuta';
import { acharChamado, perguntaCompleta } from '../lib/chamado';

type Fonte = 'camera' | 'janela';
type Fala = { id: string; fala: string; cena: SofaCena; at: number; chamado?: boolean; pergunta?: string };
/** O estado da conversa por voz ("Ô iamiguinho!"). */
type Escuta = 'desligado' | 'ouvindo' | 'chamado' | 'pensando' | 'falando' | EstadoMic;
const ESCUTA: Record<Escuta, string> = {
  desligado: 'Microfone desligado', ouvindo: 'Ouvindo. Diga “Ô iamiguinho!” e a pergunta', chamado: 'Chamou! Pode falar', pensando: 'Pensando…',
  falando: 'Falando…', 'sem-suporte': 'Este navegador não ouve o microfone. Use o Chrome.', 'sem-permissao': 'Sem permissão para o microfone: clique no ícone à esquerda do endereço do site, libere o Microfone e ligue a chave de novo.',
  erro: 'O reconhecimento de voz parou de responder. Desligue e ligue de novo.',
};
type Cena = { id: string; url: string; cena: SofaCena; at: number };

const ler = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v) as T; } catch { return d; } };
const gravar = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* nada */ } };
/** Frases para testar a voz de robô. */
const TESTES = [
  'Ô chat, ele morreu de novo. Tipo, vinte e três vezes. Eu tô contando, tá?',
  'Passar da ponte ele passa. O problema é chegar do outro lado, hahaha',
  'Pô, chefe derrotado. Eu ajudei bastante, né. Com a torcida. De longe.',
  'Sério, de novo esse buraco? O buraco já tá te conhecendo, kkkk',
];
const hora = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function StudioSofaPage() {
  const s = useStore((x) => x);
  const admin = !!s.isAdmin;
  // O jogo: o da sessão aberta, ou um dos que estão em andamento.
  const emAndamento = useMemo(() => s.journeys
    .map((j) => ({ j, h: currentHistory(s, j.id), g: s.games[j.gameId] }))
    .filter((x) => x.g && x.h && (x.h.state === 'ativa' || x.h.state === 'pausada'))
    .sort((a, b) => a.g.title.localeCompare(b.g.title, 'pt-BR')), [s]);
  const aberta = openSession(s);
  const [jornada, setJornada] = useState<string>(() => aberta?.journeyId ?? emAndamento[0]?.j.id ?? '');
  const atual = emAndamento.find((x) => x.j.id === jornada);
  const jogo = atual?.g.title;

  const [fonte, setFonte] = useState<Fonte>(() => ler('wz.sofa.fonte', 'camera'));
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [cam, setCam] = useState<string>(() => ler('wz.sofa.cam', ''));
  const [video, setVideo] = useState<'off' | 'on' | 'erro'>('off');
  const [ligado, setLigado] = useState(false);
  const [calado, setCalado] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nivel, setNivel] = useState<SofaNivel>(() => ler('wz.sofa.nivel', 'parceiro'));
  const [intervalo, setIntervalo] = useState<number>(() => ler('wz.sofa.intervalo', 20));
  const [voz, setVoz] = useState<boolean>(() => ler('wz.sofa.voz', false));
  const [ajusteVoz, setAjusteVoz] = useState<AjusteVoz>(() => ajusteValido(ler('wz.sofa.robo', AJUSTE_PADRAO)));
  const mexer = (p: Partial<AjusteVoz>) => setAjusteVoz((a) => ({ ...a, ...p }));
  const modelo = MODELOS.find((m) => m.ajuste.tom === ajusteVoz.tom && m.ajuste.robo === ajusteVoz.robo && m.ajuste.metal === ajusteVoz.metal && m.ajuste.efeito === ajusteVoz.efeito)?.id;
  const [teste, setTeste] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [servicoVoz, setServicoVoz] = useState<'fish' | 'google' | null>(null);
  const [canal, setCanal] = useState<string>(() => ler('wz.sofa.canal', ''));
  const [chatEstado, setChatEstado] = useState<ChatEstado>('desligado');
  const [chat, setChat] = useState<string[]>([]);
  const [falas, setFalas] = useState<Fala[]>([]);
  const [cenas, setCenas] = useState<Cena[]>([]);
  const [parou, setParou] = useState('');
  const [err, setErr] = useState('');
  const [fim, setFim] = useState<{ resumo: string; parou: string; minutos: number } | null>(null);
  const el = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const novasDoChat = useRef<string[]>([]);
  const ultimaFala = useRef(Date.now());
  const inicio = useRef<number | null>(null);
  const ocupado = useRef(false);
  // Etapa 4b: "Ô iamiguinho!" pelo microfone, e o modo apoio quando ele percebe que você está travado.
  const [escutar, setEscutar] = useState<boolean>(() => ler('wz.sofa.escuta', false));
  const [escuta, setEscuta] = useState<Escuta>('desligado');
  const [ouvido, setOuvido] = useState('');
  const [escrito, setEscrito] = useState('');
  const [apoioAte, setApoioAte] = useState<number | null>(null);
  const conversando = useRef(false);
  const esperandoAte = useRef(0);
  const surdoAte = useRef(0);

  useEffect(() => gravar('wz.sofa.fonte', fonte), [fonte]);
  useEffect(() => gravar('wz.sofa.nivel', nivel), [nivel]);
  useEffect(() => gravar('wz.sofa.intervalo', intervalo), [intervalo]);
  useEffect(() => gravar('wz.sofa.voz', voz), [voz]);
  useEffect(() => gravar('wz.sofa.robo', ajusteVoz), [ajusteVoz]);
  useEffect(() => gravar('wz.sofa.cam', cam), [cam]);
  useEffect(() => gravar('wz.sofa.escuta', escutar), [escutar]);

  // As câmeras do computador (a câmera virtual do OBS aparece aqui depois de ligada no OBS).
  const listarCams = async () => {
    try { const d = await navigator.mediaDevices.enumerateDevices(); const v = d.filter((x) => x.kind === 'videoinput'); setCams(v); if (!cam) setCam(v.find((x) => /obs/i.test(x.label))?.deviceId ?? v[0]?.deviceId ?? ''); } catch { /* sem lista */ }
  };
  useEffect(() => { if (admin) void listarCams(); }, [admin]); // eslint-disable-line react-hooks/exhaustive-deps

  const parar = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setVideo('off'); };
  useEffect(() => parar, []);
  const conectar = async () => {
    setErr(''); parar();
    try {
      const st = fonte === 'janela'
        ? await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'window' } as MediaTrackConstraints, audio: false })
        : await navigator.mediaDevices.getUserMedia({ video: cam ? { deviceId: { exact: cam }, width: { ideal: 1280 } } : { width: { ideal: 1280 } }, audio: false });
      stream.current = st;
      if (el.current) { el.current.srcObject = st; await el.current.play().catch(() => null); }
      st.getVideoTracks()[0]?.addEventListener('ended', () => setVideo('off'));
      setVideo('on');
      void listarCams();
    } catch { setVideo('erro'); }
  };

  // Chat da Twitch.
  useEffect(() => {
    if (!admin || !canal.trim()) return;
    const sair = twitchChat(canal, (t) => { novasDoChat.current = [...novasDoChat.current, t].slice(-15); setChat((c) => [...c, t].slice(-30)); }, setChatEstado);
    return sair;
  }, [admin, canal]);

  // A voz: o áudio vem do servidor (a voz criada no Google) e aqui vira voz de robozinho (lib/vozRobo). Os últimos
  // áudios ficam guardados, para mudar o ajuste e ouvir de novo sem pedir outra vez (cada pedido gasta crédito).
  const audioCtx = useRef<AudioContext | null>(null);
  const guardados = useRef(new Map<string, AudioBuffer>());
  const pararVoz = useRef<(() => void) | null>(null);
  const transformados = useRef(new Map<string, AudioBuffer>());
  const ajuste = useRef(ajusteVoz); ajuste.current = ajusteVoz;
  const calarVoz = () => { pararVoz.current?.(); pararVoz.current = null; setTocando(false); };
  const falar = async (t: string, forcar = false) => {
    if (!voz && !forcar) return;
    try {
      const ctx = (audioCtx.current ??= new AudioContext());
      if (ctx.state === 'suspended') await ctx.resume();
      let buf = guardados.current.get(t);
      if (!buf) {
        const r = await sofaApi.voz(t);
        if (!r) { setErr('Na demonstração não tem voz. Ela funciona na conta do canal.'); return; }
        if (r.servico) setServicoVoz(r.servico);
        const bytes = Uint8Array.from(atob(r.audio), (ch) => ch.charCodeAt(0));
        buf = await ctx.decodeAudioData(bytes.buffer);
        guardados.current.set(t, buf);
        if (guardados.current.size > 12) guardados.current.delete(guardados.current.keys().next().value!);
      }
      const a = ajuste.current;
      const chave = `${a.tom}|${a.robo}|${t}`;
      let pronto = transformados.current.get(chave);
      if (!pronto) {
        pronto = transformar(ctx, buf, a);
        transformados.current.set(chave, pronto);
        if (transformados.current.size > 12) transformados.current.delete(transformados.current.keys().next().value!);
      }
      calarVoz();
      setTocando(true);
      pararVoz.current = tocar(ctx, pronto, a, () => setTocando(false));
    } catch (e) { setTocando(false); setErr(e instanceof Error ? e.message : 'A voz não saiu agora.'); }
  };

  const olhar = async (chamado = false) => {
    if (ocupado.current || !el.current || video !== 'on') return;
    const q = quadro(el.current, 768, 0.72);
    if (!q) return;
    ocupado.current = true; setBusy(true); setErr('');
    const chatAgora = novasDoChat.current; novasDoChat.current = [];
    try {
      const r = await sofaApi.olhar({ image: q.data, jogo, nivel: apoioAte && apoioAte > Date.now() ? 'torcedor' : nivel, chamado, recentes: falas.slice(-10).map((f) => f.fala), chat: chatAgora, segundos: Math.round((Date.now() - ultimaFala.current) / 1000) });
      if (r.calado) { setCalado(true); return; }
      if (r.parou) setParou(r.parou);
      if (r.momento) {
        const big = quadro(el.current, 1280, 0.86);
        if (big) setCenas((c) => [...c, { id: uid(), url: big.data, cena: r.cena ?? 'outro', at: Date.now() }].slice(-12));
      }
      if (r.fala) {
        ultimaFala.current = Date.now();
        setFalas((f) => [...f, { id: uid(), fala: r.fala!, cena: r.cena ?? 'outro', at: Date.now(), chamado }].slice(-60));
        void falar(r.fala);
      }
    } catch (e) { setErr(e instanceof Error ? e.message : 'O IAmiguinho não respondeu agora.'); }
    finally { ocupado.current = false; setBusy(false); }
  };
  // O ritmo: uma olhada a cada N segundos, enquanto estiver ligado.
  const olharRef = useRef(olhar); olharRef.current = olhar;
  useEffect(() => {
    if (!ligado || calado || video !== 'on') return;
    const t = setInterval(() => void olharRef.current(false), intervalo * 1000);
    return () => clearInterval(t);
  }, [ligado, calado, video, intervalo]);

  // A conversa por voz: você fala, ele responde em voz alta (mesmo com "Falar em voz alta" desligado) e no balão.
  const bip = () => {
    try {
      const ctx = (audioCtx.current ??= new AudioContext());
      const o = ctx.createOscillator(), g = ctx.createGain(); const t = ctx.currentTime;
      o.frequency.setValueAtTime(880, t); o.frequency.setValueAtTime(1320, t + 0.08);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.25);
    } catch { /* sem som */ }
  };
  const conversar = async (texto: string) => {
    const t = texto.trim();
    if (!t || conversando.current) return;
    conversando.current = true; esperandoAte.current = 0; setEscuta('pensando'); setErr('');
    try {
      const img = video === 'on' && el.current ? quadro(el.current, 768, 0.72)?.data : undefined;
      const r = await sofaApi.conversa({ texto: t, jogo, image: img });
      if (r.humor === 'frustrado') setApoioAte(Date.now() + 10 * 60_000);
      if (r.diag?.includes('modelo_reserva') && !r.diag.includes('biblioteca')) setErr(`O modelo das conversas não respondeu e ele usou o modelo de sempre (código: ${r.diag.filter((d) => d !== 'modelo_reserva').join(', ') || 'sem detalhe'}).`);
      if (r.diag?.includes('biblioteca')) setErr(`A IA não respondeu desta vez e ele usou uma fala reserva (código: ${r.diag.filter((d) => d !== 'biblioteca').join(', ') || 'sem detalhe'}).`);
      if (r.fala) {
        ultimaFala.current = Date.now();
        setFalas((f) => [...f, { id: uid(), fala: r.fala!, cena: 'normal' as SofaCena, at: Date.now(), chamado: true, pergunta: t }].slice(-60));
        if (!calado) await falar(r.fala, true);
      }
    } catch (e) { setErr(e instanceof Error ? e.message : 'O IAmiguinho não respondeu agora.'); }
    finally { conversando.current = false; setEscuta((x) => (x === 'pensando' ? (escutar ? 'ouvindo' : 'desligado') : x)); }
  };
  const conversarRef = useRef(conversar); conversarRef.current = conversar;
  // Enquanto ele fala (e um instante depois), o microfone não conta: senão ele ouve a própria voz.
  const tocandoRef = useRef(false);
  useEffect(() => {
    tocandoRef.current = tocando;
    if (tocando) setEscuta((x) => (x === 'desligado' ? x : 'falando'));
    else { surdoAte.current = Date.now() + 1200; setEscuta((x) => (x === 'falando' ? (escutar ? 'ouvindo' : 'desligado') : x)); }
  }, [tocando, escutar]);
  useEffect(() => {
    if (!admin || !escutar) { setEscuta('desligado'); return; }
    if (!suportaMic()) { setEscuta('sem-suporte'); return; }
    return ouvirMic((texto, final) => {
      if (tocandoRef.current || conversando.current || Date.now() < surdoAte.current) return;
      const c = acharChamado(texto);
      setOuvido(texto);
      if (!final) { if (c.chamou) setEscuta('chamado'); return; }
      if (c.chamou && perguntaCompleta(c.resto)) void conversarRef.current(c.resto);
      else if (c.chamou) { esperandoAte.current = Date.now() + 8000; setEscuta('chamado'); bip(); }
      else if (Date.now() < esperandoAte.current && perguntaCompleta(texto)) void conversarRef.current(texto);
      else setEscuta((x) => (x === 'chamado' && Date.now() >= esperandoAte.current ? 'ouvindo' : x));
    }, (e) => setEscuta(e));
  }, [admin, escutar]); // eslint-disable-line react-hooks/exhaustive-deps

  const ligar = async () => {
    if (video !== 'on') await conectar();
    setLigado(true); setCalado(false); inicio.current ??= Date.now(); ultimaFala.current = Date.now();
    await sofaApi.estado({ ligado: true, calado: false }).catch((e) => setErr(e instanceof Error ? e.message : 'Não deu certo agora.'));
  };
  const pausar = async () => { setLigado(false); await sofaApi.estado({ ligado: false }).catch(() => null); };
  const calar = async () => {
    const v = !calado; setCalado(v);
    if (v) calarVoz();
    await sofaApi.estado({ calado: v }).catch((e) => setErr(e instanceof Error ? e.message : 'Não deu certo agora.'));
  };
  const encerrar = async () => {
    setLigado(false); setBusy(true);
    const minutos = inicio.current ? (Date.now() - inicio.current) / 60000 : 0;
    try { const r = await sofaApi.fim({ jogo, falas: falas.map((f) => ({ fala: f.fala, cena: f.cena })), minutos }); setFim({ resumo: r.resumo, parou: r.parou || parou, minutos }); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Não deu para fechar agora.'); }
    finally { setBusy(false); }
  };

  if (!admin) return (
    <main className="page pad narrow">
      <h1 className="t big">IAmiguinho no sofá</h1>
      <p className="muted lead">Esta tela é só da administração do WinnerZ.</p>
    </main>
  );

  const ultima = falas[falas.length - 1];
  const status = !ligado ? 'Desligado' : calado ? 'Calado' : `Olhando a cada ${intervalo} s`;

  return (
    <main className="page pad sofa">
      <header className="sofa__head">
        <div>
          <Link to="/studio" className="sofa__back"><Icon name="voltar" size={16} />Studio</Link>
          <h1 className="t sofa__title">IAmiguinho no sofá</h1>
          <p className="muted sofa__lead">O co-apresentador das suas lives. Ninguém mais vê esta tela.</p>
        </div>
        <span className={`sofa__status${ligado && !calado ? ' is-on' : ''}${calado ? ' is-mute' : ''}`} role="status"><i aria-hidden="true" />{status}</span>
      </header>

      <div className="sofa__grid">
        <section className="sofa__tela" aria-label="A tela do jogo">
          <div className="sofa__video">
            <video ref={el} playsInline muted autoPlay hidden={video !== 'on'} aria-label="A tela do jogo" />
            {video !== 'on' && (
              <div className="sofa__idle">
                {video === 'erro' && <p>Não consegui pegar a imagem. Confira se a câmera virtual do OBS está ligada, ou escolha a janela.</p>}
                <button className="btn primary" onClick={() => void conectar()}><Icon name="camera" size={16} />{fonte === 'janela' ? 'Escolher a janela do jogo' : 'Ligar a câmera'}</button>
              </div>
            )}
            {busy && <span className="sofa__olho" aria-hidden="true" />}
          </div>
          <div className="sofa__fonte">
            <div className="seg seg--sm" role="group" aria-label="De onde vem a imagem">
              <button aria-pressed={fonte === 'camera'} onClick={() => setFonte('camera')}>Câmera virtual do OBS</button>
              <button aria-pressed={fonte === 'janela'} onClick={() => setFonte('janela')}>Janela do jogo</button>
            </div>
            {fonte === 'camera' && cams.length > 0 && (
              <select className="field" value={cam} onChange={(e) => setCam(e.target.value)} aria-label="Câmera">
                {cams.map((c, i) => <option key={c.deviceId || i} value={c.deviceId}>{c.label || `Câmera ${i + 1}`}</option>)}
              </select>
            )}
          </div>

          <div className="sofa__acoes">
            {!ligado
              ? <button className="btn now lg" onClick={() => void ligar()}><Icon name="play" size={18} />Ligar o IAmiguinho</button>
              : <button className="btn ghost lg" onClick={() => void pausar()}>Pausar</button>}
            <button className="btn primary lg" disabled={video !== 'on' || busy || calado} onClick={() => void olhar(true)}><Icon name="olho" size={18} />Olha isso!</button>
            <button className={`btn lg ${calado ? 'primary' : 'ghost'}`} aria-pressed={calado} onClick={() => void calar()}>{calado ? 'Soltar' : 'Calar'}</button>
            <button className="btn quiet lg" disabled={!falas.length || busy} onClick={() => void encerrar()}>Encerrar e resumir</button>
          </div>
          {err && <p className="awards__error" role="alert">{err}</p>}

          <div className={`sofa__escuta is-${escuta}`}>
            <label className="motion motion--switch" data-on={escutar}>
              <input type="checkbox" role="switch" className="switch" checked={escutar} onChange={(e) => setEscutar(e.target.checked)} />
              <span><strong>Chamar pela voz: “Ô iamiguinho!”</strong><span className="muted">Diga o nome dele e a pergunta, numa frase só ou com uma pausa. Ele responde em voz alta e no balão da live. Funciona no Chrome: o navegador transforma a fala em texto, e só o que vem depois do nome dele vai para o site.</span></span>
            </label>
            {escutar && (
              <p className="sofa__escuta-st" role="status"><i aria-hidden="true" />{ESCUTA[escuta]}{ouvido && (escuta === 'ouvindo' || escuta === 'chamado') && <span className="faint"> · ouvi: “{ouvido.slice(-80)}”</span>}</p>
            )}
            <form className="sofa__escrever" onSubmit={(e) => { e.preventDefault(); const t = escrito; setEscrito(''); void conversar(t); }}>
              <input className="field" value={escrito} maxLength={300} placeholder="Ou escreva para ele aqui" onChange={(e) => setEscrito(e.target.value)} aria-label="Escrever para o IAmiguinho" />
              <button className="btn ghost" type="submit" disabled={!escrito.trim() || escuta === 'pensando'}>{escuta === 'pensando' ? 'Pensando…' : 'Mandar'}</button>
            </form>
            {apoioAte && apoioAte > Date.now() && (
              <p className="sofa__apoio"><span><b>Modo apoio até as {hora(apoioAte)}.</b> Ele percebeu que você está travado: nada de zoar a jogada, só torcida.</span><button className="btn quiet sm" onClick={() => setApoioAte(null)}>Voltar ao normal</button></p>
            )}
          </div>

          <div className="sofa__ajustes">
            <label className="glr-f sofa__jogo"><span className="glr-f__l">Jogo</span>
              <select className="field" value={jornada} onChange={(e) => setJornada(e.target.value)}>
                {!emAndamento.length && <option value="">Descobrir pela tela</option>}
                {emAndamento.map((x) => <option key={x.j.id} value={x.j.id}>{x.g.title}{aberta?.journeyId === x.j.id ? ' · sessão aberta' : ''}</option>)}
              </select>
            </label>
            <fieldset className="glr-f sofa__nivel" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="glr-f__l">Zoeira</legend>
              <div className="seg seg--sm" role="group">
                {SOFA_NIVEIS.map((n) => <button key={n.id} aria-pressed={nivel === n.id} title={n.hint} onClick={() => setNivel(n.id)}>{n.name}</button>)}
              </div>
            </fieldset>
            <label className="glr-f"><span className="glr-f__l">Olhar a cada</span>
              <select className="field" value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))}>
                {[15, 20, 30, 45].map((n) => <option key={n} value={n}>{n} segundos</option>)}
              </select>
            </label>
            <label className="glr-f"><span className="glr-f__l">Chat da Twitch</span>
              <input className="field" placeholder="nome do canal" value={canal} maxLength={25} onChange={(e) => { setCanal(e.target.value); gravar('wz.sofa.canal', e.target.value); }} />
              <span className={`sofa__chat-st is-${chatEstado}`}>{chatEstado === 'ligado' ? 'Lendo o chat' : chatEstado === 'conectando' ? 'Conectando…' : chatEstado === 'erro' ? 'Canal inválido ou fora do ar' : 'Sem chat'}</span>
            </label>
            <label className="motion motion--switch sofa__voz" data-on={voz}>
              <input type="checkbox" role="switch" className="switch" checked={voz} onChange={(e) => setVoz(e.target.checked)} />
              <span><strong>Falar em voz alta</strong><span className="muted">Com a voz de robozinho ajustada abaixo. Para entrar na live, capture o áudio desta janela no OBS.</span></span>
            </label>
            <fieldset className="sofa__lab">
              <legend className="glr-f__l">Voz de robozinho</legend>
              <div className="sofa__filtros" role="group" aria-label="Modelos de voz">
                {MODELOS.map((m) => (
                  <button key={m.id} type="button" className="sofa__filtro" aria-pressed={modelo === m.id} onClick={() => setAjusteVoz(m.ajuste)}>
                    <strong>{m.nome}</strong><span>{m.dica}</span>
                  </button>
                ))}
              </div>
              <div className="sofa__regua">
                <label className="glr-f"><span className="glr-f__l">Tom: {ajusteVoz.tom > 0 ? '+' : ''}{ajusteVoz.tom}</span>
                  <input type="range" min={-4} max={12} step={1} value={ajusteVoz.tom} onChange={(e) => mexer({ tom: Number(e.target.value) })} />
                  <span className="sofa__dica">Mais alto, mais pequeno ele parece.</span>
                </label>
                <label className="glr-f"><span className="glr-f__l">Robô: {ajusteVoz.robo}%</span>
                  <input type="range" min={0} max={100} step={5} value={ajusteVoz.robo} onChange={(e) => mexer({ robo: Number(e.target.value) })} />
                  <span className="sofa__dica">O zumbido eletrônico. Muito alto, a fala fica menos clara.</span>
                </label>
                <label className="glr-f"><span className="glr-f__l">Metal: {ajusteVoz.metal}%</span>
                  <input type="range" min={0} max={100} step={5} value={ajusteVoz.metal} onChange={(e) => mexer({ metal: Number(e.target.value) })} />
                  <span className="sofa__dica">A vibração metálica por cima.</span>
                </label>
                <label className="glr-f"><span className="glr-f__l">Efeito extra</span>
                  <select className="field" value={ajusteVoz.efeito} onChange={(e) => mexer({ efeito: e.target.value as EfeitoVoz })}>
                    {EFEITOS.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                  </select>
                </label>
              </div>
              <label className="glr-f sofa__teste"><span className="glr-f__l">Frase de teste</span>
                <select className="field" value={teste} onChange={(e) => setTeste(Number(e.target.value))}>
                  {TESTES.map((t, i) => <option key={i} value={i}>{t}</option>)}
                </select>
              </label>
              <div className="sofa__testar">
                {tocando
                  ? <button type="button" className="btn ghost" onClick={calarVoz}>Parar</button>
                  : <button type="button" className="btn primary" onClick={() => void falar(TESTES[teste], true)}><Icon name="play" size={16} />Ouvir</button>}
                <span className="muted">Mexer no ajuste e ouvir de novo a mesma frase não gasta crédito.</span>
              </div>
              {servicoVoz === 'fish' && <p className="muted sofa__servico">Voz de agora: Fish Audio (a voz escolhida).</p>}
              {servicoVoz === 'google' && <p className="sofa__servico sofa__servico--aviso">Voz de agora: Google. O servidor não está vendo a chave da Fish Audio (FISH_API_KEY na Vercel, em Production).</p>}
            </fieldset>
          </div>
        </section>

        <aside className="sofa__lado" aria-label="O IAmiguinho">
          <div className="sofa__balao">
            <Figura img={`cara-${ultima ? CENA_CARA[ultima.cena] : 'sorriso-confiante'}`} className="sofa__cara" width={96} height={96} lazy={false} />
            <p className={`sofa__fala${calado ? ' is-mute' : ''}`} aria-live="polite">
              <span className="iam-fala__quem">IAmiguinho <span className="iam-selo">Mascote</span></span>
              {calado ? 'Calado. Aperte Soltar para ele voltar a falar.' : ultima ? ultima.fala : ligado ? 'Assistindo…' : 'Ligue para ele começar a assistir.'}
            </p>
          </div>
          {parou && <p className="faint sofa__parou">Na tela: {parou}</p>}
          <h2 className="kicker">Falas</h2>
          <ol className="sofa__falas">
            {[...falas].reverse().slice(0, 30).map((f) => (
              <li key={f.id}><span className="faint">{hora(f.at)} · {f.pergunta ? 'conversa' : CENA_NOME[f.cena]}{f.chamado && !f.pergunta ? ' · chamado' : ''}</span>{f.pergunta && <span className="sofa__pergunta">Você: {f.pergunta}</span>}{f.fala}</li>
            ))}
            {!falas.length && <li className="faint">Nada ainda.</li>}
          </ol>
          {canal && (
            <>
              <h2 className="kicker">Chat</h2>
              <ul className="sofa__chat">{chat.slice(-8).map((c, i) => <li key={i}>{c}</li>)}{!chat.length && <li className="faint">Sem mensagens ainda.</li>}</ul>
            </>
          )}
          {cenas.length > 0 && (
            <>
              <h2 className="kicker">Cenas separadas · {cenas.length}</h2>
              <div className="sofa__cenas">{cenas.map((c) => <img key={c.id} src={c.url} alt={`${CENA_NOME[c.cena]}, ${hora(c.at)}`} />)}</div>
            </>
          )}
        </aside>
      </div>

      {fim && <Fim fim={fim} cenas={cenas} jornada={atual ? { journeyId: atual.j.id, historyId: atual.h!.id, title: atual.g.title } : null} onClose={() => setFim(null)} />}
    </main>
  );
}

/** O fim da sessão: o resumo, onde parou e as cenas, para guardar na Jornada. */
function Fim({ fim, cenas, jornada, onClose }: { fim: { resumo: string; parou: string; minutos: number }; cenas: Cena[]; jornada: { journeyId: string; historyId: string; title: string } | null; onClose: () => void }) {
  const s = useStore((x) => x);
  const [resumo, setResumo] = useState(fim.resumo);
  const [guardadas, setGuardadas] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState('');
  const sessao = jornada ? s.sessions.find((x) => !x.endedAt && x.journeyId === jornada.journeyId) : null;

  const guardar = async (c: Cena) => {
    if (!sessao) return;
    const blob = await (await fetch(c.url)).blob();
    const title = CENA_NOME[c.cena];
    const sb = s.mode === 'supabase' && s.profile ? await import('../data/supabaseAdapter') : null;
    if (sb?.photoStorageReady()) {
      const id = uid(); const path = sb.photoPath(s.profile!.id, id);
      actions.addMoment(sessao.id, { id, title, kind: 'momento', image: c.url, imagePath: path });
      sb.uploadPhoto(path, blob).catch(() => { actions.updateEventPhoto(id, { imagePath: '', image: undefined }); setMsg('Uma foto não subiu; o momento ficou sem ela.'); });
    } else actions.addMoment(sessao.id, { title, kind: 'momento', image: c.url });
    setGuardadas((g) => new Set(g).add(c.id));
  };
  const capsula = () => {
    if (!jornada || !fim.parou) return;
    const h = s.histories.find((x) => x.id === jornada.historyId);
    actions.setCapsule(jornada.historyId, { ...(h?.capsule ?? {}), where: fim.parou, ai: true });
    setMsg('Cápsula atualizada.');
  };
  return (
    <Sheet title="Fim da sessão" onClose={onClose} labelId="sofa-fim" wide>
      <div className="sofa-fim">
        <p className="muted" style={{ margin: 0 }}>{jornada ? jornada.title : 'Jogo'} · {Math.max(1, Math.round(fim.minutos))} min com o IAmiguinho no sofá.</p>
        <label className="glr-f"><span className="glr-f__l">Resumo (dá para editar e copiar)</span>
          <textarea className="field" rows={3} value={resumo} onChange={(e) => setResumo(e.target.value)} />
        </label>
        <div className="tdz-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button className="btn ghost" onClick={() => { void navigator.clipboard?.writeText(resumo); setMsg('Resumo copiado.'); }}>Copiar o resumo</button>
          {fim.parou && jornada && <button className="btn ghost" onClick={capsula}>Pôr na Cápsula: “{fim.parou}”</button>}
        </div>
        {cenas.length > 0 && (
          <>
            <h3 className="kicker">Cenas que ele separou</h3>
            {!sessao && <p className="faint" style={{ margin: 0 }}>Para guardar como momento, abra uma sessão de {jornada?.title ?? 'um jogo'}. Dá para baixar a imagem.</p>}
            <div className="sofa-fim__cenas">
              {cenas.map((c) => (
                <figure key={c.id}>
                  <img src={c.url} alt="" />
                  <figcaption>
                    <span className="faint">{CENA_NOME[c.cena]} · {hora(c.at)}</span>
                    {sessao && <button className="btn quiet sm" disabled={guardadas.has(c.id)} onClick={() => void guardar(c)}>{guardadas.has(c.id) ? 'Guardada' : 'Guardar como momento'}</button>}
                    <a className="btn quiet sm" href={c.url} download={`sofa-${c.at}.jpg`}>Baixar</a>
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
        {msg && <p role="status" className="muted" style={{ margin: 0 }}>{msg}</p>}
      </div>
    </Sheet>
  );
}
