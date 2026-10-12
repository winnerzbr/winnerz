import { useState } from 'react';
import { Link } from '../lib/router';
import { actions, useStore, currentHistory, historiesOf, lastNote, sessionsOf, eventsOf, activeWaypoints, focusJourney } from '../data/store';
import type { State, Journey, TimelineEvent } from '../data/types';
import { ago, shortDate } from '../lib/format';
import { Compass, Icon } from '../components/Icon';
import { PlayButton } from '../components/PlayButton';
import { WhatToPlay } from '../components/WhatToPlay';
import { PhotoViewer } from '../components/MediaGallery';

const KIND: Record<string, string> = { inicio: 'Início', sessao: 'Sessão', momento: 'Momento', ponto: 'Para voltar', marco: 'Marco', carta: 'Carta' };

function rowFor(s: State, j: Journey) {
  const h = currentHistory(s, j.id);
  const last = [...s.sessions].filter((x) => x.journeyId === j.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  return { j, g: s.games[j.gameId], h, n: historiesOf(s, j.id).length, last, note: lastNote(s, j.id) };
}

export function JourneyIndex() {
  const s = useStore((x) => x);
  const focus = focusJourney(s);
  const rows = s.journeys.map((j) => rowFor(s, j)).filter((r) => r.g);
  const going = rows.filter((r) => r.h && r.h.state === 'ativa' && r.j.mood !== 'pausado' && r.j.id !== focus?.journey.id);
  const paused = rows.filter((r) => r.h && (r.h.state === 'pausada' || r.j.mood === 'pausado') && r.j.id !== focus?.journey.id);
  const done = rows.filter((r) => r.h && r.h.state === 'concluida');

  const Group = ({ title, list, hint, canFocus }: { title: string; list: typeof rows; hint?: string; canFocus?: boolean }) => list.length ? (
    <section className="block">
      <div className="block__head"><h2 className="t">{title}</h2>{hint && <span className="muted">{hint}</span>}</div>
      <div className="jgrid">
        {list.map(({ j, g, h, n, last, note }) => (
          <article key={j.id} className="jcard on-photo">
            <img src={g.backdrop ?? g.cover} alt="" />
            <div className="jcard__shade" aria-hidden="true" />
            <Link to={`/jornada/${g.slug}`} className="jcard__link" aria-label={`Abrir a Jornada de ${g.title}`} />
            {canFocus && (
              <button className="jcard__focus" onClick={() => actions.setFocus(j.id)} title="Destacar esta Jornada aqui e no Início">
                <Compass size={13} />Pôr em foco
              </button>
            )}
            <div className="jcard__body">
              <div className="jcard__meta">{n > 1 ? `${n} Histórias` : 'Primeira História'}{last ? `, última sessão ${ago(last.startedAt)}` : ''}</div>
              <div className="t jcard__title">{g.title}</div>
              {note?.note && <div className="quote jcard__note">“{note.note}”</div>}
              {h?.progress != null && h.state !== 'concluida' && <div className="bar bar--thin"><span style={{ width: `${h.progress}%` }} /></div>}
            </div>
          </article>
        ))}
      </div>
    </section>
  ) : null;

  return (
    <main className="page pad jindex">
      <h1 className="t big">Jornada</h1>
      <p className="muted lead">Toda história tem um próximo instante. O resto pode esperar.</p>
      {rows.length === 0 && (
        <div className="card tl-empty">
          <p className="t" style={{ fontSize: 30, color: 'var(--ink)' }}>Nenhuma Jornada ainda</p>
          <p className="muted">Escolha um jogo e toque em Jogar. A primeira História começa sem formulário.</p>
          <div className="hero__actions"><Link className="btn primary" to="/colecao">Abrir sua estante</Link><Link className="btn ghost" to="/jogos">Buscar um jogo</Link></div>
        </div>
      )}

      {focus && <FocusCard s={s} journey={focus.journey} chosen={focus.chosen} />}

      <Group title="Jogando agora" list={going} canFocus />

      {rows.length > 0 && (
        <section className="block jindex__what">
          <WhatToPlay excludeJourneyId={focus?.journey.id} headingId="oqj-jornada" />
        </section>
      )}

      <Group title="Pausados" list={paused} hint="Sem pressa. Eles esperam." canFocus />
      <Group title="Histórias concluídas" list={done} />
    </main>
  );
}

/** A Jornada em foco: foto do jogo, progresso, recado, últimos acontecimentos e fotos. */
function FocusCard({ s, journey, chosen }: { s: State; journey: Journey; chosen: boolean }) {
  const g = s.games[journey.gameId];
  const h = currentHistory(s, journey.id);
  const note = lastNote(s, journey.id);
  const wps = activeWaypoints(s, journey.id);
  const events = eventsOf(s, journey.id);
  const recent = events.slice(-6);
  const photos = [...events].reverse().filter((e) => e.image).slice(0, 4);
  const nSessions = h ? sessionsOf(s, h.id).length : 0;
  const [viewer, setViewer] = useState<number | null>(null);
  if (!g || !h) return null;

  return (
    <section className="focus on-photo" aria-labelledby="em-foco">
      <img className="focus__bg kb" src={g.backdrop ?? g.cover} alt="" />
      <div className="focus__shade" aria-hidden="true" />
      <div className="focus__grid">
        <div className="focus__main">
          <div className="focus__kicker">
            <span className="focus__badge"><Compass size={13} />Em foco</span>
            <span>{chosen ? 'Escolhido por você' : 'Sua sessão mais recente'}</span>
          </div>
          <h2 id="em-foco" className="t focus__title"><Link to={`/jornada/${g.slug}`}>{g.title}</Link></h2>
          <p className="focus__meta">
            {h.ordinal > 1 ? `Sua ${h.ordinal}ª História, ${h.title}` : 'Primeira História'}
            {nSessions ? `. ${nSessions} ${nSessions === 1 ? 'sessão' : 'sessões'}` : ''}
            {wps.length ? `. ${wps.length} ${wps.length === 1 ? 'ponto' : 'pontos'} para voltar` : ''}.
          </p>
          {h.progress != null && (
            <div className="focus__progress">
              <div className="bar" aria-hidden="true"><span style={{ width: `${h.progress}%` }} /></div>
              <span>{h.progress}%</span>
            </div>
          )}
          {note?.note && <blockquote className="quote focus__note">“{note.note}”<cite>Seu recado, {ago(note.startedAt)}</cite></blockquote>}
          <div className="focus__actions">
            <PlayButton gameId={g.id} />
            <Link className="btn ghost lg" to={`/jornada/${g.slug}`}>Abrir linha do tempo</Link>
            {chosen && <button className="btn quiet" onClick={() => actions.setFocus(null)}>Tirar do foco</button>}
          </div>
        </div>

        <div className="focus__side">
          {photos.length > 0 && (
            <div className={`focus__photos n${Math.min(photos.length, 3)}`}>
              {photos.slice(0, 3).map((e, i) => (
                <button key={e.id} className="focus__photo" onClick={() => setViewer(i)} aria-label={`Ver foto: ${e.title}`}>
                  <img src={e.image} alt="" />
                </button>
              ))}
            </div>
          )}
          {recent.length > 0 && (
            <ol className="focus__trail" aria-label="Últimos acontecimentos">
              {recent.map((e: TimelineEvent) => (
                <li key={e.id} className={`focus__step k-${e.kind}`}>
                  <span className={`dot dot--${e.kind}`} aria-hidden="true" />
                  <span className="focus__step-date">{e.dateLabel ?? shortDate(e.at)}</span>
                  <span className="focus__step-title">{e.title}</span>
                  <span className="focus__step-kind">{KIND[e.kind]}</span>
                </li>
              ))}
            </ol>
          )}
          <Link to={`/jornada/${g.slug}`} className="focus__more">Ver a linha do tempo inteira <Icon name="avancar" size={14} /></Link>
        </div>
      </div>
      {viewer !== null && (
        <PhotoViewer title={g.title} items={photos.map((e) => ({ kind: 'image' as const, src: e.image!, label: e.title }))} start={viewer} onClose={() => setViewer(null)} />
      )}
    </section>
  );
}
