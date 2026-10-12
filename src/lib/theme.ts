import type { Prefs } from '../data/types';

const hx = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16);

/** Mistura duas cores hex pelo fator t (0..1). */
export function mix(a: string, b: string, t: number) {
  return '#' + [0, 1, 2].map((i) => Math.round(hx(a, i) + (hx(b, i) - hx(a, i)) * t).toString(16).padStart(2, '0')).join('');
}

/** Tokens do tema escuro conforme a intensidade do preto (0 = grafite, 100 = preto absoluto). */
export function darkTokens(black: number): Record<string, string> {
  const t = Math.max(0, Math.min(100, black)) / 100;
  const bg = mix('#2a2622', '#000000', t);
  return {
    '--bg': bg,
    '--bg-rgb': [0, 1, 2].map((i) => hx(bg, i)).join(', '),
    '--surface': mix('#34302b', '#0f0e0d', t),
    '--surface-2': mix('#3e3934', '#171513', t),
    '--line': mix('#46413b', '#1a1816', t),
    '--line-2': mix('#5a544c', '#302c27', t),
    '--field': mix('#2e2a26', '#0a0908', t),
  };
}

const DARK_KEYS = Object.keys(darkTokens(70));

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
    for (const k of DARK_KEYS) root.style.removeProperty(k);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f3eee5');
  }
}

export const brand = (theme: Prefs['theme']) => ({
  mark: theme === 'claro' ? '/brand/logo-mark-dark.webp' : '/brand/logo-mark.webp',
  full: theme === 'claro' ? '/brand/logo-dark.webp' : '/brand/logo.webp',
});
