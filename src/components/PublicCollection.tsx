import { useEffect, useMemo, useState } from 'react';
import { Link } from '../lib/router';
import { CoverArt } from './CoverArt';
import { profileApi, type PublicCollectionItem, type PublicProfile } from '../data/profileApi';
import { shortPlatform } from '../lib/platforms';

const PAGE = 120;
const fold = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Aba Coleção do perfil: a coleção inteira, com filtro por plataforma, busca e ordem. */
export function PublicCollection({ handle, k, c }: { handle: string; k: string | null; c: NonNullable<PublicProfile['colecao']> }) {
  const [all, setAll] = useState<PublicCollectionItem[] | null | undefined>(undefined);
  const [plat, setPlat] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [order, setOrder] = useState<'recentes' | 'az'>('recentes');
  const [shown, setShown] = useState(PAGE);
  useEffect(() => { profileApi.collectionOf(handle, k).then(setAll).catch(() => setAll(null)); }, [handle, k]);
  useEffect(() => setShown(PAGE), [plat, q, order]);
  const base: PublicCollectionItem[] = all ?? c.items;
  const list = useMemo(() => {
    const f = fold(q.trim());
    let out = base.filter((g) => (!plat || g.platform === plat) && (!f || fold(g.title).includes(f)));
    if (order === 'az') out = [...out].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    return out;
  }, [base, plat, q, order]);
  const partial = all === null && c.count > c.items.length;
  return (
    <section className="pp__sec pcol" aria-label="Coleção">
      <h2 className="t pp__h">Coleção · {c.count} {c.count === 1 ? 'jogo' : 'jogos'}</h2>
      <div className="pcol__bar">
        <input className="field pcol__q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nesta coleção" aria-label="Buscar nesta coleção" />
        <div className="seg pcol__order" role="group" aria-label="Ordem">
          <button aria-pressed={order === 'recentes'} onClick={() => setOrder('recentes')}>Recentes</button>
          <button aria-pressed={order === 'az'} onClick={() => setOrder('az')}>A–Z</button>
        </div>
      </div>
      <div className="pp-plats pcol__plats" role="group" aria-label="Filtrar por plataforma">
        <button className="chip" aria-pressed={!plat} onClick={() => setPlat(null)}>Todas <small>{c.count}</small></button>
        {c.platforms.map((p) => <button key={p.platform} className="chip" aria-pressed={plat === p.platform} onClick={() => setPlat(plat === p.platform ? null : p.platform)}>{shortPlatform(p.platform)} <small>{p.n}</small></button>)}
      </div>
      {all === undefined && c.count > c.items.length && <p className="faint pcol__note">Carregando a coleção inteira…</p>}
      {partial && <p className="faint pcol__note">Mostrando as {c.items.length} mais recentes.</p>}
      {list.length === 0 ? <p className="muted">Nenhum jogo {q ? `com “${q}”` : 'nesta plataforma'}.</p> : (
        <ul className="pp-grid pp-grid--dense">
          {list.slice(0, shown).map((g, i) => (
            <li key={g.slug + g.platform + i}><Link to={`/jogos/${g.slug}`} className="pp-grid__item" title={`${g.title} · ${shortPlatform(g.platform)}`}>
              <span className="pp-grid__cover"><CoverArt game={{ title: g.title, cover: g.cover ?? '' }} platform={g.platform} /></span>
            </Link></li>
          ))}
        </ul>
      )}
      {list.length > shown && <div className="pcol__more"><button className="btn ghost" onClick={() => setShown((n) => n + PAGE)}>Mostrar mais ({list.length - shown})</button></div>}
    </section>
  );
}
