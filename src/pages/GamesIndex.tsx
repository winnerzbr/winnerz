import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, useStore, getState } from '../data/store';
import type { Game } from '../data/types';
import { searchGames, loadGame, AddGameDialog, type Hit } from '../components/AddGameDialog';
import { Icon } from '../components/Icon';
import { Toast } from '../components/Toast';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
import { Backdrop } from '../components/Backdrop';
import { backdropCandidates } from '../lib/backdrop';
import { MoreActions, type MoreItem } from '../components/MoreActions';
import { recordPastNow } from '../components/PastPlay';

const hitOf = (g: Game): Hit => ({ igdbId: g.igdbId, slug: g.slug, title: g.title, year: g.year, cover: g.cover, platforms: g.platforms, local: g });

type Tag = 'jornada' | 'zerado' | 'colecao' | 'desejo';
const TAG_LABEL: Record<Tag, string> = { jornada: 'Jornada', zerado: 'Zerado', colecao: 'Coleção', desejo: 'Desejo' };

export function GamesIndex() {
  const games = useStore((s) => s.games);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<Hit | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const [all, setAll] = useState(false);
  const say = (text: string) => setToast({ id: Date.now(), text });
  const results = useRef<HTMLElement>(null);
  const seq = useRef(0);

  const run = async (term: string) => {
    const n = ++seq.current;
    setSearching(true);
    const found = (await searchGames(term, Object.values(getState().games))).hits;
    if (n !== seq.current) return;
    setHits(found);
    setSearching(false);
  };

  useEffect(() => {
    if (q.trim().length < 2) { seq.current++; setHits([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(() => run(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q, games]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    run(q.trim());
    results.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Do seu universo: o que está em andamento, o que você zerou, o que chegou por último e o que deseja.
  const s = useStore((x) => x);
  const universe = useMemo(() => {
    const last = (jid: string) => s.histories.filter((x) => x.journeyId === jid).sort((a, b) => b.ordinal - a.ordinal)[0];
    const tags = new Map<string, Tag>();
    const put = (id: string, t: Tag) => { if (!tags.has(id)) tags.set(id, t); };
    for (const j of s.journeys) { const h = last(j.id); if (h && (h.state === 'ativa' || h.state === 'pausada')) put(j.gameId, 'jornada'); }
    for (const j of s.journeys) { if (s.histories.some((h) => h.journeyId === j.id && h.state === 'concluida')) put(j.gameId, 'zerado'); }
    const recent = [...s.copies].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    // Intercala: alguns zerados, depois a estante recente e os desejos.
    const order: string[] = [...tags.keys()].filter((id) => tags.get(id) === 'jornada');
    const done = [...tags.keys()].filter((id) => tags.get(id) === 'zerado').slice(0, 6);
    for (const c of recent) put(c.gameId, 'colecao');
    for (const w of s.wishes) put(w.gameId, 'desejo');
    const owned = [...tags.keys()].filter((id) => tags.get(id) === 'colecao');
    const wished = [...tags.keys()].filter((id) => tags.get(id) === 'desejo');
    return [...new Set([...order, ...owned.slice(0, 6), ...done, ...wished.slice(0, 4), ...owned.slice(6)])]
      .map((id) => ({ game: games[id], tag: tags.get(id)! }))
      .filter((x): x is { game: Game; tag: Tag } => !!x.game)
      .slice(0, 24);
  }, [s, games]);
  const shown = all ? universe : universe.slice(0, 10);
  // Fundo do topo: um jogo sorteado a cada visita entre os da sua Jornada e da estante (de preferência os que têm imagem).
  const [seed] = useState(() => Math.random());
  const heroGame = useMemo(() => {
    const ids = [...new Set([...s.journeys.map((j) => j.gameId), ...s.copies.map((c) => c.gameId)])].sort();
    const pool = ids.map((id) => games[id]).filter((g): g is Game => !!g);
    const withArt = pool.filter((g) => backdropCandidates(g).length > 0);
    const from = withArt.length ? withArt : pool;
    return from.length ? from[Math.floor(seed * from.length)] : universe[0]?.game;
  }, [s.journeys, s.copies, games, seed, universe]);

  return (
    <main>
      <section className="ghub on-photo" aria-labelledby="ghub-title">
        {heroGame && <Backdrop game={heroGame} className="ghub__bg" />}
        <div className="ghub__shade" aria-hidden="true" />
        <div className="page ghub__inner">
          <SubNav pillar="jogos" />
          <h1 id="ghub-title" className="t ghub__title">Qualquer jogo.<br />De qualquer época.</h1>
          <form className="ghub__search" role="search" onSubmit={submit}>
            <Icon name="busca" size={22} />
            <label htmlFor="jq" className="sr-only">Buscar jogo</label>
            <input id="jq" className="field" placeholder="Busque qualquer jogo…" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn primary" type="submit">Buscar jogo</button>
          </form>
          <p className="kicker ghub__note"><Link to="/jogos/explorar">Ou explore por gênero e época</Link></p>
        </div>
      </section>

      <div className="page pad ghub__body">
        {q.trim().length >= 2 && (
          <section className="block ghub__results" aria-live="polite" ref={results}>
            <div className="ghub__head"><h2 className="kicker">Resultados</h2><span className="muted">{searching ? 'Buscando…' : `${hits.length} ${hits.length === 1 ? 'jogo' : 'jogos'}`}</span></div>
            {!searching && hits.length === 0 && <p className="muted">Nenhum jogo encontrado com esse nome.</p>}
            <div className="cover-grid">
              {hits.map((h) => <GameTile key={h.slug} hit={h} onAdd={setAdding} say={say} />)}
            </div>
          </section>
        )}

        {universe.length > 0 && (
          <section className="block ghub__universe" aria-labelledby="uv-title">
            <div className="ghub__head"><h2 id="uv-title" className="kicker">Do seu universo</h2><span className="muted">Jogos que já passaram pela sua Jornada ou Coleção</span></div>
            <ul className="uv-list">
              {shown.map(({ game, tag }) => <UniverseRow key={game.id} game={game} tag={tag} onAdd={setAdding} say={say} />)}
            </ul>
            <div className="ghub__foot">
              {universe.length > 10 && <button className="btn quiet sm" onClick={() => setAll((v) => !v)}>{all ? 'Mostrar menos' : `Mostrar mais ${universe.length - 10}`}</button>}
              <Link className="arrow-link" to="/colecao">A estante inteira</Link>
            </div>
          </section>
        )}
      </div>

      {adding && <AddGameDialog initial={adding} onClose={() => setAdding(null)} />}
      {toast && <Toast key={toast.id} text={toast.text} />}
    </main>
  );
}

/** Linha do "Do seu universo": capa, nome, ano e plataformas, a marca da relação e as ações rápidas num menu. */
function UniverseRow({ game, tag, onAdd, say }: { game: Game; tag: Tag; onAdd: (h: Hit) => void; say: (t: string) => void }) {
  const hit = hitOf(game);
  const a = useGameActions(hit, say);
  return (
    <li className="uv">
      <Link className="uv__link" to={`/jogos/${game.slug}`}>
        <span className="uv__cover"><CoverArt game={{ title: game.title, cover: game.cover }} platform={game.platforms[0]} /></span>
        <span className="uv__text">
          <span className="t uv__title">{game.title}</span>
          <span className="mono uv__meta">{[game.year, game.platforms.slice(0, 4).join(', ')].filter(Boolean).join(' · ')}</span>
        </span>
        <span className={`uv__tag uv__tag--${tag}`}>{TAG_LABEL[tag]}</span>
      </Link>
      <MoreActions className="uv__more" label={`Ações para ${game.title}`} items={[
        a.owned
          ? { key: 'col', icon: 'estante', on: true, label: 'Na sua coleção (abrir a estante)', onSelect: () => navigate('/colecao') }
          : { key: 'col', icon: 'mais', label: 'Adicionar à coleção', onSelect: () => onAdd(hit) },
        { key: 'fav', icon: 'coracao', on: a.fav, label: a.fav ? 'Favorito (tirar)' : 'Favoritar', onSelect: a.favorite },
        { key: 'wish', icon: 'desejo', on: a.wished, label: a.wished ? 'Nos desejos (tirar)' : 'Colocar nos desejos', onSelect: a.wish },
        ...a.moreItems.filter((i) => i.key !== 'ficha'),
      ]} />
    </li>
  );
}

/** As ações rápidas de um jogo (da busca ou do site), compartilhadas pela capa e pela linha. */
function useGameActions(hit: Hit, say: (t: string) => void) {
  const s = useStore((x) => x);
  const known = hit.local ?? Object.values(s.games).find((g) => g.slug === hit.slug);
  const id = known?.id;
  const owned = !!id && s.copies.some((c) => c.gameId === id);
  const fav = !!id && s.favorites.includes(id);
  const wished = !!id && s.wishes.some((w) => w.gameId === id);
  const onRadar = !!id && !!s.myGames[id]?.onRadar;
  const wontPlay = !!id && !!s.myGames[id]?.wontPlay;
  const canTrack = s.schemaV6 || s.mode === 'demo';
  const playing = !!id && s.journeys.some((j) => j.gameId === id && s.histories.some((h) => h.journeyId === j.id && (h.state === 'ativa' || h.state === 'pausada')));
  const status: { label: string; now?: boolean } | null = playing ? { label: 'Na jornada', now: true } : owned ? { label: 'Na estante' } : wished ? { label: 'Desejo' } : null;
  const [busy, setBusy] = useState<string | null>(null);
  const [pop, setPop] = useState(0);

  /** Jogos que vieram da busca ainda não estão no site: carrega a ficha antes de agir. */
  const ensure = async (what: string): Promise<string | null> => {
    if (id) return id;
    setBusy(what);
    const g = await loadGame(hit);
    setBusy(null);
    if (!g) { say('Não consegui carregar este jogo agora. Tente de novo.'); return null; }
    actions.mergeGames([g]);
    return g.id;
  };

  const open = async () => { const gid = await ensure('open'); if (gid) navigate(`/jogos/${hit.slug}`); };
  const favorite = async () => {
    const gid = await ensure('fav'); if (!gid) return;
    const was = getState().favorites.includes(gid);
    actions.toggleFavorite(gid); setPop((n) => n + 1);
    say(was ? 'Tirado dos favoritos.' : 'Favoritado.');
  };
  const wish = async () => {
    const gid = await ensure('wish'); if (!gid) return;
    const was = getState().wishes.some((w) => w.gameId === gid);
    actions.toggleWish(gid);
    say(was ? 'Tirado dos desejos.' : 'Nos seus desejos.');
  };
  const moreItems: MoreItem[] = [
    { key: 'radar', icon: 'radar', on: onRadar, label: onRadar ? 'No Radar (deixar de acompanhar)' : 'Acompanhar no Radar', disabled: !canTrack, hint: canTrack ? undefined : 'Disponível depois da migração 0006',
      onSelect: async () => { const gid = await ensure('more'); if (!gid) return; const on = actions.toggleRadar(gid); say(on ? 'Acompanhando no Radar.' : 'Fora do Radar.'); } },
    { key: 'zerei', icon: 'check', label: 'Já zerei', onSelect: async () => { const gid = await ensure('more'); if (gid) recordPastNow(gid); } },
    { key: 'nao', icon: 'fechar', on: wontPlay, label: wontPlay ? 'Marcado: não vou jogar (desfazer)' : 'Não vou jogar', onSelect: async () => { const gid = await ensure('more'); if (!gid) return; const v = actions.toggleWontPlay(gid); say(v ? 'Marcado como “não vou jogar”.' : 'Desmarcado.'); } },
    { key: 'ficha', icon: 'avancar', label: 'Abrir a ficha', onSelect: open },
  ];
  return { owned, fav, wished, status, busy, pop, open, favorite, wish, moreItems };
}

/** Capa com ações rápidas: coleção, favorito e desejo, sem precisar abrir a ficha. */
export function GameTile({ hit, onAdd, say, pill, meta }: { hit: Hit; onAdd: (h: Hit) => void; say: (t: string) => void; pill?: { big: string; small: string; dim?: boolean }; meta?: string }) {
  const { owned, fav, wished, status, busy, pop, open, favorite, wish, moreItems } = useGameActions(hit, say);
  return (
    <div className="cover-grid__item">
      <button className="cover-grid__cover" onClick={open} aria-busy={busy === 'open'} aria-label={`Abrir a ficha de ${hit.title}`}>
        <CoverArt game={{ title: hit.title, cover: hit.cover }} platform={hit.platforms[0]} />
        {status && <span className={`cover-grid__own${status.now ? ' is-now' : ''}`}>{status.label}</span>}
        {pill && <span className={`cover-grid__score${pill.dim ? ' is-dim' : ''}`}><b>{pill.big}</b><i>{pill.small}</i></span>}
      </button>
      <div className="quick" role="group" aria-label={`Ações rápidas para ${hit.title}`}>
        {owned ? (
          <Link to="/colecao" className="quick__btn is-on" title="Na sua coleção" aria-label="Na sua coleção"><Icon name="estante" size={17} /></Link>
        ) : (
          <button className="quick__btn" title="Adicionar à coleção" aria-label="Adicionar à coleção" onClick={() => onAdd(hit)}><Icon name="mais" size={17} /></button>
        )}
        <button className={`quick__btn${fav ? ' is-on is-fav' : ''}`} aria-pressed={fav} title={fav ? 'Favorito' : 'Favoritar'} aria-label={fav ? 'Tirar dos favoritos' : 'Favoritar'} onClick={favorite} aria-busy={busy === 'fav'}>
          <span key={pop} className={pop && fav ? 'heart-pop' : ''} style={{ display: 'inline-flex' }}><Icon name="coracao" size={17} fill={fav ? 'currentColor' : 'none'} /></span>
        </button>
        <button className={`quick__btn${wished ? ' is-on' : ''}`} aria-pressed={wished} title={wished ? 'Nos seus desejos' : 'Colocar nos desejos'} aria-label={wished ? 'Tirar dos desejos' : 'Colocar nos desejos'} onClick={wish} aria-busy={busy === 'wish'}>
          <Icon name="desejo" size={17} fill={wished ? 'currentColor' : 'none'} />
        </button>
        <MoreActions label={`Mais ações para ${hit.title}`} items={moreItems} />
      </div>
      <button className="t cover-grid__title linkish" onClick={open}>{hit.title}</button>
      <span className="mono cover-grid__year">{meta ?? [hit.year, hit.platforms.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}</span>
    </div>
  );
}
