import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { useStore } from '../data/store';
import {
  KINDS, MAX_IMAGES, SPOILERS, clipOk, communityApi, communityImage, postHref, postTitle, refreshNews,
  type Community, type GameMini, type PostDraft, type PostFull, type PostKind, type Reply, type SpoilerLevel,
} from '../data/communityApi';
import { ensureRules } from '../data/moderationApi';
import { ReportButton } from '../components/Moderation';
import { ModHide } from '../components/CommunityMod';
import {
  Byline, GameSearchPick, ImageGrid, KindChip, MentionArea, PersonAvatar, PollBox, PostText, ReactionBar, SaveButton, SpoilerNote, SpoilerShield,
  ago, spoilerHint, useProgressOf, usePostCovered,
} from '../components/Posts';
import { CoverArt } from '../components/CoverArt';
import { EmbedBlock, embedFor } from '../components/Embed';
import { Icon } from '../components/Icon';
import { shrink } from '../lib/image';
import { plainText, quoteOf } from '../lib/postText';
import { clearDraft, readDraft, useDraft } from '../lib/draft';

const errOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora.');

function useMe(): string | null {
  return useStore((s) => s.mode === 'demo' ? 'demo-me' : s.profile?.id ?? null);
}

/* ------------------------------------------------------------------ */
/* A conversa: /conversa/id (e o endereço antigo /w/nome/id)            */
/* ------------------------------------------------------------------ */
export function PostPage({ id }: { id: string }) {
  const [post, setPost] = useState<PostFull | null | undefined>(undefined);
  const [since, setSince] = useState<string | null | undefined>(undefined);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { setPost(await communityApi.post(id)); } catch (e) { setErr(errOf(e)); setPost(null); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  // A visita anterior (para a linha "novas desde a sua visita"); abrir já conta como lida.
  useEffect(() => { let alive = true; communityApi.read(id).then((x) => alive && setSince(x)).catch(() => alive && setSince(null)); return () => { alive = false; }; }, [id]);
  useEffect(() => { if (post) document.title = `${postTitle(post)} · ${post.community ? post.community.name : 'Praça'} · WinnerZ`; }, [post]);
  // Respostas novas nesta postagem deixam de contar como novas ao abrir.
  useEffect(() => { if (post) void communityApi.seen().catch(() => {}); }, [post?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!post || since === undefined || !location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
  }, [post?.id, since]); // eslint-disable-line react-hooks/exhaustive-deps

  if (post === undefined || since === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  if (!post) return (
    <main className="page pad narrow">
      <h1 className="t big">Conversa</h1>
      <p className="muted lead">{err || 'Essa conversa não existe mais (ou saiu do ar).'}</p>
      <Link to="/comunidade">Voltar para a Praça</Link>
    </main>
  );
  return <PostBody post={post} setPost={setPost} reload={load} since={since} />;
}

function PostBody({ post, setPost, reload, since }: { post: PostFull; setPost: (p: PostFull) => void; reload: () => Promise<void>; since: string | null }) {
  const me = useMe();
  const isAdmin = useStore((s) => !!s.isAdmin);
  const [covered, reveal, reached] = usePostCovered(post);
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const mine = post.author.id === me;
  const c = post.communityFull;
  const title = postTitle(post);

  const pin = async () => { try { await communityApi.pin(post.id, !post.pinned); setPost({ ...post, pinned: !post.pinned }); } catch (e) { setErr(errOf(e)); } };
  const del = async () => { try { await communityApi.deletePost(post.id); navigate(c ? `/w/${c.slug}` : '/comunidade'); } catch (e) { setErr(errOf(e)); } };
  const answer = async (rid: string | null) => { try { await communityApi.answer(post.id, rid); setPost({ ...post, answerId: rid }); } catch (e) { setErr(errOf(e)); } };

  return (
    <main className="page pad cm-post">
      <div className="cm-post__grid">
        <div className="cm-post__main">
          <nav className="cm-post__crumb" aria-label="Onde você está">
            <Link to="/comunidade">Praça</Link>
            {c && <><span aria-hidden="true">›</span><Link to={`/w/${c.slug}`}>w/{c.slug}</Link></>}
            <span aria-hidden="true">›</span><span>Conversa</span>
          </nav>
          <article className={`cm-post__card${post.hidden ? ' is-hidden' : ''}`}>
            <div className="cm-post__by">
              <PersonAvatar p={post.author} size={40} />
              <Byline p={post.author} ctx={post.authorCtx} game={post.game} official={!!c?.official} avatar={false} />
              <span className="faint">· {ago(post.createdAt)}{post.editedAt ? ' · editada' : ''}</span>
            </div>
            <div className="cm-card__top">
              {post.pinned && <span className="cm-chip cm-chip--pin"><Icon name="pin" size={12} />Fixada</span>}
              <KindChip kind={post.kind} />
              {post.kind === 'pergunta' && post.answerId && <span className="cm-chip cm-chip--ok"><Icon name="check" size={12} />Dúvida resolvida</span>}
              <SpoilerNote post={post} />
              {post.hidden && <span className="cm-chip cm-chip--hidden">{mine ? 'Fora do ar pela moderação: só você vê' : 'Tirada pela moderação: só quem modera vê'}</span>}
            </div>
            {post.title ? <h1 className="cm-post__t">{post.title}</h1> : <h1 className="sr-only">{title}</h1>}
            {post.author.gone && <p className="faint cm-post__gone">Quem começou esta conversa apagou a conta. O texto saiu junto; as respostas continuam.</p>}
            {covered ? <SpoilerShield post={post} onReveal={reveal} reached={reached} /> : (
              <>
                {post.clip && <EmbedBlock url={post.clip} />}
                {post.body && <PostText text={post.body} className={`cm-post__text${post.title ? '' : ' cm-post__text--lead'}`} embeds={6} />}
                <ImageGrid images={post.images} />
                {post.kind === 'enquete' && <PollBox post={post} />}
              </>
            )}
            {post.game && (
              <Link to={`/jogos/${post.game.slug}`} className="cm-post__game">
                <span className="cm-post__gcv"><CoverArt game={{ title: post.game.title, cover: post.game.cover ?? '' }} /></span>
                <span><small className="kicker">{post.kind === 'aquisicao' ? 'Chegou na coleção' : 'Sobre o jogo'}</small><b>{post.game.title}</b></span>
              </Link>
            )}
            <div className="cm-post__acts">
              <ReactionBar target="post" id={post.id} value={post.reactions} game={post.game} />
              <span className="cm-post__tools">
                <span className="cm-post__savem"><SaveButton post={post} /></span>
                {mine && <Link className="btn quiet sm" to={`/conversa/${post.id}/editar`}>Editar</Link>}
                {mine && (confirmDel
                  ? <><button className="btn danger-solid sm" onClick={() => void del()}>Apagar de vez</button><button className="btn quiet sm" onClick={() => setConfirmDel(false)}>Cancelar</button></>
                  : <button className="btn quiet sm" onClick={() => setConfirmDel(true)}>Apagar</button>)}
                {c && (post.canModerate || isAdmin) && !post.hidden && <button className="btn quiet sm" onClick={() => void pin()}>{post.pinned ? 'Soltar' : 'Fixar no topo'}</button>}
                {c && post.canModerate && !mine && <ModHide kind="postagem" id={post.id} hidden={post.hidden} onDone={reload} button="btn quiet sm" />}
                {!mine && post.author.handle && <ReportButton kind="postagem" handle={post.author.handle} refId={post.id} snapshot={{ title, text: post.body.slice(0, 400), slug: c?.slug, community: c?.name ?? 'Praça', game: post.game?.title, photo: post.images.length > 0 }} what={`A postagem “${title}” de @${post.author.handle}${c ? ` em w/${c.slug}` : ' na Praça'}.`} className="btn quiet sm" />}
              </span>
            </div>
            {err && <p className="awards__error" role="alert">{err}</p>}
          </article>

          <Thread post={post} covered={covered} onReveal={reveal} onAnswer={answer} reload={reload} since={since} />
        </div>

        <aside className="cm-post__side">
          <ThisConversation post={post} />
          <PlaceBox post={post} />
          <People post={post} />
        </aside>
      </div>
    </main>
  );
}

/** Salvar e acompanhar a conversa. */
function ThisConversation({ post }: { post: PostFull }) {
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [following, setFollowing] = useState(!!post.following);
  useEffect(() => setFollowing(!!post.following), [post.following]);
  const follow = async () => {
    if (signedOut) return navigate('/entrar');
    const next = !following; setFollowing(next);
    try { await communityApi.follow(post.id, next); } catch { setFollowing(!next); }
  };
  return (
    <section className="cm-side cm-thisconv" aria-label="Esta conversa">
      <span className="kicker kicker--now">Esta conversa</span>
      <div className="cm-thisconv__row"><SaveButton post={post} /></div>
      <label className="cm-thisconv__row cm-thisconv__sw">
        <span><Icon name="sino" size={15} />Acompanhar respostas</span>
        <input type="checkbox" role="switch" className="switch" checked={following} onChange={() => void follow()} />
      </label>
      <small className="faint">{following ? 'As respostas novas aparecem nas suas novidades da Comunidade.' : 'Sem avisos desta conversa. Ela continua nos seus salvos, se você salvou.'}</small>
      {post.game && <Link className="btn ghost sm cm-thisconv__jog" to={`/jogatina/criar?jogo=${encodeURIComponent(post.game.slug)}`}><Icon name="jogos" size={15} />Marcar uma jogatina</Link>}
    </section>
  );
}

/** Onde a conversa está (Praça ou comunidade) e o jogo, pela sua Jornada. */
function PlaceBox({ post }: { post: PostFull }) {
  const progressOf = useProgressOf();
  const c = post.communityFull;
  const pr = post.game ? progressOf(post.game.id) : null;
  return (
    <section className="cm-side" aria-label="Onde está">
      {c ? <CommunityMini c={c} /> : (
        <Link to="/comunidade" className="cm-mini">
          <span className="cm-mini__art cm-mini__art--praca" aria-hidden="true"><Icon name="comunidade" size={20} /></span>
          <span><b>Na Praça</b><small className="faint">Todo mundo da comunidade vê</small></span>
        </Link>
      )}
      {post.game && (
        <Link to={`/jogos/${post.game.slug}`} className="cm-place__game">
          <span className="cm-post__gcv"><CoverArt game={{ title: post.game.title, cover: post.game.cover ?? '' }} /></span>
          <span><b>{post.game.title}</b><small className="faint">{pr ? (pr.completed ? 'Na sua Jornada · zerou' : `Na sua Jornada${pr.progress ? ` · ${Math.round(pr.progress)}%` : ''} · jogando`) : 'Não está na sua Jornada'}</small></span>
        </Link>
      )}
      {post.spoiler && <small className="faint">O spoiler fica coberto até você tocar. {spoilerHint(post, pr ? (pr.completed || (pr.progress ?? 0) >= (post.spoiler === 'final' ? 95 : post.spoiler === 'meio' ? 50 : 15)) : null)}</small>}
    </section>
  );
}

function People({ post }: { post: PostFull }) {
  const list = useMemo(() => {
    const m = new Map<string, PostFull['author']>();
    [post.author, ...post.thread.map((r) => r.author)].forEach((p) => { if (p.handle && !p.gone && !m.has(p.id)) m.set(p.id, p); });
    return [...m.values()];
  }, [post]);
  if (list.length < 2) return null;
  return (
    <section className="cm-side" aria-label="Quem está na conversa">
      <span className="kicker">Quem está na conversa</span>
      <div className="cm-people">{list.slice(0, 14).map((p) => <Link key={p.id} to={`/@${p.handle!.toLowerCase()}`} title={`@${p.handle}`}><PersonAvatar p={p} size={30} /></Link>)}</div>
    </section>
  );
}

function CommunityMini({ c }: { c: Community }) {
  const cover = communityImage(c.cover) ?? c.game?.cover ?? null;
  return (
    <Link to={`/w/${c.slug}`} className="cm-mini">
      <span className="cm-mini__art" aria-hidden="true">{cover ? <img src={cover} alt="" /> : c.name.slice(0, 1)}</span>
      <span><b>{c.name}</b><small className="faint">{c.members} {c.members === 1 ? 'pessoa segue' : 'pessoas seguem'}</small></span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Respostas em fio (2 níveis)                                          */
/* ------------------------------------------------------------------ */
/** Leva até uma resposta e acende ela por um instante (ir ao pai, links com #r-…). */
function flashTo(elId: string) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash');
  setTimeout(() => el.classList.remove('is-flash'), 1800);
}

const score = (r: Reply) => Object.entries(r.reactions).reduce((n, [k, v]) => (k === 'mine' ? n : n + (typeof v === 'number' ? v : 0)), 0);

function Thread({ post, covered, onReveal, onAnswer, reload, since }: { post: PostFull; covered: boolean; onReveal: () => void; onAnswer: (id: string | null) => void; reload: () => Promise<void>; since: string | null }) {
  const me = useMe();
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [replyTo, setReplyTo] = useState<{ top: string; quote: string; nonce: number } | null>(null);
  const [folded, setFolded] = useState<Set<string>>(() => new Set());
  const [order, setOrder] = useState<'ordem' | 'uteis'>('ordem');
  const kids = (id: string) => post.thread.filter((r) => r.parentId === id);
  const isNew = (r: Reply) => !!since && r.createdAt > since && r.author.id !== me && !r.deleted;
  const tops = useMemo(() => {
    const t = post.thread.filter((r) => !r.parentId);
    if (order === 'ordem') return t;
    const val = (r: Reply) => score(r) + post.thread.filter((k) => k.parentId === r.id).reduce((n, k) => n + score(k), 0) / 2 + (r.id === post.answerId ? 1000 : 0);
    return [...t].sort((a, b) => val(b) - val(a));
  }, [post.thread, post.answerId, order]);
  const newCount = post.thread.filter(isNew).length;
  // A linha "novas desde a sua visita" fica antes da primeira resposta (de cima) que tem novidade, na ordem do tempo.
  const firstNewTop = order === 'ordem' ? tops.find((t) => isNew(t) || kids(t.id).some(isNew))?.id ?? null : null;
  const answer = post.answerId ? post.thread.find((r) => r.id === post.answerId) : undefined;
  const canAnswer = post.kind === 'pergunta' && post.author.id === me;
  const count = post.thread.filter((r) => !r.deleted).length;
  const sent = async () => { setReplyTo(null); await reload(); void refreshNews(); };
  const people = useMemo(() => [...new Set([post.author, ...post.thread.map((r) => r.author)].filter((p) => p.handle && !p.gone && p.id !== me).map((p) => p.handle!))], [post, me]);
  const open = (top: string, quote = '') => setReplyTo({ top, quote, nonce: Date.now() });
  const fold = (id: string) => setFolded((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const item = (r: Reply, top: Reply) => (
    <ReplyItem r={r} post={post} isAnswer={r.id === post.answerId} canAnswer={canAnswer} onAnswer={onAnswer} reload={reload} fresh={isNew(r)}
      onReply={() => open(top.id)} onQuote={() => open(top.id, quoteOf(r.author.handle, r.body))}
      onParent={r.parentId ? () => flashTo(`r-${r.parentId}`) : undefined}
      fold={!r.parentId && kids(r.id).length > 0 ? { on: folded.has(r.id), toggle: () => fold(r.id) } : undefined} />
  );
  return (
    <section className="cm-thread" id="respostas" aria-labelledby="cm-thread-t">
      {covered && count > 0 ? (
        <>
          <h2 id="cm-thread-t" className="cm-thread__t">{count} {count === 1 ? 'resposta' : 'respostas'}</h2>
          <div className="cm-shield cm-shield--thread"><Icon name="escudo" size={18} /><p>As respostas também podem ter spoiler.</p><button className="btn ghost sm" onClick={onReveal}>Ver mesmo assim</button></div>
        </>
      ) : (
        <>
          {signedOut ? <p className="cm-thread__login"><Link to="/entrar">Entre na sua conta</Link> para responder.</p>
            : <Composer postId={post.id} parentId={null} onSent={sent} people={people} placeholder={post.kind === 'pergunta' ? 'Sabe a resposta? Conta aqui.' : post.author.handle && post.author.id !== me ? `Responder a @${post.author.handle}…` : 'Escreva uma resposta'} />}
          <div className="cm-thread__head">
            <h2 id="cm-thread-t" className="kicker cm-thread__t">{count === 0 ? 'Respostas' : `${count} ${count === 1 ? 'resposta' : 'respostas'}`}{newCount > 0 && <span className="cm-thread__new"> · {newCount === 1 ? '1 nova' : `${newCount} novas`}</span>}</h2>
            {tops.length > 1 && (
              <span className="seg seg--sm" role="group" aria-label="Ordem das respostas">
                <button aria-pressed={order === 'ordem'} onClick={() => setOrder('ordem')}>Em ordem</button>
                <button aria-pressed={order === 'uteis'} onClick={() => setOrder('uteis')}>Mais úteis</button>
              </span>
            )}
          </div>
          {answer && !answer.deleted && (
            <div className="cm-answer">
              <span className="kicker kicker--now"><Icon name="check" size={12} /> Resolveu a dúvida{post.author.handle ? ` de @${post.author.handle}` : ''}</span>
              <ReplyItem r={answer} post={post} isAnswer canAnswer={canAnswer} onAnswer={onAnswer} onReply={() => open(answer.parentId ?? answer.id)} reload={reload} compact />
              <button className="cm-link" onClick={() => flashTo(`r-${answer.id}`)}>Ver na conversa</button>
            </div>
          )}
          {tops.length === 0 ? <p className="muted cm-thread__empty">Ninguém respondeu ainda.</p> : (
            <ol className="cm-replies">
              {tops.map((r) => {
                const ks = kids(r.id);
                const isFolded = folded.has(r.id);
                return (
                  <li key={r.id} className="cm-replies__top">
                    {r.id === firstNewTop && <div className="cm-newline" id="novas" role="separator">{newCount === 1 ? '1 resposta nova' : `${newCount} respostas novas`} desde a sua última visita</div>}
                    {item(r, r)}
                    {isFolded && ks.length > 0 && <button className="cm-folded" onClick={() => fold(r.id)}>{ks.length} {ks.length === 1 ? 'resposta recolhida' : 'respostas recolhidas'} · Mostrar</button>}
                    {((!isFolded && ks.length > 0) || replyTo?.top === r.id) && (
                      <ol className="cm-replies__kids">
                        {!isFolded && ks.map((k) => <li key={k.id}>{item(k, r)}</li>)}
                        {replyTo?.top === r.id && <li><Composer key={replyTo.nonce} postId={post.id} parentId={r.id} onSent={sent} onCancel={() => setReplyTo(null)} autoFocus initial={replyTo.quote} people={people} placeholder={r.author.handle ? `Responder a @${r.author.handle}` : 'Responder'} /></li>}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

function ReplyItem({ r, post, isAnswer, canAnswer, onAnswer, onReply, onQuote, onParent, fold, reload, fresh = false, compact = false }: {
  r: Reply; post: PostFull; isAnswer: boolean; canAnswer: boolean; onAnswer: (id: string | null) => void; onReply: () => void;
  onQuote?: () => void; onParent?: () => void; fold?: { on: boolean; toggle: () => void }; reload: () => Promise<void>; fresh?: boolean; compact?: boolean;
}) {
  const me = useMe();
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const mine = r.author.id === me;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(r.body);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const title = postTitle(post);
  if (r.deleted) return <div className="cm-reply is-deleted" id={compact ? undefined : `r-${r.id}`}><p className="faint">{r.author.gone ? 'Resposta de uma conta apagada.' : 'Resposta apagada por quem escreveu.'}</p></div>;
  const save = async () => {
    setBusy(true); setErr('');
    try { await communityApi.editReply(r.id, text); setEditing(false); await reload(); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  const del = async () => { try { await communityApi.deleteReply(r.id); await reload(); } catch (e) { setErr(errOf(e)); } };
  const copy = async () => {
    const url = `${location.origin}/conversa/${post.id}#r-${r.id}`;
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copie o link:', url); }
  };
  return (
    <div className={`cm-reply${isAnswer && !compact ? ' is-answer' : ''}${r.hidden ? ' is-hidden' : ''}${fresh ? ' is-new' : ''}`} id={compact ? undefined : `r-${r.id}`}>
      <PersonAvatar p={r.author} size={32} />
      <div className="cm-reply__b">
        <div className="cm-reply__by">
          <Byline p={r.author} ctx={r.authorCtx} game={post.game} official={!!post.community?.official} avatar={false} />
          {!r.author.gone && r.author.id === post.author.id && <span className="cm-badge cm-badge--op">{post.kind === 'pergunta' ? 'Quem perguntou' : 'Quem postou'}</span>}
          <span className="faint">{ago(r.createdAt)}{r.editedAt ? ' · editada' : ''}</span>
          {isAnswer && !compact && <span className="cm-chip cm-chip--ok"><Icon name="check" size={12} />Resolveu a dúvida</span>}
          {r.hidden && <span className="cm-chip cm-chip--hidden">Fora do ar pela moderação</span>}
        </div>
        {editing ? (
          <div className="cm-compose cm-compose--edit">
            <textarea className="field" rows={3} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} />
            <span className="cm-compose__acts"><button className="btn quiet sm" onClick={() => { setEditing(false); setText(r.body); }}>Cancelar</button><button className="btn primary sm" disabled={busy || !text.trim()} onClick={() => void save()}>Salvar</button></span>
          </div>
        ) : <PostText text={r.body} embeds={2} />}
        {!compact && (
          <div className="cm-reply__acts">
            <ReactionBar target="resposta" id={r.id} value={r.reactions} compact game={post.game} />
            {!signedOut && <button className="cm-link" onClick={onReply}>Responder</button>}
            {!signedOut && onQuote && <button className="cm-link" onClick={onQuote} title="Responder citando este trecho"><Icon name="citar" size={13} />Citar</button>}
            <button className="cm-link" onClick={() => void copy()} title="Copiar o link desta resposta"><Icon name="link" size={13} />{copied ? 'Copiado' : 'Copiar link'}</button>
            {onParent && <button className="cm-link" onClick={onParent} title="Ir até a resposta de cima"><Icon name="subir" size={13} />Ir ao pai</button>}
            {fold && <button className="cm-link" onClick={fold.toggle} aria-expanded={!fold.on}>{fold.on ? 'Mostrar respostas' : 'Recolher'}</button>}
            {canAnswer && !mine && <button className="cm-link" onClick={() => onAnswer(isAnswer ? null : r.id)}>{isAnswer ? 'Desmarcar' : 'Resolveu minha dúvida'}</button>}
            {mine && !editing && <button className="cm-link" onClick={() => setEditing(true)}>Editar</button>}
            {mine && (confirmDel ? <><button className="cm-link cm-link--danger" onClick={() => void del()}>Apagar de vez</button><button className="cm-link" onClick={() => setConfirmDel(false)}>Cancelar</button></> : <button className="cm-link" onClick={() => setConfirmDel(true)}>Apagar</button>)}
            {post.communityFull && post.canModerate && !mine && <ModHide kind="resposta" id={r.id} hidden={r.hidden} onDone={reload} />}
            {!mine && r.author.handle && <ReportButton kind="resposta" handle={r.author.handle} refId={r.id} snapshot={{ title, text: r.body.slice(0, 400), slug: post.community?.slug, community: post.community?.name ?? 'Praça', postId: post.id }} what={`Uma resposta de @${r.author.handle} em “${title}”.`} className="cm-link" />}
          </div>
        )}
        {err && <p className="awards__error" role="alert">{err}</p>}
      </div>
    </div>
  );
}

const agoShort = (t: number | null) => (t ? `Rascunho salvo ${ago(new Date(t).toISOString())}` : '');

function Composer({ postId, parentId, onSent, onCancel, placeholder, people, initial = '', autoFocus = false }: { postId: string; parentId: string | null; onSent: () => Promise<void>; onCancel?: () => void; placeholder: string; people: string[]; initial?: string; autoFocus?: boolean }) {
  // Rascunho automático: volta se a página fechar no meio da resposta (a citação nova tem prioridade).
  const key = `r:${postId}:${parentId ?? 'topo'}`;
  const [text, setText] = useState(() => initial || readDraft<string>(key) || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const savedAt = useDraft(key, text, !text.trim() || text === initial);
  const send = async () => {
    if (!text.trim()) return;
    setErr('');
    if (!(await ensureRules())) return;
    setBusy(true);
    try { await communityApi.reply(postId, parentId, text); clearDraft(key); setText(''); await onSent(); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  return (
    <div className={`cm-compose${parentId ? ' cm-compose--kid' : ''}`}>
      <MentionArea className="field" rows={parentId ? (initial ? 4 : 2) : 3} maxLength={5000} value={text} onChange={setText} people={people} placeholder={placeholder} autoFocus={autoFocus}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }} aria-label={placeholder} />
      <span className="cm-compose__acts">
        <small className="faint cm-compose__hint">{savedAt && text.trim() ? agoShort(savedAt) : '**negrito**, *itálico*, ||spoiler||, @pessoa'}</small>
        {onCancel && <button className="btn quiet sm" onClick={onCancel}>Cancelar</button>}
        <button className="btn primary sm" disabled={busy || !text.trim()} onClick={() => void send()}>{busy ? 'Enviando…' : 'Responder'}</button>
      </span>
      {err && <p className="awards__error" role="alert">{err}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Escrever e editar: /escrever (Praça), /w/nome/escrever, /conversa/id/editar */
/* ------------------------------------------------------------------ */
export function PostEditorPage({ slug, id }: { slug?: string; id?: string }) {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const games = useStore((s) => s.games);
  const me = useMe();
  const q = new URLSearchParams(location.search);
  const wanted = slug ?? q.get('w');
  const [c, setC] = useState<Community | null | undefined>(wanted ? undefined : null);
  const [orig, setOrig] = useState<PostFull | null | undefined>(id ? undefined : null);
  useEffect(() => { if (wanted) communityApi.get(wanted).then(setC).catch(() => setC(null)); }, [wanted]);
  useEffect(() => { if (id) communityApi.post(id).then(setOrig).catch(() => setOrig(null)); }, [id]);
  useEffect(() => { document.title = `${id ? 'Editar postagem' : 'Escrever'} · WinnerZ`; }, [id]);
  if (signedOut) return <main className="page pad narrow"><h1 className="t big">Escrever</h1><p className="muted lead">Entre na sua conta para publicar.</p><Link className="btn primary" to="/entrar">Entrar</Link></main>;
  if (c === undefined || orig === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  if (id && (!orig || orig.author.id !== me)) return <main className="page pad narrow"><h1 className="t big">Editar</h1><p className="muted lead">Só quem escreveu pode editar.</p><Link to="/comunidade">Voltar</Link></main>;
  const place = orig ? orig.communityFull : c;
  if (place?.official && !isAdmin && !id) return <main className="page pad narrow"><h1 className="t big">{place.name}</h1><p className="muted lead">Na comunidade oficial, só o canal publica. Dá para responder às postagens.</p><Link to={`/w/${place.slug}`}>Voltar</Link></main>;
  const g = q.get('jogo') ? games[q.get('jogo')!] : null;
  const startKind = (KINDS.find((k) => k.k === q.get('tipo'))?.k ?? null) as PostKind | null;
  return <PostEditor place={place ?? null} orig={orig ?? null} startGame={g ? { id: g.id, slug: g.slug, title: g.title, cover: g.cover } : null} startKind={startKind} fixedPlace={!!slug || !!orig} />;
}

type EditorDraft = { kind: PostKind; title: string; body: string; game: GameMini | null; spoiler: SpoilerLevel | null; spoilerNote: string; clip: string; poll: string[] };

function PostEditor({ place: startPlace, orig, startGame, startKind, fixedPlace }: { place: Community | null; orig: PostFull | null; startGame: GameMini | null; startKind: PostKind | null; fixedPlace: boolean }) {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const draftKey = orig ? `p:${orig.id}` : `p:novo:${startPlace?.slug ?? 'praca'}`;
  const d0 = orig ? null : readDraft<EditorDraft>(draftKey);
  const [place, setPlace] = useState<Community | null>(startPlace);
  const [places, setPlaces] = useState<Community[]>([]);
  const [kind, setKind] = useState<PostKind>(orig?.kind ?? d0?.kind ?? startKind ?? 'discussao');
  const [title, setTitle] = useState(orig?.title ?? d0?.title ?? '');
  const [body, setBody] = useState(orig?.body ?? d0?.body ?? '');
  const [game, setGame] = useState<GameMini | null>(orig?.game ?? d0?.game ?? startGame ?? startPlace?.game ?? null);
  const [spoiler, setSpoiler] = useState<SpoilerLevel | null>(orig?.spoiler ?? d0?.spoiler ?? null);
  const [spoilerNote, setSpoilerNote] = useState(orig?.spoilerNote ?? d0?.spoilerNote ?? '');
  const [images, setImages] = useState<string[]>(orig?.images ?? []);
  const [clip, setClip] = useState(orig?.clip ?? d0?.clip ?? '');
  const [poll, setPoll] = useState<string[]>(orig?.poll ? orig.poll.options.map((o) => o.text) : d0?.poll ?? ['', '']);
  const [upBusy, setUpBusy] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const uploaded = useRef<string[]>([]);
  const area = useRef<HTMLTextAreaElement>(null);
  const clipBad = clip.trim() !== '' && !clipOk(clip);
  const pollOk = kind !== 'enquete' || poll.filter((x) => x.trim()).length >= 2;
  const hasSomething = title.trim().length >= 3 || body.trim().length > 0 || images.length > 0 || !!clip.trim();
  const ready = hasSomething && !(title.trim() && title.trim().length < 3) && !clipBad && !(kind === 'clipe' && !clip.trim()) && pollOk && !(kind === 'aquisicao' && !game) && !upBusy;
  const pollVotes = orig?.poll?.total ?? 0;
  const savedAt = useDraft(orig ? null : draftKey, { kind, title, body, game, spoiler, spoilerNote, clip, poll } satisfies EditorDraft, !title.trim() && !body.trim());

  useEffect(() => { if (!fixedPlace) communityApi.list().then((l) => setPlaces(l.filter((x) => !x.official || isAdmin))).catch(() => {}); }, [fixedPlace, isAdmin]);
  // Imagens enviadas e não usadas (a pessoa desistiu) saem do armazenamento.
  useEffect(() => () => { const left = uploaded.current; if (left.length) void communityApi.removeImages(left); }, []);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMAGES - images.length;
    const list = [...files].filter((f) => f.type.startsWith('image/')).slice(0, room);
    if (files.length > room) setErr(`No máximo ${MAX_IMAGES} imagens por postagem.`); else setErr('');
    setUpBusy((n) => n + list.length);
    for (const f of list) {
      try {
        const path = await communityApi.uploadImage(await shrink(f, 1600));
        uploaded.current.push(path);
        setImages((l) => (l.length < MAX_IMAGES ? [...l, path] : l));
      } catch (e) { setErr(errOf(e)); }
      finally { setUpBusy((n) => n - 1); }
    }
  };
  const wrap = (a: string, b = a) => {
    const t = area.current; if (!t) return;
    const s = t.selectionStart, e = t.selectionEnd;
    const sel = body.slice(s, e) || 'texto';
    const next = body.slice(0, s) + a + sel + b + body.slice(e);
    setBody(next);
    requestAnimationFrame(() => { t.focus(); t.setSelectionRange(s + a.length, s + a.length + sel.length); });
  };
  const submit = async () => {
    setErr('');
    if (!(await ensureRules())) return;
    setBusy(true);
    const d: PostDraft = { kind, title: title.trim(), body, gameId: game?.id ?? null, spoiler: game ? spoiler : null, spoilerNote: game && spoiler ? spoilerNote.trim() || null : null, images, clip: clip.trim() || null, poll: kind === 'enquete' ? poll.map((x) => x.trim()).filter(Boolean) : null };
    try {
      const removed = (orig?.images ?? []).filter((x) => !images.includes(x));
      const p = orig ? await communityApi.editPost(orig.id, d, removed) : await communityApi.createPost(place?.id ?? null, d);
      uploaded.current = uploaded.current.filter((x) => !images.includes(x));
      clearDraft(draftKey);
      navigate(postHref(p));
    } catch (e) { setErr(errOf(e)); setBusy(false); }
  };
  const removeImage = (path: string) => {
    setImages((l) => l.filter((x) => x !== path));
    if (uploaded.current.includes(path)) { void communityApi.removeImages([path]); uploaded.current = uploaded.current.filter((x) => x !== path); }
  };
  const words = useMemo(() => plainText(body).length, [body]);
  const back = orig ? postHref(orig) : place ? `/w/${place.slug}` : '/comunidade';
  const kinds = KINDS.filter((k) => !orig || (k.k === 'enquete') === (orig.kind === 'enquete'));

  return (
    <main className="page pad cm-editor">
      <header className="studio__head">
        <Link to={back} className="faint">← {place ? place.name : 'Praça'}</Link>
        <h1 className="t big">{orig ? 'Editar' : 'Escrever'}</h1>
        {fixedPlace || !places.length
          ? <p className="muted lead">{place ? <>Em <b>w/{place.slug}</b>. {place.official ? 'Comunidade oficial: só o canal publica.' : 'Aparece na comunidade e na Praça.'}</> : <>Na <b>Praça</b>: todo mundo da comunidade vê.</>}</p>
          : (
            <label className="cm-editor__place"><span className="kicker">Onde</span>
              <select className="field" value={place?.id ?? ''} onChange={(e) => setPlace(places.find((x) => x.id === e.target.value) ?? null)}>
                <option value="">Praça (todo mundo vê)</option>
                {places.map((x) => <option key={x.id} value={x.id}>w/{x.slug} · {x.name}</option>)}
              </select>
            </label>
          )}
      </header>

      <div className="cm-editor__grid">
        <div className="cm-form">
          <fieldset className="cm-form__f cm-kinds">
            <legend className="kicker">Que tipo de postagem?</legend>
            <div className="cm-kinds__opts">
              {kinds.map((k) => (
                <label key={k.k} className={`cm-kinds__o${kind === k.k ? ' is-on' : ''}`}>
                  <input type="radio" name="kind" checked={kind === k.k} onChange={() => setKind(k.k)} />
                  <b>{k.label}</b><small>{k.hint}</small>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="cm-form__f"><span className="kicker">Título <small className="faint">(opcional)</small></span>
            <input className="field cm-editor__title" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === 'pergunta' ? 'A pergunta, numa frase' : kind === 'enquete' ? 'A pergunta da enquete' : kind === 'aquisicao' ? 'O que chegou?' : 'Do que você quer falar?'} />
          </label>

          {kind === 'enquete' && (
            <fieldset className="cm-form__f cm-pollmake">
              <legend className="kicker">Opções ({poll.length} de 6)</legend>
              {pollVotes > 0 && <small className="faint">A enquete já tem votos, então as opções ficam como estão.</small>}
              {poll.map((o, i) => (
                <span key={i} className="cm-pollmake__row">
                  <input className="field" value={o} maxLength={80} disabled={pollVotes > 0} onChange={(e) => setPoll((l) => l.map((x, k) => (k === i ? e.target.value : x)))} placeholder={`Opção ${i + 1}`} aria-label={`Opção ${i + 1}`} />
                  {poll.length > 2 && pollVotes === 0 && <button type="button" className="icon-btn" aria-label={`Tirar a opção ${i + 1}`} onClick={() => setPoll((l) => l.filter((_, k) => k !== i))}><Icon name="fechar" size={14} /></button>}
                </span>
              ))}
              {poll.length < 6 && pollVotes === 0 && <button type="button" className="btn quiet sm" onClick={() => setPoll((l) => [...l, ''])}><Icon name="mais" size={14} />Mais uma opção</button>}
            </fieldset>
          )}

          {kind === 'clipe' && (
            <label className="cm-form__f"><span className="kicker">Link do vídeo ou post</span>
              <input className="field" value={clip} onChange={(e) => setClip(e.target.value)} placeholder="Cole o link: YouTube, Twitch, TikTok, Instagram, X, Kick…" inputMode="url" aria-invalid={clipBad} />
              {clipBad ? <small className="awards__error">Cole o endereço completo, começando com https://</small>
                : clip.trim() && !embedFor(clip) ? <small className="faint">Não reconhecemos esse site: vai aparecer como link.</small>
                : <small className="faint">YouTube, Twitch, Kick, TikTok, Instagram, X, Threads, Facebook, Reddit, Vimeo, Spotify e outros aparecem dentro da postagem.</small>}
              {clip.trim() && !clipBad && embedFor(clip) && <div className="cm-editor__clipprev"><EmbedBlock url={clip.trim()} /></div>}
            </label>
          )}

          <div className="cm-form__f">
            <span className="cm-editor__bar">
              <span className="kicker">Texto</span>
              <span className="cm-editor__fmt" role="toolbar" aria-label="Formatação">
                <button type="button" onClick={() => wrap('**')} title="Negrito"><b>B</b></button>
                <button type="button" onClick={() => wrap('*')} title="Itálico"><i>I</i></button>
                <button type="button" onClick={() => wrap('||')} title="Esconder um trecho com spoiler">Spoiler</button>
                <button type="button" onClick={() => wrap('\n> ', '\n')} title="Citar um trecho">Citar</button>
                <button type="button" onClick={() => setPreview((v) => !v)} aria-pressed={preview}>{preview ? 'Escrever' : 'Ver como fica'}</button>
              </span>
            </span>
            {preview ? <div className="cm-editor__preview">{body.trim() ? <PostText text={body} embeds={6} /> : <p className="faint">Nada escrito ainda.</p>}</div>
              : <textarea ref={area} className="field cm-editor__body" rows={9} maxLength={10000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva à vontade. Lista com “- ” no começo da linha. Link de vídeo ou post (YouTube, Instagram, TikTok, X…) numa linha só aparece dentro da postagem." />}
            <small className="faint">{words > 9000 ? `${body.length}/10000` : savedAt ? `Rascunho salvo ${ago(new Date(savedAt).toISOString())}.` : 'Trecho entre ||barras|| fica escondido até a pessoa tocar.'}</small>
          </div>

          <div className="cm-form__f">
            <span className="kicker">Imagens ({images.length} de {MAX_IMAGES})</span>
            <div className="cm-editor__imgs">
              {images.map((src) => (
                <span key={src} className="cm-editor__img"><img src={communityImage(src) ?? ''} alt="" /><button type="button" className="icon-btn" aria-label="Tirar a imagem" onClick={() => removeImage(src)}><Icon name="fechar" size={14} /></button></span>
              ))}
              {Array.from({ length: upBusy }, (_, i) => <span key={`u${i}`} className="cm-editor__img is-busy"><span className="faint">Enviando…</span></span>)}
              {images.length + upBusy < MAX_IMAGES && <button type="button" className="cm-editor__add" onClick={() => file.current?.click()}><Icon name="camera" size={20} /><span>Adicionar</span></button>}
              <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { void addFiles(e.target.files); e.target.value = ''; }} />
            </div>
          </div>
        </div>

        <aside className="cm-editor__side">
          <div className="cm-form__f"><span className="kicker">{kind === 'aquisicao' ? 'Que jogo chegou?' : 'Sobre algum jogo?'}</span>
            <GameSearchPick value={game} onChange={(g) => { setGame(g); if (!g) setSpoiler(null); }} label="Jogo da postagem" />
            <small className="faint">Ligada a um jogo, a postagem aparece também na ficha dele.</small>
          </div>
          {game && kind !== 'aquisicao' && (
            <fieldset className="cm-form__f cm-spoil">
              <legend className="kicker">Tem spoiler de {game.title}?</legend>
              <label className={`cm-spoil__o${!spoiler ? ' is-on' : ''}`}><input type="radio" name="sp" checked={!spoiler} onChange={() => setSpoiler(null)} /><b>Não tem</b></label>
              {SPOILERS.map((s) => (
                <label key={s.k} className={`cm-spoil__o${spoiler === s.k ? ' is-on' : ''}`}><input type="radio" name="sp" checked={spoiler === s.k} onChange={() => setSpoiler(s.k)} /><b>Spoiler {s.label.toLowerCase()}</b><small>{s.hint}</small></label>
              ))}
              {spoiler && (
                <label className="cm-spoil__note"><span className="kicker">Spoiler de quê? (opcional)</span>
                  <input className="field" value={spoilerNote} maxLength={80} onChange={(e) => setSpoilerNote(e.target.value)} placeholder="Ex.: a luta com a Malenia, o final da Ranni" />
                </label>
              )}
              <small className="faint">O texto fica coberto para todo mundo até a pessoa tocar. A Jornada de quem lê só avisa se ela já passou dessa parte.</small>
            </fieldset>
          )}
          {err && <p className="awards__error" role="alert">{err}</p>}
          <button className="btn primary cm-editor__go" disabled={!ready || busy} onClick={() => void submit()}>{busy ? 'Publicando…' : orig ? 'Salvar' : 'Publicar'}</button>
          <p className="faint cm-editor__rules">Valem as <Link to="/regras">regras do WinnerZ</Link>{place?.rules ? ' e os combinados desta comunidade' : ''}.</p>
        </aside>
      </div>
    </main>
  );
}
