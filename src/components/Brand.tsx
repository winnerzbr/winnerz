import { useId } from 'react';

/** Marca WinnerZ (Forjado). Desenhada em SVG para ficar nítida em qualquer tamanho e trocar de cor com o tema. */
export const FORJADO_PATH =
  'M2 0H58L147 222L124 280H114ZM180 0H222L282 148L307 85H366L288 280H273L201 98L167 182L134 115ZM232 0H506L484 54H254ZM386 105H472L454 150H420L389 226H492L470 280H336L326 256ZM70 0H170L148 54H92Z';

/** As peças do W e do Z separadas, para animar uma contra a outra (o "ímã" da vinheta).
    O trapézio em cima do W é a ponta do topo do Z: some quando as letras se afastam e volta quando o Z crava no W. */
const W_PATH = 'M2 0H58L147 222L124 280H114ZM180 0H222L282 148L307 85H366L288 280H273L201 98L167 182L134 115Z';
const TIP_PATH = 'M70 0H170L148 54H92Z';
const Z_PATH = 'M232 0H506L484 54H254ZM386 105H472L454 150H420L389 226H492L470 280H336L326 256Z';

export function BrandMark({ width = 46, className = '', title, split = false, gold = false }: { width?: number; className?: string; title?: string; split?: boolean; gold?: boolean }) {
  const uid = useId().replace(/:/g, '');
  // "gold": dourado de metal (do claro em cima ao fundo embaixo), usado no menu. As cores vêm do CSS (tema claro/escuro).
  const fill = gold ? `url(#bmg${uid})` : 'currentColor';
  return (
    <svg viewBox="0 0 506 280" width={width} height={Math.round((width * 280) / 506)} className={`brand-mark ${className}`.trim()}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {gold && (
        <defs>
          <linearGradient id={`bmg${uid}`} gradientUnits="userSpaceOnUse" x1="120" y1="-20" x2="330" y2="300">
            <stop offset="0" className="bm-g1" /><stop offset=".45" className="bm-g2" /><stop offset="1" className="bm-g3" />
          </linearGradient>
        </defs>
      )}
      {split
        ? <><path className="bm-w" fill={fill} d={W_PATH} /><path className="bm-tip" fill={fill} d={TIP_PATH} /><path className="bm-z" fill={fill} d={Z_PATH} /></>
        : <path fill={fill} d={FORJADO_PATH} />}
    </svg>
  );
}

/** Marca com o nome ao lado, como no cabeçalho. */
export function BrandLockup({ width = 46 }: { width?: number }) {
  return (
    <span className="brand-lockup">
      <BrandMark width={width} />
      <span className="brand-lockup__name">WinnerZ</span>
    </span>
  );
}

/** A forma do logo como máscara de CSS (para o brilho que segue o mouse no menu). */
export const BRAND_MASK = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 506 280'><path d='${FORJADO_PATH}'/></svg>`)}")`;
