import { Buddy, useBuddy } from '../components/Buddy';
import { useState } from 'react';
import { Link } from '../lib/router';
import { actions, useStore, currentHistory, historiesOf, lastNote, sessionsOf, eventsOf, activeWaypoints, focusJourneys } from '../data/store';
import type { State, Journey, TimelineEvent } from '../data/types';
import { ago } from '../lib/format';
import { whenLabel, partsOf } from '../lib/dates';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
import { formatScore } from '../lib/rating';
import { ActionToast } from '../components/Toast';
import { eventDate } from './Journey';
import { Compass, Icon } from '../components/Icon';
import { PlayButton } from '../components/PlayButton';
import { WhatToPlay } from '../components/WhatToPlay';
import { PhotoViewer } from '../components/MediaGallery';
import { Backdrop } from '../components/Backdrop';

const KIND: Record<string, string> = { inicio: 'Início', sessao: 'Sessão', momento: 'Momento', ponto: 'Para voltar', marco: 'Marco', carta: 'Carta' };

function rowFor(s: State, j: Journey) {
  const h = currentHistory(s, j.id);
  const last = [...s.sessions].filter((x) => x.journeyId === j.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  return { j, g: s.games[j.gameId], h, n: historiesOf(s, j.id).length, last, note: lastNote(s, j.id) };
}

export function JourneyIndex() {
  const s = useStore((x) => x);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const focus = focusJourneys(s);
  const principal = focus[0] ?? null;
  const secondary = focus.slice(1);
  const inFocus = new Set(focus.map((f) => f.journey.id));
  const rows = s.journeys.map((j) => rowFor(s, j)).filter((r) => r.g);
  const going = rows.filter((r) => r.h && r.h.state === 'ativa' && !inFocus.has(r.j.id));
  const paused = rows.filter((r) => r.h && r.h.state === 'pausada' && !inFocus.has(r.j.id));
  const done = rows.filter((r) => r.h && r.h.state === 'concluida')
    .sort((a, b) => (b.h!.completedAt ?? '').localeCompare(a.h!.completedAt ?? ''));
  const left = rows.filter((r) => r.h && (r.h.state === 'dropada' || r.h.state === 'encerrada'));
  const putInFocus = (id: string) => { if (!actions.addFocus(id)) setToast({ id: Date.now(), text: 'Você já tem 3 jogos em foco. Tire um deles para pôr outro.' }); };

  const Group = ({ title, list, hint, canFocus }: { title: string; list: typeof rows; hint?: string; canFocus?: boolean }) => list.length ? (
    <section className="block">
      <div className="block__head"><h2 className="t">{title}</h2>{hint && <span className="muted">{hint}</span>}</div>
      <div className="jgrid">
        {list.map(({ j, g, h, n, last, note }) => (
          <article key={j.id} className="jcard on-photo">
            <Backdrop game={g} />
            <div className="jcard__shade" aria-hidden="true" />
            <Link to={`/jornada/${g.slug}`} className="jcard__link" aria-label={`Abrir a Jornada de ${g.title}`} />
            {canFocus && (
              <button className="jcard__focus" onClick={() => putInFocus(j.id)} title="Destacar esta Jornada aqui e no Início (até 3)">
                <Compass size={13} />Pôr em foco
              </button>
            )}
            <div className="jcard__body">
              <div className="jcard__meta">{h && (h.state === 'concluida' || h.state === 'dropada' || h.state === 'encerrada') ? `${h.state === 'concluida' ? 'Zerou' : h.state === 'dropada' ? 'Largou' : 'Encerrou'}, ${whenLabel(h.completedAt, h.completedPrecision, { short: true })}${n > 1 ? `. ${n} Histórias` : ''}` : `${n > 1 ? `${n} Histórias` : 'Primeira História'}${last ? `, última sessão ${ago(last.startedAt)}` : ''}`}</div>
              <div className="t jcard__title">{g.title}</div>
              {note?.note && <div className="quote jcard__note">“{note.note}”</div>}
              {!!h?.progress && (h.state === 'ativa' || h.state === 'pausada') && <div className="bar bar--thin"><span style={{ width: `${h.progress}%` }} /></div>}
            </div>
          </article>
        ))}
      </div>
    </section>
  ) : null;

  return (
    <main className="page pad jindex">
      <SubNav pillar="jornada" />
      <h1 className="t big">Jornada</h1>
      <p className="muted lead">Toda história tem um próximo instante. O resto pode esperar.</p>
      {rows.length === 0 && (
        <div className="card tl-empty">
          <p className="t" style={{ fontSize: 30, color: 'var(--ink)' }}>Nenhuma Jornada ainda</p>
          <p className="muted">Escolha um jogo e toque em Jogar. A primeira História começa sem formulário.</p>
          <div className="hero__actions"><Link className="btn primary" to="/colecao">Abrir sua estante</Link><Link className="btn ghost" to="/jogos">Buscar um jogo</Link></div>
        </div>
      )}

      {principal && <FocusCard s={s} journey={principal.journey} chosen={principal.chosen} />}
      {secondary.length > 0 && (
        <div className="focus-minis" aria-label="Também em foco">
          {secondary.map((f) => <FocusMini key={f.journey.id} s={s} journeyId={f.journey.id} />)}
        </div>
      )}

      <Group title="Jogando agora" list={going} canFocus />

      {rows.length > 0 && (
        <section className="block jindex__what">
          <WhatToPlay excludeJourneyId={principal?.journey.id} headingId="oqj-jornada" />
        </section>
      )}

      <Group title="Pausados" list={paused} hint="Sem pressa. Eles esperam." canFocus />
      <Group title="Zerados recentemente" list={done.slice(0, 6)} hint={done.length > 6 ? `${done.length} ao todo` : undefined} />
      {done.length > 6 && <p className="jindex__more"><Link className="btn ghost" to="/jornada/concluidas">Ver todas as Histórias concluídas</Link></p>}
      <Group title="Deixados de lado" list={left} hint="Largados ou encerrados sem zerar. Sem julgamento." />
      {toast && <ActionToast key={toast.id} text={toast.text} onDone={() => setToast(null)} />}
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
      <Backdrop game={g} className="focus__bg kb" />
      <div className="focus__shade" aria-hidden="true" />
      <div className="focus__grid">
        <div className="focus__main">
          <div className="focus__kicker">
            <span className="focus__badge"><Compass size={13} />Em foco</span>
            <span>{chosen ? 'Foco principal' : 'Sua sessão mais recente'}</span>
          </div>
          <h2 id="em-foco" className="t focus__title"><Link to={`/jornada/${g.slug}`}>{g.title}</Link></h2>
          <p className="focus__meta">
            {h.ordinal > 1 ? `Sua ${h.ordinal}ª História, ${h.title}` : 'Primeira História'}
            {nSessions && !s.prefs.light ? `. ${nSessions} ${nSessions === 1 ? 'sessão' : 'sessões'}` : ''}
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
            {chosen && <button className="btn quiet" onClick={() => actions.removeFocus(journey.id)}>Tirar do foco</button>}
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
                  <span className="focus__step-date">{eventDate(e)}</span>
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

/** Os outros jogos em foco: menores, ao lado do principal. */
function FocusMini({ s, journeyId }: { s: State; journeyId: string }) {
  const j = s.journeys.find((x) => x.id === journeyId)!;
  const g = s.games[j.gameId];
  const h = currentHistory(s, j.id);
  const note = lastNote(s, j.id);
  if (!g || !h) return null;
  return (
    <article className="focus-mini on-photo">
      <Backdrop game={g} />
      <div className="focus-mini__shade" aria-hidden="true" />
      <div className="focus-mini__body">
        <span className="focus__badge"><Compass size={12} />Em foco</span>
        <h2 className="t"><Link to={`/jornada/${g.slug}`}>{g.title}</Link></h2>
        <p>{h.state === 'pausada' ? 'Pausado.' : `Jogando${h.progress != null ? `, ${h.progress}%` : ''}.`}{note?.note ? ` “${note.note}”` : ''}</p>
        <div className="focus-mini__actions">
          <PlayButton gameId={g.id} className="btn sm" />
          <button className="btn quiet sm" onClick={() => actions.makePrincipal(j.id)}>Tornar principal</button>
          <button className="btn quiet sm" onClick={() => actions.removeFocus(j.id)}>Tirar do foco</button>
        </div>
      </div>
    </article>
  );
}

/** Histórias concluídas: tudo o que você zerou, do mais recente ao mais antigo, agrupado por ano. */
export function ConcludedPage() {
  const s = useStore((x) => x);
  const done = s.histories.filter((h) => h.state === 'concluida').map((h) => {
    const j = s.journeys.find((x) => x.id === h.journeyId);
    const g = j ? s.games[j.gameId] : undefined;
    const known = h.completedAt && h.completedPrecision !== 'desconhecida';
    return { h, g, year: known ? partsOf(h.completedAt!).y : null, review: g ? s.reviews.find((r) => r.mine && r.gameId === g.id) : undefined };
  }).filter((x) => x.g)
    .sort((a, b) => (b.year ?? -1) - (a.year ?? -1) || (b.h.completedAt ?? '').localeCompare(a.h.completedAt ?? ''));
  const years = [...new Set(done.map((d) => d.year))];
  const totalHours = done.reduce((a, d) => a + (d.h.hours ?? 0), 0);
  return (
    <main className="page pad jindex">
      <SubNav pillar="jornada" />
      <h1 className="t big">Histórias concluídas</h1>
      <p className="muted lead">{done.length && s.prefs.light ? 'Cada História aqui é sua, completa ou mínima.' : done.length ? `${done.length} ${done.length === 1 ? 'História zerada' : 'Histórias zeradas'}${totalHours ? `, ${Math.round(totalHours).toLocaleString('pt-BR')} horas informadas por você` : ''}.` : 'Quando você zerar um jogo, ele aparece aqui. Dá para registrar os que zerou antes, com “Já zerei” na página do jogo.'}</p>
      {done.length === 1 && <FirstBuddy />}
      {done.length > 0 && (
        <section className="honor" aria-labelledby="honra">
          <h2 id="honra" className="sr-only">Mural de honra</h2>
          <ul className="honor__shelf">
            {[...done].sort((a, b) => (b.h.completedAt ?? '').localeCompare(a.h.completedAt ?? '')).slice(0, 5).map(({ h, g, review }, i) => (
              <li key={h.id} style={{ animationDelay: `${i * 0.08}s` }}>
                <Link to={`/jornada/${g!.slug}`} className="honor__item">
                  <span className="honor__cover"><CoverArt game={g!} /></span>
                  <span className="honor__plate"><strong>{g!.title}</strong><span>{whenLabel(h.completedAt, h.completedPrecision, { short: true })}{review && !s.prefs.light ? ` · ${formatScore(review.rating.normalized, s.prefs.scale)}` : ''}</span></span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="faint honor__note">Completa ou mínima, toda História concluída tem lugar aqui.</p>
        </section>
      )}
      {years.map((y) => (
        <section key={String(y)} className="block" aria-labelledby={`ano-${y}`}>
          <div className="block__head"><h2 id={`ano-${y}`} className="t">{y ?? 'Sem data'}</h2><span className="muted">{done.filter((d) => d.year === y).length}</span></div>
          <ul className="done-grid">
            {done.filter((d) => d.year === y).map(({ h, g, review }) => (
              <li key={h.id}>
                <Link to={`/jornada/${g!.slug}`} className="done-card">
                  <span className="done-card__cover"><CoverArt game={g!} /></span>
                  <span className="done-card__title">{g!.title}</span>
                  <span className="muted done-card__meta">{h.ordinal > 1 ? `${h.ordinal}ª vez, ` : ''}{whenLabel(h.completedAt, h.completedPrecision, { short: true })}{h.hours ? `, ${String(h.hours).replace('.', ',')} h` : ''}{review ? `, nota ${formatScore(review.rating.normalized, s.prefs.scale)}` : ''}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

function FirstBuddy() {
  return <Buddy line={useBuddy('primeiro-zerado', true)} className="buddy--card" />;
}
