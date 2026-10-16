/**
 * Trilha do trailer (J7): "Halo", de Elliptik (licenciada pelo WinnerZ para o site e as redes).
 * O arquivo public/audio/trailer-halo.mp3 é um recorte com dois trechos da música:
 *  - A (0 → 40,45 s): a subida e o drop, que cai em 3,6 s (quando a abertura termina e entram os números);
 *  - B (40,45 s → fim): o último golpe e o final da música, que entra junto com o "ZEROU" e termina sozinho.
 */
export const TRAILER_TRACK = { src: '/audio/trailer-halo.mp3', credit: '“Halo”, de Elliptik', drop: 3.6, aEnd: 40.45 };
export type TrackScene = { kind: string; dur: number };

let cached: Promise<ArrayBuffer> | null = null;
/** Baixa o recorte uma vez só (a decodificação é por AudioContext). */
export function fetchTrailerTrack(): Promise<ArrayBuffer> {
  cached ??= fetch(TRAILER_TRACK.src).then((r) => { if (!r.ok) throw new Error('trilha'); return r.arrayBuffer(); }).catch((e) => { cached = null; throw e; });
  return cached;
}

/** Agenda a trilha alinhada às cenas: o drop no fim da abertura e o final da música no "ZEROU". */
export function playTrailerTrack(ctx: BaseAudioContext, dest: AudioNode, buf: AudioBuffer, scenes: TrackScene[], start = ctx.currentTime): () => void {
  const T = TRAILER_TRACK;
  const total = scenes.reduce((a, s) => a + s.dur, 0);
  const intro = scenes[0]?.kind === 'intro' ? scenes[0].dur : 0;
  const endLen = scenes.at(-1)?.kind === 'end' ? scenes.at(-1)!.dur : 0;
  const tEnd = start + total - endLen;
  const out = ctx.createGain(); out.gain.value = 0.95; out.connect(dest);
  const play = (offset: number, at: number, until: number, fadeIn: number, fadeOut: number) => {
    const g = ctx.createGain(); g.connect(out);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(1, at + fadeIn);
    g.gain.setValueAtTime(1, Math.max(at + fadeIn, until - fadeOut)); g.gain.linearRampToValueAtTime(0, until);
    const s = ctx.createBufferSource(); s.buffer = buf; s.connect(g); s.start(at, offset); s.stop(until + 0.01);
    return s;
  };
  const offA = Math.max(0, T.drop - intro);
  const aMax = start + (T.aEnd - offA);
  const srcs = [play(offA, start, Math.min(endLen ? tEnd + 0.03 : start + total, aMax), 0.25, endLen ? 0.03 : 1.2)];
  if (endLen) srcs.push(play(T.aEnd, tEnd, start + total + 0.3, 0.01, 0.4));
  return () => srcs.forEach((s) => { try { s.stop(); } catch { /* já parou */ } });
}
