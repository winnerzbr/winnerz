/**
 * "Seu ano no WinnerZ" (dentro de Retrospectivas, /jornada/retrospectivas?p=ano-2026): a retrospectiva do ano em histórias (toque para avançar) e em números.
 * Privada: fica só com você. Sai só do que você registrou; horas só as informadas, e no modo leve sem números.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { yearReview, WEEKDAYS, type YearReview } from '../lib/yearReview';
import { CoverArt } from '../components/CoverArt';
import { Icon } from '../components/Icon';
import { durLabel, dayMonth } from '../lib/format';
import { track } from '../lib/track';
import { AnoCalendario, CartaoDoAno } from '../components/AnoMemoria';
import { useMyHandle } from '../components/Moderation';

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const SLIDE_MS = 7000;

type Slide = { key: string; bg?: string; body: ReactNode };

function buildSlides(r: YearReview, light: boolean): Slide[] {
  const out: Slide[] = [];
  const y = r.year;
  out.push({ key: 'capa', bg: r.top?.game.backdrop || r.moments.at(-1)?.image, body: (
    <><span className="kicker kicker--now">Retrospectiva{r.partial ? ' · até agora' : ''}</span><h2 className="t yrv__big">Seu {y} no WinnerZ</h2><p className="yrv__lead">Do jeito que você registrou. Sem placar, sem meta.</p></>
  ) });
  if (!r.sessions && !r.done.length && !r.started.length) {
    out.push({ key: 'vazio', body: <><h2 className="t yrv__mid">Um ano em branco também é um ano.</h2><p className="yrv__lead">Quando você registrar sessões, momentos e zerados, eles aparecem aqui.</p></> });
    return out;
  }
  if (!light && r.sessions) {
    const max = Math.max(1, ...r.months);
    out.push({ key: 'dias', body: (
      <><span className="kicker">Você jogou em</span><h2 className="t yrv__big">{plural(r.days, 'dia', 'dias')}</h2>
        <p className="yrv__lead">{plural(r.sessions, 'sessão registrada', 'sessões registradas')}{r.streak > 1 ? `, e ${r.streak} dias seguidos no seu melhor momento` : ''}.</p>
        <div className="yrv__months" aria-label="Sessões por mês">{r.months.map((n, i) => <span key={i} className={n === max ? 'is-top' : undefined}><i style={{ height: `${Math.max(4, (n / max) * 100)}%` }} /><b>{MONTHS[i]}</b></span>)}</div></>
    ) });
  }
  if (!light && r.minutes > 0) out.push({ key: 'horas', body: (
    <><span className="kicker">Tempo que você informou</span><h2 className="t yrv__big">{durLabel(r.minutes)}</h2>
      <p className="yrv__lead">Somando só {r.informed === 1 ? 'a sessão' : `as ${r.informed} sessões`} com tempo registrado{r.informed < r.sessions ? `, de ${r.sessions}` : ''}. Nada estimado.</p>
      {r.longest && <p className="yrv__small">A sessão mais longa: {durLabel(r.longest.minutes)} de {r.longest.game.title}, em {dayMonth(r.longest.at)}.</p>}</>
  ) });
  if (r.top) out.push({ key: 'top', bg: r.top.game.backdrop || undefined, body: (
    <><span className="kicker">O jogo do seu ano</span><span className="yrv__cover"><CoverArt game={r.top.game} /></span><h2 className="t yrv__mid">{r.top.game.title}</h2>
      {!light && <p className="yrv__lead">{plural(r.top.sessions, 'sessão', 'sessões')}{r.top.minutes ? `, ${durLabel(r.top.minutes)} informadas` : ''}.</p>}</>
  ) });
  if (r.done.length) out.push({ key: 'zerados', body: (
    <><span className="kicker kicker--now">Zerou</span><h2 className="t yrv__big yrv__gold">{light ? 'Fins de história' : plural(r.done.length, 'jogo', 'jogos')}</h2>
      <div className="yrv__covers">{r.done.slice(0, 8).map((d) => <span key={d.game.id + d.at}><CoverArt game={d.game} /></span>)}</div>
      <p className="yrv__small">{r.done.slice(0, 4).map((d) => `${d.game.title} (${dayMonth(d.at)})`).join(' · ')}{r.done.length > 4 ? ' …' : ''}</p></>
  ) });
  if (r.started.length || r.replays.length) out.push({ key: 'comecos', body: (
    <><span className="kicker">Começos</span><h2 className="t yrv__mid">{r.started.length ? `${light ? 'Você começou' : `Você começou ${plural(r.started.length, 'jogo novo', 'jogos novos')}`}` : 'E voltou para velhos conhecidos'}</h2>
      <div className="yrv__covers yrv__covers--sm">{[...r.started, ...r.replays].slice(0, 10).map((g, i) => <span key={g.id + i}><CoverArt game={g} /></span>)}</div>
      {r.replays.length > 0 && <p className="yrv__small">Jogou de novo: {r.replays.map((g) => g.title).join(', ')}.</p>}</>
  ) });
  if (r.moments.length || r.quote) out.push({ key: 'momentos', bg: r.moments[0]?.image, body: (
    <><span className="kicker">Momentos guardados</span>{!light && <h2 className="t yrv__big">{r.allMoments}</h2>}
      {r.moments.length > 0 && <div className="yrv__photos">{r.moments.slice(-6).map((e) => <img key={e.id} src={e.image} alt={e.title} />)}</div>}
      {r.quote && <blockquote className="yrv__quote">“{r.quote.text}”<small>{r.quote.game.title} · {dayMonth(r.quote.at)}</small></blockquote>}</>
  ) });
  if (!light && (r.weekday || r.part)) out.push({ key: 'ritmo', body: (
    <><span className="kicker">Seu ritmo</span><h2 className="t yrv__mid">{r.weekday ? `Seu dia: ${WEEKDAYS[r.weekday.day]}` : ''}{r.weekday && r.part ? ', ' : ''}{r.part ? `de ${r.part.part}` : ''}</h2>
      <p className="yrv__lead">Foi quando mais sessões começaram.{r.companions.length ? ` E teve companhia: ${r.companions.map((c) => c.name).join(', ')}.` : ''}</p></>
  ) });
  if (r.setAside.length) out.push({ key: 'lado', body: (
    <><span className="kicker">Deixou de lado</span><h2 className="t yrv__mid">{r.setAside.slice(0, 3).map((x) => x.game.title).join(', ')}</h2><p className="yrv__lead">Pausar ou largar também é escolher. Eles continuam na sua Jornada, do jeito que ficaram.</p></>
  ) });
  out.push({ key: 'fim', body: (
    <><span className="kicker kicker--now">{r.partial ? 'O ano ainda não acabou' : `Fim de ${y}`}</span><h2 className="t yrv__mid">Obrigado por contar a sua história.</h2>
      <p className="yrv__lead">{r.partial ? 'Volte em dezembro: o que você registrar até lá entra aqui.' : 'Que o próximo ano tenha bons começos e finais melhores ainda.'}</p></>
  ) });
  return out;
}

/** O ano dentro de Retrospectivas: em histórias (toque para avançar) ou em números. */
export function YearBody({ year }: { year: number }) {
  const s = useStore((x) => x);
  const r = useMemo(() => yearReview(s, year), [s, year]);
  const light = !!s.prefs.light;
  const reduced = s.prefs.motion === 'reduzidas' || (typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const slides = useMemo(() => buildSlides(r, light), [r, light]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(reduced);
  const [shown, setShown] = useState<'historias' | 'numeros'>('historias');
  const timer = useRef(0);
  useEffect(() => { track('jornada.ano'); }, [year]);
  useEffect(() => { setI(0); }, [year]);
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (paused || shown !== 'historias' || i >= slides.length - 1) return;
    timer.current = window.setTimeout(() => setI((x) => Math.min(slides.length - 1, x + 1)), SLIDE_MS);
    return () => window.clearTimeout(timer.current);
  }, [i, paused, shown, slides.length]);
  useEffect(() => {
    if (shown !== 'historias') return;
    const k = (e: KeyboardEvent) => { if (e.key === 'ArrowRight') setI((x) => Math.min(slides.length - 1, x + 1)); if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1)); if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [shown, slides.length]);
  const sl = slides[Math.min(i, slides.length - 1)];
  return (
    <div className="yrv">
      <div className="yrv__bar">
        <div className="seg seg--sm" role="tablist" aria-label="Como ver">
          <button role="tab" aria-selected={shown === 'historias'} aria-pressed={shown === 'historias'} onClick={() => setShown('historias')}>Histórias</button>
          <button role="tab" aria-selected={shown === 'numeros'} aria-pressed={shown === 'numeros'} onClick={() => setShown('numeros')}>Em números</button>
        </div>
      </div>
      {shown === 'historias' ? (
        <section className="yrv__stage on-photo" aria-roledescription="histórias" aria-label={`Seu ${year}`}>
          {sl.bg && <img className="yrv__bg" src={sl.bg} alt="" key={sl.key} />}
          <span className="yrv__shade" aria-hidden="true" />
          <div className="yrv__progress" aria-hidden="true">{slides.map((x, n) => <i key={n === i ? `${x.key}-${paused}` : x.key} className={n < i ? 'is-done' : n === i ? (paused ? 'is-now is-paused' : 'is-now') : undefined} style={n === i && !paused ? { animationDuration: `${SLIDE_MS}ms` } : undefined} />)}</div>
          <button className="yrv__pause icon-btn" aria-label={paused ? 'Continuar' : 'Pausar'} onClick={() => setPaused((p) => !p)}>{paused ? <Icon name="play" size={16} /> : <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>}</button>
          <div className="yrv__slide" key={sl.key} aria-live="polite">{sl.body}</div>
          <button className="yrv__nav yrv__nav--prev" aria-label="Anterior" disabled={i === 0} onClick={() => setI((x) => Math.max(0, x - 1))} />
          <button className="yrv__nav yrv__nav--next" aria-label="Próxima" disabled={i >= slides.length - 1} onClick={() => setI((x) => Math.min(slides.length - 1, x + 1))} />
          {i >= slides.length - 1 && <div className="yrv__end"><button className="btn primary sm" onClick={() => setShown('numeros')}>Ver em números</button><button className="btn ghost sm" onClick={() => setI(0)}>Ver de novo</button></div>}
        </section>
      ) : <Numbers r={r} light={light} />}
    </div>
  );
}

function Numbers({ r, light }: { r: YearReview; light: boolean }) {
  const s = useStore((x) => x);
  const handle = useMyHandle();
  const max = Math.max(1, ...r.months);
  const nums: [string, string][] = light ? [] : [
    [String(r.sessions), r.sessions === 1 ? 'sessão' : 'sessões'], [String(r.days), r.days === 1 ? 'dia de jogo' : 'dias de jogo'],
    [String(r.games.length), r.games.length === 1 ? 'jogo jogado' : 'jogos jogados'], [String(r.done.length), r.done.length === 1 ? 'zerado' : 'zerados'],
    [String(r.started.length), r.started.length === 1 ? 'começado' : 'começados'], [String(r.allMoments), r.allMoments === 1 ? 'momento' : 'momentos'],
    ...(r.minutes ? [[durLabel(r.minutes), 'informadas'] as [string, string]] : []), ...(r.streak > 1 ? [[String(r.streak), 'dias seguidos'] as [string, string]] : []),
    ...(r.copies ? [[String(r.copies), r.copies === 1 ? 'item na coleção' : 'itens na coleção'] as [string, string]] : []),
  ];
  return (
    <div className="yrv__nums">
      {nums.length > 0 && <dl className="season__stats">{nums.map(([n, l]) => <div key={l}><dd className="t">{n}</dd><dt>{l}</dt></div>)}</dl>}
      <AnoCalendario s={s} year={r.year} />
      {!light && r.sessions > 0 && <CartaoDoAno r={r} handle={handle} />}
      {!light && r.sessions > 0 && (
        <section className="card yrv__box"><h2 className="kicker">Sessões por mês</h2>
          <div className="yrv__months yrv__months--flat">{r.months.map((n, i) => <span key={i} className={n === max ? 'is-top' : undefined} title={`${n} em ${MONTHS[i]}`}><i style={{ height: `${Math.max(4, (n / max) * 100)}%` }} /><b>{MONTHS[i]}</b></span>)}</div>
        </section>
      )}
      <div className="season__grid">
        {r.games.length > 0 && (
          <section className="card season__box"><h2 className="kicker">Jogos do ano</h2>
            <ul className="season__games">{r.games.slice(0, 12).map((g) => <li key={g.game.id}><Link to={`/jornada/${g.game.slug}`}><CoverArt game={g.game} /></Link><span><b>{g.game.title}</b>{!light && <span className="muted">{plural(g.sessions, 'sessão', 'sessões')}{g.minutes ? ` · ${durLabel(g.minutes)}` : ''}</span>}</span></li>)}</ul>
          </section>
        )}
        <section className="card season__box"><h2 className="kicker">Marcos</h2>
          <ul className="season__marks">
            {r.first && <li>Primeira sessão: <b>{r.first.game.title}</b>, {dayMonth(r.first.at)}.</li>}
            {r.done.map((d) => <li key={`z-${d.game.id}-${d.at}`} className="season__gold">Zerou <b>{d.game.title}</b>, {dayMonth(d.at)}.</li>)}
            {r.replays.map((g, n) => <li key={`r-${g.id}-${n}`}>Jogou de novo <b>{g.title}</b>.</li>)}
            {r.setAside.map((x) => <li key={`l-${x.game.id}`}>{x.state === 'dropada' ? 'Largou' : 'Pausou'} <b>{x.game.title}</b>, sem culpa.</li>)}
            {!light && r.weekday && <li>Dia mais jogado: {WEEKDAYS[r.weekday.day]}{r.part ? `, de ${r.part.part}` : ''}.</li>}
            {r.companions.length > 0 && <li>Jogou com {r.companions.map((c) => c.name).join(', ')}.</li>}
            {r.last && <li>Última sessão: <b>{r.last.game.title}</b>, {dayMonth(r.last.at)}.</li>}
          </ul>
        </section>
      </div>
      {r.moments.length > 0 && (
        <section className="season__moments"><h2 className="kicker">Momentos com foto</h2>
          <div className="season__photos">{r.moments.map((e) => <figure key={e.id}><img src={e.image} alt="" loading="lazy" /><figcaption>{e.title}</figcaption></figure>)}</div>
        </section>
      )}
      <p className="faint">Calculado só com o que você registrou{!light && r.informed < r.sessions ? `; as horas contam só ${r.informed === 1 ? 'a sessão' : `as ${r.informed} sessões`} com tempo informado` : ''}. Datas aproximadas ficam de fora. Ninguém mais vê esta página.</p>
    </div>
  );
}
