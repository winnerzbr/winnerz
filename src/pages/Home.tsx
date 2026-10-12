import { useMemo } from 'react';
import { Link } from '../lib/router';
import { useStore, currentHistory, lastNote, activeWaypoints, sessionsOf, focusJourney, isOpenState } from '../data/store';
import { PlayButton } from '../components/PlayButton';
import { WhatToPlay } from '../components/WhatToPlay';
import { RadarNotice } from '../components/RadarNotice';
import { WeekCard, AnniversaryCard } from './Memory';
import { ago, capitalize, dayMonthYear, longDay } from '../lib/format';
import { CoverArt } from '../components/CoverArt';
import { Backdrop } from '../components/Backdrop';

export function Home() {
  const s = useStore((x) => x);
  const j = focusJourney(s)?.journey ?? null;
  const game = j ? s.games[j.gameId] : null;
  const h = j ? currentHistory(s, j.id) : null;
  const note = j ? lastNote(s, j.id) : null;
  const wps = j ? activeWaypoints(s, j.id) : [];
  const nSessions = h ? sessionsOf(s, h.id).length : 0;

  // Só o que está de fato em andamento (jogando ou pausado); largados, encerrados e zerados ficam de fora.
  const others = s.journeys.filter((x) => x.id !== j?.id).map((x) => ({ j: x, g: s.games[x.gameId], h: currentHistory(s, x.id) })).filter((x) => x.g && x.h && isOpenState(x.h.state)).slice(0, 3);

  const memory = useMemo(() => {
    const yearAgo = Date.now() - 300 * 86_400_000;
    return s.events.filter((e) => (e.quote || e.image) && new Date(e.at).getTime() < yearAgo && e.kind !== 'marco').sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
  }, [s.events]);

  const today = capitalize(longDay(new Date().toISOString()));

  return (
    <main>
      {j && game && h ? (
        <section className="hero on-photo" aria-labelledby="hero-title">
          <Backdrop game={game} className="hero__bg kb" />
          <div className="hero__shade" aria-hidden="true" />
          <div className="hero__fade" aria-hidden="true" />
          <div className="page hero__row">
            <div className="hero__text">
              <p className="hero__kicker in-1">{today}. Anteriormente na sua Jornada…</p>
              <h1 id="hero-title" className="t hero__title in-1">{game.title}</h1>
              <p className="hero__lead in-2">
                {h.ordinal > 1 ? `Sua ${h.ordinal}ª História com este jogo` : 'Sua primeira História com este jogo'}
                {nSessions ? `. ${nSessions} ${nSessions === 1 ? 'sessão' : 'sessões'} desde ${dayMonthYear(h.startedAt).replace(/ de \d{4}$/, '')}` : ''}.
              </p>
              {h.progress != null && (
                <div className="hero__progress in-2">
                  <div><span>Seu progresso</span><span>{h.progress}%, informado por você</span></div>
                  <div className="bar" aria-hidden="true"><span style={{ width: `${h.progress}%` }} /></div>
                </div>
              )}
              {note?.note && (
                <figure className="hero__note in-3">
                  <blockquote className="quote">“{note.note}”</blockquote>
                  <figcaption>Seu recado para a próxima sessão, {longDay(note.startedAt)}</figcaption>
                </figure>
              )}
              <div className="hero__actions in-3">
                <PlayButton gameId={game.id} />
                <Link className="btn ghost lg" to={`/jornada/${game.slug}`}>Abrir linha do tempo</Link>
              </div>
            </div>
            {wps[0]?.image && (
              <Link to={`/jornada/${game.slug}`} className="polaroid in-3">
                <div className="polaroid__paper">
                  <img src={wps[0].image} alt={`Ponto para voltar: ${wps[0].title}`} />
                  <div className="polaroid__cap"><div className="quote">Quero voltar aqui</div><div>{wps[0].title}{wps[0].text ? `, ${wps[0].text.replace(/\.$/, '')}` : ''}</div></div>
                </div>
                <div className="polaroid__count">1 de {wps.length} {wps.length === 1 ? 'ponto' : 'pontos'} para voltar</div>
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className="page empty-hero">
          <h1 className="t">Onde jogos viram histórias</h1>
          <p className="muted">Escolha um jogo e toque em Jogar. Sua primeira História começa sem formulário.</p>
          <div className="hero__actions"><Link className="btn primary lg" to="/colecao">Abrir sua estante</Link><Link className="btn ghost lg" to="/jogos">Buscar um jogo</Link></div>
        </section>
      )}

      <div className="page home-body">
        {others.length > 0 && (
          <section aria-labelledby="andamento" className="block">
            <div className="block__head"><h2 id="andamento" className="t">Também em andamento</h2><Link to="/jornada">Todas as Jornadas</Link></div>
            <div className="also">
              {others.map(({ j: x, g, h: hh }) => (
                <Link key={x.id} to={`/jornada/${g.slug}`} className="also__item">
                  <span style={{ opacity: hh?.state === 'pausada' ? 0.7 : 1 }} className="also__cover"><CoverArt game={g} /></span>
                  <div>
                    <div className="serif also__name">{g.title}</div>
                    <div className="muted also__meta">{hh?.state === 'pausada' ? (hh.note ?? x.pausedNote ?? 'Pausado.') : x.mood === 'silencioso' ? 'Jogando no modo silencioso.' : `Jogando${hh?.progress ? `, ${hh.progress}%` : ''}.`}</div>
                    {!!hh?.progress && hh.state !== 'pausada' && <div className="bar bar--thin" aria-hidden="true"><span style={{ width: `${hh.progress}%` }} /></div>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="split">
          <WhatToPlay excludeJourneyId={j?.id} />

          <aside className="home-aside" aria-label="Sua estante">
            <RadarNotice />
            <AnniversaryCard />
            <WeekCard />
            <section className="card aside-card">
              <h2 className="t">Sua estante</h2>
              <p className="muted">{new Set(s.copies.map((c) => c.gameId)).size} jogos, {s.wishes.length} desejos.</p>
              <div className="aside-covers">
                {s.copies.slice(-4).reverse().map((c) => s.games[c.gameId] && (
                  <Link key={c.id} to={`/jogos/${s.games[c.gameId].slug}`} aria-label={s.games[c.gameId].title}><CoverArt game={s.games[c.gameId]} platform={c.platform} /></Link>
                ))}
              </div>
              <Link to="/colecao" className="btn ghost sm">Abrir a estante</Link>
            </section>
            {s.wishes[0] && s.games[s.wishes[0].gameId] && (
              <section className="card aside-card aside-wish">
                <CoverArt game={s.games[s.wishes[0].gameId]} />
                <div>
                  <div className="muted" style={{ fontSize: 13 }}>Nos seus desejos</div>
                  <h2 className="t" style={{ fontSize: 30 }}>{s.games[s.wishes[0].gameId].title}</h2>
                  {s.wishes[0].note && <p className="muted" style={{ margin: '6px 0 0', fontSize: 14 }}>{s.wishes[0].note}</p>}
                </div>
              </section>
            )}
          </aside>
        </div>

        {memory && (
          <section aria-labelledby="memoria" className="block">
            <h2 id="memoria" className="t block__title">{capitalize(ago(memory.at))}</h2>
            <figure className="memory on-photo">
              {memory.image && <img src={memory.image} alt="" />}
              <figcaption>
                {memory.quote && <div className="quote">“{memory.quote}”</div>}
                <div className="memory__meta">{memory.title}, {s.games[s.journeys.find((x) => x.id === memory.journeyId)?.gameId ?? '']?.title}, {dayMonthYear(memory.at)}</div>
              </figcaption>
            </figure>
          </section>
        )}
      </div>
    </main>
  );
}

