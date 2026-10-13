import { SUPABASE_URL } from './env';

/** Endereço da foto do perfil: caminho no bucket público 'avatares', ou a própria imagem (modo demonstração). */
export function avatarUrl(v?: string | null): string | null {
  if (!v) return null;
  if (/^(data:|https?:|blob:)/.test(v)) return v;
  return `${SUPABASE_URL}/storage/v1/object/public/avatares/${v}`;
}

/** Recorta a foto em quadrado (posição e zoom escolhidos) e gera uma imagem de 512 px. */
export async function renderAvatar(img: HTMLImageElement, view: number, zoom: number, ox: number, oy: number): Promise<Blob> {
  const OUT = 512, f = OUT / view;
  const c = document.createElement('canvas'); c.width = c.height = OUT;
  const g = c.getContext('2d')!;
  const base = view / Math.min(img.naturalWidth, img.naturalHeight), k = base * zoom;
  g.fillStyle = '#0d0f12'; g.fillRect(0, 0, OUT, OUT);
  g.imageSmoothingQuality = 'high';
  g.translate(OUT / 2 + ox * f, OUT / 2 + oy * f); g.scale(k * f, k * f);
  g.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  const as = (type: string, q: number) => new Promise<Blob | null>((ok) => c.toBlob(ok, type, q));
  const webp = await as('image/webp', 0.88);
  if (webp && webp.type === 'image/webp') return webp;
  const jpg = await as('image/jpeg', 0.9);
  if (!jpg) throw new Error('Não consegui preparar a foto.');
  return jpg;
}
