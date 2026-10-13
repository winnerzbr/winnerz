import { celebrateSmall } from '../components/MiniCelebration';
import { ShareCardButton } from '../components/ShareCard';
import { say as toneLine } from '../lib/tone';
import { ConfirmButton } from '../components/Sheet';
import { CapsuleSheet, CAPSULE_FIELDS } from '../components/Retomada';
import { Buddy, useBuddy } from '../components/Buddy';
import { CaptureImportSheet } from '../components/CaptureImport';
import { recapFor } from '../lib/recap';
import { WhatNext } from '../components/WhatNext';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, useStore, historiesOf, currentHistory, eventsOf, sessionsOf, lastNote, lastSession, activeWaypoints, openSession, focusJourneys, isOpenState } from '../data/store';
import { playStateFor } from '../components/PlayButton';
import { PhotoViewer } from '../components/MediaGallery';
import type { TimelineEvent, EventKind, History } from '../data/types';
import { Icon, Compass } from '../components/Icon';
import { Celebration, SealedLetter, PersonalSticker } from '../components/Celebration';
import { dayMonth, dayMonthYear, gapLabel, longDay } from '../lib/format';
import { whenLabel, comparable } from '../lib/dates';
import { JourneyMenu, HistoryEditSheet, StateNoteSheet, STATE_LABEL } from '../components/JourneyManage';
import { EventEditSheet } from '../components/EventEditSheet';
import { ActionToast } from '../components/Toast';
import { PastButton } from '../components/PastPlay';
import { CoverArt } from '../components/CoverArt';
import { useBackdrop } from '../components/Backdrop';
import { BrandMark } from '../components/Brand';

type StopKind = EventKind | 'agora';
interface Stop { id: string; kind: StopKind | 'gap'; hist: number; date: string; title: string; text?: string; quote?: string; image?: string; eventId?: string; resolved?: boolean; minutes?: number; companions?: string[]; startedAt?: string }

export const eventDate = (e: TimelineEvent, short = true) => e.dateLabel ?? whenLabel(e.at, e.precision, { short });

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
        <p className="kicker">Minha Jornada em</p>
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
  const allEvents = eventsOf(s, journeyId);
  const bg = useBackdrop(game);
  const open = openSession(s);
  const openHere = open && open.journeyId === journeyId ? open : null;
  const note = lastNote(s, journeyId);
  const last = lastSession(s, journeyId);
  const waypoints = activeWaypoints(s, journeyId);
  const totalSessions = s.sessions.filter((x) => x.journeyId === journeyId).length + allEvents.filter((e) => e.kind === 'sessao' && !e.sessionId).reduce((n, e) => n + (parseInt(e.title) || 0), 0);
  const moments = allEvents.filter((e) => e.kind === 'momento').length;
  const light = !!s.prefs.light;

  const [mode, setMode] = useState<'cinema' | 'simples'>(() => (s.prefs.motion === 'reduzidas' ? 'simples' : 'cinema'));
  const [filter, setFilter] = useState('tudo');
  // Qual História a linha mostra: a atual por padrão; 0 = todas.
  const [histSel, setHistSel] = useState<number>(current.ordinal);
  const [full, setFull] = useState(false);
  const [celebrating, setCelebrating] = useState<History | null>(null);
  const [saved, setSaved] = useState(0);
  const [wpViewer, setWpViewer] = useState<number | null>(null);
  const [progress, setProgress] = useState(current.progress ?? 0);
  const [menu, setMenu] = useState(false);
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const [captures, setCaptures] = useState(false);
  const [editHist, setEditHist] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string; historyId?: string } | null>(null);
  useEffect(() => setProgress(current.progress ?? 0), [current.id, current.progress]);
  useEffect(() => setHistSel(current.ordinal), [current.ordinal]);

  const selHist = histSel ? histories.find((h) => h.ordinal === histSel) ?? current : null;
  const events = selHist ? allEvents.filter((e) => e.historyId === selHist.id) : allEvents;

  const stops: Stop[] = useMemo(() => {
    const hIndex = Object.fromEntries(histories.map((h) => [h.id, h.ordinal]));
    const out: Stop[] = [];
    let prev: TimelineEvent | null = null;
    for (const e of events) {
      if (prev && comparable(prev.precision) && comparable(e.precision)) {
        const gap = gapLabel(prev.at, e.at);
        if (gap) out.push({ id: `gap-${e.id}`, kind: 'gap', hist: 0, date: '', title: gap });
      }
      const sess = e.sessionId ? s.sessions.find((x) => x.id === e.sessionId) : undefined;
      out.push({ id: e.id, eventId: e.id, kind: e.kind, hist: hIndex[e.historyId] ?? 1, date: eventDate(e), title: e.title, text: e.text, quote: e.quote, image: e.image, resolved: e.resolved, minutes: sess?.minutes, companions: sess?.companions, startedAt: sess?.startedAt });
      prev = e;
    }
    return out;
  }, [events, histories, s.sessions]);

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

  const stickerImage = [...allEvents].reverse().find((e) => e.image)?.image ?? bg ?? game.cover;

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
  const histLabel = (h: History) => [`História ${h.ordinal}`, h.title && !/^hist[óo]ria \d/i.test(h.title) ? h.title : null, h.state === 'concluida' ? 'Zerada' : h.state === 'dropada' ? 'Largada' : h.state === 'encerrada' ? 'Encerrada' : null].filter(Boolean).join(' · ');
  const nSessSel = selHist ? sessionsOf(s, selHist.id).length : s.sessions.filter((x) => x.journeyId === journeyId).length;
  const nextSession = sessionsOf(s, current.id).length + 1;
  const where = current.capsule?.where ?? last?.whereStopped;
  const extra = CAPSULE_FIELDS.filter((f) => f.key !== 'where' && current.capsule?.[f.key]);

  return (
    <main className="journey">
      <section className="jhero on-photo" aria-labelledby="jtitle">
        {bg && <img className="jhero__bg" src={bg} alt="" />}
        <div className="jhero__shade" aria-hidden="true" />
        <div className="jhero__fade" aria-hidden="true" />
        <div className="page jhero__in">
          <Link to="/jornada" className="kicker jhero__back">← Jornada</Link>
          <div className="jhero__row">
            <Link to={`/jogos/${game.slug}`} className="jhero__cover" aria-label="Abrir a ficha do jogo"><CoverArt game={game} lazy={false} /></Link>
            <div className="jhero__info">
              {histories.length > 1 && (
                <nav className="subnav jhero__hists" aria-label="Histórias">
                  {histories.map((h) => <button key={h.id} aria-current={histSel === h.ordinal ? 'true' : undefined} onClick={() => setHistSel(h.ordinal)}>{histLabel(h)}</button>)}
                  <button aria-current={histSel === 0 ? 'true' : undefined} onClick={() => setHistSel(0)}>Todas</button>
                </nav>
              )}
              <h1 id="jtitle" className="t jhero__title">{game.title}</h1>
              {!light && (
                <dl className="jstats">
                  <div><dd className="t">{histories.length}</dd><dt>{histories.length === 1 ? 'História' : 'Histórias'}</dt></div>
                  <div><dd className="t">{totalSessions}</dd><dt>{totalSessions === 1 ? 'Sessão' : 'Sessões'}</dt></div>
                  {/* A tela se adapta ao que você registra: contadores zerados não aparecem. */}
                  {moments > 0 && <div><dd className="t">{moments}</dd><dt>{moments === 1 ? 'Momento' : 'Momentos'}</dt></div>}
                  {waypoints.length > 0 && <div><dd className="t jstats__now">{waypoints.length}</dd><dt>Para voltar</dt></div>}
                </dl>
              )}
            </div>
            <div className="jhero__actions">
              <button className={`btn ${playCta.now ? 'now' : 'primary'}`} onClick={playCta.onClick} title={playCta.hint}>
                {playCta.now ? <span className="session-pill__dot" aria-hidden="true" /> : <Icon name="play" size={14} />}{playCta.label}
              </button>
              {openState && (
                <button className="btn ghost focus-toggle" aria-pressed={isFocus} onClick={toggleFocus}>
                  <span className="focus-toggle__dot" aria-hidden="true" />{isFocus ? (chosenFocus[0] === journeyId ? 'Foco principal' : 'Em foco') : 'Pôr em foco'}
                </button>
              )}
              <button className="btn ghost icon" onClick={() => setMenu(true)} aria-haspopup="dialog" aria-label="Mais opções" title="Mais opções"><Icon name="maisAcoes" size={17} /></button>
            </div>
          </div>
          {playCta.hint && <p className="faint jhero__hint">{playCta.hint}</p>}
        </div>
      </section>

      <div className="page jbody">
        {isOpenState(current.state) && <BackBuddy journeyId={journeyId} />}

        {(current.state === 'pausada' || current.state === 'dropada' || current.state === 'encerrada') && (
          <section className={`card state-card state-card--${current.state}`} aria-labelledby="state-h">
            <div>
              <h2 id="state-h" className="t">{STATE_LABEL[current.state]}{current.completedAt && current.state !== 'pausada' ? `, ${whenLabel(current.completedAt, current.completedPrecision)}` : ''}</h2>
              {current.note ? <p className="state-card__note">“{current.note}”</p> : <p className="muted">{current.state === 'pausada' ? 'Sem pressa. Ele espera.' : 'Sem julgamento. Dá para retomar quando quiser.'}</p>}
            </div>
            <div className="state-card__actions">
              <button className="btn ghost" onClick={() => { actions.setHistoryState(current.id, 'ativa'); stateChanged(current.id, toneLine('retomou', s.prefs.tone)); }}>Retomar</button>
              <button className="btn quiet sm" onClick={() => setNoteFor(current.id)}>{current.note ? 'Editar recado' : 'Escrever por quê'}</button>
            </div>
          </section>
        )}

        {capsuleOpen && <CapsuleSheet historyId={current.id} gameTitle={game.title} onClose={() => setCapsuleOpen(false)} />}

        <div className="jcards">
          {current.state === 'dropada' || current.state === 'encerrada' ? null : current.state !== 'concluida' ? (
            <section className="card jprog" aria-labelledby="prog-label">
              <div className="jprog__head">
                <label id="prog-label" htmlFor="prog" className="kicker">Seu progresso {current.ordinal > 1 ? `na ${current.title}` : 'nesta História'}</label>
                <span className="t jprog__v">{progress}%</span>
              </div>
              <input id="prog" className="range lg jprog__range" type="range" min={0} max={100} step={1} value={progress}
                style={{ ['--p' as string]: `${progress}%` }}
                aria-valuetext={`${progress} por cento`}
                onChange={(e) => setProgress(Number(e.target.value))}
                onPointerUp={() => commitProgress(progress)} onKeyUp={() => commitProgress(progress)} onBlur={() => progress !== current.progress && commitProgress(progress)} />
              <div className="mono jprog__ends"><span>Começo</span><span>Metade</span><span>Fim da campanha</span></div>
              <p className="muted jprog__hint">Arraste para informar. O WinnerZ nunca calcula por você, e chegar a 100% não marca Zerou sozinho.<span className="jprog__saved" aria-live="polite">{saved > 0 && <span key={saved} className="ok-flash">Progresso salvo</span>}</span></p>
              <button className="btn ghost jprog__done" onClick={zerei}><span className="diamond" aria-hidden="true" />Zerei</button>
            </section>
          ) : (
            <section className="card jprog jprog--done">
              <span className="kicker jprog__gold">História concluída</span>
              <p className="t jprog__title">{current.title}</p>
              <p className="muted">Zerou em {current.completedAt ? dayMonthYear(current.completedAt) : 'data não informada'}. Nada é obrigatório agora. Se quiser, comece outra História: esta continua guardada.</p>
              <div className="jprog__actions">
                <button className="btn ghost" onClick={() => { actions.play(game.id); navigate('/sessao'); }}>Jogar de novo</button>
                <ConfirmButton className="btn quiet sm" label="Não zerei: desfazer" confirm="Toque de novo: volta a “jogando”" onConfirm={() => actions.reopenHistory(current.id)} />
              </div>
            </section>
          )}

          <section className="card jcap" aria-labelledby="capsula">
            <div className="jcap__head">
              <h2 id="capsula" className="t">Onde você parou</h2>
              {current.state !== 'concluida' ? <button className="btn quiet sm" onClick={() => setCapsuleOpen(true)}>{current.capsule ? 'Atualizar a Cápsula' : 'Montar a Cápsula'}</button> : <span className="kicker kicker--now">Cápsula de retomada</span>}
            </div>
            <div className="jcap__grid">
              {where && <div><span className="kicker">Lugar</span><strong>{where}</strong></div>}
              {last && <div><span className="kicker">Última sessão</span><span className="mono">{longDay(last.startedAt)}{last.minutes ? ` · ${Math.floor(last.minutes / 60)}h${String(last.minutes % 60).padStart(2, '0')}` : ''}</span></div>}
              {last?.companions?.length ? <div><span className="kicker">Com quem</span><strong>{last.companions.join(', ')}</strong></div> : null}
              {extra.map((f) => <div key={f.key}><span className="kicker">{f.label}</span><strong>{current.capsule![f.key]}</strong></div>)}
              {!where && !last && !extra.length && <div><span className="kicker">Registrado</span><span className="muted">Ainda nada. Ao finalizar uma sessão, você pode deixar um recado para a próxima vez.</span></div>}
            </div>
            {note?.note && <p className="jcap__note">“{note.note}”</p>}
            <div className="jcap__wps">
              <div className="kicker">Pontos para voltar · {waypoints.length}</div>
              {waypoints.length === 0 && <p className="muted jcap__empty">Nenhum ativo. Durante uma sessão, toque em “Quero voltar aqui”.</p>}
              <ul>
                {waypoints.map((w) => (
                  <li key={w.id}>
                    {w.image ? <button className="jcap__img" onClick={() => setWpViewer(waypoints.filter((x) => x.image).indexOf(w))} aria-label={`Ver foto: ${w.title}`}><img src={w.image} alt="" /></button> : <span className="jcap__img jcap__img--none"><Icon name="pin" size={16} /></span>}
                    <div><div className="jcap__wtitle">{w.title}</div><div className="muted">{[w.text, dayMonth(w.at)].filter(Boolean).join(' · ')}</div></div>
                    <button className="btn ghost sm" onClick={() => actions.resolveWaypoint(w.id)}>Resolver</button>
                  </li>
                ))}
              </ul>
            </div>
            <p className="faint jcap__src">Montado com o que você registrou. Nada aqui foi inventado.{current.capsule?.ai ? ' A Cápsula partiu de uma sugestão da IA que você confirmou.' : ''}</p>
          </section>
        </div>

        <section className="jline" aria-labelledby="jline-h">
          <div className="jline__head">
            <div>
              <h2 id="jline-h" className="t">{selHist ? (selHist.ordinal > 1 || histories.length > 1 ? `A História ${selHist.ordinal}` : 'A sua História') : 'Todas as Histórias'}</h2>
              <p className="muted">{selHist ? `${selHist.title && !/^hist/i.test(selHist.title) ? `${selHist.title}. ` : ''}Começou em ${whenLabel(selHist.startedAt, selHist.startedPrecision ?? 'dia')}.` : `Desde ${allEvents[0] ? eventDate(allEvents[0], false) : '—'}.`}{!light ? ` ${nSessSel} ${nSessSel === 1 ? 'sessão' : 'sessões'}, ${events.length} ${events.length === 1 ? 'registro' : 'registros'}.` : ''}</p>
            </div>
            <div className="jline__tools">
              <div className="seg seg--sm" role="group" aria-label="Modo da linha do tempo">
                <button aria-pressed={mode === 'cinema'} onClick={() => setMode('cinema')}>Cinema</button>
                <button aria-pressed={mode === 'simples'} onClick={() => setMode('simples')}>Simples</button>
              </div>
              <button className="btn quiet sm" onClick={() => setCaptures(true)}><Icon name="camera" size={15} />Capturas de tela</button>
              <button className="btn ghost sm" onClick={() => setFull(true)}><Icon name="telaCheia" size={15} />Tela cheia</button>
            </div>
          </div>
          <div className="chips jline__filters" role="group" aria-label="Mostrar na linha">
            {FILTERS.map(([id, label]) => <button key={id} className="chip" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
          </div>
          {captures && <CaptureImportSheet journeyId={journeyId} gameTitle={game.title} onClose={() => setCaptures(false)} />}

          {visible.length === 0 && !(openState || openHere) ? (
            <p className="card tl-empty">Nada deste tipo nesta História ainda.</p>
          ) : mode === 'cinema' ? (
            <CinemaTimeline stops={visible} bg={bg ?? game.cover} full={full} onExitFull={() => setFull(false)} play={playCta} title={game.title} onEdit={setEditEvent}
              today={selHist && selHist.id !== current.id ? null : openHere ? { open: true, n: sessionsOf(s, openHere.historyId).length } : openState ? { open: false, n: nextSession } : null} />
          ) : (
            <SimpleTimeline stops={visible} histories={histories} full={full} onExitFull={() => setFull(false)} title={game.title} onEdit={setEditEvent} />
          )}
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
            <ShareCardButton game={game} history={s.histories.find((x) => x.id === celebrating.id) ?? celebrating} />
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
/* Modo cinema: uma película de quadros sobre a linha do horizonte   */
/* ---------------------------------------------------------------- */

type PlayCta = { label: string; now: boolean; onClick: () => void; hint?: string };
const KIND_SHORT: Record<string, string> = { inicio: 'Início', sessao: 'Sessão', momento: 'Momento', ponto: 'Para voltar', marco: 'Marco', carta: 'Carta' };
const periodOf = (iso: string) => { const h = Number(new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', hour12: false, timeZone: 'America/Sao_Paulo' }).slice(0, 2)); return h < 6 ? 'De madrugada' : h < 12 ? 'De manhã' : h < 18 ? 'À tarde' : 'À noite'; };
const dur = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}`);

type GItem = Stop & { gap?: string; today?: { open: boolean; n: number } };
const KIND_LONG: Record<string, string> = { inicio: 'Início de História', sessao: 'Sessão', momento: 'Momento guardado', ponto: 'Quero voltar aqui', marco: 'Marco', carta: 'Carta para o futuro', agora: 'Hoje' };

function CinemaTimeline({ stops, bg, full, onExitFull, play, title, onEdit, today }: { stops: Stop[]; bg: string; full: boolean; onExitFull: () => void; play: PlayCta; title: string; onEdit: (eventId: string) => void; today: { open: boolean; n: number } | null }) {
  const [viewer, setViewer] = useState<number | null>(null);
  const stage = useRef<HTMLElement>(null);
  const swipe = useRef<number | null>(null);

  // Os quadros: cada registro (o salto no tempo vira um aviso no quadro seguinte) e, no fim, o "hoje".
  const items: GItem[] = useMemo(() => {
    const out: GItem[] = [];
    let gap: string | undefined;
    for (const x of stops) {
      if (x.kind === 'gap') { gap = x.title; continue; }
      out.push({ ...x, gap });
      gap = undefined;
    }
    if (today) out.push({ id: 'hoje', kind: 'agora', hist: out.at(-1)?.hist ?? 1, date: 'Hoje', title: today.open ? 'Agora' : 'Hoje', text: today.open ? `Sessão ${today.n} aberta. Registre o que quiser, quando quiser.` : `Sessão ${today.n} espera.`, today });
    return out;
  }, [stops, today]);
  const last = items.length - 1;
  const [sel, setSel] = useState(last);
  useEffect(() => { setSel(items.length - 1); }, [items.length]);
  const cur = items[Math.max(0, Math.min(last, sel))];
  const go = (i: number) => setSel(Math.max(0, Math.min(last, i)));
  const photos = items.filter((x) => x.image && x.kind !== 'agora');

  // Tela cheia de verdade quando o navegador permite; senão, ocupa a janela.
  useEffect(() => {
    if (!full) return;
    const el = stage.current;
    el?.requestFullscreen?.().catch(() => {});
    el?.focus();
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

  const key = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(sel + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(sel - 1); }
    if (e.key === 'Home') { e.preventDefault(); go(0); }
    if (e.key === 'End') { e.preventDefault(); go(last); }
  };

  // A régua do horizonte: um passo por registro, espaço extra no salto no tempo.
  const pos: number[] = [];
  let acc = 0;
  items.forEach((x, i) => { if (i > 0) acc += x.gap ? 2.4 : 1; pos.push(acc); });
  const span = acc || 1;
  const pct = (i: number) => (items.length === 1 ? 50 : (pos[i] / span) * 100);
  const dense = items.length > 24;
  const ambient = cur.image ?? bg;
  const ambients = [...new Set(items.map((x) => x.image).filter((x): x is string => !!x))];

  const face = (x: GItem) => {
    if (x.image && x.kind !== 'agora') return <img src={x.image} alt="" draggable={false} />;
    if (x.kind === 'agora') return (
      <span className="gal__ph gal__ph--today">
        <span className="kicker kicker--now">{x.today?.open ? 'Sessão aberta' : 'Próxima sessão'}</span>
        <span className="t gal__big">{x.title}</span>
        <span className="muted">{x.text}</span>
      </span>
    );
    const big = x.kind === 'sessao' && x.minutes ? dur(x.minutes) : x.kind === 'carta' ? 'Carta' : x.title;
    const sub = x.kind === 'sessao' ? [x.startedAt ? periodOf(x.startedAt) : null, x.companions?.length ? `com ${x.companions.join(', ')}` : null].filter(Boolean).join(', ') || x.title
      : x.kind === 'carta' ? 'Lacrada até você zerar' : x.quote ? `“${x.quote}”` : x.text ?? '';
    return (
      <span className={`gal__ph gal__ph--${x.kind}`}>
        {x.kind === 'inicio' && <BrandMark width={44} />}
        {x.kind === 'marco' && <Compass size={36} color="#E2BE84" />}
        <span className="kicker">{KIND_SHORT[x.kind] ?? x.kind}</span>
        <span className="t gal__big">{big}</span>
        {sub && <span className="gal__sub">{sub}</span>}
      </span>
    );
  };

  return (
    <section ref={stage} tabIndex={-1} onKeyDown={key} className={`gal on-photo${full ? ' is-full' : ''}`} aria-label="Linha do tempo, modo cinema. Use as setas do teclado para andar.">
      <img className="gal__game kb" src={bg} alt="" />
      {ambients.map((src) => <img key={src} className="gal__amb" src={src} alt="" style={{ opacity: src === ambient ? 0.5 : 0 }} />)}
      <div className="gal__shade" aria-hidden="true" />
      <span className="gal__beam" aria-hidden="true" />
      <span className="gal__beam gal__beam--2" aria-hidden="true" />
      {Array.from({ length: 26 }, (_, k) => (
        <span key={k} className="gal__dust fx-heavy" aria-hidden="true" style={{ left: `${(k * 41.3) % 100}%`, top: `${20 + ((k * 29.7) % 65)}%`, width: k % 4 === 0 ? 3 : 2, height: k % 4 === 0 ? 3 : 2, animationDuration: `${(7 + (k % 6) * 1.5).toFixed(1)}s`, animationDelay: `${((k * 0.71) % 8).toFixed(2)}s` }} />
      ))}

      <div className="gal__top">
        <span className="mono gal__count">{String(sel + 1).padStart(2, '0')} / {items.length}{cur.kind !== 'agora' ? ` · História ${cur.hist}` : ''}</span>
        <div className="gal__topactions">
          {full && <span className="t gal__title">{title}</span>}
          <button className={`btn sm ${play.now ? 'now' : 'primary'}`} onClick={play.onClick} title={play.hint}>{play.now ? <span className="session-pill__dot" aria-hidden="true" /> : <Icon name="play" size={13} />}{play.label}</button>
          {full && <button className="btn ghost sm" onClick={onExitFull}><Icon name="sairTela" size={15} />Sair da tela cheia</button>}
        </div>
      </div>

      <div className="gal__frames"
        onPointerDown={(e) => { swipe.current = e.clientX; }}
        onPointerUp={(e) => { if (swipe.current == null) return; const dx = e.clientX - swipe.current; swipe.current = null; if (Math.abs(dx) > 50) go(sel + (dx < 0 ? 1 : -1)); }}>
        {items.map((x, i) => {
          const d = i - sel, ad = Math.abs(d), sg = Math.sign(d);
          const k = d === 0 ? 0 : sg * (0.55 + (ad - 1) * 0.2);
          const rot = d === 0 ? 0 : -sg * 52;
          const sc = d === 0 ? 1 : 0.8 - (ad - 1) * 0.06;
          const hidden = ad > 3;
          const onCenter = d === 0;
          return (
            <button key={x.id} className={`gal__fr${onCenter ? ' is-on' : ''}${x.kind === 'ponto' && !x.resolved ? ' is-back' : ''}`}
              tabIndex={hidden ? -1 : 0}
              aria-label={`${KIND_LONG[x.kind] ?? x.kind}, ${x.date}: ${x.title}${onCenter && x.image ? '. Abrir a foto.' : ''}`}
              style={{ transform: `translateX(calc(var(--fw) * ${k.toFixed(3)})) rotateY(${rot}deg) scale(${sc.toFixed(3)})`, zIndex: 20 - ad, opacity: hidden ? 0 : onCenter ? 1 : Math.max(0, 0.85 - (ad - 1) * 0.2), pointerEvents: hidden ? 'none' : undefined }}
              onClick={() => { if (!onCenter) go(i); else if (x.image && x.kind !== 'agora') setViewer(photos.indexOf(x)); }}>
              <span className="gal__in">{face(x)}{onCenter && x.image && x.kind !== 'agora' && <span className="gal__zoom" aria-hidden="true"><Icon name="telaCheia" size={14} /></span>}</span>
            </button>
          );
        })}
        <button className="gal__arrow gal__arrow--l" onClick={() => go(sel - 1)} disabled={sel === 0} aria-label="Anterior"><Icon name="voltar" size={20} /></button>
        <button className="gal__arrow gal__arrow--r" onClick={() => go(sel + 1)} disabled={sel === last} aria-label="Próximo"><Icon name="avancar" size={20} /></button>
      </div>

      <div className="gal__cap" key={cur.id} aria-live="polite">
        {cur.gap && <span className="mono gal__gap">{cur.gap}</span>}
        <span className={`kicker gal__kind k-${cur.kind}${cur.kind === 'ponto' && !cur.resolved ? ' is-back' : ''}`}>{KIND_LONG[cur.kind] ?? cur.kind}{cur.kind !== 'agora' ? ` · ${cur.date}` : ''}</span>
        <h3 className="t gal__title2">{cur.title}</h3>
        {cur.quote ? <p className="gal__quote">“{cur.quote}”</p> : cur.text && cur.kind !== 'agora' ? <p className="gal__text">{cur.text}</p> : null}
        <div className="gal__actions">
          {cur.kind === 'ponto' && cur.eventId && !cur.resolved && <button className="btn now sm" onClick={() => actions.resolveWaypoint(cur.eventId!)}>Marcar como resolvido</button>}
          {cur.kind === 'ponto' && cur.resolved && <span className="kicker">Resolvido</span>}
          {cur.kind === 'carta' && <span className="kicker">Lacrada até você zerar</span>}
          {cur.kind === 'agora' && (cur.today?.open ? <Link className="btn now sm" to="/sessao">Abrir a sessão</Link> : <button className={`btn sm ${play.now ? 'now' : 'primary'}`} onClick={play.onClick}>{play.label}</button>)}
          {cur.eventId && cur.kind !== 'carta' && !full && <button className="btn quiet sm" onClick={() => onEdit(cur.eventId!)}>Editar</button>}
        </div>
      </div>

      <div className={`gal__ruler${dense ? ' is-dense' : ''}${today ? ' has-today' : ''}`}>
        <div className="gal__rail" aria-hidden="true" />
        <div className="gal__fill" aria-hidden="true" style={{ width: `${pct(sel)}%` }} />
        {items.map((x, i) => x.gap ? (
          <span key={`g-${x.id}`} className="gal__gapline" aria-hidden="true" style={{ left: `calc(${pct(i - 1)}% + 10px)`, width: `calc(${pct(i) - pct(i - 1)}% - 20px)` }}><span className="mono">{x.gap}</span></span>
        ) : null)}
        {items.map((x, i) => x.kind === 'agora' ? (
          <button key={x.id} className={`gal__sun${i === sel ? ' is-on' : ''}`} style={{ left: `${pct(i)}%` }} onClick={() => go(i)} aria-label="Hoje"><span className="kicker kicker--now">Hoje</span></button>
        ) : (
          <button key={x.id} className={`gal__mk k-${x.kind}${i === sel ? ' is-on' : ''}${i < sel ? ' is-past' : ''}${x.kind === 'ponto' && !x.resolved ? ' is-back' : ''}`} style={{ left: `${pct(i)}%` }} onClick={() => go(i)} aria-label={`${KIND_LONG[x.kind] ?? x.kind}, ${x.date}: ${x.title}`} title={`${x.date} · ${x.title}`}>
            <i />{(!dense || i === sel || i === 0) && <span className="mono">{x.date.replace(/ \d{4}$/, '')}</span>}
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
  const photos = stops.filter((x) => x.image);
  useEffect(() => {
    if (!full) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onExitFull(); };
    document.addEventListener('keydown', esc);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', esc); document.body.style.overflow = ''; };
  }, [full, onExitFull]);
  let last = 0;
  return (
    <section className={`simple${full ? ' is-full' : ''}`} aria-label="Linha do tempo, modo simples">
      {full && <div className="simple__close"><span className="t">{title}</span><button className="btn ghost sm" onClick={onExitFull}><Icon name="sairTela" size={15} />Sair da tela cheia</button></div>}
      <ol className="simple__line">
        {[...stops].reverse().map((x) => {
          const head = x.kind !== 'gap' && x.hist !== last ? histories.find((h) => h.ordinal === x.hist) : null;
          if (x.kind !== 'gap') last = x.hist;
          return [
            head && (
              <li key={`h-${head.id}`} className="simple__head"><span className="t">História {head.ordinal}{head.title && !/^hist/i.test(head.title) ? `, ${head.title}` : ''}</span><span className="kicker">{STATE_LABEL[head.state]}</span></li>
            ),
            x.kind === 'gap' ? (
              <li key={x.id} className="simple__gap mono">{x.title}</li>
            ) : (
              <li key={x.id} className={`sev sev--${x.kind}${x.kind === 'ponto' && !x.resolved ? ' is-back' : ''}`}>
                <span className="mono sev__d">{x.date}</span>
                {x.image ? <button className="sev__img" onClick={() => setViewer(photos.indexOf(x))} aria-label={`Ver foto: ${x.title}`}><img src={x.image} alt="" loading="lazy" /></button> : null}
                <span className="sev__b">
                  <span className="sev__t">{x.title}</span>
                  {x.quote && <span className="sev__q">“{x.quote}”</span>}
                  {x.text && <span className="sev__g">{x.text}</span>}
                </span>
                <span className="mono sev__k">{KIND_SHORT[x.kind] ?? x.kind}</span>
                {x.eventId && x.kind !== 'carta' && !full && <button className="btn quiet sm sev__edit" onClick={() => onEdit(x.eventId!)} aria-label={`Editar: ${x.title}`}>Editar</button>}
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

/** Depois de um mês longe do jogo, o mascote dá as boas-vindas (no máximo uma vez por semana por jogo). */
function BackBuddy({ journeyId }: { journeyId: string }) {
  const s = useStore((x) => x);
  const r = recapFor(s, journeyId);
  return <Buddy line={useBuddy('voltou', (r?.daysAway ?? 0) >= 30, journeyId)} className="buddy--card" />;
}
