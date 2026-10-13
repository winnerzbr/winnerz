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

function CinemaTimeline({ stops, bg, full, onExitFull, play, title, onEdit, today }: { stops: Stop[]; bg: string; full: boolean; onExitFull: () => void; play: PlayCta; title: string; onEdit: (eventId: string) => void; today: { open: boolean; n: number } | null }) {
  const [viewer, setViewer] = useState<number | null>(null);
  const stage = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const photos = stops.filter((x) => x.image);

  // Começa no fim da película: o mais recente (e o "hoje") à vista.
  useEffect(() => {
    const el = scroller.current; if (!el) return;
    const end = () => el.scrollTo({ left: el.scrollWidth, behavior: 'instant' as ScrollBehavior });
    end(); const t = setTimeout(end, 250);
    return () => clearTimeout(t);
  }, [stops.length, full]);

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

  const page = (d: number) => { const el = scroller.current; if (el) el.scrollBy({ left: d * Math.max(320, el.clientWidth * 0.7), behavior: 'smooth' }); };
  const key = (e: ReactKeyboardEvent) => { if (e.key === 'ArrowRight') { e.preventDefault(); page(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); page(-1); } };

  const media = (x: Stop) => {
    if (x.image) return <button className="fr__img" onClick={() => setViewer(photos.indexOf(x))} aria-label={`Ver foto em tamanho grande: ${x.title}`}><img src={x.image} alt="" loading="lazy" /><span className="fr__zoom" aria-hidden="true"><Icon name="telaCheia" size={14} /></span></button>;
    if (x.kind === 'inicio') return <div className="fr__ph fr__ph--start"><BrandMark width={40} /><span className="t">{x.title}</span></div>;
    if (x.kind === 'marco') return <div className="fr__ph fr__ph--gold"><Compass size={30} color="#E2BE84" /><span className="t">{x.title}</span></div>;
    if (x.kind === 'carta') return <div className="fr__ph"><span className="kicker">Carta para o fim</span><span className="fr__ph-text">Trancada até você zerar.</span></div>;
    if (x.kind === 'sessao') return <div className="fr__ph">{x.minutes ? <span className="t fr__big">{dur(x.minutes)}</span> : <span className="t fr__big fr__big--sm">{x.title}</span>}<span className="muted">{[x.startedAt ? periodOf(x.startedAt) : null, x.companions?.length ? `com ${x.companions.join(', ')}` : null].filter(Boolean).join(', ') || 'Sessão registrada'}</span></div>;
    return <div className="fr__ph">{x.quote ? <span className="fr__ph-text">“{x.quote}”</span> : <span className="t fr__big fr__big--sm">{x.title}</span>}</div>;
  };

  return (
    <section ref={stage} className={`film${full ? ' is-full on-photo' : ''}`} aria-label="Linha do tempo, modo cinema">
      {full && (
        <>
          <img className="film__bg" src={bg} alt="" />
          <div className="film__shade" aria-hidden="true" />
          <div className="film__top">
            <span className="t film__title">{title}</span>
            <div className="film__topactions">
              <button className={`btn ${play.now ? 'now' : 'primary'} sm`} onClick={play.onClick} title={play.hint}>{play.now ? <span className="session-pill__dot" aria-hidden="true" /> : <Icon name="play" size={13} />}{play.label}</button>
              <button className="btn ghost sm" onClick={onExitFull}><Icon name="sairTela" size={15} />Sair da tela cheia</button>
            </div>
          </div>
        </>
      )}
      <div className="film__scroll" ref={scroller} tabIndex={0} onKeyDown={key} aria-label="Película da História: use as setas para andar">
        <ol className="film__strip">
          {stops.map((x) => x.kind === 'gap' ? (
            <li key={x.id} className="fr-gap"><span className="mono">{x.title}</span></li>
          ) : (
            <li key={x.id} className={`fr fr--${x.kind}${x.kind === 'ponto' && !x.resolved ? ' is-back' : ''}`}>
              <div className="fr__media">{media(x)}</div>
              <span className="fr__stem" aria-hidden="true" />
              <span className="fr__mk" aria-hidden="true" />
              <div className="fr__cap">
                <span className="mono fr__d">{x.date} · {x.kind === 'sessao' && /^sess/i.test(x.title) ? x.title : KIND_SHORT[x.kind] ?? x.kind}</span>
                <span className="fr__t">{x.kind === 'sessao' && /^sess/i.test(x.title) ? (x.quote ?? x.text ?? x.title) : x.title}</span>
                {x.kind !== 'sessao' && (x.quote || x.text) && <span className="fr__n">{x.quote ? `“${x.quote}”` : x.text}</span>}
                <span className="fr__tools">
                  {x.kind === 'ponto' && x.eventId && !x.resolved && <button className="btn ghost sm" onClick={() => actions.resolveWaypoint(x.eventId!)}>Resolver</button>}
                  {x.kind === 'ponto' && x.resolved && <span className="kicker">Resolvido</span>}
                  {x.eventId && x.kind !== 'carta' && !full && <button className="btn quiet sm" onClick={() => onEdit(x.eventId!)} aria-label={`Editar: ${x.title}`}>Editar</button>}
                </span>
              </div>
            </li>
          ))}
          {today && (
            <li className="fr fr--today">
              <div className="fr__media">
                <div className="fr__ph fr__ph--today">
                  <span className="t">{today.open ? 'Agora' : 'Hoje'}</span>
                  <span className="muted">{today.open ? `Sessão ${today.n} aberta` : `Sessão ${today.n} espera`}</span>
                  {today.open ? <Link className="btn now sm" to="/sessao">Abrir a sessão</Link> : <button className={`btn ${play.now ? 'now' : 'primary'} sm`} onClick={play.onClick}>{play.label}</button>}
                </div>
              </div>
              <span className="fr__stem" aria-hidden="true" />
              <span className="fr__mk fr__mk--today" aria-hidden="true" />
              <div className="fr__cap"><span className="mono fr__d fr__d--now">{new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'America/Sao_Paulo' }).replace(/\./g, '').replace(',', '').replace(' de ', ' ')}</span></div>
            </li>
          )}
        </ol>
      </div>
      <div className="film__nav">
        <button className="btn ghost icon sm" onClick={() => page(-1)} aria-label="Voltar na película"><Icon name="voltar" size={16} /></button>
        <button className="btn ghost icon sm" onClick={() => page(1)} aria-label="Avançar na película"><Icon name="avancar" size={16} /></button>
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
