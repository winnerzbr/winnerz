import { SnipShareSheet } from '../components/SnipShare';
import { celebrateSmall } from '../components/MiniCelebration';
import { TrailerButton } from '../components/Trailer';
import { discordApi } from '../data/discordApi';
import { packAfterFinish } from '../components/album/afterFinish';
import { ShareCardButton } from '../components/ShareCard';
import { say as toneLine } from '../lib/tone';
import { ConfirmButton } from '../components/Sheet';
import { CapsuleSheet, CAPSULE_FIELDS } from '../components/Retomada';
import { CameoJornada } from '../components/IAmiguinho';
import { consumirZerado } from '../lib/iamiguinho';
import { CaptureImportSheet } from '../components/CaptureImport';
import { recapFor } from '../lib/recap';
import { zereiPedeConfirmacao, minutosDaHistoria } from '../lib/zerei';
import { WhatNext } from '../components/WhatNext';
import { useEffect, useMemo, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, useStore, historiesOf, currentHistory, eventsOf, sessionsOf, lastNote, lastSession, activeWaypoints, openSession, focusJourneys, isOpenState, daysAway } from '../data/store';
import { playStateFor } from '../components/PlayButton';
import { PhotoViewer } from '../components/MediaGallery';
import type { TimelineEvent, EventKind, History } from '../data/types';
import { Icon } from '../components/Icon';
import { Celebration, SealedLetter, PersonalSticker } from '../components/Celebration';
import { FeatsPanel, DifficultyField } from '../components/Feats';
import { dayMonth, dayMonthYear, longDay } from '../lib/format';
import { whenLabel } from '../lib/dates';
import { JourneyMenu, HistoryEditSheet, StateNoteSheet, STATE_LABEL } from '../components/JourneyManage';
import { EventEditSheet } from '../components/EventEditSheet';
import { ActionToast } from '../components/Toast';
import { PastButton } from '../components/PastPlay';
import { CoverArt } from '../components/CoverArt';
import { useBackdrop } from '../components/Backdrop';
import { FitCard, ComebackBlock, COMEBACK_AFTER_DAYS } from '../components/Comeback';
import { OutlineSheet } from '../components/Outline';
import { useOutline } from '../data/outlineApi';
import { isOpenWorld, partAt, partsTimeline, unitOf, type OutlinePart } from '../lib/outline';
import { useVideos } from '../data/videoApi';
import { PartVideoButton } from '../components/PartVideo';
import { RegionView } from '../components/RegionView';
import { Faixa, type FaixaToday } from '../components/Faixa';
import { PaintedMap } from '../components/PaintedMap';
import { buildTimeline, byParts, weaveEchoes, weaveParts, weaveTalks, durText, type TLItem, type ChapterItem, type Compare, type Talk } from '../lib/chapters';
import { echoApi, type Echoes, type AiStatus } from '../data/echoApi';
import { durLabel } from '../lib/format';
import { awayLabel } from '../lib/recap';


export const eventDate = (e: TimelineEvent, short = true) => e.dateLabel ?? whenLabel(e.at, e.precision, { short });

const FILTERS: [string, string, EventKind[] | null][] = [
  ['tudo', 'Tudo', null], ['sessao', 'Sessões', ['sessao']], ['momento', 'Momentos', ['momento', 'carta']],
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

  const [mode, setModeRaw] = useState<'faixa' | 'mapa'>(() => { try { return localStorage.getItem('wz.linha.modo') === 'mapa' ? 'mapa' : 'faixa'; } catch { return 'faixa'; } });
  const setMode = (m: 'faixa' | 'mapa') => { setModeRaw(m); setFull(false); try { localStorage.setItem('wz.linha.modo', m); } catch { /* sem armazenamento: só nesta visita */ } };
  // S3: organizar a linha pela estrutura do jogo (capítulos ou regiões) ou pela data.
  const [org, setOrgRaw] = useState<'estrutura' | 'data'>(() => { try { return localStorage.getItem('wz.linha.org') === 'data' ? 'data' : 'estrutura'; } catch { return 'estrutura'; } });
  const setOrg = (o: 'estrutura' | 'data') => { setOrgRaw(o); try { localStorage.setItem('wz.linha.org', o); } catch { /* só nesta visita */ } };
  const reduced = s.prefs.motion === 'reduzidas' || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const [filter, setFilter] = useState('tudo');
  // Qual História a linha mostra: a atual por padrão; 0 = todas.
  const [histSel, setHistSel] = useState<number>(current.ordinal);
  const [full, setFull] = useState(false);
  const [celebrating, setCelebrating] = useState<History | null>(null);
  /** Depois de fechar a comemoração (aqui ou na sessão), o IAmiguinho dá os parabéns no canto. */
  const [posZerado, setPosZerado] = useState<string | null>(() => consumirZerado());
  const [saved, setSaved] = useState(0);
  const [wpViewer, setWpViewer] = useState<number | null>(null);
  const [progress, setProgress] = useState(current.progress ?? 0);
  const [menu, setMenu] = useState(false);
  const [capsuleOpen, setCapsuleOpen] = useState(false);
  const [captures, setCaptures] = useState(false);
  const [editHist, setEditHist] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<string | null>(null);
  const [shareEvent, setShareEvent] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string; historyId?: string } | null>(null);
  useEffect(() => setProgress(current.progress ?? 0), [current.id, current.progress]);
  useEffect(() => setHistSel(current.ordinal), [current.ordinal]);

  const selHist = histSel ? histories.find((h) => h.ordinal === histSel) ?? current : null;
  const events = selHist ? allEvents.filter((e) => e.historyId === selHist.id) : allEvents;


  const commitProgress = (v: number) => {
    const before = current.progress ?? 0;
    actions.setProgress(current.id, v); setSaved((n) => n + 1);
    if (before < 50 && v >= 50 && v < 100) celebrateSmall('Metade do caminho', toneLine('metade', s.prefs.tone));
  };

  const zerei = () => {
    const h = current;
    actions.completeHistory(h.id);
    discordApi.publish('zerou', h.id);
    packAfterFinish(h.id, game.id);
    setCelebrating({ ...h });
  };

  /** A carta de cada História: lacrada enquanto joga, pronta para abrir depois de zerar, ou já aberta. */
  const letters = Object.fromEntries(histories.filter((h) => h.letter).map((h) => [h.id, { ready: h.state === 'concluida', text: h.letter!.openedAt ? h.letter!.text : undefined }]));


  const stickerImage = [...allEvents].reverse().find((e) => e.image)?.image ?? bg ?? game.cover;

  // Botão de jogar: abre a sessão deste jogo, ou leva à sessão já aberta (nunca troca uma sessão em silêncio).
  const ps = playStateFor(s, game.id);
  const playCta: PlayCta = { label: ps.label, now: ps.now, onClick: ps.go, hint: ps.hint };
  const chosenFocus = focusJourneys(s).filter((f) => f.chosen).map((f) => f.journey.id);
  const isFocus = chosenFocus.includes(journeyId);
  const toggleFocus = () => {
    if (isFocus) { actions.removeFocus(journeyId); return; }
    if (!actions.addFocus(journeyId)) setToast({ id: Date.now(), text: 'Você já tem 3 jogos em “Jogando agora”. Tire um deles para pôr este.' });
  };
  const stateChanged = (historyId: string, text: string) => setToast({ id: Date.now(), text, historyId: /De volta/.test(text) ? undefined : historyId });
  const openState = current.state === 'ativa' || current.state === 'pausada';
  const histLabel = (h: History) => [`História ${h.ordinal}`, h.title && !/^hist[óo]ria \d/i.test(h.title) ? h.title : null, h.state === 'concluida' ? 'Zerada' : h.state === 'dropada' ? 'Largada' : h.state === 'encerrada' ? 'Encerrada' : null].filter(Boolean).join(' · ');
  const nSessSel = selHist ? sessionsOf(s, selHist.id).length : s.sessions.filter((x) => x.journeyId === journeyId).length;
  const where = current.capsule?.where ?? last?.whereStopped;
  const extra = CAPSULE_FIELDS.filter((f) => f.key !== 'where' && current.capsule?.[f.key]);
  const away = daysAway(s, journeyId);
  // Uma semana longe: "Onde você parou" vira o bloco de volta (a antiga página "Preparar a volta").
  const back = away != null && away >= COMEBACK_AFTER_DAYS && isOpenState(current.state);
  useEffect(() => {
    if (location.hash === '#voltar') document.getElementById('voltar')?.scrollIntoView({ block: 'start' });
    if (location.hash === '#progresso') setTimeout(() => document.getElementById('progresso')?.scrollIntoView({ block: 'center' }), 50);
  }, [journeyId]);
  const showToday = !selHist || selHist.id === current.id ? isOpenState(current.state) : false;
  const allItems: TLItem[] = useMemo(() => buildTimeline({
    events, sessions: s.sessions, allEvents: s.events, journeyId, today: showToday,
    gameTitleOf: (jid) => { const j = s.journeys.find((x) => x.id === jid); return j ? s.games[j.gameId]?.title : undefined; },
  }), [events, s.sessions, s.events, s.journeys, s.games, journeyId, showToday]);
  // Ecos dos amigos (só até o seu progresso) e a comparação anônima: só na História em andamento.
  const [echoes, setEchoes] = useState<Echoes | null>(null);
  const [compare, setCompare] = useState<Compare | null>(null);
  const [ai, setAi] = useState<AiStatus | null>(null);
  const online = s.mode !== 'supabase' || !!s.profile;
  useEffect(() => {
    if (!online) return;
    let live = true;
    echoApi.echoes(game.id, current.progress ?? null).then((r) => { if (live) setEchoes(r); }).catch(() => null);
    return () => { live = false; };
  }, [game.id, current.progress, online]);
  useEffect(() => {
    if (!online) return;
    let live = true;
    echoApi.compare(game.id).then((r) => { if (live) setCompare(r); }).catch(() => null);
    echoApi.aiStatus().then((r) => { if (live) setAi(r); }).catch(() => null);
    return () => { live = false; };
  }, [game.id, online]);
  // O que você escreveu na comunidade sobre o jogo, no período da História mostrada.
  const [talks, setTalks] = useState<Talk[]>([]);
  useEffect(() => {
    if (!online) return;
    let live = true;
    echoApi.talks(game.id).then((r) => { if (live) setTalks(r); }).catch(() => null);
    return () => { live = false; };
  }, [game.id, online]);
  const nSessCur = sessionsOf(s, current.id).length;
  const woven: TLItem[] = useMemo(() => {
    // A comparação com outros jogadores só aparece com alguma estrada percorrida (3 sessões): antes disso é ruído.
    const cmp = compare?.enough && nSessCur >= 3 ? { type: 'compare' as const, id: 'comparar' as const, data: compare, mine: current.progress } : null;
    const base = showToday ? weaveEchoes(allItems, echoes?.echoes ?? [], cmp) : allItems;
    const ats = events.map((e) => e.at).sort();
    const from = ats[0], to = showToday ? null : ats.at(-1);
    return weaveTalks(base, talks.filter((t) => (!from || t.at >= from) && (!to || t.at <= to)));
  }, [allItems, echoes, compare, showToday, current.progress, nSessCur, talks, events]);
  // Capítulos do jogo: os passados na data em que você chegou, os à frente depois do "Hoje" (só na História em andamento).
  const outline = useOutline(game.id);
  const partRows = useMemo(() => {
    if (!outline?.parts.length || (selHist && selHist.id !== current.id)) return [];
    return partsTimeline(outline.parts, current.partLog, partAt(outline.parts, current.progress, current.part));
  }, [outline, current.partLog, current.progress, current.part, selHist, current.id]);
  const withParts = useMemo(() => weaveParts(woven, partRows), [woven, partRows]);
  const curPart = partRows.find((r) => r.state === 'atual');
  const narrations = useMemo(() => Object.fromEntries(histories.flatMap((h) => Object.entries(h.narrations ?? {}).map(([k, v]) => [k, v.text]))), [histories]);
  const factsOf = (c: ChapterItem): string[] => allItems.filter((x): x is Extract<TLItem, { type: 'event' }> => x.type === 'event' && x.chapter === c.n && x.e.historyId === c.historyId).map(({ e, session: x }) => {
    const when = eventDate(e, false);
    if (e.kind === 'sessao') return [`${when}: ${e.title}`, x?.minutes ? durText(x.minutes) : '', x?.whereStopped ? `parou em ${x.whereStopped}` : '', x?.feeling ? `disse que foi “${x.feeling}”` : '', x?.companions?.length ? `jogou com ${x.companions.join(', ')}` : '', x?.note ? `deixou o recado “${x.note}”` : ''].filter(Boolean).join(', ');
    if (e.kind === 'carta') return `${when}: escreveu uma carta para o fim (lacrada)`;
    const label = e.kind === 'momento' ? 'momento guardado' : e.kind === 'ponto' ? 'lugar marcado para voltar' : e.kind === 'marco' ? 'marco' : 'começo';
    return `${when}: ${label} “${e.title}”${e.quote ? `, com a frase “${e.quote}”` : ''}${e.text ? ` (${e.text})` : ''}`;
  });
  const narrate = ai?.enabled ? {
    saved: narrations,
    left: Math.max(0, ai.limit - ai.used),
    ask: async (c: ChapterItem, range: string) => {
      const text = await echoApi.narrate({ game: game.title, chapter: c.n, name: c.name, range, summary: c.summary, facts: factsOf(c) });
      setAi((a) => (a ? { ...a, used: a.used + 1 } : a));
      return text;
    },
    save: (c: ChapterItem, text: string) => actions.setNarration(c.historyId, c.id, text),
  } : null;

  const groups = FILTERS.find((f) => f[0] === filter)![2];
  const visible = useMemo(() => {
    if (!groups) return withParts;
    const kept = allItems.filter((x) => x.type !== 'event' || groups.includes(x.e.kind));
    const used = new Set(kept.filter((x) => x.type === 'event').map((x) => (x as { chapter: number }).chapter));
    return kept.filter((x) => x.type !== 'chapter' || used.has(x.n));
  }, [allItems, withParts, groups]);
  const hasEvents = visible.some((x) => x.type === 'event');
  // S3: com a lista do jogo (na História em andamento), a linha se organiza pelos capítulos ou pelas regiões.
  const vids = useVideos(game.id, (outline?.parts.length ?? 0) > 1);
  const structured = !!outline && outline.parts.length > 1 && (!selHist || selHist.id === current.id);
  const openWorld = structured && isOpenWorld(outline);
  const byStructure = structured && org === 'estrutura';
  const structItems = useMemo(() => {
    if (!byStructure || openWorld || !outline) return [];
    const base = groups ? woven.filter((x) => x.type !== 'event' || groups.includes(x.e.kind)) : woven;
    return byParts(base, { parts: outline.parts, log: current.partLog, cur: partAt(outline.parts, current.progress, current.part), sessionOf: (id) => (id ? s.sessions.find((x) => x.id === id) : undefined) });
  }, [byStructure, openWorld, outline, woven, groups, current.partLog, current.progress, current.part, s.sessions]);
  // "Estou aqui" na linha do tempo: muda o capítulo da História (o progresso vai para o começo dele).
  const [listOpen, setListOpen] = useState(false);
  const pickPart = (p: OutlinePart) => {
    if (!outline) return;
    if (openWorld) actions.markOpenPart(current.id, p.id);
    else actions.setHistoryPart(current.id, { id: p.id, pct: p.pct }, outline.parts);
  };
  const videoOf = (p: OutlinePart, label: string) => <PartVideoButton gameId={game.id} gameTitle={game.title} part={p} label={label} videos={vids} onDark />;
  const u = unitOf(outline);
  const todayInfo: FaixaToday | null = showToday ? { where, note: note?.note, away, slug: game.slug, open: !!openHere, friends: echoes?.friends ?? [], part: curPart ? { n: curPart.n, total: curPart.total, name: curPart.part.name } : undefined } : null;

  return (
    <main className="journey">
      <section className="jhero on-photo" aria-labelledby="jtitle">
        {bg && <img className="jhero__bg" src={bg} alt="" />}
        <div className="jhero__shade" aria-hidden="true" />
        <div className="jhero__fade" aria-hidden="true" />
        <div className="page jhero__in">
          <Link to="/jornada" className="back jhero__back">← Jornada</Link>
          <div className="jhero__row">
            <Link to={`/jogos/${game.slug}`} className="jhero__cover" aria-label="Abrir a ficha do jogo"><CoverArt game={game} lazy={false} /></Link>
            <div className="jhero__info">
              {histories.length > 1 && (
                <nav className="subnav jhero__hists" aria-label="Histórias">
                  {histories.map((h) => <button key={h.id} aria-current={histSel === h.ordinal ? 'true' : undefined} onClick={() => setHistSel(h.ordinal)}>{histLabel(h)}</button>)}
                  <button aria-current={histSel === 0 ? 'true' : undefined} onClick={() => setHistSel(0)}>Todas</button>
                </nav>
              )}
              <div className="jhero__top">
              <div className="jhero__head">
              <h1 id="jtitle" className="t jhero__title">{game.title}</h1>
              {!light && (
                // Fresta: os números entram numa frase, no lugar de "número grande + legenda".
                // A tela se adapta ao que você registra: contadores zerados não aparecem.
                <p className="jstats-line">
                  {totalSessions > 0
                    ? <>Você jogou <b>{totalSessions} {totalSessions === 1 ? 'sessão' : 'sessões'}</b>{histories.length > 1 && <> em <b>{histories.length} histórias</b></>}{moments > 0 && <> e guardou <b>{moments} {moments === 1 ? 'momento' : 'momentos'}</b></>}.</>
                    : <>Nenhuma sessão ainda.</>}
                  {waypoints.length > 0 && <> <span className="jstats-line__now"><b>{waypoints.length}</b> {waypoints.length === 1 ? 'ponto' : 'pontos'} para voltar.</span></>}
                </p>
              )}
              <DifficultyField key={current.id} history={current} inline />
              </div>
              {openState && (
                // O ponto de luz é o próprio controle: arrastar já grava o progresso, sem descer até outro cartão.
                <div className="jhero__prog" id="progresso">
                  <div className="jhero__progrow">
                    <input className="jhero__range" type="range" min={0} max={100} step={1} value={progress}
                      style={{ ['--p' as string]: `${progress}%` }}
                      aria-label={`Seu progresso ${current.ordinal > 1 ? `na ${current.title}` : 'nesta História'}`} aria-valuetext={`${progress} por cento`}
                      onChange={(e) => setProgress(Number(e.target.value))}
                      onPointerUp={() => commitProgress(progress)} onKeyUp={() => commitProgress(progress)} onBlur={() => progress !== current.progress && commitProgress(progress)} />
                    <span className="mono jhero__pct">{progress}%</span>
                  </div>
                  <p className="jhero__arraste">
                    <span>Arraste para informar</span>
                    <span className="dica" tabIndex={0} aria-label="Chegar a 100% não marca Zerou sozinho.">
                      <span className="dica__i" aria-hidden="true">i</span>
                      <span className="dica__txt" role="tooltip">Chegar a 100% não marca Zerou sozinho.</span>
                    </span>
                    <span className="jprog__saved" aria-live="polite">{saved > 0 && <span key={saved} className="ok-flash">Salvo</span>}</span>
                  </p>
                </div>
              )}
              </div>
              <div className="jhero__actions">
              <button className={`btn ${playCta.now ? 'now' : 'primary'}`} onClick={playCta.onClick} title={playCta.hint}>
                {playCta.now ? <span className="session-pill__dot" aria-hidden="true" /> : <Icon name="play" size={14} />}{playCta.label}
              </button>
              {openState && (
                <button className="btn ghost focus-toggle" aria-pressed={isFocus} onClick={toggleFocus}>
                  <span className="focus-toggle__dot" aria-hidden="true" />{isFocus ? (
                    // Com o mouse em cima, o botão diz o que o clique faz: tirar de "Jogando agora".
                    <><span className="focus-toggle__agora">{chosenFocus[0] === journeyId && chosenFocus.length > 1 ? 'Jogando agora · principal' : 'Jogando agora'}</span><span className="focus-toggle__pausa" aria-hidden="true">Dei uma pausa</span></>
                  ) : 'Estou jogando'}
                </button>
              )}
              {openState && (zereiPedeConfirmacao(minutosDaHistoria(s.sessions, current.id), current.progress)
                ? <ConfirmButton className="btn ghost" label={<><span className="diamond" aria-hidden="true" />Zerei</>} confirm="Pouco tempo e pouco progresso. Zerou mesmo? Toque de novo" onConfirm={zerei} />
                : <button className="btn ghost" onClick={zerei}><span className="diamond" aria-hidden="true" />Zerei</button>)}
              {openState && <button className="btn ghost" onClick={() => { actions.setHistoryState(current.id, 'dropada'); stateChanged(current.id, current.state === 'ativa' ? 'Largado, sem culpa. Dá para retomar quando quiser.' : 'Largado, sem culpa.'); }}>Largar</button>}
              {openState && <button className="btn ghost" onClick={() => { actions.setHistoryState(current.id, 'encerrada'); stateChanged(current.id, 'Encerrado do seu jeito.'); }}>Encerrar sem zerar</button>}
              <button className="btn ghost icon" onClick={() => setMenu(true)} aria-haspopup="dialog" aria-label="Mais opções" title="Mais opções"><Icon name="maisAcoes" size={17} /></button>
            </div>
            </div>
          </div>
          {playCta.hint && <p className="faint jhero__hint">{playCta.hint}</p>}
        </div>
      </section>

      <div className="page jbody">
        {isOpenState(current.state) && <BackBuddy journeyId={journeyId} />}
        <FitCard journeyId={journeyId} onPaused={(id) => stateChanged(id, 'Pausado. Ele espera, sem pressa.')} />

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

        {/* Etapa 2 da revisão: no alto, só onde você parou (ou o bloco de volta), o Jogar e a linha do tempo. */}
        {current.state === 'concluida' ? (
          <div className="jcards">
            <section className="card jprog jprog--done">
              <span className="kicker jprog__gold">História concluída</span>
              <p className="t jprog__title">{current.title}</p>
              <p className="muted">Zerou em {current.completedAt ? dayMonthYear(current.completedAt) : 'data não informada'}. Nada é obrigatório agora. Se quiser, comece outra História: esta continua guardada.</p>
              <div className="jprog__actions">
                <button className="btn ghost" onClick={() => { actions.play(game.id); navigate('/sessao'); }}>Jogar de novo</button>
                <TrailerButton game={game} history={current} className="btn ghost" />
                <ConfirmButton className="btn quiet sm" label="Não zerei: desfazer" confirm="Toque de novo: volta a “jogando”" onConfirm={() => actions.reopenHistory(current.id)} />
              </div>
              {current.letter && <SealedLetter key={current.id} text={current.letter.text} date={dayMonthYear(current.startedAt)} opened={!!current.letter.openedAt} onOpen={() => actions.openLetter(current.id)} />}
              <FeatsPanel key={`f-${current.id}`} history={current} />
            </section>
            <section className="card jcap" aria-labelledby="capsula">
              <div className="jcap__head">
                <h2 id="capsula" className="t">{waypoints.length === 1 ? 'Um ponto ficou aberto' : `${waypoints.length} pontos ficaram abertos`}</h2>
                <button className="btn ghost sm" onClick={() => waypoints.forEach((w) => actions.resolveWaypoint(w.id))}>Resolver todos</button>
              </div>
              <p className="muted">Você zerou com estes pontos para voltar. Resolva os que já não importam; os outros esperam uma próxima História.</p>
              <div className="jcap__wps">
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
            </section>
          </div>
        ) : current.state === 'dropada' || current.state === 'encerrada' ? null : back ? (
          <ComebackBlock journeyId={journeyId} game={game} history={current} onCapsule={() => setCapsuleOpen(true)} onViewWaypoint={(i) => i >= 0 && setWpViewer(i)} />
        ) : (
          <div className="jcards">
            <section className="card jcap" aria-labelledby="capsula">
              <div className="jcap__head">
                <h2 id="capsula" className="t">Onde você parou</h2>
                <span className="jcap__tools"><Link className="btn quiet sm" to={`/jogos/${game.slug}/traduzir`}>Traduzir a tela</Link><button className="btn quiet sm" onClick={() => setCapsuleOpen(true)}>{current.capsule ? 'Atualizar a Cápsula' : 'Montar a Cápsula'}</button></span>
              </div>
              <div className="jcap__grid">
                {where && <div><span className="kicker">Lugar</span><strong>{where}</strong></div>}
                {last && <div><span className="kicker">Última sessão</span><span className="mono">{longDay(last.startedAt)}{last.minutes ? ` · ${dur(last.minutes)}` : ''}{away != null && away > 1 ? ` · ${awayLabel(away)}` : ''}</span></div>}
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
        )}


        <section className="jline" aria-labelledby="jline-h">
          <div className="jline__head">
            <div>
              <h2 id="jline-h" className="t">{selHist ? (selHist.ordinal > 1 || histories.length > 1 ? `A História ${selHist.ordinal}` : 'A sua História') : 'Todas as Histórias'}</h2>
              <p className="muted">{selHist ? `${selHist.title && !/^hist/i.test(selHist.title) ? `${selHist.title}. ` : ''}Começou em ${whenLabel(selHist.startedAt, selHist.startedPrecision ?? 'dia')}.` : `Desde ${allEvents[0] ? eventDate(allEvents[0], false) : '—'}.`}{!light ? ` ${nSessSel} ${nSessSel === 1 ? 'sessão' : 'sessões'}, ${events.length} ${events.length === 1 ? 'registro' : 'registros'}.` : ''}</p>
            </div>
            <div className="jline__tools">
              {structured && (
                <div className="seg seg--sm" role="group" aria-label="Organizar a linha do tempo">
                  <button aria-pressed={org === 'estrutura'} onClick={() => setOrg('estrutura')}>{openWorld ? 'Por região' : `Por ${u.one.toLowerCase()}`}</button>
                  <button aria-pressed={org === 'data'} onClick={() => setOrg('data')}>Por data</button>
                </div>
              )}
              {!(byStructure && openWorld) && <div className="seg seg--sm" role="group" aria-label="Modo da linha do tempo">
                <button aria-pressed={mode === 'faixa'} onClick={() => setMode('faixa')}>Rolagem</button>
                <button aria-pressed={mode === 'mapa'} onClick={() => setMode('mapa')}>Mapa</button>
              </div>}
              <button className="btn quiet sm" onClick={() => setCaptures(true)}><Icon name="camera" size={15} />Capturas de tela</button>
              {(mode === 'faixa' || (byStructure && openWorld)) && <button className="btn ghost sm" onClick={() => setFull(true)}><Icon name="telaCheia" size={15} />Tela cheia</button>}
            </div>
          </div>
          <div className="chips jline__filters" role="group" aria-label="Mostrar na linha">
            {FILTERS.map(([id, label]) => <button key={id} className="chip" aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>)}
          </div>
          {captures && <CaptureImportSheet journeyId={journeyId} gameTitle={game.title} onClose={() => setCaptures(false)} />}

          {byStructure && openWorld && outline ? (
            <RegionView outline={outline} history={current} sessions={sessionsOf(s, current.id)} images={[game.backdrop, ...(game.artworks ?? []), ...(game.screenshots ?? []), game.cover].filter((x): x is string => !!x)} play={playCta} today={showToday ? { open: !!openHere, note: note?.note } : null} video={videoOf} title={game.title} full={full} onExitFull={() => setFull(false)} onPickPart={pickPart} />
          ) : !hasEvents && !todayInfo && !byStructure ? (
            <p className="card tl-empty">Nada deste tipo nesta História ainda.</p>
          ) : mode === 'faixa' && byStructure ? (
            <Faixa items={structItems} parts={{ list: outline!.parts, now: current.progress ?? null }} video={videoOf} onPickPart={showToday ? pickPart : undefined} onOpenList={showToday ? () => setListOpen(true) : undefined} bg={bg ?? game.cover} images={[game.backdrop, ...(game.artworks ?? []), ...(game.screenshots ?? [])].filter((x): x is string => !!x)} title={game.title} play={playCta} today={todayInfo} onEdit={setEditEvent} onShare={setShareEvent} full={full} onExitFull={() => setFull(false)} reduced={reduced} light={light} unit={u} letters={letters} />
          ) : mode === 'faixa' ? (
            <Faixa items={visible} bg={bg ?? game.cover} images={[game.backdrop, ...(game.artworks ?? []), ...(game.screenshots ?? [])].filter((x): x is string => !!x)} title={game.title} play={playCta} today={todayInfo} onEdit={setEditEvent} onShare={setShareEvent} full={full} onExitFull={() => setFull(false)} reduced={reduced} light={light} narrate={narrate} unit={unitOf(outline)} letters={letters} />
          ) : (
            <PaintedMap items={visible} historyId={selHist?.id ?? `todas-${journeyId}`} title={game.title} subtitle={selHist ? (selHist.ordinal > 1 ? `${selHist.title}, História ${selHist.ordinal} · mapa da Jornada` : 'Mapa da Jornada') : 'Todas as Histórias · mapa da Jornada'} play={playCta} today={todayInfo} onEdit={setEditEvent} reduced={reduced} />
          )}
        </section>
      </div>

      {celebrating && (
        <Celebration
          title={toneLine('zerou', s.prefs.tone)}
          subtitle={`${game.title}${celebrating.ordinal > 1 ? `, sua ${celebrating.title}` : ''}. De ${dayMonthYear(celebrating.startedAt)} a hoje. ${toneLine('zerouSub', s.prefs.tone)}`}
          onClose={() => { setPosZerado(celebrating.id); setCelebrating(null); }}
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
            <TrailerButton game={game} history={s.histories.find((x) => x.id === celebrating.id) ?? celebrating} />
          </div>
          <WhatNext game={game} onPick={() => setCelebrating(null)} />
        </Celebration>
      )}
      {posZerado && !celebrating && <CameoZerado key={posZerado} historyId={posZerado} journeyId={journeyId} />}
      {listOpen && outline && <OutlineSheet game={game} history={current} outline={outline} onClose={() => setListOpen(false)} />}
      {menu && <JourneyMenu journeyId={journeyId} onClose={() => setMenu(false)} onEditHistory={setEditHist} onStateChanged={stateChanged} />}
      {editHist && <HistoryEditSheet historyId={editHist} onClose={() => setEditHist(null)} />}
      {editEvent && <EventEditSheet eventId={editEvent} onClose={() => setEditEvent(null)} />}
      {shareEvent && s.events.some((x) => x.id === shareEvent) && <SnipShareSheet event={s.events.find((x) => x.id === shareEvent)!} game={game} onClose={() => setShareEvent(null)} />}
      {noteFor && <StateNoteSheet historyId={noteFor} onClose={() => setNoteFor(null)} />}
      {toast && <ActionToast key={toast.id} text={toast.text} action={toast.historyId ? 'Escrever por quê' : undefined} onAction={() => setNoteFor(toast.historyId!)} onDone={() => setToast(null)} />}
      {wpViewer !== null && (
        <PhotoViewer title={game.title} items={waypoints.filter((x) => x.image).map((x) => ({ kind: 'image' as const, src: x.image!, label: x.title }))} start={Math.max(0, wpViewer)} onClose={() => setWpViewer(null)} />
      )}
    </main>
  );
}

type PlayCta = { label: string; now: boolean; onClick: () => void; hint?: string };
const dur = (m: number) => durLabel(m);

/**
 * Retomada: depois de um mês longe do jogo, o IAmiguinho dá as boas-vindas com os dias reais (no máximo uma vez por
 * semana por jogo). A fala pode vir da IA, só com o nome do jogo e os dias.
 */
function BackBuddy({ journeyId }: { journeyId: string }) {
  const s = useStore((x) => x);
  const r = recapFor(s, journeyId);
  const j = s.journeys.find((x) => x.id === journeyId);
  const dias = r?.daysAway ?? 0;
  return dias >= 30 && j ? <CameoJornada motivo="voltou" escopo={journeyId} fatos={{ jogo: s.games[j.gameId]?.title, dias }} /> : null;
}

/** Jogo zerado: o primeiro da vida é um marco (aparece até no modo Discreto); os outros, um por História. */
function CameoZerado({ historyId, journeyId }: { historyId: string; journeyId: string }) {
  const s = useStore((x) => x);
  const h = s.histories.find((x) => x.id === historyId);
  const j = s.journeys.find((x) => x.id === journeyId);
  if (!h || !j || h.journeyId !== journeyId) return null;
  const primeira = s.histories.filter((x) => x.state === 'concluida').length <= 1;
  return <CameoJornada motivo={primeira ? 'primeiro-zerado' : 'zerado'} escopo={primeira ? '' : historyId} fatos={{ jogo: s.games[j.gameId]?.title }} atraso={700} />;
}
