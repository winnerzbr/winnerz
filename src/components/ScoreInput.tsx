import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { Star, StarPulse } from './Stars';
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
export function ScoreSlider({ value, onChange, id }: { value: number; onChange: (v: number) => void; id?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pop, setPop] = useState(0);
  const [w, setW] = useState(0);
  const shown = hover ?? value;
  const prev = useRef(value);
  const [dir, setDir] = useState<1 | -1>(1);
  useEffect(() => { if (value !== prev.current) { setDir(value > prev.current ? 1 : -1); prev.current = value; } }, [value]);
  useEffect(() => {
    const el = box.current; if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width)); ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const live = dragging || hover !== null;
  const size = Math.max(18, Math.min(36, Math.floor((w || 360) / 10)));

  const fromX = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, clientX - r.left));
    if (x < r.width * 0.025) return 0; // bem na borda esquerda: zero
    return Math.min(10, Math.max(0.5, Math.ceil((x / r.width) * 20) / 2));
  };
  const commit = (v: number) => { if (v !== value) { onChange(v); setPop((n) => n + 1); } };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    input.current?.focus({ preventScroll: true });
    setDragging(true);
    const v = fromX(e.clientX); setHover(v); commit(v);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => { const v = fromX(e.clientX); setHover(v); if (dragging) commit(v); };
  const up = (e: PointerEvent<HTMLDivElement>) => { setDragging(false); if (e.pointerType !== 'mouse') setHover(null); };
  const leave = () => { setHover(null); };

  return (
    <div className="score-slider">
      <input
        ref={input} id={id} className="score-slider__input" type="range" min={0} max={10} step={0.5} value={value}
        aria-valuetext={`${fmt(value)} de 10`}
        onChange={(e) => { const v = Number(e.target.value); if (v !== value) { onChange(v); setPop((n) => n + 1); } }}
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
              {pop > 0 && !dragging && at && <StarPulse seed={pop} size={size} k={value / 10} big={value === 10} />}
            </span>
          );
        })}
      </div>
    </div>
  );
}
