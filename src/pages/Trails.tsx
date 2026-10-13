import { useCallback, useEffect, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { useStore, actions, slugify, currentHistory, isOpenState } from '../data/store';
import type { Game, State } from '../data/types';
import { trailsApi, type Trail, type TrailGame } from '../data/trails';
import { canAdmin } from '../data/awards';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
import { Backdrop } from '../components/Backdrop';
import { PlayButton } from '../components/PlayButton';
import { ConfirmButton } from '../components/Sheet';
import { searchGames, loadGame, type Hit } from '../components/AddGameDialog';
import { track } from '../lib/track';

type Status = 'Zerado' | 'Jogando' | 'Na estante' | 'Desejo' | null;
function statusOf(s: State, g: TrailGame): Status {
  const mine = s.games[g.id] ? g.id : Object.values(s.games).find((x) => g.igdbId && x.igdbId === g.igdbId)?.id;
  if (!mine) return null;
  const j = s.journeys.find((x) => x.gameId === mine);
  if (j && s.histories.some((h) => h.journeyId === j.id && h.state === 'concluida')) return 'Zerado';
  if (j && isOpenState(currentHistory(s, j.id)?.state)) return 'Jogando';
  if (s.copies.some((c) => c.gameId === mine)) return 'Na estante';
  if (s.wishes.some((w) => w.gameId === mine)) return 'Desejo';
  return null;
}

function useTrails() {
  const mode = useStore((s) => s.mode);
  const [list, setList] = useState<Trail[] | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => { try { setList(await trailsApi().list()); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Não consegui carregar.'); setList([]); } }, []);
  useEffect(() => { void reload(); }, [reload, mode]);
  return { list, error, reload };
}

/** Lista de trilhas. */
export function TrailsPage() {
  const s = useStore((x) => x);
  const { list, error, reload } = useTrails();
  useEffect(() => { track('jogos.trilhas'); }, []);
  const admin = canAdmin();
  const create = async () => {
    const title = 'Nova trilha';
    const t = await trailsApi().saveTrail({ slug: `${slugify(title)}-${Date.now().toString(36).slice(-4)}`, title, published: false, position: list?.length ?? 0 });
    await reload();
    navigate(`/jogos/trilhas/${t.slug}?editar=1`);
  };
  return (
    <main className="page pad trails">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Trilhas</h1>
          <p className="muted lead">Jogos em sequência, com um fio que liga um ao outro. Uma saga, uma época, um desafio. Siga no seu ritmo: o que você já jogou aparece marcado.</p>
        </div>
        <div className="page-head__side trails__side">
          {admin && <button className="btn primary" onClick={() => void create()}>+ Nova trilha</button>}
          <SubNav pillar="jogos" />
        </div>
      </header>
      {error && <p className="awards__error" role="alert">{error}</p>}
      <ul className="trails__list">
        {(list ?? []).map((t) => {
          const st = t.items.map((i) => statusOf(s, i.game));
          const done = st.filter((x) => x === 'Zerado').length;
          const nextIdx = st.findIndex((x) => x !== 'Zerado');
          const shown = t.items.slice(0, 5);
          const bgGame = localOf(s, t.items[Math.max(0, nextIdx)]?.game);
          return (
            <li key={t.id}>
              <Link to={`/jogos/trilhas/${t.slug}`} className="trail-card">
                {bgGame && <Backdrop game={bgGame} className="trail-card__bg" />}
                <span className="trail-card__shade" aria-hidden="true" />
                <span className="trail-card__head">
                  <span className="trail-card__text">
                    <strong className="t">{t.title}</strong>
                    <span className="muted">{t.items.length} {t.items.length === 1 ? 'jogo' : 'jogos'}{done && !s.prefs.light ? ` · você já zerou ${done}` : ''}{t.published ? '' : ' · rascunho'}</span>
                  </span>
                  {t.items.length > 0 && <span className="mono trail-card__count">{done}/{t.items.length}</span>}
                </span>
                {shown.length > 0 && (
                  <span className="trail-card__steps" style={{ ['--n' as string]: shown.length }}>
                    <span className="trail-card__line" aria-hidden="true" style={{ ['--done' as string]: `${Math.max(0, (nextIdx < 0 ? shown.length - 1 : Math.min(nextIdx, shown.length - 1)) / Math.max(1, shown.length - 1)) * 100}%` }} />
                    {shown.map((i, k) => {
                      const x = st[k];
                      const kind = x === 'Zerado' ? 'done' : k === nextIdx ? 'next' : 'todo';
                      return (
                        <span key={i.id} className={`trail-step is-${kind}`}>
                          <span className="trail-step__cover"><CoverArt game={i.game} /></span>
                          <span className="trail-step__mk" aria-hidden="true" />
                          <span className="mono trail-step__label">{kind === 'next' ? 'Próximo' : x ?? ' '}</span>
                        </span>
                      );
                    })}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        {list && (admin || !list.length) && !error && (
          <li>
            {admin ? (
              <button className="trail-new" onClick={() => void create()}>
                <span className="trail-new__plus" aria-hidden="true">+</span>
                <span className="t trail-new__title">Começar uma trilha</span>
                <span className="muted">Ideias: todos os Yakuza na ordem da história. Os jogos que ficaram sem final na adolescência. Um por plataforma.</span>
              </button>
            ) : (
              <div className="trail-new is-static">
                <span className="trail-new__plus" aria-hidden="true">+</span>
                <span className="t trail-new__title">As primeiras trilhas estão sendo montadas</span>
                <span className="muted">Em breve aparecem aqui sagas em ordem, épocas e desafios para seguir no seu ritmo.</span>
              </div>
            )}
          </li>
        )}
      </ul>
    </main>
  );
}

/** O jogo do site para um jogo de trilha (para fundo, plataformas e botão de jogar). */
function localOf(s: State, g?: TrailGame): Game | undefined {
  if (!g) return undefined;
  return s.games[g.id] ?? Object.values(s.games).find((x) => g.igdbId && x.igdbId === g.igdbId);
}

/** Uma trilha: os jogos em ordem, com o porquê de cada um e onde você está nela. */
export function TrailPage({ slug }: { slug: string }) {
  const s = useStore((x) => x);
  const { list, error, reload } = useTrails();
  const t = list?.find((x) => x.slug === slug);
  const [editing, setEditing] = useState(() => location.search.includes('editar=1'));
  const admin = canAdmin();
  if (!list) return <main className="page pad"><p className="muted">Carregando…</p></main>;
  if (!t) return <main className="page pad narrow"><SubNav pillar="jogos" /><h1 className="t big">Trilha</h1><p className="muted lead">{error || 'Essa trilha não existe (ou ainda não foi publicada).'}</p><Link className="btn ghost" to="/jogos/trilhas">Ver as trilhas</Link></main>;
  const nextUp = t.items.find((i) => statusOf(s, i.game) !== 'Zerado');
  const done = t.items.filter((i) => statusOf(s, i.game) === 'Zerado').length;
  const years = t.items.map((i) => i.game.year).filter((y): y is number => !!y);
  const span = years.length > 1 ? `, de ${Math.min(...years)} a ${Math.max(...years)}` : '';
  const heroGame = localOf(s, (nextUp ?? t.items[0])?.game);
  const nextLocal = localOf(s, nextUp?.game);
  const pct = t.items.length ? (done / t.items.length) * 100 : 0;
  const nextCopy = nextLocal && s.copies.find((c) => c.gameId === nextLocal.id);
  const nextStatus = nextUp && statusOf(s, nextUp.game);
  const editingNow = editing && admin;
  return (
    <main className="trail">
      <section className="trail-hero on-photo">
        {heroGame && <Backdrop game={heroGame} className="trail-hero__bg" />}
        <div className="trail-hero__shade" aria-hidden="true" />
        <div className="trail-hero__fade" aria-hidden="true" />
        <div className="page trail-hero__row">
          <div className="trail-hero__text">
            <Link to="/jogos/trilhas" className="kicker trail__back">← Trilhas</Link>
            {!editingNow && <h1 className="t trail-hero__title">{t.title}</h1>}
            {editingNow && <h1 className="t trail-hero__title">Editando a trilha</h1>}
            <p className="trail-hero__lead">{t.intro ? `${t.intro} ` : ''}{t.items.length} {t.items.length === 1 ? 'jogo' : 'jogos'}{span}.{done && !s.prefs.light ? ` Você já zerou ${done}.` : ''}</p>
            {t.items.length > 0 && !s.prefs.light && (
              <div className="trail-hero__prog">
                <div className="hline" aria-hidden="true"><i style={{ width: `${pct}%` }} /><b style={{ left: `${pct}%` }} /></div>
                <span className="mono">{done}/{t.items.length}</span>
              </div>
            )}
          </div>
          <div className="trail-hero__side">
            <SubNav pillar="jogos" />
            {admin && !editingNow && <button className="btn ghost" onClick={() => setEditing(true)}>Editar trilha</button>}
          </div>
        </div>
      </section>

      <div className="page pad trail__body">
        {editingNow && <TrailEditor trail={t} onSaved={reload} onDone={() => setEditing(false)} />}
        <div className="trail__cols">
          {nextUp && !editingNow && (
            <article className="trail-next">
              <span className="kicker kicker--now">Próximo no seu caminho</span>
              <Link to={`/jogos/${nextUp.game.slug}`} className="trail-next__cover"><CoverArt game={nextUp.game} /></Link>
              <h2 className="t trail-next__title">{nextUp.game.title}</h2>
              <p className="muted trail-next__meta">{[nextCopy?.platform ?? nextLocal?.platforms[0], nextUp.game.year, nextStatus === 'Na estante' ? 'Na sua estante' : nextStatus === 'Jogando' ? 'Na sua Jornada' : nextStatus === 'Desejo' ? 'Nos seus desejos' : null].filter(Boolean).join(' · ')}</p>
              {nextUp.note && <p className="trail-next__note">“{nextUp.note}”</p>}
              <div className="trail-next__actions">
                {nextLocal && <PlayButton gameId={nextLocal.id} className="btn" idle="Começar Jornada" />}
                <Link to={`/jogos/${nextUp.game.slug}`} className={`btn ${nextLocal ? 'ghost' : 'primary'}`}>Ver ficha</Link>
              </div>
            </article>
          )}
          <ol className="trail__items">
            {t.items.map((i, k) => {
              const st = statusOf(s, i.game);
              const isNext = nextUp?.id === i.id;
              const plats = localOf(s, i.game)?.platforms.slice(0, 2).join(', ');
              return (
                <li key={i.id} className={`trail__item${st === 'Zerado' ? ' is-done' : ''}${isNext ? ' is-next' : ''}`}>
                  <span className="trail__n">{k + 1}</span>
                  <Link to={`/jogos/${i.game.slug}`} className="trail__cover"><CoverArt game={i.game} /></Link>
                  <div className="trail__text">
                    <Link to={`/jogos/${i.game.slug}`} className="t trail__title">{i.game.title}</Link>
                    {(i.game.year || plats) && <span className="mono trail__meta">{[i.game.year, plats].filter(Boolean).join(' · ')}</span>}
                    {i.note && <p className="trail__note">“{i.note}”</p>}
                    {editingNow && <ItemEditor trail={t} index={k} onSaved={reload} />}
                  </div>
                  {(st || isNext) && <span className={`trail__tag trail__tag--${st === 'Zerado' ? 'done' : isNext ? 'next' : 'mine'}`}>{[st, isNext ? 'Próximo' : null].filter(Boolean).join(' · ')}</span>}
                </li>
              );
            })}
          </ol>
        </div>
        {editingNow && <AddToTrail trail={t} onSaved={reload} />}
      </div>
    </main>
  );
}

function TrailEditor({ trail, onSaved, onDone }: { trail: Trail; onSaved: () => Promise<void>; onDone: () => void }) {
  const [title, setTitle] = useState(trail.title);
  const [intro, setIntro] = useState(trail.intro ?? '');
  const [published, setPublished] = useState(trail.published);
  const [err, setErr] = useState('');
  const save = async () => {
    try {
      const slug = trail.title === title ? trail.slug : `${slugify(title) || 'trilha'}`;
      await trailsApi().saveTrail({ id: trail.id, slug, title: title.trim() || 'Trilha', intro: intro.trim() || undefined, published, position: trail.position });
      await onSaved();
      if (slug !== trail.slug) navigate(`/jogos/trilhas/${slug}`, { replace: true });
      onDone();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Não foi possível gravar.'); }
  };
  return (
    <div className="card trail-editor">
      <label><span className="finish__label">Título</span><input className="field" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label><span className="finish__label">O fio que liga os jogos</span><textarea className="field" rows={2} value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="Ex.: a saga em ordem de lançamento, para quem nunca jogou" /></label>
      <label className="share-card__check"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Publicada (todos veem)</label>
      {err && <p className="awards__error">{err}</p>}
      <div className="sheet__actions">
        <button className="btn primary" onClick={() => void save()}>Gravar</button>
        <button className="btn quiet" onClick={onDone}>Ver como fica</button>
        <ConfirmButton label="Apagar trilha" confirm="Toque de novo para apagar" onConfirm={async () => { await trailsApi().deleteTrail(trail.id); navigate('/jogos/trilhas'); }} />
      </div>
    </div>
  );
}

function ItemEditor({ trail, index, onSaved }: { trail: Trail; index: number; onSaved: () => Promise<void> }) {
  const it = trail.items[index];
  const [note, setNote] = useState(it.note ?? '');
  const move = async (d: -1 | 1) => {
    const other = trail.items[index + d];
    if (!other) return;
    await trailsApi().updateItem(it.id, { position: other.position });
    await trailsApi().updateItem(other.id, { position: it.position === other.position ? it.position + d : it.position });
    await onSaved();
  };
  return (
    <div className="trail__edit">
      <input className="field" value={note} placeholder="Por que este jogo, neste ponto da trilha?" onChange={(e) => setNote(e.target.value)} onBlur={() => { if (note !== (it.note ?? '')) void trailsApi().updateItem(it.id, { note }).then(onSaved); }} />
      <button className="btn quiet sm" disabled={index === 0} onClick={() => void move(-1)} aria-label="Subir">↑</button>
      <button className="btn quiet sm" disabled={index === trail.items.length - 1} onClick={() => void move(1)} aria-label="Descer">↓</button>
      <button className="btn quiet sm" onClick={() => void trailsApi().deleteItem(it.id).then(onSaved)}>Tirar</button>
    </div>
  );
}

function AddToTrail({ trail, onSaved }: { trail: Trail; onSaved: () => Promise<void> }) {
  const games = useStore((s) => s.games);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState('');
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => setHits((await searchGames(q.trim(), Object.values(games))).hits.slice(0, 8)), 300);
    return () => clearTimeout(t);
  }, [q, games]);
  const add = async (h: Hit) => {
    setBusy(h.slug);
    const g = h.local ?? Object.values(games).find((x) => x.igdbId && x.igdbId === h.igdbId) ?? (await loadGame(h));
    if (g) { actions.mergeGames([g]); await trailsApi().addItem(trail.id, g, (trail.items.at(-1)?.position ?? -1) + 1); await onSaved(); }
    setBusy(''); setQ('');
  };
  return (
    <div className="card trail-add">
      <input className="field" placeholder="Adicionar jogo à trilha (busca no catálogo)" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="awards-admin__hits">
        {hits.map((h) => (
          <li key={h.slug}><button className="awards-admin__hit" disabled={!!busy} onClick={() => void add(h)}><span className="awards-admin__cover"><CoverArt game={h} /></span><span>{h.title}{h.year ? ` (${h.year})` : ''}</span><span className="faint">{busy === h.slug ? 'Adicionando…' : 'Adicionar'}</span></button></li>
        ))}
      </ul>
    </div>
  );
}
