/**
 * Jornada 2 · J1: o que ajuda a voltar a um jogo.
 * - "Você parou em…": o cartão de retomada (onde parou, recado, quanto tempo faz).
 * - Sugestão de pausa depois de três sessões que "não encaixaram".
 */
import { useEffect } from 'react';
import { Link } from '../lib/router';
import { actions, useStore, currentHistory, lastSession, lastNote, activeWaypoints, daysAway, fitHint, sessionsOf } from '../data/store';
import type { ID, State, Game, History } from '../data/types';
import { awayLabel, recapFor } from '../lib/recap';
import { dayMonth, durLabel, longDay } from '../lib/format';
import { track } from '../lib/track';
import { PlayButton } from './PlayButton';
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
      {far && <Link className="stopline__go" to={`/jornada/${slug}#voltar`}>Preparar a volta →</Link>}
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

/**
 * Voltar a um jogo (Etapa 2 da revisão): junta num bloco só, dentro da Jornada do jogo, o que antes estava espalhado
 * (página "Preparar a volta", Cápsula, linha de onde parou). Aparece no lugar de "Onde você parou" depois de uma semana longe.
 * Só com o que a pessoa registrou; nada é inventado.
 */
export function ComebackBlock({ journeyId, game, history, onCapsule, onViewWaypoint }: { journeyId: ID; game: Game; history: History; onCapsule: () => void; onViewWaypoint?: (index: number) => void }) {
  const s = useStore((x) => x);
  useEffect(() => { track('jornada.preparar-volta'); }, []);
  const st = stopOf(s, journeyId);
  const r = recapFor(s, journeyId);
  const points = activeWaypoints(s, journeyId);
  const sessions = sessionsOf(s, history.id).filter((x) => x.endedAt).reverse().slice(0, 3);
  const nextFrom = history.capsule?.next ? 'da sua Cápsula' : st.note ? 'do recado que você deixou' : points[0] ? 'do seu primeiro ponto para voltar' : '';
  const photos = (r?.moments ?? []).filter((m) => m.image).slice(0, 3);
  const withImg = points.filter((w) => w.image);
  return (
    <section id="voltar" className="card jback" aria-labelledby="voltar-h">
      <div className="jback__head">
        <p className="kicker kicker--now">Voltar a um jogo{st.days != null ? ` · última vez ${awayLabel(st.days)}` : ''}</p>
        <h2 id="voltar-h" className="t">Onde você parou</h2>
        <p className="jback__lead">{st.where ? <>Você parou em <b>{st.where}</b>.</> : 'Você ainda não anotou onde parou.'}{r?.sessionsCount ? ` ${r.sessionsCount} ${r.sessionsCount === 1 ? 'sessão' : 'sessões'} nesta História.` : ''}</p>
      </div>
      <div className="jback__grid">
        <div className="jback__main">
          <div className="jback__next">
            <span className="kicker">Seu próximo passo</span>
            {st.next ? <><p className="jback__goal">{st.next}</p><p className="muted">Um objetivo pequeno, tirado {nextFrom}. Cabe numa sessão curta.</p></>
              : <p className="muted">Ainda não há um próximo passo. Monte a Cápsula: onde você está, o que fazia e o que fazer depois.</p>}
            <div className="jback__acts">
              <PlayButton gameId={game.id} className="btn" />
              <button className="btn quiet sm" onClick={onCapsule}>{history.capsule ? 'Atualizar a Cápsula' : 'Montar a Cápsula'}</button>
            </div>
          </div>
          {sessions.length > 0 && (
            <div className="jback__prev">
              <span className="kicker">Anteriormente</span>
              <ol>
                {sessions.map((x) => (
                  <li key={x.id}>
                    <span className="mono jback__when">{longDay(x.startedAt)}{x.minutes ? ` · ${durLabel(x.minutes)}` : ''}</span>
                    {x.whereStopped && <span className="jback__where">{x.whereStopped}</span>}
                    {x.note && x.note !== st.next && <span className="quote">“{x.note}”</span>}
                    {x.feeling && <span className="chip chip--static">{x.feeling}</span>}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
        <div className="jback__side">
          <span className="kicker">Pontos para voltar · {points.length}</span>
          {points.length === 0 && <p className="muted jcap__empty">Nenhum ativo. Durante uma sessão, toque em “Quero voltar aqui”.</p>}
          <ul className="jback__wps">
            {points.map((w) => (
              <li key={w.id}>
                {w.image ? <button className="jcap__img" onClick={() => onViewWaypoint?.(withImg.indexOf(w))} aria-label={`Ver foto: ${w.title}`}><img src={w.image} alt="" /></button> : <span className="jcap__img jcap__img--none"><Icon name="pin" size={16} /></span>}
                <div><div className="jcap__wtitle">{w.title}</div><div className="muted">{[w.text, dayMonth(w.at)].filter(Boolean).join(' · ')}</div></div>
                <button className="btn ghost sm" onClick={() => actions.resolveWaypoint(w.id)}>Resolver</button>
              </li>
            ))}
          </ul>
          {photos.length > 0 && (
            <div className="jback__photos" aria-label="Últimos momentos">
              {photos.map((m) => <figure key={m.id}><img src={m.image} alt="" /><figcaption>{m.title}</figcaption></figure>)}
            </div>
          )}
        </div>
      </div>
      <p className="faint jcap__src">Montado com o que você registrou. Nada aqui foi inventado.{history.capsule?.ai ? ' A Cápsula partiu de uma sugestão da IA que você confirmou.' : ''}</p>
    </section>
  );
}
