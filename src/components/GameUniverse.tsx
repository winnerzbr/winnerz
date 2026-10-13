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

/**
 * Universo do jogo (do IGDB), marcando o que já é seu.
 * part="aside": série, expansões, remakes e o original, numa lista com "você está aqui".
 * part="next": "O que vem depois", com os jogos parecidos em capas.
 */
export function GameUniverse({ game, part }: { game: Game; part: 'aside' | 'next' }) {
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

  if (part === 'next') {
    const similar = u.groups.find((g) => g.title === 'Parecidos')?.games.slice(0, 8) ?? [];
    if (!similar.length) return null;
    return (
      <section className="universe-next" aria-labelledby="depois">
        <div className="sec-head"><h2 id="depois" className="t sec-title">O que vem depois</h2><span className="kicker">Parecidos, pelo IGDB</span></div>
        <ul className="universe-next__grid">
          {similar.map((h) => {
            const tag = relationTag(s, h);
            return (
              <li key={h.slug}>
                <Link to={`/jogos/${h.slug}`} className="universe-next__item">
                  <span className="universe-next__cover"><CoverArt game={{ title: h.title, cover: h.cover }} /></span>
                  <span className="universe-next__title">{h.title}</span>
                  <span className={`universe-next__sub${tag ? ' is-mine' : ''}`}>{tag === 'Na estante' ? 'Na sua estante' : tag === 'Desejo' ? 'Nos seus desejos' : tag ?? (h.year ? String(h.year) : 'Parecido')}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }

  const groups = u.groups.filter((g) => g.title !== 'Parecidos');
  if (!groups.length) return null;
  return (
    <section className="side-card universe" aria-labelledby="universo">
      <h2 id="universo" className="kicker">Universo{u.series ? ` · ${u.series}` : ''}</h2>
      {groups.map((gr) => {
        // Na série, o jogo da ficha entra no seu lugar (por ano), marcado.
        const list = gr.title === 'Da mesma série'
          ? [...gr.games, { slug: game.slug, title: game.title, cover: game.cover, year: game.year, platforms: game.platforms, here: true } as Hit & { here?: boolean }].sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999))
          : gr.games;
        return (
          <div key={gr.title} className="universe__group">
            {groups.length > 1 && <h3 className="universe__h">{gr.title}</h3>}
            <ul className="universe__list">
              {list.slice(0, 12).map((h) => {
                const here = 'here' in h && (h as { here?: boolean }).here;
                const tag = here ? null : relationTag(s, h);
                const inner = (
                  <>
                    <span className="universe__cover"><CoverArt game={{ title: h.title, cover: h.cover }} /></span>
                    <span className="universe__text">
                      <span className="universe__title">{h.title}</span>
                      <span className={`mono universe__year${here ? ' is-here' : tag ? ' is-mine' : ''}`}>{[h.year, here ? 'Você está aqui' : tag].filter(Boolean).join(' · ')}</span>
                    </span>
                  </>
                );
                return <li key={h.slug}>{here ? <span className="universe__item is-here" aria-current="page">{inner}</span> : <Link to={`/jogos/${h.slug}`} className="universe__item">{inner}</Link>}</li>;
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
