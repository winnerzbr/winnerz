import { featBadge, sortFeats } from '../lib/feats';
import { PastSessionButton } from '../components/PastSession';
import { Buddy, useBuddy } from '../components/Buddy';
import { BridgeInbox } from '../components/Bridges';
import { useState } from 'react';
import { Link } from '../lib/router';
import { actions, useStore, currentHistory, historiesOf, lastNote, sessionsOf, focusJourneys, activeWaypoints } from '../data/store';
import { MoreActions, type MoreItem } from '../components/MoreActions';
import { useBridges, PROVIDER_NAME, type Provider } from '../data/bridgeApi';
import { navigate } from '../lib/router';
import { assistiLabel } from '../components/Assisti';
import type { State, Journey, History } from '../data/types';
import { dayMonth, durLabel } from '../lib/format';
import { whenLabel, partsOf, localDay } from '../lib/dates';
import { shortPlatform } from '../lib/platforms';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
import { formatScore } from '../lib/rating';
import { ActionToast } from '../components/Toast';
import { PlayButton } from '../components/PlayButton';
import { ReviewCard } from './Review';
import { Backdrop } from '../components/Backdrop';
import { BrandMark } from '../components/Brand';
import { MascoteVazio } from '../components/IAmiguinho';


function rowFor(s: State, j: Journey) {
  const h = currentHistory(s, j.id);
  const last = [...s.sessions].filter((x) => x.journeyId === j.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const copy = s.copies.find((c) => c.gameId === j.gameId);
  return { j, g: s.games[j.gameId], h, n: historiesOf(s, j.id).length, last, note: lastNote(s, j.id), platform: copy ? shortPlatform(copy.platform) : undefined };
}
type Row = ReturnType<typeof rowFor>;

export function JourneyIndex() {
  const s = useStore((x) => x);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const focus = focusJourneys(s);
  const pinned = new Set(focus.filter((f) => f.chosen).map((f) => f.journey.id));
  const rows = s.journeys.map((j) => rowFor(s, j)).filter((r) => r.g);
  const recentFirst = (a: Row, b: Row) => (b.last?.startedAt ?? b.h?.startedAt ?? '').localeCompare(a.last?.startedAt ?? a.h?.startedAt ?? '');
  // Etapa 4 da revisão: um destaque só (o fixado por você ou o último jogo), os outros em linhas baixas com o último contexto.
  const goingAll = rows.filter((r) => r.h && r.h.state === 'ativa').sort((a, b) => Number(pinned.has(b.j.id)) - Number(pinned.has(a.j.id)) || recentFirst(a, b));
  const principalId = focus[0]?.journey.id ?? goingAll[0]?.j.id ?? null;
  const destaque = rows.find((r) => r.j.id === principalId && r.h && (r.h.state === 'ativa' || r.h.state === 'pausada')) ?? null;
  const going = goingAll.filter((r) => r.j.id !== destaque?.j.id);
  const paused = rows.filter((r) => r.h && r.h.state === 'pausada' && r.j.id !== destaque?.j.id).sort(recentFirst);
  const done = rows.filter((r) => r.h && r.h.state === 'concluida')
    .sort((a, b) => (b.h!.completedAt ?? '').localeCompare(a.h!.completedAt ?? ''));
  const left = rows.filter((r) => r.h && (r.h.state === 'dropada' || r.h.state === 'encerrada'));
  const putInFocus = (id: string) => { if (!actions.addFocus(id)) setToast({ id: Date.now(), text: 'Você já tem 3 jogos em “Jogando agora”. Tire um deles para pôr outro.' }); };
  const light = !!s.prefs.light;
  const say = (text: string) => setToast({ id: Date.now(), text });

  // O fundo da página é a imagem do jogo em destaque, bem apagada, para a Jornada abrir no clima do que você está jogando.
  const ambientGame = !light && destaque ? destaque.g : undefined;
  const parado = lembreteDe(s, goingAll);

  return (
    <div className="jindex-wrap">
    {ambientGame && (
      <div className="jamb" aria-hidden="true">
        <Backdrop game={ambientGame} className="jamb__bg" />
        <div className="jamb__shade" />
      </div>
    )}
    <main className="page pad jindex jindex--v2">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Jornada</h1>
        </div>
        <SubNav pillar="jornada" />
      </header>
      {rows.length === 0 && (
        <div className="card tl-empty">
          <p className="t" style={{ fontSize: 30, color: 'var(--ink)' }}>Nenhuma Jornada ainda</p>
          <p className="muted">Escolha um jogo e toque em Jogar. A primeira História começa sem formulário.</p>
          <div className="hero__actions"><Link className="btn primary" to="/colecao">Abrir sua estante</Link><Link className="btn ghost" to="/jogos">Buscar um jogo</Link></div>
          <MascoteVazio momento="jornada-vazia" />
        </div>
      )}

      <BridgeInbox />
      {parado && <LembreteParado row={parado.row} dias={parado.dias} onPaused={() => say('Pausado. Ele espera, sem pressa.')} />}
      {destaque && <Destaque s={s} row={destaque} chosen={pinned.has(destaque.j.id)} />}

      {rows.length > 0 && (
        <div className="jindex__cols">
          <div className="jindex__main">
            {going.length > 0 && (
              <section className="jx" aria-labelledby="jx-outros">
                <div className="jx__head"><h2 id="jx-outros" className="jx__k">{destaque ? 'Outros em andamento' : 'Em andamento'} · {going.length}</h2><PastSessionButton className="linklike jx__past" label="Joguei sem registrar" /></div>
                <ul className="jx__list">{going.map((r) => <Linha key={r.j.id} s={s} r={r} pinned={pinned.has(r.j.id)} onFocus={putInFocus} onPaused={() => say('Pausado. Ele espera, sem pressa.')} />)}</ul>
              </section>
            )}
            {!going.length && rows.length > 0 && <div className="jx__head jx__head--solo"><span /><PastSessionButton className="linklike jx__past" label="Joguei sem registrar" /></div>}
            {paused.length > 0 && (
              <details className="jx jx--fold">
                <summary><span className="jx__k">Pausados · {paused.length}</span><span className="jx__sum">os recados ficam guardados</span></summary>
                <ul className="jx__list">{paused.map((r) => <Linha key={r.j.id} s={s} r={r} pinned={false} onFocus={putInFocus} />)}</ul>
              </details>
            )}
            {done.length > 0 && (
              <section className="jx" aria-labelledby="jx-zerados">
                <div className="jx__head"><h2 id="jx-zerados" className="jx__k">Zerados recentemente</h2><Link className="linklike jx__more" to="/jornada/concluidas">Ver Concluídas →</Link></div>
                <ul className="jx__covers">
                  {done.slice(0, 4).map((r) => (
                    <li key={r.j.id}><Link to={`/jornada/${r.g.slug}`}><span className="jx__cover"><CoverArt game={r.g} /></span><span className="jx__cap">{r.g.title}{r.h!.completedAt && r.h!.completedPrecision !== 'desconhecida' ? ` · ${whenLabel(r.h!.completedAt, r.h!.completedPrecision, { short: true })}` : ''}</span></Link></li>
                  ))}
                </ul>
              </section>
            )}
            {left.length > 0 && (
              <details className="jx jx--fold">
                <summary><span className="jx__k">Deixados de lado · {left.length}</span><span className="jx__sum">largados ou encerrados sem zerar, sem julgamento</span></summary>
                <ul className="jx__list">{left.map((r) => <Linha key={r.j.id} s={s} r={r} pinned={false} onFocus={putInFocus} />)}</ul>
              </details>
            )}
          </div>
          <aside className="jindex__aside">
            <Pontes />
            <ReviewCard />
            {!light && <MonthCard s={s} />}
            <LembreteAjuste s={s} />
            <Link to="/" className="arrow-link jindex__today">Sem ideia do que jogar? Veja no Início →</Link>
          </aside>
        </div>
      )}
      {toast && <ActionToast key={toast.id} text={toast.text} onDone={() => setToast(null)} />}
    </main>
    </div>
  );
}

const campanhaDe = (h: History) => (h.title && !/^hist[óo]ria \d/i.test(h.title) ? h.title : h.ordinal > 1 ? `${h.ordinal}ª campanha` : 'Primeira campanha');
const diasDesde = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000)) : null);
const haDias = (n: number | null) => (n == null ? '' : n === 0 ? 'hoje' : n === 1 ? 'ontem' : `há ${n} dias`);

/** O jogo em destaque: fixado por você ou, sem fixar, o último que você jogou. */
function Destaque({ s, row, chosen }: { s: State; row: Row; chosen: boolean }) {
  const { j, g, h, last, note, platform } = row;
  const pontos = activeWaypoints(s, j.id).length;
  const recado = note?.note;
  const quando = haDias(diasDesde(last?.endedAt ?? last?.startedAt));
  return (
    <section className="jdest on-photo" aria-labelledby="jdest-h">
      <Backdrop game={g} className="jdest__bg" />
      <span className="jdest__shade" aria-hidden="true" />
      <Link to={`/jornada/${g.slug}`} className="jdest__cover" tabIndex={-1} aria-hidden="true"><CoverArt game={g} /></Link>
      <div className="jdest__body">
        <span className="jdest__k"><span className={`tr${chosen ? ' now' : ''}`} aria-hidden="true" />{chosen ? 'Fixado por você' : 'Último jogo'}</span>
        <h2 id="jdest-h" className="t jdest__title"><Link to={`/jornada/${g.slug}`}>{g.title}</Link></h2>
        <span className="jdest__meta">{[platform, h ? campanhaDe(h) : '', h?.state === 'pausada' ? 'pausado' : last ? `última sessão ${quando}` : 'ainda sem sessões'].filter(Boolean).join(' · ')}</span>
        {recado ? <p className="jdest__note">“{recado}”</p> : last?.whereStopped ? <p className="jdest__note">Parou em {last.whereStopped}.</p> : null}
        {pontos > 0 && <span className="jdest__pts">{pontos === 1 ? '1 ponto para voltar' : `${pontos} pontos para voltar`}</span>}
      </div>
      <div className="jdest__acts">
        <PlayButton gameId={g.id} className="btn lg" idle="Começar sessão" cont="Começar sessão" />
        <Link className="btn ghost lg" to={`/jornada/${g.slug}`}>Abrir a Jornada</Link>
      </div>
    </section>
  );
}

/** Linha baixa: capa pequena, o último contexto (recado ou sessão) e um menu com o resto. */
function Linha({ s, r, pinned, onFocus, onPaused }: { s: State; r: Row; pinned: boolean; onFocus: (id: string) => void; onPaused?: () => void }) {
  const { j, g, h, last, note, platform, n } = r;
  if (!h) return null;
  const ended = h.state === 'concluida' || h.state === 'dropada' || h.state === 'encerrada';
  const contexto = ended
    ? `${h.state === 'dropada' ? 'Largou' : h.state === 'encerrada' ? 'Encerrou' : 'Zerou'} ${h.completedPrecision === 'desconhecida' || !h.completedAt ? 'sem data' : `em ${whenLabel(h.completedAt, h.completedPrecision, { short: true })}`}${n > 1 ? ` · ${n} Histórias` : ''}`
    : note?.note ? `“${note.note}”` : last?.whereStopped ? `Parou em ${last.whereStopped}` : last ? `Sem recado · última sessão${last.minutes ? ` de ${durLabel(last.minutes)}` : ''}` : 'Começou, ainda sem sessões';
  const lado = [platform, !ended && last ? haDias(diasDesde(last.endedAt ?? last.startedAt)) : ''].filter(Boolean).join(' · ');
  const itens: MoreItem[] = [
    { key: 'abrir', label: 'Abrir a Jornada', onSelect: () => navigate(`/jornada/${g.slug}`) },
    ...(h.state === 'ativa' ? [
      pinned ? { key: 'soltar', label: 'Tirar de “Jogando agora”', onSelect: () => actions.removeFocus(j.id) } : { key: 'fixar', label: 'Fixar em “Jogando agora”', onSelect: () => onFocus(j.id) },
      ...(pinned ? [{ key: 'principal', label: 'Pôr em destaque', onSelect: () => actions.makePrincipal(j.id) }] : []),
      { key: 'pausar', label: 'Pausar', onSelect: () => { actions.setHistoryState(h.id, 'pausada'); onPaused?.(); } },
    ] : []),
    ...(h.state === 'pausada' || h.state === 'dropada' || h.state === 'encerrada' ? [{ key: 'retomar', label: 'Retomar', onSelect: () => actions.setHistoryState(h.id, 'ativa') }] : []),
  ];

  return (
    <li className="jx__row">
      <Link to={`/jornada/${g.slug}`} className="jx__link">
        <span className="jx__mini"><CoverArt game={g} /></span>
        <span className="jx__txt"><strong>{g.title}{pinned && <span className="jx__pin"> · fixado</span>}</strong><span>{contexto}</span></span>
      </Link>
      {lado && <span className="jx__side">{lado}</span>}
      <MoreActions items={itens} label={`Mais opções: ${g.title}`} className="btn quiet icon jx__dots" />
    </li>
  );
}

/** Lembrete de jogo parado (desligado por padrão): um jogo em andamento sem sessão há N dias, um de cada vez. */
function lembreteDe(s: State, going: Row[]): { row: Row; dias: number } | null {
  const n = s.prefs.lembreteParado;
  if (!n) return null;
  const agora = Date.now();
  const adiado = s.prefs.lembreteAdiado ?? {};
  const lista = going.map((r) => ({ row: r, dias: diasDesde(r.last?.endedAt ?? r.last?.startedAt ?? r.h?.startedAt) ?? 0 }))
    .filter((x) => x.dias >= n && !(adiado[x.row.j.id] && Date.parse(adiado[x.row.j.id]) > agora))
    .sort((a, b) => b.dias - a.dias);
  return lista[0] ?? null;
}

function LembreteParado({ row, dias, onPaused }: { row: Row; dias: number; onPaused: () => void }) {
  const s = useStore((x) => x);
  const n = s.prefs.lembreteParado ?? 14;
  const adiar = () => actions.setPrefs({ lembreteAdiado: { ...(s.prefs.lembreteAdiado ?? {}), [row.j.id]: new Date(Date.now() + n * 86400000).toISOString() } });
  return (
    <section className="jlem" aria-labelledby="jlem-h">
      <span className="jlem__mini"><CoverArt game={row.g} /></span>
      <div className="jlem__txt">
        <h2 id="jlem-h" className="jlem__t">{row.g.title} está parado há {dias} dias</h2>
        <p>{row.note?.note ? `Seu último recado: “${row.note.note}”` : 'Quer voltar, pausar ou deixar para depois? Sem cobrança.'}</p>
      </div>
      <div className="jlem__acts">
        <PlayButton gameId={row.g.id} className="btn sm" idle="Voltar a jogar" cont="Voltar a jogar" />
        <button type="button" className="btn quiet sm" onClick={() => { actions.setHistoryState(row.h!.id, 'pausada'); onPaused(); }}>Pausar</button>
        <button type="button" className="btn quiet sm" onClick={adiar}>Agora não</button>
      </div>
    </section>
  );
}

function LembreteAjuste({ s }: { s: State }) {
  const v = s.prefs.lembreteParado ?? 0;
  return (
    <section className="jside-card" aria-labelledby="jlemaj-h">
      <h2 id="jlemaj-h" className="jx__k">Lembrete de jogo parado</h2>
      <p>Um aviso discreto aqui na Jornada quando um jogo em andamento fica muito tempo sem sessão.</p>
      <label className="jside-card__sel">
        <span className="sr-only">Avisar depois de</span>
        <select className="field" value={v} onChange={(e) => { const n = Number(e.target.value); actions.setPrefs({ lembreteParado: n === 7 || n === 14 || n === 30 ? n : null }); }}>
          <option value={0}>Desligado</option>
          <option value={7}>Depois de 7 dias</option>
          <option value={14}>Depois de 14 dias</option>
          <option value={30}>Depois de 30 dias</option>
        </select>
      </label>
    </section>
  );
}

/** As pontes que registram sessões sozinhas, com o estado de cada uma. */
function Pontes() {
  const b = useBridges();
  const on = new Set((b?.accounts ?? []).filter((a) => a.auto).map((a) => a.provider));
  const lista: Provider[] = ['steam', 'playnite', 'ra'];
  return (
    <section className="jside-card" aria-labelledby="jpontes-h">
      <h2 id="jpontes-h" className="jx__k">Registrar sessões automaticamente</h2>
      <p>Ligue a Steam, o Playnite ou o RetroAchievements e as sessões entram sozinhas na Jornada.</p>
      <ul className="jside-card__list">
        {lista.map((p) => <li key={p} className={on.has(p) ? 'is-on' : ''}><span className="tr" aria-hidden="true" />{PROVIDER_NAME[p]} · {on.has(p) ? (p === 'playnite' ? 'ligado' : 'ligada') : (p === 'playnite' ? 'desligado' : 'desligada')}</li>)}
      </ul>
      {on.size < 3 && <Link to="/preferencias#pontes" className="linklike">{on.size ? 'Ligar mais →' : 'Ligar →'}</Link>}
    </section>
  );
}

const dm = (iso: string) => dayMonth(iso).replace(' de ', ' ');
const monthOf = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' });

/** Seu mês até aqui, numa frase: dias jogados, momentos guardados e jogos zerados. */
function MonthCard({ s }: { s: State }) {
  const month = localDay().slice(0, 7);
  const inMonth = (iso: string) => localDay(0, new Date(iso)).slice(0, 7) === month;
  const dias = new Set(s.sessions.filter((x) => inMonth(x.startedAt)).map((x) => localDay(0, new Date(x.startedAt)))).size;
  const moments = s.events.filter((e) => e.kind === 'momento' && inMonth(e.at)).length;
  const zerados = s.histories.filter((h) => h.state === 'concluida' && h.completedAt && h.completedPrecision !== 'desconhecida' && inMonth(h.completedAt)).length;
  if (!dias && !moments && !zerados) return null;
  const nome = new Date().toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' });
  const partes = [dias ? `${dias} ${dias === 1 ? 'dia jogado' : 'dias jogados'}` : '', moments ? `${moments} ${moments === 1 ? 'momento guardado' : 'momentos guardados'}` : '', zerados ? `${zerados} ${zerados === 1 ? 'jogo zerado' : 'jogos zerados'}` : ''].filter(Boolean);
  const frase = partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}` : partes[0];
  return (
    <section className="jside-card" aria-labelledby="mes">
      <h2 id="mes" className="jx__k">Seu {nome}</h2>
      <p>{frase.charAt(0).toUpperCase() + frase.slice(1)}.</p>
      <Link to="/jornada/retrospectivas" className="linklike">Ver a retrospectiva →</Link>
    </section>
  );
}

/** Histórias concluídas: o mural de honra e tudo o que você zerou, do mais recente ao mais antigo, por ano. */
export function ConcludedPage() {
  const s = useStore((x) => x);
  const light = !!s.prefs.light;
  const done = s.histories.filter((h) => h.state === 'concluida').map((h) => {
    const j = s.journeys.find((x) => x.id === h.journeyId);
    const g = j ? s.games[j.gameId] : undefined;
    const known = h.completedAt && h.completedPrecision !== 'desconhecida';
    const sess = sessionsOf(s, h.id).length + s.events.filter((e) => e.historyId === h.id && e.kind === 'sessao' && !e.sessionId).reduce((n, e) => n + (parseInt(e.title) || 1), 0);
    const moments = s.events.filter((e) => e.historyId === h.id && e.kind === 'momento').length;
    const copy = g ? s.copies.find((c) => c.gameId === g.id) : undefined;
    return { h, g, year: known ? partsOf(h.completedAt!).y : null, review: g ? s.reviews.find((r) => r.mine && r.gameId === g.id) : undefined, sess, moments, platform: copy ? shortPlatform(copy.platform) : g?.platforms[0] ? shortPlatform(g.platforms[0]) : undefined };
  }).filter((x) => x.g)
    .sort((a, b) => (b.year ?? -1) - (a.year ?? -1) || (b.h.completedAt ?? '').localeCompare(a.h.completedAt ?? ''));
  const years = [...new Set(done.map((d) => d.year))];
  // "Assisti": acompanhou numa live ou num vídeo, sem jogar. Fica como lembrança, separado dos zerados.
  const assistidos = Object.values(s.myGames).filter((m) => m.watchedAt && s.games[m.gameId]).map((m) => ({ g: s.games[m.gameId], m })).sort((a, b) => (b.m.watchedAt ?? '').localeCompare(a.m.watchedAt ?? ''));
  const totalHours = done.reduce((a, d) => a + (d.h.hours ?? 0), 0);
  const honor = [...done].sort((a, b) => (b.h.completedAt ?? '').localeCompare(a.h.completedAt ?? '')).slice(0, 4);
  const when = (h: History) => (h.completedAt && h.completedPrecision !== 'desconhecida' ? whenLabel(h.completedAt, h.completedPrecision, { short: true }) : 'sem data');
  const span = (h: History, sess: number) => {
    if (!sess || !h.completedAt || (h.completedPrecision ?? 'dia') !== 'dia' || (h.startedPrecision ?? 'dia') !== 'dia') return null;
    const days = Math.max(1, Math.round((Date.parse(h.completedAt) - Date.parse(h.startedAt)) / 86400000));
    return `${dm(h.startedAt)} → ${dm(h.completedAt)} · ${days} ${days === 1 ? 'dia' : 'dias'}`;
  };
  return (
    <main className="page pad jindex concluded">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Concluídas</h1>
          <p className="muted lead">{done.length && light ? 'Cada História aqui é sua, completa ou mínima.' : done.length ? <><span className="mono concluded__n">{done.length}</span> {done.length === 1 ? 'História zerada' : 'Histórias zeradas'}{totalHours ? `, ${Math.round(totalHours).toLocaleString('pt-BR')} horas informadas por você` : ''}. Cada uma no seu tempo.</> : 'Quando você zerar um jogo, ele aparece aqui. Dá para registrar os que zerou antes, com “Já zerei” na página do jogo.'}</p>
        </div>
        <SubNav pillar="jornada" />
      </header>
      {done.length === 1 && <FirstBuddy />}
      {honor.length > 0 && (
        <section className="honor" aria-labelledby="honra">
          <div className="honor__head"><BrandMark width={26} className="honor__mark" /><h2 id="honra" className="kicker">Mural de honra</h2></div>
          <ul className="honor__grid">
            {honor.map(({ h, g, review, sess, platform }, i) => (
              <li key={h.id} style={{ animationDelay: `${i * 0.08}s` }}>
                <Link to={`/jornada/${g!.slug}`} className="hon on-photo">
                  <Backdrop game={g} className={`hon__bg${sess ? '' : ' is-memory'}`} />
                  <span className="hon__shade" aria-hidden="true" />
                  <span className="hon__in">
                    <span className="hon__cover"><CoverArt game={g!} /></span>
                    <span className="hon__text">
                      <span className="mono hon__when">Zerou {h.completedAt && h.completedPrecision !== 'desconhecida' ? `em ${when(h)}` : 'sem data'}</span>
                      <span className="t hon__title">{g!.title}</span>
                      <span className="muted hon__meta">{sess ? [span(h, sess), !light && h.hours ? `${String(h.hours).replace('.', ',')} horas informadas` : null, h.ordinal > 1 ? `${h.ordinal}ª vez` : null].filter(Boolean).join(' · ') || `${sess} ${sess === 1 ? 'sessão' : 'sessões'}` : ['Registrado de memória', platform].filter(Boolean).join(' · ')}</span>
                      {h.feats?.length ? <FeatBadges history={h} /> : null}
                    </span>
                    {!light && (
                      <span className="hon__score">
                        <span className={`t${review ? '' : ' is-none'}`}>{review ? formatScore(review.rating.normalized, s.prefs.scale) : '—'}</span>
                        <span className="kicker">{review ? 'Sua nota' : 'Sem nota'}</span>
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {years.map((y) => {
        const list = done.filter((d) => d.year === y);
        return (
          <section key={String(y)} className="concluded__year" aria-labelledby={`ano-${y}`}>
            <div className="yr"><h2 id={`ano-${y}`} className="t">{y ?? 'Sem data'}</h2><i aria-hidden="true" /><span className="kicker">{list.length} {list.length === 1 ? 'História' : 'Histórias'}</span></div>
            <ul className="concluded__list">
              {list.map(({ h, g, review, sess, moments }) => (
                <li key={h.id}>
                  <Link to={`/jornada/${g!.slug}`} className="crow">
                    <span className="crow__cover"><CoverArt game={g!} /></span>
                    <span className="crow__text">
                      <span className="t crow__title">{g!.title}</span>
                      <span className="muted crow__meta">{[`História ${h.ordinal}`, sess ? (light ? null : `${sess} ${sess === 1 ? 'sessão' : 'sessões'}`) : 'registrada depois', !light && moments ? `${moments} ${moments === 1 ? 'momento' : 'momentos'}` : null, !light && h.hours ? `${String(h.hours).replace('.', ',')} h` : null, !light && h.mode ? h.mode : null].filter(Boolean).join(' · ')}</span>
                      {h.feats?.length ? <FeatBadges history={h} /> : null}
                    </span>
                    <span className="mono crow__date">{h.completedAt && (h.completedPrecision ?? 'dia') === 'dia' ? dm(h.completedAt) : h.completedAt && h.completedPrecision === 'mes' ? whenLabel(h.completedAt, 'mes', { short: true }) : '—'}</span>
                    {!light && <span className={`mono crow__score${review ? '' : ' is-none'}`}>{review ? formatScore(review.rating.normalized, s.prefs.scale) : '—'}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {assistidos.length > 0 && (
        <section className="concluded__year" aria-labelledby="assistidos">
          <div className="yr"><h2 id="assistidos" className="t">Assisti</h2><i aria-hidden="true" /><span className="kicker">sem jogar · não conta como zerado</span></div>
          <ul className="concluded__list">
            {assistidos.map(({ g, m }) => (
              <li key={g.id}>
                <Link to={`/jogos/${g.slug}`} className="crow">
                  <span className="crow__cover"><CoverArt game={g} /></span>
                  <span className="crow__text"><span className="t crow__title">{g.title}</span><span className="muted crow__meta">{m.watchedWhere || 'Acompanhou sem jogar'}</span></span>
                  <span className="mono crow__date">{assistiLabel(m.watchedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function FirstBuddy() {
  return <Buddy line={useBuddy('primeiro-zerado', true)} className="buddy--card" />;
}

function FeatBadges({ history }: { history: History }) {
  return <span className="featbadges">{sortFeats(history.feats).map((f) => <span key={f.kind} className="mono featbadge"><span>{featBadge(f)}</span></span>)}</span>;
}
