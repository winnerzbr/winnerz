/** Moderação da comunidade: tirar (com motivo) e devolver uma postagem ou resposta. */
import { useState } from 'react';
import { communityApi } from '../data/communityApi';

const REASONS = ['Spoiler sem aviso', 'Fora do tema da comunidade', 'Ofensa ou provocação', 'Propaganda ou repetição'];

export function ModHide({ kind, id, hidden, onDone, button = 'cm-link' }: { kind: 'postagem' | 'resposta'; id: string; hidden: boolean; onDone: () => Promise<void> | void; button?: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const go = async (on: boolean) => {
    setBusy(true); setErr('');
    try { await communityApi.hide(kind, id, on, reason); setOpen(false); setReason(''); await onDone(); } catch (e) { setErr(e instanceof Error ? e.message : 'Não deu certo agora.'); } finally { setBusy(false); }
  };
  if (hidden) return (
    <>
      <button className={button} disabled={busy} onClick={() => void go(false)} title="Devolver à comunidade (fica no histórico)">Devolver</button>
      {err && <span className="awards__error">{err}</span>}
    </>
  );
  if (!open) return <button className={button} onClick={() => setOpen(true)} title="Tirar da comunidade (fica no histórico, com o motivo)">Tirar da comunidade</button>;
  return (
    <span className="mod-hide" role="group" aria-label="Tirar da comunidade">
      <span className="mod-hide__chips">{REASONS.map((r) => <button key={r} type="button" className={`chip${reason === r ? ' is-on' : ''}`} aria-pressed={reason === r} onClick={() => setReason(r)}>{r}</button>)}</span>
      <input className="field" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Motivo (aparece no histórico e para quem escreveu)" aria-label="Motivo" />
      <span className="mod-hide__acts">
        <button className="btn quiet sm" onClick={() => setOpen(false)}>Cancelar</button>
        <button className="btn danger-solid sm" disabled={busy || !reason.trim()} onClick={() => void go(true)}>{busy ? 'Tirando…' : 'Tirar'}</button>
      </span>
      {err && <span className="awards__error">{err}</span>}
    </span>
  );
}
