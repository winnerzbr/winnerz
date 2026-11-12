import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Star, StarPulse, pickBar } from './Stars';
import { scoreHue } from '../lib/rating';

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1)).replace('.', ',');

/** Número da nota: conta até o valor novo, muda de cor junto e dá um pulinho. */
export function AnimatedScore({ value, max }: { value: number; max: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const [pop, setPop] = useState(0);
  useEffect(() => {
    const start = from.current, end = value, t0 = performance.now(), dur = 380;
    if (start === end) return;
    setPop((n) => n + 1);
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      const v = start + (end - start) * e;
      setShown(Math.round(v * 2) / 2);
      if (k < 1) raf = requestAnimationFrame(tick); else from.current = end;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); from.current = end; };
  }, [value]);
  return (
    <span className="t score-num" style={{ ['--score-h' as string]: scoreHue(value / max), ['--k' as string]: shown / max } as CSSProperties}>
      <span key={pop} className={pop ? 'score-num__v is-pop' : 'score-num__v'}>{fmt(shown)}</span><span className="muted">/{max}</span>
    </span>
  );
}

/** Explosão de pontinhos na cor da nota, no ponto onde ela mudou. */
export function Burst({ seed, left, big, k = 0.5 }: { seed: number; left: string; big?: boolean; k?: number }) {
  if (!seed) return null;
  return (
    <span key={seed} className={`burst${big ? ' burst--big' : ''}`} style={{ left, ['--k' as string]: k } as CSSProperties} aria-hidden="true">
      {Array.from({ length: big ? 14 : 8 }, (_, i) => <i key={i} style={{ ['--a' as string]: `${(360 / (big ? 14 : 8)) * i}deg`, ['--d' as string]: `${(i % 3) * 30}ms` } as CSSProperties} />)}
    </span>
  );
}

/**
 * Nota de 0 a 10, de meio em meio ponto: dez traços, com a mesma lógica e as mesmas animações da nota em estrelas
 * (preenche ao passar o mouse, o traço onde a nota parou pulsa, no 10 todos fazem a onda).
 * Para o teclado e o leitor de tela continua um campo de faixa normal (setas, Home, End).
 */
/** Espaço entre as barras da nota, nas escalas até 10 e até 5 (12/11/2026). */
export const GAP_NOTA = 14;

export function ScoreSlider({ value, onChange, id, onPreview }: { value: number; onChange: (v: number) => void; id?: string; onPreview?: (v: number | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pop, setPop] = useState(0);
  // O pulso sai a cada nota aplicada (toque, clique, teclado); arrastando, uma vez ao soltar.
  const [pulse, setPulse] = useState(0);
  const moved = useRef(false);
  const [w, setW] = useState(0);
  const shown = hover ?? value;
  // Avisa quem usa qual nota o mouse/dedo está mostrando (para o número ao lado acompanhar).
  useEffect(() => { onPreview?.(hover); }, [hover]); // eslint-disable-line react-hooks/exhaustive-deps
  const prev = useRef(value);
  const [dir, setDir] = useState<1 | -1>(1);
  useEffect(() => { if (value !== prev.current) { setDir(value > prev.current ? 1 : -1); prev.current = value; } }, [value]);
  useEffect(() => {
    // Mede o espaço disponível na linha da nota (as barras e o texto/número ao lado têm só a largura que precisam).
    const host = box.current?.closest<HTMLElement>('.editor__ten');
    const el = host ?? box.current?.parentElement; if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width - (host ? 170 : 0))); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const live = dragging || hover !== null;
  // Barras com o mesmo espaço entre elas nas duas escalas (GAP_NOTA, igual ao CSS .score-row e .editor__stars).
  const size = Math.max(18, Math.min(36, Math.floor(((w || 420) - 9 * GAP_NOTA) / 4.2)));

  const fromX = (clientX: number, clientY: number) => {
    const b = pickBar(box.current!, clientX, clientY, 10);
    if (b !== null) return b;
    const r = box.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, clientX - r.left));
    if (x < r.width * 0.025) return 0; // bem na borda esquerda: zero
    return Math.min(10, Math.max(0.5, Math.ceil((x / r.width) * 20) / 2));
  };
  const commit = (v: number, src: 'tap' | 'move' = 'tap') => {
    if (v !== value) { onChange(v); setPop((n) => n + 1); if (src === 'move') moved.current = true; else setPulse((n) => n + 1); }
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    input.current?.focus({ preventScroll: true });
    setDragging(true);
    moved.current = false;
    const v = fromX(e.clientX, e.clientY); setHover(v); commit(v);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => { const v = fromX(e.clientX, e.clientY); setHover(v); if (dragging) commit(v, 'move'); };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging && moved.current) setPulse((n) => n + 1);
    moved.current = false;
    setDragging(false);
    if (e.pointerType !== 'mouse') setHover(null);
  };
  const leave = () => { setHover(null); };

  return (
    <div className="score-slider">
      <input
        ref={input} id={id} className="score-slider__input" type="range" min={0} max={10} step={0.5} value={value}
        aria-valuetext={`${fmt(value)} de 10`}
        onChange={(e) => { const v = Number(e.target.value); if (v !== value) { onChange(v); setPop((n) => n + 1); setPulse((n) => n + 1); } }}
      />
      <div
        ref={box} aria-hidden="true"
        className={`star-input score-row${dragging ? ' is-dragging' : ''}${hover !== null ? ' is-preview' : ''}${live ? ' is-live' : ''}${value === 10 && !live ? ' is-max' : ''}`}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={leave}
        style={{ ['--score-h' as string]: scoreHue(shown / 10), ['--k' as string]: shown / 10 } as CSSProperties}
      >
        {Array.from({ length: 10 }, (_, i) => {
          const fill = Math.max(0, Math.min(1, shown - i));
          const at = Math.ceil(value) === i + 1;
          return (
            // O traço onde a nota parou "pula" quando a nota muda (a chave nova reinicia a animação).
            <span key={at ? `${i}-${pop}` : i} className={`star-input__cell score-row__cell${pop > 0 && at ? ' is-pop' : ''}`} style={{ ['--i' as string]: i } as CSSProperties}>
              <Star size={size} fill={fill} delay={live ? 0 : (dir > 0 ? i : 9 - i) * 35} />
              {pulse > 0 && at && <StarPulse seed={pulse} size={size} k={value / 10} big={value === 10} />}
              {i === 9 && value === 10 && !live && pulse > 0 && <Burst seed={pulse} left="50%" big k={1} />}
            </span>
          );
        })}
      </div>
    </div>
  );
}
