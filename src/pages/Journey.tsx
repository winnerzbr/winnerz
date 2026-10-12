import { celebrateSmall } from '../components/MiniCelebration';
import { ShareCardButton } from '../components/ShareCard';
import { say as toneLine } from '../lib/tone';
import { ConfirmButton } from '../components/Sheet';
import { Previously, CapsuleSheet, CAPSULE_FIELDS } from '../components/Retomada';
import { WhatNext } from '../components/WhatNext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, useStore, historiesOf, currentHistory, eventsOf, sessionsOf, lastNote, lastSession, activeWaypoints, openSession, focusJourneys, isOpenState } from '../data/store';
import { playStateFor } from '../components/PlayButton';
import { PhotoViewer } from '../components/MediaGallery';
import type { TimelineEvent, EventKind, History } from '../data/types';
import { Icon, Compass } from '../components/Icon';
import { Celebration, SealedLetter, PersonalSticker } from '../components/Celebration';
import { dayMonth, dayMonthYear, gapLabel, hourMin, longDay } from '../lib/format';
import { whenLabel, comparable } from '../lib/dates';
import { JourneyMenu, HistoryEditSheet, StateNoteSheet, STATE_LABEL } from '../components/JourneyManage';
import { EventEditSheet } from '../components/EventEditSheet';
import { ActionToast } from '../components/Toast';
import { PastButton } from '../components/PastPlay';
import { CoverArt } from '../components/CoverArt';
import { useBackdrop } from '../components/Backdrop';

type StopKind = EventKind | 'agora';
interface Stop { id: string; kind: StopKind | 'gap'; hist: number; date: string; title: string; text?: string; quote?: string; image?: string; eventId?: string; resolved?: boolean }

export const eventDate = (e: TimelineEvent, short = true) => e.dateLabel ?? whenLabel(e.at, e.precision, { short });

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
        <div className="hero__actions">
          <button className="btn primary lg" onClick={() => { actions.play(game.id); navigate('/sessao'); }}><Icon name="play" size={16} />Jogar agora</button>
          <PastButton gameId={game.id} className="btn ghost lg" />
        </div>
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
  const bg = useBackdrop(game);
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
  const [wpViewer, setWpViewer] = useState<number | null>(null);
  const [progress, setProgress] = useState(current.progress ?? 0);
  const [menu, setMenu] = useState(false);
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const [editHist, setEditHist] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string; historyId?: string } | null>(null);
  useEffect(() => setProgress(current.progress ?? 0), [current.id, current.progress]);

  const stops: Stop[] = useMemo(() => {
    const hIndex = Object.fromEntries(histories.map((h) => [h.id, h.ordinal]));
    const out: Stop[] = [];
    let prev: TimelineEvent | null = null;
    for (const e of events) {
      if (prev && comparable(prev.precision) && comparable(e.precision)) {
        const gap = gapLabel(prev.at, e.at);
        if (gap) out.push({ id: `gap-${e.id}`, kind: 'gap', hist: 0, date: '', title: gap });
      }
      out.push({ id: e.id, eventId: e.id, kind: e.kind, hist: hIndex[e.historyId] ?? 1, date: eventDate(e), title: e.title, text: e.text, quote: e.quote, image: e.image, resolved: e.resolved });
      prev = e;
    }
    if (openHere) {
      const n = sessionsOf(s, openHere.historyId).length;
      const lastImg = [...events].reverse().find((e) => e.image)?.image ?? bg;
      out.push({ id: 'agora', kind: 'agora', hist: hIndex[openHere.historyId] ?? current.ordinal, date: `hoje, ${hourMin(openHere.startedAt)}`, title: `Sessão ${n} aberta`, text: 'O caminho continua. Registre o que quiser, quando quiser.', image: lastImg });
    }
    return out;
  }, [events, histories, openHere, s, bg, current.ordinal]);

  const groups = FILTERS.find((f) => f[0] === filter)![2];
  const visible = stops.filter((x) => (groups ? x.kind !== 'gap' && groups.includes(x.kind as StopKind) : true));

  const commitProgress = (v: number) => {
    const before = current.progress ?? 0;
    actions.setProgress(current.id, v); setSaved((n) => n + 1);
    if (before < 50 && v >= 50 && v < 100) celebrateSmall('Metade do caminho', toneLine('metade', s.prefs.tone));
  };

  const zerei = () => {
    const h = current;
    actions.completeHistory(h.id);
    setCelebrating({ ...h });
  };

  const stickerImage = [...events].reverse().find((e) => e.image)?.image ?? bg ?? game.cover;

  // Botão de jogar: abre a sessão deste jogo, ou leva à sessão já aberta (nunca troca uma sessão em silêncio).
  const ps = playStateFor(s, game.id);
  const playCta: PlayCta = { label: ps.label, now: ps.now, onClick: ps.go, hint: ps.hint };
  const chosenFocus = focusJourneys(s).filter((f) => f.chosen).map((f) => f.journey.id);
  const isFocus = chosenFocus.includes(journeyId);
  const toggleFocus = () => {
    if (isFocus) { actions.removeFocus(journeyId); return; }
    if (!actions.addFocus(journeyId)) setToast({ id: Date.now(), text: 'Você já tem 3 jogos em foco. Tire um deles para pôr este.' });
  };
  const stateChanged = (historyId: string, text: string) => setToast({ id: Date.now(), text, historyId: /De volta/.test(text) ? undefined : historyId });
  const openState = current.state === 'ativa' || current.state === 'pausada';

  return (
    <main className="page journey">
      <Link to="/jornada" className="back-link">Todas as Jornadas</Link>
      <div className="journey__head">
        <div className="journey__title">
          <Link to={`/jogos/${game.slug}`} aria-label="Abrir a ficha do jogo"><CoverArt game={game} lazy={false} /></Link>
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
            <div className="journey__minor">
              {openState && (
                <button className="btn quiet sm focus-toggle" aria-pressed={isFocus} onClick={toggleFocus}>
                  <Compass size={14} />{isFocus ? (chosenFocus[0] === journeyId ? 'Foco principal' : 'Em foco') : 'Pôr em foco'}
                </button>
              )}
              <button className="btn quiet sm" onClick={() => setMenu(true)} aria-haspopup="dialog">Mais opções</button>
            </div>
          </div>
        </div>
      </div>

      {isOpenState(current.state) && <Previously journeyId={journeyId} showCapsule={false} />}

      {(current.state === 'pausada' || current.state === 'dropada' || current.state === 'encerrada') && (
        <section className={`card state-card state-card--${current.state}`} aria-labelledby="state-h">
          <div>
            <h2 id="state-h" className="t">{STATE_LABEL[current.state]}{current.completedAt && current.state !== 'pausada' ? `, ${whenLabel(current.completedAt, current.completedPrecision)}` : ''}</h2>
            {current.note ? <p className="quote">“{current.note}”</p> : <p className="muted">{current.state === 'pausada' ? 'Sem pressa. Ele espera.' : 'Sem julgamento. Dá para retomar quando quiser.'}</p>}
          </div>
          <div className="state-card__actions">
            <button className="btn ghost" onClick={() => { actions.setHistoryState(current.id, 'ativa'); stateChanged(current.id, toneLine('retomou', s.prefs.tone)); }}>Retomar</button>
            <button className="btn quiet sm" onClick={() => setNoteFor(current.id)}>{current.note ? 'Editar recado' : 'Escrever por quê'}</button>
          </div>
        </section>
      )}

      {capsuleOpen && <CapsuleSheet historyId={current.id} gameTitle={game.title} onClose={() => setCapsuleOpen(false)} />}

      {current.state === 'dropada' || current.state === 'encerrada' ? null : current.state !== 'concluida' ? (
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
          <div className="progress-card__actions">
            <button className="btn ghost" onClick={() => { actions.play(game.id); navigate('/sessao'); }}>Jogar de novo</button>
            <ConfirmButton className="btn quiet sm" label="Não zerei: desfazer" confirm="Toque de novo: volta a “jogando”" onConfirm={() => actions.reopenHistory(current.id)} />
          </div>
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
        <CinemaTimeline stops={visible} fallback={bg ?? game.cover} full={full} onExitFull={() => setFull(false)} play={playCta} title={game.title} onEdit={setEditEvent} />
      ) : (
        <SimpleTimeline stops={visible} histories={histories} full={full} onExitFull={() => setFull(false)} title={game.title} onEdit={setEditEvent} />
      )}

      <div className="journey__below">
        <section aria-labelledby="capsula" className="capsule">
          <div className="capsule__top">
            <h2 id="capsula" className="t">Onde você parou</h2>
            {current.state !== 'concluida' && <button className="btn ghost sm" onClick={() => setCapsuleOpen(true)}>{current.capsule ? 'Atualizar a Cápsula' : 'Montar a Cápsula de Retomada'}</button>}
          </div>
          <p className="muted">Montado com o que você registrou. Nada aqui foi inventado.{current.capsule?.ai ? ' A Cápsula partiu de uma sugestão da IA que você confirmou.' : ''}</p>
          <div className="capsule__rows">
            {current.capsule && CAPSULE_FIELDS.map((f) => current.capsule![f.key] && (
              <div key={f.key} className="capsule__row"><div className="capsule__k k-you">{f.label}</div><div>{current.capsule![f.key]}</div></div>
            ))}
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
                {w.image ? <button className="waypoints__img" onClick={() => setWpViewer(waypoints.filter((x) => x.image).indexOf(w))} aria-label={`Ver foto: ${w.title}`}><img src={w.image} alt="" /></button> : <span className="waypoints__noimg"><Icon name="pin" /></span>}
                <div><div className="waypoints__title">{w.title}</div><div className="muted">{[w.text, dayMonth(w.at)].filter(Boolean).join(' ')}</div></div>
                <button className="btn ghost sm" onClick={() => actions.resolveWaypoint(w.id)}>Resolver</button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {celebrating && (
        <Celebration
          title={toneLine('zerou', s.prefs.tone)}
          subtitle={`${game.title}${celebrating.ordinal > 1 ? `, sua ${celebrating.title}` : ''}. De ${dayMonthYear(celebrating.startedAt)} a hoje. ${toneLine('zerouSub', s.prefs.tone)}`}
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
            <ShareCardButton game={game} history={celebrating} />
          </div>
          <WhatNext game={game} onPick={() => setCelebrating(null)} />
        </Celebration>
      )}
      {menu && <JourneyMenu journeyId={journeyId} onClose={() => setMenu(false)} onEditHistory={setEditHist} onStateChanged={stateChanged} />}
      {editHist && <HistoryEditSheet historyId={editHist} onClose={() => setEditHist(null)} />}
      {editEvent && <EventEditSheet eventId={editEvent} onClose={() => setEditEvent(null)} />}
      {noteFor && <StateNoteSheet historyId={noteFor} onClose={() => setNoteFor(null)} />}
      {toast && <ActionToast key={toast.id} text={toast.text} action={toast.historyId ? 'Escrever por quê' : undefined} onAction={() => setNoteFor(toast.historyId!)} onDone={() => setToast(null)} />}
      {wpViewer !== null && (
        <PhotoViewer title={game.title} items={waypoints.filter((x) => x.image).map((x) => ({ kind: 'image' as const, src: x.image!, label: x.title }))} start={Math.max(0, wpViewer)} onClose={() => setWpViewer(null)} />
      )}
    </main>
  );
}

/* ---------------------------------------------------------------- */
/* Modo cinema                                                       */
/* ---------------------------------------------------------------- */

type PlayCta = { label: string; now: boolean; onClick: () => void; hint?: string };

function CinemaTimeline({ stops, fallback, full, onExitFull, play, title, onEdit }: { stops: Stop[]; fallback: string; full: boolean; onExitFull: () => void; play: PlayCta; title: string; onEdit: (eventId: string) => void }) {
  const [viewer, setViewer] = useState<number | null>(null);
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
  // O fundo é sempre a arte do jogo; a foto do acontecimento aparece no detalhe, como uma foto revelada.
  const photos = stops.filter((x) => x.image && x.kind !== 'agora');
  const curPhoto = cur.kind !== 'agora' && cur.image ? cur : null;
  // A mesma foto aparece flutuando ao lado do texto (telas largas) ou dentro do texto (celular).
  const photoCard = (variant: string) => curPhoto && (
    <button key={`p-${curPhoto.id}-${swap}-${variant}`} className={`cinema__photo ${variant}${curPhoto.kind === 'ponto' ? ' is-ponto' : ''}`} onClick={() => setViewer(photos.indexOf(curPhoto))} aria-label={`Ver foto em tamanho grande: ${curPhoto.title}`}>
      <span className="cinema__photo-paper">
        <img src={curPhoto.image} alt="" />
        <span className="cinema__photo-cap">
          <span className="serif">{curPhoto.kind === 'ponto' ? 'Quero voltar aqui' : curPhoto.title}</span>
          <span>{curPhoto.date}<Icon name="telaCheia" size={13} /></span>
        </span>
      </span>
    </button>
  );
  const hists = [...new Set(stops.filter((x) => x.hist > 0).map((x) => x.hist))];

  return (
    <section ref={stage} className={`cinema on-photo${full ? ' is-full' : ''}`} aria-label="Linha do tempo, modo cinema">
      <img className="cinema__bg kb" src={fallback} alt="" />
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
        {curPhoto && photoCard('cinema__photo--inline')}
        <div className="cinema__actions">
          <button className="btn cinema__glass cinema__arrow" aria-label="Acontecimento anterior" onClick={() => step(-1)}><Icon name="voltar" /></button>
          <button className="btn cinema__glass cinema__arrow" aria-label="Próximo acontecimento" onClick={() => step(1)}><Icon name="avancar" /></button>
          {cur.kind === 'ponto' && cur.eventId && !cur.resolved && <button className="btn cinema__glass" onClick={() => actions.resolveWaypoint(cur.eventId!)}>Marcar como resolvido</button>}
          {cur.kind === 'ponto' && cur.resolved && <span className="cinema__tag">Resolvido</span>}
          {cur.kind === 'carta' && <span className="cinema__tag">Lacrada até você zerar</span>}
          {cur.kind === 'agora' && <Link className="btn now" to="/sessao">Abrir a sessão</Link>}
          {cur.eventId && cur.kind !== 'carta' && !full && <button className="btn cinema__glass cinema__edit" onClick={() => onEdit(cur.eventId!)}>Editar</button>}
        </div>
      </div>

      {curPhoto && photoCard('cinema__photo--float')}

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
      {viewer !== null && photos.length > 0 && (
        <PhotoViewer title={title} items={photos.map((x) => ({ kind: 'image' as const, src: x.image!, label: x.title }))} start={Math.max(0, viewer)} onClose={() => setViewer(null)} container={full ? stage.current : null} />
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Modo simples                                                      */
/* ---------------------------------------------------------------- */

function SimpleTimeline({ stops, histories, full, onExitFull, title, onEdit }: { stops: Stop[]; histories: History[]; full: boolean; onExitFull: () => void; title: string; onEdit: (eventId: string) => void }) {
  const [viewer, setViewer] = useState<number | null>(null);
  const photos = stops.filter((x) => x.image && x.kind !== 'agora');
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
              <li key={`h-${head.id}`} className="simple__head"><span className="t">História {head.ordinal}, {head.title}</span><span className="muted">{STATE_LABEL[head.state].toLowerCase()}</span></li>
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
                <div className="simple__side">
                  {x.image && x.kind !== 'agora' && <button className="simple__img" onClick={() => setViewer(photos.indexOf(x))} aria-label={`Ver foto: ${x.title}`}><img src={x.image} alt="" /></button>}
                  {x.eventId && x.kind !== 'carta' && !full && <button className="btn quiet sm simple__edit" onClick={() => onEdit(x.eventId!)} aria-label={`Editar: ${x.title}`}>Editar</button>}
                </div>
              </li>
            ),
          ];
        })}
      </ol>
      {viewer !== null && photos.length > 0 && (
        <PhotoViewer title={title} items={photos.map((x) => ({ kind: 'image' as const, src: x.image!, label: x.title }))} start={Math.max(0, viewer)} onClose={() => setViewer(null)} />
      )}
    </section>
  );
}
