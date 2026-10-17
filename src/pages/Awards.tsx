import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import { awardsApi, canAdmin, nomineeArt, phaseOf, publicAt, type Award, type AwardFull, type AwardGame, type Category, type Phase } from '../data/awards';
import type { Game } from '../data/types';
import { FORJADO_PATH } from '../components/Brand';
import { useBackdrop } from '../components/Backdrop';
import { igdbSize } from '../lib/backdrop';
import { track } from '../lib/track';
import { Agenda } from '../components/Agenda';
import type { AgendaItem } from '../data/eventsApi';

const tz = 'America/Sao_Paulo';
export const fmtWhen = (iso?: string, withTime = false) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: 'numeric', month: 'long', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}), timeZone: tz }) : '');
/** "26 OUT" */
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', timeZone: tz }).replace('.', '').replace(' de ', ' ').toUpperCase();
/** "18:37" */
export const fmtHour = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: tz });

function phaseLine(a: Award, p: Phase): string {
  switch (p) {
    case 'rascunho': return 'Rascunho: só a administração vê esta edição.';
    case 'antes': return a.votingOpens ? `A votação abre em ${fmtWhen(a.votingOpens, true)}.` : 'A data da votação ainda vai ser anunciada.';
    case 'aberta': return a.votingCloses ? `Votação aberta até ${fmtWhen(a.votingCloses, true)}.` : 'Votação aberta.';
    case 'apurando': return publicAt(a) ? `Votação encerrada. O resultado sai em ${fmtWhen(publicAt(a), true)}.` : 'Votação encerrada. O resultado sai em breve.';
    case 'resultado': return 'Resultado.';
  }
}

/** Status curto, em caixa alta, para o selo dos cartões. */
const PHASE_TAG: Record<Phase, string> = { rascunho: 'Rascunho', antes: 'Em breve', aberta: 'Votação aberta', apurando: 'Votação encerrada', resultado: 'Resultado' };

/** Até quando a contagem regressiva conta, em cada fase. */
function countdownTarget(a: Award, p: Phase): string | undefined {
  if (p === 'antes') return a.votingOpens;
  if (p === 'aberta') return a.votingCloses;
  if (p === 'apurando') return publicAt(a);
  return undefined;
}

/** "WinnerZ Awards 2026" vira "Awards 2026" ao lado da marca (a marca já diz WinnerZ). */
const shortTitle = (t: string) => t.replace(/^\s*winnerz\s+/i, '');

/** A edição mais recente que esta pessoa pode ver (publicada, ou rascunho para a administração). */
function useLatestAward() {
  const mode = useStore((s) => s.mode);
  const [award, setAward] = useState<Award | null | undefined>(undefined);
  useEffect(() => { awardsApi().list().then((l) => setAward(l[0] ?? null)).catch(() => setAward(null)); }, [mode]);
  return award;
}

/** Marca Forjado em ouro, com relevo (para o Awards). */
export function AwardsMark({ width = 92, relief = false }: { width?: number; relief?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox={relief ? '-6 -6 520 300' : '0 0 506 280'} width={width} className="aw-mark" aria-hidden="true">
      <defs>
        <linearGradient id={`g${id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="160" y2="300">
          <stop offset="0" stopColor="#FFF0CC" /><stop offset="0.3" stopColor="#E8C68E" /><stop offset="0.55" stopColor="#BE9054" /><stop offset="0.8" stopColor="#E2BE84" /><stop offset="1" stopColor="#9A6E3C" />
        </linearGradient>
        <linearGradient id={`d${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6B4A24" /><stop offset="1" stopColor="#2E1E0E" /></linearGradient>
      </defs>
      {relief && <path transform="translate(3 5)" fill={`url(#d${id})`} d={FORJADO_PATH} />}
      <path fill={`url(#g${id})`} d={FORJADO_PATH} />
    </svg>
  );
}

/** Contagem regressiva em dias, horas e minutos (atualiza sozinha). */
export function Countdown({ to, big = false }: { to: string; big?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  const left = Math.max(0, Date.parse(to) - now);
  const d = Math.floor(left / 86400000), h = Math.floor((left % 86400000) / 3600000), m = Math.floor((left % 3600000) / 60000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const parts: [string, string][] = [[String(d), d === 1 ? 'Dia' : 'Dias'], [pad(h), 'Horas'], [pad(m), 'Min']];
  return (
    <div className={`cdown${big ? ' cdown--big' : ''}`} role="timer" aria-label={`Faltam ${d} ${d === 1 ? 'dia' : 'dias'}, ${h} horas e ${m} minutos`}>
      {parts.map(([v, l], k) => (
        <span key={l} className="cdown__part">
          {big && k > 0 && <b className="cdown__sep" aria-hidden="true">:</b>}
          <span className="cdown__cell"><b>{v}</b><span>{l}</span></span>
        </span>
      ))}
    </div>
  );
}

/** Imagem de fundo do evento: a arte do primeiro indicado de "Jogo do Ano" (ou a capa dele). */
function useAwardBg(full: AwardFull | null) {
  const first: AwardGame | undefined = full?.categories.find((c) => c.nominees.length)?.nominees[0]?.game;
  const stored = useStore((s) => (first ? s.games[first.id] : undefined));
  const asGame = useMemo(() => (stored ?? (first ? ({ ...first, cover: first.cover ? igdbSize(first.cover, 't_1080p') : first.cover } as unknown as Game) : null)), [stored, first]);
  return useBackdrop(asGame);
}

function useFull(award: Award | null | undefined) {
  const [full, setFull] = useState<AwardFull | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(() => {
    if (!award) return;
    awardsApi().load(award.id).then(setFull).catch((e) => setError(e instanceof Error ? e.message : 'Não consegui carregar.'));
  }, [award]);
  useEffect(() => { reload(); }, [reload]);
  return { full, setFull, error, setError, reload };
}

/** Pilar Eventos: por enquanto, o WinnerZ Awards. */
export function EventsIndex() {
  const award = useLatestAward();
  const { full } = useFull(award);
  const bg = useAwardBg(full);
  const p = award ? phaseOf(award) : null;
  const cats = full ? full.categories.filter((c) => c.nominees.length).length : 0;
  const target = award && p ? countdownTarget(award, p) : undefined;

  // As datas da edição entram na agenda junto com os eventos do canal.
  const awardItems: AgendaItem[] = [];
  const ai = (id: string, title: string, at: string, endsAt: string | null, note: string): AgendaItem => ({ id: `${award?.id}-${id}`, source: 'awards', kind: 'awards', title, startsAt: at, endsAt, link: '/eventos/awards', game: null, note, canceled: false });
  if (award && p && p !== 'rascunho') {
    if (award.votingOpens) awardItems.push(ai('abre', `${award.title}: abertura da votação`, award.votingOpens, null, 'A votação abre no site.'));
    if (award.votingCloses) awardItems.push(ai('fecha', `${award.title}: fim da votação`, award.votingCloses, null, 'Último dia para votar.'));
    if (publicAt(award)) awardItems.push(ai('noite', `${award.title}: noite da revelação`, publicAt(award)!, new Date(Date.parse(publicAt(award)!) + 2 * 3600_000).toISOString(), 'Resultado ao vivo.'));
  }

  let line = 'A próxima edição ainda vai ser anunciada.';
  if (award && p) {
    if (p === 'aberta') line = [cats ? `${cats} ${cats === 1 ? 'categoria' : 'categorias'}.` : '', full && full.voters > 0 ? `${full.voters.toLocaleString('pt-BR')} ${full.voters === 1 ? 'pessoa já votou' : 'pessoas já votaram'}.` : '', phaseLine(award, p)].filter(Boolean).join(' ');
    else line = phaseLine(award, p);
  } else if (award === undefined) line = 'Carregando…';

  return (
    <main className="events">
      <section className="page events__head">
        <h1 className="t events__title">Eventos</h1>
        <p className="events__lead">Os momentos em que a comunidade se encontra: votações, revelações e noites para assistir junto.</p>
      </section>

      <section className="page">
        <article className="evcard on-photo">
          {bg && <img className="evcard__bg" src={bg} alt="" />}
          <div className="evcard__shade" aria-hidden="true" />
          <div className="evcard__line" aria-hidden="true" />
          <div className="evcard__body">
            <div className="evcard__text">
              {p && <span className={`kicker evcard__tag${p === 'aberta' ? ' is-live' : ''}`}>{p === 'aberta' && <i aria-hidden="true" />}{PHASE_TAG[p]}</span>}
              <div className="evcard__brand"><AwardsMark width={92} /><h2 className="t evcard__name" aria-label={award?.title ?? 'WinnerZ Awards'}>{award ? shortTitle(award.title) : 'Awards'}</h2></div>
              <p className="evcard__info">{line}</p>
              <div className="evcard__actions">
                <Link to="/eventos/awards" className="btn primary">{p === 'aberta' ? 'Votar' : p === 'resultado' ? 'Ver o resultado' : 'Abrir'}</Link>
                {p === 'aberta' && cats > 0 && <Link to="/eventos/awards" className="btn ghost">Ver indicados</Link>}
              </div>
            </div>
            {target && <div className="evcard__count"><Countdown to={target} /></div>}
          </div>
        </article>
      </section>

      <Agenda extra={awardItems} admin={canAdmin()} />
    </main>
  );
}

/** Quantas categorias aparecem abertas antes das demais virarem linhas compactas. */
const OPEN_FIRST = 3;

export function AwardsPage() {
  const award = useLatestAward();
  const s = useStore((x) => x);
  const { full, setFull, error, setError, reload } = useFull(award);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const bg = useAwardBg(full);
  useEffect(() => { track('eventos.awards'); }, []);
  // A barra de categorias gruda logo abaixo do menu, que muda de altura conforme a largura da tela.
  useEffect(() => {
    const h = document.querySelector<HTMLElement>('.site-header');
    if (!h || typeof ResizeObserver === 'undefined') return;
    const set = () => document.documentElement.style.setProperty('--hdr', getComputedStyle(h).position === 'sticky' ? `${h.offsetHeight - 1}px` : '0px');
    const ro = new ResizeObserver(set); ro.observe(h); set();
    return () => ro.disconnect();
  }, []);

  if (award === undefined || (award && !full && !error)) return <main className="page pad"><p className="muted">Carregando o WinnerZ Awards…</p></main>;
  if (!award) return (
    <main className="page pad narrow">
      <h1 className="t big">WinnerZ Awards</h1>
      <p className="muted lead">A próxima edição ainda vai ser anunciada.</p>
      {canAdmin() && <Link className="btn primary" to="/eventos/awards/admin">Montar uma edição</Link>}
    </main>
  );
  if (!full) return <main className="page pad"><p className="muted" role="alert">{error}</p></main>;

  const phase = phaseOf(full.award);
  const logged = s.mode === 'demo' || !!s.profile;
  const voting = phase === 'aberta' && logged;
  const withNominees = full.categories.filter((c) => c.nominees.length);
  const voted = withNominees.filter((c) => full.myVotes[c.id]).length;
  const res = full.results;
  const showResult = !!res && phase === 'resultado';
  const compact = phase === 'aberta' && withNominees.length > OPEN_FIRST + 1;
  const isOpen = (c: Category, k: number) => !compact || k < OPEN_FIRST || !!expanded[c.id];
  const collapsedCount = withNominees.filter((c, k) => !isOpen(c, k)).length;

  const vote = async (c: Category, nomineeId: string) => {
    if (!voting) return;
    const next = full.myVotes[c.id] === nomineeId ? null : nomineeId;
    setSaving(c.id); setError('');
    const mv = { ...full.myVotes };
    if (next) mv[c.id] = next; else delete mv[c.id];
    setFull({ ...full, myVotes: mv });
    try { await awardsApi().vote(c.id, next); track('awards.voto'); }
    catch (e) { setError(e instanceof Error ? e.message : 'O voto não foi gravado.'); reload(); }
    finally { setSaving(null); }
  };

  const goTo = (c: Category) => {
    setExpanded((x) => ({ ...x, [c.id]: true }));
    requestAnimationFrame(() => document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const myTitle = (c: Category) => c.nominees.find((n) => n.id === full.myVotes[c.id])?.game.title;
  const deadline = phase === 'aberta' && full.award.votingCloses ? `Votação até ${fmtDay(full.award.votingCloses)}, ${fmtHour(full.award.votingCloses)}`
    : phase === 'antes' && full.award.votingOpens ? `Votação abre ${fmtDay(full.award.votingOpens)}, ${fmtHour(full.award.votingOpens)}`
    : phase === 'apurando' && publicAt(full.award) ? `Revelação ${fmtDay(publicAt(full.award)!)}, ${fmtHour(publicAt(full.award)!)}` : '';

  let firstCollapsed = true;

  return (
    <main className="awards">
      <section className="awhero on-photo">
        {bg && <img className="awhero__bg" src={bg} alt="" />}
        <div className="awhero__shade" aria-hidden="true" />
        <div className="page awhero__row">
          <div className="awhero__text">
            <Link to="/eventos" className="kicker awhero__back">← Eventos</Link>
            <div className="awhero__brand"><AwardsMark width={120} relief /><h1 className="t awhero__title" aria-label={full.award.title}>{shortTitle(full.award.title)}</h1></div>
            {full.award.intro && <p className="awhero__intro">{full.award.intro}</p>}
            <p className="awhero__line">
              {phase === 'aberta'
                ? <>{full.voters > 0 && <><span className="mono awhero__num">{full.voters.toLocaleString('pt-BR')}</span> {full.voters === 1 ? 'pessoa votou' : 'pessoas votaram'}. </>}Um voto por categoria, e dá para mudar até o fim.</>
                : <>{phaseLine(full.award, phase)}{full.voters > 0 && phase !== 'antes' && phase !== 'rascunho' ? ` ${full.voters.toLocaleString('pt-BR')} ${full.voters === 1 ? 'pessoa votou' : 'pessoas votaram'}.` : ''}</>}
            </p>
            {phase === 'aberta' && !logged && <p className="awhero__login"><Link className="btn primary" to="/entrar">Entre para votar</Link> <span>Uma conta, um voto por categoria.</span></p>}
            {phase === 'apurando' && <p className="awhero__note">Ninguém vê a contagem antes da revelação, nem a administração do site muda votos.</p>}
            {error && <p className="awards__error" role="alert">{error}</p>}
          </div>
          <div className="awhero__side">
            {deadline && <span className="awhero__deadline">{deadline}</span>}
            {canAdmin() && (
              <>
                <div className="awhero__admin"><Link className="btn ghost sm" to="/eventos/awards/admin">Montar a edição</Link><Link className="btn ghost sm" to="/eventos/awards/revelar">Apresentação da revelação</Link></div>
                <span className="awhero__only">Só para quem organiza</span>
              </>
            )}
          </div>
        </div>
      </section>

      {withNominees.length > 0 && (
        <div className="awbar">
          <div className="page awbar__row">
            {voting && <div className="awbar__count"><span className="t">{voted}<span className="awbar__of">/{withNominees.length}</span></span><span>votos</span></div>}
            <nav className="awbar__cats" aria-label="Categorias">
              {withNominees.map((c) => {
                const mine = !!full.myVotes[c.id];
                return (
                  <button key={c.id} className={`awbar__cat${mine ? ' is-voted' : ''}`} onClick={() => goTo(c)}>
                    {voting && <span className={mine ? 'awbar__ok' : 'awbar__no'} aria-hidden="true" />}{c.name}
                    {voting && <span className="sr-only">{mine ? ' (votado)' : ' (sem voto)'}</span>}
                  </button>
                );
              })}
            </nav>
          </div>
          {voting && <div className="awbar__track" aria-hidden="true"><span style={{ width: `${(voted / withNominees.length) * 100}%` }} /></div>}
        </div>
      )}

      <div className="page awards__body">
        {withNominees.length === 0 && <div className="card tl-empty"><p className="muted">Os indicados ainda vão ser anunciados.</p></div>}

        {withNominees.map((c, k) => {
          if (!isOpen(c, k)) {
            const head = firstCollapsed;
            firstCollapsed = false;
            const mine = myTitle(c);
            return (
              <div key={c.id} id={`cat-${c.id}`} className="awrow-wrap">
                {head && <h2 className="t awrows__head">Mais {collapsedCount} {collapsedCount === 1 ? 'categoria' : 'categorias'}</h2>}
                <button className={`awrow${mine ? ' is-voted' : ''}`} onClick={() => goTo(c)}>
                  <span className="t awrow__name">{c.name}</span>
                  <span className="awrow__covers" aria-hidden="true">{c.nominees.slice(0, 6).map((n) => <span key={n.id} className="awrow__art" style={{ backgroundImage: `url("${igdbSize(nomineeArt(n), 't_screenshot_med')}")`, backgroundPosition: n.focus || '50% 50%' }} />)}</span>
                  <span className="kicker awrow__go">{mine ? `Seu voto: ${mine}` : 'Votar →'}</span>
                </button>
              </div>
            );
          }
          const total = res ? c.nominees.reduce((a, n) => a + (res[n.id] ?? 0), 0) : 0;
          const top = showResult && total ? Math.max(...c.nominees.map((n) => res![n.id] ?? 0)) : -1;
          const winners = top > 0 ? c.nominees.filter((n) => (res![n.id] ?? 0) === top) : [];
          const mine = myTitle(c);
          // A cena: a escolhida (seu voto ou, no resultado, o vencedor) se abre em widescreen.
          const openId = showResult ? winners[0]?.id : full.myVotes[c.id];
          const next = withNominees[k + 1];
          const tag = showResult ? (winners.length > 1 ? 'Empate' : 'Vencedor') : 'Seu voto';
          return (
            <section key={c.id} id={`cat-${c.id}`} className="awcat" aria-labelledby={`cath-${c.id}`}>
              <div className={`scene${openId ? ' has' : ''}`}>
                <div className="scene__row" role={voting ? 'radiogroup' : undefined} aria-labelledby={`cath-${c.id}`}>
                  {c.nominees.map((n) => {
                    const on = n.id === openId;
                    const isMine = full.myVotes[c.id] === n.id;
                    const votes = res?.[n.id] ?? 0;
                    const pct = total ? Math.round((votes / total) * 100) : 0;
                    const sub = n.game.developer || (n.game.year ? String(n.game.year) : '');
                    const body = (
                      <>
                        <img className="scene__img" src={nomineeArt(n)} alt="" loading="lazy" style={{ objectPosition: n.focus || '50% 50%' }} />
                        <span className="scene__shade" aria-hidden="true" />
                        {on && <span className="scene__leak" aria-hidden="true" />}
                        <span className="scene__name">
                          <b>{n.game.title}</b>
                          {sub && <span>{sub}</span>}
                          {!voting && isMine && !on && <em className="scene__mine">Seu voto</em>}
                          {showResult && <span className="scene__bar" aria-label={`${votes} votos`}><i style={{ width: `${pct}%` }} /><em>{pct}%</em></span>}
                        </span>
                        <span className="scene__vt" aria-hidden="true">{showResult ? `${pct}% · ` : ''}{n.game.title}</span>
                        {on && (
                          <span className="scene__ttl" key={`${n.id}-${tag}`}>
                            <span className="scene__tag"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>{tag}<span className="scene__tagcat"> · {c.name}</span></span>
                            <span className="scene__nm">{n.game.title}</span>
                            {(sub || showResult) && <span className="scene__sub">{[sub, showResult ? `${pct}% dos votos` : ''].filter(Boolean).join(' · ')}</span>}
                            {!showResult && isMine && voting && <span className="scene__hint">Toque de novo para tirar o voto</span>}
                          </span>
                        )}
                      </>
                    );
                    const cls = `scene__p${on ? ' on' : ''}`;
                    return voting
                      ? <button key={n.id} role="radio" aria-checked={isMine} aria-label={n.game.title} className={cls} onClick={() => vote(c, n.id)} disabled={saving === c.id}>{body}</button>
                      : <Link key={n.id} to={`/jogos/${n.game.slug}`} aria-label={n.game.title} className={cls}>{body}</Link>;
                  })}
                </div>
                <span className="scene__grain" aria-hidden="true" />
                {openId && <>
                  <span className="scene__flare" key={`f-${openId}`} aria-hidden="true" />
                  <span className="scene__ghost" aria-hidden="true" />
                  <span className="scene__ghost scene__ghost--2" aria-hidden="true" />
                  <span className="scene__flash" key={`x-${openId}`} aria-hidden="true" />
                </>}
                <span className="scene__lb scene__lb--t" aria-hidden="true" />
                <span className="scene__lb scene__lb--b" aria-hidden="true" />
                <div className="scene__top">
                  <div className="scene__head"><h2 id={`cath-${c.id}`} className="t">{c.name}</h2><span className="kicker">{k + 1} de {withNominees.length}</span></div>
                  <span className="kicker scene__status" role={saving === c.id ? 'status' : undefined}>
                    {saving === c.id ? 'Gravando…' : winners.length ? '' : mine ? '' : voting ? 'Toque numa arte para votar' : ''}
                  </span>
                </div>
                <div className="scene__bottom">
                  <span className="scene__desc">{c.description || (voting ? 'Um voto por categoria. Dá para mudar até o fim da votação.' : '')}</span>
                  {next && <button className="kicker scene__next" onClick={() => goTo(next)}>{next.name} →</button>}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
