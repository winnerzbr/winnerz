/**
 * IAmiguinho na tela: o mascote de interface (telas vazias, 404, erro, carregamento), o balão de cameo no canto, o
 * cartão espiando e a proteção contra erro que mostra ele com o cabo na mão. As falas e as regras estão em
 * lib/iamiguinho. M6: a hélice gira de verdade (camadas separadas em public/brand/iamiguinho/anim), ele respira, um
 * toque faz a hélice engasgar, cinco deixam ele tonto, e nas épocas de festa ele aparece enfeitado.
 */
import { Component, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../data/store';
import { CARA, CUTUCAR, POSE, TONTO, epocaAtual, falaDaBiblioteca, liberarCameo, pedirCameo, sortear, type Cameo, type Epoca, type Fatos, type Interface } from '../lib/iamiguinho';
import { HELICE } from '../lib/iamiguinhoHelice';

const useModo = () => useStore((s) => s.prefs.iamiguinho ?? 'normal');

/* ---- A figura animada ------------------------------------------------------------------------------------------ */

type Estado = 'normal' | 'engasgo' | 'tonto';
/**
 * Uma imagem dele (pose-* ou cara-*) com a hélice girando por cima do corpo, no eixo e na inclinação de cada imagem.
 * Com "animações reduzidas" fica parada, igual à imagem original. Com onCutucar, vira botão: um toque engasga a hélice
 * (trava, dá um tranco e solta fumaça); cinco toques em poucos segundos deixam ele tonto.
 */
export function Figura({ img, className = '', width, height, parada = false, enfeite = true, onCutucar, lazy = true, alt = '' }: {
  img: string; className?: string; width: number; height: number; parada?: boolean; enfeite?: boolean;
  onCutucar?: (tonto: boolean) => void; lazy?: boolean; alt?: string;
}) {
  const [estado, setEstado] = useState<Estado>('normal');
  const toques = useRef<number[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const [epoca] = useState<Epoca | null>(() => (enfeite ? epocaAtual() : null));
  const src = estado === 'tonto' && img.startsWith('cara-') ? 'cara-tonto' : img;
  const h = HELICE[src];
  const tap = () => {
    const agora = Date.now();
    toques.current = [...toques.current.filter((t) => agora - t < 4000), agora];
    const tonto = toques.current.length >= 5;
    if (tonto) toques.current = [];
    setEstado(tonto ? 'tonto' : 'engasgo');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setEstado('normal'), tonto ? 2800 : 1400);
    onCutucar?.(tonto);
  };
  const imgProps = { alt: '', width, height, decoding: 'async' as const, loading: lazy ? ('lazy' as const) : undefined, draggable: false };
  const corpo = h ? (
    <>
      <img className="iam-fig__corpo" src={`/brand/iamiguinho/anim/${src}-corpo.webp`} {...imgProps} />
      <img className="iam-fig__helice" src={`/brand/iamiguinho/anim/${src}-helice.webp`} {...imgProps}
        style={{ transformOrigin: `${h.x}% ${h.y}%`, '--iam-a': `${h.a}deg` } as CSSProperties} />
      {estado === 'engasgo' && <span className="iam-fumaca" style={{ left: `${h.x}%`, top: `${h.y}%` }} aria-hidden="true"><i /><i /><i /></span>}
    </>
  ) : <img className="iam-fig__corpo" src={`/brand/iamiguinho/${src}.webp`} {...imgProps} />;
  const cls = `iam-fig is-${estado}${parada ? ' is-parada' : ''} ${className}`;
  const conteudo = <>{corpo}{epoca && <Enfeite epoca={epoca} />}</>;
  if (!onCutucar) return <span className={cls} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>{conteudo}</span>;
  return <button type="button" className={`${cls} iam-fig--btn`} onClick={tap} aria-label={alt ? `${alt}. Toque para cutucar o IAmiguinho` : 'Cutucar o IAmiguinho'}>{conteudo}</button>;
}

/** O enfeite da época, desenhado ao lado dele (nunca por cima do rosto). */
function Enfeite({ epoca }: { epoca: Epoca }) {
  const svg: Record<Epoca, ReactNode> = {
    halloween: (
      <svg viewBox="0 0 64 56"><path d="M32 14c-3-6 1-11 6-12" fill="none" stroke="#2f7d3a" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="20" cy="34" rx="15" ry="18" fill="#e8741c" /><ellipse cx="44" cy="34" rx="15" ry="18" fill="#e8741c" /><ellipse cx="32" cy="34" rx="15" ry="20" fill="#f58a26" />
        <path d="M22 30l6-6 4 6zM36 30l6-6 4 6zM22 41q10 8 20 0l-4 3-3-3-3 3-3-3-3 3z" fill="#3a1d05" /></svg>
    ),
    natal: (
      <svg viewBox="0 0 64 60"><rect x="8" y="24" width="48" height="34" rx="3" fill="#c8302c" /><rect x="5" y="17" width="54" height="11" rx="2" fill="#e04540" />
        <rect x="28" y="17" width="8" height="41" fill="#f2c14e" /><path d="M32 17c-12-12-20-4-12 0zM32 17c12-12 20-4 12 0z" fill="none" stroke="#f2c14e" strokeWidth="4" strokeLinejoin="round" /></svg>
    ),
    'ano-novo': (
      <svg viewBox="0 0 64 64"><g stroke="#f2c14e" strokeWidth="3" strokeLinecap="round">{Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5; return <line key={i} x1={32 + Math.cos(a) * 8} y1={28 + Math.sin(a) * 8} x2={32 + Math.cos(a) * 22} y2={28 + Math.sin(a) * 22} />; })}</g>
        <circle cx="32" cy="28" r="4" fill="#fff4c9" /><circle cx="12" cy="56" r="2.5" fill="#7fe3ff" /><circle cx="54" cy="52" r="2.5" fill="#ff8fb1" /></svg>
    ),
    carnaval: (
      <svg viewBox="0 0 64 64"><path d="M6 50c10-18 18 6 28-12s16 4 24-10" fill="none" stroke="#ff4fa0" strokeWidth="3.5" strokeLinecap="round" />
        <rect x="10" y="12" width="7" height="5" rx="1" fill="#f2c14e" transform="rotate(20 13 14)" /><rect x="40" y="8" width="7" height="5" rx="1" fill="#2fb7ff" transform="rotate(-25 43 10)" />
        <rect x="28" y="22" width="7" height="5" rx="1" fill="#5fd08f" transform="rotate(35 31 24)" /><rect x="50" y="30" width="7" height="5" rx="1" fill="#a66bff" /><circle cx="20" cy="34" r="3" fill="#ff8a3d" /></svg>
    ),
    junina: (
      <svg viewBox="0 0 64 40"><path d="M2 6q30 14 60 0" fill="none" stroke="#8a6a3a" strokeWidth="1.6" />
        {[['#e04540', 6], ['#f2c14e', 18], ['#2fb7ff', 30], ['#5fd08f', 42], ['#ff4fa0', 54]].map(([c, x], i) => <path key={i} d={`M${Number(x) - 5} ${7 + Math.sin((Number(x) / 64) * Math.PI) * 6}l10 0-5 13z`} fill={String(c)} />)}</svg>
    ),
    gamer: (
      <svg viewBox="0 0 64 48"><path d="M14 14h36c8 0 12 8 12 18s-4 14-9 14-8-6-12-6H23c-4 0-7 6-12 6S2 42 2 32s4-18 12-18z" fill="#1f4fd8" />
        <path d="M14 26h10M19 21v10" stroke="#f4f6fa" strokeWidth="3.5" strokeLinecap="round" /><circle cx="44" cy="24" r="3" fill="#7fe3ff" /><circle cx="51" cy="30" r="3" fill="#ff8fb1" />
        <path d="M32 9c-2-5-9-3-6 2l6 5 6-5c3-5-4-7-6-2z" fill="#ff4f6d" /></svg>
    ),
  };
  return <span className={`iam-enfeite iam-enfeite--${epoca === 'junina' ? 'topo' : 'pe'}`} aria-hidden="true">{svg[epoca]}</span>;
}

/** Fala de um toque (engasgo) ou de cinco (tonto), às vezes com a época de festa. */
const falaDoToque = (tonto: boolean) => sortear(tonto ? TONTO : CUTUCAR);

/** Ele no lugar do conteúdo: pose de corpo inteiro e um balão com a fala. Com o modo Desativado, some. */
export function MascoteVazio({ momento, className = '' }: { momento: Interface; className?: string }) {
  const modo = useModo();
  const [fala, setFala] = useState(() => falaDaBiblioteca(momento, {}, [], epocaAtual()));
  if (modo === 'desativado') return null;
  const pose = POSE[momento];
  return (
    <div className={`iam-vazio ${className}`}>
      <Figura img={`pose-${pose}`} className="iam-vazio__pose" width={180} height={240} parada={pose === 'dormindo'} onCutucar={(t) => setFala(falaDoToque(t))} />
      <p className="iam-fala" role="note" aria-live="polite"><span className="iam-fala__quem">IAmiguinho <span className="iam-selo">Mascote</span></span>{fala}</p>
    </div>
  );
}

/** Balão no canto: entra, fala uma linha e sai sozinho. Fecha no ×, com Esc, e para de contar com o mouse em cima. */
export function CameoBalao({ motivo, fala: falaInicial, onDone }: { motivo: Cameo; fala: string; onDone?: () => void }) {
  const [vivo, setVivo] = useState(true);
  const [fala, setFala] = useState(falaInicial);
  const pausa = useRef(false);
  const fechar = () => { setVivo(false); onDone?.(); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fechar(); };
    window.addEventListener('keydown', onKey);
    let resta = 12000; let t0 = Date.now();
    const tick = setInterval(() => { if (pausa.current) { t0 = Date.now(); return; } resta -= Date.now() - t0; t0 = Date.now(); if (resta <= 0) fechar(); }, 500);
    return () => { window.removeEventListener('keydown', onKey); clearInterval(tick); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!vivo || typeof document === 'undefined') return null;
  return createPortal(
    <aside className="iam-cameo" role="status" aria-live="polite" aria-label="IAmiguinho"
      onMouseEnter={() => { pausa.current = true; }} onMouseLeave={() => { pausa.current = false; }}
      onFocus={() => { pausa.current = true; }} onBlur={() => { pausa.current = false; }}>
      <Figura img={`cara-${CARA[motivo]}`} className="iam-cameo__cara" width={72} height={72} lazy={false} onCutucar={(t) => { pausa.current = true; setFala(falaDoToque(t)); }} />
      <p className="iam-cameo__txt"><span className="iam-fala__quem">IAmiguinho <span className="iam-selo">Mascote</span></span>{fala}</p>
      <button type="button" className="iam-cameo__x" aria-label="Fechar o IAmiguinho" onClick={fechar}>×</button>
    </aside>,
    document.body,
  );
}

/** Decide uma vez, ao abrir a tela, se o cameo aparece por este motivo (respeita o modo e os intervalos). */
export function useCameo(motivo: Cameo, quando: boolean, escopo = ''): string | null {
  const [fala] = useState(() => (quando && liberarCameo(motivo, escopo) ? falaDaBiblioteca(motivo) : null));
  return fala;
}

export function Cameo({ motivo, quando = true, escopo = '' }: { motivo: Cameo; quando?: boolean; escopo?: string }) {
  const fala = useCameo(motivo, quando, escopo);
  return fala ? <CameoBalao motivo={motivo} fala={fala} /> : null;
}

/**
 * Cameo da Jornada (M4): pede a fala (IA checada ou biblioteca) e mostra o balão quando ela chega. Decide uma vez,
 * ao montar; "atraso" deixa a tela respirar antes (por exemplo, logo depois de fechar a comemoração).
 */
export function CameoJornada({ motivo, escopo, fatos, atraso = 0 }: { motivo: Cameo; escopo: string; fatos: Fatos; atraso?: number }) {
  const fala = useCameoPedido(motivo, escopo, fatos, atraso);
  return fala ? <CameoBalao motivo={motivo} fala={fala} /> : null;
}

/** Pede a fala de um cameo uma vez, ao montar (o portão do aparelho, o do servidor e a fala da IA ou da biblioteca). */
function useCameoPedido(motivo: Cameo, escopo: string, fatos: Fatos, atraso = 0): string | null {
  const [fala, setFala] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    const t = setTimeout(() => { void pedirCameo(motivo, escopo, fatos).then((f) => { if (vivo) setFala(f); }); }, atraso);
    return () => { vivo = false; clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return fala;
}

/**
 * "IAmiguinho passou por aqui" (M5): um cartão pequeno, com ele espiando pela lateral de um card (por exemplo, numa
 * jogatina com vaga). Não cobre nada e fecha no ×. Segue o modo e os intervalos como qualquer cameo.
 */
export function Espiando({ motivo, escopo = '', fatos = {} }: { motivo: Cameo; escopo?: string; fatos?: Fatos }) {
  const pedida = useCameoPedido(motivo, escopo, fatos, 400);
  const [toque, setToque] = useState<string | null>(null);
  const [fechado, setFechado] = useState(false);
  const fala = toque ?? pedida;
  if (!fala || fechado) return null;
  return (
    <aside className="iam-espia" aria-label="IAmiguinho passou por aqui">
      <p className="iam-espia__t"><span className="iam-fala__quem">IAmiguinho passou por aqui <span className="iam-selo">Mascote</span></span>{fala}</p>
      <Figura img="pose-espiando" className="iam-espia__pose" width={120} height={116} enfeite={false} onCutucar={(t) => setToque(falaDoToque(t))} />
      <button type="button" className="iam-espia__x" aria-label="Fechar o IAmiguinho" onClick={() => setFechado(true)}>×</button>
    </aside>
  );
}

/** Carregamento: depois de 1,5 s sem resposta, ele aparece planando. */
export function Carregando() {
  const [demorou, setDemorou] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDemorou(true), 1500); return () => clearTimeout(t); }, []);
  return (
    <main className="page pad" aria-busy="true">
      {demorou ? <MascoteVazio momento="carregando" className="iam-vazio--centro" /> : null}
      <p className="faint" style={demorou ? { textAlign: 'center' } : undefined}>Carregando…</p>
    </main>
  );
}

/** Tela de erro: se uma página quebrar, ele aparece com o cabo na mão e um botão para tentar de novo. */
export class ProtecaoErro extends Component<{ children: ReactNode; chave?: string }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() { return { erro: true }; }
  componentDidUpdate(prev: { chave?: string }) { if (prev.chave !== this.props.chave && this.state.erro) this.setState({ erro: false }); }
  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <main className="page pad notfound">
        <header className="page-head"><div className="page-head__text"><h1 className="t big">Algo deu errado</h1><p className="muted lead">Esta página não carregou direito. Tentar de novo costuma resolver.</p></div></header>
        <MascoteVazio momento="erro" />
        <div className="hero__actions"><button type="button" className="btn primary" onClick={() => location.reload()}>Tentar de novo</button><a className="btn ghost" href="/">Voltar ao início</a></div>
      </main>
    );
  }
}
