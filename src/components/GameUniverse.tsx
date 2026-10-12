import { useEffect, useState } from 'react';
import { Link } from '../lib/router';
import { useStore } from '../data/store';
import type { Game, State } from '../data/types';
import type { Hit } from './AddGameDialog';
import { CoverArt } from './CoverArt';

export type Universe = { groups: { title: string; games: Hit[] }[]; series?: string | null };
const cache = new Map<number, Universe>();

export function cachedUniverse(id: number) { return cache.get(id) ?? null; }

export async function fetchUniverse(id: number): Promise<Universe | null> {
  if (cache.has(id)) return cache.get(id)!;
  try {
    const r = await fetch(`/api/igdb?related=${id}`);
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
    const j: Universe = await r.json();
    cache.set(id, j);
    return j;
  } catch { return null; }
}

/** O jogo do IGDB já é seu? Pelo número do IGDB; na falta dele, pelo endereço. */
export function ownedGame(s: State, h: Pick<Hit, 'slug' | 'igdbId'>): Game | undefined {
  const all = Object.values(s.games);
  return (h.igdbId ? all.find((x) => x.igdbId === h.igdbId) : undefined) ?? all.find((x) => x.slug === h.slug);
}

export function relationTag(s: State, h: Pick<Hit, 'slug' | 'igdbId'>): 'Zerado' | 'Na estante' | 'Desejo' | null {
  const g = ownedGame(s, h);
  if (!g) return null;
  if (s.journeys.some((j) => j.gameId === g.id && s.histories.some((x) => x.journeyId === j.id && x.state === 'concluida'))) return 'Zerado';
  if (s.copies.some((c) => c.gameId === g.id)) return 'Na estante';
  if (s.wishes.some((w) => w.gameId === g.id)) return 'Desejo';
  return null;
}

/** Universo do jogo: série, expansões, remakes e parecidos (do IGDB). Marca o que já é seu. */
export function GameUniverse({ game }: { game: Game }) {
  const id = game.igdbId;
  const [u, setU] = useState<Universe | null>(id ? cache.get(id) ?? null : null);
  const s = useStore((x) => x);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetchUniverse(id).then((j) => { if (j && alive) setU(j); });
    return () => { alive = false; };
  }, [id]);
  if (!u || !u.groups?.length) return null;


  return (
    <section className="page universe" aria-labelledby="universo">
      <div className="block__head"><h2 id="universo" className="t">Universo de {game.title}</h2>{u.series && <span className="muted">Série: {u.series}</span>}</div>
      {u.groups.map((gr) => (
        <div key={gr.title} className="universe__group">
          <h3 className="universe__h">{gr.title}</h3>
          <ul className="universe__row">
            {gr.games.map((h) => {
              const tag = relationTag(s, h);
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
