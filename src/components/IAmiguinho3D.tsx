/**
 * O IAmiguinho em 3D aparecendo na tela (12/11/2026): o próprio modelo animado, com a fala num balão de diálogo.
 * Três entradas, sorteadas: "borda" (sobe segurando a borda de baixo da janela, até o peito), "andar" (vem andando de
 * fora da tela) e "pixels" (quadradinhos que se juntam e formam ele). Sai do mesmo jeito que entrou.
 * Um toque nele assusta; cinco deixam tonto. Com "reduzir movimento", aparece parado, sem entrada.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Estado3D } from '../lib/iamiguinho3d';

export type Entrada = 'borda' | 'andar' | 'pixels';
const ENTRADAS: Entrada[] = ['borda', 'andar', 'pixels'];
const semMovimento = () => { try { return document.documentElement.dataset.motion === 'reduzidas' || window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
const ease = (t: number) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
let ultima = -1;
const sortearEntrada = (festa: boolean): Entrada => {
  const op = festa ? ENTRADAS.filter((e) => e !== 'borda') : ENTRADAS;
  ultima = (ultima + 1 + Math.floor(Math.random() * (op.length - 1))) % op.length;
  return op[ultima % op.length];
};

export function Aparicao3D({ fala, rosto, festa = false, entrada, onFechar, onCutucar, onFalha, onPausa }: {
  fala: string; rosto: string; festa?: boolean; entrada?: Entrada;
  onFechar: () => void; onCutucar?: (tonto: boolean) => void; onFalha: () => void; onPausa?: (p: boolean) => void;
}) {
  const [modo] = useState<Entrada>(() => entrada ?? sortearEntrada(festa));
  const [quieto] = useState(semMovimento);
  const [pronto, setPronto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const agora = useRef(0);
  const sai = useRef<number | null>(null);
  const toque = useRef<{ em: number; tonto: boolean } | null>(null);
  const toques = useRef<number[]>([]);
  const rostoRef = useRef(rosto); rostoRef.current = rosto;
  const falha = useRef(onFalha); falha.current = onFalha;

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    let off: (() => void) | undefined, vivo = true;
    const estado = (t: number): Estado3D => {
      agora.current = t;
      const vista: [number, number] = modo === 'borda' ? [0.37, 1.06] : [-0.03, 1.03];
      if (quieto) return { anim: modo === 'borda' ? 'borda' : 'acenar', parado: true, rosto: rostoRef.current, vista, t0: 0 };
      const e: Estado3D = { rosto: rostoRef.current, vista };
      const depois = festa ? 'comemorar' : 'acenar';
      if (modo === 'borda') { e.anim = 'borda'; e.t0 = 0; }
      else if (modo === 'andar') {
        if (t < 1.5) { e.anim = 'andar'; e.yaw = -1.15; }
        else { const k = ease((t - 1.5) / 0.35); e.yaw = -1.15 + 1.15 * k; if (t < 1.85) e.anim = 'parado'; else if (t < 5.4) { e.anim = depois; e.t0 = 1.85; } else e.anim = 'parado'; }
      } else {
        e.pix = t < 0.08 ? 1 : 1 - ease((t - 0.08) / 1.25);
        if (t < 1.35) e.anim = 'parado'; else if (t < 4.9) { e.anim = depois; e.t0 = 1.35; } else e.anim = 'parado';
      }
      const tq = toque.current;
      if (tq) {
        const d = t - tq.em;
        if (d > (tq.tonto ? 2.8 : 1.3)) toque.current = null;
        else { e.rosto = tq.tonto ? 'tonto' : 'surpreso'; if (tq.tonto && modo !== 'borda') { e.anim = 'tonto'; e.t0 = tq.em; } e.helice = tq.tonto ? 0.2 : Math.min(1, d); }
      }
      if (sai.current != null && modo !== 'borda') e.pix = Math.max(e.pix ?? 0, ease((t - sai.current) / 0.5));
      return e;
    };
    void import('../lib/iamiguinho3d').then(({ mountIAmiguinho }) => {
      if (!vivo) return;
      off = mountIAmiguinho(c, estado, () => { if (vivo) setPronto(true); }, () => { if (vivo) falha.current(); });
    }).catch(() => { if (vivo) falha.current(); });
    return () => { vivo = false; off?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fechar = () => {
    if (saindo) return;
    if (quieto || !pronto) { onFechar(); return; }
    sai.current = agora.current; setSaindo(true);
    window.setTimeout(onFechar, 560);
  };
  const fecharRef = useRef(fechar); fecharRef.current = fechar;
  // Fecha sozinho (12 s depois de pronto; para de contar com o mouse em cima) e com Esc.
  const pausa = useRef(false);
  useEffect(() => {
    if (!pronto) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharRef.current(); };
    window.addEventListener('keydown', onKey);
    let resta = 13500, t0 = Date.now();
    const tick = window.setInterval(() => { if (pausa.current) { t0 = Date.now(); return; } resta -= Date.now() - t0; t0 = Date.now(); if (resta <= 0) fecharRef.current(); }, 500);
    return () => { window.removeEventListener('keydown', onKey); window.clearInterval(tick); };
  }, [pronto]);
  const pausar = (p: boolean) => { pausa.current = p; onPausa?.(p); };
  const cutucar = () => {
    if (toque.current?.tonto) return;
    const n = Date.now();
    toques.current = [...toques.current.filter((x) => n - x < 4000), n];
    const tonto = toques.current.length >= 5;
    if (tonto) toques.current = [];
    toque.current = { em: agora.current, tonto };
    pausa.current = true; window.setTimeout(() => { pausa.current = false; }, 4000);
    onCutucar?.(tonto);
  };

  // A fala aparece letra por letra, depois que o balão abre (na hora, se ele já está aberto ou com "reduzir movimento").
  const [letras, setLetras] = useState(quieto ? fala.length : 0);
  const primeira = useRef(true);
  useEffect(() => {
    if (quieto) { setLetras(fala.length); return; }
    if (!pronto) return;
    setLetras(0);
    const espera = primeira.current ? (modo === 'andar' ? 2000 : modo === 'borda' ? 1150 : 1450) : 0;
    primeira.current = false;
    let n = 0, iv: number | undefined;
    const t = window.setTimeout(() => { iv = window.setInterval(() => { n += 2; setLetras(n); if (n >= fala.length) window.clearInterval(iv); }, 34); }, espera);
    return () => { window.clearTimeout(t); window.clearInterval(iv); };
  }, [fala, pronto]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <aside className={`iam3 iam3--${modo}${pronto ? ' is-pronto' : ''}${saindo ? ' is-saindo' : ''}${quieto ? ' is-quieto' : ''}`} role="status" aria-live="polite" aria-label="IAmiguinho"
      onMouseEnter={() => pausar(true)} onMouseLeave={() => pausar(false)} onFocus={() => pausar(true)} onBlur={() => pausar(false)}>
      <div className="iam3__balao iam-tela">
        <span className="iam-tela__nome" aria-hidden="true">IAmiguinho<i>mascote</i></span>
        <p className="iam-tela__txt"><span className="sr-only">IAmiguinho, mascote: {fala}</span><span aria-hidden="true">{fala.slice(0, letras)}<span className="iam-tela__resto">{fala.slice(letras)}</span></span></p>
        <button type="button" className="iam-tela__x" aria-label="Fechar o IAmiguinho" onClick={fechar}>×</button>
        <span className="iam-tela__rabo" aria-hidden="true" />
      </div>
      <div className="iam3__palco">
        <canvas ref={canvas} className="iam3__c" aria-hidden="true" />
        <button type="button" className="iam3__toque" aria-label="Cutucar o IAmiguinho" onClick={cutucar} />
      </div>
    </aside>
  );
}

/**
 * Ele em 3D num lugar fixo da página (telas vazias, perfil, avisos das lives): só o boneco, sem balão.
 * vista escolhe o enquadramento: 'corpo' inteiro ou 'cabeca'. Um toque assusta, cinco deixam tonto.
 */
export function Boneco3D({ anim = 'parado', rosto = 'normal', vista = 'corpo', yaw = 0, className = '', style, alt, onCutucar, onFalha }: {
  anim?: string; rosto?: string; vista?: 'corpo' | 'cabeca' | 'busto'; yaw?: number; className?: string; style?: CSSProperties; alt?: string;
  onCutucar?: (tonto: boolean) => void; onFalha?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [quieto] = useState(semMovimento);
  const agora = useRef(0);
  const toque = useRef<{ em: number; tonto: boolean } | null>(null);
  const toques = useRef<number[]>([]);
  const p = useRef({ anim, rosto, vista, yaw }); p.current = { anim, rosto, vista, yaw };
  const falha = useRef(onFalha); falha.current = onFalha;
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    let off: (() => void) | undefined, vivo = true;
    const estado = (t: number): Estado3D => {
      agora.current = t;
      const q = p.current;
      const e: Estado3D = { anim: q.anim, rosto: q.rosto, yaw: q.yaw, parado: quieto, t0: quieto ? 0 : undefined,
        vista: q.vista === 'cabeca' ? [0.44, 1.02] : q.vista === 'busto' ? [0.37, 1.06] : q.anim === 'comemorar' ? [-0.03, 1.1] : [-0.03, 1.03] };
      const tq = toque.current;
      if (tq) { const d = t - tq.em; if (d > (tq.tonto ? 2.8 : 1.3)) toque.current = null; else { e.rosto = tq.tonto ? 'tonto' : 'surpreso'; if (tq.tonto) { e.anim = 'tonto'; e.t0 = tq.em; } e.helice = tq.tonto ? 0.2 : Math.min(1, d); } }
      return e;
    };
    void import('../lib/iamiguinho3d').then(({ mountIAmiguinho }) => {
      if (!vivo) return;
      off = mountIAmiguinho(c, estado, () => { if (vivo) setPronto(true); }, () => { if (vivo) falha.current?.(); });
    }).catch(() => { if (vivo) falha.current?.(); });
    return () => { vivo = false; off?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const cutucar = () => {
    if (toque.current?.tonto) return;
    const n = Date.now();
    toques.current = [...toques.current.filter((x) => n - x < 4000), n];
    const tonto = toques.current.length >= 5;
    if (tonto) toques.current = [];
    toque.current = { em: agora.current, tonto };
    onCutucar?.(tonto);
  };
  const cls = `iam-b3${pronto ? ' is-pronto' : ''} ${className}`;
  const c = <canvas ref={canvas} className="iam-b3__c" aria-hidden="true" />;
  if (!onCutucar) return <span className={cls} style={style} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>{c}</span>;
  return <button type="button" className={`${cls} iam-b3--btn`} style={style} onClick={cutucar} aria-label={alt ? `${alt}. Toque para cutucar o IAmiguinho` : 'Cutucar o IAmiguinho'}>{c}</button>;
}
