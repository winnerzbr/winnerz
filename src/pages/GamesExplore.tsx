import { useEffect, useMemo, useState } from 'react';
import { navigate, usePath } from '../lib/router';
import { SubNav } from '../components/SubNav';
import { AddGameDialog, type Hit } from '../components/AddGameDialog';
import { Toast } from '../components/Toast';
import { GameTile } from './GamesIndex';
import { pt } from '../lib/igdbPt';
import { shortPlatform } from '../lib/platforms';
import { track } from '../lib/track';
import { loadMeta, cachedMeta, type Meta } from '../lib/igdbMeta';

type Found = Hit & { rating?: number; date?: string };

const SORTS: [string, string][] = [['popular', 'Mais populares'], ['rating', 'Mais bem avaliados'], ['recent', 'Lançados há pouco'], ['upcoming', 'Em breve']];
const thisYear = new Date().getFullYear();
const ERAS: [string, string, number?, number?][] = [
  ['', 'Qualquer época'], ['agora', `${thisYear - 1} em diante`, thisYear - 1, undefined], ['2020', '2020 a ' + (thisYear - 2), 2020, thisYear - 2],
  ['2010', 'Anos 2010', 2010, 2019], ['2000', 'Anos 2000', 2000, 2009], ['1990', 'Anos 1990', 1990, 1999], ['classico', 'Até 1989', 1970, 1989],
];

/** Explorar: o catálogo do IGDB por gênero, plataforma, época, modo e ordem. Os filtros ficam no endereço. */
export function GamesExplore() {
  const path = usePath();
  const params = useMemo(() => new URLSearchParams(path.split('?')[1] ?? ''), [path]);
  const f = { genre: params.get('genero') ?? '', platform: params.get('plataforma') ?? '', mode: params.get('modo') ?? '', era: params.get('epoca') ?? '', sort: params.get('ordem') ?? 'popular' };
  const [meta, setMeta] = useState<Meta | null>(cachedMeta());
  const [items, setItems] = useState<Found[]>([]);
  const [page, setPage] = useState(0);
  const [state, setState] = useState<'idle' | 'loading' | 'error' | 'end'>('idle');
  const [adding, setAdding] = useState<Hit | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);

  useEffect(() => { loadMeta().then((m) => m && setMeta(m)); track('jogos.explorar'); }, []);

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    navigate(`/jogos/explorar${p.toString() ? `?${p}` : ''}`, { replace: true, keepScroll: true });
  };

  const key = `${f.genre}|${f.platform}|${f.mode}|${f.era}|${f.sort}`;
  useEffect(() => { setItems([]); setPage(0); setState('idle'); }, [key]);
  useEffect(() => {
    let alive = true;
    (async () => {
      setState('loading');
      const era = ERAS.find((e) => e[0] === f.era);
      const q = new URLSearchParams({ explore: '1', sort: f.sort, page: String(page) });
      if (f.genre) q.set('genre', f.genre);
      if (f.platform) q.set('platform', f.platform);
      if (f.mode) q.set('mode', f.mode);
      if (era?.[2]) q.set('from', String(era[2]));
      if (era?.[3]) q.set('to', String(era[3]));
      try {
        const r = await fetch(`/api/igdb?${q}`);
        if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) throw new Error();
        const rows: Found[] = await r.json();
        if (!alive) return;
        setItems((prev) => (page === 0 ? rows : [...prev, ...rows.filter((x) => !prev.some((p) => p.slug === x.slug))]));
        setState(rows.length < 36 ? 'end' : 'idle');
      } catch { if (alive) setState('error'); }
    })();
    return () => { alive = false; };
  }, [key, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const genres = (meta?.genres ?? []).map((g) => ({ ...g, label: pt(g.name) })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  const modes = (meta?.modes ?? []).map((g) => ({ ...g, label: pt(g.name) }));

  return (
    <main className="page pad explore">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Explorar</h1>
          <p className="muted lead">O catálogo inteiro do IGDB. Filtre pelo que você quer jogar; os filtros ficam no endereço, dá para salvar ou mandar para alguém.</p>
        </div>
        <SubNav pillar="jogos" />
      </header>

      <div className="cbar explore__bar">
        <label className="cbar__sel"><span className="sr-only">Gênero</span>
          <select className="field" value={f.genre} onChange={(e) => set('genero', e.target.value)}>
            <option value="">Todos os gêneros</option>
            {genres.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </label>
        <label className="cbar__sel"><span className="sr-only">Plataforma</span>
          <select className="field" value={f.platform} onChange={(e) => set('plataforma', e.target.value)}>
            <option value="">Todas as plataformas</option>
            {(meta?.platforms ?? []).map((p) => <option key={p.id} value={p.id}>{shortPlatform(p.name)}</option>)}
          </select>
        </label>
        <label className="cbar__sel"><span className="sr-only">Época</span>
          <select className="field" value={f.era} onChange={(e) => set('epoca', e.target.value)}>
            {ERAS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </select>
        </label>
        <label className="cbar__sel"><span className="sr-only">Como se joga</span>
          <select className="field" value={f.mode} onChange={(e) => set('modo', e.target.value)}>
            <option value="">Qualquer modo</option>
            {modes.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </label>
      </div>
      <div className="seg explore__sort" role="group" aria-label="Ordem">
        {SORTS.map(([id, l]) => <button key={id} aria-pressed={f.sort === id} onClick={() => set('ordem', id === 'popular' ? '' : id)}>{l}</button>)}
      </div>

      {state === 'error' && items.length === 0 ? (
        <p className="card tl-empty">Não consegui falar com o IGDB agora. <button className="linklike" onClick={() => setPage(0)}>Tentar de novo</button></p>
      ) : (
        <div className="cover-grid explore__grid">
          {items.map((h) => (
            <div key={h.slug} className="explore__item">
              <GameTile hit={h} onAdd={setAdding} say={(text) => setToast({ id: Date.now(), text })} />
              {(h.rating || (f.sort === 'upcoming' && h.date)) && (
                <span className="explore__meta faint">{f.sort === 'upcoming' && h.date ? new Date(`${h.date}T12:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }) : `IGDB ${h.rating}`}</span>
              )}
            </div>
          ))}
          {state === 'loading' && Array.from({ length: items.length ? 6 : 18 }, (_, i) => <div key={`s${i}`} className="explore__skeleton" aria-hidden="true" />)}
        </div>
      )}
      {state === 'idle' && items.length > 0 && <div className="import__actions"><button className="btn ghost" onClick={() => setPage(page + 1)}>Mostrar mais</button></div>}
      {state === 'end' && items.length === 0 && <p className="card tl-empty">Nenhum jogo com esses filtros. Tente tirar um deles.</p>}

      {adding && <AddGameDialog initial={adding} onClose={() => setAdding(null)} />}
      {toast && <Toast key={toast.id} text={toast.text} />}
    </main>
  );
}
