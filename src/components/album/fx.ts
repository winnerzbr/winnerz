/**
 * Efeitos do álbum: partículas (confete, poeira, brilho) e sons sintetizados na hora, sem arquivos.
 * Os sons começam desligados e a escolha fica neste aparelho. Com "reduzir movimento", não há partículas.
 */
import { useSyncExternalStore } from 'react';

export const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---- partículas ---- */
type P = { x: number; y: number; vx: number; vy: number; life: number; size: number; c: string; g: number; rot: number };
let cv: HTMLCanvasElement | null = null, ctx: CanvasRenderingContext2D | null = null, parts: P[] = [], running = false;
function ensure() {
  if (cv && document.body.contains(cv)) return;
  cv = document.createElement('canvas'); cv.id = 'alb-fx'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv); ctx = cv.getContext('2d'); size();
  addEventListener('resize', size);
}
function size() { if (!cv || !ctx) return; const d = devicePixelRatio || 1; cv.width = innerWidth * d; cv.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
export const GOLD = ['#fff0cc', '#e2be84', '#ffd27a', '#c99a55', '#ffffff'];
export const HOLO = ['#ff9ad6', '#8fe3ff', '#b5ff9e', '#fff6c8', '#ffd27a', '#ffffff'];
export const AURORA = ['#b6a2ff', '#9fe7ff', '#ffffff', '#5b3fb8'];
export const DUST = ['#e2be84', '#fff0cc', '#8f6630'];
export function burst(x: number, y: number, colors: string[], n = 40, power = 6, gravity = 0.18) {
  if (reduceMotion() || typeof document === 'undefined') return;
  ensure();
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = power * (0.35 + Math.random()); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.3, life: 1, size: 1.5 + Math.random() * 3, c: colors[i % colors.length], g: gravity, rot: Math.random() * 6 }); }
  if (!running) { running = true; requestAnimationFrame(tick); }
}
function tick() {
  if (!ctx) { running = false; return; }
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  parts = parts.filter((p) => p.life > 0);
  for (const p of parts) {
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.985; p.life -= 0.016; p.rot += 0.2;
    ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6); ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (parts.length) requestAnimationFrame(tick); else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
}
export const centerOf = (el: Element) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; };

/* ---- sons ---- */
const SK = 'wz.album.som';
let soundOn = (() => { try { return localStorage.getItem(SK) === '1'; } catch { return false; } })();
const soundSubs = new Set<() => void>();
let AC: AudioContext | null = null;
function ac(): AudioContext | null {
  if (!AC) { try { const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext; AC = new C(); } catch { return null; } }
  if (AC.state === 'suspended') void AC.resume();
  return AC;
}
function noiseSrc(a: AudioContext, dur: number) { const b = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = a.createBufferSource(); s.buffer = b; return s; }
function envG(a: AudioContext, t: number, att: number, peak: number, dec: number) { const g = a.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec); g.connect(a.destination); return g; }
function nz(dur: number, type: BiquadFilterType, f0: number, f1: number, peak: number, att = 0.005, q = 1) { const a = ac(); if (!a) return; const t = a.currentTime; const s = noiseSrc(a, dur + att); const f = a.createBiquadFilter(); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur); s.connect(f); f.connect(envG(a, t, att, peak, dur)); s.start(t); s.stop(t + att + dur + 0.05); }
function tone(freq: number, dur: number, type: OscillatorType = 'sine', peak = 0.12, delay = 0, f1?: number) { const a = ac(); if (!a) return; const t = a.currentTime + delay; const o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur); o.connect(envG(a, t, 0.006, peak, dur)); o.start(t); o.stop(t + dur + 0.05); }
const SFX: Record<string, () => void> = {
  tick() { nz(0.03, 'bandpass', 3200, 2600, 0.06, 0.002, 2); },
  rip() { nz(0.42, 'bandpass', 900, 4200, 0.35, 0.004, 0.7); nz(0.2, 'highpass', 5000, 7000, 0.08, 0.002); },
  flip() { nz(0.32, 'lowpass', 1800, 350, 0.16, 0.06); },
  card() { nz(0.12, 'bandpass', 2200, 1200, 0.08, 0.004, 1.2); },
  thump() { tone(160, 0.18, 'sine', 0.35, 0, 55); nz(0.04, 'highpass', 2500, 3000, 0.06, 0.002); },
  stamp() { tone(120, 0.25, 'sine', 0.5, 0, 45); nz(0.08, 'bandpass', 1400, 700, 0.25, 0.002, 0.8); },
  coin() { tone(1318, 0.18, 'triangle', 0.08); tone(1760, 0.35, 'triangle', 0.08, 0.08); },
  inc() { tone(880, 0.3, 'sine', 0.07); tone(1318, 0.4, 'sine', 0.06, 0.06); },
  rare() { [659, 880, 1175].forEach((f, i) => tone(f, 0.5, 'sine', 0.09, i * 0.08)); },
  drum() { for (let i = 0; i < 14; i++) setTimeout(() => nz(0.05, 'lowpass', 500, 200, 0.05 + i * 0.012, 0.002), i * 95); },
  legend() { [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.9, 'sine', 0.08, i * 0.07)); tone(261, 1.4, 'triangle', 0.08); nz(1.1, 'highpass', 6000, 9000, 0.03, 0.2); },
};
export type Sfx = keyof typeof SFX;
export function sfx(n: string) { if (!soundOn) return; try { SFX[n]?.(); } catch { /* sem áudio */ } }
export function setSound(on: boolean) {
  soundOn = on; try { localStorage.setItem(SK, on ? '1' : '0'); } catch { /* sem armazenamento */ }
  if (on) { ac(); sfx('coin'); }
  soundSubs.forEach((f) => f());
}
export const useSound = () => useSyncExternalStore((f) => { soundSubs.add(f); return () => { soundSubs.delete(f); }; }, () => soundOn, () => false);
export const vibrate = (ms: number) => { try { navigator.vibrate?.(ms); } catch { /* sem vibração */ } };
