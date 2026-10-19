import { featBadge, sortFeats } from '../lib/feats';
import { PastSessionButton } from '../components/PastSession';
import { Buddy, useBuddy } from '../components/Buddy';
import { BridgeInbox } from '../components/Bridges';
import { useState, type ReactNode } from 'react';
import { Link } from '../lib/router';
import { actions, useStore, currentHistory, historiesOf, lastNote, sessionsOf, focusJourneys } from '../data/store';
import type { State, Journey, History } from '../data/types';
import { ago, dayMonth } from '../lib/format';
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
  const principal = focus[0] ?? null;
  // Só o primeiro vira destaque; os outros fixados entram no topo da lista, compactos.
  const pinned = new Set(focus.filter((f) => f.chosen).map((f) => f.journey.id));
  const principalId = principal?.journey.id ?? null;
  const [showAll, setShowAll] = useState<{ paused?: boolean }>({});
  const rows = s.journeys.map((j) => rowFor(s, j)).filter((r) => r.g);
  // A biblioteca: o principal primeiro, depois os fixados em "Jogando agora", depois o resto pelo mais recente.
  const going = rows.filter((r) => r.h && (r.h.state === 'ativa' || r.j.id === principalId))
    .sort((a, b) => Number(b.j.id === principalId) - Number(a.j.id === principalId) || Number(pinned.has(b.j.id)) - Number(pinned.has(a.j.id)) || (b.last?.startedAt ?? '').localeCompare(a.last?.startedAt ?? ''));
  const paused = rows.filter((r) => r.h && r.h.state === 'pausada' && r.j.id !== principalId);
  const done = rows.filter((r) => r.h && r.h.state === 'concluida')
    .sort((a, b) => (b.h!.completedAt ?? '').localeCompare(a.h!.completedAt ?? ''));
  const left = rows.filter((r) => r.h && (r.h.state === 'dropada' || r.h.state === 'encerrada'));
  const putInFocus = (id: string) => { if (!actions.addFocus(id)) setToast({ id: Date.now(), text: 'Você já tem 3 jogos em “Jogando agora”. Tire um deles para pôr outro.' }); };
  const light = !!s.prefs.light;

  const metaOf = ({ h, n, last, note, platform }: Row) => {
    if (!h) return '';
    if (h.state === 'concluida' || h.state === 'dropada' || h.state === 'encerrada') return '';
    const bits = [
      platform,
      h.state === 'pausada' ? (last ? `Pausado desde ${monthOf(last.startedAt)}` : 'Pausado') : last ? `Última sessão ${ago(last.startedAt)}` : n > 1 ? `${n} Histórias` : 'Primeira História',
      !light && h.progress ? `${h.progress}%` : null,
      note?.note ? `“${note.note}”` : last?.whereStopped ? `Parou em ${last.whereStopped}` : h.state === 'ativa' ? 'Sem recado' : null,
    ];
    return bits.filter(Boolean).join(' · ');
  };

  const Group = ({ title, list, hint, more, kind }: { title: string; list: Row[]; hint?: string; more?: ReactNode; kind: 'going' | 'paused' | 'done' | 'left' }) => list.length ? (
    <section className={`jlist jlist--${kind}`} aria-label={title}>
      <div className="jlist__head"><h2 className="t">{title}</h2>{more ?? (hint ? <span className="muted">{hint}</span> : <span className="kicker">{list.length} {list.length === 1 ? 'jogo' : 'jogos'}</span>)}</div>
      <ul>
        {list.map((r) => {
          const { j, g, h, n } = r;
          const ended = h && (h.state === 'concluida' || h.state === 'dropada' || h.state === 'encerrada');
          return (
            <li key={j.id} className="jrow">
              <Link to={`/jornada/${g.slug}`} className="jrow__link">
                <span className="jrow__cover"><CoverArt game={g} /></span>
                <span className="jrow__text">
                  <span className="t jrow__title">{g.title}{j.id === principalId && kind === 'going' && <span className="kicker kicker--now jrow__tag">Principal</span>}</span>
                  {ended ? (
                    <span className="mono jrow__date">{h!.state === 'concluida' ? 'Zerou' : h!.state === 'dropada' ? 'Largou' : 'Encerrou'} {h!.completedPrecision === 'desconhecida' || !h!.completedAt ? 'sem data' : `em ${whenLabel(h!.completedAt, h!.completedPrecision, { short: true })}`}{n > 1 ? ` · ${n} Histórias` : ''}</span>
                  ) : (
                    <span className="muted jrow__meta">{metaOf(r)}</span>
                  )}
                </span>
              </Link>
              {kind === 'going' && j.id === principalId ? (
                <span className="jrow__actions"><PlayButton gameId={g.id} className="btn now sm" idle="Continuar" />{pinned.has(j.id) && <button className="btn quiet sm" onClick={() => actions.removeFocus(j.id)} title="Tirar de “Jogando agora”">Soltar</button>}</span>
              ) : kind === 'going' && (pinned.has(j.id)
                ? <span className="jrow__actions"><button className="btn ghost sm" onClick={() => actions.makePrincipal(j.id)}>Tornar principal</button><button className="btn quiet sm" onClick={() => actions.removeFocus(j.id)} title="Tirar de “Jogando agora”">Soltar</button></span>
                : <button className="btn ghost sm" onClick={() => putInFocus(j.id)} title="Destacar esta Jornada aqui e no Início (até 3)">Estou jogando</button>)}
              {kind === 'paused' && (
                <span className="jrow__actions">
                  <button className="btn ghost sm" onClick={() => actions.setHistoryState(h!.id, 'ativa')}>Retomar</button>
                  <button className="btn quiet sm" onClick={() => putInFocus(j.id)}>Estou jogando</button>
                </span>
              )}
              {kind === 'done' && <span className="jrow__mark" aria-label="Marco" />}
            </li>
          );
        })}
      </ul>
    </section>
  ) : null;

  return (
    <main className="page pad jindex">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Jornada</h1>
          <p className="muted lead">Toda história tem um próximo instante. O resto pode esperar.</p>
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
      {rows.length > 0 && <div className="jindex__quick"><PastSessionButton /></div>}

      {rows.length > 0 && (
        <div className="jindex__cols">
          <div className="jindex__main">
            <Group kind="going" title="Em andamento" list={going} />
            <Group kind="paused" title="Pausados" list={showAll.paused ? paused : paused.slice(0, 3)} more={paused.length > 3 ? <button className="btn quiet sm" onClick={() => setShowAll({ ...showAll, paused: !showAll.paused })}>{showAll.paused ? 'Mostrar menos' : `Ver os ${paused.length}`}</button> : undefined} hint="Sem pressa. Eles esperam." />
            <Group kind="done" title="Zerados recentemente" list={done.slice(0, 3)} more={<Link className="arrow-link" to="/jornada/concluidas">Ver Concluídas</Link>} />
            <Group kind="left" title="Deixados de lado" list={left} hint="Largados ou encerrados sem zerar. Sem julgamento." />
          </div>
          <aside className="jindex__aside">
            <ReviewCard />
            {!light && <MonthCard s={s} />}
            <Link to="/" className="arrow-link jindex__today">Sem ideia do que jogar? Veja no Início →</Link>
          </aside>
        </div>
      )}
      {toast && <ActionToast key={toast.id} text={toast.text} onDone={() => setToast(null)} />}
    </main>
  );
}

const dm = (iso: string) => dayMonth(iso).replace(' de ', ' ');
const monthOf = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' });

/** Seu mês até aqui: sessões, momentos guardados e pontos para voltar em aberto. */
function MonthCard({ s }: { s: State }) {
  const month = localDay().slice(0, 7);
  const inMonth = (iso: string) => localDay(0, new Date(iso)).slice(0, 7) === month;
  const sessions = s.sessions.filter((x) => inMonth(x.startedAt)).length;
  const moments = s.events.filter((e) => e.kind === 'momento' && inMonth(e.at)).length;
  const back = s.events.filter((e) => e.kind === 'ponto' && !e.resolved).length;
  if (!sessions && !moments && !back) return null;
  return (
    <section className="card month-card" aria-labelledby="mes">
      <h2 id="mes" className="kicker">Seu mês até aqui</h2>
      <div className="month-card__grid">
        <div><div className="t">{sessions}</div><div className="muted">{sessions === 1 ? 'sessão' : 'sessões'}</div></div>
        <div><div className="t">{moments}</div><div className="muted">{moments === 1 ? 'momento' : 'momentos'}</div></div>
        <div><div className="t month-card__now">{back}</div><div className="muted">para voltar</div></div>
      </div>
      <Link to="/jornada/ritmo" className="arrow-link">Ver o seu ritmo</Link>
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
    </main>
  );
}

function FirstBuddy() {
  return <Buddy line={useBuddy('primeiro-zerado', true)} className="buddy--card" />;
}

function FeatBadges({ history }: { history: History }) {
  return <span className="featbadges">{sortFeats(history.feats).map((f) => <span key={f.kind} className="mono featbadge"><span>{featBadge(f)}</span></span>)}</span>;
}
