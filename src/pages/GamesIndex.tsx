import { useEffect, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, useStore } from '../data/store';
import { searchGames, loadGame } from '../components/AddGameDialog';

export function GamesIndex() {
  const games = useStore((s) => s.games);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Awaited<ReturnType<typeof searchGames>>['hits']>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => setHits((await searchGames(q.trim(), Object.values(games))).hits), 300);
    return () => clearTimeout(t);
  }, [q, games]);

  const open = async (h: (typeof hits)[number]) => {
    setLoading(h.slug);
    const g = await loadGame(h);
    setLoading(null);
    if (g) { actions.mergeGames([g]); navigate(`/jogos/${g.slug}`); }
  };

  const list = Object.values(games).sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

  return (
    <main className="page pad">
      <h1 className="t big">Jogos</h1>
      <p className="muted lead">Busque qualquer jogo. Fichas e capas vêm do IGDB.</p>
      <label htmlFor="jq" className="sr-only">Buscar jogo</label>
      <input id="jq" className="field games-search" placeholder="Buscar um jogo pelo nome" value={q} onChange={(e) => setQ(e.target.value)} />
      {hits.length > 0 && (
        <ul className="hits hits--page">
          {hits.map((h) => (
            <li key={h.slug}><button onClick={() => open(h)} aria-busy={loading === h.slug}>
              {h.cover ? <img src={h.cover} alt="" /> : <span className="hits__nocover" />}
              <span><span className="hits__title">{h.title}</span><span className="muted hits__meta">{[h.year, h.platforms.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}</span></span>
            </button></li>
          ))}
        </ul>
      )}
      <section className="block">
        <div className="block__head"><h2 className="t">Do seu universo</h2></div>
        <div className="cover-grid">
          {list.map((g) => (
            <Link key={g.id} to={`/jogos/${g.slug}`} className="cover-grid__item">
              <img src={g.cover} alt="" />
              <span className="cover-grid__title">{g.title}</span>
              <span className="faint cover-grid__year">{g.year}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
