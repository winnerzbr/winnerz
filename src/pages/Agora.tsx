import { useState } from 'react';
import { Link } from '../lib/router';
import { useStore, focusJourneys, openSession, currentHistory, isOpenState, lastNote } from '../data/store';
import { PlayButton } from '../components/PlayButton';
import { CoverArt } from '../components/CoverArt';
import { StopLine } from '../components/Comeback';
import { PastSessionSheet } from '../components/PastSession';
import { Icon } from '../components/Icon';
import { hourMin } from '../lib/format';

/**
 * Jogar agora: a tela que o ícone do app abre. Um toque começa (ou volta para) a sessão do jogo em destaque;
 * os outros jogos em andamento ficam logo abaixo, e a sessão esquecida pode ser lançada depois.
 */
export function AgoraPage() {
  const s = useStore((x) => x);
  const [past, setPast] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const open = openSession(s);
  const openGame = open ? s.games[s.journeys.find((j) => j.id === open.journeyId)?.gameId ?? ''] : undefined;
  const focus = focusJourneys(s).map((f) => f.journey);
  const others = s.journeys.filter((j) => !focus.some((f) => f.id === j.id) && isOpenState(currentHistory(s, j.id)?.state));
  const list = [...focus, ...others].filter((j) => s.games[j.gameId]);
  const main = open ? s.journeys.find((j) => j.id === open.journeyId) : list[0];
  const g = main ? s.games[main.gameId] : undefined;
  const note = main ? lastNote(s, main.id) : null;
  return (
    <main className="page pad agora">
      {g && main ? (
        <section className="agora__main" aria-labelledby="agora-t">
          <span className="agora__cover"><CoverArt game={g} lazy={false} /></span>
          <span className="kicker kicker--now">{open ? `Sessão aberta desde ${hourMin(open.startedAt)}` : 'Jogar agora'}</span>
          <h1 id="agora-t" className="t agora__title">{openGame?.title ?? g.title}</h1>
          {!open && <StopLine journeyId={main.id} slug={g.slug} />}
          {!open && note?.note && <p className="agora__note">“{note.note}”</p>}
          <PlayButton gameId={g.id} className="btn lg agora__play" />
        </section>
      ) : (
        <section className="agora__main">
          <h1 className="t agora__title">Nada em andamento</h1>
          <p className="muted">Escolha um jogo e toque em Jogar. A primeira História começa sem formulário.</p>
          <Link className="btn primary lg" to="/colecao">Abrir sua estante</Link>
        </section>
      )}
      {!open && list.length > 1 && (
        <section className="agora__others" aria-label="Outros jogos em andamento">
          <h2 className="kicker">Ou outro jogo</h2>
          <ul>
            {list.slice(1, 7).map((j) => { const og = s.games[j.gameId]; return (
              <li key={j.id}><span className="agora__mini"><CoverArt game={og} /></span><span className="agora__name">{og.title}</span><PlayButton gameId={og.id} className="btn sm" idle="Jogar" /></li>
            ); })}
          </ul>
        </section>
      )}
      <div className="agora__foot">
        <button className="btn ghost" onClick={() => setPast(true)}><Icon name="relogio" size={16} />Joguei sem registrar</button>
        <Link className="btn quiet" to="/jornada">Abrir a Jornada</Link>
      </div>
      {saved && <p className="agora__ok" role="status">Sessão de {s.games[saved]?.title} lançada. <Link to={`/jornada/${s.games[saved]?.slug}`}>Ver na Jornada</Link></p>}
      {past && <PastSessionSheet gameId={open ? undefined : g?.id} onClose={() => setPast(false)} onSaved={setSaved} />}
    </main>
  );
}
