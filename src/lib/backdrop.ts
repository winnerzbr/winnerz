/**
 * Imagem de fundo do jogo. A arte "oficial" do IGDB às vezes é um logotipo sobre fundo preto
 * (fica tudo escuro atrás da página). Por isso:
 *  1. vale a escolha da pessoa ("Usar como fundo" na galeria);
 *  2. senão, a primeira imagem que não seja quase toda preta: o site mede o brilho de uma
 *     versão pequena da imagem e guarda o resultado neste aparelho.
 */
import type { Game } from '../data/types';

const KEY = 'wz.bg.v2';
type Verdict = 0 | 1; // 0 = escura demais, 1 = boa
let cache: Record<string, Verdict> = {};
try { cache = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { cache = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* sem armazenamento: mede de novo na próxima visita */ } };

const isIgdb = (u: string) => u.includes('images.igdb.com/igdb/image/upload/');
/** Mesma imagem em outro tamanho do IGDB (t_1080p para fundo, t_screenshot_med para medir). */
export const igdbSize = (u: string, size: string) => (isIgdb(u) ? u.replace(/\/t_[a-z0-9_]+\//, `/${size}/`) : u);

/** Candidatas na ordem de preferência: a arte já escolhida no cache, as outras artes, as capturas de tela. */
export function backdropCandidates(g?: Game | null): string[] {
  if (!g) return [];
  const list = [g.backdrop, ...(g.artworks ?? []), ...(g.screenshots ?? [])].filter((x): x is string => !!x).map((u) => igdbSize(u, 't_1080p'));
  return [...new Set(list)];
}

export function knownVerdict(url: string): Verdict | undefined { return cache[url]; }

const pending = new Map<string, Promise<Verdict>>();

/** Mede o brilho médio de uma miniatura da imagem. Quase preta (ou ilegível de tão escura) = 0. */
export function measure(url: string): Promise<Verdict> {
  if (cache[url] !== undefined) return Promise.resolve(cache[url]);
  if (!isIgdb(url)) return Promise.resolve(1);
  const running = pending.get(url);
  if (running) return running;
  const p = new Promise<Verdict>((ok) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 32; c.height = 18;
        const x = c.getContext('2d', { willReadFrequently: true })!;
        x.drawImage(img, 0, 0, 32, 18);
        const d = x.getImageData(0, 0, 32, 18).data;
        let sum = 0, sq = 0, dark = 0, light = 0;
        for (let i = 0; i < d.length; i += 4) {
          const l = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
          sum += l; sq += l * l; if (l < 18) dark++; if (l > 235) light++;
        }
        const n = d.length / 4, mean = sum / n, sd = Math.sqrt(Math.max(0, sq / n - mean * mean));
        // Quase toda preta, quase toda branca (logotipo sobre fundo liso) ou sem nada de imagem.
        ok(mean < 24 || dark / n > 0.85 || light / n > 0.8 || sd < 8 ? 0 : 1);
      } catch { ok(1); } // sem como medir: confia na imagem
    };
    img.onerror = () => ok(0); // imagem quebrada também não serve de fundo
    img.src = igdbSize(url, 't_screenshot_med');
  }).then((v) => { cache[url] = v; save(); pending.delete(url); return v; });
  pending.set(url, p);
  return p;
}
