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
