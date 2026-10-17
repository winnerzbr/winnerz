/** Marca WinnerZ (Forjado). Desenhada em SVG para ficar nítida em qualquer tamanho e trocar de cor com o tema. */
export const FORJADO_PATH =
  'M2 0H58L147 222L124 280H114ZM180 0H222L282 148L307 85H366L288 280H273L201 98L167 182L134 115ZM232 0H506L484 54H254ZM386 105H472L454 150H420L389 226H492L470 280H336L326 256ZM70 0H170L148 54H92Z';

/** As peças do W e do Z separadas, para animar uma contra a outra (o "ímã" da vinheta).
    O trapézio em cima do W é a ponta do topo do Z: some quando as letras se afastam e volta quando o Z crava no W. */
const W_PATH = 'M2 0H58L147 222L124 280H114ZM180 0H222L282 148L307 85H366L288 280H273L201 98L167 182L134 115Z';
const TIP_PATH = 'M70 0H170L148 54H92Z';
const Z_PATH = 'M232 0H506L484 54H254ZM386 105H472L454 150H420L389 226H492L470 280H336L326 256Z';

export function BrandMark({ width = 46, className = '', title, split = false }: { width?: number; className?: string; title?: string; split?: boolean }) {
  return (
    <svg viewBox="0 0 506 280" width={width} height={Math.round((width * 280) / 506)} className={`brand-mark ${className}`.trim()}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {split
        ? <><path className="bm-w" fill="currentColor" d={W_PATH} /><path className="bm-tip" fill="currentColor" d={TIP_PATH} /><path className="bm-z" fill="currentColor" d={Z_PATH} /></>
        : <path fill="currentColor" d={FORJADO_PATH} />}
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
