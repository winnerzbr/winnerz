/**
 * Plataformas: o site guarda o nome do IGDB (canônico) e mostra um nome curto.
 * Planilhas costumam usar apelidos ("PS2", "Switch 2"); aqui eles viram o nome canônico.
 */
const CANON: [string, string, string[]][] = [
  // [canônico, curto, apelidos]
  ['PlayStation 5', 'PS5', ['ps5', 'playstation 5']],
  ['PlayStation 4', 'PS4', ['ps4', 'playstation 4']],
  ['PlayStation 3', 'PS3', ['ps3', 'playstation 3']],
  ['PlayStation 2', 'PS2', ['ps2', 'playstation 2']],
  ['PlayStation', 'PS1', ['ps1', 'psx', 'psone', 'ps one', 'playstation', 'playstation 1']],
  ['PlayStation Portable', 'PSP', ['psp', 'playstation portable']],
  ['PlayStation Vita', 'Vita', ['vita', 'ps vita', 'psvita', 'playstation vita']],
  ['Nintendo Switch 2', 'Switch 2', ['switch 2', 'nintendo switch 2', 'ns2']],
  ['Nintendo Switch', 'Switch', ['switch', 'nintendo switch', 'ns']],
  ['Wii U', 'Wii U', ['wii u', 'wiiu']],
  ['Wii', 'Wii', ['wii']],
  ['Nintendo GameCube', 'GameCube', ['gamecube', 'game cube', 'gc', 'ngc', 'nintendo gamecube']],
  ['Nintendo 64', 'N64', ['n64', 'nintendo 64']],
  ['Super Nintendo Entertainment System', 'SNES', ['snes', 'super nintendo', 'super nes']],
  ['Nintendo Entertainment System', 'NES', ['nes', 'nintendinho']],
  ['Nintendo 3DS', '3DS', ['3ds', 'nintendo 3ds', 'new 3ds']],
  ['Nintendo DS', 'DS', ['ds', 'nds', 'nintendo ds']],
  ['Game Boy Advance', 'GBA', ['gba', 'game boy advance']],
  ['Game Boy', 'Game Boy', ['gb', 'game boy']],
  ['Xbox Series X|S', 'Series X|S', ['xbox series', 'xbox series x', 'xbox series s', 'xsx', 'series x', 'series s']],
  ['Xbox One', 'Xbox One', ['xbox one', 'xone', 'xb1']],
  ['Xbox 360', 'Xbox 360', ['xbox 360', 'x360', '360']],
  ['Xbox', 'Xbox', ['xbox', 'xbox classic']],
  ['PC (Microsoft Windows)', 'PC', ['pc', 'windows', 'steam', 'pc (microsoft windows)']],
  ['Mac', 'Mac', ['mac', 'macos']],
  ['Sega Mega Drive/Genesis', 'Mega Drive', ['mega drive', 'genesis', 'megadrive']],
  ['Dreamcast', 'Dreamcast', ['dreamcast', 'dc']],
  ['Sega Saturn', 'Saturn', ['saturn', 'sega saturn']],
  ['Android', 'Android', ['android']],
  ['iOS', 'iOS', ['ios', 'iphone', 'ipad']],
];

const BY_ALIAS = new Map<string, string>();
const SHORT = new Map<string, string>();
for (const [canon, short, aliases] of CANON) {
  SHORT.set(canon, short);
  BY_ALIAS.set(canon.toLowerCase(), canon);
  for (const a of aliases) BY_ALIAS.set(a, canon);
}

/** "PS2" → "PlayStation 2". Desconhecido volta como veio. */
/** Nomes canônicos, na ordem da lista (do mais novo ao mais antigo, por família). */
export const PLATFORM_NAMES: string[] = CANON.map((c) => c[0]);

export function canonicalPlatform(name: string): string {
  const k = name.trim().toLowerCase().replace(/\s+/g, ' ');
  return BY_ALIAS.get(k) ?? name.trim();
}

/** "PlayStation 2" → "PS2". */
export function shortPlatform(name: string): string {
  return SHORT.get(name) ?? SHORT.get(canonicalPlatform(name)) ?? name;
}

/** Ordem das estantes: das plataformas mais novas para as mais antigas, as desconhecidas no fim. */
const ORDER = CANON.map((c) => c[0]);
export function platformRank(name: string): number {
  const i = ORDER.indexOf(canonicalPlatform(name));
  return i < 0 ? 999 : i;
}

/** O mesmo console com nomes diferentes no IGDB e na planilha conta como igual. */
export function samePlatform(a: string, b: string) {
  return canonicalPlatform(a) === canonicalPlatform(b);
}
