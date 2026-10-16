/**
 * Trilha do trailer (J7): "Halo", de Elliptik (licenciada pelo WinnerZ para o site e as redes), a 135 bpm.
 * public/audio/trailer-halo.mp3 é um trecho contínuo da música, do fim da subida até o final:
 *   0 → 3,56 s  subida (2 compassos)          3,56 → 32,0  drop (16 compassos)
 *   32,0 → 39,1 quebra (4 compassos)           39,1 → 46,2  golpe final e fim da música (4 compassos)
 * O vídeo é montado no compasso: cada cena dura um número inteiro de tempos e o corpo fecha em frases de
 * 4 compassos, então o único corte da música (se houver) cai numa virada de frase, como numa edição de verdade.
 * A abertura é a subida, os números entram no drop e o "ZEROU" cai no golpe final, que termina a música.
 */
export const TRAILER_TRACK = { src: '/audio/trailer-halo.mp3', credit: '“Halo”, de Elliptik' };
const BAR = 240 / 135, BEAT = BAR / 4;
const DROP = 3.562; // onde o drop cai dentro do arquivo
const BREAK = DROP + 16 * BAR, FINAL = DROP + 20 * BAR;
const END_TAIL = 0.7; // o que sobra de vídeo depois que a música para

export type TrackScene = { kind: string; dur: number };
// Duração de cada cena em tempos (múltiplos de 2, para os cortes caírem no tempo forte ou no meio do compasso).
const BEATS: Record<string, number> = { intro: 8, stats: 8, chapter: 8, moment: 6, people: 6 };
const MIN: Record<string, number> = { stats: 6, chapter: 6, moment: 4, people: 4 };

/** Ajusta as cenas ao compasso da música: o corpo fecha em frases de 4 compassos e o fim dura o final da música. */
export function fitScenesToTrack<S extends TrackScene>(scenes: S[]): S[] {
  if (!scenes.length) return scenes;
  const hasIntro = scenes[0].kind === 'intro', hasEnd = scenes.at(-1)!.kind === 'end';
  const body = scenes.slice(hasIntro ? 1 : 0, hasEnd ? -1 : undefined);
  const beats = body.map((s) => BEATS[s.kind] ?? 6);
  const sum = beats.reduce((a, b) => a + b, 0);
  // Fecha na frase de 4 compassos (16 tempos) mais próxima: encurta as cenas até o mínimo, ou alonga.
  const mins = body.map((s) => MIN[s.kind] ?? 4);
  const room = beats.reduce((a, b, i) => a + b - mins[i], 0);
  const down = sum % 16, upBy = sum ? (16 - down) % 16 : 0;
  if (sum >= 16 && down && down <= upBy && down <= room) {
    let cut = down;
    for (let i = beats.length - 1; cut > 0; i = (i - 1 + beats.length) % beats.length) if (beats[i] - 2 >= mins[i]) { beats[i] -= 2; cut -= 2; }
  } else {
    let pad = upBy;
    for (let i = 0; pad > 0; i = (i + 1) % beats.length, pad -= 2) beats[i] += 2;
  }
  const out = scenes.map((s) => ({ ...s }));
  if (hasIntro) out[0].dur = BEATS.intro * BEAT;
  body.forEach((_, i) => { out[i + (hasIntro ? 1 : 0)].dur = beats[i] * BEAT; });
  if (hasEnd) out[out.length - 1].dur = 4 * BAR + END_TAIL;
  return out;
}

let cached: Promise<ArrayBuffer> | null = null;
/** Baixa o trecho uma vez só (a decodificação é por AudioContext). */
export function fetchTrailerTrack(): Promise<ArrayBuffer> {
  cached ??= fetch(TRAILER_TRACK.src).then((r) => { if (!r.ok) throw new Error('trilha'); return r.arrayBuffer(); }).catch((e) => { cached = null; throw e; });
  return cached;
}

/**
 * Agenda a trilha para cenas já ajustadas por fitScenesToTrack. Devolve o instante (no relógio do áudio) em que
 * o vídeo começa, para os quadros seguirem o mesmo relógio, e uma função para parar.
 */
export function playTrailerTrack(ctx: BaseAudioContext, dest: AudioNode, buf: AudioBuffer, scenes: TrackScene[], start = ctx.currentTime + 0.05): { start: number; stop: () => void } {
  const total = scenes.reduce((a, s) => a + s.dur, 0);
  const intro = scenes[0]?.kind === 'intro' ? scenes[0].dur : 0;
  const endLen = scenes.at(-1)?.kind === 'end' ? scenes.at(-1)!.dur : 0;
  const bodyBars = Math.round((total - intro - endLen) / BAR);
  // Corpo longo: drop e depois a quebra antes do "ZEROU". Curto: drop direto até o golpe final.
  const useBreak = bodyBars >= 12;
  const dropBars = useBreak ? bodyBars - 4 : bodyBars;
  const cut = start + intro + dropBars * BAR; // onde a música salta (sempre numa virada de 4 compassos)
  const out = ctx.createGain(); out.gain.value = 0.95; out.connect(dest);
  const srcs: AudioBufferSourceNode[] = [];
  const play = (offset: number, at: number, until: number | null, fadeIn: number, fadeOut: number, loop = false) => {
    const g = ctx.createGain(); g.connect(out);
    g.gain.setValueAtTime(fadeIn ? 0.0001 : 1, at); if (fadeIn) g.gain.exponentialRampToValueAtTime(1, at + fadeIn);
    if (until !== null) { g.gain.setValueAtTime(1, until - fadeOut); g.gain.linearRampToValueAtTime(0.0001, until); }
    const s = ctx.createBufferSource(); s.buffer = buf; s.connect(g);
    if (loop) { s.loop = true; s.loopStart = DROP; s.loopEnd = BREAK; } // o drop repete em frases de 16 compassos
    s.start(at, Math.max(0, offset)); if (until !== null) s.stop(until + 0.02);
    srcs.push(s);
  };
  const offStart = DROP - intro; // a abertura é a subida; o drop entra com os números
  const nextOffset = useBreak ? BREAK : FINAL;
  if (dropBars === 16 && useBreak) {
    play(offStart, start, null, 0.08, 0); // sem corte: a música segue inteira até o fim
  } else {
    play(offStart, start, cut + 0.012, 0.08, 0.012, dropBars > 16);
    play(nextOffset, cut, null, 0.008, 0);
  }
  return { start, stop: () => srcs.forEach((s) => { try { s.stop(); } catch { /* já parou */ } }) };
}
