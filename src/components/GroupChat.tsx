/**
 * A conversa de um grupo (clube ou jogatina): mensagens de cima e respostas, citar, copiar link, editar, apagar,
 * reagir e denunciar. Quem usa diz como enviar (ctx) e como dividir em seções (perguntas, memórias, antes…).
 */
import { useMemo, useRef, useState } from 'react';
import { useStore } from '../data/store';
import { communityApi, communityImage, type GameMini } from '../data/communityApi';
import type { GroupMessage } from '../data/clubApi';
import { ensureRules } from '../data/moderationApi';
import { ReportButton } from './Moderation';
import { ImageGrid, MentionArea, PersonAvatar, PersonLink, PostText, ReactionBar, ago } from './Posts';
import { quoteOf } from '../lib/postText';
import { shrink } from '../lib/image';
import { Icon } from './Icon';

const errOf = (e: unknown) => (e instanceof Error ? e.message : 'Não deu certo agora.');

export interface ChatCtx {
  /** Para a denúncia: onde a mensagem está ("Clube Retrô", "Jogatina Noite de Astro Bot"). */
  where: string;
  report: { slug?: string; club?: string; jogatina?: string };
  game: GameMini | null;
  canWrite: boolean;
  /** @ de quem está no grupo, para sugerir ao escrever. */
  people: string[];
  guides?: Set<string>;
  linkFor: (msgId: string) => string;
  send: (parentId: string | null, body: string, question: boolean, images: string[]) => Promise<unknown>;
  edit: (id: string, body: string) => Promise<void>;
  del: (id: string) => Promise<void>;
  reload: () => Promise<void>;
  /** Pasta das imagens no armazenamento. */
  folder?: string;
}
export interface ChatSection { key: string; title?: string; className?: string; tops: GroupMessage[] }
export interface ChatComposer { placeholder: string; question?: boolean; questionToggle?: boolean; hint?: string }

/** Leva até uma mensagem e acende ela por um instante. */
export function flashTo(elId: string) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash');
  setTimeout(() => el.classList.remove('is-flash'), 1800);
}

export function GroupChat({ ctx, messages, sections, composer, empty, replyHint }: { ctx: ChatCtx; messages: GroupMessage[]; sections: ChatSection[]; composer: ChatComposer | null; empty?: string; replyHint?: string }) {
  const [replyTo, setReplyTo] = useState<{ top: string; quote: string; nonce: number } | null>(null);
  const kids = (id: string) => messages.filter((m) => m.parentId === id);
  const open = (top: string, quote = '') => setReplyTo({ top, quote, nonce: Date.now() });
  const sent = async () => { setReplyTo(null); await ctx.reload(); };
  const item = (m: GroupMessage) => (
    <li key={m.id} className="cm-replies__top">
      <GroupMsg m={m} ctx={ctx} onReply={() => open(m.id)} onQuote={() => open(m.id, quoteOf(m.author.handle, m.body))} />
      {(kids(m.id).length > 0 || replyTo?.top === m.id) && (
        <ol className="cm-replies__kids">
          {kids(m.id).map((k) => <li key={k.id}><GroupMsg m={k} ctx={ctx} onReply={() => open(m.id)} onQuote={() => open(m.id, quoteOf(k.author.handle, k.body))} onParent={() => flashTo(`m-${m.id}`)} /></li>)}
          {replyTo?.top === m.id && ctx.canWrite && <li><GroupComposer key={replyTo.nonce} ctx={ctx} parentId={m.id} initial={replyTo.quote} onSent={sent} onCancel={() => setReplyTo(null)} placeholder={m.author.handle ? `Responder a @${m.author.handle}` : 'Responder'} hint={replyHint} /></li>}
        </ol>
      )}
    </li>
  );
  const any = sections.some((s) => s.tops.length);
  return (
    <>
      {composer && ctx.canWrite && <GroupComposer ctx={ctx} parentId={null} onSent={sent} placeholder={composer.placeholder} question={composer.question} questionToggle={composer.questionToggle} hint={composer.hint} />}
      {sections.filter((s) => s.tops.length).map((s) => (
        <div key={s.key} className="gchat__sec">
          {s.title && <h3 className="club__h3">{s.title}</h3>}
          <ol className={`cm-replies${s.className ? ` ${s.className}` : ''}`}>{s.tops.map(item)}</ol>
        </div>
      ))}
      {!any && empty && <p className="muted cm-thread__empty">{empty}</p>}
    </>
  );
}

function GroupMsg({ m, ctx, onReply, onQuote, onParent }: { m: GroupMessage; ctx: ChatCtx; onReply: () => void; onQuote: () => void; onParent?: () => void }) {
  const meId = useStore((s) => (s.mode === 'demo' ? 'demo-me' : s.profile?.id ?? null));
  const mine = m.author.id === meId;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.body);
  const [confirmDel, setConfirmDel] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');
  if (m.deleted) return <div className="cm-reply is-deleted" id={`m-${m.id}`}><p className="faint">{m.author.gone ? 'Mensagem de uma conta apagada.' : 'Mensagem apagada por quem escreveu.'}</p></div>;
  const guide = !!ctx.guides?.has(m.author.id);
  const copy = async () => {
    const url = ctx.linkFor(m.id);
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { window.prompt('Copie o link:', url); }
  };
  const save = async () => { try { await ctx.edit(m.id, text); setEditing(false); await ctx.reload(); } catch (e) { setErr(errOf(e)); } };
  const del = async () => { try { await ctx.del(m.id); await ctx.reload(); } catch (e) { setErr(errOf(e)); } };
  return (
    <div className={`cm-reply${m.hidden ? ' is-hidden' : ''}${m.question ? ' is-question' : ''}`} id={`m-${m.id}`}>
      <PersonAvatar p={m.author} size={32} />
      <div className="cm-reply__b">
        <div className="cm-reply__by">
          <PersonLink p={m.author} avatar={false} />
          {guide && <span className="cm-badge club-badge--guia">Guia</span>}
          {m.question && <span className="cm-chip cm-chip--pergunta">Pergunta</span>}
          <span className="faint">{ago(m.createdAt)}{m.editedAt ? ' · editada' : ''}</span>
          {m.hidden && <span className="cm-chip cm-chip--hidden">Fora do ar pela moderação</span>}
        </div>
        {editing ? (
          <div className="cm-compose cm-compose--edit">
            <textarea className="field" rows={3} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} />
            <span className="cm-compose__acts"><button className="btn quiet sm" onClick={() => { setEditing(false); setText(m.body); }}>Cancelar</button><button className="btn primary sm" disabled={!text.trim()} onClick={() => void save()}>Salvar</button></span>
          </div>
        ) : <PostText text={m.body} embeds={2} />}
        <ImageGrid images={m.images} />
        <div className="cm-reply__acts">
          <ReactionBar target={m.target} id={m.id} value={m.reactions} compact game={ctx.game} />
          {ctx.canWrite && <button className="cm-link" onClick={onReply}>Responder</button>}
          {ctx.canWrite && <button className="cm-link" onClick={onQuote} title="Responder citando esta mensagem"><Icon name="citar" size={13} />Citar</button>}
          <button className="cm-link" onClick={() => void copy()} title="Copiar o link desta mensagem"><Icon name="link" size={13} />{copied ? 'Copiado' : 'Copiar link'}</button>
          {onParent && <button className="cm-link" onClick={onParent} title="Ir até a mensagem de cima"><Icon name="subir" size={13} />Ir ao pai</button>}
          {mine && !editing && <button className="cm-link" onClick={() => setEditing(true)}>Editar</button>}
          {mine && (confirmDel ? <><button className="cm-link cm-link--danger" onClick={() => void del()}>Apagar de vez</button><button className="cm-link" onClick={() => setConfirmDel(false)}>Cancelar</button></> : <button className="cm-link" onClick={() => setConfirmDel(true)}>Apagar</button>)}
          {!mine && m.author.handle && <ReportButton kind={m.target === 'post' ? 'postagem' : 'resposta'} handle={m.author.handle} refId={m.id} snapshot={{ title: ctx.where, text: m.body.slice(0, 400), community: ctx.where, ...ctx.report, photo: m.images.length > 0 }} what={`Uma mensagem de @${m.author.handle} em ${ctx.where}.`} className="cm-link" />}
        </div>
        {err && <p className="awards__error" role="alert">{err}</p>}
      </div>
    </div>
  );
}

export function GroupComposer({ ctx, parentId, onSent, onCancel, placeholder, initial = '', question = false, questionToggle = false, hint }: { ctx: ChatCtx; parentId: string | null; onSent: () => Promise<void>; onCancel?: () => void; placeholder: string; initial?: string; question?: boolean; questionToggle?: boolean; hint?: string }) {
  const [text, setText] = useState(initial);
  const [isQ, setIsQ] = useState(question);
  const [images, setImages] = useState<string[]>([]);
  const [up, setUp] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const left = useMemo(() => 4 - images.length - up, [images.length, up]);
  const add = async (files: FileList | null) => {
    const l = [...(files ?? [])].filter((f) => f.type.startsWith('image/')).slice(0, Math.max(0, left));
    setUp((n) => n + l.length);
    for (const f of l) {
      try { const p = await communityApi.uploadImage(await shrink(f, 1600), ctx.folder ?? 'clube'); setImages((x) => [...x, p].slice(0, 4)); } catch (e) { setErr(errOf(e)); } finally { setUp((n) => n - 1); }
    }
  };
  const send = async () => {
    if (!text.trim()) return;
    setErr('');
    if (!(await ensureRules())) return;
    setBusy(true);
    try { await ctx.send(parentId, text, isQ && !parentId, images); setText(''); setImages([]); await onSent(); } catch (e) { setErr(errOf(e)); } finally { setBusy(false); }
  };
  return (
    <div className={`cm-compose${parentId ? ' cm-compose--kid' : ''}`}>
      <MentionArea className="field" rows={parentId ? (initial ? 4 : 2) : 3} maxLength={5000} value={text} onChange={setText} people={ctx.people} placeholder={placeholder} aria-label={placeholder} autoFocus={!!parentId}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }} />
      {images.length > 0 && <div className="cm-editor__imgs club-compose__imgs">{images.map((s) => <span key={s} className="cm-editor__img"><img src={communityImage(s) ?? ''} alt="" /><button type="button" className="icon-btn" aria-label="Tirar a imagem" onClick={() => { setImages((x) => x.filter((y) => y !== s)); void communityApi.removeImages([s]); }}><Icon name="fechar" size={14} /></button></span>)}</div>}
      <span className="cm-compose__acts">
        <small className="faint cm-compose__hint">{hint ?? '**negrito**, *itálico*, ||spoiler||, @pessoa'}</small>
        {!parentId && questionToggle && <label className="club-compose__q"><input type="checkbox" checked={isQ} onChange={(e) => setIsQ(e.target.checked)} /> É uma pergunta</label>}
        {!parentId && left > 0 && <button type="button" className="btn quiet sm" onClick={() => file.current?.click()} disabled={up > 0}><Icon name="camera" size={14} /> {up ? 'Enviando…' : 'Imagem'}</button>}
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { void add(e.target.files); e.target.value = ''; }} />
        {onCancel && <button className="btn quiet sm" onClick={onCancel}>Cancelar</button>}
        <button className="btn primary sm" disabled={busy || !text.trim() || up > 0} onClick={() => void send()}>{busy ? 'Enviando…' : parentId ? 'Responder' : 'Enviar'}</button>
      </span>
      {err && <p className="awards__error" role="alert">{err}</p>}
    </div>
  );
}
