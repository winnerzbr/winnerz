import { useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
import { weekSummary, anniversaries, rhythm, globalTimeline, type GlobalItem } from '../lib/memory';
import { whenLabel } from '../lib/dates';
import { track } from '../lib/track';

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
      <Link to="/jornada/ritmo" className="btn ghost sm">Ver o seu ritmo</Link>
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
  const [kind, setKind] = useState<'tudo' | 'jornada' | 'colecao'>('tudo');
  const [limit, setLimit] = useState(80);
  useEffect(() => { track('jornada.linha-geral'); }, []);
  const list = all.filter((x) => kind === 'tudo' || x.kind === kind);
  const shown = list.slice(0, limit);
  const groups: { key: string; items: GlobalItem[] }[] = [];
  for (const it of shown) {
    const d = new Date(it.at);
    const raw = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
    const key = it.precision === 'desconhecida' ? 'Sem data' : it.precision === 'ano' ? String(d.getFullYear()) : raw.charAt(0).toUpperCase() + raw.slice(1);
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(it); else groups.push({ key, items: [it] });
  }
  return (
    <main className="page pad gtl">
      <SubNav pillar="jornada" />
      <h1 className="t big">Linha do tempo</h1>
      <p className="muted lead">Todas as suas Jornadas e o que chegou à coleção, num fio só, do mais recente ao mais antigo.</p>
      <div className="seg" role="group" aria-label="Mostrar">
        {([['tudo', 'Tudo'], ['jornada', 'Jornadas'], ['colecao', 'Coleção']] as const).map(([k, l]) => <button key={k} aria-pressed={kind === k} onClick={() => { setKind(k); setLimit(80); }}>{l}</button>)}
      </div>
      {!list.length && <div className="card tl-empty"><p className="muted">Nada por aqui ainda. Comece uma Jornada ou adicione um jogo à estante.</p></div>}
      {groups.map((gr) => (
        <section key={gr.key} className="gtl__month" aria-label={gr.key}>
          <h2 className="t gtl__h">{gr.key}</h2>
          <ol className="gtl__list">
            {gr.items.map((it) => (
              <li key={it.id} className={`gtl__item gtl__item--${it.kind}`}>
                <span className="gtl__dot" aria-hidden="true" />
                <Link to={it.to ?? '#'} className="gtl__card">
                  {it.image ? <img className="gtl__img" src={it.image} alt="" loading="lazy" /> : it.game ? <span className="gtl__cover"><CoverArt game={it.game} /></span> : null}
                  <span className="gtl__text">
                    <span className="gtl__meta"><span className="gtl__label">{it.label}</span>{it.game && it.kind === 'jornada' ? ` · ${it.game.title}` : ''} · {whenLabel(it.at, (it.precision as never) ?? 'dia', { short: true })}</span>
                    <strong>{it.title}</strong>
                    {it.text && <span className="muted">{it.text}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {limit < list.length && <button className="btn ghost" onClick={() => setLimit(limit + 120)}>Mostrar mais ({list.length - limit})</button>}
    </main>
  );
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PERIODS = ['Madrugada', 'Manhã', 'Tarde', 'Noite'];

/** Meu ritmo: como você costuma jogar, pelos seus próprios registros. Sem meta, sem streak, sem comparação. */
export function RhythmPage() {
  const s = useStore((x) => x);
  const r = useMemo(() => rhythm(s), [s]);
  useEffect(() => { track('jornada.ritmo'); }, []);
  const maxWd = Math.max(1, ...r.byWeekday), maxP = Math.max(1, ...r.byPeriod), maxM = Math.max(1, ...r.months.map((m) => m.count));
  const topWd = r.sessions ? WEEKDAYS[r.byWeekday.indexOf(Math.max(...r.byWeekday))] : '';
  const topP = r.sessions ? PERIODS[r.byPeriod.indexOf(Math.max(...r.byPeriod))] : '';
  const light = !!s.prefs.light;
  return (
    <main className="page pad rhythm">
      <SubNav pillar="jornada" />
      <h1 className="t big">Meu ritmo</h1>
      <p className="muted lead">Como você costuma jogar, pelo que você registrou. Não é meta nem placar: é só um espelho.</p>
      {r.sessions < 3 ? (
        <div className="card tl-empty"><p className="muted">Ainda há poucas sessões registradas para mostrar um ritmo. Ele aparece aqui sozinho, com o tempo.</p></div>
      ) : (
        <>
          <p className="rhythm__lead">
            Você costuma jogar <strong>{({ Madrugada: 'de madrugada', Manhã: 'de manhã', Tarde: 'à tarde', Noite: 'à noite' } as Record<string, string>)[topP]}</strong>, e {topWd === 'Sáb' || topWd === 'Dom' ? 'no' : 'na'} <strong>{({ Dom: 'domingo', Seg: 'segunda', Ter: 'terça', Qua: 'quarta', Qui: 'quinta', Sex: 'sexta', Sáb: 'sábado' } as Record<string, string>)[topWd]}</strong> aparece mais vezes.
            {r.medianMinutes != null && !light ? ` Uma sessão sua dura por volta de ${hm(Math.round(r.medianMinutes))} (em ${plural(r.informedSessions, 'sessão', 'sessões')} com tempo informado).` : ''}
            {r.medianDaysToFinish != null && !light ? ` Entre começar e zerar, costuma passar ${plural(Math.round(r.medianDaysToFinish), 'dia', 'dias')}.` : ''}
            {r.parallel != null && r.parallel > 1 ? ` Nos meses em que joga, você costuma ter ${String(r.parallel).replace('.', ',')} jogos em andamento.` : ''}
          </p>
          <div className="rhythm__grid">
            <section className="card rhythm__card" aria-labelledby="rw">
              <h2 id="rw" className="t">Dias da semana</h2>
              <div className="bars">{r.byWeekday.map((n, i) => <div key={i} className="bars__col"><span className="bars__bar" style={{ height: `${(n / maxWd) * 100}%` }} title={plural(n, 'sessão', 'sessões')} /><span className="bars__l">{WEEKDAYS[i]}</span></div>)}</div>
            </section>
            <section className="card rhythm__card" aria-labelledby="rp">
              <h2 id="rp" className="t">Hora do dia</h2>
              <div className="bars">{r.byPeriod.map((n, i) => <div key={i} className="bars__col"><span className="bars__bar" style={{ height: `${(n / maxP) * 100}%` }} title={plural(n, 'sessão', 'sessões')} /><span className="bars__l">{PERIODS[i]}</span></div>)}</div>
            </section>
            <section className="card rhythm__card rhythm__card--wide" aria-labelledby="rm">
              <h2 id="rm" className="t">Últimos 12 meses</h2>
              <div className="bars bars--months">{r.months.map((m, i) => <div key={i} className="bars__col"><span className="bars__bar" style={{ height: `${(m.count / maxM) * 100}%` }} title={plural(m.count, 'sessão', 'sessões')} /><span className="bars__l">{m.label}</span></div>)}</div>
              <p className="faint">Meses vazios são só meses. Jogar menos também é jogar.</p>
            </section>
            {r.companions.length > 0 && (
              <section className="card rhythm__card rhythm__card--wide" aria-labelledby="rc">
                <h2 id="rc" className="t">Com quem você jogou</h2>
                <ul className="rhythm__who">{r.companions.map((c) => <li key={c.name}><strong>{c.name}</strong><span className="muted">{light ? `${plural(c.games, 'jogo', 'jogos')} juntos` : `${plural(c.sessions, 'sessão', 'sessões')}, ${plural(c.games, 'jogo', 'jogos')}`}</span></li>)}</ul>
              </section>
            )}
          </div>
        </>
      )}
    </main>
  );
}
