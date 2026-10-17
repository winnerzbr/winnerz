import { useEffect, useMemo, useState, type ReactNode } from 'react';
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

  const genreName = genres.find((g) => String(g.id) === f.genre)?.label;
  const platName = (meta?.platforms ?? []).find((p) => String(p.id) === f.platform)?.name;
  const eraName = ERAS.find((e) => e[0] === f.era && e[0])?.[1];
  const modeName = modes.find((g) => String(g.id) === f.mode)?.label;
  const anyFilter = !!(f.genre || f.platform || f.era || f.mode);
  const clear = () => navigate(`/jogos/explorar${f.sort !== 'popular' ? `?ordem=${f.sort}` : ''}`, { replace: true, keepScroll: true });
  const count = `${items.length}${state !== 'end' && items.length ? '+' : ''} ${items.length === 1 ? 'jogo' : 'jogos'}`;

  return (
    <main className="page pad explore">
      <header className="page-head">
        <div className="page-head__text">
          <h1 className="t big">Explorar</h1>
          <p className="muted lead">Para quando você não sabe o nome, só o que está com vontade.</p>
        </div>
        <SubNav pillar="jogos" />
      </header>

      <div className="explore__filters" role="group" aria-label="Filtros">
        <Dropdown label="Gênero" value={genreName} empty="Todos" on={!!f.genre}>
          <select value={f.genre} onChange={(e) => set('genero', e.target.value)} aria-label="Gênero">
            <option value="">Todos os gêneros</option>
            {genres.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </Dropdown>
        <Dropdown label="Plataforma" value={platName && shortPlatform(platName)} empty="Todas" on={!!f.platform}>
          <select value={f.platform} onChange={(e) => set('plataforma', e.target.value)} aria-label="Plataforma">
            <option value="">Todas as plataformas</option>
            {(meta?.platforms ?? []).map((p) => <option key={p.id} value={p.id}>{shortPlatform(p.name)}</option>)}
          </select>
        </Dropdown>
        <Dropdown label="Época" value={eraName} empty="Qualquer" on={!!f.era}>
          <select value={f.era} onChange={(e) => set('epoca', e.target.value)} aria-label="Época">
            {ERAS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
          </select>
        </Dropdown>
        <Dropdown label="Como se joga" value={modeName} empty="Qualquer" on={!!f.mode}>
          <select value={f.mode} onChange={(e) => set('modo', e.target.value)} aria-label="Como se joga">
            <option value="">Qualquer modo</option>
            {modes.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
          </select>
        </Dropdown>
        {anyFilter && <button className="btn quiet sm" onClick={clear}>Limpar</button>}
      </div>
      <div className="explore__sortbar">
        <div className="seg explore__sort" role="group" aria-label="Ordem">
          {SORTS.map(([id, l]) => <button key={id} aria-pressed={f.sort === id} onClick={() => set('ordem', id === 'popular' ? '' : id)}>{l}</button>)}
        </div>
        {items.length > 0 && <span className="mono explore__count">{count}</span>}
      </div>

      {state === 'error' && items.length === 0 ? (
        <p className="card tl-empty">Não consegui carregar o catálogo agora. <button className="linklike" onClick={() => setPage(0)}>Tentar de novo</button></p>
      ) : (
        <div className="cover-grid explore__grid">
          {items.map((h) => (
            <GameTile key={h.slug} hit={h} onAdd={setAdding} say={(text) => setToast({ id: Date.now(), text })} pill={pillOf(h, f.sort)} />
          ))}
          {state === 'loading' && Array.from({ length: items.length ? 6 : 18 }, (_, i) => <div key={`s${i}`} className="explore__skeleton" aria-hidden="true" />)}
        </div>
      )}
      {state === 'idle' && items.length > 0 && <div className="explore__more"><button className="btn ghost" onClick={() => setPage(page + 1)}>Carregar mais</button></div>}
      {state === 'end' && items.length === 0 && <p className="card tl-empty">Nenhum jogo com esses filtros. Tente tirar um deles.</p>}

      {adding && <AddGameDialog initial={adding} onClose={() => setAdding(null)} />}
      {toast && <Toast key={toast.id} text={toast.text} />}
    </main>
  );
}

/** Etiqueta no canto da capa: a nota do IGDB ("Nota" / "IGDB" em duas linhas), ou a data quando o jogo ainda não saiu. */
function pillOf(h: Found, sort: string): { big: string; small: string; dim?: boolean } | undefined {
  const future = h.date && h.date > new Date().toISOString().slice(0, 10);
  if ((sort === 'upcoming' || future) && h.date) return { big: new Date(`${h.date}T12:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', ''), small: 'Em breve' };
  if (h.rating) return { big: (h.rating / 10).toFixed(1).replace(/\.0$/, '').replace('.', ','), small: 'Nota\nIGDB' };
  return undefined;
}

/** Filtro em pílula: mostra o nome e o valor escolhido; o select nativo fica por cima, invisível, e cuida da escolha. */
function Dropdown({ label, value, empty, on, children }: { label: string; value?: string; empty: string; on: boolean; children: ReactNode }) {
  return (
    <label className={`dd${on ? ' is-on' : ''}`}>
      <span className="dd__label">{label}</span>
      <small className="dd__value">{value ?? empty}</small>
      <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true"><path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      {children}
    </label>
  );
}
