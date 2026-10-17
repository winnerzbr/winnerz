/**
 * "Voltar a um jogo" (/jornada/:slug/voltar): tudo o que ajuda a retomar depois de um tempo longe.
 * Onde você parou, o próximo passo pequeno, o que você fazia, as últimas sessões e o que aconteceu enquanto isso.
 * Só com o que você registrou; nada é inventado.
 */
import { useState } from 'react';
import { Link } from '../lib/router';
import { useStore, currentHistory, sessionsOf, activeWaypoints, daysAway, isOpenState } from '../data/store';
import { PlayButton } from '../components/PlayButton';
import { Backdrop } from '../components/Backdrop';
import { CoverArt } from '../components/CoverArt';
import { Previously, CapsuleSheet } from '../components/Retomada';
import { stopOf } from '../components/Comeback';
import { awayLabel } from '../lib/recap';
import { longDay, durLabel } from '../lib/format';
import { Icon } from '../components/Icon';
import { GameCommunity } from './Communities';
import { GameClubs } from './Clubs';

export function ComebackPage({ slug }: { slug: string }) {
  const s = useStore((x) => x);
  const game = Object.values(s.games).find((g) => g.slug === slug);
  const journey = game ? s.journeys.find((j) => j.gameId === game.id) : undefined;
  const [capsule, setCapsule] = useState(false);
  if (!game || !journey) {
    return (
      <main className="page pad">
        <h1 className="t big">{game ? game.title : 'Jogo não encontrado'}</h1>
        <p className="muted">{game ? 'Você ainda não tem uma Jornada com este jogo.' : 'Confira o endereço.'}</p>
        <Link className="btn ghost" to={game ? `/jornada/${game.slug}` : '/jornada'}>Voltar</Link>
      </main>
    );
  }
  const h = currentHistory(s, journey.id);
  const st = stopOf(s, journey.id);
  const away = daysAway(s, journey.id);
  const sessions = h ? sessionsOf(s, h.id).filter((x) => x.endedAt).reverse().slice(0, 4) : [];
  const points = activeWaypoints(s, journey.id);
  const next = st.next;
  const nextFrom = h?.capsule?.next ? 'da sua Cápsula' : st.note ? 'do recado que você deixou' : points[0] ? 'do seu primeiro ponto para voltar' : '';
  const open = h && isOpenState(h.state);

  return (
    <main className="comeback">
      <section className="comeback__hero on-photo" aria-labelledby="cb-title">
        <Backdrop game={game} className="comeback__bg kb" />
        <div className="comeback__shade" aria-hidden="true" />
        <div className="page comeback__in">
          <Link to={`/jornada/${game.slug}`} className="back comeback__back">← Jornada</Link>
          <div className="comeback__row">
            <span className="comeback__cover"><CoverArt game={game} lazy={false} /></span>
            <div className="comeback__text">
              <p className="kicker kicker--now">Voltar a um jogo{away != null ? ` · última vez ${awayLabel(away)}` : ''}</p>
              <h1 id="cb-title" className="t comeback__title">{game.title}</h1>
              <p className="comeback__lead">{st.where ? <>Você parou em <b>{st.where}</b>.</> : 'Você ainda não anotou onde parou.'}{h && h.ordinal > 1 ? ` ${h.title}, História ${h.ordinal}.` : ''}{h?.progress != null && !s.prefs.light ? ` ${h.progress}% do caminho, pelo que você informou.` : ''}</p>
              <div className="comeback__actions">
                <PlayButton gameId={game.id} />
                <Link className="btn ghost lg" to={`/jornada/${game.slug}`}>Abrir a linha do tempo</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="page comeback__body">
        <div className="comeback__main">
          <section className="card comeback__next" aria-labelledby="cb-next">
            <h2 id="cb-next" className="kicker">Seu próximo passo</h2>
            {next ? (
              <>
                <p className="comeback__goal">{next}</p>
                <p className="muted">Um objetivo pequeno, tirado {nextFrom}. Cabe numa sessão curta.</p>
              </>
            ) : (
              <p className="muted">Ainda não há um próximo passo registrado. Monte a Cápsula de Retomada: onde você está, o que fazia e o que fazer depois.</p>
            )}
            <div className="comeback__next-actions">
              {open && <PlayButton gameId={game.id} className="btn" />}
              {h && h.state !== 'concluida' && <button className="btn quiet sm" onClick={() => setCapsule(true)}>{h.capsule ? 'Atualizar a Cápsula' : 'Montar a Cápsula'}</button>}
            </div>
          </section>
          <Previously journeyId={journey.id} always hideNote={next ?? null} />
        </div>
        <aside className="comeback__aside">
          {sessions.length > 0 && (
            <section className="card comeback__sessions" aria-labelledby="cb-sess">
              <h2 id="cb-sess" className="kicker">Suas últimas sessões</h2>
              <ol>
                {sessions.map((x) => (
                  <li key={x.id}>
                    <span className="mono comeback__when">{longDay(x.startedAt)}{x.minutes ? ` · ${durLabel(x.minutes)}` : ''}</span>
                    {x.whereStopped && <span><Icon name="pin" size={13} /> {x.whereStopped}</span>}
                    {x.note && x.note !== next && <span className="quote">“{x.note}”</span>}
                    {x.feeling && <span className="chip chip--static">{x.feeling}</span>}
                  </li>
                ))}
              </ol>
            </section>
          )}
          <section className="comeback__meanwhile" aria-label="Enquanto isso">
            <h2 className="kicker">Enquanto isso, na comunidade</h2>
            <GameCommunity gameId={game.id} slug={game.slug} title={game.title} />
            <GameClubs gameId={game.id} slug={game.slug} title={game.title} />
          </section>
        </aside>
      </div>
      {capsule && h && <CapsuleSheet historyId={h.id} gameTitle={game.title} onClose={() => setCapsule(false)} />}
    </main>
  );
}
