import { useEffect, useRef, useState } from 'react';
import { actions, useStore } from '../data/store';
import type { CopyKind, Game } from '../data/types';
import { Icon } from './Icon';
import { BarcodeScan, ConfirmList, PhotoRead, foundFromPhoto, resolveAll, resolveFound, type Found } from './CameraAdd';

export interface Hit { igdbId?: number; slug: string; title: string; year?: number; cover: string; platforms: string[]; local?: Game }

/** Converte a linha do cache (formato do banco) em Game. */
export function gameFromApi(r: any): Game {
  return {
    id: r.id, slug: r.slug, igdbId: r.igdb_id, title: r.title, cover: r.cover, backdrop: r.backdrop ?? undefined,
    year: r.year ?? undefined, developer: r.developer ?? undefined, publisher: r.publisher ?? undefined,
    platforms: r.platforms ?? [], genres: r.genres ?? undefined, summary: r.summary ?? undefined,
    summarySource: r.summary_source ?? undefined, releases: r.releases ?? undefined, screenshots: r.screenshots ?? undefined,
    summaryOriginal: r.summary_original ?? undefined, themes: r.themes ?? undefined, modes: r.modes ?? undefined,
  artworks: r.artworks ?? undefined, videos: r.videos ?? undefined,
    ttb: r.ttb ?? undefined, releasedOn: r.released_on ?? undefined, source: r.source ?? 'igdb', updatedAt: r.updated_at ?? undefined, fixes: r.fixes ?? undefined,
  };
}

export async function searchGames(q: string, local: Game[]): Promise<{ hits: Hit[]; source: 'igdb' | 'local' }> {
  try {
    const r = await fetch(`/api/igdb?q=${encodeURIComponent(q)}`);
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) throw new Error('sem api');
    return { hits: await r.json(), source: 'igdb' };
  } catch {
    const t = q.toLowerCase();
    return { hits: local.filter((g) => g.title.toLowerCase().includes(t)).map((g) => ({ slug: g.slug, title: g.title, year: g.year, cover: g.cover, platforms: g.platforms, local: g })), source: 'local' };
  }
}

/** Abre qualquer jogo do IGDB pelo slug (ex.: vindo do Explorar ou do universo de outro jogo). */
export async function gameBySlug(slug: string): Promise<Game | null> {
  try {
    const r = await fetch(`/api/igdb?slug=${encodeURIComponent(slug)}&v=3`);
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
    return gameFromApi(await r.json());
  } catch { return null; }
}

/** Busca de novo a ficha no IGDB (para fichas antigas, sem tradução ou sem vídeos). */
export async function refreshGame(igdbId: number): Promise<Game | null> {
  try {
    const r = await fetch(`/api/igdb?id=${igdbId}&v=3`);
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
    return gameFromApi(await r.json());
  } catch { return null; }
}

export async function loadGame(hit: Hit): Promise<Game | null> {
  if (hit.local) return hit.local;
  if (!hit.igdbId) return null;
  const r = await fetch(`/api/igdb?id=${hit.igdbId}&v=3`);
  if (!r.ok) return null;
  return gameFromApi(await r.json());
}

export type AddMode = 'nome' | 'codigo' | 'foto';

export function AddGameDialog({ onClose, initial, mode: startMode = 'nome' }: { onClose: () => void; initial?: Hit; mode?: AddMode }) {
  const games = useStore((s) => s.games);
  const online = useStore((s) => s.mode === 'supabase' && !!s.profile);
  const [mode, setMode] = useState<AddMode>(initial ? 'nome' : startMode);
  const [found, setFound] = useState<Found[]>([]);
  const [lastCode, setLastCode] = useState('');
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [source, setSource] = useState<'igdb' | 'local' | null>(null);
  const [pick, setPick] = useState<Hit | null>(initial ?? null);
  const [platform, setPlatform] = useState(initial?.platforms[0] ?? '');
  const [kind, setKind] = useState<CopyKind>('fisico');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { if (mode === 'nome') input.current?.focus(); }, [mode]);
  useEffect(() => { const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', esc); return () => document.removeEventListener('keydown', esc); }, [onClose]);

  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(async () => {
      const r = await searchGames(q.trim(), Object.values(games));
      setHits(r.hits); setSource(r.source);
    }, 300);
    return () => clearTimeout(t);
  }, [q, games]);

  const save = async () => {
    if (!pick) return;
    setBusy(true); setError('');
    const g = await loadGame(pick);
    if (!g) { setBusy(false); setError('Não foi possível carregar este jogo agora. Tente de novo em instantes.'); return; }
    actions.mergeGames([g]);
    actions.addCopy({ gameId: g.id, platform: platform || g.platforms[0] || 'Outra plataforma', kind });
    onClose();
  };

  const upd = (f: Found) => setFound((l) => l.map((x) => (x.key === f.key ? f : x)));
  const onCode = (code: string) => {
    setLastCode(code);
    if (found.some((x) => x.barcode === code && x.from === 'codigo')) return;
    const f: Found = { key: `c${code}`, from: 'codigo', read: code, barcode: code, hits: [], chosen: null, platform: '', kind: 'fisico', include: false, searching: true };
    setFound((l) => [f, ...l]);
    resolveFound(f, Object.values(games), online).then(upd);
  };
  const onGames = (list: { title: string; platform: string; barcode: string; confidence: string }[]) => {
    const fs = list.map(foundFromPhoto);
    setFound((l) => [...fs, ...l]);
    resolveAll(fs, Object.values(games), online, upd);
  };
  const wide = mode !== 'nome' && !pick;

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' modal--wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="add-title">
        <div className="modal__head"><h2 id="add-title" className="t" style={{ fontSize: 40 }}>{initial ? 'Adicionar à coleção' : 'Adicionar à estante'}</h2><button className="icon-btn" aria-label="Fechar" onClick={onClose}><Icon name="fechar" /></button></div>
        {!pick && !initial && (
          <div className="seg addmode" role="tablist" aria-label="Como adicionar">
            {([['nome', 'Pelo nome', 'buscar'], ['codigo', 'Código de barras', 'camera'], ['foto', 'Foto das capas', 'camera']] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={mode === k} aria-pressed={mode === k} onClick={() => setMode(k)}>{l}</button>
            ))}
          </div>
        )}
        {mode === 'codigo' && !pick ? (
          <div className="camadd">
            <BarcodeScan onCode={onCode} last={lastCode} />
            <ConfirmList items={found} setItems={setFound} online={online} onDone={() => onClose()} />
          </div>
        ) : mode === 'foto' && !pick ? (
          <div className="camadd">
            <PhotoRead online={online} onGames={onGames} />
            <ConfirmList items={found} setItems={setFound} online={online} onDone={() => onClose()} />
          </div>
        ) : !pick ? (
          <>
            <label htmlFor="add-q" className="sr-only">Nome do jogo</label>
            <input id="add-q" ref={input} className="field" placeholder="Digite o nome do jogo" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginTop: 16 }} />
            {source === 'local' && <p className="faint" style={{ fontSize: 13 }}>Na demonstração a busca usa só o catálogo de exemplo. Publicado, ela consulta o catálogo completo.</p>}
            <ul className="hits">
              {hits.map((h) => (
                <li key={h.slug}><button onClick={() => { setPick(h); setPlatform(h.platforms[0] ?? ''); }}>
                  {h.cover ? <img src={h.cover} alt="" /> : <span className="hits__nocover" />}
                  <span><span className="hits__title">{h.title}</span><span className="muted hits__meta">{[h.year, h.platforms.slice(0, 3).join(', ')].filter(Boolean).join(' · ')}</span></span>
                </button></li>
              ))}
              {q.length >= 2 && hits.length === 0 && <li className="muted" style={{ padding: 12 }}>Nenhum jogo encontrado com esse nome.</li>}
            </ul>
          </>
        ) : (
          <div className="add-pick">
            <div className="add-pick__game">{pick.cover && <img src={pick.cover} alt="" />}<div><div className="t" style={{ fontSize: 32 }}>{pick.title}</div>{!initial && <button className="btn quiet sm" onClick={() => setPick(null)}>Escolher outro</button>}</div></div>
            <label htmlFor="add-plat" className="add-pick__label">Plataforma</label>
            <select id="add-plat" className="field" value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {[...new Set([...pick.platforms, 'Outra plataforma'])].map((p) => <option key={p}>{p}</option>)}
            </select>
            <div className="add-pick__label">Formato</div>
            <div className="seg" role="group" aria-label="Formato">
              {([['fisico', 'Mídia física'], ['digital', 'Digital'], ['assinatura', 'Assinatura']] as const).map(([k, l]) => <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{l}</button>)}
            </div>
            <p className="faint" style={{ fontSize: 13 }}>Detalhes como estado, itens e história do exemplar são opcionais e podem ser adicionados depois.</p>
            {error && <p role="alert" style={{ color: 'var(--accent-ink)' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}><button className="btn primary" disabled={busy} onClick={save}>{busy ? 'Adicionando…' : 'Adicionar à estante'}</button><button className="btn quiet" onClick={onClose}>Cancelar</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
