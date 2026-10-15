/**
 * Jornada 2 · J1: o que ajuda a voltar a um jogo.
 * - "Você parou em…": o cartão de retomada (onde parou, recado, quanto tempo faz).
 * - Sugestão de pausa depois de três sessões que "não encaixaram".
 * - Carta para o eu que vai zerar (lacrada até o marco).
 */
import { useState } from 'react';
import { Link } from '../lib/router';
import { actions, useStore, currentHistory, lastSession, lastNote, activeWaypoints, daysAway, fitHint } from '../data/store';
import type { ID, State } from '../data/types';
import { awayLabel } from '../lib/recap';
import { say as toneLine } from '../lib/tone';
import { Sheet } from './Sheet';
import { Icon } from './Icon';

/** Depois de quantos dias longe a página "Voltar a um jogo" ganha destaque. */
export const COMEBACK_AFTER_DAYS = 7;

/** O que dá para dizer sobre onde a pessoa parou, só com o que ela registrou. */
export function stopOf(s: State, journeyId: ID) {
  const h = currentHistory(s, journeyId);
  const last = lastSession(s, journeyId);
  const note = lastNote(s, journeyId);
  const where = h?.capsule?.where ?? last?.whereStopped;
  const next = h?.capsule?.next ?? note?.note ?? activeWaypoints(s, journeyId)[0]?.title;
  return { h, last, note: note?.note, where, next, days: daysAway(s, journeyId) };
}

/** Linha curta: "Você parou em Seattle, dia 2 · há 6 dias". */
export function StopLine({ journeyId, slug, className = '' }: { journeyId: ID; slug: string; className?: string }) {
  const s = useStore((x) => x);
  const st = stopOf(s, journeyId);
  if (!st.where && st.days == null) return null;
  const far = (st.days ?? 0) >= COMEBACK_AFTER_DAYS;
  return (
    <p className={`stopline ${className}`}>
      <Icon name="pin" size={14} />
      <span>{st.where ? <>Você parou em <b>{st.where}</b></> : 'Última sessão'}{st.days != null ? <span className="stopline__ago"> · {awayLabel(st.days)}</span> : null}</span>
      {far && <Link className="stopline__go" to={`/jornada/${slug}/voltar`}>Preparar a volta →</Link>}
    </p>
  );
}

/** Três "Não encaixou" seguidos: oferece uma pausa sem culpa (ou continuar, e a sugestão some). */
export function FitCard({ journeyId, onPaused }: { journeyId: ID; onPaused?: (historyId: ID) => void }) {
  const s = useStore((x) => x);
  const hint = fitHint(s, journeyId);
  if (!hint) return null;
  return (
    <section className="card fit-card" aria-labelledby={`fit-${journeyId}`}>
      <div>
        <h2 id={`fit-${journeyId}`} className="t">As últimas três sessões não encaixaram</h2>
        <p className="muted">Acontece. Pausar não é desistir: o jogo espera, com tudo o que você registrou. Se preferir, siga em frente e esta sugestão some.</p>
      </div>
      <div className="fit-card__actions">
        <button className="btn ghost" onClick={() => { actions.setHistoryState(hint.historyId, 'pausada', 'As últimas sessões não estavam encaixando.'); onPaused?.(hint.historyId); }}>Pausar sem culpa</button>
        <button className="btn quiet sm" onClick={() => actions.dismissFit(hint.historyId, hint.lastSessionId)}>Continuar mesmo assim</button>
      </div>
    </section>
  );
}

/** Linha da carta dentro do cartão de progresso: escrever, ou lembrar que ela está lacrada. */
export function LetterLine({ historyId }: { historyId: ID }) {
  const s = useStore((x) => x);
  const h = s.histories.find((x) => x.id === historyId);
  const [open, setOpen] = useState(false);
  if (!h || h.state === 'concluida' || h.state === 'dropada' || h.state === 'encerrada') return null;
  return (
    <>
      <div className="letter-line">
        <Icon name="carta" size={16} />
        {h.letter ? <span>Carta lacrada. Abre quando você zerar.</span> : <span>Escreva para quem você vai ser no fim.</span>}
        <button className="btn quiet sm" onClick={() => setOpen(true)}>{h.letter ? 'Reescrever' : 'Escrever a carta'}</button>
      </div>
      {open && <LetterSheet historyId={historyId} onClose={() => setOpen(false)} />}
    </>
  );
}

function LetterSheet({ historyId, onClose }: { historyId: ID; onClose: () => void }) {
  const s = useStore((x) => x);
  const h = s.histories.find((x) => x.id === historyId)!;
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  return (
    <Sheet title={h.letter ? 'Reescrever a carta' : 'Uma carta para o fim'} onClose={onClose} labelId="letter-t">
      {saved ? (
        <div className="letter-sheet__done">
          <p className="t">Carta lacrada.</p>
          <p className="muted">{toneLine('carta', s.prefs.tone)}</p>
          <button className="btn primary" onClick={onClose}>Fechar</button>
        </div>
      ) : (
        <form className="letter-sheet" onSubmit={(e) => { e.preventDefault(); if (!text.trim()) return; actions.writeLetter(historyId, text); setSaved(true); }}>
          <p className="muted">Fica lacrada e ninguém lê, nem você. Ela abre na celebração, quando você zerar.{h.letter ? ' Escrever de novo troca a carta anterior, sem abri-la.' : ''}</p>
          <label htmlFor="letter-text" className="finish__label">Para quem vai zerar</label>
          <textarea id="letter-text" className="field" rows={7} maxLength={4000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Por que você começou? O que espera sentir no fim?" />
          <div className="sheet__actions">
            <button type="submit" className="btn primary lg" disabled={!text.trim()}>Lacrar a carta</button>
            <button type="button" className="btn quiet" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
