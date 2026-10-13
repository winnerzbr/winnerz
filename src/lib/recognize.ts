/**
 * Adicionar pela câmera: o que dá para tirar de um código de barras ou do nome de produto que a base de
 * códigos devolve ("Uncharted 4 - PlayStation 4 - Mídia Física") antes de buscar o jogo no catálogo.
 */
import { canonicalPlatform, PLATFORM_NAMES } from './platforms';

/** Confere o dígito verificador de um EAN-8, UPC-A (12), EAN-13 ou GTIN-14. */
export function eanValid(code: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(code)) return false;
  const d = code.split('').map(Number);
  const check = d.pop()!;
  let sum = 0;
  for (let i = d.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) sum += d[i] * w;
  return (10 - (sum % 10)) % 10 === check;
}

/** Deixa o código num formato só: UPC-A vira EAN-13 (com 0 na frente), GTIN-14 com 0 perde o 0. Inválido → null. */
export function normalizeCode(raw: string): string | null {
  let c = raw.replace(/\D/g, '');
  if (!eanValid(c)) return null;
  if (c.length === 12) c = `0${c}`;
  if (c.length === 14 && c.startsWith('0')) c = c.slice(1);
  return c;
}

/** Apelidos que aparecem em nomes de produto. Os muito curtos e ambíguos ("ds", "gc", "360") ficam de fora do texto livre. */
const TEXT_ALIASES: [RegExp, string][] = (() => {
  const raw: [string, string][] = [
    ['playstation 5', 'PlayStation 5'], ['ps5', 'PlayStation 5'],
    ['playstation 4', 'PlayStation 4'], ['ps4', 'PlayStation 4'],
    ['playstation 3', 'PlayStation 3'], ['ps3', 'PlayStation 3'],
    ['playstation 2', 'PlayStation 2'], ['ps2', 'PlayStation 2'],
    ['playstation vita', 'PlayStation Vita'], ['ps vita', 'PlayStation Vita'], ['psvita', 'PlayStation Vita'],
    ['playstation portable', 'PlayStation Portable'], ['psp', 'PlayStation Portable'],
    ['ps1', 'PlayStation'], ['psone', 'PlayStation'], ['ps one', 'PlayStation'], ['playstation 1', 'PlayStation'],
    ['nintendo switch 2', 'Nintendo Switch 2'], ['switch 2', 'Nintendo Switch 2'],
    ['nintendo switch', 'Nintendo Switch'], ['switch', 'Nintendo Switch'],
    ['wii u', 'Wii U'], ['wiiu', 'Wii U'], ['wii', 'Wii'],
    ['nintendo gamecube', 'Nintendo GameCube'], ['gamecube', 'Nintendo GameCube'],
    ['nintendo 64', 'Nintendo 64'], ['n64', 'Nintendo 64'],
    ['super nintendo', 'Super Nintendo Entertainment System'], ['snes', 'Super Nintendo Entertainment System'],
    ['nintendo 3ds', 'Nintendo 3DS'], ['3ds', 'Nintendo 3DS'], ['nintendo ds', 'Nintendo DS'],
    ['game boy advance', 'Game Boy Advance'], ['gba', 'Game Boy Advance'], ['game boy', 'Game Boy'],
    ['xbox series x', 'Xbox Series X|S'], ['xbox series s', 'Xbox Series X|S'], ['xbox series', 'Xbox Series X|S'],
    ['xbox one', 'Xbox One'], ['xbox 360', 'Xbox 360'], ['xbox', 'Xbox'],
    ['mega drive', 'Sega Mega Drive/Genesis'], ['genesis', 'Sega Mega Drive/Genesis'],
    ['dreamcast', 'Dreamcast'], ['sega saturn', 'Sega Saturn'],
    ['pc dvd', 'PC (Microsoft Windows)'], ['pc', 'PC (Microsoft Windows)'], ['windows', 'PC (Microsoft Windows)'],
  ];
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[\\s-]?').replace(/([a-z])(\d)/g, '$1[\\s-]?$2');
  return raw.map(([a, c]) => [new RegExp(`(^|[^a-z0-9])${esc(a)}(?![a-z0-9])`, 'i'), c]);
})();

/** A plataforma citada num nome de produto, se houver ("... - PlayStation 4" → "PlayStation 4"). */
export function platformFromText(text: string): string | undefined {
  for (const [re, canon] of TEXT_ALIASES) if (re.test(text)) return canon;
  return undefined;
}

const NOISE = [
  'standard edition', 'edição padrão', 'edicao padrao', 'mídia física', 'midia fisica', 'mídia digital', 'midia digital',
  'lacrado', 'novo', 'original', 'usado', 'ntsc', 'pal', 'region free', 'video game', 'videogame', 'video games',
  'físico', 'fisico', 'em português', 'em portugues', 'português', 'portugues', 'dublado', 'legendado', 'br',
];

/** O nome do jogo dentro de um nome de produto: sem plataforma, sem "mídia física", sem colchetes. */
export function cleanTitle(product: string): string {
  let t = ` ${product} `;
  t = t.replace(/[[(][^\])]*[\])]/g, ' ');
  for (const [re] of TEXT_ALIASES) t = t.replace(new RegExp(re.source, 'gi'), '$1 ');
  t = t.replace(/\b(sony|nintendo|microsoft|sega)\b/gi, ' ');
  for (const n of NOISE) t = t.replace(new RegExp(`(^|[^\\p{L}0-9])${n.replace(/ /g, '\\s+')}(?![\\p{L}0-9])`, 'giu'), '$1 ');
  t = t.replace(/^\s*(jogo\s+(para\s+)?|game\s+for\s+)/i, ' ');
  t = t.replace(/\s+(para|for|jogo|game)\s*$/i, ' ');
  t = t.replace(/\s+[-–—|/,:+]\s*(?=[-–—|/,:+]|$)/g, ' ');
  t = t.replace(/^[\s\-–—|/,:+]+|[\s\-–—|/,:+]+$/g, '');
  t = t.replace(/\s+(para|for|jogo|game)\s*$/i, '');
  return t.replace(/\s{2,}/g, ' ').trim();
}

/** Escolhe, entre as plataformas do jogo, a que bate com o palpite ("PS4", "Switch"). Sem palpite que bata → undefined. */
export function matchPlatform(guess: string | undefined, platforms: string[]): string | undefined {
  if (!guess?.trim()) return undefined;
  const fromText = platformFromText(guess);
  const want = canonicalPlatform(fromText ?? guess);
  return platforms.find((p) => canonicalPlatform(p) === want);
}

/** Nome canônico de uma plataforma, se for uma que o WinnerZ conhece. */
export const knownPlatform = (p?: string) => {
  if (!p) return undefined;
  const c = canonicalPlatform(platformFromText(p) ?? p);
  return PLATFORM_NAMES.includes(c) ? c : undefined;
};
