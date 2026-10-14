import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, getState, journeyForGame, useStore } from '../data/store';
import type { CopyKind, Game, ID, State } from '../data/types';
import { CoverArt } from '../components/CoverArt';
import { Icon } from '../components/Icon';
import { RadarNotice } from '../components/RadarNotice';
import { AddGameDialog } from '../components/AddGameDialog';
import { useWelcomeGames } from '../data/welcomeGames';
import { profileApi } from '../data/profileApi';
import { phaseOf, publicAt, type Award } from '../data/awards';
import { capitalize, longDay } from '../lib/format';
import { platformRank, shortPlatform } from '../lib/platforms';
import { SUN_X, lifeLine, markedGames, stepsDone, type LineEntry, type LineKind } from '../lib/welcome';
import { stamp, useUpcoming, type Upcoming } from './Home';

const TZ = 'America/Sao_Paulo';
const EXAMPLE_IMG = '/demo/scene-tlou-guitar.webp';
const FALLBACK_ARTS = ['/demo/scene-tlou-ellie.webp', '/demo/scene-astro-kratos.webp', '/demo/scene-gta6-city.webp', '/demo/scene-yakuza-street.webp'];

function useMedia(q: string) {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(q).matches;
  const [on, setOn] = useState(get);
  useEffect(() => {
    const m = window.matchMedia?.(q);
    if (!m) return;
    const f = () => setOn(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, [q]);
  return on;
}

/** Jogos zerados (alguma História concluída), com a data em que terminou. */
function finishedOf(s: State): Map<ID, string> {
  const out = new Map<ID, string>();
  for (const h of s.histories) {
    if (h.state !== 'concluida') continue;
    const j = s.journeys.find((x) => x.id === h.journeyId);
    if (j && !out.has(j.gameId)) out.set(j.gameId, h.completedAt ?? h.startedAt ?? '');
  }
  return out;
}

/** O que a pessoa marcou, para a linha da vida e a estante. */
function useEntries(s: State): LineEntry[] {
  return useMemo(() => {
    const done = finishedOf(s);
    const out: LineEntry[] = [];
    done.forEach((at, id) => { const g = s.games[id]; if (g) out.push({ game: g, kind: 'zerado', at }); });
    const seen = new Set(done.keys());
    for (const c of [...s.copies].reverse()) {
      if (seen.has(c.gameId) || !s.games[c.gameId]) continue;
      seen.add(c.gameId);
      out.push({ game: s.games[c.gameId], kind: 'tenho', at: c.createdAt ?? '' });
    }
    s.wishes.forEach((w, i) => {
      if (seen.has(w.gameId) || !s.games[w.gameId]) return;
      seen.add(w.gameId);
      out.push({ game: s.games[w.gameId], kind: 'quero', at: String(1e6 + i) });
    });
    return out;
  }, [s.histories, s.journeys, s.copies, s.wishes, s.games]);
}

const scrollTo = (id: string) => (e: MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export function Welcome({ standalone, onDone }: { standalone?: boolean; onDone?: () => void }) {
  const s = useStore((x) => x);
  const { picks, upcoming: nextBig } = useWelcomeGames(s.mode);
  const { list: upcoming, award } = useUpcoming(s);
  const entries = useEntries(s);
  const compact = useMedia('(max-width: 760px)');
  const [adding, setAdding] = useState(false);
  const [top, setTop] = useState(0);

  useEffect(() => {
    let alive = true;
    profileApi.mine().then((p) => alive && setTop(p.stage?.top?.length ?? 0)).catch(() => null);
    return () => { alive = false; };
  }, []);

  const arts = useMemo(() => {
    const withArt = picks.filter((g) => g.backdrop).slice(0, 4);
    return withArt.length >= 2 ? withArt.map((g) => ({ src: g.backdrop!, title: g.title })) : FALLBACK_ARTS.map((src) => ({ src, title: '' }));
  }, [picks]);
  const credit = arts.map((a) => a.title).filter(Boolean).join(' · ');

  const name = (s.profile?.name ?? '').replace(/^@/, '').trim();
  const today = capitalize(longDay(new Date().toISOString()));
  const marked = markedGames(s);
  const done = stepsDone({ marked, sessions: s.sessions.length, top, avatar: !!s.profile?.avatar });
  const nDone = done.filter(Boolean).length;
  const dismiss = () => { actions.setPrefs({ welcomeDone: true }); onDone?.(); window.scrollTo({ top: 0 }); };

  return (
    <main className="home wl">
      <section className="wl-hero on-photo" aria-labelledby="wl-title">
        <div className="wl-slides" aria-hidden="true">
          {arts.map((a, i) => <img key={a.src} className="wl-slide" src={a.src} alt="" style={{ animationDelay: `${i * 7}s` }} />)}
        </div>
        <div className="wl-shade" aria-hidden="true" />
        <div className="wl-bar wl-bar--top" aria-hidden="true"><span>WinnerZ <b>apresenta</b></span><span className="wl-bar__hide">Capítulo 01 · Primeiro acesso</span></div>
        <div className="page wl-hero__in">
          <div className="wl-hero__text">
            <p className="kicker kicker--now in-1">{today}</p>
            <h1 id="wl-title" className="t wl-hero__title in-1">Olá{name ? ',' : ''}{name && <><br /><em>{name}</em></>}</h1>
            <p className="wl-hero__lead in-2">A linha lá embaixo é a sua vida gamer. Marque os jogos que já fazem parte dela e veja o passado se encher, do primeiro console até hoje.</p>
            <div className="hero__actions in-3">
              <a className="btn now lg" href="#wl-agora" onClick={scrollTo('wl-agora')}>Marcar meus jogos</a>
              <a className="btn ghost lg" href="#wl-lembrar" onClick={scrollTo('wl-lembrar')}>Como funciona</a>
            </div>
          </div>
          {credit && <p className="wl-credit"><span className="kicker">Em cena</span><b>{credit}</b></p>}
        </div>
        <LifeLine entries={entries} upcoming={upcoming} compact={compact} />
        <div className="wl-bar wl-bar--bottom">
          <span className="wl-legend">
            <span><i className="wl-key wl-key--zerado" />Zerados, no ano em que saíram</span>
            <span><i className="wl-key wl-key--tenho" />Na estante</span>
            <span><i className="wl-key wl-key--quero" />Quero jogar</span>
          </span>
          <span className="wl-bar__count">{marked} {marked === 1 ? 'jogo' : 'jogos'} na sua linha</span>
        </div>
      </section>

      {nDone < 4 && (
        <section className="page" aria-labelledby="wl-steps">
          <div className="wl-steps">
            <div className="wl-steps__head">
              <span className="kicker kicker--now">{nDone} de 4</span>
              <h2 id="wl-steps" className="t">Primeiros passos</h2>
              <span className="muted">Somem quando você terminar.</span>
            </div>
            <Step ok={done[0]} title="Montar a estante" text="Pela grade aqui embaixo, pela câmera, pela planilha ou pela Steam." cta="Marcar jogos" href="#wl-agora" onClick={scrollTo('wl-agora')} />
            <Step ok={done[1]} title="Começar uma Jornada" text="Toque em Jogar no jogo que você está jogando agora. A sessão começa sem formulário." cta="Abrir a estante" to="/colecao" />
            <Step ok={done[2]} title="Os três da vida" text="Os jogos que mais marcaram você abrem o seu perfil." cta="Escolher os três" to="/preferencias#perfil" />
            <Step ok={done[3]} title="A sua foto" text="Uma foto ou um avatar para o seu perfil e para quem você convidar." cta="Pôr a foto" to="/preferencias#perfil" />
          </div>
        </section>
      )}

      <div className="page wl-cols">
        <section className="wl-col" id="wl-lembrar" aria-labelledby="wl-col-lembrar">
          <h2 id="wl-col-lembrar" className="kicker home-col__head">Lembrar · como vai ficar</h2>
          <figure className="card wl-ex">
            <span className="wl-ex__tag">Exemplo</span>
            <span className="wl-ex__ph"><img src={EXAMPLE_IMG} alt="" loading="lazy" /></span>
            <figcaption className="wl-ex__tx">
              <span className="kicker kicker--now">Uma Jornada · The Last of Us Part II</span>
              <span className="t wl-ex__title">O violão na varanda</span>
              <q className="wl-ex__q">Parei tudo só para ouvir até o fim.</q>
              <span className="wl-ex__mini"><span><b>14 h</b> jogadas</span><span><b>6</b> momentos</span><span>Zerado em março</span></span>
            </figcaption>
          </figure>
          <ol className="card wl-how">
            <li><span className="mono">01</span>Toque em Jogar e a sessão começa. No fim, guarde um momento com foto.</li>
            <li><span className="mono">02</span>Pausou por meses? A Cápsula de Retomada lembra onde você estava.</li>
            <li><span className="mono">03</span>Tudo vira a sua linha do tempo, e o seu perfil, se você quiser mostrar.</li>
          </ol>
        </section>

        <section className="wl-col" id="wl-agora" aria-labelledby="wl-col-agora">
          <h2 id="wl-col-agora" className="kicker kicker--now home-col__head">Agora</h2>
          <Picker picks={picks} compact={compact} onOther={() => setAdding(true)} entries={entries} marked={marked} />
        </section>

        <section className="wl-col" aria-labelledby="wl-col-proximo">
          <h2 id="wl-col-proximo" className="kicker home-col__head">Próximo</h2>
          <AwardCard award={award} />
          {nextBig && <BigRelease game={nextBig} wished={s.wishes.some((w) => w.gameId === nextBig.id)} known={!!s.games[nextBig.id]} />}
          <RadarNotice />
          <Link to="/jogos/explorar" className="card wl-explore">
            <span className="kicker">Catálogo</span>
            <span className="t wl-explore__title">Explorar jogos</span>
            <span className="muted">Todos os jogos do IGDB, com filtros por gênero, ano e plataforma.</span>
            <span className="arrow-link">Abrir →</span>
          </Link>
        </section>
      </div>

      <div className="page wl-foot">
        {standalone ? (
          <>
            <Link to="/" className="btn ghost">Voltar ao Início</Link>
            {s.prefs.welcomeDone && <button className="btn quiet" onClick={() => actions.setPrefs({ welcomeDone: false })}>Mostrar estas boas-vindas no Início de novo</button>}
          </>
        ) : (
          <button className="btn quiet" onClick={dismiss}>Já conheço o WinnerZ · ir para o Início de sempre</button>
        )}
      </div>

      {adding && <AddGameDialog onClose={() => setAdding(false)} />}
    </main>
  );
}

function Step({ ok, title, text, cta, to, href, onClick }: { ok: boolean; title: string; text: string; cta: string; to?: string; href?: string; onClick?: (e: MouseEvent) => void }) {
  return (
    <div className={`wl-step${ok ? ' is-ok' : ''}`}>
      <span className="wl-step__dot" aria-hidden="true">{ok && <Icon name="check" size={12} />}</span>
      <b>{title}</b>
      <p>{text}</p>
      {ok ? <span className="kicker kicker--now">Feito</span>
        : to ? <Link to={to} className="wl-step__cta">{cta} →</Link>
        : <a href={href} onClick={onClick} className="wl-step__cta">{cta} →</a>}
      <span className="sr-only">{ok ? 'Concluído.' : 'Ainda não feito.'}</span>
    </div>
  );
}

/** A linha da vida na base da abertura: passado à esquerda, o sol de hoje, desejos e datas à direita. */
function LifeLine({ entries, upcoming, compact }: { entries: LineEntry[]; upcoming: Upcoming[]; compact: boolean }) {
  const marks = upcoming.slice(0, compact ? 1 : 2);
  const placed = lifeLine(entries, {
    thisYear: new Date().getFullYear(),
    maxPast: compact ? 4 : 6, maxShelf: compact ? 2 : 3, maxWish: compact ? 2 : 3,
    wishEnd: marks.length ? (compact ? 86 : 88) : 94, gap: compact ? 8 : 6,
  });
  const hasPast = placed.some((p) => p.kind === 'zerado');
  const day = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: TZ }).replace('.', '').replace(' de ', ' ');
  return (
    <div className="page wl-line-wrap">
      <div className="wl-line" role="list" aria-label="A sua linha da vida gamer">
        <span className="wl-line__lab" aria-hidden="true">← Passado</span>
        <span className="wl-line__lab wl-line__lab--r" aria-hidden="true">Horizonte →</span>
        <span className="wl-line__rule" aria-hidden="true" />
        {!hasPast && (
          <>
            <span className="wl-ghost" style={{ left: '14%' }} aria-hidden="true">O seu primeiro zerado aparece aqui</span>
            <span className="wl-ghost wl-ghost--2" style={{ left: '32%' }} aria-hidden="true">no ano em que saiu</span>
          </>
        )}
        {placed.map((p, i) => (
          <Link key={`${p.kind}-${p.game.id}`} role="listitem" to={`/jogos/${p.game.slug}`} className={`wl-ol wl-ol--${p.kind}`} style={{ left: `${p.x}%`, zIndex: 2 + i, animationDelay: `${0.15 + i * 0.06}s` }} aria-label={`${p.game.title}: ${KIND_LABEL[p.kind]}`}>
            <span className="wl-ol__cv"><CoverArt game={p.game} /></span>
            {p.kind === 'zerado' && p.game.year ? <span className="wl-ol__y">{p.game.year}</span> : null}
          </Link>
        ))}
        <span className="wl-sun" style={{ left: `${SUN_X}%` }} aria-hidden="true" />
        <span className="wl-today" style={{ left: `${SUN_X}%` }}><span className="kicker kicker--now">Hoje · {day}</span><b>Você chegou</b></span>
        {marks.map((u, i) => (
          <Link key={u.key} to={u.to} className={`wl-mile${i ? ' wl-mile--2' : ''}`} style={{ left: `${i ? 97 : compact ? 92 : 89}%` }}>
            <i className={u.title === 'Noite da revelação' ? 'is-dm' : ''} aria-hidden="true" />
            <span className="wl-mile__tx"><span>{stamp(u.day + 'T15:00:00Z')}{u.days > 0 && u.days <= 30 ? ` · ${u.days === 1 ? 'amanhã' : `em ${u.days} dias`}` : u.days === 0 ? ' · hoje' : ''}</span><b>{u.title}</b></span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const KIND_LABEL: Record<LineKind, string> = { zerado: 'zerado', tenho: 'na estante', quero: 'quero jogar' };

/** "O que você já jogou?": três toques por jogo e a estante iluminada que se enche. */
function Picker({ picks, compact, onOther, entries, marked }: { picks: Game[]; compact: boolean; onOther: () => void; entries: LineEntry[]; marked: number }) {
  const s = useStore((x) => x);
  const mine = useRef<{ copies: Map<ID, ID[]>; journeys: Map<ID, ID> }>({ copies: new Map(), journeys: new Map() });
  const [pending, setPending] = useState<Game | null>(null);
  const [kind, setKind] = useState<CopyKind>('fisico');
  const [said, setSaid] = useState('');
  const barRef = useRef<HTMLDivElement>(null);
  const done = useMemo(() => finishedOf(s), [s]);

  useEffect(() => { if (pending && compact) barRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [pending, compact]);

  const ensure = (g: Game) => { if (!s.games[g.id]) actions.mergeGames([g]); };
  const has = (g: Game) => s.copies.some((c) => c.gameId === g.id);
  const wants = (g: Game) => s.wishes.some((w) => w.gameId === g.id);

  const tapHave = (g: Game) => {
    if (has(g)) {
      const ids = mine.current.copies.get(g.id);
      if (!ids?.length) return navigate(`/jogos/${g.slug}`);
      ids.forEach((id) => actions.deleteCopy(id));
      mine.current.copies.delete(g.id);
      setSaid(`${g.title} saiu da estante.`);
      return;
    }
    setPending(pending?.id === g.id ? null : g);
  };
  const addHave = (g: Game, platform: string) => {
    ensure(g);
    const c = actions.addCopy({ gameId: g.id, platform, kind });
    mine.current.copies.set(g.id, [...(mine.current.copies.get(g.id) ?? []), c.id]);
    setPending(null);
    setSaid(`${g.title} entrou na estante (${shortPlatform(platform)}).`);
  };
  const tapDone = (g: Game) => {
    if (done.has(g.id)) {
      const jid = mine.current.journeys.get(g.id);
      if (!jid) return navigate(`/jornada/${g.slug}`);
      actions.deleteJourney(jid);
      mine.current.journeys.delete(g.id);
      setSaid(`${g.title} saiu dos zerados.`);
      return;
    }
    ensure(g);
    const existed = !!journeyForGame(s, g.id);
    actions.recordPast(g.id, { state: 'concluida' });
    const n = existed ? null : journeyForGame(getState(), g.id);
    if (n) mine.current.journeys.set(g.id, n.id);
    setSaid(`${g.title} foi para os zerados, no ano em que saiu.`);
  };
  const tapWant = (g: Game) => {
    ensure(g);
    const on = actions.toggleWish(g.id);
    setSaid(on ? `${g.title} entrou nos desejos.` : `${g.title} saiu dos desejos.`);
  };

  const plats = pending ? [...new Set(pending.platforms)].sort((a, b) => platformRank(a) - platformRank(b)).slice(0, 6) : [];
  const shelf = entries.slice().sort((a, b) => ORDER[a.kind] - ORDER[b.kind]).slice(0, 18);
  const nT = entries.filter((e) => e.kind === 'tenho').length, nZ = entries.filter((e) => e.kind === 'zerado').length, nQ = entries.filter((e) => e.kind === 'quero').length;
  const slots = Math.max(0, (compact ? 9 : 16) - shelf.length);

  return (
    <div className="card wl-pick">
      <h3 className="t wl-pick__title">O que você já jogou?</h3>
      <p className="wl-keys" aria-hidden="true">
        <span><Icon name="estante" size={14} />Tenho</span>
        <span><Icon name="check" size={14} />Já zerei</span>
        <span><Icon name="desejo" size={14} />Quero jogar</span>
      </p>
      {!picks.length && <p className="muted">Carregando alguns clássicos…</p>}
      <div className="wl-grid">
        {picks.map((g) => {
          const st = done.has(g.id) ? 'zerei' : has(g) ? 'tenho' : wants(g) ? 'quero' : '';
          return (
            <div key={g.id} className={`wl-gt${st ? ` is-on is-${st}` : ''}${pending?.id === g.id ? ' is-pending' : ''}`}>
              <Link to={`/jogos/${g.slug}`} className="wl-gt__cv" aria-label={`${g.title}${g.year ? `, ${g.year}` : ''}`}><CoverArt game={g} /></Link>
              <div className="wl-ic3" role="group" aria-label={g.title}>
                <button type="button" className={`wl-b1${has(g) ? ' on' : ''}`} aria-pressed={has(g)} aria-expanded={pending?.id === g.id} aria-label={`Tenho ${g.title}`} title="Tenho" onClick={() => tapHave(g)}><Icon name="estante" size={15} /></button>
                <button type="button" className={`wl-b2${done.has(g.id) ? ' on' : ''}`} aria-pressed={done.has(g.id)} aria-label={`Já zerei ${g.title}`} title="Já zerei" onClick={() => tapDone(g)}><Icon name="check" size={15} /></button>
                <button type="button" className={`wl-b3${wants(g) ? ' on' : ''}`} aria-pressed={wants(g)} aria-label={`Quero jogar ${g.title}`} title="Quero jogar" onClick={() => tapWant(g)}><Icon name="desejo" size={15} /></button>
              </div>
            </div>
          );
        })}
        <button type="button" className="wl-gt wl-other" onClick={onOther}>
          <span className="wl-other__in"><Icon name="mais" size={20} /><span>Outro jogo</span><small>pelo nome ou pela câmera</small></span>
        </button>
      </div>

      {pending && (
        <div className="wl-plat" ref={barRef} role="group" aria-label={`Em qual plataforma você tem ${pending.title}?`}>
          <p>Em qual plataforma você tem <b>{pending.title}</b>?</p>
          <div className="wl-plat__kinds" role="group" aria-label="Tipo">
            {(['fisico', 'digital'] as CopyKind[]).map((k) => (
              <button key={k} type="button" className="chip" aria-pressed={kind === k} onClick={() => setKind(k)}>{k === 'fisico' ? 'Físico' : 'Digital'}</button>
            ))}
          </div>
          <div className="wl-plat__list">
            {plats.map((p) => <button key={p} type="button" className="btn sm ghost" onClick={() => addHave(pending, p)}>{shortPlatform(p)}</button>)}
            <button type="button" className="btn sm ghost" onClick={() => addHave(pending, 'Outra plataforma')}>Outra</button>
            <button type="button" className="btn sm quiet" onClick={() => setPending(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <p className="sr-only" role="status" aria-live="polite">{said}</p>
      <p className="wl-more muted">Tem muitos? <Link to="/colecao/importar">Importe da planilha</Link> ou <Link to="/colecao/steam">da Steam</Link>.</p>

      <div className="wl-shelf-w">
        <div className="wl-shelf-lbl">
          <span className="kicker">Sua estante</span>
          <b className="t">{marked}</b>
          <small>{[nT ? `${nT} na estante` : '', nZ ? `${nZ} ${nZ === 1 ? 'zerado' : 'zerados'}` : 'nenhum zerado ainda', nQ ? `${nQ} ${nQ === 1 ? 'desejo' : 'desejos'}` : ''].filter(Boolean).join(' · ')}</small>
        </div>
        <Link to="/colecao" className="wl-shelf" aria-label="Abrir a sua estante">
          {shelf.map((e) => (
            <span key={`${e.kind}-${e.game.id}`} className={`wl-sp${e.kind === 'quero' ? ' is-q' : ''}`} title={e.game.title}>
              {e.game.cover && <img src={e.game.cover} alt="" loading="lazy" />}
              <span>{e.game.title}</span>
            </span>
          ))}
          {Array.from({ length: slots }, (_, i) => <span key={i} className="wl-slot" aria-hidden="true" />)}
        </Link>
      </div>
    </div>
  );
}

const ORDER: Record<LineKind, number> = { zerado: 0, tenho: 1, quero: 2 };

function AwardCard({ award }: { award: Award | null }) {
  if (!award) return null;
  const p = phaseOf(award);
  if (p === 'rascunho') return null;
  const when = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: TZ }) : '');
  const line = p === 'antes' ? (award.votingOpens ? `A votação abre em ${when(award.votingOpens)}.` : 'A votação abre em breve.')
    : p === 'aberta' ? (award.votingCloses ? `Votação aberta até ${when(award.votingCloses)}.` : 'Votação aberta.')
    : p === 'apurando' ? `O resultado sai em ${when(publicAt(award))}.`
    : 'Veja quem levou cada categoria.';
  return (
    <article className="card wl-award">
      <div>
        <div className="kicker kicker--now">{award.title}</div>
        <div className="wl-award__line">{line}</div>
      </div>
      <Link to="/eventos/awards" className={`btn sm ${p === 'aberta' ? 'now' : 'ghost'}`}>{p === 'aberta' ? 'Votar' : 'Ver'}</Link>
    </article>
  );
}

function BigRelease({ game, wished }: { game: Game; wished: boolean; known: boolean }) {
  const day = game.releasedOn ? new Date(game.releasedOn + 'T15:00:00Z').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }) : '';
  const toggle = () => { actions.mergeGames([game]); actions.toggleWish(game.id); };
  return (
    <article className="card wl-big on-photo">
      {game.backdrop && <img className="wl-big__bg" src={game.backdrop} alt="" loading="lazy" />}
      <span className="wl-big__shade" aria-hidden="true" />
      <div className="wl-big__tx">
        <span className="kicker wl-big__k">Radar{day ? ` · ${day}` : ''}</span>
        <Link to={`/jogos/${game.slug}`} className="t wl-big__title">{game.title}</Link>
        <button type="button" className={`btn sm ${wished ? 'ghost' : 'primary'}`} aria-pressed={wished} onClick={toggle}>{wished ? 'No seu Radar ✓' : 'Quero acompanhar'}</button>
      </div>
    </article>
  );
}
