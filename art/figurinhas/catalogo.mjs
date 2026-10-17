/**
 * Catálogo da Temporada 1: "Mundos para explorar". Fonte única para a arte, o plano, a migração e os prompts.
 * 20 páginas de 6 (14 de Mundos e 6 da Casa WinnerZ) e a página lendária, que guarda a figurinha da edição do
 * WinnerZ Awards (fora dos pacotes; vai para quem vota).
 * Raridades: 70 Comuns, 30 Incomuns, 15 Raras, 5 Lendárias. Comum e Incomum: arte em vetor (gravura de horizonte),
 * feita aqui. Rara e Lendária: arte pintada, gerada a partir do prompt de cada uma.
 * `old` é o número da figurinha atual (0054) que esta substitui no mesmo registro: quem tem continua tendo.
 */
export const BOOK = { slug: 'mundos', title: 'Mundos para explorar', subtitle: 'Temporada 1' };

/** Paleta de cada página: a mesma luz para a gravura e para os prompts das pintadas. */
export const PAGES = [
  { n: 1, part: 'Mundos', kicker: 'Capítulo 01', title: 'Vila inicial', body: 'Toda jornada sai de algum lugar. Esta sai daqui, com o mapa ainda em branco.', light: 'fim de tarde dourado, janelas acesas', palette: 'deep navy sky fading to warm amber at the horizon, golden window light' },
  { n: 2, part: 'Mundos', kicker: 'Capítulo 02', title: 'Floresta dos portais', body: 'Passagens que só aparecem para quem continua andando.', light: 'mata funda com feixes de luz verde-dourada', palette: 'deep emerald forest, shafts of green-gold light, soft mist' },
  { n: 3, part: 'Mundos', kicker: 'Capítulo 03', title: 'Ruínas e descobertas', body: 'O que ficou de pé depois de tudo.', light: 'manhã clara, pedra e hera', palette: 'pale morning light, warm limestone, ivy green, hazy sky' },
  { n: 4, part: 'Mundos', kicker: 'Capítulo 04', title: 'Reinos esquecidos', body: 'Cada mundo é um convite.', light: 'pôr do sol violeta sobre vales de jade', palette: 'violet dusk, jade valleys, gold rim light' },
  { n: 5, part: 'Mundos', kicker: 'Capítulo 05', title: 'Além das nuvens', body: 'Lá em cima, o caminho continua.', light: 'céu aberto, nuvens de algodão, luz alta', palette: 'bright high-altitude sky, cream clouds, pale gold sunlight, lavender shadows' },
  { n: 6, part: 'Mundos', kicker: 'Capítulo 06', title: 'Deserto de vidro', body: 'A areia guarda o que o vento esquece.', light: 'meio-dia branco e areia que brilha', palette: 'bleached white sun, glassy amber dunes, turquoise accents' },
  { n: 7, part: 'Mundos', kicker: 'Capítulo 07', title: 'Profundezas', body: 'Quanto mais fundo, mais luz própria.', light: 'azul do fundo do mar e bioluminescência', palette: 'abyssal blue-black water, cyan and teal bioluminescence, faint god rays from above' },
  { n: 8, part: 'Mundos', kicker: 'Capítulo 08', title: 'Reino de gelo', body: 'O frio conserva tudo, até as promessas.', light: 'noite polar com aurora', palette: 'icy blues, white snow, green and violet aurora' },
  { n: 9, part: 'Mundos', kicker: 'Capítulo 09', title: 'A forja', body: 'Onde o fogo dá forma às coisas.', light: 'brasa, basalto e fumaça', palette: 'black basalt, molten orange and gold, ember glow, smoke' },
  { n: 10, part: 'Mundos', kicker: 'Capítulo 10', title: 'Pântano das brumas', body: 'Nem todo caminho quer ser encontrado.', light: 'névoa verde e vaga-lumes', palette: 'murky green mist, dark water, firefly yellow' },
  { n: 11, part: 'Mundos', kicker: 'Capítulo 11', title: 'Cidade neon', body: 'A cidade nunca desliga.', light: 'chuva noturna, néon magenta e ciano', palette: 'rainy night, magenta and cyan neon reflections, wet asphalt' },
  { n: 12, part: 'Mundos', kicker: 'Capítulo 12', title: 'Fliperama perdido', body: 'Uma ficha, mais uma vida.', light: 'sala escura de fliperama, telas acesas (pixel)', palette: 'dark arcade room, glowing CRT screens, saturated pixel colors' },
  { n: 13, part: 'Mundos', kicker: 'Capítulo 13', title: 'Abismo', body: 'Lá embaixo mora o último chefe.', light: 'escuridão, tochas e vermelho profundo', palette: 'near-black depths, torch orange, deep crimson' },
  { n: 14, part: 'Mundos', kicker: 'Capítulo 14', title: 'Mar de estrelas', body: 'Depois do último mundo, sempre há outro.', light: 'espaço profundo, nebulosas', palette: 'deep space indigo, nebula magenta and teal, starlight' },
  { n: 15, part: 'Casa WinnerZ', kicker: 'Casa WinnerZ', title: 'No ar', body: 'Quando a luz vermelha acende, o canal vira ponto de encontro.', light: 'estúdio à noite, luz de gravação', palette: 'dark studio, warm key light, red ON AIR glow, gold accents' },
  { n: 16, part: 'Casa WinnerZ', kicker: 'Casa WinnerZ', title: 'Jogatina', body: 'Mais uma partida. Só mais uma.', light: 'sala de madrugada, luz da tela', palette: 'late-night living room, cool screen glow, warm lamp' },
  { n: 17, part: 'Casa WinnerZ', kicker: 'Casa WinnerZ', title: 'Jornada', body: 'Sem pressa e sem obrigação: o que importa é o caminho.', light: 'mesa de escrever, luz de abajur', palette: 'warm desk lamp, paper, ink, leather' },
  { n: 18, part: 'Casa WinnerZ', kicker: 'Casa WinnerZ', title: 'Coleção', body: 'Cada caixa guarda uma época.', light: 'estante iluminada, vitrine', palette: 'dark wood shelves, vitrine spotlights, glass reflections' },
  { n: 19, part: 'Casa WinnerZ', kicker: 'Casa WinnerZ', title: 'Praça', body: 'Onde as jornadas se cruzam.', light: 'praça ao entardecer, balões de conversa', palette: 'warm evening plaza, string lights, soft dusk' },
  { n: 20, part: 'Casa WinnerZ', kicker: 'Casa WinnerZ', title: 'WinnerZ Awards', body: 'Uma noite por ano, os jogos sobem ao palco.', light: 'palco, holofotes e dourado', palette: 'black stage, spotlights, champagne gold, crystal' },
];

const C = 'comum', I = 'incomum', R = 'rara', L = 'lendaria';
/** [página, nome, raridade, cena, número antigo?] na ordem dos números. */
const LIST = [
  // 1 · Vila inicial
  [1, 'Casa da lareira', C, 'Chalé de pedra no alto da colina, janelas acesas e fumaça da chaminé'],
  [1, 'Moinho do vale', C, 'Moinho de pás contra o sol que se põe, trigal dourado na frente'],
  [1, 'Poço dos desejos', C, 'Poço de pedra à noite, luz dourada e moedas subindo lá de dentro'],
  [1, 'Ponte de pedra', C, 'Arco de pedra sobre o rio; o arco e o reflexo fecham um círculo de luz'],
  [1, 'Placa da encruzilhada', C, 'Placa de madeira com três setas e uma lanterna, estrada que se divide'],
  [1, 'Mapa em branco', I, 'Mapa quase vazio na mesa: a vila no canto, um caminho pontilhado, bússola e vela'],
  // 2 · Floresta dos portais
  [2, 'Copa antiga', C, 'Árvore imensa vista de baixo, a copa fechando o céu', 3],
  [2, 'Trilha de musgo', C, 'Trilha de pedras cobertas de musgo entrando na mata'],
  [2, 'Cogumelos de luz', C, 'Cogumelos que brilham no escuro, em volta de um tronco caído'],
  [2, 'Cidades nas árvores', I, 'Casas e pontes penduradas nos troncos, lanternas acesas', 2],
  [2, 'Raposa-lanterna', I, 'Raposa de cauda que brilha como lanterna, sentada na trilha'],
  [2, 'Além do portal', R, 'Portal de pedra no meio da mata, luz de outro mundo atravessando', 1],
  // 3 · Ruínas e descobertas
  [3, 'Ruínas do oeste', C, 'Colunas e arcos tomados pela hera, céu claro', 4],
  [3, 'Cascata escondida', C, 'Queda d’água atrás de um arco de pedra', 6],
  [3, 'Coluna caída', C, 'Coluna tombada atravessando um riacho raso'],
  [3, 'Guardião branco', I, 'Estátua de guardião em pedra branca, coberta de hera', 5],
  [3, 'Escadaria submersa', I, 'Escada de templo que desce para dentro de um lago claro'],
  [3, 'Câmara do eco', R, 'Salão subterrâneo; um feixe de luz cai sobre um pedestal com um artefato'],
  // 4 · Reinos esquecidos
  [4, 'Flores do vale', C, 'Campo de flores no vale, montanhas violeta ao fundo', 9],
  [4, 'Estandarte rasgado', C, 'Estandarte sem brasão balançando numa lança, ao vento'],
  [4, 'Muralha da fronteira', C, 'Muralha que segue as cristas até sumir no horizonte'],
  [4, 'Rio de jade', I, 'Rio verde-jade serpenteando entre penhascos', 8],
  [4, 'Coroa sem rei', I, 'Coroa pousada num trono vazio, luz de vitral'],
  [4, 'Reinos esquecidos', R, 'Cidade de torres num vale ao pôr do sol, vista de um penhasco', 7],
  // 5 · Além das nuvens
  [5, 'Mar de nuvens', C, 'Picos furando um mar de nuvens'],
  [5, 'Balão de viagem', C, 'Balão de lona remendada subindo entre as nuvens'],
  [5, 'Farol do céu', C, 'Farol numa rocha flutuante, girando a luz para os viajantes'],
  [5, 'Arco de luz', I, 'Arco-íris em arco perfeito sobre uma ponte de nuvem', 12],
  [5, 'Castelo das nuvens', R, 'Castelo branco sobre nuvens, cachoeiras caindo para o vazio', 10],
  [5, 'Ilha flutuante', L, 'Ilha inteira flutuando, raízes e cachoeiras por baixo, céu infinito', 11],
  // 6 · Deserto de vidro
  [6, 'Dunas de vidro', C, 'Dunas com cristais de vidro que refletem o sol'],
  [6, 'Oásis', C, 'Palmeiras e um espelho d’água no meio das dunas'],
  [6, 'Caravana ao longe', C, 'Fila de viajantes no alto da duna, contra o sol'],
  [6, 'Ossada do gigante', C, 'Costelas colossais meio enterradas na areia'],
  [6, 'Relógio de sol', C, 'Relógio de sol antigo marcando uma hora que não existe'],
  [6, 'Tempestade de areia', I, 'Parede de areia avançando sobre um templo'],
  // 7 · Profundezas
  [7, 'Recife', C, 'Recife de coral, peixes em cardume e luz filtrada'],
  [7, 'Medusas', C, 'Medusas brilhando no azul escuro'],
  [7, 'Navio naufragado', C, 'Casco de navio no fundo, coberto de algas'],
  [7, 'Templo afundado', I, 'Escadaria e colunas de um templo no fundo do mar'],
  [7, 'Peixe-lanterna', I, 'Peixe das profundezas com a isca acesa'],
  [7, 'Leviatã adormecido', R, 'Criatura colossal dormindo no leito do mar, um mergulhador diante dela'],
  // 8 · Reino de gelo
  [8, 'Pinheiros na neve', C, 'Mata de pinheiros carregados de neve'],
  [8, 'Lago congelado', C, 'Lago de gelo liso refletindo as montanhas'],
  [8, 'Aurora', C, 'Aurora verde e violeta sobre a planície branca'],
  [8, 'Refúgio na montanha', I, 'Cabana com a janela acesa na encosta nevada'],
  [8, 'Lobo de gelo', I, 'Lobo de pelo branco-azulado no alto de uma pedra'],
  [8, 'Cidadela de cristal', R, 'Cidadela de gelo e cristal sob a aurora'],
  // 9 · A forja
  [9, 'Rio de lava', C, 'Rio de lava abrindo caminho entre rochas negras'],
  [9, 'Bigorna', C, 'Bigorna com faíscas no ar, martelo apoiado'],
  [9, 'Chaminés de basalto', C, 'Colunas de basalto soltando fumaça'],
  [9, 'Lâmina recém-forjada', I, 'Espada ainda em brasa saindo do fogo'],
  [9, 'Ferreiro das brasas', R, 'Ferreiro gigante de pedra e fogo trabalhando na bigorna'],
  [9, 'Serpente de brasa', L, 'Serpente de magma emergindo da cratera, brasas no céu'],
  // 10 · Pântano das brumas
  [10, 'Raízes retorcidas', C, 'Árvores de raízes altas saindo da água parada'],
  [10, 'Vaga-lumes', C, 'Nuvem de vaga-lumes sobre o pântano'],
  [10, 'Cabana sobre palafitas', C, 'Casa de madeira em palafitas, luz fraca na porta'],
  [10, 'Barqueiro', C, 'Barco com lanterna atravessando a névoa'],
  [10, 'Lírios da noite', C, 'Lírios-d’água abertos à noite'],
  [10, 'Olhos na névoa', I, 'Dois olhos acesos no meio da bruma'],
  // 11 · Cidade neon
  [11, 'Chuva de néon', C, 'Rua molhada refletindo letreiros sem nome'],
  [11, 'Becos e letreiros', C, 'Beco estreito cheio de placas acesas e fios'],
  [11, 'Metrô elevado', C, 'Trem passando no trilho elevado entre prédios'],
  [11, 'Moto na chuva', I, 'Moto cortando a avenida molhada, faróis riscando a chuva'],
  [11, 'Mirante da torre', I, 'Alguém no parapeito de um prédio olhando a cidade'],
  [11, 'Arranha-céu infinito', R, 'Torre que some nas nuvens, cidade inteira lá embaixo'],
  // 12 · Fliperama perdido
  [12, 'Ficha dourada', C, 'Ficha de fliperama brilhando sobre o carpete (pixel)'],
  [12, 'Joystick', C, 'Alavanca e botões de um gabinete, vistos de perto (pixel)'],
  [12, 'Aperte start', C, 'Tela de título piscando "APERTE START" (pixel)'],
  [12, 'Corredor das máquinas', I, 'Fileira de gabinetes acesos numa sala escura (pixel)'],
  [12, 'Recorde', I, 'Tabela de recordes com WZ no topo (pixel)'],
  [12, 'Chefe de pixels', R, 'Chefe gigante em pixel art saindo da tela para a sala'],
  // 13 · Abismo
  [13, 'Escada em espiral', C, 'Escada em espiral descendo para o escuro'],
  [13, 'Tochas', C, 'Corredor de pedra iluminado por tochas'],
  [13, 'Porta selada', C, 'Porta de ferro com selo e correntes'],
  [13, 'Ponto de salvamento', I, 'Cristal que gira sobre um pedestal, luz calma no escuro'],
  [13, 'Guardião do abismo', R, 'Armadura vazia de três metros guardando a ponte'],
  [13, 'O último chefe', L, 'Silhueta colossal de olhos acesos no fundo do abismo; uma pessoa pequena diante dela'],
  // 14 · Mar de estrelas
  [14, 'Nave exploradora', C, 'Nave pequena passando diante de um planeta'],
  [14, 'Planeta anelado', C, 'Planeta com anéis visto de uma lua'],
  [14, 'Nebulosa', C, 'Nebulosa em forma de flor'],
  [14, 'Estação à deriva', I, 'Estação espacial abandonada girando devagar'],
  [14, 'Cometa', R, 'Cometa cruzando o céu de um planeta desconhecido'],
  [14, 'Baleia das estrelas', L, 'Baleia feita de luz e estrelas nadando entre nebulosas'],
  // 15 · No ar
  [15, 'Luz de gravação', C, 'Placa "NO AR" acesa em vermelho'],
  [15, 'Microfone', C, 'Microfone de estúdio no braço articulado'],
  [15, 'O chat', C, 'Balões de mensagem subindo pela tela'],
  [15, 'Código na tela', I, 'Código de drop aparecendo na transmissão'],
  [15, 'A vinheta', I, 'W e Z se juntando como ímã num estouro de luz'],
  [15, 'Estúdio à meia-noite', R, 'O estúdio do canal à noite: telas, luz quente, cadeira vazia'],
  // 16 · Jogatina
  [16, 'Dois controles', C, 'Dois controles genéricos no sofá'],
  [16, 'Pizza da madrugada', C, 'Caixa de pizza aberta ao lado do console'],
  [16, 'Tela dividida', C, 'Televisão com a tela dividida em dois'],
  [16, 'O sofá', I, 'Sofá gasto com almofadas e a luz da TV'],
  [16, 'Virada no último segundo', I, 'Mãos apertando o controle, faíscas na tela'],
  [16, 'Noite de jogatina', R, 'Amigos de costas no sofá diante da TV, a sala inteira acesa pela tela'],
  // 17 · Jornada
  [17, 'O diário', C, 'Diário aberto com anotações e um jogo colado'],
  [17, 'Marcador de página', C, 'Fita marcadora dourada saindo do livro'],
  [17, 'Backlog', C, 'Pilha de caixas de jogo esperando a vez'],
  [17, 'Ampulheta', C, 'Ampulheta com areia dourada: horas jogadas'],
  [17, 'Retomada', C, 'Controle empoeirado sendo pego de novo'],
  [17, 'Zerado', I, 'Tela de créditos subindo, controle no colo'],
  // 18 · Coleção
  [18, 'A estante', C, 'Estante cheia de caixas de jogo, lombadas coloridas'],
  [18, 'Cartucho soprado', C, 'Cartucho genérico sendo soprado'],
  [18, 'Manual de instruções', C, 'Manual aberto com mapa e anotações'],
  [18, 'Caixa lacrada', I, 'Caixa ainda no plástico, com reflexo'],
  [18, 'Console guardado', I, 'Console genérico embrulhado num pano, com carinho'],
  [18, 'A vitrine', R, 'Vitrine iluminada com a coleção inteira, cada peça no seu lugar'],
  // 19 · Praça
  [19, 'Balões da praça', C, 'Balões de conversa flutuando sobre a praça'],
  [19, 'Troca de figurinhas', C, 'Duas mãos trocando figurinhas'],
  [19, 'Convite', C, 'Convite de jogatina preso no mural'],
  [19, 'Mural da comunidade', C, 'Mural cheio de recados e desenhos'],
  [19, 'Avatar', C, 'Avatares quadrados de contorno branco, lado a lado'],
  [19, 'Roda de conversa', I, 'Pessoas sentadas em roda, balões acima delas'],
  // 20 · WinnerZ Awards
  [20, 'Cédula de voto', C, 'Cédula marcada caindo na urna'],
  [20, 'Tapete', C, 'Tapete escuro com filete dourado subindo a escada'],
  [20, 'Plateia', C, 'Plateia no escuro, silhuetas e luzes de celular'],
  [20, 'Envelope', I, 'Envelope dourado lacrado com o WZ'],
  [20, 'O palco', R, 'Palco vazio com holofotes cruzados e o telão aceso'],
  [20, 'O troféu', L, 'O troféu do WinnerZ Awards: placa de cristal com a bússola dourada, sob o holofote', 13],
];

export const STICKERS = LIST.map(([page, name, tier, scene, old], i) => ({ number: i + 1, page, name, tier, scene, old: old ?? null, art: tier === 'comum' || tier === 'incomum' ? 'vetor' : 'pintada' }));

/** A página lendária: a figurinha da edição do Awards (não sai em pacote). */
export const LEGENDARY_PAGE = { kicker: 'Página lendária', title: 'Confluência', body: 'A figurinha da edição do WinnerZ Awards. Vai para quem vota.' };
