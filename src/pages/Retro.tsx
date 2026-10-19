/**
 * Retrospectivas (/jornada/retrospectivas), Etapa 3 da revisão: uma página só no lugar de Meu ritmo, Seu ano e
 * Temporadas. Escolha o período (este mês, o anterior, uma temporada, um ano ou desde o começo) e veja os mesmos
 * números para ele. Só você vê; sai do que você registrou, horas só as informadas.
 */
import { useEffect, useMemo, useState } from 'react';
import { navigate, usePath } from '../lib/router';
import { useStore } from '../data/store';
import { SubNav } from '../components/SubNav';
import { Icon } from '../components/Icon';
import { SeasonBody, SeasonSheet } from '../components/Seasons';
import { MonthRestCard } from '../components/Rest';
import { YearBody } from './YearReview';
import { RhythmBody, Bars, WEEKDAYS, PERIODS, PERIOD_PHRASE, DAY_NAME } from './Memory';
import { autoSeasons, monthKeys, monthSeason, periodRhythm, seasonById, seasonRange, seasonStats, type Season } from '../lib/seasons';
import { reviewYears } from '../lib/yearReview';
import { track } from '../lib/track';

type Period =
  | { kind: 'mes'; key: string; season: Season }
  | { kind: 'temporada'; season: Season }
  | { kind: 'ano'; year: number }
  | { kind: 'sempre' };

/** Em dezembro a página abre no ano; no resto do tempo, no mês. */
export function defaultPeriod(now = new Date()): string {
  const { current } = monthKeys(now);
  return current.endsWith('-12') ? `ano-${current.slice(0, 4)}` : 'mes';
}

function resolve(p: string, custom: { id: string; name: string; from: string; to: string }[], now: Date): Period | null {
  const { current, previous } = monthKeys(now);
  if (p === 'mes') return { kind: 'mes', key: current, season: monthSeason(current) };
  if (p === 'mes-anterior') return { kind: 'mes', key: previous, season: monthSeason(previous) };
  const m = /^mes-(\d{4}-\d{2})$/.exec(p);
  if (m) return { kind: 'mes', key: m[1], season: monthSeason(m[1]) };
  const y = /^ano-(\d{4})$/.exec(p);
  if (y) return { kind: 'ano', year: Number(y[1]) };
  if (p === 'sempre') return { kind: 'sempre' };
  const season = seasonById(p, custom, now);
  return season ? { kind: 'temporada', season } : null;
}

export function RetroPage() {
  const s = useStore((x) => x);
  const path = usePath();
  const now = useMemo(() => new Date(), []);
  const custom = s.prefs.seasons ?? [];
  const q = new URLSearchParams(path.split('?')[1] ?? '');
  const p = q.get('p') ?? defaultPeriod(now);
  const period = resolve(p, custom, now) ?? resolve('mes', custom, now)!;
  const [creating, setCreating] = useState(false);
  const years = useMemo(() => reviewYears(s, now), [s, now]);
  const { current, previous } = monthKeys(now);
  // Temporadas: as suas primeiro; das estações, a de agora e as que tiveram sessão.
  const seasons = useMemo(() => {
    const mine: Season[] = custom.map((c) => ({ ...c, auto: false })).sort((a, b) => b.from.localeCompare(a.from));
    const autos = autoSeasons(now, 4).filter((x, i) => i === 0 || seasonStats(s, x).sessions > 0);
    return [...mine, ...autos];
  }, [custom, s, now]);
  useEffect(() => { document.title = 'Retrospectivas · WinnerZ'; }, []);
  useEffect(() => { track('jornada.retro'); }, []);
  useEffect(() => { track(`jornada.retro.${period.kind}`); }, [period.kind]);

  const go = (k: string) => navigate(`/jornada/retrospectivas?p=${encodeURIComponent(k)}`, { replace: true, keepScroll: true });
  const on = (k: string) => p === k || (k === 'mes' && period.kind === 'mes' && period.key === current) || (k === 'mes-anterior' && period.kind === 'mes' && period.key === previous);

  const title = period.kind === 'mes' ? period.season.name : period.kind === 'temporada' ? period.season.name : period.kind === 'ano' ? `Seu ${period.year}` : 'Desde o começo';
  const kicker = period.kind === 'mes' ? (period.key === current ? 'Este mês' : 'Mês') : period.kind === 'temporada' ? (period.season.auto ? 'Estação do ano' : 'Sua temporada') : period.kind === 'ano' ? 'Ano' : 'Seu jeito de jogar';
  const range = period.kind === 'mes' || period.kind === 'temporada' ? seasonRange(period.season, now) : period.kind === 'ano' ? (period.year === now.getFullYear() ? 'Até agora. Em dezembro, a retrospectiva completa.' : `De janeiro a dezembro de ${period.year}`) : 'Todas as sessões que você registrou';

  return (
    <main className="page pad retro">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Retrospectivas</h1>
          <p className="muted lead">Só você vê. Sai do que você registrou; horas só as que você informou. Não é meta nem placar.</p>
        </div>
        <SubNav pillar="jornada" />
      </header>

      <nav className="retro__pick" aria-label="Escolher o período">
        <div className="retro__group">
          <span className="kicker">Mês</span>
          <div className="chips">
            <button className="chip" aria-pressed={on('mes')} onClick={() => go('mes')}>Este mês</button>
            <button className="chip" aria-pressed={on('mes-anterior')} onClick={() => go('mes-anterior')}>{monthSeason(previous).name.split(' de ')[0]}</button>
          </div>
        </div>
        <div className="retro__group">
          <span className="kicker">Temporadas</span>
          <div className="chips">
            {seasons.map((x) => <button key={x.id} className="chip" aria-pressed={p === x.id} onClick={() => go(x.id)}>{x.name}</button>)}
            <button className="chip retro__new" onClick={() => setCreating(true)}><Icon name="mais" size={13} />Criar</button>
          </div>
        </div>
        <div className="retro__group">
          <span className="kicker">Ano</span>
          <div className="chips">{years.map((y) => <button key={y} className="chip" aria-pressed={p === `ano-${y}`} onClick={() => go(`ano-${y}`)}>{y}</button>)}</div>
        </div>
        <div className="retro__group">
          <span className="kicker">Tudo</span>
          <div className="chips"><button className="chip" aria-pressed={p === 'sempre'} onClick={() => go('sempre')}>Desde o começo</button></div>
        </div>
      </nav>

      <section className="retro__period" aria-labelledby="retro-t">
        <div className="retro__head">
          <span className="kicker kicker--now">{kicker}</span>
          <h2 id="retro-t" className="t retro__title">{title}</h2>
          <p className="muted">{range}</p>
        </div>
        {period.kind === 'ano' ? <YearBody key={period.year} year={period.year} />
          : period.kind === 'sempre' ? <RhythmBody />
          : (
            <>
              <SeasonBody key={period.season.id} season={period.season} extra={<PeriodRhythm season={period.season} />} />
              {period.kind === 'mes' && <MonthRestCard month={period.key} />}
            </>
          )}
      </section>
      {creating && <SeasonSheet onClose={() => setCreating(false)} />}
    </main>
  );
}

/** Dias da semana e hora do dia, só das sessões do período. Aparece a partir de três sessões. */
function PeriodRhythm({ season }: { season: Season }) {
  const s = useStore((x) => x);
  const r = useMemo(() => periodRhythm(s, season), [s, season.id, season.from, season.to]); // eslint-disable-line react-hooks/exhaustive-deps
  if (r.sessions < 3 || s.prefs.light) return null;
  const wdI = r.byWeekday.indexOf(Math.max(...r.byWeekday));
  const pI = r.byPeriod.indexOf(Math.max(...r.byPeriod));
  return (
    <div className="rhythm__grid retro__rhythm">
      <section className="card rhythm__card" aria-labelledby="pr-w">
        <div className="rhythm__head"><h3 id="pr-w" className="kicker">Dias da semana</h3><span className="mono rhythm__top">{WEEKDAYS[wdI]} · {Math.round((r.byWeekday[wdI] / r.sessions) * 100)}%</span></div>
        <Bars values={r.byWeekday} labels={WEEKDAYS} label={`Sessões por dia da semana; ${DAY_NAME[WEEKDAYS[wdI]]} é o maior`} />
      </section>
      <section className="card rhythm__card" aria-labelledby="pr-p">
        <div className="rhythm__head"><h3 id="pr-p" className="kicker">Hora do dia</h3><span className="mono rhythm__top">{PERIOD_PHRASE[PERIODS[pI]]} · {Math.round((r.byPeriod[pI] / r.sessions) * 100)}%</span></div>
        <Bars values={r.byPeriod} labels={PERIODS} label={`Sessões por período; ${PERIOD_PHRASE[PERIODS[pI]]} é o maior`} />
      </section>
    </div>
  );
}
