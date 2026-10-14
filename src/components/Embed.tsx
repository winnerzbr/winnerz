import { useEffect, useRef, useState } from 'react';
import { embedOf, heightFromMessage, siteOf, type Embed } from '../lib/embeds';
import { Icon } from './Icon';

const host = () => (typeof location !== 'undefined' && location.hostname) || 'localhost';
export const embedFor = (url: string) => embedOf(url, host());

/** Vídeo, clipe ou post de rede social dentro da página. Se não reconhecer o link, mostra um cartão com o site. */
export function EmbedBlock({ url }: { url: string }) {
  const e = embedFor(url);
  return e ? <EmbedFrame e={e} /> : <LinkCard url={url} />;
}

export function EmbedFrame({ e }: { e: Embed }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(e.height ?? 0);
  useEffect(() => { setHeight(e.height ?? 0); }, [e.src, e.height]);
  // Instagram, X, Reddit e Threads avisam a altura do post depois de carregar.
  useEffect(() => {
    if (!e.resizes) return;
    const f = (m: MessageEvent) => {
      if (!frame.current || m.source !== frame.current.contentWindow) return;
      const h = heightFromMessage(e.provider, m.data);
      if (h) setHeight(h);
    };
    window.addEventListener('message', f);
    return () => window.removeEventListener('message', f);
  }, [e.provider, e.resizes]);
  const sized = e.shape === 'post' || e.shape === 'audio' || e.shape === 'wide';
  return (
    <figure className={`cm-embed cm-embed--${e.shape} cm-embed--${e.provider}`}>
      <div className="cm-embed__box" style={sized ? { height } : undefined}>
        <iframe
          ref={frame}
          src={e.src}
          title={`${e.label}: conteúdo incorporado`}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          scrolling={sized && !e.resizes && e.shape === 'post' ? 'yes' : undefined}
        />
      </div>
      <figcaption className="cm-embed__cap">
        <span>{e.label}</span>
        <a href={e.url} target="_blank" rel="noopener noreferrer nofollow ugc">Abrir no {e.label === 'X' ? 'X' : e.label} <span aria-hidden="true">↗</span></a>
      </figcaption>
    </figure>
  );
}

export function LinkCard({ url }: { url: string }) {
  let path = '';
  try { const u = new URL(url); path = decodeURI(u.pathname + u.search).replace(/\/$/, ''); } catch { /* link estranho */ }
  return (
    <a className="cm-linkcard" href={url} target="_blank" rel="noopener noreferrer nofollow ugc">
      <span className="cm-linkcard__ic" aria-hidden="true"><Icon name="avancar" size={16} /></span>
      <span className="cm-linkcard__tx"><b>{siteOf(url)}</b>{path && <small>{path}</small>}</span>
    </a>
  );
}

/** Miniatura para a lista de postagens: a do YouTube, quando há; senão null. */
export function embedThumb(urls: (string | null | undefined)[]): { thumb: string | null; has: boolean } {
  let has = false;
  for (const u of urls) {
    if (!u) continue;
    const e = embedFor(u);
    if (!e) continue;
    has = true;
    if (e.thumb) return { thumb: e.thumb, has };
  }
  return { thumb: null, has };
}
