/**
 * Trilhas do trailer (J7): músicas geradas na hora com Web Audio (nada de música de terceiros).
 * Cinco estilos sobre a mesma progressão épica em ré menor (Rém–Si♭–Fá–Dó), todos com a mesma forma:
 * a abertura cresce, a "virada" entra quando aparecem os números, o corpo segue em compassos inteiros
 * (o andamento se ajusta ao tamanho do trailer) e o "ZEROU" ganha um impacto com acorde maior de vitória.
 * Tudo é agendado de uma vez, então funciona igual num AudioContext normal ou num OfflineAudioContext.
 */
export type MusicScene = { kind: string; dur: number };
export type TrackId = 'hibrido' | 'dubstep' | 'trap' | 'edm' | 'dnb';
export const TRACKS: { id: TrackId; name: string }[] = [
  { id: 'hibrido', name: 'Híbrido épico' },
  { id: 'dubstep', name: 'Dubstep épico' },
  { id: 'trap', name: 'Trap esportivo' },
  { id: 'edm', name: 'EDM uplifting' },
  { id: 'dnb', name: 'Drum & bass épico' },
];

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
type Chord = { pad: number[]; r: number };
const PROG: Chord[] = [
  { pad: [62, 65, 69], r: 38 }, // Rém
  { pad: [62, 65, 70], r: 34 }, // Si♭
  { pad: [60, 65, 69], r: 41 }, // Fá
  { pad: [60, 64, 67], r: 36 }, // Dó
  { pad: [62, 65, 69], r: 38 },
  { pad: [62, 65, 70], r: 34 },
  { pad: [60, 64, 67], r: 36 },
  { pad: [60, 64, 67], r: 36 },
];
const WIN = { pad: [62, 66, 69, 74], r: 38 }; // Ré maior no fim
type Note = [number, number, number]; // [tempo no compasso, duração em tempos, MIDI]
// Gancho "uplifting" (3+3+2).
const HOOK: Note[][] = [
  [[0, 1.5, 81], [1.5, 1.5, 77], [3, 1, 74]],
  [[0, 1.5, 77], [1.5, 1.5, 74], [3, 1, 70]],
  [[0, 1.5, 72], [1.5, 1.5, 77], [3, 1, 81]],
  [[0, 3, 79], [3, 1, 76]],
  [[0, 1.5, 81], [1.5, 1.5, 77], [3, 1, 74]],
  [[0, 1.5, 82], [1.5, 1.5, 81], [3, 1, 77]],
  [[0, 1.5, 79], [1.5, 1.5, 76], [3, 1, 72]],
  [[0, 2, 76], [2, 2, 79]],
];
// Linha lenta e larga, para o híbrido.
const SLOW: Note[][] = [
  [[0, 2, 74], [2, 2, 77]], [[0, 3, 77], [3, 1, 74]], [[0, 2, 72], [2, 2, 77]], [[0, 4, 76]],
  [[0, 2, 81], [2, 2, 77]], [[0, 3, 82], [3, 1, 81]], [[0, 2, 79], [2, 2, 76]], [[0, 4, 76]],
];

type Timing = { t0: number; intro: number; gStart: number; tEnd: number; endLen: number; total: number };

function kit(ctx: BaseAudioContext, dest: AudioNode, T: Timing) {
  const rate = ctx.sampleRate;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12; comp.knee.value = 6; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.18;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
  const master = ctx.createGain();
  master.connect(comp); comp.connect(lim); lim.connect(dest);
  master.gain.setValueAtTime(0.0001, T.t0);
  master.gain.exponentialRampToValueAtTime(0.9, T.t0 + 0.25);
  master.gain.setValueAtTime(0.9, T.t0 + T.total - 1.3);
  master.gain.linearRampToValueAtTime(0.0001, T.t0 + T.total + 0.2);

  const ir = ctx.createBuffer(2, Math.floor(rate * 2.8), rate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6); }
  const verb = ctx.createConvolver(); verb.buffer = ir;
  const verbIn = ctx.createGain(); verbIn.gain.value = 0.3; verbIn.connect(verb); verb.connect(master);
  const noise = ctx.createBuffer(1, rate * 2, rate);
  { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }

  const gain = (v: number, to?: AudioNode) => { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
  /** Um canal com volume e envio para a reverberação. */
  const bus = (vol: number, send = 0) => { const g = gain(vol, master); if (send) g.connect(gain(send, verbIn)); return g; };
  /** Um canal com "sidechain": abaixa a cada bumbo e volta (o efeito de bombear da música eletrônica). */
  const scBus = (vol: number, send = 0) => { const sc = gain(1); sc.connect(bus(vol, send)); return sc; };
  const duck = (sc: GainNode, at: number, back: number, depth = 0.2) => { sc.gain.setValueAtTime(depth, at); sc.gain.setTargetAtTime(1, at + 0.015, back / 3); };
  const shaper = (k: number, to: AudioNode) => {
    const ws = ctx.createWaveShaper(); const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    ws.curve = c; ws.oversample = '4x'; ws.connect(to); return ws;
  };
  const env = (g: GainNode, at: number, peak: number, a: number, hold: number, rel: number) => {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + a);
    g.gain.setValueAtTime(Math.max(0.0002, peak), at + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, at + a + hold + rel);
  };
  const osc = (type: OscillatorType, f: number, at: number, end: number, to: AudioNode, detune = 0) => {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; o.connect(to); o.start(at); o.stop(end); return o;
  };
  const filt = (type: BiquadFilterType, f: number, to: AudioNode, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(to); return b; };
  const noiseSrc = (at: number, end: number, to: AudioNode) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.loopStart = Math.random(); s.connect(to); s.start(at, Math.random() * 1.5); s.stop(end); return s; };
  const nhit = (out: AudioNode, at: number, type: BiquadFilterType, f: number, peak: number, dec: number, q = 0.7) => {
    const g = gain(0, out); env(g, at, peak, 0.002, 0, dec); noiseSrc(at, at + dec + 0.05, filt(type, f, g, q));
  };

  const I = {
    kick(out: AudioNode, at: number, v = 1, f0 = 165, f1 = 46, dec = 0.38) {
      const g = gain(0, out); env(g, at, 0.95 * v, 0.002, 0.03, dec);
      const o = osc('sine', f0, at, at + dec + 0.1, g); o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + 0.11);
      nhit(out, at, 'highpass', 3500, 0.18 * v, 0.012);
    },
    snare(out: AudioNode, at: number, v = 1, tone = 190, dec = 0.2) {
      nhit(out, at, 'bandpass', 2600, 0.7 * v, dec, 0.6);
      nhit(out, at, 'highpass', 6000, 0.25 * v, dec * 0.6);
      const g = gain(0, out); env(g, at, 0.45 * v, 0.002, 0, 0.11);
      const o = osc('triangle', tone * 1.4, at, at + 0.16, g); o.frequency.exponentialRampToValueAtTime(tone, at + 0.05);
    },
    clap(out: AudioNode, at: number, v = 1) {
      [0, 0.011, 0.022].forEach((d) => nhit(out, at + d, 'bandpass', 1300, 0.55 * v, 0.025, 1.4));
      nhit(out, at + 0.033, 'bandpass', 1200, 0.6 * v, 0.2, 1.1);
    },
    hat(out: AudioNode, at: number, v = 1, open = false) { nhit(out, at, 'highpass', 8200, (open ? 0.22 : 0.17) * v, open ? 0.24 : 0.04); },
    crash(out: AudioNode, at: number, v = 1, dec = 2.4) { nhit(out, at, 'highpass', 4200, 0.3 * v, dec); nhit(out, at, 'bandpass', 9000, 0.12 * v, dec * 0.7, 0.8); },
    riser(out: AudioNode, at: number, end: number, v = 1, toneFrom = 0) {
      const g = gain(0, out); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.32 * v, end); g.gain.setValueAtTime(0.0001, end + 0.005);
      const f = filt('bandpass', 300, g, 1.8); f.frequency.setValueAtTime(300, at); f.frequency.exponentialRampToValueAtTime(9000, end);
      noiseSrc(at, end + 0.02, f);
      if (toneFrom) {
        const tg = gain(0, out); tg.gain.setValueAtTime(0.0001, at); tg.gain.exponentialRampToValueAtTime(0.09 * v, end); tg.gain.setValueAtTime(0.0001, end + 0.005);
        const lp = filt('lowpass', 2500, tg);
        [-12, 12].forEach((d) => { const o = osc('sawtooth', hz(toneFrom), at, end + 0.02, lp, d); o.frequency.exponentialRampToValueAtTime(hz(toneFrom + 24), end); });
      }
    },
    revCym(out: AudioNode, end: number, dur: number, v = 1) {
      const g = gain(0, out); g.gain.setValueAtTime(0.0001, end - dur); g.gain.exponentialRampToValueAtTime(0.35 * v, end); g.gain.setValueAtTime(0.0001, end + 0.005);
      noiseSrc(end - dur, end + 0.02, filt('highpass', 3500, g));
    },
    impact(out: AudioNode, at: number, v = 1) {
      const g = gain(0, out); env(g, at, 0.9 * v, 0.003, 0.05, 2.2);
      const sh = shaper(2.2, g);
      const o = osc('sine', 110, at, at + 2.5, sh); o.frequency.setValueAtTime(110, at); o.frequency.exponentialRampToValueAtTime(30, at + 1.6);
      nhit(out, at, 'lowpass', 1200, 0.5 * v, 0.5);
      I.crash(out, at, 1.1 * v, 2.8);
    },
    taiko(out: AudioNode, at: number, v = 1, f = 68, dec = 0.7) {
      const g = gain(0, out); env(g, at, 0.85 * v, 0.002, 0.01, dec);
      const o = osc('sine', f * 1.7, at, at + dec + 0.1, g); o.frequency.exponentialRampToValueAtTime(f, at + 0.045);
      nhit(out, at, 'lowpass', 700, 0.35 * v, 0.1);
      nhit(out, at, 'bandpass', 1800, 0.12 * v, 0.03, 1);
    },
    braam(out: AudioNode, at: number, notes: number[], dur: number, v = 1) {
      const g = gain(0, out); env(g, at, 0.55 * v, 0.05, Math.max(0, dur - 0.4), 1.4);
      const sh = shaper(3, g);
      const f = filt('lowpass', 160, sh, 2.5);
      f.frequency.setValueAtTime(160, at); f.frequency.exponentialRampToValueAtTime(1700, at + 0.3); f.frequency.exponentialRampToValueAtTime(380, at + dur + 0.5);
      notes.forEach((m) => [-16, 0, 16].forEach((d) => osc('sawtooth', hz(m), at, at + dur + 1.6, f, d)));
    },
    pad(out: AudioNode, at: number, notes: number[], dur: number, v = 1, cut = 1500, a = 0.3, rel = 0.7) {
      const g = gain(0, out); env(g, at, 0.3 * v, a, Math.max(0, dur - a), rel);
      const f = filt('lowpass', cut, g);
      notes.forEach((m) => [-11, 11].forEach((d) => osc('sawtooth', hz(m), at, at + dur + rel + 0.1, f, d)));
    },
    supersaw(out: AudioNode, at: number, notes: number[], dur: number, v = 1, cut = 5200, a = 0.008, rel = 0.25) {
      const g = gain(0, out); env(g, at, 0.22 * v, a, Math.max(0, dur - a), rel);
      const f = filt('lowpass', cut, g);
      notes.forEach((m) => [-30, -15, 0, 15, 30].forEach((d) => osc('sawtooth', hz(m), at + Math.random() * 0.004, at + dur + rel + 0.1, f, d)));
    },
    pluck(out: AudioNode, at: number, m: number, v = 1, dec = 0.28, cut = 5000) {
      const g = gain(0, out); env(g, at, 0.42 * v, 0.002, 0, dec);
      const f = filt('lowpass', cut, g, 2); f.frequency.setValueAtTime(cut, at); f.frequency.exponentialRampToValueAtTime(320, at + dec);
      osc('sawtooth', hz(m), at, at + dec + 0.05, f, -8); osc('square', hz(m), at, at + dec + 0.05, f, 8);
    },
    bell(out: AudioNode, at: number, m: number, v = 1, dec = 0.9) {
      const g = gain(0, out); env(g, at, 0.3 * v, 0.002, 0, dec);
      osc('sine', hz(m), at, at + dec + 0.05, g);
      const g2 = gain(0, out); env(g2, at, 0.12 * v, 0.002, 0, dec * 0.4); osc('sine', hz(m) * 3.01, at, at + dec, g2);
    },
    lead(out: AudioNode, at: number, m: number, dur: number, v = 1, cut = 3600) {
      const g = gain(0, out); env(g, at, 0.3 * v, 0.015, Math.max(0, dur - 0.05), 0.22);
      const f = filt('lowpass', cut, g, 1.2);
      const oscs = [-12, 0, 12].map((d) => osc('sawtooth', hz(m), at, at + dur + 0.35, f, d));
      osc('square', hz(m - 12), at, at + dur + 0.35, f);
      if (dur > 0.5) {
        const lfo = ctx.createOscillator(); lfo.frequency.value = 5.4; const lg = gain(0); lfo.connect(lg);
        lg.gain.setValueAtTime(0, at); lg.gain.linearRampToValueAtTime(14, at + dur);
        oscs.forEach((o) => lg.connect(o.detune)); lfo.start(at); lfo.stop(at + dur + 0.35);
      }
    },
    stab(out: AudioNode, at: number, notes: number[], v = 1, dec = 0.32) {
      const g = gain(0, out); env(g, at, 0.3 * v, 0.006, 0.04, dec);
      const f = filt('lowpass', 4200, g, 1.5); f.frequency.setValueAtTime(4200, at); f.frequency.exponentialRampToValueAtTime(900, at + dec);
      notes.forEach((m) => [-9, 9].forEach((d) => osc('sawtooth', hz(m), at, at + dec + 0.1, f, d)));
    },
    staccato(out: AudioNode, at: number, m: number, v = 1, dec = 0.11) {
      const g = gain(0, out); env(g, at, 0.35 * v, 0.004, 0.01, dec);
      const f = filt('lowpass', 2300, g);
      osc('sawtooth', hz(m), at, at + dec + 0.05, f, -7); osc('sawtooth', hz(m), at, at + dec + 0.05, f, 7);
    },
    b808(out: AudioNode, at: number, m: number, dur: number, v = 1, glideFrom = 0) {
      const g = gain(0, out); env(g, at, 0.75 * v, 0.003, Math.max(0, dur - 0.1), 0.12);
      const lp = filt('lowpass', 1800, g); const sh = shaper(2.4, lp);
      const o = osc('sine', hz(glideFrom || m) * (glideFrom ? 1 : 1.9), at, at + dur + 0.2, sh);
      o.frequency.exponentialRampToValueAtTime(hz(m), at + (glideFrom ? 0.12 : 0.035));
    },
    wobble(out: AudioNode, at: number, m: number, dur: number, rates: [number, number][], v = 1) {
      const g = gain(0, out); env(g, at, 0.5 * v, 0.005, Math.max(0, dur - 0.04), 0.05);
      const lp2 = filt('lowpass', 5500, g); const sh = shaper(3.5, lp2);
      const f = filt('lowpass', 900, sh, 8);
      const lfo = ctx.createOscillator(); lfo.type = 'sine'; const depth = gain(800); lfo.connect(depth); depth.connect(f.frequency);
      rates.forEach(([t, r]) => lfo.frequency.setValueAtTime(r, t)); lfo.start(at); lfo.stop(at + dur + 0.1);
      osc('sawtooth', hz(m), at, at + dur + 0.1, f, -10); osc('sawtooth', hz(m), at, at + dur + 0.1, f, 10); osc('square', hz(m - 12), at, at + dur + 0.1, f);
      const sub = gain(0, out); env(sub, at, 0.35 * v, 0.005, Math.max(0, dur - 0.04), 0.05); osc('sine', hz(m - 12), at, at + dur + 0.1, sub);
    },
    reese(out: AudioNode, at: number, m: number, dur: number, v = 1) {
      const g = gain(0, out); env(g, at, 0.45 * v, 0.01, Math.max(0, dur - 0.06), 0.08);
      const sh = shaper(1.6, g);
      const f = filt('lowpass', 520, sh, 1.5);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.7; const lg = gain(260); lfo.connect(lg); lg.connect(f.frequency); lfo.start(at); lfo.stop(at + dur + 0.1);
      osc('sawtooth', hz(m), at, at + dur + 0.1, f, -22); osc('sawtooth', hz(m), at, at + dur + 0.1, f, 22);
      const sub = gain(0, out); env(sub, at, 0.4 * v, 0.01, Math.max(0, dur - 0.06), 0.08); osc('sine', hz(m - 12), at, at + dur + 0.1, sub);
    },
    offbass(out: AudioNode, at: number, m: number, dur: number, v = 1) {
      const g = gain(0, out); env(g, at, 0.5 * v, 0.004, dur * 0.4, dur * 0.5);
      const f = filt('lowpass', 1100, g, 2); f.frequency.setValueAtTime(1100, at); f.frequency.exponentialRampToValueAtTime(300, at + dur);
      osc('sawtooth', hz(m), at, at + dur + 0.05, f, -6); osc('sawtooth', hz(m), at, at + dur + 0.05, f, 6); osc('sine', hz(m - 12), at, at + dur + 0.05, g);
    },
  };
  return { ctx, master, bus, scBus, duck, I };
}
type Kit = ReturnType<typeof kit>;

/** Compassos inteiros entre a abertura e o fim, com o andamento mais próximo do nominal. */
function grid(T: Timing, barNom: number) {
  const len = T.tEnd - T.gStart;
  if (len < 1) return null;
  const bars = Math.max(1, Math.round(len / barNom)), bar = len / bars;
  return { bars, bar, beat: bar / 4, at: (b: number, beat: number) => T.gStart + b * bar + beat * (bar / 4) };
}
const up = (ns: number[], k: number) => ns.map((n) => n + k);

/* ---- 1. Híbrido épico: taikos, braams, cordas em ostinato e uma linha larga ------------------- */
function hibrido(k: Kit, T: Timing) {
  const { I } = k;
  const drums = k.bus(0.95, 0.4), strings = k.bus(0.5, 0.45), braam = k.bus(0.42, 0.5), pad = k.bus(0.32, 0.8), lead = k.bus(0.34, 0.75), fx = k.bus(0.6, 0.4);
  const G = grid(T, 2.4);
  if (T.intro > 0.5) {
    I.taiko(drums, T.t0 + 0.02, 1, 55, 1.2);
    I.braam(braam, T.t0 + 0.02, [26, 38, 45], T.intro * 0.75, 0.9);
    const beat = G?.beat ?? 0.6;
    for (let t = T.t0 + T.intro * 0.35, i = 0; t < T.gStart - 0.05; t += beat / 2, i++) I.staccato(strings, t, i % 2 ? 57 : 50, 0.4 + 0.6 * (t - T.t0) / T.intro);
    I.riser(fx, T.t0 + T.intro * 0.3, T.gStart - 0.06, 0.9, 50);
    I.revCym(fx, T.gStart, 1.4, 0.9);
  }
  if (G) {
    const { bars, beat, at } = G;
    I.impact(fx, T.gStart, 0.9);
    for (let b = 0; b < bars; b++) {
      const c = PROG[b % 8], last = b === bars - 1, hi = b % 8 >= 4 ? 12 : 0;
      I.pad(pad, at(b, 0), up(c.pad, -12), G.bar, 1, 1300, 0.2);
      const pat = [0, 0, 2, 0, 1, 0, 2, 1, 0, 0, 2, 0, 1, 2, 1, 2];
      pat.forEach((n, i) => I.staccato(strings, at(b, i / 4), c.pad[n] - 12 + (i % 4 === 3 ? 12 : 0) + hi * (i % 2), i % 4 === 0 ? 1 : 0.7));
      if (b % 2 === 0 && !last) I.braam(braam, at(b, 0), [c.r - 12, c.r, c.r + 7], G.bar * 1.5, 0.7);
      SLOW[b % 8].forEach(([s, d, m]) => I.lead(lead, at(b, s), m, d * beat * 0.97, 0.9, 3000));
      if (!last) {
        [[0, 1, 62], [0.75, 0.6, 70], [1.5, 0.7, 62], [2, 1, 55], [3, 0.8, 62], [3.5, 0.7, 75]].forEach(([s, v, f]) => I.taiko(drums, at(b, s), v, f));
        I.snare(drums, at(b, 2), 1.1, 170, 0.35);
        if (b % 4 === 3) for (let i = 0; i < 4; i++) I.taiko(drums, at(b, 3 + i / 4), 0.5 + i * 0.12, 90 + i * 12, 0.3);
      } else {
        for (let i = 0; i < 16; i++) I.taiko(drums, at(b, i / 4), 0.35 + i * 0.045, 60 + i * 3, 0.35);
        I.revCym(fx, T.tEnd, G.bar * 0.9, 1);
      }
    }
  }
  if (T.endLen > 0) {
    const hold = Math.max(1.4, T.endLen - 1.2);
    I.impact(fx, T.tEnd, 1.1); I.taiko(drums, T.tEnd, 1.2, 50, 1.4);
    I.braam(braam, T.tEnd, [26, 38, 45, 50, 54], hold, 1);
    I.pad(pad, T.tEnd, WIN.pad, hold + 0.5, 1.3, 2200, 0.05);
    I.lead(lead, T.tEnd, 74, hold, 1, 3400); I.lead(lead, T.tEnd, 78, hold, 0.6, 3400);
  }
}

/* ---- 2. Dubstep épico: meio-tempo, wobble e supersaws com sidechain ---------------------------- */
function dubstep(k: Kit, T: Timing) {
  const { I } = k;
  const drums = k.bus(0.95, 0.15), wob = k.bus(0.5, 0.04), saws = k.scBus(0.36, 0.55), lead = k.bus(0.28, 0.6), fx = k.bus(0.6, 0.35);
  const G = grid(T, 1.714);
  const beat0 = G?.beat ?? 0.43;
  if (T.intro > 0.5) {
    I.supersaw(saws, T.t0, up(PROG[0].pad, -12), T.intro - 0.15, 0.8, 900, 0.4, 0.05);
    I.kick(drums, T.t0 + 0.02, 1);
    const s0 = T.t0 + T.intro * 0.25, s1 = T.gStart - 0.14;
    let t = s0;
    while (t < s1) { const p = (t - s0) / (s1 - s0); I.snare(drums, t, 0.35 + 0.65 * p, 180 + 120 * p, 0.12); t += p < 0.4 ? beat0 / 2 : p < 0.75 ? beat0 / 4 : beat0 / 8; }
    I.riser(fx, T.t0 + T.intro * 0.2, s1, 1, 45);
  }
  if (G) {
    const { bars, beat, at } = G;
    I.impact(fx, T.gStart, 1);
    for (let b = 0; b < bars; b++) {
      const c = PROG[b % 8], last = b === bars - 1;
      I.supersaw(saws, at(b, 0), [...c.pad, c.pad[0] + 12], G.bar, 0.9, 4200, 0.01, 0.1);
      HOOK[b % 8].forEach(([s, d, m]) => I.pluck(lead, at(b, s), m, 0.9, Math.min(0.6, d * beat), 6000));
      const r = c.r < 36 ? c.r + 12 : c.r;
      const rates = b % 2 ? [4, 4, 6, 8] : [2, 2, 3, 4];
      if (!last) {
        I.wobble(wob, at(b, 0), r, beat * 1.9, [[at(b, 0), rates[0] / beat], [at(b, 1), rates[1] / beat]], 1);
        I.wobble(wob, at(b, 2), r, beat * 1.95, [[at(b, 2), rates[2] / beat], [at(b, 3), rates[3] / beat]], 1);
        I.kick(drums, at(b, 0), 1.1); I.kick(drums, at(b, 2.75), 0.8); if (b % 2) I.kick(drums, at(b, 3.25), 0.6);
        I.snare(drums, at(b, 2), 1.2, 200, 0.28); I.clap(drums, at(b, 2), 0.6);
        for (let i = 0; i < 8; i++) I.hat(drums, at(b, i / 2), i % 2 ? 0.55 : 0.9);
        if (b % 4 === 3) for (let i = 0; i < 4; i++) I.hat(drums, at(b, 3 + i / 4), 0.7);
        [0, 2, 2.75].forEach((s) => k.duck(saws, at(b, s), beat * 0.9));
        if (b % 8 === 0) I.crash(drums, at(b, 0), 0.7);
      } else {
        I.wobble(wob, at(b, 0), r, beat * 3.9, [[at(b, 0), 4 / beat], [at(b, 1), 6 / beat], [at(b, 2), 8 / beat], [at(b, 3), 12 / beat]], 1);
        I.kick(drums, at(b, 0), 1.1); k.duck(saws, at(b, 0), beat);
        for (let i = 0; i < 8; i++) I.snare(drums, at(b, 2 + i / 4), 0.45 + i * 0.07, 200 + i * 20, 0.1);
        I.revCym(fx, T.tEnd, G.bar * 0.7, 0.9);
      }
    }
  }
  if (T.endLen > 0) {
    const hold = Math.max(1.4, T.endLen - 1.2);
    I.impact(fx, T.tEnd, 1.15); I.kick(drums, T.tEnd, 1.2, 140, 35, 0.8);
    I.supersaw(saws, T.tEnd, [...WIN.pad, 78], hold, 1.1, 6000, 0.01, 1);
    I.b808(wob, T.tEnd, 38, hold, 0.9, 50);
    I.lead(lead, T.tEnd, 81, hold, 0.7, 4000);
  }
}

/* ---- 3. Trap esportivo: 808 com slide, hats em rolo, stabs de metais e sino -------------------- */
function trap(k: Kit, T: Timing) {
  const { I } = k;
  const drums = k.bus(0.95, 0.12), bass = k.bus(0.6, 0), brass = k.bus(0.42, 0.4), strings = k.scBus(0.3, 0.7), bell = k.bus(0.38, 0.55), fx = k.bus(0.6, 0.35);
  const G = grid(T, 1.714);
  const beat0 = G?.beat ?? 0.43;
  if (T.intro > 0.5) {
    I.pad(strings, T.t0, up(PROG[0].pad, -12), T.intro - 0.2, 1, 1000, 0.6, 0.1);
    I.stab(brass, T.t0 + 0.02, [50, 57, 62], 0.9, 0.6); I.taiko(drums, T.t0 + 0.02, 0.9, 55, 1);
    const s0 = T.t0 + T.intro * 0.3, s1 = T.gStart - 0.2;
    for (let t = s0; t < s1;) { const p = (t - s0) / (s1 - s0); I.hat(drums, t, 0.5 + 0.5 * p); t += p < 0.45 ? beat0 / 2 : p < 0.8 ? beat0 / 4 : beat0 / 8; }
    I.riser(fx, T.t0 + T.intro * 0.25, T.gStart - 0.2, 0.9, 50);
  }
  if (G) {
    const { bars, beat, at } = G;
    I.impact(fx, T.gStart, 0.9);
    for (let b = 0; b < bars; b++) {
      const c = PROG[b % 8], last = b === bars - 1, r = c.r < 36 ? c.r : c.r - 12;
      I.pad(strings, at(b, 0), up(c.pad, -12), G.bar, 1, 1800, 0.05, 0.3);
      HOOK[b % 8].forEach(([s, , m]) => I.bell(bell, at(b, s), m + 12, 0.8, 0.8));
      if (!last) {
        (b % 4 < 2 ? [0, 0.75, 1.5] : [0, 1.5, 2.5, 3]).forEach((s, i) => I.stab(brass, at(b, s), [...c.pad, c.pad[0] - 12], i ? 0.75 : 1));
        I.kick(drums, at(b, 0), 1); I.b808(bass, at(b, 0), r, beat * 2.3, 1);
        I.kick(drums, at(b, 2.5), 0.8); I.b808(bass, at(b, 2.5), r + (b % 2 ? 7 : 0), beat * 1.4, 0.95, b % 2 ? r : 0);
        I.clap(drums, at(b, 2), 1.1); I.snare(drums, at(b, 2), 0.6, 210, 0.18);
        k.duck(strings, at(b, 0), beat); k.duck(strings, at(b, 2.5), beat);
        for (let i = 0; i < 8; i++) {
          const roll = (b % 2 === 1 && i === 7) || (b % 4 === 3 && i === 3);
          if (roll) for (let j = 0; j < (i === 7 ? 4 : 3); j++) I.hat(drums, at(b, i / 2 + j / (i === 7 ? 8 : 6)), 0.6 + j * 0.1);
          else I.hat(drums, at(b, i / 2), i % 2 ? 0.6 : 0.9, i === 3 && b % 2 === 0);
        }
        if (b % 8 === 0) I.crash(drums, at(b, 0), 0.6);
      } else {
        I.stab(brass, at(b, 0), [...c.pad, c.pad[0] - 12], 1);
        I.b808(bass, at(b, 0), r, beat * 1.8, 1); I.kick(drums, at(b, 0), 1);
        for (let i = 0; i < 16; i++) I.hat(drums, at(b, 2 + i / 8), 0.5 + i * 0.03);
        I.b808(bass, at(b, 2), r + 12, beat * 1.8, 0.7, r);
        I.revCym(fx, T.tEnd, G.bar * 0.6, 0.9);
      }
    }
  }
  if (T.endLen > 0) {
    const hold = Math.max(1.4, T.endLen - 1.2);
    I.impact(fx, T.tEnd, 1.1); I.kick(drums, T.tEnd, 1.1);
    I.stab(brass, T.tEnd, [50, 57, 62, 66, 69, 74], 1.1, hold * 0.7);
    I.pad(strings, T.tEnd, WIN.pad, hold, 1.2, 2400, 0.05);
    I.b808(bass, T.tEnd, 26, hold, 1, 38);
    I.bell(bell, T.tEnd, 86, 0.9, 2); I.bell(bell, T.tEnd + 0.15, 90, 0.7, 2);
  }
}

/* ---- 4. EDM uplifting: 4/4, baixo no contratempo, arpejo e lead em supersaw ------------------- */
function edm(k: Kit, T: Timing) {
  const { I } = k;
  const drums = k.bus(0.95, 0.12), bass = k.scBus(0.5, 0), saws = k.scBus(0.36, 0.6), arp = k.scBus(0.24, 0.5), lead = k.bus(0.3, 0.7), fx = k.bus(0.6, 0.35);
  const G = grid(T, 1.818);
  const beat0 = G?.beat ?? 0.455;
  const arpPat = [0, 1, 2, 3, 2, 1, 0, 2];
  if (T.intro > 0.5) {
    let i = 0;
    for (let t = T.t0 + 0.05; t < T.gStart - 0.15; t += beat0 / 4, i++) { const p = (t - T.t0) / T.intro; const ns = [...PROG[0].pad, PROG[0].pad[0] + 12]; I.pluck(arp, t, ns[arpPat[i % 8]], 0.5 + 0.5 * p, 0.18, 600 + 5000 * p * p); }
    const s0 = T.t0 + T.intro * 0.35, s1 = T.gStart - 0.15;
    for (let t = s0; t < s1;) { const p = (t - s0) / (s1 - s0); I.snare(drums, t, 0.35 + 0.6 * p, 190 + 100 * p, 0.12); t += p < 0.4 ? beat0 : p < 0.75 ? beat0 / 2 : beat0 / 4; }
    I.riser(fx, T.t0 + T.intro * 0.2, s1, 1, 50);
  }
  if (G) {
    const { bars, beat, at } = G;
    I.impact(fx, T.gStart, 0.85);
    for (let b = 0; b < bars; b++) {
      const c = PROG[b % 8], last = b === bars - 1, ns = [...c.pad, c.pad[0] + 12];
      I.supersaw(saws, at(b, 0), [c.pad[0] - 12, ...c.pad, c.pad[0] + 12], G.bar, 0.9, 5500);
      for (let i = 0; i < 16; i++) I.pluck(arp, at(b, i / 4), ns[arpPat[i % 8]] + 12, i % 4 === 0 ? 1 : 0.7, 0.16, 5500);
      HOOK[b % 8].forEach(([s, d, m]) => I.lead(lead, at(b, s), m, d * beat * 0.95, 0.95, 4200));
      const r = c.r < 36 ? c.r + 12 : c.r;
      const kicks = last ? [0, 1] : [0, 1, 2, 3];
      kicks.forEach((s) => { I.kick(drums, at(b, s), 1, 150, 48, 0.3); [saws, arp, bass].forEach((x) => k.duck(x, at(b, s), beat * 0.85, 0.15)); });
      for (let i = 0; i < 4; i++) if (!last || i < 2) I.offbass(bass, at(b, i + 0.5), r, beat * 0.45, 1);
      if (!last) {
        [1, 3].forEach((s) => I.clap(drums, at(b, s), 0.9));
        for (let i = 0; i < 4; i++) { I.hat(drums, at(b, i + 0.5), 0.9, true); I.hat(drums, at(b, i + 0.25), 0.4); I.hat(drums, at(b, i + 0.75), 0.4); }
        if (b % 8 === 0) I.crash(drums, at(b, 0), 0.7);
      } else {
        for (let i = 0; i < 8; i++) I.snare(drums, at(b, 2 + i / 4), 0.4 + i * 0.08, 200 + i * 20, 0.1);
        I.revCym(fx, T.tEnd, G.bar * 0.6, 0.9);
      }
    }
  }
  if (T.endLen > 0) {
    const hold = Math.max(1.4, T.endLen - 1.2);
    I.impact(fx, T.tEnd, 1.1); I.kick(drums, T.tEnd, 1.2);
    I.supersaw(saws, T.tEnd, [50, ...WIN.pad, 78], hold, 1.1, 6500, 0.01, 1.1);
    I.lead(lead, T.tEnd, 81, hold, 0.9, 4400);
    I.offbass(bass, T.tEnd, 38, hold, 1);
  }
}

/* ---- 5. Drum & bass épico: 174 bpm, reese, pads largos e a melodia em meio-tempo -------------- */
function dnb(k: Kit, T: Timing) {
  const { I } = k;
  const drums = k.bus(0.95, 0.18), bass = k.bus(0.55, 0), pad = k.scBus(0.36, 0.85), lead = k.bus(0.3, 0.75), fx = k.bus(0.6, 0.35);
  const G = grid(T, 1.379);
  const beat0 = G?.beat ?? 0.345;
  if (T.intro > 0.5) {
    I.pad(pad, T.t0, [50, 57, 62, 65], T.intro, 1, 1200, 0.8, 0.2);
    const s0 = T.t0 + T.intro * 0.4, s1 = T.gStart - 0.1;
    for (let t = s0; t < s1;) { const p = (t - s0) / (s1 - s0); I.snare(drums, t, 0.3 + 0.6 * p, 200 + 100 * p, 0.1); t += p < 0.5 ? beat0 / 2 : beat0 / 4; }
    I.riser(fx, T.t0 + T.intro * 0.2, s1, 1, 50);
  }
  if (G) {
    const { bars, beat, at } = G;
    I.impact(fx, T.gStart, 0.85);
    for (let b = 0; b < bars; b++) {
      const ci = Math.floor(b / 2) % 8, c = PROG[ci], last = b === bars - 1;
      if (b % 2 === 0) I.pad(pad, at(b, 0), [...up(c.pad, -12), c.pad[1]], G.bar * 2, 1, 1800, 0.08, 0.4);
      HOOK[ci].forEach(([s, d, m]) => { const pos = s * 2 - (b % 2) * 4; if (pos >= 0 && pos < 4) I.lead(lead, at(b, pos), m, d * 2 * beat * 0.95, 0.9, 3800); });
      const r = c.r < 36 ? c.r + 12 : c.r;
      if (!last) {
        I.reese(bass, at(b, 0), r - 12, beat * 2.4, 1); I.reese(bass, at(b, 2.5), r - 12 + (b % 2 ? 3 : 0), beat * 1.4, 0.9);
        I.kick(drums, at(b, 0), 1, 170, 50, 0.25); I.kick(drums, at(b, 2.5), 0.85, 170, 50, 0.25);
        I.snare(drums, at(b, 1), 1, 210, 0.16); I.snare(drums, at(b, 3), 1, 210, 0.16);
        I.snare(drums, at(b, b % 2 ? 3.75 : 1.75), 0.3, 230, 0.06);
        for (let i = 0; i < 8; i++) I.hat(drums, at(b, i / 2 + 0.25), 0.5);
        for (let i = 0; i < 4; i++) I.hat(drums, at(b, i), 0.3);
        [0, 2.5].forEach((s) => k.duck(pad, at(b, s), beat * 1.2, 0.4));
        if (b % 8 === 0) I.crash(drums, at(b, 0), 0.7);
      } else {
        I.reese(bass, at(b, 0), r - 12, beat * 3.8, 1); I.kick(drums, at(b, 0), 1);
        for (let i = 0; i < 12; i++) I.snare(drums, at(b, 1 + i / 4), 0.35 + i * 0.055, 200 + i * 15, 0.08);
        I.revCym(fx, T.tEnd, G.bar * 0.8, 0.9);
      }
    }
  }
  if (T.endLen > 0) {
    const hold = Math.max(1.4, T.endLen - 1.2);
    I.impact(fx, T.tEnd, 1.1); I.kick(drums, T.tEnd, 1.1);
    I.pad(pad, T.tEnd, [50, 57, ...WIN.pad], hold, 1.4, 2600, 0.05, 1);
    I.reese(bass, T.tEnd, 38, hold, 1);
    I.lead(lead, T.tEnd, 78, hold, 0.8, 4000); I.lead(lead, T.tEnd, 74, hold, 0.6, 4000);
  }
}

const STYLES: Record<TrackId, (k: Kit, T: Timing) => void> = { hibrido, dubstep, trap, edm, dnb };

export function playTrailerMusic(ctx: BaseAudioContext, dest: AudioNode, scenes: MusicScene[], track: TrackId = 'hibrido', start = ctx.currentTime): () => void {
  const total = scenes.reduce((a, s) => a + s.dur, 0);
  const intro = scenes[0]?.kind === 'intro' ? scenes[0].dur : 0;
  const endLen = scenes.at(-1)?.kind === 'end' ? scenes.at(-1)!.dur : 0;
  const T: Timing = { t0: start, intro, gStart: start + intro, tEnd: start + total - endLen, endLen, total };
  const k = kit(ctx, dest, T);
  (STYLES[track] ?? hibrido)(k, T);
  return () => { try { k.master.disconnect(); } catch { /* já desligado */ } };
}
