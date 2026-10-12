/**
 * Nomes do IGDB em português. Gêneros, temas, modos e perspectivas são listas fixas do IGDB,
 * então a tradução é um dicionário (instantânea, sem custo e sem erro de máquina).
 * Aplicada na hora de exibir: fichas já guardadas em inglês aparecem traduzidas também.
 */
const DICT: Record<string, string> = {
  // Gêneros
  'Point-and-click': 'Point-and-click',
  Fighting: 'Luta',
  Shooter: 'Tiro',
  Music: 'Música',
  Platform: 'Plataforma',
  Puzzle: 'Quebra-cabeça',
  Racing: 'Corrida',
  'Real Time Strategy (RTS)': 'Estratégia em tempo real',
  'Role-playing (RPG)': 'RPG',
  Simulator: 'Simulação',
  Sport: 'Esporte',
  Strategy: 'Estratégia',
  'Turn-based strategy (TBS)': 'Estratégia por turnos',
  Tactical: 'Tático',
  "Hack and slash/Beat 'em up": "Hack and slash / Beat 'em up",
  'Quiz/Trivia': 'Quiz e perguntas',
  Pinball: 'Pinball',
  Adventure: 'Aventura',
  Indie: 'Indie',
  Arcade: 'Arcade',
  'Visual Novel': 'Visual novel',
  'Card & Board Game': 'Cartas e tabuleiro',
  MOBA: 'MOBA',
  // Temas
  Action: 'Ação',
  Fantasy: 'Fantasia',
  'Science fiction': 'Ficção científica',
  Horror: 'Terror',
  Thriller: 'Suspense',
  Survival: 'Sobrevivência',
  Historical: 'Histórico',
  Stealth: 'Furtividade',
  Comedy: 'Comédia',
  Business: 'Negócios',
  Drama: 'Drama',
  'Non-fiction': 'Não ficção',
  Sandbox: 'Sandbox',
  Educational: 'Educativo',
  Kids: 'Infantil',
  'Open world': 'Mundo aberto',
  Warfare: 'Guerra',
  Party: 'Festa',
  '4X (explore, expand, exploit, and exterminate)': '4X',
  Erotic: 'Adulto',
  Mystery: 'Mistério',
  Romance: 'Romance',
  // Modos de jogo
  'Single player': 'Um jogador',
  Multiplayer: 'Multijogador',
  'Co-operative': 'Cooperativo',
  'Split screen': 'Tela dividida',
  'Massively Multiplayer Online (MMO)': 'MMO',
  'Battle Royale': 'Battle royale',
  // Perspectivas
  'First person': 'Primeira pessoa',
  'Third person': 'Terceira pessoa',
  'Bird view / Isometric': 'Visão de cima / isométrica',
  'Side view': 'Visão lateral',
  Text: 'Texto',
  Auditory: 'Áudio',
  'Virtual Reality': 'Realidade virtual',
  // Plataformas com nome em inglês
  'PC (Microsoft Windows)': 'PC (Windows)',
  'Web browser': 'Navegador',
};

const KEYS = Object.keys(DICT).sort((a, b) => b.length - a.length);

/** Traduz um nome isolado do IGDB (gênero, tema, modo, perspectiva ou plataforma). */
export function pt(name: string): string {
  return DICT[name.trim()] ?? name.trim();
}

/** Traduz uma lista de nomes. */
export function ptList(names?: string[] | null): string[] {
  return [...new Set((names ?? []).map(pt))];
}

/**
 * Traduz um texto com nomes separados por vírgula ("Role-playing (RPG), Adventure").
 * Procura os nomes conhecidos antes de separar, porque alguns têm vírgula dentro.
 */
export function ptJoined(text?: string | null): string | undefined {
  if (!text) return undefined;
  const found: string[] = [];
  let rest = text;
  for (const k of KEYS) {
    if (rest.includes(k)) { found.push(k); rest = rest.split(k).join('\u0000'); }
  }
  const leftovers = rest.split(/[,\u0000]/).map((x) => x.trim()).filter(Boolean);
  // Mantém a ordem original do texto.
  const ordered = [...found, ...leftovers].sort((a, b) => text.indexOf(a) - text.indexOf(b));
  return [...new Set(ordered.map(pt))].join(', ');
}

const VIDEO: [RegExp, string][] = [
  [/^launch trailer$/i, 'Trailer de lançamento'],
  [/^announcement trailer$/i, 'Trailer de anúncio'],
  [/^reveal trailer$/i, 'Trailer de revelação'],
  [/^story trailer$/i, 'Trailer da história'],
  [/^gameplay trailer$/i, 'Trailer de gameplay'],
  [/^gameplay( video)?$/i, 'Gameplay'],
  [/^accolades trailer$/i, 'Trailer de elogios'],
  [/^official trailer$/i, 'Trailer oficial'],
  [/^release date trailer$/i, 'Trailer da data de lançamento'],
  [/^teaser( trailer)?$/i, 'Teaser'],
  [/^trailer$/i, 'Trailer'],
];

/** Nomes comuns dos vídeos do IGDB; o resto fica como veio. */
export function ptVideo(name?: string): string {
  const n = (name ?? '').trim();
  if (!n) return 'Vídeo';
  for (const [re, out] of VIDEO) if (re.test(n)) return out;
  return n;
}
