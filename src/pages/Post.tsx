import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { useStore } from '../data/store';
import {
  KINDS, MAX_IMAGES, SPOILERS, clipOk, communityApi, communityImage, refreshNews,
  type Community, type GameMini, type PostDraft, type PostFull, type PostKind, type Reply, type SpoilerLevel,
} from '../data/communityApi';
import { ensureRules } from '../data/moderationApi';
import { ReportButton } from '../components/Moderation';
import {
  GameSearchPick, ImageGrid, KindChip, PersonAvatar, PersonLink, PostText, ReactionBar, SpoilerNote, SpoilerShield, ago, usePostCovered,
} from '../components/Posts';
import { CoverArt } from '../components/CoverArt';
import { EmbedBlock, embedFor } from '../components/Embed';
import { Icon } from '../components/Icon';
import { shrink } from '../lib/image';
import { plainText } from '../lib/postText';

const errOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora.');

function useMe(): string | null {
  return useStore((s) => s.mode === 'demo' ? 'demo-me' : s.profile?.id ?? null);
}

/* ------------------------------------------------------------------ */
/* A postagem e a conversa: /w/nome/id                                  */
/* ------------------------------------------------------------------ */
export function PostPage({ slug, id }: { slug: string; id: string }) {
  const [post, setPost] = useState<PostFull | null | undefined>(undefined);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    try { setPost(await communityApi.post(id)); } catch (e) { setErr(errOf(e)); setPost(null); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (post) document.title = `${post.title} · ${post.community.name} · WinnerZ`; }, [post]);
  // Respostas novas nesta postagem deixam de contar como novas ao abrir.
  useEffect(() => { if (post) void communityApi.seen().catch(() => {}); }, [post?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!post || !location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
  }, [post?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (post === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  if (!post) return (
    <main className="page pad narrow">
      <h1 className="t big">Postagem</h1>
      <p className="muted lead">{err || 'Essa postagem não existe mais (ou saiu do ar).'}</p>
      <Link to={`/w/${slug}`}>Ir para w/{slug}</Link>
    </main>
  );
  return <PostBody post={post} setPost={setPost} reload={load} />;
}

function PostBody({ post, setPost, reload }: { post: PostFull; setPost: (p: PostFull) => void; reload: () => Promise<void> }) {
  const me = useMe();
  const isAdmin = useStore((s) => !!s.isAdmin);
  const [covered, reveal] = usePostCovered(post);
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const mine = post.author.id === me;
  const c = post.communityFull;

  const pin = async () => { try { await communityApi.pin(post.id, !post.pinned); setPost({ ...post, pinned: !post.pinned }); } catch (e) { setErr(errOf(e)); } };
  const del = async () => { try { await communityApi.deletePost(post.id); navigate(`/w/${c.slug}`); } catch (e) { setErr(errOf(e)); } };
  const answer = async (rid: string | null) => { try { await communityApi.answer(post.id, rid); setPost({ ...post, answerId: rid }); } catch (e) { setErr(errOf(e)); } };

  return (
    <main className="page pad cm-post">
      <nav className="cm-post__crumb" aria-label="Onde você está">
        <Link to="/comunidade/comunidades">Comunidades</Link><span aria-hidden="true">/</span>
        <Link to={`/w/${c.slug}`}>w/{c.slug}</Link>
      </nav>
      <div className="cm-post__grid">
        <article className={`cm-post__card${post.hidden ? ' is-hidden' : ''}`}>
          <div className="cm-card__top">
            {post.pinned && <span className="cm-chip cm-chip--pin"><Icon name="pin" size={12} />Fixada</span>}
            <KindChip kind={post.kind} />
            {post.kind === 'pergunta' && post.answerId && <span className="cm-chip cm-chip--ok"><Icon name="check" size={12} />Resolvida</span>}
            <SpoilerNote post={post} />
            {post.hidden && <span className="cm-chip cm-chip--hidden">Fora do ar pela moderação: só você vê</span>}
          </div>
          <h1 className="cm-post__t">{post.title}</h1>
          <div className="cm-post__by">
            <PersonLink p={post.author} official={post.community.official} />
            <span className="faint">{ago(post.createdAt)}{post.editedAt ? ' · editada' : ''}</span>
          </div>
          {covered ? <SpoilerShield post={post} onReveal={reveal} /> : (
            <>
              {post.clip && <EmbedBlock url={post.clip} />}
              {post.body && <PostText text={post.body} className="cm-post__text" embeds={6} />}
              <ImageGrid images={post.images} />
            </>
          )}
          {post.game && (
            <Link to={`/jogos/${post.game.slug}`} className="cm-post__game">
              <span className="cm-post__gcv"><CoverArt game={{ title: post.game.title, cover: post.game.cover ?? '' }} /></span>
              <span><small className="kicker">Sobre o jogo</small><b>{post.game.title}</b></span>
            </Link>
          )}
          <div className="cm-post__acts">
            <ReactionBar target="post" id={post.id} value={post.reactions} />
            <span className="cm-post__tools">
              {mine && <Link className="btn quiet sm" to={`/w/${c.slug}/${post.id}/editar`}>Editar</Link>}
              {mine && (confirmDel
                ? <><button className="btn danger-solid sm" onClick={() => void del()}>Apagar de vez</button><button className="btn quiet sm" onClick={() => setConfirmDel(false)}>Cancelar</button></>
                : <button className="btn quiet sm" onClick={() => setConfirmDel(true)}>Apagar</button>)}
              {(post.canModerate || isAdmin) && <button className="btn quiet sm" onClick={() => void pin()}>{post.pinned ? 'Soltar' : 'Fixar no topo'}</button>}
              {!mine && post.author.handle && <ReportButton kind="postagem" handle={post.author.handle} refId={post.id} snapshot={{ title: post.title, text: post.body.slice(0, 400), slug: c.slug, community: c.name, game: post.game?.title, photo: post.images.length > 0 }} what={`A postagem “${post.title}” de @${post.author.handle} em w/${c.slug}.`} className="btn quiet sm" />}
            </span>
          </div>
          {err && <p className="awards__error" role="alert">{err}</p>}
        </article>

        <aside className="cm-post__side">
          <CommunityMini c={c} />
        </aside>
      </div>

      <Thread post={post} covered={covered} onReveal={reveal} onAnswer={answer} reload={reload} />
    </main>
  );
}

function CommunityMini({ c }: { c: Community }) {
  const cover = communityImage(c.cover) ?? c.game?.cover ?? null;
  return (
    <Link to={`/w/${c.slug}`} className="cm-mini">
      <span className="cm-mini__art" aria-hidden="true">{cover ? <img src={cover} alt="" /> : c.name.slice(0, 1)}</span>
      <span><b>{c.name}</b><small className="faint">{c.members} {c.members === 1 ? 'membro' : 'membros'}</small></span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Respostas em fio (2 níveis)                                          */
/* ------------------------------------------------------------------ */
function Thread({ post, covered, onReveal, onAnswer, reload }: { post: PostFull; covered: boolean; onReveal: () => void; onAnswer: (id: string | null) => void; reload: () => Promise<void> }) {
  const me = useMe();
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const tops = post.thread.filter((r) => !r.parentId);
  const kids = (id: string) => post.thread.filter((r) => r.parentId === id);
  const answer = post.answerId ? post.thread.find((r) => r.id === post.answerId) : undefined;
  const canAnswer = post.kind === 'pergunta' && post.author.id === me;
  const count = post.thread.filter((r) => !r.deleted).length;
  const sent = async () => { setReplyTo(null); await reload(); void refreshNews(); };
  return (
    <section className="cm-thread" id="respostas" aria-labelledby="cm-thread-t">
      <h2 id="cm-thread-t" className="cm-thread__t">{count === 0 ? 'Respostas' : `${count} ${count === 1 ? 'resposta' : 'respostas'}`}</h2>
      {covered && count > 0 ? (
        <div className="cm-shield cm-shield--thread"><Icon name="escudo" size={18} /><p>As respostas também podem ter spoiler.</p><button className="btn ghost sm" onClick={onReveal}>Ver mesmo assim</button></div>
      ) : (
        <>
          {answer && !answer.deleted && (
            <div className="cm-answer">
              <span className="kicker kicker--now"><Icon name="check" size={12} /> A resposta, escolhida por quem perguntou</span>
              <ReplyItem r={answer} post={post} isAnswer canAnswer={canAnswer} onAnswer={onAnswer} onReply={() => setReplyTo(answer.parentId ?? answer.id)} reload={reload} compact />
            </div>
          )}
          {signedOut ? <p className="cm-thread__login"><Link to="/entrar">Entre na sua conta</Link> para responder.</p>
            : <Composer postId={post.id} parentId={null} onSent={sent} placeholder={post.kind === 'pergunta' ? 'Sabe a resposta? Conta aqui.' : 'Escreva uma resposta'} />}
          {tops.length === 0 ? <p className="muted cm-thread__empty">Ninguém respondeu ainda.</p> : (
            <ol className="cm-replies">
              {tops.map((r) => (
                <li key={r.id} className="cm-replies__top">
                  <ReplyItem r={r} post={post} isAnswer={r.id === post.answerId} canAnswer={canAnswer} onAnswer={onAnswer} onReply={() => setReplyTo(r.id)} reload={reload} />
                  {(kids(r.id).length > 0 || replyTo === r.id) && (
                    <ol className="cm-replies__kids">
                      {kids(r.id).map((k) => <li key={k.id}><ReplyItem r={k} post={post} isAnswer={k.id === post.answerId} canAnswer={canAnswer} onAnswer={onAnswer} onReply={() => setReplyTo(r.id)} reload={reload} /></li>)}
                      {replyTo === r.id && <li><Composer postId={post.id} parentId={r.id} onSent={sent} onCancel={() => setReplyTo(null)} autoFocus placeholder={r.author.handle ? `Responder a @${r.author.handle}` : 'Responder'} /></li>}
                    </ol>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

function ReplyItem({ r, post, isAnswer, canAnswer, onAnswer, onReply, reload, compact = false }: { r: Reply; post: PostFull; isAnswer: boolean; canAnswer: boolean; onAnswer: (id: string | null) => void; onReply: () => void; reload: () => Promise<void>; compact?: boolean }) {
  const me = useMe();
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const mine = r.author.id === me;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(r.body);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  if (r.deleted) return <div className="cm-reply is-deleted" id={compact ? undefined : `r-${r.id}`}><p className="faint">Resposta apagada por quem escreveu.</p></div>;
  const save = async () => {
    setBusy(true); setErr('');
    try { await communityApi.editReply(r.id, text); setEditing(false); await reload(); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  const del = async () => { try { await communityApi.deleteReply(r.id); await reload(); } catch (e) { setErr(errOf(e)); } };
  return (
    <div className={`cm-reply${isAnswer && !compact ? ' is-answer' : ''}${r.hidden ? ' is-hidden' : ''}`} id={compact ? undefined : `r-${r.id}`}>
      <PersonAvatar p={r.author} size={32} />
      <div className="cm-reply__b">
        <div className="cm-reply__by">
          <PersonLink p={r.author} official={post.community.official} avatar={false} />
          {r.author.id === post.author.id && <span className="cm-badge cm-badge--op">Autor</span>}
          <span className="faint">{ago(r.createdAt)}{r.editedAt ? ' · editada' : ''}</span>
          {isAnswer && !compact && <span className="cm-chip cm-chip--ok"><Icon name="check" size={12} />A resposta</span>}
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
            <ReactionBar target="resposta" id={r.id} value={r.reactions} compact />
            {!signedOut && <button className="cm-link" onClick={onReply}>Responder</button>}
            {canAnswer && !mine && <button className="cm-link" onClick={() => onAnswer(isAnswer ? null : r.id)}>{isAnswer ? 'Desmarcar a resposta' : 'Marcar como a resposta'}</button>}
            {mine && !editing && <button className="cm-link" onClick={() => setEditing(true)}>Editar</button>}
            {mine && (confirmDel ? <><button className="cm-link cm-link--danger" onClick={() => void del()}>Apagar de vez</button><button className="cm-link" onClick={() => setConfirmDel(false)}>Cancelar</button></> : <button className="cm-link" onClick={() => setConfirmDel(true)}>Apagar</button>)}
            {!mine && r.author.handle && <ReportButton kind="resposta" handle={r.author.handle} refId={r.id} snapshot={{ title: post.title, text: r.body.slice(0, 400), slug: post.community.slug, community: post.community.name, postId: post.id }} what={`Uma resposta de @${r.author.handle} em “${post.title}”.`} className="cm-link" />}
          </div>
        )}
        {err && <p className="awards__error" role="alert">{err}</p>}
      </div>
    </div>
  );
}

function Composer({ postId, parentId, onSent, onCancel, placeholder, autoFocus = false }: { postId: string; parentId: string | null; onSent: () => Promise<void>; onCancel?: () => void; placeholder: string; autoFocus?: boolean }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const send = async () => {
    if (!text.trim()) return;
    setErr('');
    if (!(await ensureRules())) return;
    setBusy(true);
    try { await communityApi.reply(postId, parentId, text); setText(''); await onSent(); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  return (
    <div className={`cm-compose${parentId ? ' cm-compose--kid' : ''}`}>
      <textarea className="field" rows={parentId ? 2 : 3} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }} aria-label={placeholder} />
      <span className="cm-compose__acts">
        <small className="faint cm-compose__hint">**negrito**, *itálico*, ||spoiler||</small>
        {onCancel && <button className="btn quiet sm" onClick={onCancel}>Cancelar</button>}
        <button className="btn primary sm" disabled={busy || !text.trim()} onClick={() => void send()}>{busy ? 'Enviando…' : 'Responder'}</button>
      </span>
      {err && <p className="awards__error" role="alert">{err}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Escrever e editar: /w/nome/escrever e /w/nome/id/editar              */
/* ------------------------------------------------------------------ */
export function PostEditorPage({ slug, id }: { slug: string; id?: string }) {
  const isAdmin = useStore((s) => !!s.isAdmin);
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const me = useMe();
  const [c, setC] = useState<Community | null | undefined>(undefined);
  const [orig, setOrig] = useState<PostFull | null | undefined>(id ? undefined : null);
  useEffect(() => { communityApi.get(slug).then(setC).catch(() => setC(null)); }, [slug]);
  useEffect(() => { if (id) communityApi.post(id).then(setOrig).catch(() => setOrig(null)); }, [id]);
  useEffect(() => { document.title = `${id ? 'Editar postagem' : 'Escrever'} · WinnerZ`; }, [id]);
  if (signedOut) return <main className="page pad narrow"><h1 className="t big">Escrever</h1><p className="muted lead">Entre na sua conta para publicar.</p><Link className="btn primary" to="/entrar">Entrar</Link></main>;
  if (c === undefined || orig === undefined) return <main className="page pad"><p className="faint">Carregando…</p></main>;
  if (!c) return <main className="page pad narrow"><h1 className="t big">Escrever</h1><p className="muted lead">Essa comunidade não existe.</p><Link to="/comunidade/comunidades">Ver as comunidades</Link></main>;
  if (c.official && !isAdmin && !id) return <main className="page pad narrow"><h1 className="t big">{c.name}</h1><p className="muted lead">Na comunidade oficial, só o canal publica. Dá para responder às postagens.</p><Link to={`/w/${c.slug}`}>Voltar</Link></main>;
  if (id && (!orig || orig.author.id !== me)) return <main className="page pad narrow"><h1 className="t big">Editar</h1><p className="muted lead">Só quem escreveu pode editar.</p><Link to={`/w/${c.slug}`}>Voltar</Link></main>;
  return <PostEditor c={c} orig={orig ?? null} />;
}

function PostEditor({ c, orig }: { c: Community; orig: PostFull | null }) {
  const [kind, setKind] = useState<PostKind>(orig?.kind ?? (c.official ? 'discussao' : 'discussao'));
  const [title, setTitle] = useState(orig?.title ?? '');
  const [body, setBody] = useState(orig?.body ?? '');
  const [game, setGame] = useState<GameMini | null>(orig?.game ?? (c.game ?? null));
  const [spoiler, setSpoiler] = useState<SpoilerLevel | null>(orig?.spoiler ?? null);
  const [images, setImages] = useState<string[]>(orig?.images ?? []);
  const [clip, setClip] = useState(orig?.clip ?? '');
  const [upBusy, setUpBusy] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const uploaded = useRef<string[]>([]);
  const area = useRef<HTMLTextAreaElement>(null);
  const clipBad = clip.trim() !== '' && !clipOk(clip);
  const ready = title.trim().length >= 3 && !clipBad && !(kind === 'clipe' && !clip.trim()) && !upBusy;

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
    const d: PostDraft = { kind, title: title.trim(), body, gameId: game?.id ?? null, spoiler: game ? spoiler : null, images, clip: clip.trim() || null };
    try {
      const removed = (orig?.images ?? []).filter((x) => !images.includes(x));
      const p = orig ? await communityApi.editPost(orig.id, d, removed) : await communityApi.createPost(c.id, d);
      uploaded.current = uploaded.current.filter((x) => !images.includes(x));
      navigate(`/w/${c.slug}/${p.id}`);
    } catch (e) { setErr(errOf(e)); setBusy(false); }
  };
  const removeImage = (path: string) => {
    setImages((l) => l.filter((x) => x !== path));
    if (uploaded.current.includes(path)) { void communityApi.removeImages([path]); uploaded.current = uploaded.current.filter((x) => x !== path); }
  };
  const words = useMemo(() => plainText(body).length, [body]);

  return (
    <main className="page pad cm-editor">
      <header className="studio__head">
        <Link to={orig ? `/w/${c.slug}/${orig.id}` : `/w/${c.slug}`} className="faint">← {c.name}</Link>
        <h1 className="t big">{orig ? 'Editar' : 'Escrever'}</h1>
        <p className="muted lead">Em <b>w/{c.slug}</b>. {c.official ? 'Comunidade oficial: só o canal publica.' : 'Todo mundo que abrir a comunidade vê.'}</p>
      </header>

      <div className="cm-editor__grid">
        <div className="cm-form">
          <fieldset className="cm-form__f cm-kinds">
            <legend className="kicker">Que tipo de postagem?</legend>
            <div className="cm-kinds__opts">
              {KINDS.map((k) => (
                <label key={k.k} className={`cm-kinds__o${kind === k.k ? ' is-on' : ''}`}>
                  <input type="radio" name="kind" checked={kind === k.k} onChange={() => setKind(k.k)} />
                  <b>{k.label}</b><small>{k.hint}</small>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="cm-form__f"><span className="kicker">Título</span>
            <input className="field cm-editor__title" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'pergunta' ? 'A pergunta, numa frase' : 'Do que você quer falar?'} />
          </label>

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
                <button type="button" onClick={() => setPreview((v) => !v)} aria-pressed={preview}>{preview ? 'Escrever' : 'Ver como fica'}</button>
              </span>
            </span>
            {preview ? <div className="cm-editor__preview">{body.trim() ? <PostText text={body} embeds={6} /> : <p className="faint">Nada escrito ainda.</p>}</div>
              : <textarea ref={area} className="field cm-editor__body" rows={9} maxLength={10000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva à vontade. Lista com “- ” no começo da linha. Link de vídeo ou post (YouTube, Instagram, TikTok, X…) numa linha só aparece dentro da postagem." />}
            <small className="faint">{words > 9000 ? `${body.length}/10000` : 'Trecho entre ||barras|| fica escondido até a pessoa tocar.'}</small>
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
          <div className="cm-form__f"><span className="kicker">Sobre algum jogo?</span>
            <GameSearchPick value={game} onChange={(g) => { setGame(g); if (!g) setSpoiler(null); }} label="Jogo da postagem" />
            <small className="faint">Ligada a um jogo, a postagem aparece também na ficha dele.</small>
          </div>
          {game && (
            <fieldset className="cm-form__f cm-spoil">
              <legend className="kicker">Tem spoiler de {game.title}?</legend>
              <label className={`cm-spoil__o${!spoiler ? ' is-on' : ''}`}><input type="radio" name="sp" checked={!spoiler} onChange={() => setSpoiler(null)} /><b>Não tem</b></label>
              {SPOILERS.map((s) => (
                <label key={s.k} className={`cm-spoil__o${spoiler === s.k ? ' is-on' : ''}`}><input type="radio" name="sp" checked={spoiler === s.k} onChange={() => setSpoiler(s.k)} /><b>Spoiler {s.label.toLowerCase()}</b><small>{s.hint}</small></label>
              ))}
              <small className="faint">A capa usa a Jornada de quem lê: quem já passou daquela parte vê normalmente.</small>
            </fieldset>
          )}
          {err && <p className="awards__error" role="alert">{err}</p>}
          <button className="btn primary cm-editor__go" disabled={!ready || busy} onClick={() => void submit()}>{busy ? 'Publicando…' : orig ? 'Salvar' : 'Publicar'}</button>
          <p className="faint cm-editor__rules">Valem as <Link to="/regras">regras do WinnerZ</Link>{c.rules ? ' e os combinados desta comunidade' : ''}.</p>
        </aside>
      </div>
    </main>
  );
}
