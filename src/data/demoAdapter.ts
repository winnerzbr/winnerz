import type { Adapter } from './store';
import type { State } from './types';
import { demoState } from './demo';

const KEY = 'wz.demo.v1';

/** Modo demonstração: tudo fica no navegador, nada sai do aparelho. */
export const demoAdapter: Adapter = {
  async load() {
    let saved: Partial<State> | null = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
    const base = demoState();
    if (!saved) return base;
    return { ...base, ...saved, games: { ...base.games, ...(saved.games ?? {}) }, ready: true, mode: 'demo' };
  },
  async persist(_action, next) {
    try {
      const { ready: _r, mode: _m, ...rest } = next;
      localStorage.setItem(KEY, JSON.stringify(rest));
      localStorage.setItem('wz.prefs', JSON.stringify(next.prefs));
    } catch { /* armazenamento indisponível: segue só na memória */ }
  },
};

export function resetDemo() {
  try { localStorage.removeItem(KEY); } catch { /* nada */ }
  location.reload();
}
