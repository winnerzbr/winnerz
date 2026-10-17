import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { starFill, scoreHue } from '../lib/rating';

/** Fresta: cada "estrela" é um traço na inclinação do Z (22°). O preenchimento parcial continua igual. */
const STAR = 'M12.5 2h6.5L11.5 22H5z';

function Star({ fill, size, delay }: { fill: number; size: number; delay?: number }) {
  return (
    <span className="star" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" className="star__off"><path d={STAR} /></svg>
      {/* Sempre presente (mesmo vazia) para o preenchimento poder animar. */}
      <span className="star__on" style={{ width: `${fill * 100}%`, transitionDelay: delay ? `${delay}ms` : undefined }}>
        <svg viewBox="0 0 24 24" style={{ width: size, height: size }}><path d={STAR} /></svg>
      </span>
    </span>
  );
}

/** Cinco estrelas com preenchimento proporcional: 4,25 aparece como 4,25. */
export function Stars({ normalized, size = 18 }: { normalized: number; size?: number }) {
  const value = starFill(normalized) / 20; // 0..5
  return (
    <span className="stars" aria-hidden="true" style={{ gap: Math.round(size * 0.18) }}>
      {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={size} fill={Math.max(0, Math.min(1, value - i))} />)}
    </span>
  );
}

const fmt = (v: number) => String(v).replace('.', ',');

/**
 * Nota em estrelas para escrever: arraste ou passe o mouse e clique; no celular, deslize o dedo.
 * Meia estrela em meia estrela. Teclado: setas, Home e End.
 */
export function StarInput({ value, onChange, size = 40, labelledBy }: { value: number; onChange: (v: number) => void; size?: number; labelledBy?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pop, setPop] = useState(0);
  const shown = hover ?? value;
  // Subindo, as estrelas enchem da esquerda para a direita; descendo, esvaziam da direita para a esquerda.
  const prev = useRef(value);
  const [dir, setDir] = useState<1 | -1>(1);
  useEffect(() => { if (value !== prev.current) { setDir(value > prev.current ? 1 : -1); prev.current = value; } }, [value]);
  const live = dragging || hover !== null; // seguindo o dedo/mouse: sem atraso

  const fromX = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, clientX - r.left));
    if (x < size * 0.12) return 0; // bem na borda esquerda: zero
    return Math.min(5, Math.max(0.5, Math.ceil((x / r.width) * 10) / 2));
  };
  const commit = (v: number) => { if (v !== value) { onChange(v); setPop((n) => n + 1); } };

  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const v = fromX(e.clientX);
    setHover(v);
    commit(v);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const v = fromX(e.clientX);
    setHover(v);
    if (dragging) commit(v);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => { setDragging(false); if (e.pointerType !== 'mouse') setHover(null); };
  // Com o ponteiro capturado durante o arraste, o "sair" só chega quando o dedo/botão solta.
  const leave = () => { setHover(null); };
  const key = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: value + 0.5, ArrowUp: value + 0.5, ArrowLeft: value - 0.5, ArrowDown: value - 0.5, Home: 0, End: 5 };
    if (e.key in map) { e.preventDefault(); setHover(null); commit(Math.max(0, Math.min(5, map[e.key]))); }
  };

  return (
    <div
      ref={box}
      className={`star-input${dragging ? ' is-dragging' : ''}${hover !== null ? ' is-preview' : ''}${live ? ' is-live' : ''}${value === 5 && !live ? ' is-max' : ''}`}
      role="slider" tabIndex={0}
      aria-labelledby={labelledBy}
      aria-valuemin={0} aria-valuemax={5} aria-valuenow={value} aria-valuetext={`${fmt(value)} ${value === 1 ? 'estrela' : 'estrelas'}`}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={leave} onKeyDown={key}
      style={{ gap: Math.round(size * 0.14), ['--score-h' as string]: scoreHue(shown / 5), ['--k' as string]: shown / 5 } as CSSProperties}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, shown - i));
        return (
          // A estrela onde a nota parou "pula" quando a nota muda (a chave nova reinicia a animação).
          <span key={Math.ceil(value) === i + 1 ? `${i}-${pop}` : i} className={`star-input__cell${pop > 0 && Math.ceil(value) === i + 1 ? ' is-pop' : ''}`} style={{ ['--i' as string]: i } as CSSProperties}>
            <Star size={size} fill={fill} delay={live ? 0 : (dir > 0 ? i : 4 - i) * 55} />
            {pop > 0 && !dragging && Math.ceil(value) === i + 1 && <StarPulse seed={pop} size={size} k={value / 5} big={value === 5} />}
          </span>
        );
      })}
    </div>
  );
}

/** Pulso no formato da estrela onde a nota parou: quanto maior a nota, maior, mais forte e mais brilhante. */
function StarPulse({ seed, size, k, big }: { seed: number; size: number; k: number; big?: boolean }) {
  return (
    <span key={seed} className="star-pulse" style={{ ['--k' as string]: k, width: size, height: size } as CSSProperties} aria-hidden="true">
      {(big ? [0, 1] : [0]).map((n) => (
        <svg key={n} viewBox="0 0 24 24" style={{ ['--n' as string]: n } as CSSProperties}><path d={STAR} /></svg>
      ))}
    </span>
  );
}
