/**
 * Modo TV: liga e desliga a interface de tela grande (por aba do navegador). Ligado, o site troca o menu e o rodapé
 * pelo painel da TV e passa a responder ao controle. "Sair do Modo TV" também segura a abertura automática até a
 * aba fechar, para o controle não puxar a pessoa de volta.
 */
import { useSyncExternalStore } from 'react';

const K = 'wz.tv', NAO = 'wz.tv.nao';
const subs = new Set<() => void>();
const read = (k: string) => { try { return sessionStorage.getItem(k) === '1'; } catch { return false; } };
let on = typeof window !== 'undefined' && read(K);

export function tvOn() { return on; }
export function setTv(v: boolean) {
  on = v;
  try { if (v) { sessionStorage.setItem(K, '1'); sessionStorage.removeItem(NAO); } else { sessionStorage.removeItem(K); sessionStorage.setItem(NAO, '1'); } } catch { /* sem armazenamento */ }
  document.documentElement.classList.toggle('is-tv', v);
  subs.forEach((f) => f());
}
/** A pessoa saiu do Modo TV nesta aba: o controle não abre de novo sozinho. */
export const tvRecusado = () => read(NAO);
export const useTv = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => on, () => false);
if (typeof document !== 'undefined' && on) document.documentElement.classList.add('is-tv');

/* ---- Preferências do Modo TV (neste aparelho) ---------------------------------------------------------------- */
export type Glifos = 'auto' | 'xbox' | 'playstation';
export interface TvPrefs { sons: boolean; glifos: Glifos }
const PK = 'wz.tv.prefs';
const psubs = new Set<() => void>();
let prefs: TvPrefs = (() => { try { return { sons: true, glifos: 'auto', ...JSON.parse(localStorage.getItem(PK) ?? '{}') } as TvPrefs; } catch { return { sons: true, glifos: 'auto' }; } })();
export const tvPrefs = () => prefs;
export function setTvPrefs(p: Partial<TvPrefs>) { prefs = { ...prefs, ...p }; try { localStorage.setItem(PK, JSON.stringify(prefs)); } catch { /* nada */ } psubs.forEach((f) => f()); }
export const useTvPrefs = () => useSyncExternalStore((f) => { psubs.add(f); return () => { psubs.delete(f); }; }, () => prefs, () => prefs);
