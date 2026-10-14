import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, navigate } from '../lib/router';
import { useStore } from '../data/store';
import { avatarUrl } from '../data/profileApi';
import {
  KIND_LABEL, SPOILER_LABEL, communityApi, communityImage,
  type GameMini, type PersonRef, type Post, type ReactionKind, type Reactions,
} from '../data/communityApi';
import { parsePost, plainText, spoilerCovered, type Block, type GameProgress, type Inline } from '../lib/postText';
import { EmbedBlock, LinkCard, embedFor, embedThumb } from './Embed';
import { searchGames, loadGame, type Hit } from './AddGameDialog';
import { actions } from '../data/store';
import { CoverArt } from './CoverArt';
import { Icon } from './Icon';

/* ------------------------------------------------------------------ */
/* Tempo e pessoas                                                      */
/* ------------------------------------------------------------------ */
export function ago(iso?: string | null): string {
  if (!iso) return '';
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 2 * 86400) return 'ontem';
  if (s < 7 * 86400) return `há ${Math.floor(s / 86400)} dias`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: s > 300 * 86400 ? 'numeric' : undefined, timeZone: 'America/Sao_Paulo' }).replace('.', '');
}

export function PersonAvatar({ p, size = 32 }: { p: PersonRef; size?: number }) {
  return (
    <span className="soc-av" style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {p.avatar ? <img src={avatarUrl(p.avatar) ?? ''} alt="" /> : (p.handle ?? '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

export function PersonLink({ p, official = false, avatar = true }: { p: PersonRef; official?: boolean; avatar?: boolean }) {
  const inner = <>{avatar && <PersonAvatar p={p} size={24} />}<span>{p.handle ? `@${p.handle}` : 'Conta sem @'}</span>{official && p.admin && <span className="cm-badge">Canal</span>}</>;
  return p.handle ? <Link to={`/@${p.handle.toLowerCase()}`} className="cm-person">{inner}</Link> : <span className="cm-person">{inner}</span>;
}

/* ------------------------------------------------------------------ */
/* Spoiler pelo progresso                                               */
/* ------------------------------------------------------------------ */
/** Onde a pessoa está em cada jogo, pela Jornada dela (para cobrir spoiler). */
export function useProgressOf(): (gameId?: string | null) => GameProgress | null {
  const journeys = useStore((s) => s.journeys);
  const histories = useStore((s) => s.histories);
  return useCallback((gameId?: string | null) => {
    if (!gameId) return null;
    const j = journeys.find((x) => x.gameId === gameId);
    if (!j) return null;
    const hs = histories.filter((h) => h.journeyId === j.id);
    if (!hs.length) return { progress: 0, completed: false, started: true };
    return { started: true, completed: hs.some((h) => h.state === 'concluida'), progress: Math.max(0, ...hs.map((h) => h.progress ?? 0)) };
  }, [journeys, histories]);
}

const REVEALED = 'wz.spoiler.vistos';
const revealedSet = (): Set<string> => { try { return new Set(JSON.parse(sessionStorage.getItem(REVEALED) || '[]') as string[]); } catch { return new Set(); } };
function rememberReveal(id: string) { try { sessionStorage.setItem(REVEALED, JSON.stringify([...revealedSet(), id])); } catch { /* só nesta tela */ } }

/** A postagem está coberta para quem vê? (quem escreveu nunca vê coberto) */
export function usePostCovered(post: Pick<Post, 'id' | 'spoiler' | 'game' | 'author'>): [boolean, () => void] {
  const progressOf = useProgressOf();
  const me = useStore((s) => s.mode === 'demo' ? 'demo-me' : s.profile?.id ?? null);
  const [shown, setShown] = useState(() => revealedSet().has(post.id));
  const covered = !shown && post.author.id !== me && spoilerCovered(post.spoiler ?? null, progressOf(post.game?.id));
  return [covered, () => { rememberReveal(post.id); setShown(true); }];
}

export function SpoilerNote({ post }: { post: Pick<Post, 'spoiler' | 'game'> }) {
  if (!post.spoiler || !post.game) return null;
  return <span className="cm-chip cm-chip--spoiler" title={`Spoiler ${SPOILER_LABEL[post.spoiler].toLowerCase()} de ${post.game.title}`}><Icon name="escudo" size={12} />Spoiler {SPOILER_LABEL[post.spoiler].toLowerCase()}</span>;
}

/** Capa sobre o conteúdo com spoiler, para quem ainda não chegou lá no jogo. */
export function SpoilerShield({ post, onReveal }: { post: Pick<Post, 'spoiler' | 'game'>; onReveal: () => void }) {
  const what = post.spoiler === 'final' ? 'ainda não zerou' : post.spoiler === 'meio' ? 'ainda não passou da metade de' : 'ainda não começou';
  return (
    <div className="cm-shield">
      <Icon name="escudo" size={22} />
      <p><b>Tem spoiler {post.spoiler ? SPOILER_LABEL[post.spoiler].toLowerCase() : ''} de {post.game?.title}.</b> Pela sua Jornada, você {what}{post.spoiler === 'meio' ? ` ${post.game?.title}` : ''}. Por isso o texto ficou coberto.</p>
      <button className="btn ghost sm" onClick={onReveal}>Ver mesmo assim</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Texto                                                                */
/* ------------------------------------------------------------------ */
function InlineSpoiler({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  return <span className={`cm-sp${on ? ' is-on' : ''}`} role="button" tabIndex={on ? -1 : 0} aria-label={on ? undefined : 'Trecho com spoiler: tocar para ver'} onClick={() => setOn(true)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOn(true); } }}>{children}</span>;
}
function renderInline(n: Inline[]): ReactNode {
  return n.map((x, i) => {
    switch (x.t) {
      case 'b': return <strong key={i}>{renderInline(x.c)}</strong>;
      case 'i': return <em key={i}>{renderInline(x.c)}</em>;
      case 'link': return <a key={i} href={x.href} target="_blank" rel="noopener noreferrer nofollow ugc">{x.v}</a>;
      case 'spoiler': return <InlineSpoiler key={i}>{renderInline(x.c)}</InlineSpoiler>;
      default: return <Fragment key={i}>{x.v.split('\n').map((l, k) => <Fragment key={k}>{k > 0 && <br />}{l}</Fragment>)}</Fragment>;
    }
  });
}
/** Links fora de spoiler, no meio do texto (os que estão sozinhos na linha já viram bloco). */
function inlineLinks(blocks: Block[]): string[] {
  const out: string[] = [];
  const walk = (n: Inline[]) => n.forEach((x) => {
    if (x.t === 'link') out.push(x.href);
    else if (x.t === 'b' || x.t === 'i') walk(x.c);
  });
  blocks.forEach((b) => { if (b.t === 'p') walk(b.c); else if (b.t === 'ul' || b.t === 'ol') b.items.forEach(walk); });
  return out;
}

/**
 * Texto de postagem ou resposta. embeds: quantos vídeos e posts de redes sociais mostrar dentro (0 = nenhum).
 * Link sozinho na linha aparece ali mesmo; link no meio da frase aparece no fim do texto.
 */
export function PostText({ text, className = '', embeds = 0 }: { text: string; className?: string; embeds?: number }) {
  const blocks = useMemo<Block[]>(() => parsePost(text), [text]);
  if (!blocks.length) return null;
  let left = embeds;
  const shown = new Set<string>();
  const items = blocks.map((b, i) => {
    if (b.t === 'link') {
      if (left > 0 && !shown.has(b.url) && embedFor(b.url)) { left--; shown.add(b.url); return <EmbedBlock key={i} url={b.url} />; }
      return embeds > 0 ? <LinkCard key={i} url={b.url} /> : <p key={i}><a href={b.url} target="_blank" rel="noopener noreferrer nofollow ugc">{b.url.replace(/^https?:\/\/(www\.)?/, '')}</a></p>;
    }
    return b.t === 'p' ? <p key={i}>{renderInline(b.c)}</p>
      : b.t === 'ul' ? <ul key={i}>{b.items.map((it, k) => <li key={k}>{renderInline(it)}</li>)}</ul>
      : <ol key={i}>{b.items.map((it, k) => <li key={k}>{renderInline(it)}</li>)}</ol>;
  });
  const extra = embeds > 0 ? inlineLinks(blocks).filter((u) => !shown.has(u) && embedFor(u)) : [];
  const tail = [...new Set(extra)].slice(0, Math.max(0, left));
  return (
    <div className={`cm-text ${className}`}>
      {items}
      {tail.map((u) => <EmbedBlock key={`e-${u}`} url={u} />)}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Mídia                                                                */
/* ------------------------------------------------------------------ */
/** Miniatura da postagem na lista: a primeira imagem, a capa do vídeo do YouTube, ou só o ícone de vídeo. */
export function postThumb(post: Pick<Post, 'images' | 'clip' | 'body'>): { img: string | null; video: boolean } {
  if (post.images[0]) return { img: communityImage(post.images[0]), video: false };
  const urls = [post.clip, ...(post.body.match(/https?:\/\/[^\s<>"')\]|]+/g) ?? [])];
  const t = embedThumb(urls);
  return { img: t.thumb, video: t.has };
}

export function ImageGrid({ images }: { images: string[] }) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open == null) return;
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); if (e.key === 'ArrowRight') setOpen((i) => (i == null ? i : (i + 1) % images.length)); if (e.key === 'ArrowLeft') setOpen((i) => (i == null ? i : (i - 1 + images.length) % images.length)); };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [open, images.length]);
  if (!images.length) return null;
  return (
    <>
      <div className={`cm-imgs cm-imgs--${Math.min(images.length, 4)}`}>
        {images.map((src, i) => <button key={src + i} className="cm-imgs__it" onClick={() => setOpen(i)} aria-label={`Ver imagem ${i + 1} de ${images.length}`}><img src={communityImage(src) ?? ''} alt="" loading="lazy" /></button>)}
      </div>
      {open != null && (
        <div className="cm-lightbox" role="dialog" aria-modal="true" aria-label="Imagem" onClick={() => setOpen(null)}>
          <img src={communityImage(images[open]) ?? ''} alt="" onClick={(e) => e.stopPropagation()} />
          <button className="icon-btn cm-lightbox__x" aria-label="Fechar" onClick={() => setOpen(null)}><Icon name="fechar" /></button>
          {images.length > 1 && <span className="mono cm-lightbox__n">{open + 1} / {images.length}</span>}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Reações                                                              */
/* ------------------------------------------------------------------ */
export function ReactionBar({ target, id, value, compact = false }: { target: 'post' | 'resposta' | 'mensagem'; id: string; value: Reactions; compact?: boolean }) {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [r, setR] = useState(value);
  const [busy, setBusy] = useState(false);
  useEffect(() => setR(value), [value]);
  const toggle = async (k: ReactionKind) => {
    if (signedOut) return navigate('/entrar');
    const on = !r.mine.includes(k);
    const prev = r;
    setR({ ...r, [k]: r[k] + (on ? 1 : -1), mine: on ? [...r.mine, k] : r.mine.filter((x) => x !== k) });
    setBusy(true);
    try { setR(await communityApi.react(target, id, k, on)); } catch { setR(prev); } finally { setBusy(false); }
  };
  return (
    <span className={`cm-react${compact ? ' cm-react--compact' : ''}`}>
      <button className={`cm-react__b cm-react__gg${r.mine.includes('gg') ? ' is-on' : ''}`} disabled={busy} aria-pressed={r.mine.includes('gg')} onClick={() => void toggle('gg')} title="GG: mandou bem">
        <b>GG</b>{r.gg > 0 && <span className="mono">{r.gg}</span>}
      </button>
      <button className={`cm-react__b cm-react__heart${r.mine.includes('coracao') ? ' is-on' : ''}`} disabled={busy} aria-pressed={r.mine.includes('coracao')} onClick={() => void toggle('coracao')} aria-label="Curtir">
        <Icon name="coracao" size={16} fill={r.mine.includes('coracao') ? 'currentColor' : 'none'} />{r.coracao > 0 && <span className="mono">{r.coracao}</span>}
      </button>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Cartão de postagem (listas)                                          */
/* ------------------------------------------------------------------ */
export function KindChip({ kind }: { kind: Post['kind'] }) {
  return <span className={`cm-chip cm-chip--${kind}`}>{KIND_LABEL[kind]}</span>;
}

export function PostCard({ post, showCommunity = false }: { post: Post; showCommunity?: boolean }) {
  const [covered, reveal] = usePostCovered(post);
  const href = `/w/${post.community.slug}/${post.id}`;
  const excerpt = plainText(post.body.replace(/https?:\/\/\S+/g, ' ')).replace(/\s+/g, ' ').trim();
  const th = postThumb(post);
  return (
    <article className={`cm-card${post.pinned ? ' is-pinned' : ''}${post.hidden ? ' is-hidden' : ''}`}>
      <div className="cm-card__main">
        <div className="cm-card__top">
          {post.pinned && <span className="cm-chip cm-chip--pin"><Icon name="pin" size={12} />Fixada</span>}
          <KindChip kind={post.kind} />
          {post.kind === 'pergunta' && post.answerId && <span className="cm-chip cm-chip--ok"><Icon name="check" size={12} />Resolvida</span>}
          <SpoilerNote post={post} />
          {post.hidden && <span className="cm-chip cm-chip--hidden">Fora do ar pela moderação</span>}
          {showCommunity && <Link to={`/w/${post.community.slug}`} className="cm-card__comm">w/{post.community.slug}</Link>}
        </div>
        <h3 className="cm-card__t"><Link to={href}>{post.title}</Link></h3>
        {covered ? (
          <button className="cm-card__covered" onClick={reveal}><Icon name="escudo" size={14} />Coberto: spoiler {post.spoiler ? SPOILER_LABEL[post.spoiler].toLowerCase() : ''} de {post.game?.title}. Tocar para ver.</button>
        ) : excerpt ? <p className="cm-card__ex">{excerpt.length > 220 ? `${excerpt.slice(0, 220).trimEnd()}…` : excerpt}</p> : null}
        <div className="cm-card__meta">
          <PersonLink p={post.author} official={post.community.official} />
          <span className="faint">{ago(post.createdAt)}</span>
          {post.game && <Link to={`/jogos/${post.game.slug}`} className="cm-card__game">{post.game.title}</Link>}
          <span className="cm-card__stats">
            <Link to={`${href}#respostas`} className="cm-card__n" aria-label={`${post.replies} respostas`}><Icon name="mensagem" size={15} />{post.replies}</Link>
            <ReactionBar target="post" id={post.id} value={post.reactions} compact />
          </span>
        </div>
      </div>
      {(th.img || th.video) && (
        <Link to={href} className={`cm-card__thumb${covered ? ' is-covered' : ''}${th.video ? ' is-video' : ''}`} tabIndex={-1} aria-hidden="true">
          {th.img ? <img src={th.img} alt="" loading="lazy" /> : <span className="cm-card__play"><Icon name="play" size={22} /></span>}
          {th.img && th.video && <span className="cm-card__playmini"><Icon name="play" size={14} /></span>}
          {post.imageCount > 1 && <span className="mono cm-card__count">+{post.imageCount - 1}</span>}
        </Link>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Escolher um jogo do catálogo                                         */
/* ------------------------------------------------------------------ */
export function GameSearchPick({ value, onChange, label }: { value: GameMini | null; onChange: (g: GameMini | null) => void; label: string }) {
  const games = useStore((s) => s.games);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState('');
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => setHits((await searchGames(q.trim(), Object.values(games))).hits.slice(0, 6)), 300);
    return () => clearTimeout(t);
  }, [q, games]);
  const pick = async (h: Hit) => {
    setBusy(h.slug);
    const g = h.local ?? Object.values(games).find((x) => x.igdbId && x.igdbId === h.igdbId) ?? (await loadGame(h));
    if (g) { actions.mergeGames([g]); onChange({ id: g.id, slug: g.slug, title: g.title, cover: g.cover }); setQ(''); setHits([]); }
    setBusy('');
  };
  if (value) return (
    <span className="gpick gpick--on">
      <span className="gpick__cover"><CoverArt game={{ title: value.title, cover: value.cover ?? '' }} /></span>
      <span className="gpick__t">{value.title}</span>
      <button type="button" className="btn quiet sm" onClick={() => onChange(null)} aria-label={`Tirar ${value.title}`}>Tirar</button>
    </span>
  );
  return (
    <span className="gpick">
      <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no catálogo" aria-label={label} />
      {hits.length > 0 && (
        <span className="gpick__list" role="listbox" aria-label={label}>
          {hits.map((h) => (
            <button type="button" key={h.slug} role="option" aria-selected={false} className="gpick__opt" disabled={!!busy} onClick={() => void pick(h)}>
              <span className="gpick__mini"><CoverArt game={h} /></span>{h.title}{h.year ? <small className="faint"> · {h.year}</small> : null}{busy === h.slug && <small className="faint"> · abrindo…</small>}
            </button>
          ))}
        </span>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Ficha do jogo: conversas sobre ele                                   */
/* ------------------------------------------------------------------ */
export function GameConversations({ gameId, title }: { gameId: string; title: string }) {
  const [list, setList] = useState<Post[] | null>(null);
  useEffect(() => {
    let alive = true;
    communityApi.forGame(gameId).then((l) => alive && setList(l)).catch(() => alive && setList([]));
    return () => { alive = false; };
  }, [gameId]);
  if (list == null) return null;
  return (
    <section aria-labelledby="conversas" className="cm-gamesec">
      <div className="sec-head">
        <h2 id="conversas" className="t sec-title">Conversas sobre este jogo</h2>
        {list.length > 0 && <span className="kicker sec-head__note"><span className="dot-now" aria-hidden="true" />Spoiler coberto pelo seu progresso</span>}
      </div>
      {list.length === 0
        ? <p className="muted">Ninguém falou de {title} nas comunidades ainda. <Link to="/comunidade/comunidades">Abrir uma conversa</Link></p>
        : <div className="cm-list">{list.map((p) => <PostCard key={p.id} post={p} showCommunity />)}</div>}
    </section>
  );
}
