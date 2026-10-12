/** Listas fixas do IGDB (gêneros, plataformas, modos, temas), buscadas uma vez por visita. */
export type MetaOpt = { id: number; name: string };
export type Meta = { genres: MetaOpt[]; platforms: MetaOpt[]; modes: MetaOpt[]; themes: MetaOpt[] };

let metaCache: Meta | null = null;
let pending: Promise<Meta | null> | null = null;

export function cachedMeta() { return metaCache; }

export function loadMeta(): Promise<Meta | null> {
  if (metaCache) return Promise.resolve(metaCache);
  pending ??= (async () => {
    try {
      const r = await fetch('/api/igdb?meta=1');
      if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return null;
      metaCache = await r.json();
      return metaCache;
    } catch { return null; } finally { pending = null; }
  })();
  return pending;
}
