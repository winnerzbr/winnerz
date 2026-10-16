/**
 * Compartilhar um trecho da Jornada: um cartão (imagem) e, se você quiser, um link que mostra só aquele trecho.
 * Você escolhe se a foto e a nota vão junto. Nada do perfil, da coleção ou de outras Jornadas sai daqui.
 */
import { useEffect, useRef, useState } from 'react';
import type { Game, TimelineEvent } from '../data/types';
import { Sheet } from './Sheet';
import { useBackdrop } from './Backdrop';
import { load, cover, wrap } from './ShareCard';
import { snipApi, snipUrl, type Snip } from '../data/snipApi';
import { whenLabel } from '../lib/dates';
import { track } from '../lib/track';
import { useMyHandle } from './Moderation';

const W = 1080, H = 1350;
export const SNIP_KICKER: Record<string, string> = { momento: 'Momento', marco: 'Marco', inicio: 'Começo', sessao: 'Sessão', ponto: 'Ponto para voltar' };

export interface SnipCardData { kind: string; title: string; at: string; precision?: TimelineEvent['precision'] | null; dateLabel?: string | null; quote?: string | null; text?: string | null; photo?: string | null; game: { title: string; cover?: string | null; backdrop?: string | null }; handle?: string | null }

/** Desenha o cartão do trecho: a foto (ou a arte do jogo) de fundo, o tipo e a data, o título e a sua nota. */
export async function drawSnip(canvas: HTMLCanvasElement, o: SnipCardData) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = W; canvas.height = H;
  await Promise.all([document.fonts?.load('800 expanded 64px "Archivo"'), document.fonts?.load('400 40px "Archivo"'), document.fonts?.load('500 28px "IBM Plex Mono"')].map((p) => p?.catch(() => null)));
  const [photo, bg, cv, logo] = await Promise.all([load(o.photo ?? undefined), o.photo ? Promise.resolve(null) : load(o.game.backdrop ?? undefined), load(o.game.cover ?? undefined), load('/brand/forjado.svg')]);
  ctx.fillStyle = '#07080A'; ctx.fillRect(0, 0, W, H);
  if (photo) {
    // A foto ocupa a parte de cima inteira, sem cortar demais.
    cover(ctx, photo, 0, 0, W, 760);
    const fade = ctx.createLinearGradient(0, 520, 0, 780);
    fade.addColorStop(0, 'rgba(7,8,10,0)'); fade.addColorStop(1, 'rgba(7,8,10,1)');
    ctx.fillStyle = fade; ctx.fillRect(0, 520, W, 260);
  } else if (bg) {
    ctx.globalAlpha = 0.5; cover(ctx, bg, 0, 0, W, H); ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(7,8,10,0.3)'); g.addColorStop(0.5, 'rgba(7,8,10,0.8)'); g.addColorStop(1, 'rgba(7,8,10,0.97)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  let y = photo ? 800 : 260;
  ctx.textAlign = 'left';
  const X = 90;
  // Capa pequena e nome do jogo
  if (cv) {
    const cw = 96, ch = 128;
    cover(ctx, cv, X, y - 4, cw, ch);
    ctx.strokeStyle = '#E2BE84'; ctx.lineWidth = 3; ctx.strokeRect(X - 1.5, y - 5.5, cw + 3, ch + 3);
  }
  const tx = cv ? X + 126 : X;
  ctx.fillStyle = '#FFB25B'; ctx.font = '500 27px "IBM Plex Mono", monospace';
  const date = o.dateLabel || whenLabel(o.at, o.precision ?? 'dia');
  ctx.fillText(`${(SNIP_KICKER[o.kind] ?? 'Trecho').toUpperCase()} · ${date.toUpperCase()}`, tx, y + 30);
  ctx.fillStyle = '#C9CED4'; ctx.font = '600 38px "Archivo", sans-serif';
  for (const [n, line] of wrap(ctx, o.game.title, W - tx - X).slice(0, 2).entries()) ctx.fillText(line, tx, y + 84 + n * 44);
  y += 190;
  // Título do trecho
  ctx.fillStyle = '#F2F4F6'; ctx.font = '800 expanded 74px "Archivo", sans-serif';
  (ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'expanded';
  for (const line of wrap(ctx, o.title.toUpperCase(), W - 2 * X).slice(0, photo ? 2 : 3)) { ctx.fillText(line, X, y); y += 82; }
  (ctx as CanvasRenderingContext2D & { fontStretch?: string }).fontStretch = 'normal';
  const note = (o.quote || o.text || '').trim();
  if (note) {
    y += 24;
    ctx.fillStyle = '#E6E9ED'; ctx.font = '400 44px "Archivo", sans-serif';
    const max = Math.max(1, Math.floor((H - 200 - y) / 60));
    const lines = wrap(ctx, o.quote ? `“${note}”` : note, W - 2 * X);
    for (const [n, line] of lines.slice(0, max).entries()) { ctx.fillText(n === max - 1 && lines.length > max ? `${line.replace(/[.,;:!?”]*$/, '')}…` : line, X, y); y += 60; }
  }
  // Rodapé
  ctx.textAlign = 'left';
  if (logo) { const lw = 120, lh = lw * (logo.height / logo.width); ctx.drawImage(logo, X, H - lh - 64, lw, lh); }
  ctx.textAlign = 'right'; ctx.fillStyle = '#9AA1AA'; ctx.font = '500 22px "IBM Plex Mono", monospace';
  ctx.fillText(o.handle ? `@${o.handle} no winnerz.com.br` : 'winnerz.com.br', W - X, H - 72);
}

export function SnipShareSheet({ event, game, onClose }: { event: TimelineEvent; game: Game; onClose: () => void }) {
  const bg = useBackdrop(game);
  const hasPhoto = !!event.image;
  const hasNote = !!(event.quote || event.text);
  const [withPhoto, setWithPhoto] = useState(hasPhoto);
  const [withNote, setWithNote] = useState(hasNote);
  const [snip, setSnip] = useState<Snip | null | undefined>(undefined);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const blob = useRef<Blob | null>(null);
  const handle = useMyHandle() ?? null;

  useEffect(() => { snipApi.of(event.id).then((s) => { setSnip(s); if (s) { setWithPhoto(s.withPhoto && hasPhoto); setWithNote(s.withNote && hasNote); } }).catch(() => setSnip(null)); }, [event.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      const c = canvas.current ?? (canvas.current = document.createElement('canvas'));
      await drawSnip(c, { kind: event.kind, title: event.title, at: event.at, precision: event.precision, dateLabel: event.dateLabel, quote: withNote ? event.quote : null, text: withNote ? event.text : null, photo: withPhoto ? event.image : null, game: { title: game.title, cover: game.cover, backdrop: bg ?? game.backdrop }, handle });
      const b = await new Promise<Blob | null>((ok) => { try { c.toBlob(ok, 'image/png'); } catch { ok(null); } });
      if (!alive) return;
      blob.current = b;
      setUrl((old) => { if (old) URL.revokeObjectURL(old); return b ? URL.createObjectURL(b) : ''; });
    }, 200);
    return () => { alive = false; clearTimeout(t); };
  }, [withPhoto, withNote, bg, handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mudou a foto ou a nota com o link ligado: o link passa a mostrar igual ao cartão.
  const sync = async (p: boolean, n: boolean) => { if (!snip) return; try { setSnip(await snipApi.set(event.id, p, n)); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); } };
  const togglePhoto = (v: boolean) => { setWithPhoto(v); void sync(v, withNote); };
  const toggleNote = (v: boolean) => { setWithNote(v); void sync(withPhoto, v); };
  const linkOn = async () => {
    setBusy(true); setErr('');
    try { const s = await snipApi.set(event.id, withPhoto, withNote); setSnip(s); track('jornada.trecho.link'); await copy(s.token); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); } finally { setBusy(false); }
  };
  const linkOff = async () => {
    setBusy(true); setErr('');
    try { await snipApi.off(event.id); setSnip(null); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); } finally { setBusy(false); }
  };
  const copy = async (token: string) => { try { await navigator.clipboard.writeText(snipUrl(token)); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* sem área de transferência */ } };
  const fileName = `winnerz-${game.slug}-trecho.png`;
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const share = async () => {
    if (!blob.current) return;
    const file = new File([blob.current], fileName, { type: 'image/png' });
    track('jornada.trecho.cartao');
    if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], text: `${event.title} · ${game.title}`, ...(snip ? { url: snipUrl(snip.token) } : {}) }); } catch { /* cancelado */ } }
    else { const a = document.createElement('a'); a.href = url; a.download = fileName; a.click(); }
  };

  return (
    <Sheet title="Compartilhar este trecho" onClose={onClose} labelId="snip-share" wide>
      <div className="share-card">
        <div className="share-card__preview">{url ? <img src={url} alt={`Cartão de ${event.title}`} /> : <div className="share-card__wait">Montando o cartão…</div>}</div>
        <div className="share-card__opts">
          {hasPhoto && <label className="share-card__check"><input type="checkbox" checked={withPhoto} onChange={(e) => togglePhoto(e.target.checked)} /> Com a foto</label>}
          {hasNote && <label className="share-card__check"><input type="checkbox" checked={withNote} onChange={(e) => toggleNote(e.target.checked)} /> Com a sua nota</label>}
          <div className="sheet__actions">
            <button className="btn primary lg" disabled={!url} onClick={() => void share()}>{canShare ? 'Compartilhar imagem' : 'Baixar imagem'}</button>
            {url && canShare && <a className="btn ghost" href={url} download={fileName}>Baixar</a>}
          </div>
          <div className="snip-link">
            <h3 className="kicker">Link deste trecho</h3>
            {snip === undefined ? <p className="faint">…</p> : snip ? (
              <>
                <p className="muted">Quem abrir o link vê só este trecho{withPhoto && hasPhoto ? ', com a foto' : ''}{withNote && hasNote ? ' e a sua nota' : ''}. {snip.views ? `${snip.views} ${snip.views === 1 ? 'visita' : 'visitas'}.` : ''}</p>
                <div className="snip-link__row">
                  <input className="field" readOnly value={snipUrl(snip.token)} onFocus={(e) => e.currentTarget.select()} aria-label="Link do trecho" />
                  <button className="btn sm" onClick={() => void copy(snip.token)}>{copied ? 'Copiado' : 'Copiar'}</button>
                </div>
                <button className="linklike" disabled={busy} onClick={() => void linkOff()}>Desligar o link (quem tiver não abre mais)</button>
              </>
            ) : (
              <>
                <p className="muted">Um link que mostra só este trecho, mesmo com a sua Jornada fechada no perfil. Dá para desligar quando quiser.</p>
                <button className="btn ghost sm" disabled={busy} onClick={() => void linkOn()}>Criar link e copiar</button>
              </>
            )}
            {err && <p className="awards__error" role="alert">{err}</p>}
          </div>
          <p className="faint">Só o que aparece aqui sai do site. Nada do seu perfil, coleção ou outras Jornadas.</p>
        </div>
      </div>
    </Sheet>
  );
}
