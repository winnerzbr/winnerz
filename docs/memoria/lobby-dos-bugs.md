# Lobby dos Bugs: jogo para o Steam

Jogo próprio a partir do minijogo Lobby dos Bugs do Arcade do IAmiguinho, para vender no Steam. Corre em paralelo aos Jogos de Verão.

**Documento do jogo:** "Lobby dos Bugs: documento do jogo" (página no Claude, artefato a59fb9dc-3875-42a6-a7c6-d1b4aab39290, https://claude.ai/artifact/MTDMfMah9pmy7Vkt1nzBUK). É a referência completa; aqui fica o resumo.

## Decidido pelo dono (07/11/2026)
- **Mistura:** jogo de hordas no estilo de Vampire Survivors (só andar, ataque automático, escolher melhorias quando a barra enche) com a estrutura de Left 4 Dead (fases do começo até um ponto seguro).
- **Ponto seguro com troca:** lá aparecem itens prontos, e para levar um é preciso entregar algo que já se tem. Exemplo do dono: pistola de 3 tiros com cadência nível 2 contra pistola de 2 tiros com cadência nível 5.
- **Sorteio sempre equilibrado:** os itens são sorteados, mas balanceados.
- **Muitos itens e inimigos:** centenas de itens e grande variedade de inimigos.
- **Fases e chefes:** fases fixas, não sorteadas. Chefão difícil no fim de cada fase, antes do ponto seguro, e subchefes durante a fase.
- **Visual:** estilo 8 bits. Os gráficos começam gerados por código, e o dono ajusta e faz os sprites dele.
- **Editor de sprites:** um programa de pintura de pixel art em que o dono redesenha cada elemento e personagem, com o botão "Trocar no jogo".
- **Ordem:** começar pelo documento do jogo.
- **Nome:** "Lobby dos Bugs" é provisório; o nome definitivo será escolhido mais para frente.
- **Lançamento:** sem Acesso Antecipado; o jogo sai completo e com mais fases. Precisa durar: não pode dar para zerar em menos de 2 horas e pedir reembolso. O jogo terá mecanismos para jogar por muito tempo sem ver tudo dentro do prazo de reembolso.
- **Ateliê:** nunca será liberado para os jogadores; é ferramenta só do dono (sem Oficina Steam). As skins são desenhadas pelo dono e desbloqueadas jogando.
- **Primeira campanha:** tema "a internet de casa caiu" (5 fases: lan house abandonada, ruas do bairro à noite, esgoto de cabos, data center, servidor central).
- **Trocas no ponto seguro:** começa com 1 troca por ponto seguro e a 2ª é desbloqueada depois.
- **Dash:** além de andar, a pessoa tem um dash (arrancada rápida com tempo de recarga).
- **Jogar junto:** até 4 pessoas no mesmo PC entra já no lançamento.
- **Prioridade:** os dois jogos (este e os Jogos de Verão) recebem a mesma atenção. Este será lançado antes, por ser mais fácil de animar; os Jogos de Verão exigem mais trabalho e mecânicas.

## Proposto no documento (aguarda o dono)
- **Itens:** cerca de 30 armas base e 30 acessórios base, com variações sorteadas e uma "nota de poder" que mantém o sorteio justo.
- **Inimigos:** comportamentos combinados com aparências, inimigos especiais avisados pelo som e um "Diretor" que dosa as hordas.
- **Campanhas:** 3 campanhas de 5 fases (15 fases) liberadas em sequência, mais uma fase secreta; fases de 6 a 10 minutos.
- **Feito para durar:** itens liberados por desafios (150), versões jogáveis do IAmiguinho, "Níveis de Lag" (rejogar com regras extras, até 20), chefões corrompidos, segredos, desafio da semana, conquistas e compêndio. Meta: em 2 horas ver a 1ª campanha e o começo da 2ª; tudo em 30 a 40 horas.
- **Ateliê:** o editor de sprites fica dentro do próprio jogo (Godot), com os botões "Trocar no jogo", "Voltar ao padrão" e "Tornar oficial". O Godot consegue ler desenhos novos de uma pasta e trocar na hora.
- **Arte gerada por IA:** nenhuma dentro do jogo. O Steam exige aviso na página e parte do público rejeita.
- **Jogar junto:** até 4 pessoas no mesmo PC. Online fica para depois; o Remote Play Together do Steam cobre parte.
- **Plano de produção:**
  1. Protótipo de uma fase completa.
  2. Teste com o Discord.
  3. Base do jogo.
  4. Página no Steam.
  5. Demo no Next Fest.
  6. Lançamento.
- **Decisões em aberto:** estão listadas no fim do documento.

## Virada para roguelike (08/11/2026, 11h30)
- O dono largou as hordas sem fim: andares de salas feitas à mão e sorteadas, portas que trancam até a última onda, baús com senha, loja, subchefe, chefão e elevador. Cristais viram níveis que abrem a janela Upar (arma, acessório ou vida) quando a sala fica limpa. Arma nova chega no nível do andar. Vida em corações. Câmera 2× mais perto.
- 08/11 (tarde): andar 1 jogável (salas sorteadas, baús com senha, corações, janela Upar, minimapa). O dono pediu que seja DIFÍCIL como Gungeon e Hades: o piloto sem proteção passa o andar 1 em cerca de 2 de cada 3 tentativas; os andares seguintes ficam mais fortes.
- 08/11 (noite): pedidos do dono depois de jogar feitos em 5 frentes: câmera ~480×270 com pixels inteiros, luz/neon; dash L2 e secundária R2; andar de 16 a 21 salas em JSON com formatos (oval, triângulo, cruz, L, fechada), fendas, secreta e desafio; Ateliê em abas com HUD, Salas e Andares; níveis e cura racionados; baú com janela de troca e melhorias; 6 armas, 7 acessórios, 6 inimigos novos e fases nos 15 chefões.
- 09/11: o dono viu uma prévia 3D e decidiu FICAR na pixel art 2D, mais detalhada e com mais efeitos. Feito: IAmiguinho redesenhado pixel a pixel (fiel ao modelo do ChatGPT), 14 bugs, 7 chefões com desenho por fase, cenário detalhado e sistema de efeitos (VFX). Faltam 20 armas, 8 chefões e parte dos móveis.
- Documento: "Lobby dos Bugs: virada para roguelike" no Claude (https://claude.ai/artifact/9cRje3R8WDipicv2M5xQNb). Detalhes em `docs/memoria/jogo.md` do repositório do jogo.

## Virada para o estilo Enter the Gungeon (08/11/2026)
- Decidido pelo dono: o IAmiguinho mira e atira (analógico direito, mouse ou setas, ou dois analógicos no toque); 1 arma primária (tiro sem fim) e 1 secundária no L2 com cargas; menos bugs, mais perigosos e atirando (hordas grandes só nos eventos); níveis e cartas continuam.
- Gráficos: pixel art detalhada no estilo Enter the Gungeon no lugar do 8 bits (nada copiado; o dono redesenha no Ateliê). Guia em `docs/estilo.md` do repositório do jogo.
- Feito no mesmo dia: controles, as 15 armas, inimigos e ritmo, IAmiguinho novo (20 × 26, 5 vistas pela mira), interface e Lan house redesenhados. Faltam os desenhos dos 15 chefões no estilo novo.
- Outra conversa fez, ao mesmo tempo, artes PNG 4× e um trecho "Lan house 2.5D" com ataque automático. O dono escolheu: pixel art estilo Gungeon e combate com mira; da outra, só o IAmiguinho do ChatGPT (boné azul com hélice, corpo bege, olhos ciano), reduzido para o quadro de 24 × 32 do jogo. O resto foi arquivado no repositório do jogo, sem apagar.

## Chefões da comunidade gamer (07/11/2026)
- Pedidos pelo dono: Ceifador de Mídia Física (o fim dos jogos em disco em 2028), Magnata Ganancioso, ReMaster (chefe antigo em 16 bits), D.L.C. (completo aos poucos, uma parte por fase), Bugger.
- Sugeridos e aprovados ("Gostei de todas as ideias"): Review Bomb, Passe de Batalha, Downgrade, Patch do Dia 1, Rage Quit, Tutorial Infinito, Speedrunner, Sempre Online.
- Regra: sem nome nem logo de empresa ou jogo real.
- Sugestão que aguarda o dono: 2ª campanha com o tema "A indústria". Por enquanto, todos jogáveis na "Sala de chefões (teste)".

## Onde fica o código
- Repositório próprio: `winnerzbr/lobby-dos-bugs` (Godot 4.7.2, Compatibility), criado pelo dono em 07/11/2026. A memória do jogo fica lá, em `docs/memoria/` (histórico e retrato do projeto), e o `CLAUDE.md` de lá diz como trabalhar.
- Tela de 640 × 360 pixels (o dobro do Arcade), ampliada em números inteiros; quadradinhos de 16 px; o IAmiguinho é o do Arcade (14 × 16).
- O dono joga pelo GitHub Desktop (Fetch origin → Pull origin) e abre no Godot 4.7.2.
- Etapa 1 do plano (protótipo de uma fase completa) começou em 07/11/2026.

## 10/11/2026: caderno de ideias
O dono trouxe 15 ideias depois de jogar (corredores, objetos quebráveis, armadilhas, salas de sobrevivência, salas 2D de plataforma, cerca de 200 inimigos e 50 chefões, armas, melhorias, identidade das salas, satisfação de arma nova, easter eggs, documentos). Estão anotadas, com sugestões, em `docs/memoria/ideias.md` do repositório do jogo e na página "Lobby dos Bugs: caderno de ideias" no Claude (https://claude.ai/artifact/EJrAtEjDqAdLrgYk9tfEkP). Nada mudou no jogo. Falta o documento com tudo do jogo.

## 10/11/2026: rodadas do dia e o estudo do estilo gráfico (em aberto)
- Feito no repositório do jogo (detalhes em `docs/memoria/historico.md` de lá): corredores mais curtos; quebráveis arrumados; botão de ação (quadrado/X, F) para baú e itens; Upar por botão (triângulo/Y, Tab); acesso ao chefão pelo desenho do andar (sem chave); minimapa com a planta real, ícones, mapa grande e viagem rápida; menos travadinhas; objetos destacados do chão; IAmiguinho novo pelas 6 vistas do dono; 8 objetos do cenário redesenhados.
- **Várias resoluções e ultrawide (11/11/2026, pedido do dono; o monitor dele é ultrawide):** o jogo ocupa a janela inteira em qualquer tamanho; menus e janelas no meio, placar nos cantos, o mundo mostra mais para os lados em 21:9; mais largo que isso, faixas pretas. Tela cheia: F11.
- **Estilo gráfico decidido (10/11/2026): 32 PONTOS.** O dono comparou 4 estilos no jogo inteiro (16 pontos de antes, 16 caprichado, 32 pontos, 3D estilo PS2) e escolheu a pixel art de 32 pontos (o dobro da definição). O jogo, o Ateliê e os testes abrem nela. Dos 1.367 desenhos, 543 estão refeitos (todo o IAmiguinho, o bug comum, o vírus e, até 11/11, o cenário inteiro da lan house: pisos, paredes, o que fica na parede, móveis, portas, baús e quebráveis); os outros são o desenho de 16 pontos dobrado sozinho e serão refeitos por lotes (a ordem está em `docs/memoria/ideias.md` do repositório do jogo). Os outros estilos ficaram guardados como estudo. **11/11: o cenário inteiro do andar 1 (lotes 1 a 4, 543 de 1.367 desenhos) está em 32 pontos, com suporte a ultrawide. Regra do dono (11/11): desenho de 32 pontos é pintado do zero, nunca só "refinado" do de 16 pontos; os 94 refinados do lote 4 foram refeitos.** **11/11, tarde: o dono quer o nível visual do Enter the Gungeon (com estilo próprio); os lotes pararam e foi feita a SALA VITRINE (o salão: luz com clima, paredes com friso grosso, carpete em placas, bug gordinho). Aguardando a aprovação dele.** **2ª rodada (11/11): paredes com grossura no jogo todo (alto em lajes claras e casca em volta), carpete em placas de 3 tamanhos, detalhes no chão e a sala `salao_pcs` com formato único. O dono ainda vai avaliar.** **Depois (11/11): o dono aprovou paredes e móveis do salão e pediu VARIEDADE por partida; feito no salão (cada sala sorteia estilos de parede, neons, pendurados, carpete, mesas e cadeiras). Regra dele: do lado de fora das paredes só há volume embaixo do cenário.** **Regras novas do dono (11/11): coesão (a sala toda de um estilo ou em 2 partes inteiras, nunca alternando trechinhos) e "tudo o que for criado daqui para a frente entra no sistema de variedade". Já sorteados por partida: paredes, neons (9 formas), pendurados, carpetes, mesas, cadeiras, 17 móveis encostados e 4 tapetes.**
- Ainda a responder pelo dono: a lore (ele vai pensar).

**11/11/2026 (14h30):** diretriz geral do dono: caprichar nas sombras de TUDO. Objetos pequenos maiores e com volume (passo 1 feito); a seguir, objetos grandes no meio da sala e paredes com níveis de roundness; depois, variedade de tamanho nos inimigos e a revisão geral das sombras.

**11/11/2026 (15h10), orientações do dono:** sem excesso de objetos nas salas (teto de 10% do chão, já no sorteio); ritmo frenético estilo Enter the Gungeon (IAmiguinho mais rápido, inimigos mais ativos, menos inimigos e mais perigosos) — ajuste ainda a fazer. Feitas as ilhas (objetos grandes no meio da sala) e a regra do objeto de pé com sombra colada.

**11/11/2026 (15h30): ritmo, 1ª rodada.** IAmiguinho mais rápido (74 → 112), dash mais curto de recarga; inimigos atacam logo e mais vezes, com menos deles na sala (metade por onda; ondas de horda às vezes); o bug comum com 3 jeitos (afoito, cercador, saltador). Números em `nucleo/ritmo.gd`. Falta o dono jogar e o ajuste fino.

**11/11/2026 (16h30): preparo do ataque.** Regra do dono: nada de "!" piscando; o corpo do inimigo prepara o ataque, com tempo e jeito próprios de cada um (fracos devagar, outros rápidos, outros longos com golpe mais forte). Feito nos 10 inimigos comuns.

**11/11/2026 (17h):** regra do dono: cada inimigo é único em todos os sentidos; o preparo do ataque de cada um tem movimento do corpo e efeito próprios (nenhum repete outro).

**11/11/2026 (17h30):** ideia do dono feita: a parte de cima dos objetos altos (poste, fliperama, geladeira, plantas...) deixa passar e cobre o IAmiguinho quando ele passa atrás.

**11/11/2026 (19h):** portas livres e regras de lugar dos objetos; objeto alto transparente com alguém atrás; penumbra nas salas não visitadas; 31 arenas próprias (2 por chefão, 3 do subchefe) com o meio livre; tiros únicos por inimigo (nenhum repetido).

**11/11/2026 (18h30): onde ficam as diretrizes.** Todas as diretrizes e decisões do dono que valem para o jogo estão numeradas em `winnerzbr/lobby-dos-bugs`, `docs/memoria/diretrizes.md` (com data e a frase dele; diretriz mudada fica riscada, nunca some). Antes de entregar uma rodada: `bash ferramentas/conferir_tudo.sh`.

**11/11/2026 (20h):** 1ª revisão geral das sombras (diretriz B3): sombra pintada em 32 pontos no IAmiguinho, bugs, chefões, baús, itens, cristais e agora também nos tiros; a sombra de cada objeto do cenário no chão tem a forma dele (embaixo e à direita). Falta: sombra dos móveis na parede e uns nos outros, paredes e efeitos. Próximo na fila: variedade de tamanho nos inimigos.

**11/11/2026 (20h30):** pedidos do dono: penumbra cobrindo a sala não visitada inteira, com as bordas difusas; cada inimigo com os sons dele (diretriz D7: "o bug solta uma gosma, então deve ser som de inseto soltando gosma, não de tiro"; 100 sons novos, um para cada golpe); cadeiras sólidas e andar por trás dos monitores (diretriz C9).

**11/11/2026 (22h):** IAmiguinho chibi em teste (opção na pausa, ligada por padrão); diretriz D8 (VFX e animação o mais sofisticados possível): 1ª rodada feita (estouros em camadas, tiros com rastro e efeitos na cor deles, corpo que estica e amassa no IAmiguinho e nos bugs).

**11/11/2026 (21h30):** decisão do dono: a arte continua feita pelo Claude, por código (nada de ChatGPT nos desenhos; diretriz B12). Feita a régua do visual (`docs/regua.md` no repositório do jogo; diretriz B13), com as medidas do Enter the Gungeon, e a sala vitrine nela: contorno de 1 pixel nos personagens, chão calmo, escuro mais fechado.

**11/11/2026 (23h):** o dono ficou nos 32 pontos (o teste "como o Gungeon" não ficou). Inimigos maiores e de tamanhos variados (normal, grandão, miúdo) e chão calmo (menos cor e contraste no piso, níveis na pausa) para os inimigos se destacarem.

**11/11/2026 (23h50):** cada tipo de inimigo com o seu tamanho fixo (miúdo, normal, grande, grandão); IAmiguinho chibi e chão "mais calmo" oficiais. Ideia nova do dono: inimigos que EVOLUEM na luta (outra forma, ataques mais fortes), a definir.

**12/11/2026 (01h):** penumbra de "sinal perdido" (glitch). A EVOLUÇÃO dos inimigos na luta (diretriz D9): evoluem com 12 s vivos, comendo os restos de um do mesmo tipo ou acertando o IAmiguinho 3 vezes; primeira leva: Besouro Bug, Janela de Anúncio, Lixeira de Spam, Vírus Mutante.

**12/11/2026 (02h40):** a 2ª leva das evoluções (a partir dos conceitos do ChatGPT): Torre de Cookies, Servidor Touro, Cofre Cavaleiro, Grade do Captcha, Pescador Abissal, Aranha Câmera, Geleia de RAM, Power Bank Estufado, Torre Pirata e Tela Azul. Os 14 bugs comuns evoluem.

**12/11/2026 (00h50):** tiros nítidos (o brilho por baixo do desenho; o CD que gira, com ecos e quique de arco-íris; os tiros do IAmiguinho redesenhados) e o mapa como no Enter the Gungeon (sala não visitada não aparece; diretrizes D10 e C10).

**12/11/2026 (01h20):** o item MAPA DO ANDAR (revela o andar e os ícones das salas; prêmio de sala, 1 por andar) e os bugs que não nascem nem ficam presos em cantinhos.

**12/11/2026 (01h40):** os capangas caem com o chefão (D12); todos os ataques únicos, de inimigos e chefões (D11; a fila do que se repete em `docs/memoria/ataques.md` do jogo, no plano: M1 tarefa 3b e M3).

**12/11/2026 (03h40):** os chefões do andar 1 com golpes só deles (Robô de Spam repintado: corrente de e-mail que se divide, carimbo "SPAM", 99+ mensagens, espiral e cartinhas que quicam; Troll do Chat: BAN HAMMER em cruz e RAID NO CHAT) e os bugs do andar 1 sem golpes repetidos (catálogo em `docs/memoria/ataques.md` do jogo).

**12/11/2026 (04h):** todas as salas do andar 1 na régua: cada sala com o seu clima (a cor do escuro e as luzes do teto na cor da sala), o contorno completo nos móveis e o chão calmo em todos os pisos.

**12/11/2026 (05h):** o placar e os menus passam a ser feitos peça por peça com o dono (diretriz E8); a primeira, a opção do menu principal pelo rascunho dele (só a palavra; escolhida, o contorno chanfrado se forma com um pulso azul que ecoa e depois pulsa fraco).

**12/11/2026 (12h):** o clima das salas bem mais forte (claras como a recepção, escuras como os servidores); a opção do menu refeita em luz lisa, com estouro forte e respirando; no plano: objetos no lugar certo, menos fendas e fendas criativas, paredes internas na medida.

**12/11/2026 (13h45):** a opção do menu aprovada pelo dono num artefato com opções e aplicada no jogo (diretriz E11): letra Tiny5; escolhida, pontinhos dos dois lados formam a moldura azul inclinada, o tranco dos botões do site WinnerZ engrossa a borda e deixa a palavra laranja, itálica e em negrito, o pulso nasce no tranco e repete mais fraco; a seta é um chevron de luz azul.

**12/11/2026 (14h20):** ideias do dono sobre as armas no plano (ideias 36 a 39; M1 tarefa 6c e M4): as letras do Teclado legíveis em movimento e formando palavras ("kkkk", "lmao") na forma evoluída; o tiro (e talvez o desenho) que muda nas formas evoluídas de todas as armas; o VFX do laser; o Firewall menos forte no nível 1 (recarga lenta ou resistência, a decidir) e os limites de cada arma que se upam.

**12/11/2026 (14h25):** o Firewall com resistência (decidido pelo dono, diretriz D13); no plano, as animações do IAmiguinho refeitas (as mãos e muito mais variedade, ideia 40, M1 tarefa 6d).

**12/11/2026 (15h10):** M1 tarefa 4b feita: os objetos no lugar certo (cadeira logo abaixo da mesa; planta, pufe, lixeira e caixa encostados na parede ou junto do móvel certo); 41 objetos arrumados em 22 salas, com conferência automática.

**12/11/2026 (15h45):** M1 tarefa 4c feita: no máximo 1 sala com fenda no andar 1 (antes quase 2) e menos nos outros; duas salas novas e simples (o corte de cima a baixo e a cruz com 4 ilhas), com o corte atravessado e o anel.

**12/11/2026 (16h20):** as fendas mais evidentes: entre 4 opções, o dono escolheu o abismo (sem os cabos de neon, beirada clara) com o fundo de chuvisco de tela (diretriz C13); já no jogo.

**12/11/2026 (16h50):** M1 tarefa 4d feita: 3 salas novas com uma parede interna cada (o cantinho da copa, a sala de reunião do escritório, a parede em L do salão), o meio sempre aberto.

**12/11/2026 (17h10):** paredes internas mais variadas pelos 4 rascunhos do dono (as baias, o salão dividido, as paredes penduradas, a cruz solta), com poucos móveis e espaço para andar (não precisa ser o meio).

**12/11/2026 (17h40):** salas de tamanhos variados (diretriz C14): pequenas, padrão, grandes e muito grandes, com o peso de cada tamanho por andar; 7 salas novas (banheiro, despensa e salinha técnica pequenas; salão e fliperama grandes; galpão e arena do campeonato muito grandes).

**12/11/2026 (19h):** M1 tarefa 6 feita (diretriz D14): a força dos bugs em três degraus que se sentem (fraco, médio, forte, casados com o tamanho), bugs mais agressivos, a horda rara e só de fracos, a sala de desafio difícil pelo jeito (fortes e evoluídos) e o preparo no corpo dos 4 que ainda piscavam.

**12/11/2026 (20h30):** M1 tarefa 6b feita: 4 bugs novos com jeitos novos, cada um com a forma evoluída, desenhos, preparo, golpes e sons próprios: Cavalo de Troia (corpo a corpo), Drone de Anúncio (voa por cima de móveis e fendas), Rootkit (some e surge atrás) e Ransomware (escudo de cofre que racha e quebra).

**12/11/2026 (21h):** o dono jogou e achou fácil: bugs com velocidade por tipo e bem mais rápidos, preparo e espera mais curtos, chefões mais rápidos (D14 reforçada); o aviso no chão de cada golpe também é único (D15; o Cavalo de Troia ganhou as ferraduras; fila para os outros); no plano: os ritmos das armas (6c) e os efeitos visuais do que acontece no jogo (6f).

**12/11/2026 (21h30):** M1 tarefa 6c feita (as armas): o Teclado com teclas grandes e legíveis e, na forma evoluída (nível 4 e 5), soltando palavras como "kkkk", "lmao", "gg!"; o Laser de DVD em camadas, com a cor andando e marca onde bate (evoluído, duas fitas trançadas); o Firewall com resistência (D13: aguenta 6 tiros no nível 1, racha e quebra), e o Ping, o Pop-up e o Antivírus também com limite; cada arma num ritmo (lenta e forte, média, rápida e fraca). Próxima: 6d (animações do IAmiguinho).

**12/11/2026 (22h30):** M1 tarefa 6d, 1ª parte: o IAmiguinho com o corpo refeito, as mãos à parte (uma segura a arma, a outra balança), andar com 8 quadros, esperas quando parado, rodopio no dash e expressões no visor. O dono jogou o andar 2: o Rootkit agora vem no máximo 1 por onda na sala pequena (D16); no plano, subchefe e chefão mais difíceis (D17), a revisão de todos os ataques parecidos (D18), os melhores efeitos em todos os ataques e armas ANTES do conteúdo novo (D19) e quebrar mais coisas, inclusive móveis com o dash (C15).

**13/11/2026 (00h45):** o IAmiguinho continua o de sempre (o dono recusou o corpo e as mãos refeitos): só as mãos passaram para a posição neutra (uma segura a arma, a outra relaxada), com 8 esperas quando parado e rodopio no dash; regra: não refazer o desenho dele, só animar. Aprovada a cidade de noite em 3D estilizado no lugar do preto de fora, mais distante a cada andar (diretriz B18, tarefa 6k; ainda só estudo, fora do jogo). No plano: o Cabo USB-gancho na direção certa (6j).

**13/11/2026 (01h10):** a cidade em volta do prédio está NO JOGO (tarefa 6k): 3D estilizado visto de cima, a rua menor a cada andar (100% a 31%), carros andando, nuvens no alto; custo de 0,3 a 1,2 ms por quadro. Falta suavizar a faixa preta da sombra em volta das paredes de fora.

**13/11/2026 (01h35):** a cidade ficou mais calma de perto (não disputa com a sala), com 20 quarteirões variados, os carros na faixa e a sombra de fora das paredes transparente; o dono está testando 4 estilos (32 pontos, 16 pontos, misteriosa, misteriosa em 16 pontos) pela opção "Cidade" da pausa ou pela tecla F3.

**13/11/2026 (02h00):** o alerta de tiro vindo de fora da tela (seta vermelha piscando na beirada, D20); a cidade do andar 1 ficou mais calma (perspectiva menor, prédios altos longe do prédio do jogo, faixa escura em volta). Ideia nova anotada para o M4: itens consumíveis com melhorias temporárias, como o Suquinho de Pixels (mais velocidade por 1 minuto, na loja).

**13/11/2026 (04h10):** a cidade em volta do prédio está decidida: o estilo de 32 pontos com as cores normais (os de teste saíram). A beirada de fora das paredes ganhou friso e sombra curta, sem a faixa escura, e as sombras dos prédios da cidade são desenhadas na hora.

**13/11/2026 (11h00):** M1 tarefa 6e feita: cada golpe do andar 1 tem o SEU aviso no chão (o arco do pulo do Bug saltador, os pacotinhos do DDoS, a linha de pesca do Phishing, a mira de luneta do Spyware, a poça de ácido da Bateria, a janela de "instalando" da Atualização, a sombra com hélices do Drone, o buraco de glitch do Rootkit, as caixinhas do Captcha, a espiral de envelopes do Robô, as rachaduras do BAN, a sombra da letra do CAPS LOCK e o balão de chat do pulo do Troll), e a rajada do Bug cercador virou uma varredura em leque (D15 e D18, conferido sozinho).

**13/11/2026 (12h45):** diretrizes novas D21 (VFX de alto padrão em todos os ataques, com neon e o brilho seguindo a forma) e D22 (a varredura geral dos ataques de todos os inimigos e chefões é agora, sem cópias nem parecidos; o Passe de Batalha primeiro). Feito: a Atualização inteira refeita (janela, estouro próprio, poça da tela azul), o Vazamento mais rápido e perigoso (arremessa bolhas de memória; mancha própria), o ácido próprio da Bateria, o brilho do Laser evoluído seguindo as fitas. Ideia 47: um inimigo que pula.

**13/11/2026 (13h05):** o Passe de Batalha recriado inteiro (D22): moedas que rodam de pé pelo chão, passinhos de dança com pegadas numeradas, o tapete vermelho no aviso da skin, caixas descendo de paraquedas com o facho da raridade, fogos que desenham formas (estrela, coração, "GG") no chão, e nas fases a roleta de recompensas e a contagem regressiva de LED; 16 sons novos. Ajuste do dono na D21: nem todo efeito precisa ser neon e luz; cada ataque no material dele, sempre bem estilizado. Próximo da varredura: o Rage Quit.

**13/11/2026 (13h55):** o Rage Quit recriado (D22): o fio do controle no chão, o anel de teclas que saltam na batida da mesa, o balão de raiva com palavrões de quadrinho ao virar a mesa, o sinal de "reconectando" na volta, e nas fases o TILTOU (fliperama com bumpers) e o PUXOU O CABO (cabo de força varrendo a arena). Próximo: o Speedrunner.

**13/11/2026 (14h55):** o Speedrunner recriado (D22): a faixa de chegada xadrez na bandeira, a rota otimizada com os splits no skip, a caixa de colisão de depuração no sequence break, a malha de triângulos no clip, o quadro pulado no lugar da explosão, e nas fases o TAS (rota de botões do direcional) e o QUADRO A QUADRO (cópias congeladas em quadros de filme). Próximo: o Bugger.

**13/11/2026 (16h15):** o Magnata recriado (D22): o pavio da bomba, as etiquetas de preço da chuva de moedas, os estouros de dinheiro, e nas fases o SALDÃO RELÂMPAGO (carrinhos de compras nas faixas de "-50%") e a INFLAÇÃO (o gráfico da bolsa queimando no chão). Golpes de fase repetidos: 11; avisos comuns: 17.

**13/11/2026 (16h50):** o D.L.C. recriado (D22): a fumaça do soco foguete, a fita de embalagem da investida, as caixas de papelão se montando, o estouro de papelão e isopor, e nas fases a ASSINATURA MENSAL (o calendário cobrando dia por dia) e o PACOTE DE EXPANSÃO (peças de quebra-cabeça gigantes). Golpes de fase repetidos: 9; avisos comuns: 14.

**13/11/2026 (17h25):** o Patch do Dia 1 recriado (D22): a caixinha de dados dos pacotes, as listras de carregamento da barra, a poça de arquivo corrompido, os estouros de arquivos, e nas fases o HOTFIX (curativos gigantes grudando no chão) e o ROLLBACK (ele grava o seu caminho e o estoura de trás para a frente). Golpes de fase repetidos: 7; avisos comuns: 11.

**13/11/2026 (17h55):** o Downgrade recriado (D22): o reflexo de lente na investida, o bokeh sextavado nos clarões, o clarão de efeito especial, e nas fases o CORTE DE ORÇAMENTO (cubos provisórios surgindo do nada) e o TRAVADO EM 30 QUADROS (orbes que andam aos trancos). Golpes de fase repetidos: 5; avisos comuns: 9.

**13/11/2026 (16h55):** o Review Bomb recriado (D22): O Review Bomb recriado: o aviso da estrela de avaliação que enche, os estouros de comentários e dois golpes de fase só dele (o polegar para baixo gigante e a cobra de balões de resposta). Golpes de fase repetidos entre chefões: 3 (o limite baixou de 5 para 3); avisos comuns: 8 (de 9).

**13/11/2026 (17h25):** o Tutorial Infinito recriado (D22): O Tutorial Infinito recriado: o aviso da janela carregando, o destaque de tutorial com o cursor, o confete e dois golpes de fase só dele (pular corda com o dash e a prova surpresa de 4 cartões). Golpes de fase repetidos entre chefões: 2 (o limite baixou para 2); avisos comuns: 6 (o limite baixou para 6).

**13/11/2026 (17h50):** o Ceifador de Mídia recriado (D22): O Ceifador de Mídia recriado: o aviso do risco de disco, os cacos furta-cor e dois golpes de fase só dele (a névoa com a ilha da nuvem que passeia e o cemitério de lápides que brotam). Golpes de fase repetidos entre chefões: 1; avisos comuns: 5.

**13/11/2026 (18h15):** o Sempre Online recriado (D22): O Sempre Online recriado: dois golpes de fase só dele (o fantasma atrasado do IAmiguinho com a correção do servidor e as ampulhetas que estouram quando a areia acaba). Golpes de fase repetidos entre chefões: 0 (o limite agora é 0).

**13/11/2026 (18h45):** o Troll REMASTERED recriado (D22): O Troll REMASTERED recriado: os dois golpes de fase agora são só dele (o raio que quica nos espelhos e a casca de cebola com a corrida a 120 quadros) e o estouro HD no lugar da explosão comum. Com ele, NENHUM chefão usa mais os golpes de fase comuns.

**13/11/2026 (15h55):** o Bugger recriado (D22): cada falha com o seu aviso (ampulheta, fita torcida, ecos atrasados, textura faltando em espiral), as fatias do teletransporte, os hexadecimais do crash, os estouros de erro, e nas fases o STACK OVERFLOW (colunas de blocos de memória despencando) e o REINICIANDO (a tela apaga e os pixels mortos vêm do escuro). Próximo: o Magnata.

**12/11/2026 (03h20):** tarefa 1 do M1 feita; o 1º equilíbrio das armas (CD, mouse, Ping e secundárias); no plano, a agressividade dos bugs (tarefa 6) e os jeitos novos de inimigo, como corpo a corpo, voador, teletransporte e escudo (tarefa 6b).

**12/11/2026 (01h30):** o PLANO até a Steam (`docs/plano.md` no repositório do jogo; página "Lobby dos Bugs: plano até a Steam" no Claude): estamos no M1 (fatia vertical: o andar 1 no nível final); depois a página da Steam cedo, Alfa (5 andares), Beta, polimento, lançamento. O ChatGPT entra em paralelo fazendo conceitos de referência; o Claude redesenha em 32 pontos.
- 13/11/2026 (18h30): dificuldade justa nos andares de cima (teto de bugs vivos por sala; pico de 21 para 9 no andar 5),
  o tiro comum não empurra mais o chefão, o Ransomware (Cofre) mais fácil de rodear, as nuvens sem linhas e a cidade
  mais leve (só pinta onde aparece). Diretrizes novas: A7/A8 (prêmios no nível do IAmiguinho e muitos itens de suporte,
  para o M3), D23 (difícil mas justo), D24 (chefão não é empurrado), D25 (jogo sempre leve).
- 13/11/2026 (19h10): o MODO DESENVOLVEDOR (F1 ou Pausa → Modo desenvolvedor, só na versão de desenvolvimento):
  invencível, ir para qualquer andar ou para o chefão, qualquer arma/acessório com nível e raridade, bugs por sala, criar
  qualquer bug ou chefão, limpar a sala, velocidade do jogo e a linha de desempenho (diretriz E12).
- 13/11/2026 (22h00): a tarefa 6f do M1 está FEITA: as 8 armas fracas refeitas (cabo, ping, antivírus, CTRL+Z, café,
  estabilizador, pop-up, overclock), cada quebrável quebra no material dele e pegar item tem efeito próprio. Próxima: 6g
  (subchefe e chefão acima das salas, D17).
- 13/11/2026 (22h40): a tarefa 6g do M1 está FEITA (D17): o Robô de Spam e o Troll do Chat ficaram mais fortes, com
  golpes que vêm juntos, e todos os chefões ficaram mais rápidos e com menos descanso. O piloto agora perde na maioria das
  lutas (antes, o subchefe caía em segundos). Próxima: 6h (quebrar mais coisas, C15).
- 13/11/2026 (23h10): a tarefa 6h do M1 está FEITA (C15): caixas, pilhas, paletes, carretéis, lixeiras, plantas,
  cadeiras, mesinhas e mesas com PC quebram (no corredor com tiro ou dash; na sala só com o dash, abrindo o caminho);
  algumas salas têm quebráveis que soltam prêmios. Próxima: 6j (o cabo gancho na direção certa).
- 13/11/2026 (23h30): a tarefa 6j do M1 está FEITA: o Cabo USB-gancho vai para onde o IAmiguinho anda quando não está
  atirando, e para a mira quando está atirando ou mirando.
- 13/11/2026 (23h55): a 2ª parte da tarefa 6d (o IAmiguinho, com o desenho de sempre): comemorações de item, arma rara e
  subir de nível; os olhos do visor que mudam na hora certa; o susto antes de cair na fenda; a chegada no andar.
- 14/11/2026 (01h30): os pedidos do dono das 23h34: a caixa e o cactus que voltavam depois de quebrados e os tiros do
  pendrive saindo do mapa corrigidos; o jogo leve com 200 bugs (sem a espiral de lentidão, efeitos que se ajustam,
  cristais que se juntam); o Vazamento de memória mais perigoso (os fragmentos que rastejam); o café com cara de café;
  todas as armas com diferença no nível alto (e som novo no Estabilizador em curto e no Roteador com lag); o Antivírus
  no nível alto sem tapar a visão.
- 14/11/2026 (02h30): os tiros empurram menos os bugs comuns; os quebráveis sem a corrente e com mais tiros para
  quebrar (os móveis das salas também quebram com tiro, rachando); os upgrades mais escassos (uns 3 níveis no andar 1, e
  os projéteis a mais sobem devagar); a sala só se revela quando o IAmiguinho passa da porta.
- 14/11/2026 (02h50): anotados no plano, para depois: o começo do andar 1 mais leve (M1 6n); as batalhas de chefão como
  um show à parte, com introdução, mais golpes e vida, capangas exclusivos só em alguns, arena e música próprias (M1 6o
  e M3); a cena de abertura com a lore, antes do menu (M4); cada andar começando numa sala com elevador e a loja longe
  do começo do andar (M3).
