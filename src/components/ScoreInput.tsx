import { useEffect, useRef, useState, type CSSProperties } from 'react';
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
 * Nota de 0 a 10, de meio em meio ponto. A barra enche com a cor da nota (vermelho → verde),
 * as marcas acendem uma a uma e, no 10, a barra inteira comemora.
 * Por baixo é um campo de faixa normal: teclado e leitor de tela funcionam como sempre.
 */
export function ScoreSlider({ value, onChange, id }: { value: number; onChange: (v: number) => void; id?: string }) {
  const [drag, setDrag] = useState(false);
  const [burst, setBurst] = useState(0);
  const last = useRef(value);
  const f = value / 10;
  useEffect(() => {
    if (value !== last.current && !drag) setBurst((n) => n + 1);
    last.current = value;
  }, [value, drag]);
  const style = { ['--score-h' as string]: scoreHue(f), ['--f' as string]: `${f * 100}%`, ['--k' as string]: f } as CSSProperties;
  return (
    <div className={`score-slider${drag ? ' is-dragging' : ''}${value === 10 ? ' is-max' : ''}`} style={style}>
      <input
        id={id} className="score-slider__input" type="range" min={0} max={10} step={0.5} value={value}
        aria-valuetext={`${fmt(value)} de 10`}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerDown={() => setDrag(true)}
        onPointerUp={() => { setDrag(false); setBurst((n) => n + 1); }}
        onPointerCancel={() => setDrag(false)}
      />
      <div className="score-slider__track" aria-hidden="true">
        <div className="score-slider__fill" />
        {Array.from({ length: 11 }, (_, i) => (
          <span key={i} className={`score-slider__tick${i <= value ? ' is-on' : ''}`} style={{ left: `${i * 10}%`, ['--i' as string]: i } as CSSProperties} />
        ))}
        <div className="score-slider__thumb" />
        <Burst seed={burst} left={`${f * 100}%`} big={value === 10} k={f} />
      </div>
    </div>
  );
}
