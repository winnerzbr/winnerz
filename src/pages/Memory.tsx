import { NesteDia } from '../components/Lembrancas';
import { SuasNotas } from '../components/SuasNotas';
import { useEffect, useMemo, useState } from 'react';
import { PactList } from '../components/Pacts';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
import { LinhaMeses, meses } from '../components/LinhaMeses';
import { weekSummary, anniversaries, rhythm, globalTimeline, type GlobalItem } from '../lib/memory';
import { whenLabel } from '../lib/dates';
import { track } from '../lib/track';
import { FEATURES } from '../lib/features';

const plural = (n: number, one: string, many: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? one : many}`;
const hm = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}`);
const listPt = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs.at(-1)}`);

/** "Sua semana de jogo": um retrato dos últimos sete dias. Some quando a semana foi sem jogo, sem cobrar nada. */
export function WeekCard() {
  const s = useStore((x) => x);
  const w = useMemo(() => weekSummary(s), [s]);
  if (!w) return null;
  const light = !!s.prefs.light;
  const bits = [
    !light && w.sessions ? plural(w.sessions, 'sessão', 'sessões') : '',
    !light && w.moments ? plural(w.moments, 'momento guardado', 'momentos guardados') : '',
    !light && w.minutes ? `${hm(w.minutes)} informados` : '',
  ].filter(Boolean);
  return (
    <section className="card aside-card week-card" aria-labelledby="semana">
      <h2 id="semana" className="t">Sua semana de jogo</h2>
      {w.games.length > 0 && (
        <div className="week-card__covers">{w.games.slice(0, 4).map((g) => <Link key={g.id} to={`/jornada/${g.slug}`} aria-label={g.title}><CoverArt game={g} /></Link>)}</div>
      )}
      <p className="muted">
        {w.games.length ? `Você jogou ${listPt(w.games.slice(0, 3).map((g) => g.title))}${w.games.length > 3 ? ' e mais' : ''}.` : 'Uma semana de registros.'}
        {bits.length ? ` ${bits.join(', ')}.` : ''}
        {w.companions.length ? ` Com ${listPt(w.companions.slice(0, 3))}.` : ''}
        {w.finished.length ? ` E zerou ${listPt(w.finished.map((g) => g.title))}!` : ''}
      </p>
      <Link to="/jornada/retrospectivas" className="btn ghost sm">Ver as retrospectivas</Link>
    </section>
  );
}

/** Aniversários de Histórias: "Há um ano você zerou…". Só com data de dia exato. */
export function AnniversaryCard() {
  const s = useStore((x) => x);
  const list = useMemo(() => anniversaries(s), [s]);
  const a = list[0];
  if (!a) return null;
  const years = a.years === 1 ? 'um ano' : `${a.years} anos`;
  return (
    <section className="card aside-card anniversary" aria-labelledby="aniv">
      <div className="anniversary__k">Aniversário</div>
      <Link to={`/jornada/${a.game.slug}`} className="anniversary__body">
        <span className="anniversary__cover"><CoverArt game={a.game} /></span>
        <span>
          <h2 id="aniv" className="t">Há {years}</h2>
          <span className="muted">{a.kind === 'zerou' ? `você zerou ${a.game.title}` : `você começou ${a.game.title}`}, em {whenLabel(a.at, 'dia')}.</span>
        </span>
      </Link>
      {list.length > 1 && <p className="faint">E mais {list.length - 1} {list.length === 2 ? 'aniversário' : 'aniversários'} nestes dias.</p>}
    </section>
  );
}

/** Linha do tempo geral: todas as Jornadas e as chegadas à coleção num fio só. */
export function GlobalTimelinePage() {
  const s = useStore((x) => x);
  const all = useMemo(() => globalTimeline(s), [s]);
  const [kind, setKind] = useState<'tudo' | 'momentos' | 'jornada' | 'colecao'>('tudo');
  useEffect(() => { track('jornada.linha-geral'); }, []);
  const ehMomento = (x: GlobalItem) => x.kind === 'jornada' && (x.ev === 'momento' || x.ev === 'marco' || x.ev === 'inicio' || !!x.image);
  const list = useMemo(() => all.filter((x) => kind === 'tudo' || (kind === 'momentos' ? ehMomento(x) : x.kind === kind)), [all, kind]);
  const porMes = useMemo(() => meses(list), [list]);
  const semData = list.filter((x) => x.precision === 'desconhecida');
  const light = !!s.prefs.light;
  const reduced = s.prefs.motion === 'reduzidas' || (typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const nJogos = new Set(all.filter((x) => x.kind === 'jornada' && x.game).map((x) => x.game!.id)).size;
  const nMomentos = all.filter(ehMomento).length;

  return (
    <main className="page pad gtl">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Linha do tempo</h1>
          <p className="muted lead">Tudo o que você viveu jogando, mês a mês.{nJogos ? ` ${plural(nJogos, 'jogo', 'jogos')} com Jornada` : ''}{nMomentos ? ` · ${plural(nMomentos, 'momento', 'momentos')}` : ''}{nJogos || nMomentos ? '.' : ''}</p>
        </div>
        <SubNav pillar="jornada" />
      </header>
      <NesteDia />
      <div className="chips gtl__filter" role="group" aria-label="Mostrar">
        {([['tudo', 'Tudo'], ['momentos', 'Só momentos'], ['jornada', 'Jornadas'], ['colecao', 'Coleção']] as const).map(([k, l]) => <button key={k} className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}
      </div>
      {!list.length && <div className="card tl-empty"><p className="muted">Nada por aqui ainda. Comece uma Jornada ou adicione um jogo à estante.</p></div>}
      {porMes.length > 0 && <LinhaMeses key={kind} meses={porMes} reduced={reduced} light={light} />}
      {semData.length > 0 && (
        <details className="card gtl__sem">
          <summary><span className="kicker">Sem data</span><span>{plural(semData.length, 'registro', 'registros')}</span></summary>
          <ol className="gtl__list">
            {semData.map((it) => (
              <li key={it.id}>
                <Link to={it.to ?? '#'} className="gev">
                  <span className="mono gev__d">—</span>
                  {it.image ? <img className="gev__th" src={it.image} alt="" loading="lazy" /> : it.game ? <span className="gev__cover"><CoverArt game={it.game} /></span> : <span className="gev__none" aria-hidden="true" />}
                  <span className="gev__b"><span className="gev__t">{it.title}</span><span className="gev__g">{[it.kind === 'jornada' ? it.game?.title : null, it.text].filter(Boolean).join(' · ')}</span></span>
                  <span className="mono gev__k">{it.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </details>
      )}
    </main>
  );
}

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const PERIODS = ['Madrugada', 'Manhã', 'Tarde', 'Noite'];
export const PERIOD_PHRASE: Record<string, string> = { Madrugada: 'de madrugada', Manhã: 'de manhã', Tarde: 'à tarde', Noite: 'à noite' };
export const DAY_NAME: Record<string, string> = { Dom: 'domingo', Seg: 'segunda-feira', Ter: 'terça-feira', Qua: 'quarta-feira', Qui: 'quinta-feira', Sex: 'sexta-feira', Sáb: 'sábado' };

export function Bars({ values, labels, label, top }: { values: number[]; labels: string[]; label: string; top?: boolean }) {
  const max = Math.max(1, ...values);
  const hi = values.indexOf(Math.max(...values));
  return (
    <div className={`rbars${values.length > 8 ? ' rbars--many' : ''}`} role="img" aria-label={label}>
      {values.map((n, i) => (
        <div key={i} className={`rbars__col${n === 0 ? ' is-empty' : ''}${top !== false && n > 0 && i === hi ? ' is-top' : ''}`}>
          <i style={{ height: n ? `${(n / max) * 100}%` : undefined }} title={plural(n, 'sessão', 'sessões')} />
          <span className="mono" data-short={labels[i].split(' ')[0].slice(0, 1)}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

/** "Desde o começo" em Retrospectivas (antes Meu ritmo): como você costuma jogar, pelos seus próprios registros. Sem meta, sem streak, sem comparação. */
export function RhythmBody() {
  const s = useStore((x) => x);
  const r = useMemo(() => rhythm(s), [s]);
  const totalWd = r.byWeekday.reduce((a, b) => a + b, 0) || 1, totalP = r.byPeriod.reduce((a, b) => a + b, 0) || 1;
  const topWdI = r.byWeekday.indexOf(Math.max(...r.byWeekday)), topPI = r.byPeriod.indexOf(Math.max(...r.byPeriod));
  const topWd = r.sessions ? WEEKDAYS[topWdI] : '';
  const topP = r.sessions ? PERIODS[topPI] : '';
  const light = !!s.prefs.light;
  return (
    <div className="rhythm">
      {r.sessions < 3 ? (
        <div className="card tl-empty"><p className="muted">Ainda há poucas sessões registradas para mostrar um ritmo. Ele aparece aqui sozinho, com o tempo.</p></div>
      ) : (
        <>
          <section className="rhythm__intro">
            <p className="rhythm__lead">
              Você joga mais <em>{PERIOD_PHRASE[topP]}</em>, e {topWd === 'Sáb' || topWd === 'Dom' ? 'o' : 'a'} <em>{DAY_NAME[topWd]}</em> é o seu dia.
              {r.medianMinutes != null && !light ? <> Uma sessão sua dura por volta de <b>{hm(Math.round(r.medianMinutes))}</b>.</> : null}
              {r.medianDaysToFinish != null && !light ? <> Entre começar e zerar, costuma passar <b>{plural(Math.round(r.medianDaysToFinish), 'dia', 'dias')}</b>.</> : null}
              {r.parallel != null && r.parallel > 1 ? <> Nos meses em que joga, você costuma ter <b>{String(r.parallel).replace('.', ',')} jogos</b> em andamento.</> : null}
            </p>
            <p className="kicker">Calculado só com o que você registrou{r.medianMinutes != null && !light ? ` · duração de ${plural(r.informedSessions, 'sessão informada', 'sessões informadas')}` : ''}. Não é meta nem placar.</p>
          </section>
          <div className="rhythm__grid">
            <section className="card rhythm__card" aria-labelledby="rw">
              <div className="rhythm__head"><h2 id="rw" className="kicker">Dias da semana</h2><span className="mono rhythm__top">{topWd} · {Math.round((r.byWeekday[topWdI] / totalWd) * 100)}%</span></div>
              <Bars values={r.byWeekday} labels={WEEKDAYS} label={`Sessões por dia da semana; ${DAY_NAME[topWd]} é o maior`} />
            </section>
            <section className="card rhythm__card" aria-labelledby="rp">
              <div className="rhythm__head"><h2 id="rp" className="kicker">Hora do dia</h2><span className="mono rhythm__top">{PERIOD_PHRASE[topP]} · {Math.round((r.byPeriod[topPI] / totalP) * 100)}%</span></div>
              <Bars values={r.byPeriod} labels={PERIODS} label={`Sessões por período; ${PERIOD_PHRASE[topP]} é o maior`} />
            </section>
            <section className="card rhythm__card rhythm__card--wide" aria-labelledby="rm">
              <div className="rhythm__head"><h2 id="rm" className="kicker">Últimos 12 meses</h2><span className="muted">Meses vazios são só meses. Jogar menos também é jogar.</span></div>
              <Bars values={r.months.map((m) => m.count)} labels={r.months.map((m) => m.label)} label="Sessões nos últimos 12 meses" />
            </section>
            <SuasNotas />
            {r.companions.length > 0 && (
              <section className="card rhythm__card rhythm__card--wide" aria-labelledby="rc">
                <div className="rhythm__head"><h2 id="rc" className="kicker">Com quem você jogou</h2></div>
                <ul className="rhythm__who">{r.companions.map((c) => <li key={c.name}><strong>{c.name}</strong><span className="mono">{light ? `${plural(c.games, 'jogo', 'jogos')} juntos` : `${plural(c.sessions, 'sessão', 'sessões')} · ${plural(c.games, 'jogo', 'jogos')}`}</span></li>)}</ul>
              </section>
            )}
          </div>
        </>
      )}
      {FEATURES.pactos && <PactList />}
    </div>
  );
}
