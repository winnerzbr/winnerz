/**
 * Trailer da História (J7): o navegador desenha as cenas num canvas e grava em vídeo (MediaRecorder), com uma
 * trilha suave gerada na hora (Web Audio). Nada vai para o servidor. Vertical (stories) ou horizontal.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { planTrailer, trailerLength, type Scene } from '../lib/trailer';
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

/** Desenha o quadro do instante t (em segundos). */
function frame(g: CanvasRenderingContext2D, W: number, H: number, scenes: Scene[], imgs: Map<string, HTMLImageElement | null>, logo: HTMLImageElement | null, t: number) {
  let acc = 0, i = 0;
  while (i < scenes.length - 1 && t >= acc + scenes[i].dur) { acc += scenes[i].dur; i++; }
  const sc = scenes[i], p = Math.min(1, (t - acc) / sc.dur), u = W / 1080, vert = H > W;
  g.fillStyle = '#07080A'; g.fillRect(0, 0, W, H);
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
    sh.addColorStop(0, 'rgba(7,8,10,0.55)'); sh.addColorStop(0.45, 'rgba(7,8,10,0.25)'); sh.addColorStop(1, 'rgba(7,8,10,0.92)');
    g.fillStyle = sh; g.fillRect(0, 0, W, H);
    const inT = ease(local * 3), y0 = (1 - inT) * 40 * u;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const mono = (sz: number) => `500 ${sz * u}px "IBM Plex Mono", monospace`;
    const bold = (sz: number) => `800 ${sz * u}px "Archivo", sans-serif`;
    const reg = (sz: number) => `400 ${sz * u}px "Archivo", sans-serif`;
    g.globalAlpha = alpha * inT;
    if (s.kind === 'intro') {
      g.fillStyle = '#FFB25B'; g.font = mono(30); g.fillText('W I N N E R Z   ·   J O R N A D A', W / 2, H * 0.62 + y0);
      g.fillStyle = '#F2F4F6'; g.font = bold(vert ? 104 : 96);
      wrap(g, s.title.toUpperCase(), W - 160 * u).slice(0, 3).forEach((l, k) => g.fillText(l, W / 2, H * 0.62 + 110 * u + k * 108 * u + y0));
      g.fillStyle = '#C9CED4'; g.font = reg(38); g.fillText(s.sub, W / 2, H * (vert ? 0.86 : 0.93) + y0);
    } else if (s.kind === 'stats') {
      const n = s.lines.length, cols = vert ? 1 : n, rows = vert ? n : 1;
      s.lines.forEach(([big, small], k) => {
        const cx = vert ? W / 2 : (W / cols) * (k + 0.5), cy = vert ? H * 0.25 + (H * 0.55 / rows) * (k + 0.5) : H * 0.55;
        const a = ease(local * 3 - k * 0.35); g.globalAlpha = alpha * a;
        g.fillStyle = '#F2F4F6'; g.font = bold(150); g.fillText(big, cx, cy + (1 - a) * 30 * u);
        g.fillStyle = '#FFB25B'; g.font = mono(34); g.fillText(small.toUpperCase(), cx, cy + 60 * u);
      });
    } else if (s.kind === 'chapter') {
      g.fillStyle = '#FFE2B8'; g.font = `italic 300 ${150 * u}px Georgia, serif`; g.fillText(['I', 'II', 'III', 'IV', 'V'][s.n - 1] ?? String(s.n), W / 2, H * 0.5 + y0);
      g.fillStyle = '#FFB25B'; g.font = mono(30); g.fillText(`CAPÍTULO ${s.n}`, W / 2, H * 0.5 + 80 * u + y0);
      g.fillStyle = '#F2F4F6'; g.font = bold(84);
      const nl = wrap(g, s.name.toUpperCase(), W - 160 * u).slice(0, 2);
      nl.forEach((l, k) => g.fillText(l, W / 2, H * 0.5 + 190 * u + k * 90 * u + y0));
      g.fillStyle = '#E6E9ED'; g.font = reg(38);
      wrap(g, s.line, W - 220 * u).slice(0, 3).forEach((l, k) => g.fillText(l, W / 2, H * 0.5 + 220 * u + nl.length * 90 * u + k * 52 * u + y0));
    } else if (s.kind === 'moment') {
      const im = imgs.get(s.image);
      if (im) {
        const fw = vert ? W * 0.82 : W * 0.5, fh = Math.min(fw * (im.height / im.width), H * (vert ? 0.5 : 0.62)), fx = (W - fw) / 2, fy = H * (vert ? 0.22 : 0.12) + y0;
        g.save(); g.translate(W / 2, fy + fh / 2); g.rotate((-1.5 + local * 2) * Math.PI / 180); g.translate(-W / 2, -(fy + fh / 2));
        g.fillStyle = '#F6EEDC'; g.fillRect(fx - 18 * u, fy - 18 * u, fw + 36 * u, fh + 110 * u);
        const k = Math.max(fw / im.width, fh / im.height) * (1.02 + local * 0.05), w = im.width * k, h = im.height * k;
        g.save(); g.beginPath(); g.rect(fx, fy, fw, fh); g.clip(); g.drawImage(im, fx + (fw - w) / 2, fy + (fh - h) / 2, w, h); g.restore();
        g.fillStyle = '#2b241f'; g.font = `700 ${40 * u}px "Archivo", sans-serif`; g.fillText(s.when, W / 2, fy + fh + 66 * u);
        g.restore();
        g.fillStyle = '#F2F4F6'; g.font = reg(44);
        wrap(g, s.caption, W - 200 * u).slice(0, 3).forEach((l, k2) => g.fillText(l, W / 2, fy + fh + 200 * u + k2 * 58 * u));
      }
    } else if (s.kind === 'people') {
      g.fillStyle = '#FFB25B'; g.font = mono(32); g.fillText('JOGADO COM', W / 2, H * 0.45 + y0);
      g.fillStyle = '#F2F4F6'; g.font = bold(88);
      s.names.forEach((n, k) => g.fillText(n.toUpperCase(), W / 2, H * 0.45 + 120 * u + k * 100 * u + y0));
    } else if (s.kind === 'end') {
      g.fillStyle = s.done ? '#E2BE84' : '#FFB25B'; g.font = bold(vert ? 210 : 190);
      g.save(); const sc2 = 0.9 + ease(local * 2) * 0.1; g.translate(W / 2, H * 0.48); g.scale(sc2, sc2); g.fillText(s.done ? 'ZEROU' : 'CONTINUA', 0, 0); g.restore();
      g.fillStyle = '#F2F4F6'; g.font = bold(56); wrap(g, s.title.toUpperCase(), W - 160 * u).slice(0, 2).forEach((l, k) => g.fillText(l, W / 2, H * 0.48 + 110 * u + k * 64 * u));
      g.fillStyle = '#C9CED4'; g.font = reg(38); g.fillText(s.when, W / 2, H * 0.48 + 260 * u);
      if (logo) { const lw = 200 * u, lh = lw * (logo.height / logo.width); g.drawImage(logo, (W - lw) / 2, H - lh - 150 * u, lw, lh); }
      g.fillStyle = '#9AA1AA'; g.font = mono(30); g.fillText('winnerz.com.br', W / 2, H - 80 * u);
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

/** Trilha: um acorde suave que muda a cada cena (nada de música de terceiros). */
function soundtrack(ctx: AudioContext, dest: AudioNode, scenes: Scene[]) {
  const master = ctx.createGain(); master.gain.value = 0; master.connect(dest);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(master);
  const CH = [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [164.81, 207.65, 246.94], [196, 246.94, 329.63]];
  const oscs = [0, 1, 2].map((k) => { const o = ctx.createOscillator(); o.type = k === 0 ? 'sine' : 'triangle'; const gg = ctx.createGain(); gg.gain.value = k === 0 ? 0.5 : 0.22; o.connect(gg); gg.connect(lp); o.start(); return o; });
  const now = ctx.currentTime;
  master.gain.linearRampToValueAtTime(0.16, now + 1.5);
  let at = now;
  scenes.forEach((s, i) => { const c = CH[i % CH.length]; oscs.forEach((o, k) => o.frequency.setTargetAtTime(c[k] / (k === 0 ? 2 : 1), at, 0.4)); at += s.dur; });
  master.gain.setTargetAtTime(0, now + trailerLength(scenes) - 1.2, 0.5);
  return () => oscs.forEach((o) => { try { o.stop(); } catch { /* já parou */ } });
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
  const scenes = useMemo(() => planTrailer(s, history.id, game, images), [s, history.id, game, images]);
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
    try {
      const a = await prepare();
      const c = canvas.current!; const [W, H] = SIZE[fmt]; c.width = W; c.height = H;
      const g = c.getContext('2d')!;
      frame(g, W, H, scenes, a.imgs, a.logo, 0);
      const stream = c.captureStream(FPS);
      let stopAudio = () => {};
      let actx: AudioContext | null = null;
      if (music) {
        actx = new AudioContext();
        const dest = actx.createMediaStreamDestination();
        stopAudio = soundtrack(actx, dest, scenes);
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
        const t = (performance.now() - t0) / 1000;
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
            <label className="share-card__check"><input type="checkbox" checked={music} disabled={state === 'gravando'} onChange={(e) => setMusic(e.target.checked)} /> Com trilha suave (gerada aqui)</label>
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
