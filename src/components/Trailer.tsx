/**
 * Trailer da História (J7): o navegador desenha as cenas num canvas e grava em vídeo (MediaRecorder), com a
 * trilha do WinnerZ (lib/trailerTrack) mixada pelo Web Audio. Nada vai para o servidor. Vertical (stories) ou horizontal.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { planTrailer, trailerLength, type Scene } from '../lib/trailer';
import { fetchTrailerTrack, fitScenesToTrack, playTrailerTrack, TRAILER_TRACK } from '../lib/trailerTrack';
import { Sheet } from './Sheet';
import { Icon } from './Icon';
import { track } from '../lib/track';
import type { Game, History } from '../data/types';

type Fmt = 'vertical' | 'horizontal';
const SIZE: Record<Fmt, [number, number]> = { vertical: [1080, 1920], horizontal: [1920, 1080] };
const FPS = 30;

function load(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((ok) => {
    const i = new Image();
    if (/^https?:/.test(src) && !src.startsWith(location.origin)) i.crossOrigin = 'anonymous';
    i.onload = () => ok(i); i.onerror = () => ok(null);
    i.src = src;
  });
}
const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
function cover(g: CanvasRenderingContext2D, im: HTMLImageElement, W: number, H: number, zoom: number, dx = 0) {
  const k = Math.max(W / im.width, H / im.height) * zoom, w = im.width * k, h = im.height * k;
  g.drawImage(im, (W - w) / 2 + dx, (H - h) / 2, w, h);
}
function wrap(g: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = []; let cur = '';
  for (const w of text.split(/\s+/)) { const t = cur ? `${cur} ${w}` : w; if (g.measureText(t).width > max && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur);
  return out;
}

type Item = { text: string; font: (sz: number) => string; size: number; color: string; gap?: number; maxLines?: number; maxW?: number; scale?: number };

/** Ajusta o tamanho para caber em maxLines linhas (e na largura) e devolve as linhas já quebradas. */
function fit(g: CanvasRenderingContext2D, it: Item, maxW: number): { lines: string[]; size: number } {
  let size = it.size;
  for (;;) {
    g.font = it.font(size);
    const lines = wrap(g, it.text, maxW);
    const widest = Math.max(...lines.map((l) => g.measureText(l).width));
    if ((lines.length <= (it.maxLines ?? 9) && widest <= maxW) || size <= it.size * 0.45) return { lines: lines.slice(0, it.maxLines ?? 9), size };
    size *= 0.92;
  }
}

/** Empilha textos de cima para baixo, sem sobrepor, centrados (ou encostados no pé) dentro da faixa [top, bottom]. */
function stack(g: CanvasRenderingContext2D, items: Item[], x: number, top: number, bottom: number, anchor: 'center' | 'end' | 'start', maxW: number, dy = 0) {
  const laid = items.map((it) => ({ it, ...fit(g, it, it.maxW ?? maxW) }));
  const lh = (sz: number) => sz * 1.12;
  const height = laid.reduce((a, l, i) => a + (i ? l.it.gap ?? 0 : 0) + l.lines.length * lh(l.size), 0);
  let y = anchor === 'start' ? top : anchor === 'end' ? bottom - height : top + (bottom - top - height) / 2;
  laid.forEach((l, i) => {
    if (i) y += l.it.gap ?? 0;
    g.font = l.it.font(l.size); g.fillStyle = l.it.color;
    l.lines.forEach((line) => {
      const base = y + l.size * 0.86 + dy;
      if (l.it.scale && l.it.scale !== 1) { g.save(); g.translate(x, base - l.size * 0.35); g.scale(l.it.scale, l.it.scale); g.fillText(line, 0, l.size * 0.35); g.restore(); }
      else g.fillText(line, x, base);
      y += lh(l.size);
    });
  });
  return y + dy;
}

/** Desenha o quadro do instante t (em segundos). As medidas partem do lado menor (1080), para os dois formatos. */
function frame(g: CanvasRenderingContext2D, W: number, H: number, scenes: Scene[], imgs: Map<string, HTMLImageElement | null>, logo: HTMLImageElement | null, t: number) {
  let acc = 0, i = 0;
  while (i < scenes.length - 1 && t >= acc + scenes[i].dur) { acc += scenes[i].dur; i++; }
  const sc = scenes[i], p = Math.min(1, (t - acc) / sc.dur), u = Math.min(W, H) / 1080, vert = H > W;
  g.fillStyle = '#07080A'; g.fillRect(0, 0, W, H);
  const mono = (sz: number) => `500 ${sz * u}px "IBM Plex Mono", monospace`;
  const bold = (sz: number) => `800 ${sz * u}px "Archivo", sans-serif`;
  const reg = (sz: number) => `400 ${sz * u}px "Archivo", sans-serif`;
  const serif = (sz: number) => `italic 300 ${sz * u}px Georgia, serif`;
  const textW = vert ? W - 140 * u : Math.min(W - 240 * u, 1500 * u);
  const draw = (s: Scene, alpha: number, local: number) => {
    g.save(); g.globalAlpha = alpha;
    const bg = s.image ? imgs.get(s.image) : null;
    if (bg) {
      g.save();
      if (s.kind === 'moment') g.filter = 'blur(28px) brightness(0.45)';
      cover(g, bg, W, H, 1.06 + local * 0.1, -local * 40 * u);
      g.restore();
    }
    const sh = g.createLinearGradient(0, 0, 0, H);
    sh.addColorStop(0, 'rgba(7,8,10,0.6)'); sh.addColorStop(0.4, 'rgba(7,8,10,0.38)'); sh.addColorStop(1, 'rgba(7,8,10,0.94)');
    g.fillStyle = sh; g.fillRect(0, 0, W, H);
    if (s.kind !== 'moment') { g.fillStyle = 'rgba(7,8,10,0.22)'; g.fillRect(0, 0, W, H); }
    const inT = ease(local * 3), y0 = (1 - inT) * 40 * u;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 18 * u;
    g.globalAlpha = alpha * inT;
    if (s.kind === 'intro') {
      stack(g, [
        { text: 'W I N N E R Z   ·   J O R N A D A', font: mono, size: 30, color: '#FFB25B' },
        { text: s.title.toUpperCase(), font: bold, size: vert ? 104 : 96, color: '#F2F4F6', gap: 26 * u, maxLines: vert ? 3 : 2 },
        { text: s.sub, font: reg, size: 38, color: '#C9CED4', gap: 30 * u, maxLines: 2 },
      ], W / 2, H * 0.45, H - (vert ? 170 : 110) * u, 'end', textW, y0);
    } else if (s.kind === 'stats') {
      const n = s.lines.length, cols = vert ? 1 : n;
      s.lines.forEach(([big, small], k) => {
        const a = ease(local * 3 - k * 0.35); g.globalAlpha = alpha * a;
        const cx = vert ? W / 2 : (W / cols) * (k + 0.5);
        const top = vert ? H * 0.2 + (H * 0.6 / n) * k : H * 0.32, bottom = vert ? top + H * 0.6 / n : H * 0.72;
        stack(g, [
          { text: big, font: bold, size: n > 3 && !vert ? 130 : 150, color: '#F2F4F6', maxLines: 1 },
          { text: small.toUpperCase(), font: mono, size: 34, color: '#FFB25B', gap: 10 * u, maxLines: 1 },
        ], cx, top, bottom, 'center', vert ? textW : W / cols - 60 * u, (1 - a) * 30 * u);
      });
    } else if (s.kind === 'chapter') {
      stack(g, [
        { text: ['I', 'II', 'III', 'IV', 'V'][s.n - 1] ?? String(s.n), font: serif, size: vert ? 150 : 120, color: '#FFE2B8' },
        { text: `CAPÍTULO ${s.n}`, font: mono, size: 30, color: '#FFB25B', gap: 6 * u },
        { text: s.name.toUpperCase(), font: bold, size: vert ? 84 : 76, color: '#F2F4F6', gap: 30 * u, maxLines: 2 },
        { text: s.line, font: reg, size: 38, color: '#E6E9ED', gap: 26 * u, maxLines: 3, maxW: vert ? W - 200 * u : Math.min(W - 360 * u, 1300 * u) },
      ], W / 2, H * 0.14, H * 0.9, 'center', textW, y0);
    } else if (s.kind === 'moment') {
      const im = imgs.get(s.image);
      if (im) {
        const ratio = im.height / im.width;
        let fw: number, fh: number, fx: number, fy: number;
        if (vert) { fw = W * 0.82; fh = Math.min(fw * ratio, H * 0.48); fx = (W - fw) / 2; fy = H * 0.16; }
        else { fh = Math.min(H * 0.66, W * 0.46 * ratio); fw = Math.min(W * 0.46, fh / ratio); fx = W * 0.07 + (W * 0.46 - fw) / 2; fy = (H - fh - 92 * u) / 2; }
        fy += y0;
        const cx = fx + fw / 2;
        g.save(); g.shadowBlur = 40 * u; g.translate(cx, fy + fh / 2); g.rotate((-1.5 + local * 2) * Math.PI / 180); g.translate(-cx, -(fy + fh / 2));
        g.fillStyle = '#F6EEDC'; g.fillRect(fx - 18 * u, fy - 18 * u, fw + 36 * u, fh + 110 * u);
        g.shadowBlur = 0;
        const k = Math.max(fw / im.width, fh / im.height) * (1.02 + local * 0.05), w = im.width * k, h = im.height * k;
        g.save(); g.beginPath(); g.rect(fx, fy, fw, fh); g.clip(); g.drawImage(im, fx + (fw - w) / 2, fy + (fh - h) / 2, w, h); g.restore();
        g.fillStyle = '#2b241f'; g.font = `700 ${40 * u}px "Archivo", sans-serif`; g.fillText(s.when, cx, fy + fh + 66 * u);
        g.restore();
        const cap: Item = { text: s.caption, font: reg, size: 46, color: '#F2F4F6', maxLines: vert ? 4 : 6 };
        if (vert) stack(g, [cap], W / 2, fy + fh + 150 * u, H - 120 * u, 'start', W - 180 * u);
        else { g.textAlign = 'left'; stack(g, [cap], W * 0.6, H * 0.15, H * 0.85, 'center', W * 0.34); }
      }
    } else if (s.kind === 'people') {
      stack(g, [
        { text: 'JOGADO COM', font: mono, size: 32, color: '#FFB25B' },
        ...s.names.map((n, k): Item => ({ text: n.toUpperCase(), font: bold, size: vert ? 88 : 76, color: '#F2F4F6', gap: (k ? 4 : 30) * u, maxLines: 1 })),
      ], W / 2, H * 0.15, H * 0.88, 'center', textW, y0);
    } else if (s.kind === 'end') {
      const lw = (vert ? 240 : 170) * u, lh = logo ? lw * (logo.height / logo.width) : 0, ly = (vert ? 170 : 70) * u;
      if (logo) { g.save(); g.shadowBlur = 0; g.drawImage(logo, (W - lw) / 2, ly, lw, lh); g.restore(); }
      stack(g, [
        { text: s.done ? 'ZEROU' : 'CONTINUA', font: bold, size: vert ? 210 : 180, color: s.done ? '#E2BE84' : '#FFB25B', maxLines: 1, scale: 0.9 + ease(local * 2) * 0.1 },
        { text: s.title.toUpperCase(), font: bold, size: vert ? 60 : 54, color: '#F2F4F6', gap: 34 * u, maxLines: 2 },
        { text: s.when, font: reg, size: 38, color: '#C9CED4', gap: 26 * u, maxLines: 1 },
      ], W / 2, ly + lh + 40 * u, H - (vert ? 220 : 140) * u, 'center', textW);
      g.fillStyle = '#9AA1AA'; g.font = mono(30); g.fillText('winnerz.com.br', W / 2, H - (vert ? 110 : 60) * u);
    }
    g.restore();
  };
  // Troca de cena com fusão no último meio segundo.
  const fade = 0.5, left = sc.dur - (t - acc);
  draw(sc, 1, p);
  if (left < fade && scenes[i + 1]) draw(scenes[i + 1], 1 - left / fade, 0);
  // Barra fina de progresso no pé.
  const total = trailerLength(scenes);
  g.fillStyle = 'rgba(255,178,91,0.9)'; g.fillRect(0, H - 6 * u, W * Math.min(1, t / total), 6 * u);
}

function pickMime(): string {
  const opts = ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return opts.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) ?? '';
}

export function TrailerButton({ game, history, className = 'btn ghost lg' }: { game: Game; history: History; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}><Icon name="play" size={14} />Gerar o trailer</button>
      {open && <TrailerSheet game={game} history={history} onClose={() => setOpen(false)} />}
    </>
  );
}

function TrailerSheet({ game, history, onClose }: { game: Game; history: History; onClose: () => void }) {
  const s = useStore((x) => x);
  const images = useMemo(() => [...new Set([game.backdrop, ...(game.artworks ?? []), ...(game.screenshots ?? []), game.cover].filter((x): x is string => !!x))], [game]);
  // As cenas seguem o compasso da trilha (os cortes caem no tempo da música).
  const scenes = useMemo(() => fitScenesToTrack(planTrailer(s, history.id, game, images)), [s, history.id, game, images]);
  const [fmt, setFmt] = useState<Fmt>('vertical');
  const [music, setMusic] = useState(true);
  const [state, setState] = useState<'pronto' | 'carregando' | 'gravando' | 'feito' | 'erro'>('pronto');
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState('');
  const [err, setErr] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const blob = useRef<Blob | null>(null);
  const stop = useRef<() => void>(() => {});
  const total = trailerLength(scenes);
  const mime = useMemo(pickMime, []);
  const supported = !!mime && typeof HTMLCanvasElement !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype;
  const assets = useRef<{ imgs: Map<string, HTMLImageElement | null>; logo: HTMLImageElement | null } | null>(null);

  const prepare = async () => {
    if (assets.current) return assets.current;
    await Promise.all([document.fonts?.load('800 64px "Archivo"'), document.fonts?.load('400 32px "Archivo"'), document.fonts?.load('500 28px "IBM Plex Mono"')].map((p) => p?.catch(() => null)));
    const srcs = [...new Set(scenes.flatMap((x) => ('image' in x && x.image ? [x.image] : [])))];
    const loaded = await Promise.all(srcs.map(load));
    const imgs = new Map(srcs.map((src, i) => [src, loaded[i]]));
    fetchTrailerTrack().catch(() => null); // já deixa a trilha baixando
    assets.current = { imgs, logo: await load('/brand/forjado.svg') };
    return assets.current;
  };

  // Primeiro quadro como prévia.
  useEffect(() => {
    let live = true;
    (async () => {
      const a = await prepare(); if (!live || !canvas.current) return;
      const [W, H] = SIZE[fmt]; canvas.current.width = W; canvas.current.height = H;
      frame(canvas.current.getContext('2d')!, W, H, scenes, a.imgs, a.logo, 1.2);
    })();
    return () => { live = false; };
  }, [fmt, scenes]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { stop.current(); if (url) URL.revokeObjectURL(url); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const record = async () => {
    setErr(''); setState('carregando');
    // O AudioContext nasce aqui, ainda dentro do toque, para o navegador deixar tocar.
    const actx = music ? new AudioContext() : null;
    try {
      const a = await prepare();
      let tune: AudioBuffer | null = null;
      if (actx) {
        try { tune = await actx.decodeAudioData((await fetchTrailerTrack()).slice(0)); }
        catch { setErr('A trilha não carregou agora; o vídeo vai sem música.'); }
        await actx.resume().catch(() => null);
      }
      const c = canvas.current!; const [W, H] = SIZE[fmt]; c.width = W; c.height = H;
      const g = c.getContext('2d')!;
      frame(g, W, H, scenes, a.imgs, a.logo, 0);
      const stream = c.captureStream(FPS);
      let stopAudio = () => {};
      let audioStart = -1;
      if (actx && tune && actx.state === 'running') {
        const dest = actx.createMediaStreamDestination();
        const p = playTrailerTrack(actx, dest, tune, scenes);
        stopAudio = p.stop; audioStart = p.start;
        dest.stream.getAudioTracks().forEach((tr) => stream.addTrack(tr));
      }
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise<void>((ok) => { rec.onstop = () => ok(); });
      rec.start(500);
      setState('gravando'); track('jornada.trailer');
      const t0 = performance.now();
      let raf = 0, stopped = false;
      const tick = () => {
        // Com música, os quadros seguem o relógio do áudio (assim os cortes ficam colados na batida).
        const t = actx && audioStart >= 0 ? Math.max(0, actx.currentTime - audioStart) : (performance.now() - t0) / 1000;
        frame(g, W, H, scenes, a.imgs, a.logo, Math.min(t, total));
        setProgress(Math.min(1, t / total));
        if (t >= total + 0.3) { if (!stopped) { stopped = true; rec.stop(); } return; }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      stop.current = () => { cancelAnimationFrame(raf); if (!stopped && rec.state !== 'inactive') { stopped = true; rec.stop(); } stopAudio(); actx?.close().catch(() => null); };
      await done;
      stopAudio(); actx?.close().catch(() => null);
      const b = new Blob(chunks, { type: mime.split(';')[0] });
      blob.current = b;
      setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(b); });
      setState('feito');
    } catch (e) {
      actx?.close().catch(() => null);
      setErr(e instanceof Error && /secur|taint/i.test(e.message) ? 'Uma das imagens não permitiu gravar o vídeo. Tente de novo; se continuar, avise a administração.' : 'Não deu para gravar o vídeo neste navegador.');
      setState('erro');
    }
  };
  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  const fileName = `winnerz-trailer-${game.slug}.${ext}`;
  const share = async () => {
    if (!blob.current) return;
    const file = new File([blob.current], fileName, { type: blob.current.type });
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text: `Minha História com ${game.title}` }); return; } catch { /* cancelado */ } }
    const a = document.createElement('a'); a.href = url; a.download = fileName; a.click();
  };

  return (
    <Sheet title="Trailer da sua História" onClose={() => { stop.current(); onClose(); }} wide>
      {!supported ? (
        <p className="muted">Este navegador não grava vídeo a partir da página. No computador, o Chrome, o Edge e o Firefox gravam; no iPhone, use o Safari atualizado.</p>
      ) : (
        <div className={`trailer trailer--${fmt}`}>
          <div className="trailer__stage">
            {state === 'feito' && url ? <video src={url} controls playsInline className="trailer__video" /> : <canvas ref={canvas} className="trailer__canvas" aria-label="Prévia do trailer" />}
            {state === 'gravando' && <div className="trailer__bar" aria-hidden="true"><i style={{ width: `${progress * 100}%` }} /></div>}
          </div>
          <div className="trailer__opts">
            <p className="muted">{Math.round(total)} segundos, montados só com o que você registrou: {scenes.filter((x) => x.kind === 'chapter').length} {scenes.filter((x) => x.kind === 'chapter').length === 1 ? 'capítulo' : 'capítulos'} e {scenes.filter((x) => x.kind === 'moment').length} {scenes.filter((x) => x.kind === 'moment').length === 1 ? 'foto' : 'fotos'}.</p>
            <div className="finish__label">Formato</div>
            <div className="chips" role="group" aria-label="Formato">
              <button type="button" className="chip" aria-pressed={fmt === 'vertical'} disabled={state === 'gravando'} onClick={() => { setFmt('vertical'); setState('pronto'); }}>Vertical (stories)</button>
              <button type="button" className="chip" aria-pressed={fmt === 'horizontal'} disabled={state === 'gravando'} onClick={() => { setFmt('horizontal'); setState('pronto'); }}>Horizontal</button>
            </div>
            <label className="share-card__check"><input type="checkbox" checked={music} disabled={state === 'gravando'} onChange={(e) => setMusic(e.target.checked)} /> Com trilha ({TRAILER_TRACK.credit})</label>
            {state === 'gravando' ? (
              <p className="trailer__rec" role="status"><span className="session-pill__dot" aria-hidden="true" /> Gravando… {Math.round(progress * 100)}%. Deixe esta aba aberta e na frente.</p>
            ) : state === 'carregando' ? (
              <p className="muted" role="status">Preparando as imagens…</p>
            ) : null}
            {err && <p className="form-error" role="alert">{err}</p>}
            <div className="sheet__actions">
              {state === 'feito' ? (
                <>
                  <button className="btn quiet" onClick={() => setState('pronto')}>Gravar de novo</button>
                  <button className="btn primary lg" onClick={share}>{typeof navigator.share === 'function' ? 'Compartilhar' : 'Baixar o vídeo'}</button>
                </>
              ) : (
                <button className="btn primary lg" disabled={state === 'gravando' || state === 'carregando'} onClick={record}>{state === 'gravando' ? 'Gravando…' : 'Gravar o trailer'}</button>
              )}
            </div>
            <p className="faint">O vídeo é feito no seu aparelho; nada é enviado. Só o que aparece nele sai do site quando você compartilha.</p>
          </div>
        </div>
      )}
    </Sheet>
  );
}
