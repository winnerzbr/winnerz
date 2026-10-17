/**
 * IAmiguinho na tela, fase 1: o mascote de interface (telas vazias, 404, erro, carregamento), o balão de cameo no
 * canto e a proteção contra erro que mostra ele com o cabo na mão. As falas e as regras estão em lib/iamiguinho.
 */
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../data/store';
import { CARA, POSE, caraPath, falaDaBiblioteca, liberarCameo, pedirCameo, posePath, type Cameo, type Fatos, type Interface } from '../lib/iamiguinho';

const useModo = () => useStore((s) => s.prefs.iamiguinho ?? 'normal');

/** Ele no lugar do conteúdo: pose de corpo inteiro e um balão com a fala. Com o modo Desativado, some. */
export function MascoteVazio({ momento, className = '' }: { momento: Interface; className?: string }) {
  const modo = useModo();
  const [fala] = useState(() => falaDaBiblioteca(momento));
  if (modo === 'desativado') return null;
  return (
    <div className={`iam-vazio ${className}`}>
      <img className="iam-vazio__pose" src={posePath(POSE[momento])} alt="" width={180} height={240} loading="lazy" decoding="async" />
      <p className="iam-fala" role="note"><span className="iam-fala__quem">IAmiguinho <span className="iam-selo">Mascote</span></span>{fala}</p>
    </div>
  );
}

/** Balão no canto: entra, fala uma linha e sai sozinho. Fecha no ×, com Esc, e para de contar com o mouse em cima. */
export function CameoBalao({ motivo, fala, onDone }: { motivo: Cameo; fala: string; onDone?: () => void }) {
  const [vivo, setVivo] = useState(true);
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
      <img className="iam-cameo__cara" src={caraPath(CARA[motivo])} alt="" width={72} height={72} />
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
  const fala = useCameoPedido(motivo, escopo, fatos, 400);
  const [fechado, setFechado] = useState(false);
  if (!fala || fechado) return null;
  return (
    <aside className="iam-espia" aria-label="IAmiguinho passou por aqui">
      <p className="iam-espia__t"><span className="iam-fala__quem">IAmiguinho passou por aqui <span className="iam-selo">Mascote</span></span>{fala}</p>
      <img className="iam-espia__pose" src={posePath('espiando')} alt="" width={120} height={116} loading="lazy" decoding="async" />
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
