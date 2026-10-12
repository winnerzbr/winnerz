import type { SVGProps, ReactElement } from 'react';

/** Ícones de traço, em uma cor (seguem a cor do texto). */
const paths: Record<string, ReactElement> = {
  colecao: <path d="M5 4v15M9 4v15M13 6l4 13M3 20h18" />,
  jogos: <><path d="M6 9.5h4M8 7.5v4M15.5 9.5h.01M17.5 11.5h.01" /><path d="M7 5.5h10a4 4 0 0 1 4 3.6l.8 5.9a2.6 2.6 0 0 1-4.6 2l-1.9-2.2H8.7L6.8 17a2.6 2.6 0 0 1-4.6-2L3 9.1a4 4 0 0 1 4-3.6z" /></>,
  jornada: <path d="M12 2.5l2.4 7.1 7.1 2.4-7.1 2.4-2.4 7.1-2.4-7.1L2.5 12l7.1-2.4z" strokeLinejoin="round" />,
  comunidade: <><path d="M3.5 4.5h11v8H8l-4.5 3.5z" /><path d="M14.5 8.5h6v8l-3-2.2h-6.5v-1.8" /></>,
  eventos: <path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5l-5.3 2.9 1.2-6-4.5-4.1 6-.7z" strokeLinejoin="round" />,
  busca: <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></>,
  sino: <><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5h4" /></>,
  tema: <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 0 1 0 16z" fill="currentColor" /></>,
  play: <path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none" />,
  camera: <><rect x="3" y="6" width="18" height="14" rx="3" /><circle cx="12" cy="13" r="3.5" /><path d="M9 6l1.5-2h3L15 6" /></>,
  pin: <><path d="M12 21s7-7.6 7-12.6a7 7 0 0 0-14 0C5 13.4 12 21 12 21z" /><circle cx="12" cy="8.6" r="2.4" /></>,
  caneta: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>,
  coracao: <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  mais: <path d="M12 5v14M5 12h14" />,
  voltar: <path d="M15 5l-7 7 7 7" />,
  avancar: <path d="M9 5l7 7-7 7" />,
  telaCheia: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  sairTela: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  escudo: <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />,
  cadeado: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
};

export function Icon({ name, size = 18, ...rest }: { name: keyof typeof paths | string; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden="true" {...rest}>
      {paths[name] ?? null}
    </svg>
  );
}

/** Estrela da bússola (marco / Zerou). */
export function Compass({ size = 24, color = 'currentColor', ...rest }: { size?: number; color?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...rest}>
      <path d="M12 1.5l2.6 7.9 7.9 2.6-7.9 2.6-2.6 7.9-2.6-7.9L1.5 12l7.9-2.6z" fill={color} />
    </svg>
  );
}
