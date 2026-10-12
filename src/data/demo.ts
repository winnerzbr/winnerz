import type { State, Game } from './types';
import { normalize } from '../lib/rating';

/** Dados de demonstração: usados quando o Supabase não está configurado. */

const img = (n: string) => `/demo/${n}.webp`;

const games: Game[] = [
  {
    id: 'tlou2', slug: 'the-last-of-us-part-ii', igdbId: 26192, title: 'The Last of Us Part II',
    cover: img('cover-tlou2'), backdrop: img('scene-tlou-horse'), year: 2020,
    developer: 'Naughty Dog', publisher: 'Sony Interactive Entertainment',
    platforms: ['PlayStation 4', 'PlayStation 5'], genres: 'Ação, aventura e tiro em terceira pessoa',
    summary: 'Cinco anos depois de sua perigosa jornada pelos Estados Unidos pós-pandemia, Ellie e Joel se estabeleceram em Jackson, Wyoming. Quando um evento violento interrompe essa paz, Ellie embarca em uma jornada implacável para fazer justiça.',
    summarySource: 'Texto do IGDB, traduzido para o português',
    releases: [{ platform: 'PlayStation 4', date: '19 de junho de 2020' }, { platform: 'PlayStation 5, atualização', date: '19 de maio de 2021' }],
    screenshots: [img('scene-tlou-field'), img('scene-tlou-forest'), img('scene-tlou-guitar'), img('scene-tlou-fire')],
  },
  { id: 'astro', slug: 'astro-bot', igdbId: 255342, title: 'Astro Bot', cover: img('cover-astro'), backdrop: img('scene-astro-sky'), year: 2024, developer: 'Team Asobi', publisher: 'Sony Interactive Entertainment', platforms: ['PlayStation 5'], genres: 'Plataforma e aventura', screenshots: [img('scene-astro-tree'), img('scene-astro-kratos')] },
  { id: 'p5r', slug: 'persona-5-royal', title: 'Persona 5 Royal', cover: img('cover-p5r'), year: 2019, developer: 'Atlus', platforms: ['PlayStation 4'], genres: 'RPG e aventura' },
  { id: 'yakuza', slug: 'yakuza-kiwami', title: 'Yakuza Kiwami', cover: img('cover-yakuza'), backdrop: img('scene-yakuza-street'), year: 2016, developer: 'Ryu Ga Gotoku Studio', platforms: ['PlayStation 4'], genres: 'Ação e RPG' },
  { id: 'infamous', slug: 'infamous', title: 'Infamous', cover: img('cover-infamous'), backdrop: img('scene-infamous-city'), year: 2009, developer: 'Sucker Punch', platforms: ['PlayStation 3'], genres: 'Ação e plataforma' },
  { id: 'kz2', slug: 'killzone-2', title: 'Killzone 2', cover: img('cover-kz2'), backdrop: img('scene-kz2'), year: 2009, developer: 'Guerrilla Games', platforms: ['PlayStation 3'], genres: 'Tiro em primeira pessoa' },
  { id: 'mgs2', slug: 'metal-gear-solid-2-sons-of-liberty', title: 'Metal Gear Solid 2', cover: img('cover-mgs2'), year: 2001, developer: 'Konami', platforms: ['PlayStation 2'], genres: 'Ação e furtividade' },
  { id: 'dderby', slug: 'destruction-derby', title: 'Destruction Derby', cover: img('cover-dderby'), backdrop: img('scene-dderby'), year: 1995, developer: 'Reflections', platforms: ['PlayStation'], genres: 'Corrida' },
  { id: 'nfs', slug: 'the-need-for-speed', title: 'Need for Speed', cover: img('cover-nfs'), backdrop: img('scene-nfs'), year: 1994, developer: 'Electronic Arts', platforms: ['PlayStation'], genres: 'Corrida' },
  { id: 'gta6', slug: 'grand-theft-auto-vi', title: 'Grand Theft Auto VI', cover: img('cover-gta6'), backdrop: img('scene-gta6-city'), year: 2026, developer: 'Rockstar Games', platforms: ['PlayStation 5', 'Xbox Series X|S'], genres: 'Ação e mundo aberto' },
  { id: 'elden', slug: 'elden-ring', title: 'Elden Ring', cover: img('cover-elden'), year: 2022, developer: 'FromSoftware', platforms: ['PlayStation 5', 'PC'], genres: 'RPG de ação' },
];

export function demoState(): State {
  return {
    ready: true,
    mode: 'demo',
    profile: { id: 'demo', name: 'Heverton', initial: 'H' },
    prefs: { theme: 'escuro', black: 70, scale: 'TEN_POINT', motion: 'completas', focusIds: ['j-tlou2', 'j-astro'] },
    schemaV4: true,
    myGames: { infamous: { gameId: 'infamous', priority: 1, estHours: 17 }, kz2: { gameId: 'kz2', priority: 2, estHours: 9 }, dderby: { gameId: 'dderby', wontPlay: true } },
    games: Object.fromEntries(games.map((g) => [g.id, g])),
    copies: [
      { id: 'c1', gameId: 'astro', platform: 'PlayStation 5', kind: 'digital', items: 'Digital', origin: 'Comprei no lançamento, 2024', note: 'Comprei no dia do aniversário do PlayStation. Foi presente para mim mesmo.' },
      { id: 'c2', gameId: 'tlou2', platform: 'PlayStation 4', kind: 'fisico', items: 'Caixa e disco', condition: 'Muito bom', origin: 'Comprei, junho de 2020', note: 'Comprei na pré-venda e joguei na semana do lançamento.', special: true },
      { id: 'c3', gameId: 'p5r', platform: 'PlayStation 4', kind: 'fisico', items: 'Caixa, disco e cartão de arte', condition: 'Novo', origin: 'Ganhei, 2021', note: 'Presente de um amigo que jurou que eu ia gostar. Ele estava certo.' },
      { id: 'c4', gameId: 'yakuza', platform: 'PlayStation 4', kind: 'digital', items: 'Digital', origin: 'Comprei em promoção, 2023', note: 'Entrou na estante por causa do karaokê. Ficou pela história.' },
      { id: 'c5', gameId: 'infamous', platform: 'PlayStation 3', kind: 'fisico', items: 'Caixa, disco e manual', condition: 'Bom', origin: 'Comprei usado, por volta de 2010', note: 'Achei numa feira de usados com o manual intacto.' },
      { id: 'c6', gameId: 'kz2', platform: 'PlayStation 3', kind: 'fisico', items: 'Caixa, disco e manual', condition: 'Muito bom', origin: 'Ganhei, por volta de 2009', note: 'Presente do meu irmão. Jogamos o online juntos até os servidores fecharem.', special: true },
      { id: 'c7', gameId: 'mgs2', platform: 'PlayStation 2', kind: 'fisico', items: 'Caixa e disco', condition: 'Gasto, mas inteiro', origin: 'Comprei, 2002', note: 'O primeiro jogo que comprei com o meu dinheiro.' },
      { id: 'c8', gameId: 'dderby', platform: 'PlayStation', kind: 'fisico', items: 'Caixa e disco', condition: 'Caixa rachada', origin: 'Não lembro', note: 'Está aqui desde sempre.' },
      { id: 'c9', gameId: 'nfs', platform: 'PlayStation', kind: 'fisico', items: 'Caixa, disco e manual', condition: 'Bom', origin: 'Herdei do meu primo', note: 'A trilha sonora ainda toca na minha cabeça.' },
    ],
    wishes: [{ gameId: 'gta6', note: 'Lança em 19 de novembro' }, { gameId: 'elden', note: 'Quer a edição física, PS5' }],
    favorites: ['tlou2', 'astro'],
    journeys: [
      { id: 'j-tlou2', gameId: 'tlou2', mood: 'jogando' },
      { id: 'j-astro', gameId: 'astro', mood: 'jogando' },
      { id: 'j-yakuza', gameId: 'yakuza', mood: 'silencioso' },
      { id: 'j-p5r', gameId: 'p5r', mood: 'pausado', pausedNote: 'Pausado em agosto. Ele espera.' },
      { id: 'j-mgs2', gameId: 'mgs2', mood: 'jogando' },
    ],
    focusJourneyId: 'j-tlou2',
    histories: [
      { id: 'h-tlou2-1', journeyId: 'j-tlou2', ordinal: 1, title: 'Primeira vez', state: 'concluida', startedAt: '2020-06-19T22:00:00-03:00', completedAt: '2020-08-14T23:30:00-03:00', progress: 100 },
      { id: 'h-tlou2-2', journeyId: 'j-tlou2', ordinal: 2, title: 'Rejogada', state: 'ativa', startedAt: '2026-09-28T21:00:00-03:00', progress: 46, mode: 'Implacável', letter: { text: 'Voltei porque em 2020 joguei com raiva e quis entender a Abby com calma. Se você está lendo isso, conseguiu? Espero que sim. E vê se não demora seis anos para a próxima.' } },
      { id: 'h-astro-1', journeyId: 'j-astro', ordinal: 1, title: 'Primeira vez', state: 'ativa', startedAt: '2025-10-11T20:00:00-03:00', progress: 78 },
      { id: 'h-yakuza-1', journeyId: 'j-yakuza', ordinal: 1, title: 'Primeira vez', state: 'ativa', startedAt: '2026-07-02T21:00:00-03:00' },
      { id: 'h-p5r-1', journeyId: 'j-p5r', ordinal: 1, title: 'Primeira vez', state: 'pausada', startedAt: '2026-03-10T21:00:00-03:00', progress: 62 },
      { id: 'h-mgs2-1', journeyId: 'j-mgs2', ordinal: 1, title: 'Primeira vez', state: 'concluida', startedAt: '2002-03-01T15:00:00-03:00', completedAt: '2003-01-20T18:00:00-03:00', progress: 100 },
    ],
    sessions: [
      { id: 's-1', journeyId: 'j-tlou2', historyId: 'h-tlou2-2', startedAt: '2026-09-28T21:00:00-03:00', endedAt: '2026-09-28T23:10:00-03:00', note: 'Começar de novo sabendo o que vem é estranho.' },
      { id: 's-2', journeyId: 'j-tlou2', historyId: 'h-tlou2-2', startedAt: '2026-10-02T21:30:00-03:00', endedAt: '2026-10-02T23:00:00-03:00' },
      { id: 's-3', journeyId: 'j-tlou2', historyId: 'h-tlou2-2', startedAt: '2026-10-05T20:40:00-03:00', endedAt: '2026-10-05T22:30:00-03:00' },
      { id: 's-4', journeyId: 'j-tlou2', historyId: 'h-tlou2-2', startedAt: '2026-10-09T21:00:00-03:00', endedAt: '2026-10-09T22:50:00-03:00', minutes: 110, note: 'Voltar ao cofre trancado no centro antes de seguir viagem. A senha está no bilhete da loja de discos.', whereStopped: 'Seattle, dia 2' },
      { id: 's-astro-8', journeyId: 'j-astro', historyId: 'h-astro-1', startedAt: '2026-10-07T20:00:00-03:00', endedAt: '2026-10-07T21:10:00-03:00', note: 'Achar os três bots do planeta de gelo.' },
    ],
    events: [
      { id: 'e1', journeyId: 'j-tlou2', historyId: 'h-tlou2-1', kind: 'inicio', at: '2020-06-19T22:00:00-03:00', title: 'Primeira vez', text: 'Começou sua primeira História com o jogo.', image: img('scene-tlou-dark') },
      { id: 'e2', journeyId: 'j-tlou2', historyId: 'h-tlou2-1', kind: 'sessao', at: '2020-07-10T22:00:00-03:00', dateLabel: 'jun a ago 2020', title: '23 sessões', text: 'Quase sempre à noite, de fone.', image: img('scene-tlou-fire') },
      { id: 'e3', journeyId: 'j-tlou2', historyId: 'h-tlou2-1', kind: 'momento', at: '2020-08-02T23:00:00-03:00', title: 'A porta iluminada', quote: 'Fiquei parado aqui um tempão.', text: 'Momento guardado com captura de tela.', image: img('scene-tlou-door') },
      { id: 'e4', journeyId: 'j-tlou2', historyId: 'h-tlou2-1', kind: 'marco', at: '2020-08-14T23:30:00-03:00', title: 'Zerou', text: 'Primeira História concluída. 31 horas informadas.', image: img('scene-tlou-horse') },
      { id: 'e5', journeyId: 'j-tlou2', historyId: 'h-tlou2-2', kind: 'inicio', at: '2026-09-28T21:00:00-03:00', title: 'Rejogada', text: 'Uma nova História, no modo Implacável. A primeira continua intacta.', image: img('scene-tlou-field') },
      { id: 'e6', journeyId: 'j-tlou2', historyId: 'h-tlou2-2', kind: 'carta', at: '2026-09-28T21:01:00-03:00', title: 'Uma carta para o fim', text: 'Você escreveu por que voltou. Ela abre quando você zerar.', image: img('scene-tlou-ellie') },
      { id: 'e7', journeyId: 'j-tlou2', historyId: 'h-tlou2-2', kind: 'momento', at: '2026-10-02T22:10:00-03:00', title: 'Loja de música', quote: 'Não lembrava dessa cena.', text: 'Momento guardado na sessão 2.', image: img('scene-tlou-guitar'), sessionId: 's-2' },
      { id: 'e8', journeyId: 'j-tlou2', historyId: 'h-tlou2-2', kind: 'ponto', at: '2026-10-05T21:40:00-03:00', title: 'Quarto trancado', text: 'Hillcrest, segundo andar.', image: img('scene-tlou-forest'), sessionId: 's-3' },
      { id: 'e9', journeyId: 'j-tlou2', historyId: 'h-tlou2-2', kind: 'ponto', at: '2026-10-09T22:20:00-03:00', title: 'Porão com o gerador', text: 'Só nota e foto.', image: img('scene-tlou-dark'), sessionId: 's-4' },
      { id: 'e10', journeyId: 'j-tlou2', historyId: 'h-tlou2-2', kind: 'sessao', at: '2026-10-09T22:50:00-03:00', title: 'Sessão 4', quote: 'Voltar ao cofre trancado no centro antes de seguir viagem.', text: '1h50 informados. Recado para a próxima vez.', image: img('scene-tlou-ellie'), sessionId: 's-4' },
      { id: 'e20', journeyId: 'j-astro', historyId: 'h-astro-1', kind: 'inicio', at: '2025-10-11T20:00:00-03:00', title: 'Primeira vez', quote: 'Parece que voltei a ter dez anos.', text: 'Sua primeira sessão em Astro Bot.', image: img('scene-astro-sky') },
      { id: 'e21', journeyId: 'j-astro', historyId: 'h-astro-1', kind: 'momento', at: '2026-10-07T20:40:00-03:00', title: 'A árvore que pisca', text: 'Momento guardado.', image: img('scene-astro-tree') },
      { id: 'e30', journeyId: 'j-mgs2', historyId: 'h-mgs2-1', kind: 'marco', at: '2003-01-20T18:00:00-03:00', title: 'Zerou', text: 'História concluída.' },
    ],
    reviews: [
      { id: 'r-me', gameId: 'tlou2', mine: true, author: { name: 'Heverton', initial: 'H', color: '#5A4630' }, rating: normalize(9.5, 'TEN_POINT'), title: 'Dói, e é exatamente por isso que funciona', text: 'Nunca um jogo me deixou tão desconfortável com as minhas próprias escolhas. A mecânica de furtividade é a melhor que já joguei e cada cenário conta uma história sem precisar de diálogo. A segunda metade pesa, mas o peso é o ponto.', context: 'Escrita ao concluir sua primeira História, agosto de 2020', writtenAt: '2020-08-15' },
      { id: 'r-1', gameId: 'tlou2', mine: false, author: { name: 'Marina', initial: 'M', color: '#2D4038' }, rating: normalize(4.5, 'FIVE_STAR'), title: 'A trilha sonora carrega tudo', text: 'Joguei de fone, à noite, em poucos fins de semana. Os silêncios fazem tanto quanto os confrontos. Saí diferente do que entrei.', context: 'Concluiu em 2024, 34 horas informadas', useful: 212, writtenAt: '2024-05-02' },
      { id: 'r-2', gameId: 'tlou2', mine: false, author: { name: 'Lucas', initial: 'L', color: '#45362A' }, rating: normalize(7.5, 'TEN_POINT'), title: 'Bonito demais, longo demais', text: 'Tecnicamente impecável. Mas a segunda metade pede uma paciência que eu nem sempre tive, e eu sentia o jogo me segurando quando queria ir embora.', context: 'Pausou duas vezes, concluiu em 2023', useful: 96, writtenAt: '2023-11-20' },
      { id: 'r-3', gameId: 'tlou2', mine: false, author: { name: 'Rafa', initial: 'R', color: '#3B2F45' }, rating: normalize(5, 'FIVE_STAR'), title: 'O final mudou como eu vejo o primeiro jogo', text: 'Sem entrar em detalhes aqui fora: a última hora reorganiza tudo o que veio antes. Vale cada minuto pesado.', context: 'Concluiu em 2025, rejogou no mesmo ano', spoiler: true, useful: 158, writtenAt: '2025-03-14' },
    ],
    reviewStats: {
      tlou2: { count: 1284, avg: 883, dist10: [1, 1, 1, 2, 3, 4, 8, 16, 30, 34] },
    },
  };
}
