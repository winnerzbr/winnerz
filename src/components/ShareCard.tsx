import { useEffect, useRef, useState } from 'react';
import type { Game, History } from '../data/types';
import { useStore } from '../data/store';
import { Sheet } from './Sheet';
import { useBackdrop } from './Backdrop';
import { formatScore, scaleMax } from '../lib/rating';
import { track } from '../lib/track';
import { whenLabel } from '../lib/dates';

const W = 1080, H = 1350;
const MONTHS = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const short = (iso: string) => { const d = new Date(iso); return `${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`; };

function load(src?: string): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((ok) => {
    const i = new Image();
    if (/^https?:/.test(src) && !src.startsWith(location.origin)) i.crossOrigin = 'anonymous';
    i.onload = () => ok(i); i.onerror = () => ok(null);
    i.src = src;
  });
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const k = Math.max(w / img.width, h / img.height);
  const sw = w / k, sh = h / k;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/); const lines: string[] = []; let cur = '';
  for (const w of words) { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > max && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  return lines;
}

/** Desenha o cartão. Sem foto de fundo (bloqueada ou ausente), usa só a cor; nada do perfil além do que está aqui. */
async function draw(canvas: HTMLCanvasElement, o: { game: Game; history: History; bg?: string; phrase: string; rating?: string; kicker: string }) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = W; canvas.height = H;
  await Promise.all([document.fonts?.load('800 expanded 64px "Archivo"'), document.fonts?.load('400 40px "Archivo"'), document.fonts?.load('500 28px "IBM Plex Mono"')].map((p) => p?.catch(() => null)));
  const [bg, cv, logo] = await Promise.all([load(o.bg), load(o.game.cover), load('/brand/forjado.svg')]);
  ctx.fillStyle = '#07080A'; ctx.fillRect(0, 0, W, H);
  if (bg) { ctx.globalAlpha = 0.55; cover(ctx, bg, 0, 0, W, H); ctx.globalAlpha = 1; }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(7,8,10,0.35)'); g.addColorStop(0.55, 'rgba(7,8,10,0.75)'); g.addColorStop(1, 'rgba(7,8,10,0.97)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // Capa
  const cw = 380, ch = 507, cx = (W - cw) / 2, cy = 110;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  ctx.fillStyle = '#14171B'; ctx.fillRect(cx, cy, cw, ch); ctx.restore();
  if (cv) cover(ctx, cv, cx, cy, cw, ch);
  ctx.strokeStyle = '#E2BE84'; ctx.lineWidth = 6; ctx.strokeRect(cx - 3, cy - 3, cw + 6, ch + 6);
  // Textos
  ctx.textAlign = 'center';
  let y = cy + ch + 92;
  ctx.fillStyle = '#FFB25B'; ctx.font = '500 26px "IBM Plex Mono", monospace';
  ctx.fillText(o.kicker.toUpperCase().split('').join(' '), W / 2, y);
  y += 96;
  ctx.fillStyle = '#F2F4F6'; ctx.font = '800 expanded 64px "Archivo", sans-serif';
  (ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'expanded';
  for (const line of wrap(ctx, o.game.title.toUpperCase(), W - 140).slice(0, 2)) { ctx.fillText(line, W / 2, y); y += 72; }
  (ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'normal';
  y += 16;
  ctx.fillStyle = '#C9CED4'; ctx.font = '400 32px "Archivo", sans-serif';
  // Datas com a precisão que você informou (nada de dia exato onde só há mês ou ano).
  const lbl = (iso: string, p?: History['startedPrecision']) => (!p || p === 'dia' ? short(iso) : whenLabel(iso, p));
  const end = o.history.completedAt ?? new Date().toISOString();
  const endP = o.history.completedAt ? o.history.completedPrecision : 'dia';
  const dates = endP === 'desconhecida' ? '' : o.history.startedPrecision === 'desconhecida' ? `Zerado em ${lbl(end, endP)}` : `De ${lbl(o.history.startedAt, o.history.startedPrecision)} a ${lbl(end, endP)}`;
  y += 4;
  if (dates) { ctx.fillText(dates, W / 2, y); y += 52; }
  if (o.rating) { ctx.fillStyle = '#E2BE84'; ctx.fillText(o.rating, W / 2, y); y += 52; }
  if (o.phrase.trim()) {
    ctx.fillStyle = '#E6E9ED'; ctx.font = '400 40px "Archivo", sans-serif';
    y += 18;
    for (const line of wrap(ctx, `“${o.phrase.trim()}”`, W - 200).slice(0, 3)) { ctx.fillText(line, W / 2, y); y += 54; }
  }
  // Rodapé
  if (logo) { const lw = 140, lh = lw * (logo.height / logo.width); ctx.drawImage(logo, (W - lw) / 2, H - lh - 70, lw, lh); }
  ctx.fillStyle = '#9AA1AA'; ctx.font = '500 22px "IBM Plex Mono", monospace';
  ctx.fillText('winnerz.com.br', W / 2, H - 40);
}

/** Cartão para compartilhar ao zerar: capa, datas, sua nota e uma frase sua. Só isso sai do site. */
export function ShareCardButton({ game, history, className = 'btn ghost lg' }: { game: Game; history: History; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>Cartão para compartilhar</button>
      {open && <ShareCardSheet game={game} history={history} onClose={() => setOpen(false)} />}
    </>
  );
}

function ShareCardSheet({ game, history, onClose }: { game: Game; history: History; onClose: () => void }) {
  const s = useStore((x) => x);
  const bg = useBackdrop(game);
  const review = s.reviews.find((r) => r.mine && r.gameId === game.id);
  const [phrase, setPhrase] = useState(review?.title ?? '');
  const [withRating, setWithRating] = useState(!!review);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(true);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const blob = useRef<Blob | null>(null);
  const kicker = history.ordinal > 1 ? `Zerado de novo: ${history.title}` : 'História concluída';

  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      setBusy(true);
      const c = canvas.current ?? (canvas.current = document.createElement('canvas'));
      await draw(c, { game, history, bg, phrase, rating: withRating && review ? `Sua nota: ${formatScore(review.rating.normalized, s.prefs.scale)} de ${scaleMax(s.prefs.scale)}` : undefined, kicker });
      const b = await new Promise<Blob | null>((ok) => { try { c.toBlob(ok, 'image/png'); } catch { ok(null); } });
      if (!alive) return;
      blob.current = b;
      setUrl((old) => { if (old) URL.revokeObjectURL(old); return b ? URL.createObjectURL(b) : ''; });
      setBusy(false);
    }, 250);
    return () => { alive = false; clearTimeout(t); };
  }, [phrase, withRating, bg]); // eslint-disable-line react-hooks/exhaustive-deps

  const fileName = `winnerz-${game.slug}.png`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const share = async () => {
    if (!blob.current) return;
    const file = new File([blob.current], fileName, { type: 'image/png' });
    track('jornada.cartao');
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text: `Zerei ${game.title}!` }); } catch { /* cancelado */ } }
    else { const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); }
  };

  return (
    <Sheet title="Cartão para compartilhar" onClose={onClose} labelId="share-card" wide>
      <div className="share-card">
        <div className="share-card__preview">{url ? <img src={url} alt={`Cartão de ${game.title}`} /> : <div className="share-card__wait">{busy ? 'Montando o cartão…' : 'Não consegui montar a imagem.'}</div>}</div>
        <div className="share-card__opts">
          <label className="finish__label" htmlFor="sc-phrase">Uma frase sua <span className="faint">(opcional)</span></label>
          <textarea id="sc-phrase" className="field" rows={3} maxLength={120} value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="Ex.: O melhor final que já vi." />
          {review && <label className="share-card__check"><input type="checkbox" checked={withRating} onChange={(e) => setWithRating(e.target.checked)} /> Mostrar a sua nota</label>}
          <p className="faint">Só o que aparece na imagem sai do site. Nada do seu perfil, coleção ou outras Jornadas.</p>
          <div className="sheet__actions">
            <button className="btn primary lg" disabled={!url} onClick={share}>{canShare ? 'Compartilhar' : 'Baixar imagem'}</button>
            {url && canShare && <a className="btn ghost" href={url} download={fileName}>Baixar</a>}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
