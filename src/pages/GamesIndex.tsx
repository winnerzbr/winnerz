import { useEffect, useMemo, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, useStore, getState } from '../data/store';
import type { Game } from '../data/types';
import { searchGames, loadGame, AddGameDialog, type Hit } from '../components/AddGameDialog';
import { Icon } from '../components/Icon';
import { Toast } from '../components/Toast';
import { SubNav } from '../components/SubNav';
import { CoverArt } from '../components/CoverArt';
import { MoreActions } from '../components/MoreActions';
import { recordPastNow } from '../components/PastPlay';

const hitOf = (g: Game): Hit => ({ igdbId: g.igdbId, slug: g.slug, title: g.title, year: g.year, cover: g.cover, platforms: g.platforms, local: g });

export function GamesIndex() {
  const games = useStore((s) => s.games);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<Hit | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const say = (text: string) => setToast({ id: Date.now(), text });

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    setSearching(true);
    const t = setTimeout(async () => { setHits((await searchGames(q.trim(), Object.values(games))).hits); setSearching(false); }, 300);
    return () => clearTimeout(t);
  }, [q, games]);

  // Do seu universo: os jogos em andamento e os que chegaram por último (a coleção inteira fica na Estante).
  const s = useStore((x) => x);
  const list = useMemo(() => {
    const playing = s.journeys.filter((j) => { const h = s.histories.filter((x) => x.journeyId === j.id).sort((a, b) => b.ordinal - a.ordinal)[0]; return h && (h.state === 'ativa' || h.state === 'pausada'); }).map((j) => j.gameId);
    const recent = [...s.copies].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')).map((c) => c.gameId);
    const wished = s.wishes.map((w) => w.gameId);
    return [...new Set([...playing, ...wished, ...recent])].map((id) => games[id]).filter((g): g is Game => !!g).slice(0, 24);
  }, [s, games]);

  return (
    <main className="page pad">
      <SubNav pillar="jogos" />
      <h1 className="t big">Jogos</h1>
      <p className="muted lead">Busque qualquer jogo, ou <Link to="/jogos/explorar">explore o catálogo</Link> por gênero, plataforma e época. Fichas e capas vêm do IGDB.</p>
      <label htmlFor="jq" className="sr-only">Buscar jogo</label>
      <input id="jq" className="field games-search" placeholder="Buscar um jogo pelo nome" value={q} onChange={(e) => setQ(e.target.value)} />

      {q.trim().length >= 2 && (
        <section className="block" aria-live="polite">
          <div className="block__head"><h2 className="t">Resultados</h2><span className="muted">{searching ? 'Buscando…' : `${hits.length} ${hits.length === 1 ? 'jogo' : 'jogos'}`}</span></div>
          {!searching && hits.length === 0 && <p className="muted">Nenhum jogo encontrado com esse nome.</p>}
          <div className="cover-grid">
            {hits.map((h) => <GameTile key={h.slug} hit={h} onAdd={setAdding} say={say} />)}
          </div>
        </section>
      )}

      <section className="block">
        <div className="block__head"><h2 className="t">Do seu universo</h2><Link to="/colecao">A estante inteira</Link></div>
        <div className="cover-grid">
          {list.map((g) => <GameTile key={g.id} hit={hitOf(g)} onAdd={setAdding} say={say} />)}
        </div>
      </section>

      {adding && <AddGameDialog initial={adding} onClose={() => setAdding(null)} />}
      {toast && <Toast key={toast.id} text={toast.text} />}
    </main>
  );
}

/** Capa com ações rápidas: coleção, favorito e desejo, sem precisar abrir a ficha. */
export function GameTile({ hit, onAdd, say }: { hit: Hit; onAdd: (h: Hit) => void; say: (t: string) => void }) {
  const s = useStore((x) => x);
  const known = hit.local ?? Object.values(s.games).find((g) => g.slug === hit.slug);
  const id = known?.id;
  const owned = !!id && s.copies.some((c) => c.gameId === id);
  const fav = !!id && s.favorites.includes(id);
  const wished = !!id && s.wishes.some((w) => w.gameId === id);
  const onRadar = !!id && !!s.myGames[id]?.onRadar;
  const wontPlay = !!id && !!s.myGames[id]?.wontPlay;
  const canTrack = s.schemaV6 || s.mode === 'demo';
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

  return (
    <div className="cover-grid__item">
      <button className="cover-grid__cover" onClick={open} aria-busy={busy === 'open'} aria-label={`Abrir a ficha de ${hit.title}`}>
        <CoverArt game={{ title: hit.title, cover: hit.cover }} platform={hit.platforms[0]} />
        {owned && <span className="cover-grid__badge" title="Na sua coleção"><Icon name="check" size={13} /></span>}
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
        <MoreActions label={`Mais ações para ${hit.title}`} items={[
          { key: 'radar', icon: 'radar', on: onRadar, label: onRadar ? 'No Radar (deixar de acompanhar)' : 'Acompanhar no Radar', disabled: !canTrack, hint: canTrack ? undefined : 'Disponível depois da migração 0006',
            onSelect: async () => { const gid = await ensure('more'); if (!gid) return; const on = actions.toggleRadar(gid); say(on ? 'Acompanhando no Radar.' : 'Fora do Radar.'); } },
          { key: 'zerei', icon: 'check', label: 'Já zerei', onSelect: async () => { const gid = await ensure('more'); if (gid) recordPastNow(gid); } },
          { key: 'nao', icon: 'fechar', on: wontPlay, label: wontPlay ? 'Marcado: não vou jogar (desfazer)' : 'Não vou jogar', onSelect: async () => { const gid = await ensure('more'); if (!gid) return; const v = actions.toggleWontPlay(gid); say(v ? 'Marcado como “não vou jogar”.' : 'Desmarcado.'); } },
          { key: 'ficha', icon: 'avancar', label: 'Abrir a ficha', onSelect: open },
        ]} />
      </div>
      <button className="cover-grid__title linkish" onClick={open}>{hit.title}</button>
      <span className="faint cover-grid__year">{[hit.year, hit.platforms.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}</span>
    </div>
  );
}

