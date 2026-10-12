import { useMemo, useState } from 'react';
import { Link, navigate } from '../lib/router';
import { actions, useStore, journeyForGame, currentHistory } from '../data/store';
import { FavoriteCover, FavoriteButton, useFavorite } from '../components/FavoriteCover';
import { Icon } from '../components/Icon';
import { AddGameDialog } from '../components/AddGameDialog';

const PLATFORM_ORDER = ['PlayStation 5', 'Xbox Series X|S', 'Nintendo Switch 2', 'Nintendo Switch', 'PC', 'PlayStation 4', 'Xbox One', 'PlayStation 3', 'Xbox 360', 'PlayStation 2', 'PlayStation'];

export function Collection() {
  const s = useStore((x) => x);
  const [sel, setSel] = useState<string | null>(null);
  const [cut, setCut] = useState<'tudo' | 'fisico' | 'digital' | 'nunca' | 'favoritos' | 'especial'>('tudo');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);

  const copies = useMemo(() => s.copies.filter((c) => {
    const g = s.games[c.gameId];
    if (!g) return false;
    if (q && !g.title.toLowerCase().includes(q.toLowerCase())) return false;
    if (cut === 'fisico') return c.kind === 'fisico';
    if (cut === 'digital') return c.kind === 'digital';
    if (cut === 'nunca') return !journeyForGame(s, c.gameId);
    if (cut === 'favoritos') return s.favorites.includes(c.gameId);
    if (cut === 'especial') return !!c.special;
    return true;
  }), [s, q, cut]);

  const shelves = useMemo(() => {
    const by: Record<string, typeof copies> = {};
    for (const c of copies) (by[c.platform] ??= []).push(c);
    return Object.entries(by).sort((a, b) => {
      const ia = PLATFORM_ORDER.indexOf(a[0]); const ib = PLATFORM_ORDER.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }, [copies]);

  const selected = s.copies.find((c) => c.id === sel) ?? copies[0] ?? null;
  const uniqueGames = new Set(s.copies.map((c) => c.gameId)).size;
  const count = (fn: (c: (typeof s.copies)[number]) => boolean) => s.copies.filter(fn).length;

  return (
    <main className="page pad collection">
      <div className="collection__head">
        <div>
          <h1 className="t big">Sua estante</h1>
          <p className="muted lead">{uniqueGames} {uniqueGames === 1 ? 'jogo' : 'jogos'} em {new Set(s.copies.map((c) => c.platform)).size} plataformas, mais {s.wishes.length} desejos.</p>
        </div>
        <div className="collection__tools">
          <label htmlFor="busca" className="sr-only">Buscar na coleção</label>
          <input id="busca" className="field" placeholder="Buscar na coleção" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 240 }} />
          <button className="btn primary" onClick={() => setAdding(true)}><Icon name="mais" size={16} />Adicionar jogo</button>
        </div>
      </div>

      <div className="collection__body">
        <nav className="cuts" aria-label="Recortes da coleção">
          <div className="cuts__group">Automáticas</div>
          {([
            ['tudo', 'Tudo', s.copies.length], ['fisico', 'Mídia física', count((c) => c.kind === 'fisico')], ['digital', 'Digital', count((c) => c.kind === 'digital')],
            ['nunca', 'Nunca joguei', count((c) => !journeyForGame(s, c.gameId))], ['favoritos', 'Favoritos', count((c) => s.favorites.includes(c.gameId))], ['especial', 'Especial para mim', count((c) => !!c.special)],
          ] as const).map(([id, label, n]) => (
            <button key={id} aria-current={cut === id} onClick={() => setCut(id)}>{label}<span>{n}</span></button>
          ))}
        </nav>

        <div className="shelves">
          {shelves.length === 0 && <p className="card tl-empty">Nada aqui com esse filtro. <button className="btn quiet sm" onClick={() => { setCut('tudo'); setQ(''); }}>Ver tudo</button></p>}
          {shelves.map(([platform, list]) => (
            <section key={platform} aria-label={platform} className="shelf">
              <div className="shelf__head"><h2 className="t">{platform}</h2><span className="faint">{list.length} {list.length === 1 ? 'jogo' : 'jogos'}</span></div>
              <div className="shelf__row">
                {list.map((c) => {
                  const g = s.games[c.gameId];
                  const j = journeyForGame(s, c.gameId);
                  return (
                    <button key={c.id} className="shelf__cover" aria-pressed={selected?.id === c.id} aria-label={`${g.title}${s.favorites.includes(g.id) ? ', favorito' : ''}`} onClick={() => setSel(c.id)}>
                      <img src={g.cover} alt="" />
                      {j && <span className="shelf__badge shelf__badge--j" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2.5l2.4 7.1 7.1 2.4-7.1 2.4-2.4 7.1-2.4-7.1L2.5 12l7.1-2.4z" fill="#C9A174" /></svg></span>}
                      {s.favorites.includes(g.id) && <span className="shelf__badge shelf__badge--f" aria-hidden="true"><svg width="12" height="12" viewBox="0 0 24 24" fill="#E3BF8A"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z" /></svg></span>}
                    </button>
                  );
                })}
              </div>
              <div className="shelf__ledge" aria-hidden="true" />
            </section>
          ))}

          {s.wishes.length > 0 && (
            <section className="wishes" aria-labelledby="desejos">
              <div className="shelf__head"><h2 id="desejos" className="t">Desejos</h2><span className="faint">Ainda não são seus. Nenhuma pressa.</span></div>
              <div className="wishes__row">
                {s.wishes.map((w) => s.games[w.gameId] && (
                  <Link key={w.gameId} to={`/jogos/${s.games[w.gameId].slug}`} className="wishes__item">
                    <img src={s.games[w.gameId].cover} alt="" />
                    <div><div className="serif" style={{ fontSize: 24 }}>{s.games[w.gameId].title}</div>{w.note && <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>{w.note}</div>}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {selected && <CopyPanel key={selected.id} copyId={selected.id} />}
      </div>
      {adding && <AddGameDialog onClose={() => setAdding(false)} />}
    </main>
  );
}

function CopyPanel({ copyId }: { copyId: string }) {
  const s = useStore((x) => x);
  const c = s.copies.find((x) => x.id === copyId)!;
  const g = s.games[c.gameId];
  const j = journeyForGame(s, g.id);
  const h = j ? currentHistory(s, j.id) : null;
  const { fav, burst, toggle } = useFavorite(g.id);
  const kind = c.kind === 'fisico' ? 'Exemplar físico' : c.kind === 'digital' ? 'Cópia digital' : c.kind === 'assinatura' ? 'Pelo serviço de assinatura' : 'Exemplar';
  const journeyText = !j ? 'Nenhuma Jornada com este jogo ainda. Ter não obriga a jogar.'
    : h?.state === 'concluida' ? 'História concluída. Dá para jogar de novo quando quiser.'
    : j.mood === 'pausado' ? (j.pausedNote ?? 'Pausado, sem pressa.')
    : `Jornada em andamento${h?.progress != null ? `, ${h.progress}%` : ''}.`;

  return (
    <aside className="copy-panel card" aria-labelledby="exemplar">
      <div className="copy-panel__top">
        <FavoriteCover src={g.cover} alt="" width={96} height={128} burst={burst} radius={5} />
        <div style={{ minWidth: 0 }}>
          <h2 id="exemplar" className="t">{g.title}</h2>
          <div className="muted" style={{ fontSize: 14, marginTop: 6 }}>{kind}, {c.platform}</div>
          {c.special && <div className="copy-panel__special"><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.4 7.1 7.1 2.4-7.1 2.4-2.4 7.1-2.4-7.1L2.5 12l7.1-2.4z" /></svg>Especial para mim</div>}
        </div>
      </div>
      <FavoriteButton fav={fav} burst={burst} onClick={toggle} labels={['Favoritar este jogo', 'Favorito']} className="btn ghost copy-panel__fav" />
      <dl className="copy-panel__dl">
        {c.items && <><dt>Itens</dt><dd>{c.items}</dd></>}
        {c.condition && <><dt>Estado</dt><dd>{c.condition}</dd></>}
        {c.origin && <><dt>Como chegou</dt><dd>{c.origin}</dd></>}
      </dl>
      {c.note && (
        <div className="copy-panel__note">
          <div className="faint"><Icon name="cadeado" size={12} /> Nota só sua</div>
          <p className="quote">“{c.note}”</p>
        </div>
      )}
      <p className="muted" style={{ fontSize: 14, lineHeight: 1.5 }}>{journeyText}</p>
      <div className="copy-panel__actions">
        {j ? <Link className="btn primary" to={`/jornada/${g.slug}`}>Abrir a Jornada</Link>
          : <button className="btn primary" onClick={() => { actions.play(g.id); navigate('/sessao'); }}><Icon name="play" size={14} />Começar a jogar</button>}
        <Link className="btn ghost" to={`/jogos/${g.slug}`}>Abrir a ficha do jogo</Link>
      </div>
    </aside>
  );
}
