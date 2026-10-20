/**
 * Os sons dos alertas da live, feitos na hora no Web Audio (sem arquivo). Cada tipo tem um som bem diferente dos
 * outros (timbre, ritmo e desenho), para quem está jogando saber o que chegou sem olhar a tela:
 *   seguidor   campainha de porta: "din-don" (dois sinos, o segundo mais grave)
 *   inscrição  moeda de videogame: "plin-plin!" (dois bipes quadrados que pulam para cima)
 *   renovação  duas moedas seguidas e um brilho no fim
 *   presente   chuva de brilhos: escala rápida subindo, como mágica
 *   bits       laser: três "piu" descendo
 *   raid       tambor rufando e uma fanfarra de metais (o mais longo e grave)
 *   super chat caixa registradora: clique e "ding"
 *   membro     power-up: um zumbido que sobe de grave para agudo
 */
import type { TipoAlerta } from '../data/liveApi';

type Ctx = BaseAudioContext;
const VOL = 0.9;

function saida(c: Ctx): AudioNode {
  const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3;
  const g = c.createGain(); g.gain.value = VOL;
  comp.connect(g).connect(c.destination);
  return comp;
}
/** Uma nota com envelope (ataque curto, queda exponencial). */
function nota(c: Ctx, out: AudioNode, t: number, f: number, dur: number, tipo: OscillatorType, vol: number, ataque = 0.005) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + ataque); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
  return o;
}
/** Sino: a fundamental mais dois parciais inarmônicos, que dão o brilho de metal. */
function sino(c: Ctx, out: AudioNode, t: number, f: number, dur: number, vol: number) {
  nota(c, out, t, f, dur, 'sine', vol);
  nota(c, out, t, f * 2.76, dur * 0.5, 'sine', vol * 0.35);
  nota(c, out, t, f * 5.4, dur * 0.25, 'sine', vol * 0.15);
}
/** Ruído branco filtrado (tambor, clique). */
function ruido(c: Ctx, out: AudioNode, t: number, dur: number, vol: number, filtro: BiquadFilterType, hz: number) {
  const n = Math.max(1, Math.floor(c.sampleRate * dur));
  const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(); s.buffer = b;
  const f = c.createBiquadFilter(); f.type = filtro; f.frequency.value = hz;
  const g = c.createGain(); g.gain.value = vol;
  s.connect(f).connect(g).connect(out); s.start(t);
}

/** Toca o som do tipo de alerta. */
export function somDoAlerta(c: Ctx, tipo: TipoAlerta) {
  const out = saida(c);
  const t = c.currentTime + 0.02;
  switch (tipo) {
    case 'follow': // campainha: din-don
      sino(c, out, t, 1318.5, 0.9, 0.32);
      sino(c, out, t + 0.32, 1046.5, 1.2, 0.32);
      break;
    case 'sub': // moeda: plin-plin!
      nota(c, out, t, 987.8, 0.09, 'square', 0.42);
      nota(c, out, t + 0.08, 1318.5, 0.45, 'square', 0.42);
      break;
    case 'resub': // duas moedas e um brilho
      nota(c, out, t, 987.8, 0.08, 'square', 0.4); nota(c, out, t + 0.07, 1318.5, 0.22, 'square', 0.4);
      nota(c, out, t + 0.24, 987.8, 0.08, 'square', 0.4); nota(c, out, t + 0.31, 1318.5, 0.3, 'square', 0.4);
      sino(c, out, t + 0.5, 2637, 0.6, 0.3);
      break;
    case 'gift': { // chuva de brilhos: escala rápida subindo
      const escala = [1046.5, 1174.7, 1318.5, 1568, 1760, 2093, 2349.3, 2637, 3136];
      escala.forEach((f, i) => sino(c, out, t + i * 0.055, f, 0.5, 0.22));
      break;
    }
    case 'cheer': // laser: três "piu" descendo
      [0, 0.16, 0.32].forEach((d, i) => {
        const o = nota(c, out, t + d, 1800 - i * 200, 0.16, 'sawtooth', 0.4, 0.002);
        o.frequency.exponentialRampToValueAtTime(220, t + d + 0.15);
      });
      break;
    case 'raid': { // tambor rufando e fanfarra de metais
      for (let i = 0; i < 10; i++) ruido(c, out, t + i * 0.045, 0.06, 0.35 + i * 0.03, 'bandpass', 1800);
      ruido(c, out, t + 0.48, 0.25, 0.6, 'lowpass', 400);
      const metal = (f: number, a: number, dur: number) => {
        const o = nota(c, out, t + a, f, dur, 'sawtooth', 0.07, 0.03);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; o.disconnect(); const g = c.createGain();
        g.gain.setValueAtTime(0, t + a); g.gain.linearRampToValueAtTime(0.2, t + a + 0.03); g.gain.setValueAtTime(0.2, t + a + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0008, t + a + dur);
        o.connect(lp).connect(g).connect(out);
      };
      [[392, 0.5, 0.18], [392, 0.68, 0.18], [523.3, 0.86, 0.9], [659.3, 0.86, 0.9], [784, 0.86, 0.9]].forEach(([f, a, d]) => metal(f, a, d));
      break;
    }
    case 'superchat': // caixa registradora
      ruido(c, out, t, 0.05, 0.5, 'highpass', 3000);
      ruido(c, out, t + 0.07, 0.05, 0.4, 'highpass', 2500);
      sino(c, out, t + 0.16, 2093, 1.0, 0.3);
      break;
    case 'member': { // power-up: zumbido subindo
      const o = nota(c, out, t, 180, 0.7, 'square', 0.3, 0.02);
      o.frequency.exponentialRampToValueAtTime(1400, t + 0.6);
      sino(c, out, t + 0.6, 1760, 0.6, 0.18);
      break;
    }
  }
}

/** Quanto dura cada som, em segundos (para os testes). */
export const DURACAO_SOM: Record<TipoAlerta, number> = { follow: 1.6, sub: 0.6, resub: 1.2, gift: 1.0, cheer: 0.6, raid: 1.8, superchat: 1.3, member: 1.3 };

/**
 * Os sons dos widgets (etapa 3a):
 *   morte     game over curtinho: três notas quadradas descendo, a última arrastada
 *   ganhador  sorteio: rufar rápido e um acorde de vitória subindo
 *   meta      meta batida: arpejo de sinos subindo
 */
export type SomWidget = 'morte' | 'ganhador' | 'meta';
export function somDoWidget(c: Ctx, tipo: SomWidget) {
  const out = saida(c);
  const t = c.currentTime + 0.02;
  if (tipo === 'morte') {
    nota(c, out, t, 392, 0.14, 'square', 0.3);
    nota(c, out, t + 0.15, 311.1, 0.14, 'square', 0.3);
    const o = nota(c, out, t + 0.3, 246.9, 0.6, 'square', 0.3);
    o.frequency.exponentialRampToValueAtTime(110, t + 0.9);
  } else if (tipo === 'ganhador') {
    for (let i = 0; i < 10; i++) ruido(c, out, t + i * 0.06, 0.06, 0.5, 'bandpass', 900);
    [523.3, 659.3, 784, 1046.5].forEach((f, i) => nota(c, out, t + 0.62 + i * 0.09, f, 0.9 - i * 0.1, 'sawtooth', 0.12));
    sino(c, out, t + 0.95, 1568, 1.1, 0.22);
  } else {
    [784, 987.8, 1174.7, 1568].forEach((f, i) => sino(c, out, t + i * 0.11, f, 0.8, 0.2));
  }
}
