import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { ptVideo } from '../lib/igdbPt';
import { actions, useStore, getState } from '../data/store';
import { igdbSize } from '../lib/backdrop';

export type MediaItem =
  | { kind: 'video'; id: string; name: string }
  | { kind: 'image'; src: string; label: string };

/** IGDB entrega tamanhos pela URL: t_screenshot_big → t_1080p para ver grande, t_screenshot_med para miniatura. */
const big = (src: string) => src.replace('/t_screenshot_big/', '/t_1080p/');
const small = (src: string) => src.replace('/t_screenshot_big/', '/t_screenshot_med/');
const ytThumb = (id: string, q: 'hq' | 'mq' = 'hq') => `https://i.ytimg.com/vi/${id}/${q}default.jpg`;

export function buildMedia(videos?: { id: string; name: string }[], screenshots?: string[], artworks?: string[]): MediaItem[] {
  return [
    ...(videos ?? []).map((v) => ({ kind: 'video' as const, id: v.id, name: ptVideo(v.name) })),
    ...(screenshots ?? []).map((src) => ({ kind: 'image' as const, src, label: 'Imagem do jogo' })),
    ...(artworks ?? []).filter((a) => !(screenshots ?? []).includes(a)).map((src) => ({ kind: 'image' as const, src, label: 'Arte oficial' })),
  ];
}

/** Bloco da ficha: vídeo em destaque, grade de imagens e a galeria em tela cheia. */
export function MediaGallery({ title, items, gameId }: { title: string; items: MediaItem[]; gameId?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  if (items.length === 0) return null;
  const openAt = (i: number) => { setPlaying(false); setOpen(i); };
  const videos = items.filter((i) => i.kind === 'video').length;
  const images = items.length - videos;
  const lead = items[0].kind === 'video' ? 0 : -1;
  const grid = items.map((it, i) => ({ it, i })).filter(({ it, i }) => i !== lead && it.kind === 'image').slice(0, 4);
  const hidden = items.length - grid.length - (lead === 0 ? 1 : 0);

  return (
    <section aria-labelledby="midia" className={`media${lead === 0 ? ' has-lead' : ''}`}>
      <div className="sec-head media__head">
        <h2 id="midia" className="t sec-title">{videos ? 'Vídeos e imagens' : 'Imagens'}</h2>
        <span className="media__tools">
          <span className="kicker media__count">{[videos && `${videos} ${videos === 1 ? 'vídeo' : 'vídeos'}`, images && `${images} ${images === 1 ? 'imagem' : 'imagens'}`].filter(Boolean).join(' · ')}</span>
          <button className="btn quiet sm" onClick={() => openAt(lead === 0 && grid.length ? grid[0].i : 0)}>Ver tudo</button>
        </span>
      </div>
      <div className="media__body">
      {lead === 0 && items[0].kind === 'video' && (playing ? (
        <div className="media__lead is-playing">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${items[0].id}?autoplay=1&rel=0&playsinline=1`}
            title={items[0].name}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      ) : (
        <button className="media__lead" onClick={() => setPlaying(true)} aria-label={`Assistir aqui: ${items[0].name}`}>
          <img src={ytThumb(items[0].id)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
          <span className="media__play" aria-hidden="true"><Icon name="play" size={22} /></span>
          <span className="media__label">{items[0].name}</span>
        </button>
      ))}
      {grid.length > 0 && (
        <div className="shots">
          {grid.map(({ it, i }, k) => it.kind === 'image' && (
            <button key={it.src} className="shots__item" onClick={() => openAt(i)} aria-label={`Abrir ${it.label.toLowerCase()} ${i + 1} de ${items.length}`}>
              <img src={it.src} alt="" loading="lazy" />
              {k === grid.length - 1 && hidden > 0 && <span className="shots__more" aria-hidden="true">+{hidden}</span>}
            </button>
          ))}
        </div>
      )}
      </div>
      {open !== null && createPortal(<Lightbox title={title} items={items} start={open} onClose={() => setOpen(null)} gameId={gameId} />, document.body)}
    </section>
  );
}

/** Galeria em tela cheia por cima da página (fotos da Jornada, mídia do jogo). */
export function PhotoViewer({ container, ...props }: { title: string; items: MediaItem[]; start: number; onClose: () => void; container?: Element | null }) {
  // Em tela cheia, só o elemento em tela cheia aparece: a galeria precisa nascer dentro dele.
  return createPortal(<Lightbox {...props} />, container ?? document.body);
}

function Lightbox({ title, items, start, onClose, gameId }: { title: string; items: MediaItem[]; start: number; onClose: () => void; gameId?: string }) {
  const [i, setI] = useState(start);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const n = items.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  const cur = items[i];
  // Escolher o fundo da página do jogo (só para imagens da ficha, não para fotos da Jornada).
  const chosen = useStore((st) => (gameId ? st.prefs.backdrops?.[gameId] : undefined));
  const curBg = cur.kind === 'image' ? igdbSize(cur.src, 't_1080p') : null;
  const setBg = (url: string | null) => {
    if (!gameId) return;
    const all = { ...(getState().prefs.backdrops ?? {}) };
    if (url) all[gameId] = url; else delete all[gameId];
    actions.setPrefs({ backdrops: all });
  };

  // Teclado, rolagem da página travada e foco de volta onde estava.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prevOverflow; before?.focus?.(); };
  }, [go, onClose]);

  // Miniatura ativa sempre visível; vizinhas pré-carregadas.
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    for (const d of [1, -1]) { const it = items[(i + d + n) % n]; if (it.kind === 'image') { const im = new Image(); im.src = big(it.src); } }
  }, [i, items, n]);

  const onDown = (e: RPointerEvent) => { drag.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: RPointerEvent) => {
    const d = drag.current; drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={`Galeria de ${title}`}>
      <div className="lightbox__bar">
        <div className="lightbox__title">
          <span className="t">{title}</span>
          <span className="muted">{cur.kind === 'video' ? cur.name : cur.label} · {i + 1} de {n}</span>
        </div>
        <div className="lightbox__tools">
          {gameId && curBg && (chosen === curBg
            ? <button className="lightbox__bg is-on" onClick={() => setBg(null)} title="Voltar a escolher o fundo automaticamente"><Icon name="check" size={15} />Fundo da página <span>(desfazer)</span></button>
            : <button className="lightbox__bg" onClick={() => setBg(curBg)}>Usar como fundo</button>)}
          <button ref={closeBtn} className="lightbox__close" onClick={onClose} aria-label="Fechar galeria"><Icon name="fechar" size={22} /></button>
        </div>
      </div>

      <div className="lightbox__stage" onPointerDown={onDown} onPointerUp={onUp} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        {n > 1 && <button className="lightbox__nav lightbox__nav--prev" onClick={() => go(-1)} aria-label="Anterior"><Icon name="voltar" size={26} /></button>}
        {cur.kind === 'video' ? (
          <div className="lightbox__video" key={cur.id}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${cur.id}?autoplay=1&rel=0&playsinline=1`}
              title={cur.name}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          <img key={cur.src} className="lightbox__img" src={big(cur.src)} alt={`${cur.label} de ${title}, ${i + 1} de ${n}`} draggable={false} />
        )}
        {n > 1 && <button className="lightbox__nav lightbox__nav--next" onClick={() => go(1)} aria-label="Próxima"><Icon name="avancar" size={26} /></button>}
      </div>

      {n > 1 && (
        <div className="lightbox__strip" ref={strip} role="tablist" aria-label="Escolher imagem ou vídeo">
          {items.map((it, k) => (
            <button key={k} data-i={k} role="tab" aria-selected={k === i} className="lightbox__thumb" onClick={() => setI(k)} aria-label={it.kind === 'video' ? `Vídeo: ${it.name}` : `${it.label} ${k + 1}`}>
              <img src={it.kind === 'video' ? ytThumb(it.id, 'mq') : small(it.src)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              {it.kind === 'video' && <span className="lightbox__thumbplay" aria-hidden="true"><Icon name="play" size={12} /></span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
