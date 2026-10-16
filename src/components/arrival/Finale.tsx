/**
 * O final da Chegada: o letreiro WinnerZ vira o logo (o W e o Z se transformam, se afastam e se conectam), a linha do
 * horizonte acende e a frase aparece. 10 segundos, sem som. Com animações reduzidas, o logo já aparece formado.
 */
import { useEffect, useRef, useState } from 'react';
import { FINALE_SVG } from './finaleSvg';

const DUR = 10100;

export function Finale({ onDone, still }: { onDone: () => void; still: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(0);
  useEffect(() => {
    const svg = host.current?.querySelector('svg') as SVGSVGElement | null;
    if (svg) {
      try {
        if (still) { svg.setCurrentTime(DUR / 1000 * 0.8); svg.pauseAnimations(); }
        else { svg.setCurrentTime(0); svg.unpauseAnimations(); }
      } catch { /* sem SMIL */ }
    }
    if (still) return;
    const t = setTimeout(onDone, DUR + 2600);
    return () => clearTimeout(t);
  }, [run, still]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`ar-fin${still ? ' is-still' : ''}`} key={run} role="dialog" aria-label="Sua história no WinnerZ começa agora">
      <div className="ar-stage2">
        <div className="ar-glow" /><div className="ar-line" />
        <div ref={host} className="ar-msvgwrap" dangerouslySetInnerHTML={{ __html: FINALE_SVG }} />
        <div className="ar-dust" /><div className="ar-ring" /><div className="ar-flash" />
        <div className="ar-msg"><span className="ar-m1">Sua história</span><span className="ar-m2">no WinnerZ</span><span className="ar-m3">começa agora</span></div>
      </div>
      {!still && <div className="ar-out" />}
      <div className="ar-end">
        {still ? <button className="ar-zb ar-zbA" autoFocus onClick={onDone}>Ir para o Início</button> : <p>Abrindo o seu Início…</p>}
        {!still && <button className="ar-zb ar-zb2" onClick={() => setRun((r) => r + 1)}>Ver de novo</button>}
      </div>
    </div>
  );
}
