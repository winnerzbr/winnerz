/**
 * Versão do site: cada build grava um id em /version.json e dentro do código.
 * Se a página ficou aberta durante uma atualização, os dois diferem e pedimos para recarregar
 * (evita que um código antigo grave dados com regras antigas).
 */
declare const __BUILD_ID__: string;
export const BUILD_ID: string = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

export async function isOutdated(): Promise<boolean> {
  if (BUILD_ID === 'dev') return false;
  try {
    const r = await fetch('/version.json', { cache: 'no-store' });
    if (!r.ok) return false;
    const j = (await r.json()) as { id?: string };
    return !!j.id && j.id !== BUILD_ID;
  } catch { return false; }
}
