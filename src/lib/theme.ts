import type { Prefs } from '../data/types';

const hx = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);

/** Mistura duas cores hex pelo fator t (0..1). */
export function mix(a: string, b: string, t: number) {
  return '#' + [0, 1, 2].map((i) => Math.round(hx(a, i) + (hx(b, i) - hx(a, i)) * t).toString(16).padStart(2, '0')).join('');
}

/** Tokens do tema escuro conforme a intensidade do preto (0 = grafite, 100 = preto absoluto). Em 70%: a Noite #07080A. */
export function darkTokens(black: number): Record<string, string> {
  const t = Math.max(0, Math.min(100, black)) / 100;
  const bg = mix('#1b1e22', '#000000', t);
  return {
    '--bg': bg,
    '--bg-rgb': [0, 1, 2].map((i) => hx(bg, i)).join(', '),
    '--surface': mix('#24282d', '#050608', t),
    '--surface-2': mix('#2d3237', '#0b0d10', t),
    '--line': mix('#33383e', '#111316', t),
    '--line-2': mix('#454b52', '#222529', t),
    '--field': mix('#202328', '#050608', t),
  };
}

const DARK_KEYS = Object.keys(darkTokens(70));

/** Tokens do tema claro conforme a intensidade do branco (0 = cinza suave, menos brilho; 100 = branco puro). Em 70%: o claro de sempre. */
export const WHITE_DEFAULT = 70;
export function lightTokens(white: number): Record<string, string> {
  const t = Math.max(0, Math.min(100, white)) / 100;
  const bg = mix('#d4d7db', '#ffffff', t);
  return {
    '--bg': bg,
    '--bg-rgb': [0, 1, 2].map((i) => hx(bg, i)).join(', '),
    '--surface': mix('#e8eaed', '#ffffff', Math.min(1, t * 1.4)),
    '--surface-2': mix('#c6cace', '#eceef1', t),
    '--line': mix('#bfc4c9', '#e2e5e9', t),
    '--line-2': mix('#a7adb4', '#cbd0d6', t),
    '--field': mix('#eceef0', '#ffffff', Math.min(1, t * 1.4)),
  };
}
const LIGHT_KEYS = Object.keys(lightTokens(70));

export function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  root.dataset.theme = p.theme;
  root.dataset.motion = p.motion;
  root.dataset.light = p.light ? '1' : '0';
  if (p.theme === 'escuro') {
    const tk = darkTokens(p.black);
    for (const k of DARK_KEYS) root.style.setProperty(k, tk[k]);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tk['--bg']);
  } else {
    const tk = lightTokens(p.white ?? WHITE_DEFAULT);
    for (const k of LIGHT_KEYS) root.style.setProperty(k, tk[k]);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tk['--bg']);
  }
}

/** Arquivos da marca (Forjado) para quem precisa de imagem: cartão para compartilhar, overlay. */
export const brand = (theme: Prefs['theme']) => ({
  mark: theme === 'claro' ? '/brand/forjado-dark.svg' : '/brand/forjado-flat.svg',
  forged: '/brand/forjado.svg',
});
