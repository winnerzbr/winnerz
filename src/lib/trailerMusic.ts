/**
 * Trilha do trailer (J7): uma fanfarra épica gerada na hora com Web Audio (nada de música de terceiros).
 * Abertura com tímpanos subindo, depois bateria, baixo, cordas e metais em ré maior (I–♭VI–♭VII–I, o clima de
 * "vitória"), uma virada de caixa antes do fim e um acorde final com prato. Tudo é agendado de uma vez,
 * a partir das durações das cenas, então funciona igual num AudioContext normal ou num OfflineAudioContext.
 */
export type MusicScene = { kind: string; dur: number };

const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

// Acordes (MIDI, oitava do meio) e a fundamental do baixo de cada compasso, num ciclo de 8 compassos.
const PROG: { pad: number[]; bass: number }[] = [
  { pad: [62, 66, 69, 74], bass: 38 }, // Ré
  { pad: [58, 62, 65, 70], bass: 34 }, // Si♭
  { pad: [60, 64, 67, 72], bass: 36 }, // Dó
  { pad: [62, 66, 69, 74], bass: 38 }, // Ré
  { pad: [59, 62, 66, 71], bass: 35 }, // Si menor
  { pad: [55, 59, 62, 67], bass: 31 }, // Sol
  { pad: [57, 61, 64, 69], bass: 33 }, // Lá
  { pad: [57, 61, 64, 69], bass: 33 }, // Lá
];
// Melodia dos metais: [tempo dentro do compasso, duração (tempos), nota MIDI].
const MEL: [number, number, number][][] = [
  [[0, 0.5, 69], [0.5, 0.5, 69], [1, 0.5, 69], [1.5, 2.5, 74]],
  [[0, 0.5, 74], [0.5, 0.5, 74], [1, 0.5, 74], [1.5, 2.5, 77]],
  [[0, 1, 76], [1, 1, 79], [2, 0.5, 76], [2.5, 0.5, 72], [3, 1, 76]],
  [[0, 2, 78], [2, 2, 81]],
  [[0, 1.5, 78], [1.5, 0.5, 74], [2, 2, 71]],
  [[0, 1.5, 79], [1.5, 0.5, 78], [2, 2, 74]],
  [[0, 1, 76], [1, 0.5, 73], [1.5, 0.5, 76], [2, 2, 79]],
  [[0, 0.5, 69], [0.5, 0.5, 73], [1, 0.5, 76], [1.5, 2.5, 81]],
];

export function playTrailerMusic(ctx: BaseAudioContext, dest: AudioNode, scenes: MusicScene[], start = ctx.currentTime): () => void {
  const total = scenes.reduce((a, s) => a + s.dur, 0);
  const introLen = scenes[0]?.kind === 'intro' ? scenes[0].dur : 0;
  const endLen = scenes.at(-1)?.kind === 'end' ? scenes.at(-1)!.dur : 0;
  const t0 = start, tEnd = t0 + total - endLen;

  // Mixagem: compressor no fim, reverberação de sala grande em envio.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
  const master = ctx.createGain(); master.gain.value = 0.0001;
  master.connect(comp); comp.connect(dest);
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.85, t0 + 0.4);
  master.gain.setValueAtTime(0.85, t0 + total - 1.4);
  master.gain.linearRampToValueAtTime(0.0001, t0 + total + 0.2);

  const rate = ctx.sampleRate;
  const ir = ctx.createBuffer(2, Math.floor(rate * 2.4), rate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
  const verb = ctx.createConvolver(); verb.buffer = ir;
  const verbIn = ctx.createGain(); verbIn.gain.value = 0.28; verbIn.connect(verb); verb.connect(master);
  const bus = (send: number) => { const g = ctx.createGain(); g.connect(master); if (send) { const s = ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(verbIn); } return g; };
  const brassBus = bus(0.9), padBus = bus(1), bassBus = bus(0), drumBus = bus(0.35);
  brassBus.gain.value = 0.34; padBus.gain.value = 0.16; bassBus.gain.value = 0.4; drumBus.gain.value = 0.9;

  const noise = ctx.createBuffer(1, rate * 2, rate);
  { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const env = (g: GainNode, at: number, peak: number, a: number, hold: number, rel: number) => {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + a);
    g.gain.setValueAtTime(peak, at + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, at + a + hold + rel);
  };
  const noiseHit = (at: number, type: BiquadFilterType, freq: number, peak: number, decay: number, out: AudioNode, q = 0.7) => {
    const src = ctx.createBufferSource(); src.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); env(g, at, peak, 0.002, 0, decay);
    src.connect(f); f.connect(g); g.connect(out); src.start(at); src.stop(at + decay + 0.05);
  };

  // ---- Instrumentos ----
  const kick = (at: number, v = 1) => {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.14);
    const g = ctx.createGain(); env(g, at, 0.95 * v, 0.003, 0.02, 0.32); o.connect(g); g.connect(drumBus); o.start(at); o.stop(at + 0.4);
  };
  const snare = (at: number, v = 1) => {
    noiseHit(at, 'highpass', 1400, 0.55 * v, 0.18, drumBus);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(220, at); o.frequency.exponentialRampToValueAtTime(160, at + 0.08);
    const g = ctx.createGain(); env(g, at, 0.3 * v, 0.002, 0, 0.1); o.connect(g); g.connect(drumBus); o.start(at); o.stop(at + 0.15);
  };
  const hat = (at: number, v = 1) => noiseHit(at, 'highpass', 8000, 0.16 * v, 0.045, drumBus);
  const crash = (at: number, v = 1) => noiseHit(at, 'highpass', 4500, 0.32 * v, 2.2, drumBus);
  const timpani = (at: number, m: number, v = 1) => {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(hz(m) * 1.04, at); o.frequency.exponentialRampToValueAtTime(hz(m), at + 0.12);
    const g = ctx.createGain(); env(g, at, 0.7 * v, 0.004, 0.02, 0.9); o.connect(g); g.connect(drumBus); o.start(at); o.stop(at + 1);
    noiseHit(at, 'lowpass', 400, 0.25 * v, 0.12, drumBus);
  };
  const brass = (at: number, m: number, dur: number, v = 1) => {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.5;
    f.frequency.setValueAtTime(500, at); f.frequency.exponentialRampToValueAtTime(3200, at + 0.07); f.frequency.exponentialRampToValueAtTime(1900, at + 0.25);
    const g = ctx.createGain(); env(g, at, 0.5 * v, 0.03, Math.max(0, dur - 0.1), 0.18);
    f.connect(g); g.connect(brassBus);
    [-7, 7].forEach((cents) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = cents;
      if (dur > 0.9) { const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2; const lg = ctx.createGain(); lg.gain.setValueAtTime(0, at); lg.gain.linearRampToValueAtTime(9, at + dur); lfo.connect(lg); lg.connect(o.detune); lfo.start(at); lfo.stop(at + dur + 0.3); }
      o.connect(f); o.start(at); o.stop(at + dur + 0.3);
    });
  };
  const pad = (at: number, notes: number[], dur: number, v = 1, attack = 0.25) => {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1700;
    const g = ctx.createGain(); env(g, at, 0.5 * v, attack, Math.max(0, dur - attack), 0.5);
    f.connect(g); g.connect(padBus);
    notes.forEach((m) => [-9, 9].forEach((c) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = c; o.connect(f); o.start(at); o.stop(at + dur + 0.6); }));
  };
  const bass = (at: number, m: number, dur: number) => {
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, at); f.frequency.exponentialRampToValueAtTime(260, at + dur);
    const g = ctx.createGain(); env(g, at, 0.6, 0.006, dur * 0.5, dur * 0.45);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m);
    const sub = ctx.createOscillator(); sub.frequency.value = hz(m);
    o.connect(f); sub.connect(f); f.connect(g); g.connect(bassBus);
    o.start(at); sub.start(at); o.stop(at + dur + 0.05); sub.stop(at + dur + 0.05);
  };

  // ---- Abertura: pedal grave, tímpanos acelerando e uma subida de ruído ----
  if (introLen > 0.5) {
    pad(t0, [50, 57, 62], introLen, 0.8, introLen * 0.6);
    let at = t0 + 0.1, gap = 0.5;
    while (at < t0 + introLen - 0.05) { const k = (at - t0) / introLen; timpani(at, 38, 0.35 + k * 0.65); at += gap; gap = Math.max(0.07, gap * 0.82); }
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(400, t0); f.frequency.exponentialRampToValueAtTime(7000, t0 + introLen);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18, t0 + introLen); g.gain.setValueAtTime(0.0001, t0 + introLen + 0.01);
    src.connect(f); f.connect(g); g.connect(drumBus); src.start(t0); src.stop(t0 + introLen + 0.05);
  }

  // ---- O corpo: compassos inteiros entre a abertura e o fim (o andamento se ajusta, ~120–140 bpm) ----
  const gStart = t0 + introLen, len = tEnd - gStart;
  if (len > 1.2) {
    const bars = Math.max(1, Math.round(len / 1.85)), bar = len / bars, beat = bar / 4;
    for (let b = 0; b < bars; b++) {
      const at = gStart + b * bar, ch = PROG[b % 8], last = b === bars - 1;
      if (b === 0 || b % 8 === 0) crash(at, b === 0 ? 1 : 0.7);
      pad(at, ch.pad, bar, 1, 0.05);
      for (let e = 0; e < 8; e++) bass(at + e * beat / 2, ch.bass + (e % 2 ? 12 : 0), beat / 2 * 0.9);
      MEL[b % 8].forEach(([s, d, m]) => brass(at + s * beat, m, d * beat * 0.95, s === 0 ? 1 : 0.85));
      if (!last) {
        [0, 2].forEach((k) => kick(at + k * beat)); kick(at + 2.5 * beat, 0.7);
        [1, 3].forEach((k) => snare(at + k * beat));
        for (let e = 0; e < 8; e++) hat(at + e * beat / 2, e % 2 ? 0.6 : 1);
      } else {
        kick(at); kick(at + beat); snare(at + beat, 0.8);
        for (let e = 0; e < 8; e++) snare(at + 2 * beat + e * beat / 4, 0.45 + e * 0.08); // virada
        timpani(at + 3 * beat, 38, 0.8); timpani(at + 3.5 * beat, 45, 0.9);
      }
    }
  }

  // ---- Fim: acorde de vitória com prato e tímpano ----
  if (endLen > 0) {
    const hold = Math.max(1.2, endLen - 1.2);
    crash(tEnd, 1.1); kick(tEnd, 1.2); timpani(tEnd, 38, 1);
    [62, 66, 69, 74].forEach((m, i) => brass(tEnd, m, hold, i === 3 ? 1 : 0.75));
    brass(tEnd, 78, hold, 0.55);
    pad(tEnd, [50, 57, 62, 66, 69], hold + 0.6, 1.1, 0.04);
    bass(tEnd, 38, hold); bass(tEnd, 26, hold);
  }

  return () => { try { master.disconnect(); } catch { /* já desligado */ } };
}
