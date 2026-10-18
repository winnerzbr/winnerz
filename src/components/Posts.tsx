import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Link, navigate } from '../lib/router';
import { getState, useStore } from '../data/store';
import { avatarUrl } from '../data/profileApi';
import {
  KIND_LABEL, REACTIONS, SPOILER_LABEL, communityApi, communityImage, postHref, postTitle,
  type GameMini, type PersonRef, type Post, type ReactionKind, type Reactions,
} from '../data/communityApi';
import { parsePost, plainText, spoilerReached, type Block, type GameProgress, type Inline } from '../lib/postText';
import { EmbedBlock, LinkCard, embedFor, embedThumb } from './Embed';
import { searchGames, loadGame, type Hit } from './AddGameDialog';
import { actions } from '../data/store';
import { CoverArt } from './CoverArt';
import { Icon } from './Icon';
import { safeHref } from '../lib/safeHref';

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
    <span className={`soc-av${p.gone ? ' soc-av--gone' : ''}`} style={{ width: size, height: size, fontSize: size * 0.42 }} aria-hidden="true">
      {p.avatar ? <img src={avatarUrl(p.avatar) ?? ''} alt="" /> : p.gone ? '·' : (p.handle ?? '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

export function PersonLink({ p, official = false, avatar = true }: { p: PersonRef; official?: boolean; avatar?: boolean }) {
  if (p.gone) return <span className="cm-person cm-person--gone">{avatar && <PersonAvatar p={p} size={24} />}<span>Conta apagada</span></span>;
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

/**
 * Spoiler fica coberto para todo mundo até a pessoa tocar (quem escreveu nunca vê coberto).
 * A Jornada só ajuda: diz se a pessoa já passou daquela parte (true), ainda não (false) ou nem tem o jogo (null).
 */
export function usePostCovered(post: Pick<Post, 'id' | 'spoiler' | 'game' | 'author'>): [boolean, () => void, boolean | null] {
  const progressOf = useProgressOf();
  const me = useStore((s) => s.mode === 'demo' ? 'demo-me' : s.profile?.id ?? null);
  const [shown, setShown] = useState(() => revealedSet().has(post.id));
  const covered = !shown && !!post.spoiler && post.author.id !== me;
  return [covered, () => { rememberReveal(post.id); setShown(true); }, spoilerReached(post.spoiler ?? null, progressOf(post.game?.id))];
}

export function SpoilerNote({ post }: { post: Pick<Post, 'spoiler' | 'game' | 'spoilerNote'> }) {
  if (!post.spoiler || !post.game) return null;
  return (
    <span className="cm-chip cm-chip--spoiler" title={`Spoiler ${SPOILER_LABEL[post.spoiler].toLowerCase()} de ${post.game.title}${post.spoilerNote ? `: ${post.spoilerNote}` : ''}`}>
      <Icon name="escudo" size={12} />Spoiler {SPOILER_LABEL[post.spoiler].toLowerCase()}{post.spoilerNote ? <span className="cm-chip__note"> · {post.spoilerNote}</span> : null}
    </span>
  );
}

/** O que a Jornada diz sobre um spoiler, numa frase. */
export function spoilerHint(post: Pick<Post, 'spoiler' | 'game'>, reached: boolean | null): string {
  const g = post.game?.title ?? 'o jogo';
  if (reached == null) return `${g} não está na sua Jornada.`;
  if (reached) return post.spoiler === 'final' ? `Pela sua Jornada, você já zerou ${g}.` : `Pela sua Jornada, você já passou dessa parte de ${g}.`;
  return post.spoiler === 'final' ? `Pela sua Jornada, você ainda não zerou ${g}.` : post.spoiler === 'meio' ? `Pela sua Jornada, você ainda não chegou na metade de ${g}.` : `Pela sua Jornada, você ainda está no comecinho de ${g}.`;
}

/** Capa sobre o conteúdo com spoiler. Fica para todo mundo; a Jornada só dá a dica. */
export function SpoilerShield({ post, onReveal, reached }: { post: Pick<Post, 'spoiler' | 'game' | 'spoilerNote'>; onReveal: () => void; reached: boolean | null }) {
  return (
    <div className={`cm-shield${reached ? ' is-safe' : ''}`}>
      <Icon name="escudo" size={22} />
      <p>
        <b>Spoiler {post.spoiler ? SPOILER_LABEL[post.spoiler].toLowerCase() : ''} de {post.game?.title}{post.spoilerNote ? `: ${post.spoilerNote}` : ''}.</b>{' '}
        {spoilerHint(post, reached)}
      </p>
      <button className={`btn ${reached ? 'primary' : 'ghost'} sm`} onClick={onReveal}>{reached ? 'Ver' : 'Ver mesmo assim'}</button>
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
      case 'link': return <a key={i} href={safeHref(x.href)} target="_blank" rel="noopener noreferrer nofollow ugc">{x.v}</a>;
      case 'spoiler': return <InlineSpoiler key={i}>{renderInline(x.c)}</InlineSpoiler>;
      case 'mention': return <Link key={i} to={`/@${x.handle.toLowerCase()}`} className="cm-mention">@{x.handle}</Link>;
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
      return embeds > 0 ? <LinkCard key={i} url={b.url} /> : <p key={i}><a href={safeHref(b.url)} target="_blank" rel="noopener noreferrer nofollow ugc">{b.url.replace(/^https?:\/\/(www\.)?/, '')}</a></p>;
    }
    return b.t === 'p' ? <p key={i}>{renderInline(b.c)}</p>
      : b.t === 'quote' ? <blockquote key={i} className="cm-quote">{renderInline(b.c)}</blockquote>
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

/** Caixa de texto com sugestão de @: ao digitar @, aparecem as pessoas da conversa. */
export function MentionArea({ value, onChange, people, ...rest }: { value: string; onChange: (v: string) => void; people: string[] } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [q, setQ] = useState<string | null>(null);
  const caret = useRef<number | null>(null);
  // Ao abrir já com texto (Citar), o cursor vai para o fim, depois da citação.
  useEffect(() => { const el = ref.current; if (el && rest.autoFocus) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [pick, setPick] = useState(0);
  const sync = (el: HTMLTextAreaElement) => {
    const m = /(^|[\s(])@([a-zA-Z0-9_.]{0,30})$/.exec(el.value.slice(0, el.selectionStart));
    setQ(m ? m[2].toLowerCase() : null); setPick(0);
  };
  const list = q == null ? [] : people.filter((h) => h.toLowerCase().startsWith(q)).slice(0, 5);
  const choose = (h: string) => {
    const el = ref.current; if (!el) return;
    const at = el.selectionStart;
    const before = el.value.slice(0, at).replace(/@[a-zA-Z0-9_.]{0,30}$/, `@${h} `);
    const next = before + el.value.slice(at);
    caret.current = before.length;
    onChange(next); setQ(null);
  };
  // O cursor fica logo depois do @ escolhido (assim que o texto novo aparece na tela).
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && caret.current != null) { el.focus(); el.setSelectionRange(caret.current, caret.current); caret.current = null; }
  }, [value]);
  return (
    <span className="cm-mentionbox">
      <textarea ref={ref} {...rest} value={value}
        onChange={(e) => { onChange(e.target.value); sync(e.target); }}
        onClick={(e) => sync(e.currentTarget)}
        onBlur={() => setTimeout(() => setQ(null), 150)}
        onKeyDown={(e) => {
          if (list.length) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setPick((i) => (i + 1) % list.length); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setPick((i) => (i - 1 + list.length) % list.length); return; }
            if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choose(list[pick]); return; }
            if (e.key === 'Escape') { setQ(null); return; }
          }
          rest.onKeyDown?.(e);
        }} />
      {list.length > 0 && (
        <span className="cm-mentions" role="listbox" aria-label="Pessoas da conversa">
          {list.map((h, i) => <button type="button" key={h} role="option" aria-selected={i === pick} className={i === pick ? 'is-on' : ''} onMouseDown={(e) => { e.preventDefault(); choose(h); }}>@{h}</button>)}
        </span>
      )}
    </span>
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
/** "Quero jogar": o jogo vai para os desejos (ou para o Radar, se ainda não saiu). Devolve o aviso para mostrar. */
function wantToPlay(g: GameMini): { text: string; undo?: () => void } | null {
  if (!getState().games[g.id]) actions.mergeGames([{ id: g.id, slug: g.slug, title: g.title, cover: g.cover ?? '', platforms: [] }]);
  const s = getState();
  const full = s.games[g.id];
  const today = new Date().toISOString().slice(0, 10);
  if (full?.releasedOn && full.releasedOn > today) {
    if (s.myGames[g.id]?.onRadar) return { text: `${g.title} já está no seu Radar.` };
    actions.toggleRadar(g.id);
    return { text: `${g.title} entrou no seu Radar.`, undo: () => actions.toggleRadar(g.id) };
  }
  if (s.copies.some((c) => c.gameId === g.id) || s.journeys.some((j) => j.gameId === g.id)) return null;
  if (s.wishes.some((w) => w.gameId === g.id)) return { text: `${g.title} já está nos seus desejos.` };
  actions.toggleWish(g.id);
  return { text: `${g.title} foi para os seus desejos.`, undo: () => actions.toggleWish(g.id) };
}

function RxInner({ k, n, label }: { k: ReactionKind; n: number; label: boolean }) {
  const x = REACTIONS.find((r) => r.k === k)!;
  return <>{k === 'gg' ? <b>GG</b> : <Icon name={x.icon} size={16} />}{label && k !== 'gg' && <span className="cm-react__l">{x.label}</span>}{n > 0 && <span className="mono">{n}</span>}</>;
}

/**
 * Reações: GG, Curti, Quero jogar, Boa dica, Tamo junto, Haha e Que momento.
 * Inteira (na postagem): todas, com nome. Compacta (listas e respostas): só as que alguém usou, e um botão para reagir.
 * game: o jogo da conversa, para o "Quero jogar" levar para os desejos.
 */
export function ReactionBar({ target, id, value, compact = false, game = null }: { target: 'post' | 'resposta'; id: string; value: Reactions; compact?: boolean; game?: GameMini | null }) {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [r, setR] = useState(value);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<{ text: string; undo?: () => void } | null>(null);
  const box = useRef<HTMLSpanElement>(null);
  useEffect(() => setR(value), [value]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  useEffect(() => { if (!note) return; const t = setTimeout(() => setNote(null), 6000); return () => clearTimeout(t); }, [note]);
  const n = (k: ReactionKind) => r[k] ?? 0;
  const toggle = async (k: ReactionKind) => {
    if (signedOut) return navigate('/entrar');
    setOpen(false);
    const on = !r.mine.includes(k);
    const prev = r;
    setR({ ...r, [k]: Math.max(0, n(k) + (on ? 1 : -1)), mine: on ? [...r.mine, k] : r.mine.filter((x) => x !== k) });
    setBusy(true);
    try {
      setR(await communityApi.react(target, id, k, on));
      if (k === 'jogar' && on && game) setNote(wantToPlay(game));
    } catch { setR(prev); } finally { setBusy(false); }
  };
  const shown = compact ? REACTIONS.filter((x) => n(x.k) > 0 || r.mine.includes(x.k)) : REACTIONS;
  return (
    <span className={`cm-react${compact ? ' cm-react--compact' : ''}`} ref={box}>
      {shown.map((x) => (
        <button key={x.k} className={`cm-react__b cm-react__${x.k}${r.mine.includes(x.k) ? ' is-on' : ''}`} disabled={busy} aria-pressed={r.mine.includes(x.k)}
          onClick={() => void toggle(x.k)} title={x.hint} aria-label={`${x.label}${n(x.k) ? `: ${n(x.k)}` : ''}`}>
          <RxInner k={x.k} n={n(x.k)} label={!compact} />
        </button>
      ))}
      {compact && (
        <span className="cm-react__more">
          <button className="cm-react__b cm-react__add" aria-expanded={open} aria-haspopup="menu" aria-label="Reagir" title="Reagir" onClick={() => setOpen((v) => !v)}><Icon name="reagir" size={16} /></button>
          {open && (
            <span className="cm-react__pop" role="menu" aria-label="Reações">
              {REACTIONS.map((x) => (
                <button key={x.k} role="menuitemcheckbox" aria-checked={r.mine.includes(x.k)} className={r.mine.includes(x.k) ? 'is-on' : ''} onClick={() => void toggle(x.k)} title={x.hint}>
                  {x.k === 'gg' ? <><b>GG</b><span>Mandou bem</span></> : <><Icon name={x.icon} size={18} /><span>{x.label}</span></>}
                </button>
              ))}
            </span>
          )}
        </span>
      )}
      {note && <span className="cm-react__note" role="status">{note.text}{note.undo && <button className="cm-link" onClick={() => { note.undo!(); setNote(null); }}>Desfazer</button>}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Cartão de postagem (listas)                                          */
/* ------------------------------------------------------------------ */
export function KindChip({ kind }: { kind: Post['kind'] }) {
  return <span className={`cm-chip cm-chip--${kind}`}>{KIND_LABEL[kind]}</span>;
}

/** Salvar para ler depois (só você vê os seus salvos). */
export function SaveButton({ post, label = true }: { post: Pick<Post, 'id' | 'saved'>; label?: boolean }) {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [on, setOn] = useState(!!post.saved);
  useEffect(() => setOn(!!post.saved), [post.saved]);
  const toggle = async () => {
    if (signedOut) return navigate('/entrar');
    const next = !on; setOn(next);
    try { await communityApi.save(post.id, next); } catch { setOn(!next); }
  };
  return (
    <button className={`cm-save${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => void toggle()} title={on ? 'Tirar dos salvos' : 'Salvar para ler depois'}>
      <Icon name="desejo" size={15} fill={on ? 'currentColor' : 'none'} />{label && <span>{on ? 'Salva' : 'Salvar'}</span>}
    </button>
  );
}

/** Enquete: antes de votar, as opções; depois, quanto cada uma tem. Dá para trocar o voto. */
export function PollBox({ post }: { post: Pick<Post, 'id' | 'poll' | 'author'> }) {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const me = useStore((s) => s.mode === 'demo' ? 'demo-me' : s.profile?.id ?? null);
  const [poll, setPoll] = useState(post.poll ?? null);
  const [busy, setBusy] = useState(false);
  useEffect(() => setPoll(post.poll ?? null), [post.poll]);
  if (!poll) return null;
  const showResults = poll.mine != null || post.author.id === me;
  const vote = async (i: number | null) => {
    if (signedOut) return navigate('/entrar');
    setBusy(true);
    try { setPoll(await communityApi.vote(post.id, i)); } catch { /* fica como estava */ } finally { setBusy(false); }
  };
  return (
    <div className={`cm-poll${showResults ? ' is-done' : ''}`}>
      {poll.options.map((o, i) => {
        const pc = poll.total ? Math.round((100 * o.votes) / poll.total) : 0;
        return (
          <button key={i} className={`cm-poll__o${poll.mine === i ? ' is-mine' : ''}`} disabled={busy} onClick={() => void vote(poll.mine === i ? null : i)}
            aria-pressed={poll.mine === i} title={poll.mine === i ? 'Tirar o meu voto' : 'Votar nesta'}>
            {showResults && <i style={{ width: `${pc}%` }} aria-hidden="true" />}
            <span>{o.text}{poll.mine === i && <Icon name="check" size={13} />}</span>
            {showResults && <b className="mono">{pc}%</b>}
          </button>
        );
      })}
      <small className="faint">{poll.total} {poll.total === 1 ? 'voto' : 'votos'}{poll.mine != null ? ` · você votou em ${poll.options[poll.mine]?.text}. Toque de novo para tirar.` : showResults ? '' : ' · toque numa opção para votar'}</small>
    </div>
  );
}

/** Onde a conversa está: a comunidade ou a Praça. */
export function PlaceLink({ post }: { post: Pick<Post, 'community'> }) {
  return post.community ? <Link to={`/w/${post.community.slug}`} className="cm-card__comm">w/{post.community.slug}</Link> : <Link to="/comunidade" className="cm-card__comm">Praça</Link>;
}

/** Quem escreveu, com "novo por aqui" e o jogo da conversa ("jogando", "zerou"), quando a pessoa deixou mostrar. */
export function Byline({ p, ctx, game, official = false, avatar = true }: { p: PersonRef; ctx?: string | null; game?: GameMini | null; official?: boolean; avatar?: boolean }) {
  return (
    <span className="cm-byline">
      <PersonLink p={p} official={official} avatar={avatar} />
      {p.novo && <span className="cm-badge cm-badge--novo">Novo por aqui</span>}
      {ctx && game && <span className="faint cm-byline__ctx">{game.title} · {ctx}</span>}
    </span>
  );
}

export function PostCard({ post, showCommunity = true, why = true }: { post: Post; showCommunity?: boolean; why?: boolean }) {
  const [covered, reveal] = usePostCovered(post);
  const href = postHref(post);
  const excerpt = plainText(post.body.replace(/https?:\/\/\S+/g, ' ')).replace(/\s+/g, ' ').trim();
  const th = postThumb(post);
  const title = postTitle(post);
  const showEx = !!post.title && !!excerpt;
  return (
    <article className={`cm-card${post.pinned ? ' is-pinned' : ''}${post.hidden ? ' is-hidden' : ''}`}>
      <div className="cm-card__main">
        <div className="cm-card__by">
          <Byline p={post.author} ctx={post.authorCtx} game={post.game} official={!!post.community?.official} />
          <span className="faint">· {ago(post.createdAt)}</span>
          {showCommunity && <><span className="faint">·</span><PlaceLink post={post} /></>}
        </div>
        <div className="cm-card__top">
          {post.pinned && <span className="cm-chip cm-chip--pin"><Icon name="pin" size={12} />Fixada</span>}
          <KindChip kind={post.kind} />
          {post.kind === 'pergunta' && post.answerId && <span className="cm-chip cm-chip--ok"><Icon name="check" size={12} />Dúvida resolvida</span>}
          <SpoilerNote post={post} />
          {post.hidden && <span className="cm-chip cm-chip--hidden">Fora do ar pela moderação</span>}
        </div>
        <h3 className={`cm-card__t${post.title ? '' : ' cm-card__t--text'}`}><Link to={href}>{covered && !post.title ? 'Conversa com spoiler' : title}</Link></h3>
        {covered ? (
          <button className="cm-card__covered" onClick={reveal}><Icon name="escudo" size={14} />Coberto: spoiler {post.spoiler ? SPOILER_LABEL[post.spoiler].toLowerCase() : ''} de {post.game?.title}{post.spoilerNote ? ` (${post.spoilerNote})` : ''}. Tocar para ver.</button>
        ) : showEx ? <p className="cm-card__ex">{excerpt.length > 220 ? `${excerpt.slice(0, 220).trimEnd()}…` : excerpt}</p> : null}
        {post.kind === 'enquete' && !covered && <PollBox post={post} />}
        <div className="cm-card__meta">
          <ReactionBar target="post" id={post.id} value={post.reactions} compact game={post.game} />
          <Link to={`${href}#respostas`} className="cm-card__n" aria-label={`${post.replies} respostas`}><Icon name="mensagem" size={15} />{post.replies}</Link>
          {!!post.unread && post.readAt && <Link to={`${href}#novas`} className="cm-card__new">{post.unread === 1 ? '1 nova' : `${post.unread} novas`} desde a sua visita</Link>}
          {post.game && !showCommunity && <Link to={`/jogos/${post.game.slug}`} className="cm-card__game">{post.game.title}</Link>}
          <span className="cm-card__save"><SaveButton post={post} /></span>
        </div>
        {why && post.why && <span className="cm-card__why"><Icon name="jornada" size={11} />{post.why}</span>}
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
        {list.length > 0 && <span className="kicker sec-head__note"><span className="dot-now" aria-hidden="true" />Spoiler coberto até você tocar</span>}
      </div>
      {list.length === 0
        ? <p className="muted">Ninguém falou de {title} ainda. <Link to={`/escrever?jogo=${encodeURIComponent(gameId)}`}>Abrir uma conversa</Link></p>
        : <div className="cm-list">{list.map((p) => <PostCard key={p.id} post={p} why={false} />)}</div>}
    </section>
  );
}
