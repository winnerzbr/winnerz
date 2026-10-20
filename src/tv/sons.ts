/** Sons do Modo TV, sintetizados na hora (nenhum arquivo): navegar, confirmar, voltar e trocar de seção. */
import { tvPrefs } from './mode';

let ctx: AudioContext | null = null;
const ac = () => { try { ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); if (ctx.state === 'suspended') void ctx.resume(); return ctx; } catch { return null; } };

function tom(freq: number, dur: number, tipo: OscillatorType, vol: number, quando = 0, ate?: number) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + quando;
  const o = c.createOscillator(), g = c.createGain();
  o.type = tipo; o.frequency.setValueAtTime(freq, t);
  if (ate) o.frequency.exponentialRampToValueAtTime(ate, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
}
/** Um sopro curto (ruído filtrado), para a troca de seção. */
function sopro(dur: number, de: number, para: number, vol: number) {
  const c = ac(); if (!c) return;
  const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = buf; f.type = 'bandpass'; f.Q.value = 1.4;
  const t = c.currentTime;
  f.frequency.setValueAtTime(de, t); f.frequency.exponentialRampToValueAtTime(para, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(c.destination); src.start(t);
}

const SONS = {
  mover: () => tom(1320, 0.045, 'triangle', 0.035),
  ok: () => { tom(880, 0.07, 'triangle', 0.06); tom(1320, 0.11, 'triangle', 0.05, 0.05); },
  voltar: () => { tom(700, 0.06, 'triangle', 0.05); tom(470, 0.1, 'triangle', 0.045, 0.045); },
  secao: () => { sopro(0.18, 900, 2600, 0.05); tom(990, 0.06, 'sine', 0.03, 0.04); },
  limite: () => tom(160, 0.07, 'square', 0.025),
};
export type Som = keyof typeof SONS;
export function som(n: Som) { if (!tvPrefs().sons) return; try { SONS[n](); } catch { /* sem áudio */ } }
