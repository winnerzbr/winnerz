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
  filtro: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  voltar: <path d="M15 5l-7 7 7 7" />,
  avancar: <path d="M9 5l7 7-7 7" />,
  telaCheia: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  sairTela: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  escudo: <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />,
  cadeado: <><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  mensagem: <><path d="M4 5.5h16v10H9l-5 4z" strokeLinejoin="round" /><path d="M8 9.5h8M8 12.5h5" /></>,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  desejo: <path d="M7 3.5h10a1 1 0 0 1 1 1V21l-6-4-6 4V4.5a1 1 0 0 1 1-1z" strokeLinejoin="round" />,
  estante: <><path d="M4 4v16M20 4v16M4 12h16M4 20h16" /><path d="M7 12V7M10 12V8M15 20v-5M17 20v-6" /></>,
  radar: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12l5.5-5.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></>,
  lampada: <><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" strokeLinejoin="round" /></>,
  pessoas: <><circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><path d="M2 20c.8-3.2 3.2-5 6-5s5.2 1.8 6 5M14 15.2c.6-.1 1.3-.2 2-.2 2.8 0 5.2 1.8 6 5" /></>,
  riso: <><circle cx="12" cy="12" r="9" /><path d="M8.5 13.5c.9 1.6 2 2.5 3.5 2.5s2.6-.9 3.5-2.5M9 9.5h.01M15 9.5h.01" /></>,
  brilho: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z" strokeLinejoin="round" />,
  citar: <path d="M5 17.5c2.5-1 3.5-3 3.5-5.5H5V6.5h5.5V12c0 3.5-2 6.3-5.5 7.5M13.5 17.5c2.5-1 3.5-3 3.5-5.5h-3.5V6.5H19V12c0 3.5-2 6.3-5.5 7.5" strokeLinejoin="round" />,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  subir: <path d="M12 19V6M6 11l6-6 6 6" />,
  reagir: <><circle cx="11" cy="12" r="8" /><path d="M7.8 13.5c.8 1.3 1.8 2 3.2 2s2.4-.7 3.2-2M8.5 9.8h.01M13.5 9.8h.01M19 3v5M16.5 5.5h5" /></>,
  olho: <><path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  grade: <path d="M4 4.5h7v7H4zM13 4.5h7v7h-7zM4 13.5h7v7H4zM13 13.5h7v7h-7z" strokeLinejoin="round" />,
  enquete: <path d="M5 20V12M10 20V6M15 20v-9M20 20V9M3 20h18" />,
  caixa: <><path d="M3.5 8 12 4l8.5 4v9L12 21l-8.5-4z" strokeLinejoin="round" /><path d="M3.5 8 12 12l8.5-4M12 12v9" /></>,
  imagem: <><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M20.5 16l-5-5-8 8" /></>,
  pergunta: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.3c-.7.3-1.1 1-1.1 1.7v.5M12 17h.01" /></>,
  maisAcoes: <><circle cx="5.5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="18.5" cy="12" r="1.4" fill="currentColor" /></>,
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
