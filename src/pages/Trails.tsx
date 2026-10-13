import { useCallback, useEffect, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { useStore, actions, slugify, currentHistory, isOpenState } from '../data/store';
import type { State } from '../data/types';
import { trailsApi, type Trail, type TrailGame } from '../data/trails';
import { canAdmin } from '../data/awards';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
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
          <p className="muted lead">Jogos em sequência, com um fio que liga um ao outro. Siga no seu ritmo: o que você já jogou aparece marcado.</p>
        </div>
        <SubNav pillar="jogos" />
      </header>
      {admin && <button className="btn ghost sm" onClick={() => void create()}>Nova trilha</button>}
      {error && <p className="awards__error" role="alert">{error}</p>}
      {list && !list.length && !error && <div className="card tl-empty"><p className="muted">As primeiras trilhas estão sendo montadas.</p></div>}
      <ul className="trails__list">
        {(list ?? []).map((t) => {
          const done = t.items.filter((i) => statusOf(s, i.game) === 'Zerado').length;
          return (
            <li key={t.id}>
              <Link to={`/jogos/trilhas/${t.slug}`} className="card trail-card">
                <span className="trail-card__covers">{t.items.slice(0, 5).map((i) => <span key={i.id} className={statusOf(s, i.game) === 'Zerado' ? 'is-done' : ''}><CoverArt game={i.game} /></span>)}</span>
                <span className="trail-card__text">
                  <strong className="t">{t.title}</strong>
                  {t.intro && <span className="muted">{t.intro}</span>}
                  <span className="faint">{t.items.length} {t.items.length === 1 ? 'jogo' : 'jogos'}{done && !s.prefs.light ? `, você já zerou ${done}` : ''}{t.published ? '' : ' · rascunho'}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
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
  return (
    <main className="page pad trail">
      <header className="page-head">
        <div className="page-head__text">
          <Link to="/jogos/trilhas" className="kicker trail__back">← Trilhas</Link>
          {!(editing && admin) && <h1 className="t big">{t.title}</h1>}
          {!(editing && admin) && t.intro && <p className="muted lead">{t.intro}</p>}
        </div>
        <SubNav pillar="jogos" />
      </header>
      {editing && admin ? <TrailEditor trail={t} onSaved={reload} onDone={() => setEditing(false)} /> : (
        <>
          {admin && <button className="btn ghost sm trail__edit" onClick={() => setEditing(true)}>Editar trilha</button>}
          {nextUp && (
            <Link to={`/jogos/${nextUp.game.slug}`} className="trail-next on-photo">
              <span className="trail-next__cover"><CoverArt game={nextUp.game} /></span>
              <span className="trail-next__text"><span className="kicker kicker--now">Próximo no seu caminho</span><span className="t trail-next__title">{nextUp.game.title}</span>{nextUp.game.year && <span className="muted">{nextUp.game.year}</span>}</span>
              <span className="trail-next__go" aria-hidden="true">→</span>
            </Link>
          )}
        </>
      )}
      <ol className="trail__items">
        {t.items.map((i, k) => {
          const st = statusOf(s, i.game);
          return (
            <li key={i.id} className={`trail__item${st === 'Zerado' ? ' is-done' : ''}${nextUp?.id === i.id ? ' is-next' : ''}`}>
              <span className="trail__n t">{k + 1}</span>
              <Link to={`/jogos/${i.game.slug}`} className="trail__cover"><CoverArt game={i.game} /></Link>
              <div className="trail__text">
                <Link to={`/jogos/${i.game.slug}`} className="trail__title">{i.game.title}</Link>
                {i.game.year && <span className="faint"> {i.game.year}</span>}
                {i.note && <p className="muted">{i.note}</p>}
                {editing && admin && <ItemEditor trail={t} index={k} onSaved={reload} />}
              </div>
              {st && <span className={`trail__tag trail__tag--${st === 'Zerado' ? 'done' : 'mine'}`}>{st}</span>}
            </li>
          );
        })}
      </ol>
      {editing && admin && <AddToTrail trail={t} onSaved={reload} />}
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
      <input className="field" placeholder="Adicionar jogo à trilha (busca no IGDB)" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="awards-admin__hits">
        {hits.map((h) => (
          <li key={h.slug}><button className="awards-admin__hit" disabled={!!busy} onClick={() => void add(h)}><span className="awards-admin__cover"><CoverArt game={h} /></span><span>{h.title}{h.year ? ` (${h.year})` : ''}</span><span className="faint">{busy === h.slug ? 'Adicionando…' : 'Adicionar'}</span></button></li>
        ))}
      </ul>
    </div>
  );
}
