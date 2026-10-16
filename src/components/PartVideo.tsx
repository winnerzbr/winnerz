/**
 * Vídeos dos capítulos (C4): "Ver este trecho" abre o player do YouTube (versão sem cookies) no minuto certo,
 * coberto até a pessoa pedir (spoiler). Nada é carregado do YouTube antes do toque. Quem tem o jogo na Jornada pode
 * trocar o vídeo colando um link; a administração liga a playlist de detonado do canal WinnerZ.
 */
import { useState } from 'react';
import { videoApi, type VideoState } from '../data/videoApi';
import { clock, embedUrl, videosOf, watchUrl, type PartVideo } from '../lib/ytLink';
import type { OutlinePart } from '../lib/outline';
import { Sheet } from './Sheet';
import { Icon } from './Icon';

const FROM: Record<PartVideo['source'], string> = { canal: 'Detonado do canal WinnerZ', pessoa: 'Escolhido por quem joga', auto: 'Achado na busca do YouTube' };

/** O botão "Ver este trecho" (só aparece quando o item tem vídeo). */
export function PartVideoButton({ gameId, gameTitle, part, label, videos, small, onDark }: { gameId: string; gameTitle: string; part: OutlinePart | null | undefined; label: string; videos: VideoState | undefined; small?: boolean; onDark?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!part || !videosOf(videos?.videos, part.id).length) return null;
  return (
    <>
      <button type="button" className={`btn ${onDark ? 'ghost' : 'quiet'} sm pv-btn`} onClick={() => setOpen(true)}><Icon name="play" size={13} />{small ? 'Vídeo' : 'Ver este trecho'}</button>
      {open && <VideoSheet gameId={gameId} gameTitle={gameTitle} part={part} label={label} videos={videos} onClose={() => setOpen(false)} />}
    </>
  );
}

export function VideoSheet({ gameId, gameTitle, part, label, videos, onClose }: { gameId: string; gameTitle: string; part: OutlinePart; label: string; videos: VideoState | undefined; onClose: () => void }) {
  const list = videosOf(videos?.videos, part.id);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const v = list[Math.min(i, list.length - 1)];
  const mine = list.some((x) => x.source === 'pessoa');
  const save = async (u: string) => {
    setBusy(true); setErr('');
    try { await videoApi.set(gameId, part.id, u); setEditing(false); setUrl(''); setI(0); setShown(!!u); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu agora.'); } finally { setBusy(false); }
  };
  return (
    <Sheet title={`${label}: ${part.name}`} onClose={onClose} wide>
      {v ? (
        <>
          <div className="pv-frame">
            {shown
              ? <iframe src={embedUrl(v)} title={`${gameTitle}: ${part.name} (YouTube)`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
              : (
                <button type="button" className="pv-cover" onClick={() => setShown(true)}>
                  <Icon name="play" size={28} />
                  <b>Mostrar o vídeo</b>
                  <span>Pode mostrar o que acontece neste trecho. {v.start ? `Começa em ${clock(v.start)}.` : ''}</span>
                </button>
              )}
          </div>
          <p className="pv-meta">
            <span>{FROM[v.source]}{v.source === 'auto' && v.lang === 'en' ? ' · em inglês' : ''}</span>
            <a href={watchUrl(v)} target="_blank" rel="noopener noreferrer">Assistir no YouTube</a>
          </p>
          {list.length > 1 && (
            <div className="chips pv-alts" role="group" aria-label="Outros vídeos deste trecho">
              {list.map((x, k) => <button type="button" key={`${x.source}-${x.lang}`} className="chip" aria-pressed={k === i} onClick={() => { setI(k); setShown(false); }}>{x.source === 'canal' ? 'Canal WinnerZ' : x.source === 'pessoa' ? 'Escolhido' : x.lang === 'en' ? 'Em inglês' : 'Em português'}</button>)}
            </div>
          )}
        </>
      ) : <p className="muted">Este trecho ainda não tem vídeo.</p>}
      {videos?.canEdit && (editing ? (
        <form className="ol-link" onSubmit={(e) => { e.preventDefault(); void save(url); }}>
          <label className="ol-link__label" htmlFor="pv-url">Link do vídeo no YouTube (com o minuto, se quiser: &t=754)</label>
          <div className="ol-link__row">
            <input id="pv-url" className="field" type="url" inputMode="url" placeholder="https://www.youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={300} disabled={busy} autoFocus />
            <button className="btn primary sm" disabled={busy || !url.trim()}>Salvar</button>
          </div>
          {err && <small className="form-error" role="alert">{err}</small>}
        </form>
      ) : (
        <div className="sheet__actions pv-acts">
          <button className="btn quiet sm" onClick={() => setEditing(true)}><Icon name="link" size={13} />{v ? 'Trocar o vídeo' : 'Pôr um vídeo'}</button>
          {mine && <button className="btn quiet sm" disabled={busy} onClick={() => void save('')}>Tirar o escolhido</button>}
          <button className="btn primary" onClick={onClose}>Fechar</button>
        </div>
      ))}
      {!videos?.canEdit && <div className="sheet__actions"><button className="btn primary" onClick={onClose}>Fechar</button></div>}
    </Sheet>
  );
}

/** Administração: liga a playlist de detonado do canal WinnerZ ao jogo (a IA distribui os vídeos pelos itens). */
export function CanalPlaylist({ gameId, onDone }: { gameId: string; onDone?: () => void }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const send = async () => {
    setBusy(true); setMsg(null);
    try { const d = await videoApi.canal(gameId, url); setMsg({ ok: true, text: `Vídeos do canal ligados${d ? ` (${d})` : ''}.` }); setUrl(''); onDone?.(); }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Não deu agora.' }); }
    finally { setBusy(false); }
  };
  return (
    <form className="ol-link" onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <label className="ol-link__label" htmlFor={`pl-${gameId}`}>Detonado do canal WinnerZ (link da playlist)</label>
      <div className="ol-link__row">
        <input id={`pl-${gameId}`} className="field" type="url" inputMode="url" placeholder="https://www.youtube.com/playlist?list=…" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={300} disabled={busy} />
        <button className="btn primary sm" disabled={busy || !url.trim()}>{busy ? 'Ligando…' : 'Ligar ao jogo'}</button>
      </div>
      <small className="faint">A IA distribui os vídeos da playlist pelos itens da lista; os do canal aparecem primeiro.</small>
      {msg && <small className={msg.ok ? 'muted' : 'form-error'} role={msg.ok ? 'status' : 'alert'}>{msg.text}</small>}
    </form>
  );
}
