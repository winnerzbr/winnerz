import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, useStore, getState, currentHistory, lastNote, activeWaypoints, sessionsOf, focusJourney, isOpenState } from '../data/store';
import type { Game, State } from '../data/types';
import { PlayButton } from '../components/PlayButton';
import { WhatToPlay } from '../components/WhatToPlay';
import { RadarNotice } from '../components/RadarNotice';
import { WeekCard, AnniversaryCard } from './Memory';
import { ago, capitalize, dayMonthYear, longDay } from '../lib/format';
import { CoverArt } from '../components/CoverArt';
import { Backdrop } from '../components/Backdrop';
import { loadRadar, daysUntil, type RadarInfo } from '../lib/radar';
import { localDay } from '../lib/dates';
import { radarGames } from './Radar';
import { awardsApi, phaseOf, publicAt, type Award } from '../data/awards';
import { isNewcomer } from '../lib/welcome';
import { chaptersLeft } from '../lib/arrival';
import { StopLine } from '../components/Comeback';

const TZ = 'America/Sao_Paulo';
/** "09 OUT", e o ano quando não é o ano corrente. */
export function stamp(iso: string) {
  const d = new Date(iso);
  const dm = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: TZ }).replace(/\.| de /g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
  return d.getFullYear() !== new Date().getFullYear() ? `${dm} ${d.getFullYear()}` : dm;
}

export type Upcoming = { key: string; day: string; title: string; sub: string; to: string; kind: 'lancamento' | 'evento'; game?: Game; days: number };

/** O que vem pela frente: lançamentos do seu Radar com data de dia e as datas do WinnerZ Awards. */
export function useUpcoming(s: State) {
  const games = useMemo(() => radarGames(s).filter((g) => g.igdbId), [s]);
  const [info, setInfo] = useState<Record<number, RadarInfo>>({});
  const [award, setAward] = useState<Award | null>(null);
  const key = games.map((g) => g.igdbId).join(',');
  useEffect(() => {
    if (!games.length) return;
    let alive = true;
    loadRadar(games.map((g) => g.igdbId!)).then((r) => alive && setInfo(r)).catch(() => null);
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let alive = true;
    awardsApi().list().then((l) => alive && setAward(l[0] ?? null)).catch(() => null);
    return () => { alive = false; };
  }, [s.mode]);

  return useMemo(() => {
    const today = localDay();
    const out: Upcoming[] = [];
    for (const g of games) {
      const i = info[g.igdbId!];
      if (!i?.day || i.status !== 'previsto' || i.precision !== 'dia') continue;
      const n = daysUntil(i.day, today);
      if (n < 0) continue;
      out.push({ key: g.id, day: i.day, title: g.title, sub: 'No seu Radar', to: `/jogos/${g.slug}`, kind: 'lancamento', game: g, days: n });
    }
    if (award) {
      const p = phaseOf(award);
      const add = (iso: string | undefined, title: string) => {
        if (!iso) return;
        const day = localDay(0, new Date(iso));
        const n = daysUntil(day, today);
        if (n >= 0) out.push({ key: `${award.id}-${title}`, day, title, sub: award.title, to: '/eventos/awards', kind: 'evento', days: n });
      };
      if (p === 'antes') add(award.votingOpens, 'Abre a votação');
      if (p === 'aberta') { add(award.votingCloses, 'Fim da votação'); add(publicAt(award), 'Noite da revelação'); }
      if (p === 'apurando') add(publicAt(award), 'Noite da revelação');
    }
    return { list: out.sort((a, b) => a.day.localeCompare(b.day)), award };
  }, [games, info, award]);
}

/** A linha do horizonte: o que passou à esquerda, hoje no meio, o que vem à direita. */
function Horizon({ s, upcoming, focusGame, nextSession }: { s: State; upcoming: Upcoming[]; focusGame?: Game | null; nextSession?: number }) {
  const past = useMemo(() => {
    const now = new Date().toISOString();
    return [...s.events]
      .filter((e) => e.at <= now && e.precision !== 'desconhecida' && e.kind !== 'carta')
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 2)
      .reverse()
      .map((e) => {
        const g = s.games[s.journeys.find((x) => x.id === e.journeyId)?.gameId ?? ''];
        return { e, g };
      })
      .filter((x) => x.g);
  }, [s.events, s.games, s.journeys]);
  const next = upcoming.slice(0, 2);
  if (!past.length && !next.length) return null;
  const today = capitalize(new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: TZ }).replace(/\./g, ''));
  const slots: ReactNode[] = [null, null, null, null];
  past.forEach(({ e, g }, i) => {
    const slot = past.length === 1 ? 1 : i;
    slots[slot] = (
      <Link key={e.id} to={`/jornada/${g.slug}`} className={`hz__item hz__item--past${slot === 0 ? ' hz__item--far' : ''}`}>
        <span className="hz__label">
          <span className="hz__cover"><CoverArt game={g} /></span>
          <span className="hz__text"><span className="hz__date">{stamp(e.at)}</span><span className="hz__title">{e.title}</span><span className="hz__sub">{g.title}</span></span>
        </span>
        <span className={`hz__mk ${slot === 1 ? 'hz__mk--rec' : 'hz__mk--past'}`} aria-hidden="true" />
      </Link>
    );
  });
  next.forEach((u, i) => {
    const slot = 2 + i;
    slots[slot] = (
      <Link key={u.key} to={u.to} className={`hz__item hz__item--next${slot === 3 ? ' hz__item--far' : ''}`}>
        <span className="hz__label">
          {u.game && <span className="hz__cover"><CoverArt game={u.game} /></span>}
          <span className="hz__text"><span className="hz__date hz__date--now">{stamp(u.day + 'T15:00:00Z')}{u.days > 0 ? ` · ${u.days === 1 ? 'amanhã' : `em ${u.days} dias`}` : ' · hoje'}</span><span className="hz__title">{u.title}</span><span className="hz__sub">{u.sub}</span></span>
        </span>
        <span className={`hz__mk ${u.kind === 'evento' && u.title === 'Noite da revelação' ? 'hz__mk--marco' : 'hz__mk--next'}`} aria-hidden="true" />
      </Link>
    );
  });
  return (
    <section className="page hz" aria-label="Seu horizonte">
      <div className="hz__legend"><span>← Passado</span><span className="hz__now">Hoje · {today}</span><span>Próximo →</span></div>
      <div className="hz__track">
        <span className="hz__line" aria-hidden="true" />
        <span className="hz__glow" aria-hidden="true" />
        {slots[0] ?? <span className="hz__item hz__item--far" />}
        {slots[1] ?? <span className="hz__item" />}
        <div className="hz__item hz__item--today">
          <span className="hz__label hz__label--today"><span className="t hz__today">Hoje</span>{focusGame && nextSession ? <span className="hz__sub">Seu recado espera por você</span> : null}</span>
          <span className="hz__mk hz__mk--today" aria-hidden="true" />
        </div>
        {slots[2] ?? <span className="hz__item" />}
        {slots[3] ?? <span className="hz__item hz__item--far" />}
      </div>
    </section>
  );
}

/** O próximo lançamento do seu Radar, com contagem de dias (quando passa de uma semana; antes disso o aviso do Radar cuida). */
function NextRelease({ u }: { u?: Upcoming }) {
  if (!u?.game || u.days <= 7) return null;
  return (
    <Link to={u.to} className="next-release on-photo">
      <Backdrop game={u.game} className="next-release__bg" />
      <span className="next-release__shade" aria-hidden="true" />
      <span className="next-release__body">
        <span className="next-release__text"><span className="kicker kicker--now">No seu Radar · {stamp(u.day + 'T15:00:00Z')}</span><span className="t next-release__title">{u.title}</span></span>
        <span className="next-release__days"><span className="t">{u.days}</span><span className="kicker">dias</span></span>
      </span>
    </Link>
  );
}

function AwardsNotice({ award }: { award: Award | null }) {
  if (!award) return null;
  const p = phaseOf(award);
  if (p !== 'aberta' && p !== 'apurando') return null;
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: TZ }) : '');
  return (
    <article className="card home-card home-card--now awards-notice">
      <div>
        <div className="kicker kicker--now">{award.title}</div>
        <div className="awards-notice__line">{p === 'aberta' ? (award.votingCloses ? `Votação aberta até ${when(award.votingCloses)}.` : 'Votação aberta.') : `O resultado sai em ${when(publicAt(award))}.`}</div>
      </div>
      <Link to="/eventos/awards" className={`btn sm ${p === 'aberta' ? 'now' : 'ghost'}`}>{p === 'aberta' ? 'Votar' : 'Ver'}</Link>
    </article>
  );
}

/** Quem acabou de chegar vai para a Chegada (uma vez); os outros, o Início de sempre. Decidido ao abrir a página. */
export function Home() {
  const [arrive] = useState(() => { const s = getState(); return isNewcomer(s) && !s.prefs.chegada; });
  useEffect(() => { if (arrive) navigate('/chegada', { replace: true }); }, [arrive]);
  return arrive ? null : <HomeDefault />;
}

/** "Continuar a chegada": quem parou no meio vê os emblemas que faltam. */
function ArrivalResume() {
  const c = useStore((x) => x.prefs.chegada);
  if (!c || c.fim) return null;
  const left = chaptersLeft(c.passo);
  return (
    <div className="page arrive-wrap"><section className="arrive-card" aria-labelledby="arrive-t">
      <div className="arrive-card__ems" aria-hidden="true">{left.map((x) => <img key={x.key} src={x.img} alt="" />)}</div>
      <div className="arrive-card__txt">
        <span className="kicker kicker--now">Sua chegada</span>
        <b id="arrive-t">{left.length === 1 ? `Falta só ${left[0].label}.` : `Faltam ${left.length} partes: ${left.map((x) => x.label).join(', ')}.`}</b>
        <span className="muted">Tudo o que você escolheu ficou guardado. Continue de onde parou.</span>
      </div>
      <div className="arrive-card__acts">
        <Link className="btn now" to={`/chegada?passo=${c.passo}`}>Continuar a chegada</Link>
        <button className="btn quiet sm" onClick={() => actions.setPrefs({ chegada: { ...c, fim: true }, welcomeDone: true })}>Dispensar</button>
      </div>
    </section></div>
  );
}

function HomeDefault() {
  const s = useStore((x) => x);
  const j = focusJourney(s)?.journey ?? null;
  const game = j ? s.games[j.gameId] : null;
  const h = j ? currentHistory(s, j.id) : null;
  const note = j ? lastNote(s, j.id) : null;
  const wps = j ? activeWaypoints(s, j.id) : [];
  const nSessions = h ? sessionsOf(s, h.id).length : 0;
  const { list: upcoming, award } = useUpcoming(s);

  // Só o que está de fato em andamento (jogando ou pausado); largados, encerrados e zerados ficam de fora.
  const others = s.journeys.filter((x) => x.id !== j?.id).map((x) => ({ j: x, g: s.games[x.gameId], h: currentHistory(s, x.id) })).filter((x) => x.g && x.h && isOpenState(x.h.state)).slice(0, 3);

  const memory = useMemo(() => {
    const yearAgo = Date.now() - 300 * 86_400_000;
    return s.events.filter((e) => (e.quote || e.image) && new Date(e.at).getTime() < yearAgo && e.kind !== 'marco').sort((a, b) => b.at.localeCompare(a.at))[0] ?? null;
  }, [s.events]);

  const today = capitalize(longDay(new Date().toISOString()));
  const shelfCount = new Set(s.copies.map((c) => c.gameId)).size;
  const wish = s.wishes[0] && s.games[s.wishes[0].gameId] ? { w: s.wishes[0], g: s.games[s.wishes[0].gameId] } : null;
  const wishOnRadar = !!wish && upcoming.some((u) => u.game?.id === wish.g.id);

  return (
    <main className="home">
      <ArrivalResume />
      {j && game && h ? (
        <section className="hero on-photo" aria-labelledby="hero-title">
          <Backdrop game={game} className="hero__bg kb" />
          <div className="hero__shade" aria-hidden="true" />
          <div className="hero__fade" aria-hidden="true" />
          <div className="page hero__row">
            <div className="hero__text">
              <p className="kicker kicker--now hero__kicker in-1">{today} · Anteriormente na sua Jornada</p>
              <h1 id="hero-title" className="t hero__title in-1">{game.title}</h1>
              <p className="hero__lead in-2">
                {h.ordinal > 1 ? `Sua ${h.ordinal}ª História com este jogo` : 'Sua primeira História com este jogo'}
                {nSessions ? `. ${nSessions} ${nSessions === 1 ? 'sessão' : 'sessões'} desde ${dayMonthYear(h.startedAt).replace(/ de \d{4}$/, '')}` : ''}.
              </p>
              <StopLine journeyId={j.id} slug={game.slug} className="hero__stop in-2" />
              {h.progress != null && (
                <div className="hero__progress in-2">
                  <div className="hline" aria-hidden="true"><i style={{ width: `${h.progress}%` }} /><b style={{ left: `${h.progress}%` }} /></div>
                  <div className="hero__progress-meta"><span>Seu progresso</span><span>{h.progress}% · informado por você</span></div>
                </div>
              )}
              {note?.note && (
                <figure className="hero__note in-3">
                  <blockquote className="quote">“{note.note}”</blockquote>
                  <figcaption className="kicker">Seu recado para a próxima sessão · {longDay(note.startedAt)}</figcaption>
                </figure>
              )}
              <div className="hero__actions in-3">
                <PlayButton gameId={game.id} />
                <Link className="btn ghost lg" to={`/jornada/${game.slug}`}>Abrir linha do tempo</Link>
              </div>
            </div>
            {wps[0]?.image && (
              <Link to={`/jornada/${game.slug}`} className="waypoint-card in-3">
                <span className="waypoint-card__paper">
                  <img src={wps[0].image} alt={`Ponto para voltar: ${wps[0].title}`} />
                  <span className="waypoint-card__cap">
                    <span className="kicker kicker--now">Ponto para voltar</span>
                    <span className="waypoint-card__title">Quero voltar aqui</span>
                    <span className="waypoint-card__text">{wps[0].title}{wps[0].text ? `, ${wps[0].text.replace(/\.$/, '')}` : ''}</span>
                  </span>
                </span>
                <span className="kicker waypoint-card__count">1 de {wps.length} {wps.length === 1 ? 'ponto' : 'pontos'} para voltar</span>
              </Link>
            )}
          </div>
        </section>
      ) : (
        <section className="page empty-hero">
          <p className="kicker kicker--now">{today}</p>
          <h1 className="t">Onde jogos viram histórias</h1>
          <p className="muted">Escolha um jogo e toque em Jogar. Sua primeira História começa sem formulário.</p>
          <div className="hero__actions"><Link className="btn primary lg" to="/colecao">Abrir sua estante</Link><Link className="btn ghost lg" to="/jogos">Buscar um jogo</Link></div>
        </section>
      )}

      <Horizon s={s} upcoming={upcoming} focusGame={game} nextSession={note?.note ? nSessions + 1 : undefined} />

      <div className="page home-cols">
        <section className="home-col" aria-labelledby="col-lembrar">
          <h2 id="col-lembrar" className="kicker home-col__head">Lembrar</h2>
          <AnniversaryCard />
          {memory && (
            <figure className="memory on-photo">
              {memory.image && <img src={memory.image} alt="" />}
              <figcaption>
                <span className="kicker kicker--now">{capitalize(ago(memory.at))}</span>
                {memory.quote && <div className="quote">“{memory.quote}”</div>}
                <div className="memory__meta">{memory.title}, {s.games[s.journeys.find((x) => x.id === memory.journeyId)?.gameId ?? '']?.title}, {dayMonthYear(memory.at)}</div>
              </figcaption>
            </figure>
          )}
          <WeekCard />
        </section>

        <section className="home-col" aria-labelledby="col-agora">
          <h2 id="col-agora" className="kicker kicker--now home-col__head">Agora</h2>
          {others.length > 0 && (
            <div className="also" aria-label="Também em andamento">
              {others.map(({ j: x, g, h: hh }) => (
                <Link key={x.id} to={`/jornada/${g.slug}`} className="also__item">
                  <span style={{ opacity: hh?.state === 'pausada' ? 0.7 : 1 }} className="also__cover"><CoverArt game={g} /></span>
                  <span className="also__body">
                    <span className="also__name">{g.title}</span>
                    {!!hh?.progress && hh.state !== 'pausada'
                      ? <span className="also__prog"><span className="hline hline--thin" aria-hidden="true"><i style={{ width: `${hh.progress}%` }} /></span><span className="mono">{hh.progress}%</span></span>
                      : <span className="muted also__meta">{hh?.state === 'pausada' ? (hh.note ?? x.pausedNote ?? 'Pausado. Ele espera.') : x.mood === 'silencioso' ? 'Jogando no modo silencioso.' : 'Jogando.'}</span>}
                  </span>
                </Link>
              ))}
              <Link to="/jornada" className="arrow-link">Todas as Jornadas →</Link>
            </div>
          )}
          <WhatToPlay excludeJourneyId={j?.id} />
        </section>

        <section className="home-col" aria-labelledby="col-proximo">
          <h2 id="col-proximo" className="kicker home-col__head">Próximo</h2>
          <NextRelease u={upcoming.find((u) => u.kind === 'lancamento')} />
          <RadarNotice />
          <AwardsNotice award={award} />
          <section className="card home-card" aria-labelledby="estante-home">
            <div className="home-card__head"><h3 id="estante-home" className="kicker">Sua estante</h3><span className="mono faint light-hide">{shelfCount} {shelfCount === 1 ? 'jogo' : 'jogos'} · {s.wishes.length} {s.wishes.length === 1 ? 'desejo' : 'desejos'}</span></div>
            <div className="aside-covers">
              {s.copies.slice(-4).reverse().map((c) => s.games[c.gameId] && (
                <Link key={c.id} to={`/jogos/${s.games[c.gameId].slug}`} aria-label={s.games[c.gameId].title}><CoverArt game={s.games[c.gameId]} platform={c.platform} /></Link>
              ))}
            </div>
            <Link to="/colecao" className="arrow-link">Abrir a estante →</Link>
          </section>
          {wish && !wishOnRadar && (
            <Link to={`/jogos/${wish.g.slug}`} className="card home-card aside-wish">
              <span className="aside-wish__cover"><CoverArt game={wish.g} /></span>
              <span>
                <span className="kicker">Nos seus desejos</span>
                <span className="t aside-wish__title">{wish.g.title}</span>
                {wish.w.note && <span className="muted aside-wish__note">{wish.w.note}</span>}
              </span>
            </Link>
          )}
        </section>
      </div>
    </main>
  );
}
