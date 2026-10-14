import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link, navigate } from '../lib/router';
import { useStore } from '../data/store';
import { avatarUrl, profileApi } from '../data/profileApi';
import { RULES } from '../lib/rules';
import {
  REASONS, answerRules, moderationApi, useBlocks, useModeration, useRulesAsk,
  type ReportKind, type ReportReason, type Snapshot,
} from '../data/moderationApi';
import { Icon } from './Icon';

/** O meu @ (para não oferecer "denunciar" no que é meu). */
let myHandle: Promise<string | null> | null = null;
export function useMyHandle(): string | null | undefined {
  const mode = useStore((s) => s.mode);
  const signed = useStore((s) => !!s.profile);
  const [h, setH] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (mode === 'supabase' && !signed) { setH(null); return; }
    myHandle ??= profileApi.mine().then((p) => p?.handle ?? null).catch(() => null);
    let alive = true;
    myHandle.then((x) => alive && setH(x));
    return () => { alive = false; };
  }, [mode, signed]);
  return h;
}
export function forgetMyHandle() { myHandle = null; }

/** Diálogos e menus saem por cima de tudo (o topo do perfil corta o que passa da borda). */
const Layer = ({ children }: { children: ReactNode }) => createPortal(children, document.body);

function useEsc(on: boolean, close: () => void) {
  useEffect(() => {
    if (!on) return;
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', f);
    return () => document.removeEventListener('keydown', f);
  }, [on, close]);
}

/* ------------------------------------------------------------------ */
/* Aceite das regras                                                    */
/* ------------------------------------------------------------------ */
/** Aparece quando alguém vai deixar algo público pela primeira vez. Fica montado uma vez no App. */
export function RulesHost() {
  const ask = useRulesAsk();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const close = () => { if (!busy) answerRules(false); };
  useEsc(!!ask, close);
  if (!ask) return null;
  const accept = async () => {
    setBusy(true); setErr('');
    try { await moderationApi.acceptRules(); answerRules(true); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); }
    finally { setBusy(false); }
  };
  return (
    <Layer>
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal rules-ask" role="dialog" aria-modal="true" aria-labelledby="rules-ask-t">
        <span className="kicker kicker--now">Antes de mostrar para os outros</span>
        <h2 id="rules-ask-t" className="t rules-ask__t">As regras da comunidade</h2>
        <p className="muted rules-ask__lead">É a primeira vez que você deixa algo público. São cinco combinados, bem curtos:</p>
        <ol className="rules-ask__list">
          {RULES.map((r, i) => <li key={r.title}><span className="mono">{String(i + 1).padStart(2, '0')}</span><span><b>{r.title}.</b> {r.short}</span></li>)}
        </ol>
        <p className="faint rules-ask__more">Os detalhes e o que acontece se alguém descumprir estão em <Link to="/regras" onClick={() => answerRules(false)}>winnerz.com.br/regras</Link>.</p>
        {err && <p className="awards__error" role="alert">{err}</p>}
        <div className="rules-ask__acts">
          <button className="btn quiet" onClick={close} disabled={busy}>Agora não</button>
          <button className="btn primary" onClick={accept} disabled={busy}>{busy ? 'Gravando…' : 'Combinado, aceito'}</button>
        </div>
      </div>
    </div>
    </Layer>
  );
}

/* ------------------------------------------------------------------ */
/* Denunciar                                                            */
/* ------------------------------------------------------------------ */
export function ReportDialog({ kind, handle, refId, snapshot, what, onClose }: { kind: ReportKind; handle: string; refId?: string; snapshot?: Snapshot; what: string; onClose: () => void }) {
  const id = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'atualizada'>('idle');
  const [err, setErr] = useState('');
  useEsc(true, onClose);
  const send = async () => {
    if (!reason) return;
    setState('busy'); setErr('');
    try { setState(await moderationApi.report(kind, handle, refId ?? '', reason, note, snapshot)); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); setState('idle'); }
  };
  return (
    <Layer>
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal report" role="dialog" aria-modal="true" aria-labelledby={`${id}-t`}>
        <div className="modal__head">
          <h2 id={`${id}-t`} className="t report__t">{state === 'ok' || state === 'atualizada' ? 'Denúncia recebida' : 'Denunciar'}</h2>
          <button className="icon-btn" aria-label="Fechar" onClick={onClose}><Icon name="fechar" /></button>
        </div>
        {state === 'ok' || state === 'atualizada' ? (
          <div className="report__done" role="status">
            <p>{state === 'atualizada' ? 'Você já tinha denunciado isso; atualizamos o motivo.' : 'Obrigado. A moderação vai olhar com calma.'} @{handle} não fica sabendo quem denunciou.</p>
            <p className="muted">Se não quiser mais ver o que é de @{handle}, você pode silenciar ou bloquear no perfil.</p>
            <button className="btn primary" onClick={onClose}>Fechar</button>
          </div>
        ) : (
          <>
            <p className="muted report__what">{what}</p>
            <fieldset className="report__reasons">
              <legend className="kicker">Qual é o problema?</legend>
              {REASONS.map((r) => (
                <label key={r.k} className={`report__reason${reason === r.k ? ' is-on' : ''}`}>
                  <input type="radio" name={`${id}-r`} checked={reason === r.k} onChange={() => setReason(r.k)} />
                  <span><b>{r.label}</b><small>{r.hint}</small></span>
                </label>
              ))}
            </fieldset>
            <label className="report__note">
              <span className="kicker">Quer contar mais? (opcional)</span>
              <textarea className="field" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que chamou a sua atenção" />
            </label>
            {err && <p className="awards__error" role="alert">{err}</p>}
            <div className="report__acts">
              <Link to="/regras" className="faint" onClick={onClose}>Ler as regras</Link>
              <button className="btn primary" disabled={!reason || state === 'busy'} onClick={send}>{state === 'busy' ? 'Enviando…' : 'Enviar denúncia'}</button>
            </div>
          </>
        )}
      </div>
    </div>
    </Layer>
  );
}

/** Botão discreto de denunciar. Some no que é seu; sem conta, leva para entrar. */
/** force: o dono vendo como visitante também vê o botão (para conferir como fica). */
export function ReportButton({ kind, handle, refId, snapshot, what, label = 'Denunciar', className = '', force = false }: { kind: ReportKind; handle: string; refId?: string; snapshot?: Snapshot; what: string; label?: string; className?: string; force?: boolean }) {
  const mine = useMyHandle();
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const [open, setOpen] = useState(false);
  if (!force && (mine === undefined || (mine && mine.toLowerCase() === handle.toLowerCase()))) return null;
  return (
    <>
      <button type="button" className={`report-btn ${className}`} onClick={() => (signedOut ? navigate('/entrar') : setOpen(true))} title={signedOut ? 'Entre na sua conta para denunciar' : undefined}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 21V4h11l-1.5 4L16 12H5" /></svg>
        {label}
      </button>
      {open && <ReportDialog kind={kind} handle={handle} refId={refId} snapshot={snapshot} what={what} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Menu do perfil de outra pessoa: denunciar, silenciar, bloquear        */
/* ------------------------------------------------------------------ */
export function ProfileMenu({ handle, snapshot, force = false }: { handle: string; snapshot?: Snapshot; force?: boolean }) {
  const mine = useMyHandle();
  const signedOut = useStore((s) => s.mode === 'supabase' && !s.profile);
  const blocks = useBlocks();
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState(false);
  const [confirm, setConfirm] = useState<'bloquear' | 'silenciar' | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEsc(open, () => setOpen(false));
  useEffect(() => {
    if (!open) return;
    const place = () => { const r = box.current?.getBoundingClientRect(); if (r) setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.right - 230, window.innerWidth - 238)) }); };
    place();
    const f = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', f);
    window.addEventListener('scroll', place, true); window.addEventListener('resize', place);
    return () => { document.removeEventListener('mousedown', f); window.removeEventListener('scroll', place, true); window.removeEventListener('resize', place); };
  }, [open]);
  if (!force && (mine === undefined || (mine && mine.toLowerCase() === handle.toLowerCase()))) return null;
  const cur = blocks?.find((b) => (b.handle ?? '').toLowerCase() === handle.toLowerCase());
  const need = (fn: () => void) => () => { setOpen(false); if (signedOut) navigate('/entrar'); else fn(); };
  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setErr('');
    try { await fn(); setConfirm(null); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); } finally { setBusy(false); }
  };
  return (
    <div className="pmenu" ref={box}>
      <button className="btn ghost icon pmenu__btn" aria-label={`Mais opções para @${handle}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
      </button>
      {open && pos && (
        <Layer>
        <div className="pmenu__list" role="menu" ref={list} style={{ top: pos.top, left: pos.left }}>
          <button role="menuitem" onClick={need(() => setReport(true))}>Denunciar o perfil</button>
          {cur?.kind === 'silenciar'
            ? <button role="menuitem" onClick={need(() => void run(() => moderationApi.unblock(cur.id)))}>Deixar de silenciar</button>
            : <button role="menuitem" onClick={need(() => setConfirm('silenciar'))}>Silenciar @{handle}</button>}
          {cur?.kind === 'bloquear'
            ? <button role="menuitem" onClick={need(() => void run(() => moderationApi.unblock(cur.id)))}>Desbloquear</button>
            : <button role="menuitem" className="is-danger" onClick={need(() => setConfirm('bloquear'))}>Bloquear @{handle}</button>}
        </div>
        </Layer>
      )}
      {report && <ReportDialog kind="perfil" handle={handle} snapshot={snapshot} what={`O perfil de @${handle}: o @, a foto, a capa ou a bio.`} onClose={() => setReport(false)} />}
      {confirm && (
        <Layer>
        <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && !busy && setConfirm(null)}>
          <div className="modal report" role="dialog" aria-modal="true" aria-labelledby="pm-c-t">
            <h2 id="pm-c-t" className="t report__t">{confirm === 'bloquear' ? `Bloquear @${handle}?` : `Silenciar @${handle}?`}</h2>
            <p className="muted">{confirm === 'bloquear'
              ? `@${handle} não vai mais ver o seu perfil, as suas Jornadas nem as suas vitrines enquanto estiver na conta. Ninguém avisa @${handle}.`
              : `O que é de @${handle} deixa de aparecer para você no WinnerZ. @${handle} continua vendo o que é seu e não fica sabendo.`}</p>
            <p className="faint">Você pode desfazer quando quiser, em Preferências.</p>
            {err && <p className="awards__error" role="alert">{err}</p>}
            <div className="report__acts">
              <button className="btn quiet" onClick={() => setConfirm(null)} disabled={busy}>Cancelar</button>
              <button className={`btn ${confirm === 'bloquear' ? 'danger-solid' : 'primary'}`} disabled={busy} onClick={() => void run(() => moderationApi.block(handle, confirm))}>
                {busy ? 'Gravando…' : confirm === 'bloquear' ? 'Bloquear' : 'Silenciar'}
              </button>
            </div>
          </div>
        </div>
        </Layer>
      )}
      {err && !confirm && <p className="awards__error pmenu__err" role="alert">{err}</p>}
    </div>
  );
}

/** Quando a pessoa silenciou ou bloqueou o dono do perfil. */
export function useRelation(handle: string): { kind: 'bloquear' | 'silenciar'; id: string } | null {
  const blocks = useBlocks();
  const b = blocks?.find((x) => (x.handle ?? '').toLowerCase() === handle.toLowerCase());
  return b ? { kind: b.kind, id: b.id } : null;
}

/* ------------------------------------------------------------------ */
/* Avisos da moderação para a pessoa (topo do site)                      */
/* ------------------------------------------------------------------ */
export function ModerationBanner() {
  const st = useModeration();
  const [busy, setBusy] = useState('');
  if (!st) return null;
  const until = st.suspendedUntil ? new Date(st.suspendedUntil) : null;
  const notices = st.notices.filter((n) => n.kind !== 'suspender' || !until);
  if (!until && !notices.length) return null;
  const ack = async (id: string) => { setBusy(id); try { await moderationApi.ack(id); } finally { setBusy(''); } };
  const suspNotice = st.notices.find((n) => n.kind === 'suspender');
  return (
    <div className="modbar" role="region" aria-label="Avisos da moderação">
      {until && (
        <div className="page modbar__row modbar__row--susp">
          <span className="modbar__k">Perfil suspenso</span>
          <p>O seu perfil público está fora do ar até <b>{until.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' })}</b>. O seu diário, a coleção e as Jornadas continuam funcionando normalmente, só para você.{suspNotice?.text.includes('Mensagem da moderação:') ? ` ${suspNotice.text.slice(suspNotice.text.indexOf('Mensagem da moderação:'))}` : ''}</p>
          <span className="modbar__acts"><Link to="/regras">Ler as regras</Link>{suspNotice && <button className="btn sm ghost" disabled={busy === suspNotice.id} onClick={() => void ack(suspNotice.id)}>Entendi</button>}</span>
        </div>
      )}
      {notices.map((n) => (
        <div key={n.id} className="page modbar__row">
          <span className="modbar__k">{n.kind === 'desfeito' ? 'Moderação' : 'Aviso da moderação'}</span>
          <p>{n.text}</p>
          <span className="modbar__acts">{n.kind !== 'desfeito' && <Link to="/regras">Ler as regras</Link>}<button className="btn sm ghost" disabled={busy === n.id} onClick={() => void ack(n.id)}>Entendi</button></span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Preferências: quem você bloqueou ou silenciou                        */
/* ------------------------------------------------------------------ */
export function BlockedList() {
  const blocks = useBlocks();
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');
  if (!blocks) return <p className="muted">Carregando…</p>;
  if (!blocks.length) return <p className="muted">Você não bloqueou nem silenciou ninguém. Para isso, use o menu ⋯ no perfil da pessoa.</p>;
  const undo = async (id: string) => {
    setBusy(id); setErr('');
    try { await moderationApi.unblock(id); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); } finally { setBusy(''); }
  };
  return (
    <>
      <ul className="blocked">
        {blocks.map((b) => (
          <li key={b.id}>
            <span className="blocked__av" aria-hidden="true">{b.avatar ? <img src={avatarUrl(b.avatar) ?? ''} alt="" /> : (b.handle ?? '?').slice(0, 1).toUpperCase()}</span>
            <span className="blocked__who">{b.handle ? <Link to={`/@${b.handle.toLowerCase()}`}>@{b.handle}</Link> : <span className="muted">Conta sem @</span>}<small className="muted">{b.kind === 'bloquear' ? 'Bloqueado: não vê o que é seu' : 'Silenciado: o que é dele não aparece para você'}</small></span>
            <button className="btn sm ghost" disabled={busy === b.id} onClick={() => void undo(b.id)}>{b.kind === 'bloquear' ? 'Desbloquear' : 'Deixar de silenciar'}</button>
          </li>
        ))}
      </ul>
      {err && <p className="awards__error" role="alert">{err}</p>}
    </>
  );
}
