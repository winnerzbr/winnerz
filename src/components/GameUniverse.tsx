import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import type { Game } from '../data/types';
import type { Hit } from './AddGameDialog';
import { CoverArt } from './CoverArt';

type Universe = { groups: { title: string; games: Hit[] }[]; series?: string | null };
const cache = new Map<number, Universe>();

/** Universo do jogo: série, expansões, remakes e parecidos (do IGDB). Marca o que já é seu. */
export function GameUniverse({ game }: { game: Game }) {
  const id = game.igdbId;
  const [u, setU] = useState<Universe | null>(id ? cache.get(id) ?? null : null);
  const s = useStore((x) => x);
  useEffect(() => {
    if (!id || cache.has(id)) return;
    let alive = true;
    fetch(`/api/igdb?related=${id}`)
      .then((r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? r.json() : null))
      .then((j: Universe | null) => { if (j && alive) { cache.set(id, j); setU(j); } })
      .catch(() => {});
    return () => { alive = false; };
  }, [id]);
  if (!u || !u.groups?.length) return null;

  const mine = (slug: string) => {
    const g = Object.values(s.games).find((x) => x.slug === slug);
    if (!g) return null;
    if (s.journeys.some((j) => j.gameId === g.id && s.histories.some((h) => h.journeyId === j.id && h.state === 'concluida'))) return 'Zerado';
    if (s.copies.some((c) => c.gameId === g.id)) return 'Na estante';
    if (s.wishes.some((w) => w.gameId === g.id)) return 'Desejo';
    return null;
  };

  return (
    <section className="page universe" aria-labelledby="universo">
      <div className="block__head"><h2 id="universo" className="t">Universo de {game.title}</h2>{u.series && <span className="muted">Série: {u.series}</span>}</div>
      {u.groups.map((gr) => (
        <div key={gr.title} className="universe__group">
          <h3 className="universe__h">{gr.title}</h3>
          <ul className="universe__row">
            {gr.games.map((h) => {
              const tag = mine(h.slug);
              return (
                <li key={h.slug}>
                  <Link to={`/jogos/${h.slug}`} className="universe__item">
                    <span className="universe__cover"><CoverArt game={{ title: h.title, cover: h.cover }} />{tag && <span className="universe__tag">{tag}</span>}</span>
                    <span className="universe__title">{h.title}</span>
                    {h.year && <span className="faint universe__year">{h.year}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
