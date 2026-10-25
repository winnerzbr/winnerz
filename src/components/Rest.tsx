/**
 * "Jogar como descanso" (J6b): o resumo do mês em Meu ritmo. (O "Hoje é para…" da sessão fica em Outline: PlanCard.)
 */
import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { monthRest, restMonths, type MonthRest } from '../lib/rest';
import { CoverArt } from './CoverArt';
import { Link } from '../lib/router';
import { durLabel } from '../lib/format';

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** O mês pela intenção: o que funcionou, os jogos que descansaram e a hora em que o descanso rende. */
export function MonthRestCard({ month }: { month?: string } = {}) {
  const s = useStore((x) => x);
  const all = useMemo(() => restMonths(s), [s]);
  // Dentro de Retrospectivas o mês vem escolhido de fora; sozinho, o cartão tem as setas.
  const months = month ? [month] : all;
  const [picked, setKey] = useState(all[0]);
  const key = month ?? picked;
  const m: MonthRest = useMemo(() => monthRest(s, key), [s, key]);
  const light = !!s.prefs.light;
  const i = months.indexOf(key);
  const rest = m.byIntent.find((x) => x.intent === 'descansar');
  return (
    <section id="mes" className="card restmonth" aria-labelledby="restmonth-h">
      <div className="restmonth__head">
        <div>
          <span className="kicker">Jogar como descanso</span>
          <h2 id="restmonth-h" className="t restmonth__title">Seu mês: {m.label}</h2>
        </div>
        {months.length > 1 && (
          <div className="restmonth__nav" role="group" aria-label="Escolher o mês">
            <button className="btn quiet sm" disabled={i >= months.length - 1} onClick={() => setKey(months[i + 1])} aria-label="Mês anterior">‹</button>
            <button className="btn quiet sm" disabled={i <= 0} onClick={() => setKey(months[i - 1])} aria-label="Próximo mês">›</button>
          </div>
        )}
      </div>
      {!m.withIntent ? (
        <p className="muted restmonth__empty">
          {m.sessions ? `${m.sessions === 1 ? 'Uma sessão' : `${m.sessions} sessões`} neste mês, nenhuma com intenção marcada. ` : 'Nenhuma sessão neste mês ainda. '}
          Ao começar uma sessão, toque em <b>Hoje é para…</b> (descansar, se divertir, avançar ou um desafio). No fim, você diz se funcionou, e este resumo se monta sozinho.
        </p>
      ) : (
        <>
          <p className="restmonth__lead">
            {m.withIntent === 1 ? 'Uma sessão' : `${m.withIntent} sessões`} com intenção marcada{m.sessions > m.withIntent ? `, de ${m.sessions} no mês` : ''}.
            {rest && rest.answered ? <> Quando o plano era descansar, <b>{rest.sim === rest.count ? (rest.sim === 1 ? 'deu certo' : 'deu certo todas as vezes') : `deu certo ${rest.sim} de ${rest.count} ${rest.count === 1 ? 'vez' : 'vezes'}`}</b>{rest.meio ? `; ${rest.meio === 1 ? 'em uma' : `em ${rest.meio}`}, mais ou menos` : ''}{rest.count > rest.answered ? `; ${rest.count - rest.answered === 1 ? 'uma ficou' : `${rest.count - rest.answered} ficaram`} sem resposta` : ''}.</> : null}
            {m.bestPeriod ? <> O descanso costuma funcionar melhor <b>{m.bestPeriod}</b>.</> : null}
            {m.restMinutes && !light ? <> No total, {durLabel(m.restMinutes)} de descanso que funcionou.</> : null}
          </p>
          <ul className="restmonth__bars" aria-label="Intenções do mês">
            {m.byIntent.map((x) => (
              <li key={x.intent}>
                <span className="restmonth__lbl">{x.label}</span>
                <span className="restmonth__bar" aria-hidden="true">
                  <i className="is-sim" style={{ width: `${pct(x.sim, x.count)}%` }} />
                  <i className="is-meio" style={{ width: `${pct(x.meio, x.count)}%` }} />
                  <i className="is-nao" style={{ width: `${pct(x.nao, x.count)}%` }} />
                </span>
                <span className="mono restmonth__n">{x.answered ? `${x.sim} de ${x.count} funcionaram` : `${x.count} ${x.count === 1 ? 'sessão' : 'sessões'}`}</span>
              </li>
            ))}
          </ul>
          {m.rested.length > 0 && (
            <div className="restmonth__games">
              <span className="kicker">Os jogos que mais te descansaram</span>
              <ul>
                {m.rested.map((r) => (
                  <li key={r.game.id}>
                    <Link to={`/jornada/${r.game.slug}`} className="restmonth__game"><CoverArt game={r.game} /><span><b>{r.game.title}</b><span className="muted">{r.sim === 1 ? 'Descansou uma vez' : `Descansou ${r.sim} vezes`}</span></span></Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {m.notRest.length > 0 && (
            <p className="muted restmonth__soft">
              {m.notRest.map((r) => r.game.title).join(' e ')} {m.notRest.length === 1 ? 'não te descansou' : 'não te descansaram'} quando era esse o plano. Talvez {m.notRest.length === 1 ? 'seja um jogo' : 'sejam jogos'} para outra hora, e tudo bem.
            </p>
          )}
          {m.feelings.length > 0 && (
            <p className="kicker restmonth__feel">Como foram as sessões: {m.feelings.map((f) => `${f.label} (${f.count})`).join(' · ')}</p>
          )}
        </>
      )}
    </section>
  );
}
