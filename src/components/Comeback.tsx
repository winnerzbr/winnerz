/**
 * Jornada 2 · J1: o que ajuda a voltar a um jogo.
 * - "Você parou em…": o cartão de retomada (onde parou, recado, quanto tempo faz).
 * - Sugestão de pausa depois de três sessões que "não encaixaram".
 */
import { Link } from '../lib/router';
import { actions, useStore, currentHistory, lastSession, lastNote, activeWaypoints, daysAway, fitHint } from '../data/store';
import type { ID, State } from '../data/types';
import { awayLabel } from '../lib/recap';
import { Icon } from './Icon';

/** Rola até o bloco de volta (ou o cartão "Onde você parou") na Jornada do jogo. */
export function scrollToStop() {
  (document.getElementById('voltar') ?? document.getElementById('capsula'))?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/** Depois de quantos dias longe o cartão "Onde você parou" vira o bloco "Voltar a um jogo". */
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
      {far && <Link className="stopline__go" to={`/jornada/${slug}#voltar`}>Ver onde parou →</Link>}
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
