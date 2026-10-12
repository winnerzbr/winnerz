import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, useStore, historiesOf, currentHistory, eventsOf, sessionsOf, lastNote, lastSession, activeWaypoints, openSession } from '../data/store';
import type { TimelineEvent, EventKind, History } from '../data/types';
import { Icon, Compass } from '../components/Icon';
import { Celebration, SealedLetter, PersonalSticker } from '../components/Celebration';
import { dayMonth, dayMonthYear, gapLabel, hourMin, longDay, shortDate } from '../lib/format';

type StopKind = EventKind | 'agora';
interface Stop { id: string; kind: StopKind | 'gap'; hist: number; date: string; title: string; text?: string; quote?: string; image?: string; eventId?: string; resolved?: boolean }

const LABELS: Record<string, string> = { inicio: 'Início de História', sessao: 'Sessão', momento: 'Momento guardado', ponto: 'Quero voltar aqui', marco: 'Marco', carta: 'Carta para o futuro', agora: 'Agora' };
const FILTERS: [string, string, StopKind[] | null][] = [
  ['tudo', 'Tudo', null], ['sessao', 'Sessões', ['sessao', 'agora']], ['momento', 'Momentos', ['momento', 'carta']],
  ['ponto', 'Pontos para voltar', ['ponto']], ['marco', 'Marcos', ['inicio', 'marco']],
];

export function JourneyPage({ slug }: { slug: string }) {
  const s = useStore((x) => x);
  const game = Object.values(s.games).find((g) => g.slug === slug);
  const journey = game ? s.journeys.find((j) => j.gameId === game.id) : undefined;

  if (!game) return <main className="page pad"><h1 className="t big">Jogo não encontrado</h1><Link to="/jornada">Voltar para as Jornadas</Link></main>;
  if (!journey) {
    return (
      <main className="page pad">
        <p className="muted">Minha Jornada em</p>
        <h1 className="t big">{game.title}</h1>
        <p className="muted">Você ainda não tem uma História com este jogo. Começar é um toque, sem formulário.</p>
        <button className="btn primary lg" onClick={() => { actions.play(game.id); navigate('/sessao'); }}><Icon name="play" size={16} />Jogar agora</button>
      </main>
    );
  }
  return <JourneyView journeyId={journey.id} />;
}

function JourneyView({ journeyId }: { journeyId: string }) {
  const s = useStore((x) => x);
  const journey = s.journeys.find((j) => j.id === journeyId)!;
  const game = s.games[journey.gameId];
  const histories = historiesOf(s, journeyId);
  const current = currentHistory(s, journeyId)!;
  const events = eventsOf(s, journeyId);
  const open = openSession(s);
  const openHere = open && open.journeyId === journeyId ? open : null;
  const note = lastNote(s, journeyId);
  const last = lastSession(s, journeyId);
  const waypoints = activeWaypoints(s, journeyId);
  const totalSessions = s.sessions.filter((x) => x.journeyId === journeyId).length + events.filter((e) => e.kind === 'sessao' && !e.sessionId).reduce((n, e) => n + (parseInt(e.title) || 0), 0);
  const moments = events.filter((e) => e.kind === 'momento').length;

  const [mode, setMode] = useState<'cinema' | 'simples'>(() => (s.prefs.motion === 'reduzidas' ? 'simples' : 'cinema'));
  const [filter, setFilter] = useState('tudo');
  const [full, setFull] = useState(false);
  const [celebrating, setCelebrating] = useState<History | null>(null);
  const [saved, setSaved] = useState(0);
  const [progress, setProgress] = useState(current.progress ?? 0);
  useEffect(() => setProgress(current.progress ?? 0), [current.id, current.progress]);

  const stops: Stop[] = useMemo(() => {
    const hIndex = Object.fromEntries(histories.map((h) => [h.id, h.ordinal]));
    const out: Stop[] = [];
    let prev: TimelineEvent | null = null;
    for (const e of events) {
      if (prev) {
        const gap = gapLabel(prev.at, e.at);
        if (gap) out.push({ id: `gap-${e.id}`, kind: 'gap', hist: 0, date: '', title: gap });
      }
      out.push({ id: e.id, eventId: e.id, kind: e.kind, hist: hIndex[e.historyId] ?? 1, date: e.dateLabel ?? shortDate(e.at), title: e.title, text: e.text, quote: e.quote, image: e.image, resolved: e.resolved });
      prev = e;
    }
    if (openHere) {
      const n = sessionsOf(s, openHere.historyId).length;
      const lastImg = [...events].reverse().find((e) => e.image)?.image ?? game.backdrop;
      out.push({ id: 'agora', kind: 'agora', hist: hIndex[openHere.historyId] ?? current.ordinal, date: `hoje, ${hourMin(openHere.startedAt)}`, title: `Sessão ${n} aberta`, text: 'O caminho continua. Registre o que quiser, quando quiser.', image: lastImg });
    }
    return out;
  }, [events, histories, openHere, s, game.backdrop, current.ordinal]);

  const groups = FILTERS.find((f) => f[0] === filter)![2];
  const visible = stops.filter((x) => (groups ? x.kind !== 'gap' && groups.includes(x.kind as StopKind) : true));

  const commitProgress = (v: number) => { actions.setProgress(current.id, v); setSaved((n) => n + 1); };

  const zerei = () => {
    const h = current;
    actions.completeHistory(h.id);
    setCelebrating({ ...h });
  };

  const stickerImage = [...events].reverse().find((e) => e.image)?.image ?? game.backdrop ?? game.cover;

  // Botão de jogar: abre a sessão deste jogo, ou leva à sessão já aberta (nunca troca uma sessão em silêncio).
  const otherOpen = open && !openHere ? s.games[s.journeys.find((x) => x.id === open.journeyId)?.gameId ?? ''] : null;
  const playCta: PlayCta = openHere
    ? { label: 'Voltar para a sessão', now: true, onClick: () => navigate('/sessao') }
    : otherOpen
      ? { label: `Sessão aberta em ${otherOpen.title}`, now: true, onClick: () => navigate('/sessao'), hint: 'Finalize aquela sessão para começar uma aqui.' }
      : { label: current.state === 'concluida' ? 'Jogar de novo' : 'Jogar agora', now: false, onClick: () => { actions.play(game.id); navigate('/sessao'); } };

  return (
    <main className="page journey">
      <Link to="/jornada" className="back-link">Todas as Jornadas</Link>
      <div className="journey__head">
        <div className="journey__title">
          <Link to={`/jogos/${game.slug}`}><img src={game.cover} alt="Abrir a ficha do jogo" /></Link>
          <div>
            <p className="muted">Minha Jornada em</p>
            <h1 className="t">{game.title}</h1>
          </div>
        </div>
        <div className="journey__side">
          <dl className="journey__stats">
            <div><dt>Histórias</dt><dd className="t">{histories.length}</dd></div>
            <div><dt>Sessões</dt><dd className="t">{totalSessions}</dd></div>
            <div><dt>Momentos</dt><dd className="t">{moments}</dd></div>
            <div><dt>Para voltar</dt><dd className="t">{waypoints.length}</dd></div>
          </dl>
          <div className="journey__cta">
            <button className={`btn lg ${playCta.now ? 'now' : 'primary'}`} onClick={playCta.onClick}>
              {playCta.now ? <span className="session-pill__dot" aria-hidden="true" /> : <Icon name="play" size={15} />}{playCta.label}
            </button>
            {playCta.hint && <p className="faint">{playCta.hint}</p>}
          </div>
        </div>
      </div>

      {current.state !== 'concluida' ? (
        <section className="card progress-card" aria-labelledby="prog-label">
          <div className="progress-card__value">
            <div className="t">{progress}%</div>
            <div className="progress-card__saved" aria-live="polite">{saved > 0 && <span key={saved} className="ok-flash">Progresso salvo</span>}</div>
          </div>
          <div className="progress-card__slider">
            <label id="prog-label" htmlFor="prog">Seu progresso {current.ordinal > 1 ? `na ${current.title}` : 'nesta História'}</label>
            <input id="prog" className="range lg" type="range" min={0} max={100} step={1} value={progress}
              style={{ ['--p' as string]: `${progress}%` }}
              aria-valuetext={`${progress} por cento`}
              onChange={(e) => setProgress(Number(e.target.value))}
              onPointerUp={() => commitProgress(progress)} onKeyUp={() => commitProgress(progress)} onBlur={() => progress !== current.progress && commitProgress(progress)} />
            <div className="progress-card__ends"><span>Começo</span><span>Metade</span><span>Fim da campanha</span></div>
            <p className="muted">Arraste para informar. O WinnerZ não calcula por você, e chegar a 100% não marca Zerou sozinho.</p>
          </div>
          <div className="progress-card__actions">
            <button className="btn primary" onClick={zerei}><Compass size={16} />Zerei</button>
          </div>
        </section>
      ) : (
        <section className="card progress-card">
          <div className="progress-card__value"><Compass size={40} color="var(--accent)" /></div>
          <div className="progress-card__slider"><strong>{current.title}: História concluída em {current.completedAt ? dayMonthYear(current.completedAt) : ''}.</strong><p className="muted">Nada é obrigatório agora. Se quiser, comece outra História: esta continua guardada.</p></div>
          <div className="progress-card__actions"><button className="btn ghost" onClick={() => { actions.play(game.id); navigate('/sessao'); }}>Jogar de novo</button></div>
        </section>
      )}

      <div className="tl-toolbar">
        <div className="tl-toolbar__left">
          <div className="seg" role="group" aria-label="Modo da linha do tempo">
            <button aria-pressed={mode === 'cinema'} onClick={() => setMode('cinema')}>Cinema</button>
            <button aria-pressed={mode === 'simples'} onClick={() => setMode('simples')}>Simples</button>
          </div>
          <div className="seg" role="group" aria-label="Mostrar na linha">
            {FILTERS.map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
          </div>
        </div>
        <button className="btn ghost" onClick={() => setFull(true)}><Icon name="telaCheia" size={16} />Tela cheia</button>
      </div>

      {visible.length === 0 ? (
        <p className="card tl-empty">Nada deste tipo nesta Jornada ainda.</p>
      ) : mode === 'cinema' ? (
        <CinemaTimeline stops={visible} fallback={game.backdrop ?? game.cover} full={full} onExitFull={() => setFull(false)} play={playCta} />
      ) : (
        <SimpleTimeline stops={visible} histories={histories} full={full} onExitFull={() => setFull(false)} />
      )}

      <div className="journey__below">
        <section aria-labelledby="capsula" className="capsule">
          <h2 id="capsula" className="t">Onde você parou</h2>
          <p className="muted">Montado com o que você registrou. Nada aqui foi inventado.</p>
          <div className="capsule__rows">
            {note?.note ? (
              <div className="capsule__row"><div className="capsule__k k-you">Você escreveu</div><div className="quote capsule__note">{note.note}</div></div>
            ) : (
              <div className="capsule__row"><div className="capsule__k k-you">Você escreveu</div><div className="muted">Nenhum recado ainda. Ao finalizar uma sessão, você pode deixar um para a próxima vez.</div></div>
            )}
            <div className="capsule__row">
              <div className="capsule__k">Registrado</div>
              <div>
                {last ? `Última sessão: ${longDay(last.startedAt)}${last.minutes ? `, ${Math.floor(last.minutes / 60)}h${String(last.minutes % 60).padStart(2, '0')} informados` : ''}. ` : ''}
                {current.state === 'concluida' ? `${current.title} concluída. ` : current.progress != null ? `Progresso marcado em ${current.progress}%. ` : ''}
                {current.state !== 'concluida' && last?.whereStopped ? `Parou em ${last.whereStopped}. ` : ''}
                {waypoints.length ? `${waypoints.length} ${waypoints.length === 1 ? 'ponto' : 'pontos'} para voltar ativos.` : ''}
              </div>
            </div>
          </div>
        </section>
        <section aria-labelledby="pontos" className="waypoints">
          <h2 id="pontos" className="t">Pontos para voltar</h2>
          {waypoints.length === 0 && <p className="muted">Nenhum ativo. Durante uma sessão, toque em “Quero voltar aqui”.</p>}
          <ul>
            {waypoints.map((w) => (
              <li key={w.id}>
                {w.image ? <img src={w.image} alt="" /> : <span className="waypoints__noimg"><Icon name="pin" /></span>}
                <div><div className="waypoints__title">{w.title}</div><div className="muted">{[w.text, dayMonth(w.at)].filter(Boolean).join(' ')}</div></div>
                <button className="btn ghost sm" onClick={() => actions.resolveWaypoint(w.id)}>Resolver</button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {celebrating && (
        <Celebration
          title="História concluída"
          subtitle={`${game.title}${celebrating.ordinal > 1 ? `, sua ${celebrating.title}` : ''}. De ${dayMonthYear(celebrating.startedAt)} a hoje.${histories.length > 1 ? ' As outras Histórias continuam guardadas ao lado.' : ''}`}
          onClose={() => setCelebrating(null)}
        >
          <div className="celebration__gifts">
            <PersonalSticker image={stickerImage} title={celebrating.ordinal > 1 ? `Fim da ${celebrating.title}` : 'Primeira vez'} />
            {celebrating.letter && (
              <SealedLetter text={celebrating.letter.text} date={dayMonthYear(celebrating.startedAt)} opened={false} onOpen={() => actions.openLetter(celebrating.id)} />
            )}
          </div>
          <div className="celebration__actions">
            <Link className="btn primary lg" to={`/jogos/${game.slug}#analise`} onClick={() => setCelebrating(null)}>{s.reviews.some((r) => r.gameId === game.id && r.mine) ? 'Rever sua análise' : 'Escrever uma análise'}</Link>
          </div>
        </Celebration>
      )}
    </main>
  );
}

/* ---------------------------------------------------------------- */
/* Modo cinema                                                       */
/* ---------------------------------------------------------------- */

type PlayCta = { label: string; now: boolean; onClick: () => void; hint?: string };

function CinemaTimeline({ stops, fallback, full, onExitFull, play }: { stops: Stop[]; fallback: string; full: boolean; onExitFull: () => void; play: PlayCta }) {
  const real = stops.map((x, i) => (x.kind === 'gap' ? -1 : i)).filter((i) => i >= 0);
  const [sel, setSel] = useState(real[real.length - 1]);
  const [swap, setSwap] = useState(0);
  const stage = useRef<HTMLElement>(null);
  const safeSel = stops[sel] && stops[sel].kind !== 'gap' ? sel : real[real.length - 1];
  const cur = stops[safeSel];

  useEffect(() => { setSel(real[real.length - 1]); }, [stops.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tela cheia de verdade quando o navegador permite; senão, ocupa a janela.
  useEffect(() => {
    if (!full) return;
    const el = stage.current;
    el?.requestFullscreen?.().catch(() => {});
    const onChange = () => { if (!document.fullscreenElement) onExitFull(); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onExitFull(); };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('keydown', esc);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [full, onExitFull]);

  const go = (i: number) => { setSel(i); setSwap((n) => n + 1); };
  const step = (d: number) => { const k = real.indexOf(safeSel); go(real[Math.max(0, Math.min(real.length - 1, k + d))]); };

  const n = stops.length;
  const pts = stops.map((_, i) => ({ x: n === 1 ? 50 : 5 + i * (90 / (n - 1)), y: 80 + 34 * Math.sin(i * 1.05 + 0.6) }));
  let d = `M${(pts[0].x * 10).toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1], b = pts[i], dx = ((b.x - a.x) * 10) / 2;
    d += ` C${(a.x * 10 + dx).toFixed(1)} ${a.y.toFixed(1)},${(b.x * 10 - dx).toFixed(1)} ${b.y.toFixed(1)},${(b.x * 10).toFixed(1)} ${b.y.toFixed(1)}`;
  }
  const frac = n === 1 ? 1 : (pts[safeSel].x - pts[0].x) / (pts[n - 1].x - pts[0].x);
  // Sem foto no acontecimento escolhido: usa a última foto antes dele, ou a arte do jogo.
  const bg = stops.slice(0, safeSel + 1).reverse().find((x) => x.image)?.image ?? fallback;
  const images = [...new Set([fallback, ...stops.map((x) => x.image).filter(Boolean) as string[]])];
  const hists = [...new Set(stops.filter((x) => x.hist > 0).map((x) => x.hist))];

  return (
    <section ref={stage} className={`cinema on-photo${full ? ' is-full' : ''}`} aria-label="Linha do tempo, modo cinema">
      {images.map((src) => (
        <img key={src} className={src === bg ? 'cinema__bg kb' : 'cinema__bg'} src={src} alt="" loading={src === bg ? 'eager' : 'lazy'} style={{ opacity: src === bg ? 1 : 0 }} />
      ))}
      <div className="cinema__shade" aria-hidden="true" />
      <div className="cinema__floor" aria-hidden="true" />
      <svg className="cinema__topo" aria-hidden="true" viewBox="0 0 1200 600" preserveAspectRatio="none">
        <g fill="none" stroke="#C9A174" strokeWidth="1"><path d="M0 120 C 200 80, 360 170, 600 130 S 980 60, 1200 110" /><path d="M0 160 C 220 120, 380 210, 620 170 S 1000 100, 1200 150" /><path d="M0 200 C 240 160, 400 250, 640 210 S 1020 140, 1200 190" /><ellipse cx="930" cy="260" rx="140" ry="50" /><ellipse cx="930" cy="260" rx="90" ry="30" /></g>
      </svg>
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i} className="cinema__dust fx-heavy" aria-hidden="true" style={{ left: `${(i * 37) % 100}%`, top: `${30 + ((i * 23) % 60)}%`, animationDuration: `${6 + (i % 5) * 1.7}s`, animationDelay: `${i * 0.6}s` }} />
      ))}

      <div className="cinema__top">
        <div className="cinema__hists">
          {hists.map((h) => <span key={h} className={h === cur.hist ? 'is-on' : ''}>História {h}</span>)}
        </div>
        <div className="cinema__topactions">
          <button className={`btn ${play.now ? 'now' : 'primary'} cinema__play`} onClick={play.onClick} title={play.hint}>
            {play.now ? <span className="session-pill__dot" aria-hidden="true" /> : <Icon name="play" size={14} />}{play.label}
          </button>
          {full && <button className="btn cinema__glass" onClick={onExitFull}><Icon name="sairTela" size={16} />Sair da tela cheia</button>}
        </div>
      </div>

      <div className="cinema__text" key={swap}>
        <div className="cinema__kind"><span>{LABELS[cur.kind]}</span><span className="cinema__date">{cur.date}</span></div>
        <h2 className="t">{cur.title}</h2>
        {cur.quote && <blockquote className="quote">“{cur.quote}”</blockquote>}
        {cur.text && <p>{cur.text}</p>}
        <div className="cinema__actions">
          <button className="btn cinema__glass cinema__arrow" aria-label="Acontecimento anterior" onClick={() => step(-1)}><Icon name="voltar" /></button>
          <button className="btn cinema__glass cinema__arrow" aria-label="Próximo acontecimento" onClick={() => step(1)}><Icon name="avancar" /></button>
          {cur.kind === 'ponto' && cur.eventId && !cur.resolved && <button className="btn cinema__glass" onClick={() => actions.resolveWaypoint(cur.eventId!)}>Marcar como resolvido</button>}
          {cur.kind === 'ponto' && cur.resolved && <span className="cinema__tag">Resolvido</span>}
          {cur.kind === 'carta' && <span className="cinema__tag">Lacrada até você zerar</span>}
          {cur.kind === 'agora' && <Link className="btn now" to="/sessao">Abrir a sessão</Link>}
        </div>
      </div>

      <div className="cinema__route">
        <svg aria-hidden="true" viewBox="0 0 1000 160" preserveAspectRatio="none">
          <path className="cinema__base" d={d} pathLength={1} />
          <path className="cinema__gold" d={d} pathLength={1} style={{ strokeDasharray: `${frac.toFixed(3)} 1` }} />
        </svg>
        {stops.map((x, i) => x.kind === 'gap' ? (
          <span key={x.id} className="cinema__gap serif" style={{ left: `${pts[i].x}%`, top: pts[i].y }}>{x.title}</span>
        ) : (
          <button key={x.id} className={`mk mk--${x.kind}`} aria-label={`${LABELS[x.kind]}, ${x.date}: ${x.title}`} aria-pressed={i === safeSel} onClick={() => go(i)}
            style={{ left: `${pts[i].x}%`, top: pts[i].y, animationDelay: `${(0.3 + Math.min(i, 12) * 0.05).toFixed(2)}s` }}>
            <i /><span className="mk__lb">{x.date}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Modo simples                                                      */
/* ---------------------------------------------------------------- */

function SimpleTimeline({ stops, histories, full, onExitFull }: { stops: Stop[]; histories: History[]; full: boolean; onExitFull: () => void }) {
  useEffect(() => {
    if (!full) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onExitFull(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [full, onExitFull]);
  let last = 0;
  return (
    <section className={`simple card${full ? ' is-full' : ''}`} aria-label="Linha do tempo, modo simples">
      {full && <div className="simple__close"><button className="btn ghost" onClick={onExitFull}><Icon name="sairTela" size={16} />Sair da tela cheia</button></div>}
      <ol>
        {stops.map((x) => {
          const head = x.kind !== 'gap' && x.hist !== last ? histories.find((h) => h.ordinal === x.hist) : null;
          if (x.kind !== 'gap') last = x.hist;
          return [
            head && (
              <li key={`h-${head.id}`} className="simple__head"><span className="t">História {head.ordinal}, {head.title}</span><span className="muted">{head.state === 'concluida' ? 'concluída' : 'em andamento'}</span></li>
            ),
            x.kind === 'gap' ? (
              <li key={x.id} className="simple__gap serif">{x.title}</li>
            ) : (
              <li key={x.id} className="simple__row">
                <div className="simple__date">{x.date}</div>
                <div className="simple__dot"><span className={`dot dot--${x.kind}`} /></div>
                <div>
                  <div className="simple__kind">{LABELS[x.kind]}</div>
                  <div className="simple__title">{x.title}</div>
                  {x.quote && <div className="quote simple__quote">“{x.quote}”</div>}
                  {x.text && <div className="muted simple__text">{x.text}</div>}
                </div>
                <div>{x.image && <img src={x.image} alt="" />}</div>
              </li>
            ),
          ];
        })}
      </ol>
    </section>
  );
}
