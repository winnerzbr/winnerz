# IAmiguinho: Jogos de Verão

Minigames de praia inspirados em California Games. Roda no navegador e é publicado como página (artefato) no Claude.

## Decisões em vigor
- **Plataforma:** continua no navegador.
  - O Godot foi testado: o vôlei foi refeito nele e está em `/demo/volei-godot`, com o código em `jogos/volei-godot`.
  - O Unity foi avaliado e descartado.
- **Estilo:** desenho animado pintado no jogo inteiro, incluindo menus e HUD.
  - Os personagens seguem a ficha de modelo, com a grade-guia de proporções.
  - O 16 bits fica só como backup e nas provas que ainda vão ter as regras revistas.
- **Ordem de migração:**
  1. vôlei (feito);
  2. skate (feito);
  3. as outras provas, depois de revisar as regras de cada uma;
  4. as provas novas, depois que o dono aprovar as regras.
- **Animações:** desenhos inteiros quadro a quadro, de 12 a 24 quadros por movimento, em pranchas 4×2 com fundo verde.
  - O quadro mostrado segue a física do jogo.
  - Cada golpe tem o seu quadro de contato.
- **Cenários:** cada prova tem um lugar próprio na Costa WinnerZ, sem repetir cenário.
  - Todo cenário existe em 4 horários (manhã, dia, entardecer e noite), e o jogo usa o relógio de quem joga.
  - Ver o doc "Jogos de Verão: plano visual".
- **Itens conquistáveis:** só visuais (cenários, bolas, skates…), ganhos usando o site. Nunca mudam pontos nem física.

## Provas
O plano tem 19 provas, e o jogo publicado tem 18 delas. Os lugares, as paletas e as regras propostas de cada prova estão no doc do plano visual.
- **No jogo:** Surfe, Half-pipe, Embaixadinha, Patins, Basquete, Pingue-pongue, BMX, Corrida na areia, Frisbee, Tiro com arco, Duelo de água, Canoagem, Futebol de areia, Bocha na areia, Natação, Jet ski, Corrida de bugue e Vôlei.
- **Retiradas em 30/10/2026:** Salto de hélice, Corrida do isopor e Minigolfe. O código delas fica no backup em 16 bits (`verao/index.html`). O `build3.py` só as tira da lista. O Minigolfe vai para o Arcade do IAmiguinho.
- **Reprovadas pelo dono em 30/10/2026 (as ideias e a jogabilidade):** Salto do penhasco e Frescobol. Saíram do jogo e não voltam. O Salto do píer também saiu de vez.
- **Novas:** feitas uma por vez, jogáveis com arte provisória. Os pedidos das pranchas e dos cenários ficam na página "Pedidos das provas novas" (`novas/pedidos.py`), e a arte entra conforme o dono manda.
  - Feitas:
    - Pingue-pongue (`cart2/ev_pingue.js`): aprovado como protótipo, agora é lapidar;
    - Bocha na areia (`cart2/ev_bocha.js`): aprovada como protótipo ("muito legal e desafiante"), agora é lapidar;
    - Corrida de bugue (`cart2/ev_bugue.js`): em ajustes com o dono; a Copa das Dunas (3 pistas) foi feita em 31/10 e espera o teste dele.
  - Todas as provas novas do plano foram feitas.
  - Removido também: Paraquedismo em formação ("não ficou legal a execução da ideia").
  - Removido: Voo do teco-teco. O dono testou 3 versões (de lado com física, 3D e 2D com voo livre) e achou que não ficou divertido.
  - Cada prova nova fica num arquivo `cart2/ev_<prova>.js`, com `paint: true` para ser desenhada em alta resolução.

  | Prova | Lugar | Pontos principais |
  |---|---|---|
  | Pingue-pongue no quiosque | Quiosque do Coqueiral | 1 contra 1, partida até 11, cortada e bola com efeito; pode ser jogado em duas pessoas |
  | Bocha na areia | Vila dos Pescadores | vista de cima, mira e força, rolar ou bater, até 7 pontos |
  | Corrida de bugue | Dunas Brancas | vista de cima, corrida de kart: derrapagem com turbo, largada com turbo e itens de praia (bola, balão d'água teleguiado, protetor solar, água de coco, guarda-sol, onda); 3 voltas e a Copa das Dunas com 3 pistas |

### Pingue-pongue (como funciona, 2ª versão)
O dono reprovou a 1ª versão (andar sozinho até a bola e acertar o tempo exato). Pediu andar livre, física de bola de pingue-pongue de verdade e mais jogadas.
- **Andar livre:** ◀ ▶ andam do fundo até a rede. Quem saca fica atrás da mesa.
- **Bater:**
  - aperta o golpe antes da bola chegar: a raquete fica preparada (até 1,15 s) e a batida sai sozinha quando a bola passa pelo ponto bom (na frente do corpo, na altura do peito);
  - apertar com a raquete preparada troca o golpe;
  - o aperto feito durante o fim da batida anterior vale para a próxima.
- **Qualidade da batida:** depende do lugar onde a bola passa (perto do ponto bom), do tempo de preparo (mais de 0,2 s é cheio; até 0,55 s a bola sai mais forte), da força da bola que chegou e de estar correndo na hora.
  - Preparado, anda mais devagar.
  - Batida perfeita mostra "Perfeita!".
- **Golpes:**
  - ✕/Espaço: rebater (topspin);
  - ○/X: cortada (forte; com a bola baixa erra muito);
  - □/C: efeito (cortada por baixo, bola baixa e lenta);
  - △/V: toque curto (cai perto da rede; de longe da mesa sai ruim).
  - ▲ segurado manda funda; lá de trás da mesa, ▲ + rebater vira balão. ▼ segurado manda curta.
- **Física:**
  - gravidade, resistência do ar e efeito: topspin mergulha e acelera no quique; efeito por baixo flutua e freia (o toque curto quica duas vezes na mesa);
  - devolver bola com efeito usando rebatida tende a mandar na rede; devolver topspin com efeito tende a subir;
  - bola na fita às vezes passa;
  - o tempo da bola corre a 85% para dar tempo de reagir;
  - a mira calcula o ângulo pela física (evita quinas e passa a rede com folga), e o erro vem da qualidade;
  - rastro da bola: laranja com topspin, azul com efeito por baixo.
- **Regras:**
  - saque: aperta o golpe para jogar a bola para cima, e a batida sai sozinha; ▲ ▼ mudam a profundidade;
  - o saque quica primeiro do seu lado; se tocar na rede e cair certo, repete;
  - até 11, com 2 de vantagem; o saque troca a cada 2 pontos (a cada ponto no 10 a 10).
- **Amiguinho** (mesmo cérebro dos testes):
  - prevê a bola pela física, escolhe onde bater e vai até lá;
  - erra por tempo de reação, posição e preparo, conforme o acerto: 0,74 de base, entre 0,55 e 0,9 conforme o placar;
  - escolhe cortada na bola alta, toque curto com o jogador longe, efeito contra bola baixa com efeito por baixo, balão quando está muito atrás, e funda ou curta conforme a posição do jogador.
- **2 jogadores:**
  - Jogador 1: setas ou A D W S, com Espaço, X/E, C/Q, V/R, ou o 1º controle.
  - Jogador 2: J L I K, com Enter, O, U, P, ou o 2º controle.
- **Pontos e medalhas:** iguais (vitória 1.500 + 100 por ponto de diferença; bronze 8 pontos, prata vencer, ouro vencer por 5).
- **Testes:**
  - `testes/pingue.cjs`: jogadores automáticos contra o Amiguinho; troca média de 6 a 11 batidas;
  - `testes/ppkeys.cjs`: teclado, saque e 2 jogadores;
  - `testes/todas.cjs`.
- **Arte provisória:** desenhos do vôlei (espera, corrida, recuo, golpe no chão e andando agachado com o golpe pronto) e raquete desenhada pelo jogo. A página de pedidos ganhou "Andando com a raquete preparada" e "Balão (defesa lá atrás)" para os dois personagens (28 pedidos).

### Bocha na areia (como funciona)
- **Cena:** vista de cima, na Vila dos Pescadores. A cancha tem tábuas baixas em volta. IAmiguinho joga com as bolas azuis e o Amiguinho com as rosa, 4 para cada lado; o bolim é laranja.
- **Ordem:**
  - quem começa a rodada joga o bolim, que tem que parar da metade da cancha para a frente; se não parar, a vez passa ao outro lado e, na 2ª falha, ele vai para o meio;
  - depois, quem jogou o bolim joga a primeira bola;
  - em seguida joga sempre quem está mais longe dele;
  - quem ganha a rodada joga o próximo bolim.
- **Controles:**
  - ▲ ▼ miram;
  - segurar ✕/Espaço rola, e segurar ○/X joga pelo alto;
  - a força sobe e desce enquanto segura, e soltar lança;
  - mira e barra de força aparecem só na vez de quem joga.
- **Física:**
  - a areia tem atrito forte;
  - montinhos e buracos desviam a bola, e a areia fofa freia muito;
  - conchas são obstáculos e pegadas entortam um pouco a bola;
  - reforçado em 31/10, a pedido do dono:
    - montinhos e buracos desviam cerca de 3 vezes mais: uma bola que passa na beira desvia uns 17 px, contra 6 antes;
    - a bola rola morro abaixo e pode parar no fundo do buraco;
    - a areia fofa freia 4 vezes mais que a areia batida;
    - as pegadas entortam o dobro;
    - são 2 montinhos e 2 buracos por partida, maiores;
    - no desenho, o buraco tem o fundo escuro e a borda clara, e o montinho tem o brilho em cima;
  - parada: bola devagar para quando a rampa é mais fraca que o atrito do lugar ou quando está encostada numa bola parada; batida devagar não quica;
  - as bolas batem umas nas outras, e o bolim é mais leve;
  - a bola pelo alto voa, cai e quase para; se cair em cima de outra, tira ela do lugar;
  - nas tábuas a bola bate e volta fraquinha;
  - só sai do jogo a bola que cai fora pelo alto;
  - se o bolim sair, a rodada é anulada.
  - O terreno é sorteado a cada partida.
- **Pontos:**
  - no fim da rodada, cada bola mais perto do bolim que a melhor do outro lado vale 1 ponto;
  - linhas tracejadas mostram a medida;
  - quem faz 7 vence.
  - Avisos: "Encostou!" (bola colada no bolim) e "Tirou!" (a melhor bola do outro lado ficou bem mais longe).
- **Amiguinho:** testa centenas de jogadas com a mesma física (divididas em vários quadros), escolhe a melhor (ficar mais perto, tirar a bola do outro, evitar tirar o bolim) e erra força e mira conforme o acerto (0,72 de base, entre 0,5 e 0,9 conforme o placar).
- **2 jogadores:** um de cada vez, nos mesmos botões.
- **Medalhas:**
  - bronze 400 (fazer 4 pontos), prata 1.500 (vencer), ouro 1.900 (vencer por 4);
  - vitória vale 1.500 + 100 por ponto de diferença.
- **Testes:**
  - `testes/bocha.cjs`: o jogador automático muito bom venceu 3 de 3, o médio 2 de 3 e o fraco 0 de 3;
  - `testes/bckeys.cjs`: teclado.
- **Arte provisória:**
  - os personagens são os do vôlei, pequenos na linha de lançamento (manchete para lançar, festa e tristeza);
  - bolas, cancha e vila são desenhadas pelo jogo;
  - os pedidos estão na página de pedidos: bolas, peças, 4 pranchas de cada personagem e a vila vista de cima em 4 horários (o pedido da noite só muda a luz).

### Corrida de bugue (como funciona)
- **Cena:** Dunas Brancas, vista de cima, câmera seguindo o bugue com o norte para cima (82% de zoom, para ver mais à frente). 3 voltas contra 5 Amiguinhos.
- **Pista (2ª versão, 31/10):**
  - largura de 178 px desde 31/10 (era 124; o dono pediu +20% duas vezes: 148 e depois 178); as caixas, a areia fofa dos grampos, a rampa do salto e as faixas dos Amiguinhos acompanham a largura; desde 31/10 as pistas também têm o dobro do tamanho (ver "As 3 pistas da Copa");
  - muretas de zebra vermelha e branca em toda a volta: bater de lado perde pouco (6%) e de frente perde muito (até 61%); o bugue escorrega junto da mureta e alinha com ela;
  - não há mais saída para a areia fofa.
- **Física dos bugues (3ª versão, 31/10):**
  - motor que perde força perto da velocidade máxima (230 px/s desde 31/10, 15% a mais a pedido do dono; com turbo, +92; motor, freio e aderência subiram junto), freio, ré curta e arrasto;
  - pneus com limite de aderência: o bugue escorrega de lado quando passa do limite e deixa marcas na areia;
  - giro com inércia: o volante vira menos em alta e, entrando rápido demais, o bugue sai de frente;
  - parado de cara na mureta, acelerando ou freando, ele ainda vira;
  - derrapagem: começa com um pulinho, os pneus de trás seguram menos e a carga só conta com o bugue escorregando de lado;
  - pulo com gravidade: pousar alinhado dá turbo; pousar torto perde 28% do embalo; o bugue amassa no pouso;
  - batida na mureta (31/10, o dono achou que travava): o bugue quica para longe dela, perde de 13% (raspão) a 50% (de frente) da velocidade, nunca fica abaixo de 60 px/s e sai alinhado com a pista sem precisar virar; por 0,3 s não quica de novo;
  - dentro de um atalho, o quique leva o bugue no sentido do corredor (antes usava o sentido da pista e mandava o bugue de volta para a entrada);
  - os Amiguinhos que vão pegar o atalho miram primeiro a boca do corredor e só depois a saída (direto na saída, raspavam na quina da mureta);
  - batidas entre bugues trocam impulso e torcem o bugue;
  - a carroceria balança para fora nas curvas;
  - na água, os pneus seguram menos e a água freia (o turbo atravessa);
  - item acertado faz o bugue rodopiar com pouca aderência.
  - depois do rodopio, o bugue nunca fica virado para trás: se alinha com a pista e anda sozinho para a frente por 0,85 s; fica invencível por uns 2,3 s, piscando (nada pega nele, nem caixa de item);
  - de cara na mureta, parado ou virado para trás: acelerar gira o bugue para dentro da pista (virar escolhe o lado), sem precisar de ré; devagar, a batida quase não torce o bugue.
- **Esteiras de turbo:** 8 por pista (setas amarelas andando); passar por cima dá 0,8 s de turbo.
- **Vácuo (31/10, pedido do dono):** logo atrás de outro bugue (até 140 px, andando na mesma direção, acima de 110 px/s) o bugue pega o vácuo: até +14% de velocidade máxima, motor 30% mais forte e menos perda de embalo; linhas de vento passam em volta dele. Segurando 1,5 s no vácuo, sai com um turbo curto ("Vácuo!"). **Embalo (31/10, o dono não conseguia ultrapassar):** a velocidade ganha no vácuo continua depois de sair de trás do adversário e vai caindo em uns 3 s (até +20% de velocidade máxima); as linhas de vento continuam enquanto dura o embalo. Teste: saindo do vácuo a 262 px/s, 1 s depois ainda está a 267 e 2 s depois a 261 (o normal é 230); colado atrás de quem anda no máximo e trocando de faixa, passa em 2,7 s. Vale para todos, Amiguinhos também. O resumo da corrida conta quantos vácuos.
- **Controles:**
  - ◀ ▶ viram. Volante mais suave desde 31/10 (o dono achou que curvas leves viravam demais): segurando, o volante vai virando aos poucos (0,3 s até o fim) e volta rápido ao soltar; a resposta é suave no começo (bom para o analógico); em alta as rodas viram bem menos (ângulo máximo 0,56 parado e 0,22 a 230 px/s). Um toque de 0,15 s a 230 px/s desvia 14 px (antes, 97 px); segurando, faz uma curva de raio ~130;
  - ✕/Espaço acelera e ○/X freia (no celular acelera sozinho, e os botões são Freio, Derrapa e Item);
  - R1, L1 ou □ (C no teclado) segurado na curva derrapa, com um pulinho no começo: com 0,85 s vem a faísca azul (turbo curto) e com 1,7 s a laranja (turbo longo); o turbo sai ao soltar;
  - **R2 usa o item**, como o dono pediu (é o botão 7 do padrão: RT no Xbox, ZR no Switch; V no teclado). O △ não usa mais o item.
  - **Item para trás (31/10):** ↓ (ou o analógico para baixo) + o botão do item joga para trás; no celular, o botão "Atrás". ↑ + item joga o protetor longe para a frente.
- **Pista:**
  - **Largada:** contagem 3, 2, 1, Vai!; acelerar de 0,5 s antes do Vai em diante dá turbo, e cedo demais afoga.
  - **Pulos:** 3 ou 4 rampas por pista; pousar alinhado dá turbo curto.
  - **Atalhos:** corredores retos com muretas cortando por dentro de curvas, com água ou areia fofa no meio; só compensam com turbo.
  - **Caixas de item:** 6 fileiras de 5 caixas por pista; cada caixa some sozinha e volta em 2,5 s.
  - **Itens:** cada bugue guarda até 2; o item usado é o primeiro, e o HUD mostra os dois.
- **Itens** (quem está atrás ganha itens melhores; a onda só sai para o 5º e o 6º):
  - bola de praia: quica reto e volta nas bordas; para trás, sai rolando contra quem vem atrás;
  - balão d'água: persegue quem está logo à frente, a 330 px/s (era 250; o dono achou lento) e virando mais rápido (para trás, quem vem logo atrás). Se passar por um bugue invencível (depois de rodar), não acerta, nem depois, e vai atrás de quem estiver na frente desse bugue; o mesmo vale para a bola;
  - protetor solar: deixa uma poça atrás (ou longe na frente, com ↑);
  - água de coco: turbo;
  - guarda-sol: escudo que bloqueia um ataque;
  - onda: deixa os três primeiros lentos por 2,2 s.
  - Quem é acertado rodopia e perde velocidade, mas continua a corrida.
- **Amiguinhos:** seguem a pista cada um na sua faixa, tiram o pé antes das curvas (calculam a velocidade pelo raio da curva e pela aderência), derrapam nas curvas fortes e usam os itens com critério. Os da frente aliviam um pouco quando abrem muita vantagem, e os de trás apertam.
- **Pontos:**
  - por posição: 1º 3.000, 2º 2.200, 3º 1.600, 4º 1.100, 5º 700, 6º 400;
  - medalhas: bronze em 3º, prata em 2º, ouro em 1º.
- **Testes:**
  - `testes/bugue.cjs`: corridas com o jogador no piloto automático e fotos (corridas de 79 a 86 s);
  - numa corrida inteira dos 6 bugues no piloto automático, houve só 4 batidas fortes na mureta: dá para fazer as curvas rápido sem bater;
  - `testes/bgkeys.cjs`: largada com turbo, derrapagem e item pelo teclado (com 2 itens guardados);
  - `testes/bgrec.cjs`: depois de ser acertado, o bugue volta de frente e invencível; de cara na mureta, sai só acelerando e virando (30 de 30 nos dois casos, nas 3 pistas);
  - `testes/copa.cjs`: as 3 pistas no piloto automático (tempos, presos, batidas fortes, atalho, areia fofa) e uma Copa inteira. Último resultado (pistas em dobro): nenhum bugue preso; de 2 a 7 batidas fortes por corrida (quase todas na entrada dos atalhos);
  - `testes/bgvolante.cjs`: quanto o bugue desvia com toques curtos em alta;
  - `testes/bgmureta.cjs`: 67 batidas em ângulos de 15° a 85° nas 3 pistas; em todas o bugue segue andando (a única exceção quica para dentro de um atalho);
  - `testes/bgitens.cjs`: balão passa por quem está invencível e vai atrás do da frente; bola e balão para trás acertam quem vem atrás; protetor para a frente;
  - `testes/vacuo.cjs`: sozinho, o bugue chega a 229 px/s; colado atrás de outro, passa de 260 e, com 1,5 s, sai com o turbo do vácuo (até 335);
  - `testes/copafotos.cjs`: fotos do menu, das pistas novas, do salto e da classificação;
  - `testes/bgpresos.cjs`: 12 corridas, nenhum bugue preso. Os Amiguinhos dão ré quando ficam parados de cara na mureta e seguem o corredor da lagoa até a saída.
- **Arte provisória:** tudo desenhado pelo jogo. Os pedidos estão na página de pedidos: bugues de cima, derrapagem e rodopio, itens, peças da pista, peças das pistas da Copa (farol, beira-mar, areia fofa e ladeiras) e as dunas de cima em 3 horários.
- **Modos (no menu da prova):**
  - **Corrida:** uma corrida avulsa na pista escolhida no botão "Pista" (Lagoa Azul, Duna do Farol ou Desce-Duna; cada toque troca a pista e o IAmiguinho fala dela);
  - **Copa das Dunas:** as 3 pistas seguidas. Cada chegada vale 10, 8, 6, 4, 2 e 1 pontos (quem não chegou conta pela posição na pista). Entre as corridas aparece a classificação, e ✕/Espaço (ou um toque) leva à próxima pista. A nota e a medalha saem da posição final na Copa, e "Jogar de novo" começa outra Copa. No HUD, a última casa mostra a corrida e os pontos.
  - No modo das provas da semana, o bugue é uma corrida avulsa.
- **As 3 pistas da Copa (2ª versão, 31/10: o dobro do tamanho, a pedido do dono):** todas com muretas, 3 voltas, 3 ou 4 rampas, 6 fileiras de caixas e 8 esteiras de turbo. Desenhadas com a ferramenta que confere o raio das curvas e a distância entre trechos (`/tmp/pistas` na sessão; os pontos ficam no `ev_bugue.js`).
  - **Lagoa Azul** (~11.600 px por volta, era 5.700): reta de largada, chicane, curvão da direita, laço de cima, o S do meio e a volta pela esquerda. Dois atalhos pela água (por dentro do U do meio e por dentro do laço de cima). Corridas de uns 145 s.
  - **Duna do Farol** (~13.800 px, era 6.700): cinco grampos (três colunas em zigue-zague e o S da esquerda), o farol entre as colunas e o mar ao norte, logo acima da pista de cima. Areia fofa por dentro dos 5 grampos; um atalho de areia fofa cortando o grampo de baixo entre as colunas. Corridas de uns 175 s.
  - **Desce-Duna** (~15.400 px, era 7.500): retas longas com 4 descidas que embalam e 3 subidas que seguram; atalho de areia fofa no grampo da esquerda e o salto por cima da duna (rampa na entrada) cortando o laço do meio. Corridas de 3 a 3,5 min.
  - Com as pistas em dobro, uma Copa inteira leva uns 9 minutos.
- **Areia fofa:** freia forte e faz levantar poeira; o turbo atravessa sem frear.
- **Amiguinhos nas pistas novas:** olham à frente pela distância (não pela contagem de pontos), calculam a frenagem antes das curvas, corrigem a volta para a sua faixa quando cortam a curva, abrem por fora dos grampos com areia fofa e, com turbo ou água de coco na mão, às vezes entram no atalho.
- **Nomes e cores dos Amiguinhos:** Amarelo, Rosa, Azul, Verde e Laranja. O bugue do jogador é azul-escuro. Antes, um dos Amiguinhos aparecia como "Você", da mesma cor do jogador.

## Páginas publicadas (Claude)
| Página | Endereço | Para quê |
|---|---|---|
| Jogos de Verão | https://claude.ai/artifact/2dFTqQJ77p3TJovNPM7v9v | o jogo em desenvolvimento (16 provas; vôlei e skate pintados; pingue-pongue com arte provisória) |
| Jogos de Verão 16 bits | https://claude.ai/artifact/KATSnXhZbmXS4ptNGZKRcx | backup congelado em 16 bits |
| Prévia das pranchas | https://claude.ai/artifact/4JU4Gtd5ri3iU786ezarkP | toda prancha nova toca em loop com o veredito antes de entrar no jogo |
| Moveset do Vôlei | https://claude.ai/artifact/1dXVWLrYSy4Z9z9pCrnZAf | pedidos das pranchas do vôlei (IAmiguinho e Amiguinho) |
| Pedidos das provas novas | https://claude.ai/artifact/Y5hetAQfCRf1dykVoA3c6w | pedidos das pranchas e dos cenários das provas novas |
| Moveset do Skate | https://claude.ai/artifact/HBWsEJqsp6rZaBEmHStwS3 | pedidos das pranchas do skate, das manobras combinadas e do cenário |
| Plano visual (doc) | https://claude.ai/artifact/N2TAefrFeShKPgXHgzkEgw | Costa WinnerZ, cenários, horários, itens, regras das provas novas e ordem de produção |

## Como uma prancha vira jogo
1. O dono gera a prancha no ChatGPT, com estes anexos:
   - o pedido em inglês da página de moveset;
   - a ficha de modelo e a grade-guia;
   - a referência de pose em cinza;
   - as pranchas aprovadas que o cartão pedir.
2. O Claude recorta os 8 quadros e passa a régua de proporção, que compara a cabeça e o corpo com a ficha.
   - A escala é igualada pela cabeça.
   - Cada quadro recebe um ajuste próprio de até ±12%.
3. Entre várias tentativas, fica a de cabeça mais constante e pose certa. O motivo vai para a Prévia.
4. A prancha entra no jogo e na Prévia, os dois são publicados, e o histórico registra.

## Vôlei
- **IAmiguinho:** 38 pranchas, completo.
  - Inclui a espera olhando para a bola: a cabeça sobe e desce conforme a altura da bola.
  - Inclui o saque só jogando a bola para cima.
- **Amiguinho:** completo na versão da ficha de modelo (41 pranchas), com os mesmos movimentos do IAmiguinho: olha para a bola e anda armando a cortada no chão.
  - Régua do Amiguinho: tamanho pela massa (raiz da área da silhueta), igual ao Amiguinho de antes; em cada quadro a massa é igualada (até ±10%), porque a geleia amassa e estica mas não muda de quantidade.
  - Encaixe do Amiguinho: parado no chão, os pés ficam presos; andando ou no ar, segue o centro do corpo. É o mesmo em todas as animações.
  - Quadros intermediários (`cart2/mids.py`): entre desenhos parecidos, um quadro do meio por fluxo óptico. O jogo mostra o do meio na primeira metade de cada troca. Vale no IAmiguinho e no Amiguinho; no skate, ainda não.
  - Olhar para a bola: entre a espera e a espera olhando para cima ou para baixo há dois desenhos do meio (1/3 e 2/3), feitos entortando um desenho só. A cabeça passa por eles aos poucos. Andar e parar trocam com folga de velocidade, para não ficar alternando.
  - Locomoção (parado, correndo, arrancando, freando, recuando): sai da velocidade suavizada e cada desenho fica pelo menos 0,16 s, para não trocar a cada quadro.
  - Amiguinho: sair do parado sempre passa pelo arrancar (quadros 2 a 4) e parar sempre passa pelo frear (quadros 5 e 6). O 1º e os 2 últimos quadros dessa prancha não entram, porque ficam em pé com as mãos para os lados e não emendam com a espera.
- **Adversários (cérebro novo, `cart2/aivolei.js`):**
  - Antes de cada toque, ele simula posições e escolhe a melhor: mandar longe de você ou levantar para cortar.
  - Calcula o pulo da cortada e, nos níveis altos, saca com cortada.
  - O peixinho vai para o lado em que a bola vai cair.
  - Assertividade de 40% (mais fácil) a 90% (mais difícil); no mais difícil, varia de 80% a 95% conforme o placar.
  - Torneio: fácil, médio, difícil e final.
  - A dificuldade se adapta ao placar: se você está na frente, ele se concentra; se ele está na frente, relaxa um pouco. Nos adversários fortes vale sempre.
  - As simulações estão em `jogos/jogos-de-verao/testes`.
- **Pontos:** partida normal até 7; a final do torneio e da Copa vai até 10.
- **Cortada:** a carregada até o fim sai mais rápida.
- **Bola e placar (31/10, pedidos do dono):** a bola passa na frente do placar (antes, o placar era desenhado por cima dela). No saque do Amiguinho, a bola na mão era desenhada 17% maior (tamanho da bola do desenho antigo de 16 bits) e parecia encolher ao ser jogada para cima; no estilo pintado ela fica sempre do mesmo tamanho. As duas mudanças estão no `cart2/build3.py`.
- **Pendente:**
  - placar, menus e HUD pintados;
  - o dono testar os botões no celular.

## Skate (Half-pipe)
- **Pranchas:** o IAmiguinho está todo pintado.
  - No chão: parado, impulso, freio, desequilíbrio e pouso.
  - No ar: saída da rampa, voo, flips (o corpo e o skate girando em separado), 3 pegadas e as 4 manobras dos botões.
  - Giro em 14 vistas.
  - Borda: manual, parada de mão, grind e stall.
  - Tombo.
- **Segurar a manobra:** segurar o botão ou a direção mantém a manobra, e ela só termina quando o jogador solta.
  - Vale para os botões e para as pegadas. Os flips terminam sozinhos.
  - Pousar segurando derruba.
- **Manobras combinadas:** segurar a manobra e girar meia volta ou mais cria uma manobra nova. Ela vale a manobra × 1,5, mais o giro, × 1,3.
  - As 6 têm prancha própria, com 8 vistas.

  | Comando | Manobra |
  |---|---|
  | ✕ + giro | Superman Giratório |
  | ○ + giro | Cristo Giratório |
  | □ + giro | Foguete Espiral |
  | △ + giro | Helicóptero |
  | ↑ + giro | Indy Giratória |
  | ↓ + giro | Rabeta Giratória |

  A Pegada Melão (↖) ficou de fora, porque o comando dela se confunde com o giro.
- **Cenário:** Skatepark do Viaduto (bairro Cidade da Costa WinnerZ), nos 4 horários.
  - Camadas: cidade ao fundo, viaduto grafitado e a rampa.
  - À noite, as luzes ficam numa camada própria que pulsa.
  - A rampa, o chão e os personagens pegam a cor da luz do horário.
  - Rampa: madeira azul, pista de compensado, deck, corrimão e borda de metal. O chão é de concreto.
- **Pouso:** cai com giro mais de 35° fora ou faltando mais de 20% da manobra; desequilibra acima de 10° ou faltando mais de 4%.
- **Bônus por segurar:** +60% da manobra por segundo segurado, até dobrar. O nome mostra o tempo.
- **Pendente:** o dono testar melhor os pontos das manobras combinadas.

## Onde estão os arquivos
- As fontes estão em `jogos/jogos-de-verao/`: o jogo base, os programas, os quadros das pranchas aprovadas, a ficha, o cenário e as páginas de pedidos. O `README.md` dessa pasta explica como montar o jogo e como incluir uma prancha nova.
- Os montados grandes (`mv5.js`, `mvsk.js`…) não ficam no repositório. Eles saem de novo dos quadros.
- **Toda prancha aprovada nova** precisa ir para essa pasta, com o recorte em `cart2/mv2/` e a prancha original quando for do skate, no mesmo commit em que entra no jogo.
