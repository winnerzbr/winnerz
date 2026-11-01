# IAmiguinho: Jogos de Verão

Minigames de praia inspirados em California Games. Roda no navegador. Está no site do WinnerZ (www.winnerz.com.br/jogos-de-verao; o editor em /studio/jogos-de-verao) e continua publicado como página (artefato) no Claude.

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
  | Corrida de bugue | Dunas Brancas | vista de cima, corrida de kart: derrapagem com turbo, largada com turbo e itens de praia (bola, balão d'água teleguiado, protetor solar, água de coco, guarda-sol); 3 voltas e a Copa das Dunas com 3 pistas |

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
- **Arte provisória:** desenhos do vôlei (espera, corrida, recuo, golpe no chão e andando agachado com o golpe pronto). A página de pedidos ganhou "Andando com a raquete preparada" e "Balão (defesa lá atrás)" para os dois personagens (28 pedidos).
- **Raquete e bolinha pintadas (31/10):** folha do dono (frente vermelha, de lado, 3/4, inclinada, verso preto e a bolinha), montada em `cart2/mvpp.py` -> `mvpp.js` (window.PPA) e desenhada por `cart2/ppp.js`. IAmiguinho com a borracha vermelha e o Amiguinho com a preta; esperando: 3/4 (o Amiguinho, o verso); preparada: de frente; no meio da batida: de lado; 14 unidades de comprimento, girando em volta do meio da cabeça (a mesma posição e giro de antes); a bolinha pintada no lugar da desenhada (o placar continua por cima quando ela passa no alto). A folha virou anexo das pranchas na página de pedidos. Teste: `testes/pprakete.cjs`.

### Bocha na areia (como funciona)
- **Cena:** vista de cima, na Vila dos Pescadores (pintada, ver "Vila pintada"). A cancha tem tábuas baixas em volta. IAmiguinho joga com as bolas azuis e o Amiguinho com as rosa, 4 para cada lado; o bolim é laranja.
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
    - buracos só na primeira metade da cancha (31/10, a pedido do dono): espalhados, eles puxavam a partida (ocupavam ~6% da cancha, mas o bolim parava dentro em ~1 de cada 4 rodadas e ~1 de cada 4 bolas terminava num buraco). Agora ficam no caminho (centro entre 62 px depois da linha e 40% da cancha, raio 20 a 28): desviam a bola que passa e seguram a fraca; os montinhos continuam em qualquer lugar. Medido em 24 partidas automáticas: bolim no buraco 0%, bolas no buraco 4%;
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
  - `testes/bckeys.cjs`: teclado;
  - `testes/bcpintado.cjs`: fotos do IAmiguinho pintado (mirando, soltando, pelo alto, torcendo, esperando);
  - `testes/bcmao.cjs`: fotos ampliadas da bola na mão (quadros 1 a 4 de rolando e pelo alto, bolim) e saindo da mão;
  - `testes/bcamiguinho.cjs`: o mesmo para o Amiguinho (espera, mira, soltura, torcida, vitória);
  - `testes/bcvila.cjs`: fotos da vila nos 4 horários e na troca, com a cancha do jogo encaixada;
  - `testes/bcburacos.cjs`: quanto os buracos puxam a partida (bolim e bolas dentro de buraco no fim das rodadas; aceita variações de teste: menor, fofo, rasa, compacto).
- **Arte pintada (31/10):**
  - o dono mandou 4 pranchas do IAmiguinho (esperando a vez, lançar rolando, lançar pelo alto, medindo/torcendo), a folha das bolas (4 azuis, 4 rosa e o bolim laranja) e a folha de conchas, pegadas e tábuas;
  - as pranchas do IAmiguinho vieram sem bola na mão, como pedido: a bola do jogo é desenhada à parte;
  - uso no jogo (`cart2/bcp.js` e `cart2/mvbc.py`):
    - esperando a vez: enquanto o Amiguinho joga;
    - na mira: quadros 1 a 4 de "rolando" ou "pelo alto" conforme a força (o braço vai para trás); ao soltar, quadros 5 a 8;
    - com a bola andando: torcendo, quadros 1 a 6; rodada ou jogo ganho: quadros 7 e 8 (punho e joinha);
    - perdeu: continua a tristeza do vôlei;
  - bola na mão (31/10, pedido do dono): na mira, o IAmiguinho segura a bola azul (ou o bolim, na vez do bolim) na mão do quadro atual; a bola vai para trás e para a frente com o braço e, ao soltar (quadro 5), voa da mão até a linha em 0,16 s, crescendo até o tamanho da cancha; a bolinha da fila ao lado dele some enquanto ela está na mão; a barra de força foi um pouco mais para a esquerda para não cobrir a mão de trás;
  - decidido em 31/10: pranchas da bocha sempre SEM bola (o jogo desenha a bola na mão, porque ela muda entre bolim e bola do time e precisa sair da mão na hora certa); os textos dos pedidos (IAmiguinho e Amiguinho) foram ajustados para "sem bola" e a folha das bolas não precisa mais ir de anexo;
  - bolas giram conforme rolam; conchas, pegadas e as tábuas da borda (com cantos) vêm da folha pintada;
  - escala: régua da cabeça igualada (torce 1,027, alto 0,984, rolar 1,047, espera 1,044);
  - pranchas guardadas em `jogos/jogos-de-verao/bocha/pranchas`; já estão na Prévia das pranchas.
- **Amiguinho pintado (31/10):**
  - o dono mandou as 4 pranchas dele (esperando a vez, lançar rolando, lançar pelo alto, medindo/torcendo), sem bola;
  - montadas em `cart2/mvbcb.py` (mesma montagem do vôlei, `mvb2.py`: massa igualada, pés presos no chão, máscara da tela e rosto) e acrescentadas ao desenho do Amiguinho do vôlei como animações bcEspera, bcRolar, bcAlto, bcTorce; escala pela massa: espera 0,969, rolar 0,974, alto 0,989, torce 0,997;
  - usa as mesmas regras do IAmiguinho: espera, mira com a bola na mão (quadros 1 a 4 pela força), soltura no 5, torcida 1 a 6, ganhou 7 e 8; perdeu: tristeza do vôlei;
  - no lançamento pelo alto, a mão em forma de coração do quadro 5 é a mão abrindo na soltura;
  - pranchas em `jogos/jogos-de-verao/bocha/pranchas` (bl_*) e na Prévia das pranchas.
- **Vila pintada (31/10):**
  - o dono mandou a vila vista de cima em 4 horários (manhã cedo, dia, entardecer, noite) e a camada das luzes da noite (janelas e reflexo da lua no mar);
  - montada em `cart2/bccen.py` -> `bccen.js` (window.BCC); o horário vem do relógio, com a troca misturando dois horários por 1 hora (5h, 10h, 16h, 19h), igual à embaixadinha; à noite as luzes acendem por cima, piscando de leve;
  - a cancha pintada (lado de dentro das tábuas: x 261 a 1837, y 365 a 880 na imagem de 1920x1080) fica exatamente em cima da cancha do jogo; para casar com o desenho, a cancha do jogo ficou um pouco mais baixa: y de 75 a 185 (era 70 a 190), mesma largura;
  - com a vila pintada, as tábuas são as do desenho (as da folha de peças ficam de reserva) e o chão da cancha não é mais desenhado pelo jogo;
  - montinhos, buracos, areia fofa, pegadas e conchas recebem a luz do horário (camada tingida: manhã alaranjada leve, entardecer laranja, noite azul);
  - artes em `jogos/jogos-de-verao/bocha/arte`.
- **Bocha toda pintada:** personagens, bolas, peças e vila. Montinhos, buracos e areia fofa pintados desde 31/10 (folha do relevo 3x2: redondos em cima, ovais embaixo; montinho e buraco usam o redondo com 2,35 x o raio; a areia fofa usa o oval quando é 25% mais comprida que larga, com 2,2 x os raios), dentro da camada que recebe a luz do horário; montado em `cart2/bccen.py` (BCC.rel) e desenhado por `bocha.drawRelief` em `cart2/bcp.js`. Na derrota, a tristeza ainda é a do vôlei.

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
- **Itens** (quem está atrás ganha itens melhores; a onda saiu em 31/10):
  - bola de praia: quica reto e volta nas bordas; para trás, sai rolando contra quem vem atrás;
  - balão d'água: persegue quem está logo à frente, a 330 px/s (era 250; o dono achou lento) e virando mais rápido (para trás, quem vem logo atrás). Se passar por um bugue invencível (depois de rodar), não acerta, nem depois, e vai atrás de quem estiver na frente desse bugue; o mesmo vale para a bola;
  - protetor solar: deixa uma poça atrás (ou longe na frente, com ↑);
  - água de coco: turbo;
  - guarda-sol: escudo que bloqueia um ataque;
  - onda: retirada em 31/10 a pedido do dono (deixava os três primeiros lentos por 2,2 s).
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
  - `testes/bgcolisao.cjs`: sobreposição entre bugues em 3 corridas, caixa pegando de lado e voltando em 2 s, largura da esteira;
  - `testes/bgcena.cjs`: fotos do cenário pintado (largada nos 3 horários, rampa, caixas e itens, lagoa, farol de dia e de noite, mar, ladeiras, salto, onda);
  - `testes/bgpintado.cjs`: fotos dos bugues pintados (IAmiguinho reto, rodas para os dois lados, nas curvas, derrapando para os dois lados, rodopiando; Amiguinhos nas 5 cores);
  - `testes/bgmureta.cjs`: 67 batidas em ângulos de 15° a 85° nas 3 pistas; em todas o bugue segue andando (a única exceção quica para dentro de um atalho);
  - `testes/bgitens.cjs`: balão passa por quem está invencível e vai atrás do da frente; bola e balão para trás acertam quem vem atrás; protetor para a frente;
  - `testes/vacuo.cjs`: sozinho, o bugue chega a 229 px/s; colado atrás de outro, passa de 260 e, com 1,5 s, sai com o turbo do vácuo (até 335);
  - `testes/copafotos.cjs`: fotos do menu, das pistas novas, do salto e da classificação;
  - `testes/bgpresos.cjs`: 12 corridas, nenhum bugue preso. Os Amiguinhos dão ré quando ficam parados de cara na mureta e seguem o corredor da lagoa até a saída.
- **Bugue pintado do IAmiguinho (31/10):**
  - prancha do dono (4x2, apontando para a direita): 1-4 reto, com a hélice do boné e os pneus girando; 5-6 rodas da frente para a esquerda; 7-8 para a direita (conferido medindo o ângulo dos pneus);
  - montado em `cart2/mvbg.py` -> `mvbg.js` (window.BGA): cada quadro recortado numa caixa fixa da célula (o bugue não pula de um quadro para o outro); 24 unidades de comprimento (com o estepe);
  - no jogo (`cart2/bgp.js`): o quadro anda mais rápido com mais velocidade (5 + velocidade/18 quadros por segundo); virando mais que 25% do volante, mostra as rodas viradas para o lado certo; rodopiando, rodas retas; o jogo gira o desenho com o bugue, e o vento do vácuo, o protetor e a setinha continuam por cima;
  - pranchas em `jogos/jogos-de-verao/bugue/pranchas` (bg_ia, bg_ia_rodopio, bg_bl).
- **Derrapagem e rodopio do IAmiguinho (31/10):**
  - prancha bg_ia_rodopio: 1-4 derrapando (traseira escorregando para a esquerda, areia saindo dos pneus de trás), 5-8 rodopiando (desenhado girado 0, 90, 180 e 270 graus, com estrelinhas);
  - derrapagem: o desenho é da derrapagem para a direita; para a esquerda o jogo espelha; o giro já desenhado (2 a 7,5 graus, medido pelo eixo do corpo) é desfeito, porque o jogo já inclina o bugue na derrapagem;
  - rodopio: os 4 desenhos trocam rápido (10 por segundo) com o giro desfeito, então o bugue segue a direção do jogo e as estrelinhas rodam em volta; o centro do bugue é o mesmo nos 4 (meio da caixa do desenho de 0 grau).
- **Bugue dos Amiguinhos (31/10):**
  - prancha bg_bl (rosa): 1-4 reto, 5-6 rodas para a esquerda, 7-8 para a direita (conferido pelo ângulo dos pneus);
  - cada Amiguinho com a sua cor (amarelo, rosa, azul, verde, laranja), pela mesma troca de cor do vôlei (pneus, gaiola, visor e faróis ficam);
  - derrapagem e rodopio próprios desde 31/10 (prancha bg_bl_rodopio, 2000x1000, células de 500; mesma conta do IAmiguinho: giro desenhado desfeito, espelhado para a esquerda, estrelinhas rodando), também na cor de cada um.
- Tudo montado em `cart2/mvbg.py` -> `mvbg.js` (window.BGA: conjuntos ia, iad, ias, bl, cada quadro com âncora e giro desenhado) e desenhado por `cart2/bgp.js`.
- **Cenário, peças e itens pintados (31/10):**
  - o dono mandou: dunas vistas de cima em 3 horários (dia, fim de tarde, noite), a faixa da beira-mar, a folha de chão (areia fofa em 3 tamanhos, faixa comprida, rampa do atalho, setas e marcas de pneu), a folha de peças (caixa de item, rampa de madeira, largada, bandeirinhas, mureta reta e curva), a folha de itens (cada item grande e pequeno) e o farol com o facho separado;
  - montado em `cart2/bgcen.py` -> `bgcen.js` (window.BGC: dunas, mar e um atlas de peças) e desenhado por `cart2/bgp.js`;
  - dunas: repetidas em ladrilhos de 400 unidades, o horário pelo relógio (5h dia, 16h fim de tarde, 19h noite, misturando por 1 hora na troca);
  - pista e peças numa camada que recebe a luz do horário (fim de tarde laranja leve, noite azul), como na bocha;
  - muretas: o pedaço vermelho e branco repetido ao longo da beira da pista (7,5 de grossura); a curva da folha ficou de reserva;
  - largada: a faixa quadriculada com os postes atravessando a pista; rampas: 2 módulos de madeira atravessando a pista (a areia do desenho do lado de quem chega); rampa do salto do Desce-Duna: a da folha de chão;
  - areia fofa: a mancha pelo tamanho; no corredor de areia fofa do atalho, a faixa comprida;
  - ladeiras: setas na areia nas descidas e marcas de pneu nas subidas (60% de força), 3 por fileira;
  - caixas: o desenho da caixa girando devagar e pulando de leve; itens: ícones grandes no quadrinho do item; bola e balão pequenos voando; poça do protetor; o guarda-sol aberto em cima do bugue enquanto protege; (a onda pintada atravessando a tela saiu junto com a onda);
  - farol: a torre no lugar do desenho antigo; o facho gira por cima de tudo, mais forte à noite;
  - beira-mar (Duna do Farol): a faixa repetida dos lados, a areia de baixo some sobre as dunas, a água vai e volta de leve; acima dela, a água do alto da faixa esticada;
  - ainda desenhados pelo jogo: o chão da pista, a lagoa e as esteiras de turbo;
  - artes em `jogos/jogos-de-verao/bugue/arte`.
- **Chão da pista pintado (31/10):** a faixa 4:1 do dono (areia batida com marcas de pneu da esquerda para a direita, emenda dos lados), deitada ao longo da pista: cada trecho da linha da pista vira dois triângulos que recebem o pedaço certo da faixa (as beiradas usam a normal média em cada ponto, então os trechos vizinhos dividem a mesma beirada e não aparece emenda nas curvas); a faixa repete a cada 4 larguras de pista (712); por baixo, a cor média (#e9c69f); o corredor do atalho usa a faixa do meio na mesma escala. Arte em `jogos/jogos-de-verao/bugue/arte/pista.webp`.
- **Onda fora dos itens (31/10, pedido do dono):** a caixa não dá mais a onda; a fala do IAmiguinho que citava a onda mudou para o balão d'água; o código do efeito continua guardado.
- **Lagoa, esteiras e efeitos pintados (31/10, zip "Costa WinnerZ — Pista e Efeitos"; farol, beira-mar e folha de chão vieram iguais às já usadas):**
  - lagoa: 4 quadros da água trocando devagar (3 por segundo); a água do desenho (x 100 a 485, y 38 a 153 no quadro guardado de 576x192) casa com a água do jogo (rx, ry) e o desenho é cortado no corredor do atalho;
  - esteira: 4 quadros das setas acendendo (9 por segundo), 34 x 46;
  - efeitos: folha de 6 fileiras de 4 (cada célula guardada com 128 px); poeira, areia fofa, água, faíscas azuis e laranja, e a caixa estourando (só quando pega a caixa; a esteira continua com o anel); a batida usa a poeira; tamanho da célula inteira no mundo: 40, 40, 42, 26, 32 e 64;
  - verde da borda tirado só onde o verde passa do vermelho e do azul (a água é mais azul que verde);
  - nos testes locais, o servidor não manda o charset: palavras com acento no código da página viram outra coisa (o teste `bgcena.cjs` converte antes de comparar); publicado, funciona normal.
- **Corrida de bugue toda pintada.**
- **Ajustes de 31/10 (pedido do dono):**
  - batida entre bugues: cada bugue é dois círculos (frente e trás, raio 8,5, a 4,5 do centro), conferidos 3 vezes por passo e empurrados pelo contato mais fundo; antes era um círculo só (16 de distância) e eles se sobrepunham de frente e de trás. Medido em 3 corridas inteiras: sobreposição máxima 0,1;
  - caixa de item: pega quando o corpo do bugue encosta nela (dois círculos + raio 7 da caixa); antes contava só o centro do bugue a 12 da caixa. Passando ao lado, pega até 16 de distância entre os centros. Reaparece em 2 s (era 2,5);
  - bola, balão e poça do protetor também acertam pelo corpo do bugue;
  - esteiras de turbo com o dobro da largura (44, era 22), com duas fileiras de setas.
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
5. Ao publicar o jogo, mandar também as imagens novas da pasta `jogos_verao/img` (o build tira as imagens de dentro da página; publicar só a página deixa os desenhos novos sem carregar). A página publicada aceita no máximo 512 arquivos: na mesma publicação, remover as imagens antigas que a página nova não usa mais (em 31/10 saíram 177).

## Embaixadinha
- **Como é:** IAmiguinho de lado na areia (hoje no fundo da praia do vôlei), 3 bolas, sem relógio. Toques na cabeça, na coxa ou no pé quando a bola passa na altura; variar vale mais; X/○ faz firula (sobe mais, faz curva, vale o dobro). A sombra na areia mostra onde a bola cai.
- **Séries (a cada 8 toques) e dificuldade progressiva (31/10, pedido do dono):** sempre sobem a gravidade, o espalhamento do toque, o vento e as rajadas. Novidades:
  - 2 mais espalhado; 3 vento (biruta);
  - 4 **gaivota que atrapalha**: voa na altura das bolas, a sombra dela é igual à de uma bola e, se encostar numa bola, empurra a bola para o lado e um pouco para cima (praia e pingue-pongue vão longe, a gude quase não sai do lugar); fica mais frequente e mais rápida a cada série (de ~7 s na série 4 a ~2,5 s na 14; 11: "Gaivotas mais ousadas!"). Antes ela voava alto, longe das bolas, e a sombra era menor que a de uma bola, então não atrapalhava;
  - 5 **pedidos da torcida**: às vezes aparece um balão sobre a torcida pedindo cabeça, coxa ou pé; atender (sem firula) vale +150 × combo, e o pedido some depois de 4 toques;
  - 7 **toque mais preciso**: a faixa de cada altura de toque encolhe 1 (8: 1, 9: 2, 11 em diante: 3);
  - 8 **sombra tímida**: a sombra da bola só aparece quando ela já desceu abaixo de uma altura que vai baixando (150 na série 8, 70 na 14); a da gaivota sempre aparece;
  - 9 **areia fofa**: um trecho de areia fofa (muda de lugar a cada série) onde o IAmiguinho anda na metade da velocidade.
- **Bolas:** da 5 em diante troca de 4 em 4, com o **futebol primeiro** (pedido do dono): futebol (5, 9, 13…), praia (6, 10, 14…), bolinha de gude (7, 11, 15…), pingue-pongue (8, 12, 16…). A bola extra (duas bolas ao mesmo tempo) saiu da rotação em 31/10. Na série nova aparecem a novidade e, se a bola trocou, o nome da bola.
- Teste da dificuldade: `testes/ebdif.cjs`.
- **Física pelo peso (31/10, pedido do dono; tabela `EB_BOLAS` no `build3.py`):** cada bola tem gravidade, resistência do ar (as leves chegam a uma velocidade máxima de queda), quanto o vento leva, quanto sobe e se espalha no toque, quanto a firula curva, quanto quica e rola quando cai e se dança a cada toque. A sombra e o tempo do toque usam a mesma física, com a resistência do ar.
  - Gude: a mais pesada; cai rápido (1,3 s no ar), o vento quase não mexe, sobe menos, quase não quica e rola.
  - Futebol: o meio-termo (1,6 s).
  - Pingue-pongue: leve, dança a cada toque, o vento leva bastante, quica alto (1,9 s).
  - Praia: a mais leve; desce devagar (velocidade máxima de queda ~110), o vento leva muito (2,2 s).
  - Teste: `testes/ebbolas.cjs` (rotação, tempo no ar e erro da sombra: no máximo 5 px na de praia).
- **Sem marcas de contato (31/10, pedido do dono):** saíram as marquinhas das três alturas que apareciam dos lados do IAmiguinho quando a bola chegava.
- As mudanças ficam no `cart2/build3.py` (a prova vem do jogo de 16 bits).
- **Estilo pintado:** os pedidos estão na página "Pedidos das provas novas", seção "Embaixadinha (estilo pintado)", com 24 pedidos:
  - 11 pranchas do IAmiguinho: espera olhando a bola, cabeça seguindo a bola, andando embaixo da bola, toque de pé, de coxa, cabeceio, firula de calcanhar, levantando a bola do chão, deixou cair, fim de jogo e comemoração. Sem a bola: o jogo desenha;
  - folha das bolas (futebol, praia, pingue-pongue, bola de firula e bola extra), biruta e gaivota;
  - cenário da Praia do Centro (prédios da orla, calçadão, quiosques), 2 camadas em 4 horários; a capa é o meio-dia.
- **Anexos na página de pedidos (31/10, pedido do dono):** a página "Pedidos das provas novas" ganhou a seção "Anexos para o ChatGPT" (ficha e grade do IAmiguinho e do Amiguinho e a referência de estilo), repetida no começo de cada grupo com os anexos daquele grupo. Cada imagem tem "Copiar imagem" (cola direto no ChatGPT) e "Baixar" (a página tem a permissão de downloads; pede confirmação). Os cartões da embaixadinha têm a referência de pose em cinza com os desenhos antigos de 16 bits nos quadros certos (`novas/poses_eb.py` gera; ficam em `novas/anexos`). As fichas e grades vêm de `moveset_volei/ficha` e a referência de estilo de `skate_moveset/ficha`.
- **IAmiguinho pintado (31/10):** as 11 pranchas chegaram e estão no jogo (`cart2/mveb.py` → `mveb.js`; desenho em `cart2/ebp.js`; pranchas originais em `embaix/pranchas`). A prova passou a ser desenhada em alta (3,2×, liso, `paint: true`).
  - Escalas pela régua (cabeça igualada à do vôlei): espera 0,896 · olhar 0,911 · andar 0,883 · pé 0,981 · coxa 0,874 · cabeceio 0,985 · firula 1,012 · levanta 0,973 · caiu 0,906 · fim 0,908 · festa 0,915. Cabeça de cada quadro igualada à mediana da prancha (menos em olhar, caiu e fim, onde a cabeça gira ou abaixa de verdade). Altura em pé = 52 unidades, igual ao desenho antigo.
  - Qual prancha aparece: bola parada no pé no começo → levantando (quadros 1-4) e, no toque, 5-8; bola no ar → cabeça seguindo a bola (quadro pela altura da bola); andando → andando; toque → pé, coxa, cabeceio ou firula, começando no quadro do contato (4; na firula, 5) e indo até o 8; bola caiu → deixou cair (1,5 s); última bola → fim de jogo; série nova ou 10 seguidos → comemoração, só se nenhuma bola chega em 0,7 s. Rosto aceso do vôlei dentro da tela de cada quadro.
  - Ajustes para a bola encostar no desenho: o cabeceio usa 35% do pulo desenhado; a altura do toque de coxa desceu de 25 para 22.
  - Pé e coxa vieram um pouco virados para a frente (as outras são de lado); funcionam, dá para refazer de lado se incomodar. A segunda prancha de andar (3/4, maior) ficou guardada.
  - As 12 pranchas estão na Prévia com o veredito. A Prévia não dá mais para regerar do zero aqui (faltam quadros antigos na pasta de trabalho): as pranchas novas entram somando à página publicada.
  - Teste: `testes/ebpintado.cjs` (fotos de cada situação).
- **Cenário, bolas, biruta e gaivota pintados (31/10):** `cart2/ebcen.py` → `ebcen.js` (imagens do dono em `embaix/arte`); desenho em `cart2/ebp.js`.
  - Praia do Centro em duas camadas nos 4 horários, pelo relógio (perto da troca mistura os dois, como no skate); de noite, as luzes das janelas, dos postes e dos quiosques acendem por cima, piscando de leve. A faixa de areia do meio-plano termina aos poucos sobre a areia do fundo.
  - Foram usados: fundo dia/manhã/entardecer/noite; meio-plano dia (a versão com o guarda-sol rosa, a mesma base dos outros horários), manhã, entardecer e noite; luzes do fundo (a versão só com as luzes) e do meio-plano. Ficaram guardadas: a outra versão do meio-plano do dia e a outra das luzes do fundo.
  - Bolas: futebol (4 quadros girando), a de firula com o rastro, praia (3) e pingue-pongue (2); a bola dourada não é usada (a bola extra saiu). A bolinha de gude ainda é desenhada pelo jogo (vidro azul com redemoinho laranja); o pedido dela entrou na página de pedidos.
  - Biruta: murcha sem vento, meio aberta com pouco, esticada balançando com vento forte; aponta para onde o vento sopra.
  - Gaivota: 4 quadros batendo as asas.
- **Correção (31/10):** a comemoração ficava em looping durante a partida. O relógio da partida recomeça a cada partida e uma marca antiga, maior que o relógio, deixava a comemoração ligada; agora ela zera e só acontece uma vez por comemoração. Teste em `testes/ebcena.cjs`.
- **Pendente:** o dono testar; a bolinha de gude pintada.

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

## Editor do jogo (31/10)
- **Pedido do dono:** um editor completo para mudar visual, fases, mecânicas e textos sem depender do Claude. Escolhas dele: editar tudo (mecânicas, fases e pistas, visual e artes, textos e falas; e ainda a posição dos rostos no visor e os movimentos), "Rascunho + Aplicar" e página separada.
- **Onde fica:** dentro da página do jogo, num botão "Editor" no canto de baixo à esquerda que só aparece para o dono (quem só joga não vê). Abre uma tela inteira por cima do jogo. Não ficou numa página com link próprio porque outra página teria um banco de dados próprio e as mudanças não chegariam ao jogo.
- **Como guarda:** no banco da página do jogo (capacidade `db`, regra: todos leem, só o dono escreve), em `wz/rascunho` (salvo sozinho 1,2 s depois de cada mudança), `wz/aplicado` (o que vale para todo mundo) e `wz/v<data>` (uma versão por "Aplicar", com nome). O jogo lê `wz/aplicado` ao abrir. Nos testes locais (`?wzlocal=1` ou localhost) guarda no navegador.
- **Abas:**
  - Mecânicas: por prova, duração e medalhas + as constantes de cada prova (lista `WZ_REG` em `cart2/editor.js`), com controle deslizante, número e ↺; nomes em português em `WZ_NOMES`/`WZ_DESC` (os que faltam aparecem com o nome técnico);
  - Pistas do bugue: mapa de cada pista; mexe nos pontos da pista (arrastar, duplo clique põe, Shift+clique tira; as peças acompanham), caixas, rampas, esteiras (arrastar de lado muda a faixa), areia fofa, atalhos (água ou areia, com ou sem rampa), ladeiras (descida ou subida), farol, nome e fala da pista; desfazer;
  - Rostos e quadros: para cada personagem pintado (IAmiguinho do vôlei, Amiguinho, skate, embaixadinha, bocha), cada movimento e quadro: posição, tamanho e giro do rosto no visor (dá para arrastar) e o encaixe do quadro; copiar para todos os quadros; tocar o movimento; trocar a expressão;
  - Textos e falas: nome e subtítulo das provas e todas as falas do IAmiguinho (uma por linha);
  - Versões e cópia: voltar a uma versão aplicada, copiar/colar tudo como texto, limpar o rascunho.
- **Botões:** Testar (joga a prova escolhida com o rascunho, só para o dono), Aplicar no jogo (vale para todos e guarda versão), Fechar (volta ao aplicado).
- **Como funciona por dentro:** `WZ.apply(cfg)` volta tudo ao original e aplica a configuração (números e textos por caminho, pistas recalculadas, rostos e encaixes nas medidas de cada quadro e no quadro do meio). `cfg = { mec, pistas, rostos, textos }`.
- **Próximas etapas (ainda não feitas):** trocar artes subindo pranchas (recortar o verde e os quadros no próprio editor), velocidade dos movimentos, editar as outras fases (cancha da bocha, séries da embaixadinha etc.) no mesmo estilo do mapa das pistas.
- **Correções e mudanças de 31/10 (o dono: "abriu uma vez e não abre mais"; "tudo que eu puder editar arrastando, melhor"):**
  - o editor pausava o jogo e a tela de pausa ficava por cima do botão: o botão e o editor agora ficam acima de tudo; o editor não abre duas vezes, não fica esperando o banco para sempre (desiste em 8 s e abre com o que tiver) e mostra o erro na barra de cima se algo falhar;
  - a configuração vai guardada no banco como texto (campo `json`), porque o banco pode recusar nomes com ponto e listas dentro de listas (os pontos das pistas);
  - as perguntas (nome da versão, confirmar) são janelas do próprio editor: a página do jogo não pode abrir as janelas de pergunta do navegador (antes, "Aplicar" podia não fazer nada);
  - rostos e quadros: tudo arrastando no desenho, com 4 modos (mover o rosto, tamanho ↕, girar ↔, mover o desenho), rodinha do mouse para o tamanho e o quadro anterior clarinho por baixo para encaixar;
  - aba nova "Cancha da bocha": a cena da bocha com os 4 cantos da cancha e o ponto de lançamento para arrastar (a vila pintada acompanha a cancha), sortear o relevo de novo e voltar ao original.
- **Ajustes de 31/10 (pedido do dono):**
  - mecânicas: cada linha tem um "?" e mostra, com o mouse em cima, o que aquele número faz (e o valor original); as explicações ficam em `WZ_EXPL` (`cart2/editor.js`), por "OBJ.campo" ou "OBJ.*.campo"; todos os números listados têm explicação (conferido no teste);
  - rostos e quadros: mudar o número já muda o desenho na hora, enquanto digita (e com as setinhas do campo), sem precisar clicar no quadro de novo; os números acompanham o arraste ao vivo.
- **Botão sumido (31/10, relato do dono):** a ponte da página (`window.claude`) pode chegar depois do jogo começar e o editor verificava só uma vez; agora espera até 12 s por ela e aceita dono ou quem pode editar (`isOwner`, depois `canEdit`). Reserva: digitar e-d-i-t-o-r no teclado (fora de um campo) abre o editor sem o botão; se não reconhecer o dono, a barra de cima mostra o que faltou (ponte, banco, usuário). Não deu para conferir no navegador do Claude porque ele não está com a conta do dono.
- **Rosto ainda não atualizava ao vivo para o dono (31/10):** aqui atualizava; a causa provável era uma mudança de pista com uma peça fora da pista (ex.: atalho arrastado para depois do fim da linha), que fazia a aplicação parar no meio e o desenho do rosto não era refeito. Agora cada mudança é aplicada sozinha (uma com problema não impede as outras), as peças das pistas são sempre trazidas para dentro da pista (`wzPistaOk`) e o desenho é refeito mesmo se algo falhar. O botão "Editor" também confere de novo quem é o dono depois de 2, 5, 10 e 20 s (para o dono, o botão não aparecia; digitar "editor" funcionou).
- **Rostos não voltavam ao reabrir e não valiam no jogo (01/11, relato do dono):** o banco tinha guardado tudo certo (o rascunho e o aplicado com os rostos do IAmiguinho do vôlei); o problema era na leitura. Correções no `cart2/editor.js`:
  - a leitura agora espera a resposta confirmada do banco (até 8 s) em vez de aceitar a primeira resposta, que pode ser uma cópia antiga guardada no navegador; entre o que veio do banco e o que foi salvo na mesma visita, fica sempre o mais novo;
  - o editor abre com o mais novo entre o rascunho e o aplicado; se o banco não responder, a barra de cima avisa que abriu a última cópia guardada;
  - se o banco responder com uma prova em andamento, o aplicado entra quando a prova acaba (antes, ficava sem valer até recarregar a página);
  - as gravações do rascunho saem uma de cada vez e na ordem; fechar o editor, trocar de aba ou fechar a página logo depois de mexer grava na hora (antes, a última mudança podia se perder);
  - "Aplicar" grava o rascunho antes.
  - Teste novo: `testes/wzbanco.cjs` (banco de mentira que responde primeiro com uma cópia velha e depois com a confirmada; prova em andamento; fechar e abrir logo depois de mexer). O `wzeditor.cjs` agora espera 13,5 s depois de recarregar (no teste local, sem banco, o editor espera 12 s pela ponte).
- **Continuou igual para o dono (01/11, 00h59):** o banco tem a configuração inteira (187 quadros de rosto do IAmiguinho, aplicada de novo às 00h57); aqui, com essa mesma configuração num banco de mentira, o jogo e o editor mostram as mudanças (`testes/wzdono.cjs`; imagem de antes e depois em `testes/wzcomparar.cjs`). A falha está na leitura do banco de verdade, que não dá para abrir daqui (a página é só do dono e o navegador do Claude não está com a conta dele). Feito:
  - a leitura agora usa três caminhos ao mesmo tempo (acompanhando o documento, lendo o documento e lendo a lista `wz`, a mesma que a aba Versões usa) e fica com o mais novo;
  - linha de conferência no editor, embaixo do título: data da página, banco e dono, de onde veio o aplicado e quantos quadros, quantos quadros entraram no jogo e quando, o rascunho, o editor e os últimos erros de leitura. Pedido ao dono: foto dessa linha.
- **Causa achada (01/11, 01h21, com as fotos do dono):** os números salvos estavam certos (o run 1 voltava com -1, 5, 1, 6), mas o desenho do rosto mudava. O rosto do vôlei andava dentro do visor para "olhar para a bola" (até 12% da largura e 13% da altura do visor), e esse olhar ficava guardado depois de jogar: no jogo o rosto saía do lugar posto pelo dono e, ao reabrir o editor, o desenho vinha com o último olhar do jogo. Correção:
  - o editor desenha sempre com o rosto parado (sem olhar);
  - novo número em Mecânicas > Vôlei: "Rosto olhando para a bola" (`ROSTO.olhar`), 0 por padrão = o rosto fica exatamente onde o dono pôs; 1 = olha para a bola como antes. Vale para o IAmiguinho e o Amiguinho (`anim5.js` e `animb2.js`).
  - Teste: `testes/wzolhar.cjs` (editor igual antes e depois de jogar; no jogo o rosto igual ao do editor; com 1 o rosto se mexe).
- **Dificuldade dos adversários do vôlei (01/11, pedido do dono):** em Mecânicas > Vôlei, seção "Dificuldade dos adversários": partida rápida, as 4 fases do Torneio (`OPP.*.lvl`) e as 7 fases da Copa (`COPA_LVL`), cada uma com uma barra de 0 até 1,2 e o nome ao lado (fácil < 0,2, médio < 0,5, difícil < 0,8, muito difícil < 1, extremo, e IMPOSSÍVEL no máximo). Não dá para passar do máximo.
  - **Impossível (`cart2/impossivel.js`, `VOLEI_IMP = 1.2`):** decide sempre certo, reage na hora, anda mais rápido (1,7x), sem humor; todo toque dele que não iria cair do seu lado vira uma bola certa do seu lado e longe de você; se a bola for cair do lado dele (ou no 4º toque), ele pega no último instante e devolve. Na Copa, a fase no máximo deixa todas as seleções no impossível; abaixo disso nenhuma passa de 1,19.
  - Medido (`testes/vimpossivel.cjs`, jogador = cérebro antigo no melhor nível): no 1,02 (extremo) o jogador fez 15 pontos em 12 partidas; no impossível, 0 pontos em 12 partidas (2 defesas no último instante).
  - Teste do editor: `testes/wzdificuldade.cjs`.
- **Teste:** `testes/wzeditor.cjs` (abre, muda número, rosto (arrastando o tamanho) e fala, aplica com nome, abre de novo depois de jogar e pausar e pela terceira vez, arrasta o lançamento da bocha, recarrega e confere); `testes/wzaovivo.cjs` (explicações, rosto ao vivo digitando, números acompanhando o arraste); `testes/wzrostos_vivo.cjs` (os 6 números em cada um dos 5 personagens mudam o desenho na hora); `testes/wzpista_estragada.cjs` (rascunho com atalho fora da pista não trava o rosto nem o jogo).

## Trilha sonora gravada (01/11)
- **O dono mandou:** 7 músicas; "Carnaval na Areia" é a música tema.
- **Onde cada uma toca:**
  - Carnaval na Areia (tema): a abertura, até a 1ª prova começar; e as provas Corrida na areia e Tiro com arco;
  - Disco do Caranguejo: os menus e as telas de resultado depois da 1ª prova (volta do ponto onde parou);
  - Forró do Coqueiro: vôlei, pingue-pongue e basquete;
  - Onda Gigante: surfe, canoagem, natação, jet ski e duelo de água;
  - Skate no Calçadão: half-pipe, patins, BMX e bugue;
  - Soca do Coco: embaixadinha, futebol, bocha e frisbee;
  - Mambo do Pódio: o pódio do fim da semana (sem a vinheta de código por cima).
- **Como funciona:** as faixas ficam em `jogos_verao/musica/` (publicadas junto com a página). `cart2/musica.py` prepara as originais do dono (`cart2/musica_src/`): tira o silêncio do fim (para emendar sem buraco), iguala o volume entre elas e reduz para 128 kbps (~1,3 a 2 MB cada). `cart2/musica.js` (entra no `build3.py` logo depois do sistema de música) troca a música de código pelas faixas: troca suave entre faixas, a pausa abaixa, o botão de música liga e desliga, e a música para quando a aba fica escondida. As vinhetas de medalha continuam as de código, por cima. Se uma faixa não carregar, volta a música de código.
- **A tabela prova -> faixa** fica no começo de `cart2/musica.js` (`PROVA`). Ao trocar o arquivo de uma faixa, mudar `V` para o navegador baixar de novo.
- **iPhone e iPad:** lá o volume não muda pelo código; a troca de faixa é seca e a pausa não abaixa a música.
- Cópia das faixas prontas no repositório: `jogos/jogos-de-verao/musica/` (as originais em 320 kbps ficam com o dono).
- **Teste:** `testes/trilha.cjs` (abertura com o tema, as 18 provas com faixa, pausa, resultado, botão desligado e ligado, pódio, os 7 arquivos carregando).

## No site do WinnerZ (01/11, pedido do dono)
- **Endereços:** `/jogos-de-verao` (o jogo em tela inteira, para quem tem acesso ao site) e `/studio/jogos-de-verao` (o mesmo jogo com o editor já aberto; só a administração; cartão "Jogos de Verão" no Studio). O link discreto "WinnerZ" no canto de baixo volta para o site.
- **Como funciona:** a página pronta do jogo fica em `public/demo/jogos-verao/` (cópia da pasta `jogos_verao` que o `build3.py` monta: `index.html`, `img/`, `musica/`). A página do site (`src/pages/JogosVerao.tsx`) mostra o jogo numa moldura e liga nele a ponte `src/lib/jogosPonte.ts`, que faz o papel do banco da página do Claude: o editor não muda nada e funciona nos dois lugares.
- **Onde fica guardado no site:** tabela `jogo_dados` (caminhos `verao/wz/rascunho`, `verao/wz/aplicado`, `verao/wz/v<data>`) e pasta `jogos` do Storage (imagens pintadas, `verao/<arquivo>-<código>.webp`). Todo mundo lê; só a administração grava (migração `0097_jogos_de_verao.sql`). **O dono precisa rodar a 0097 no Supabase (SQL Editor) uma vez**; até lá, a página avisa a administração no alto.
- **Começo igual ao da página do Claude:** na primeira vez, com o banco do site vazio, o editor e o jogo usam a "semente" (`cart2/semente.json`, o rascunho e o aplicado do dono em 01/11, 01h42/01h28, 187 quadros de rosto). O primeiro "Aplicar" no site passa a valer dali em diante. Os dois lugares não se misturam depois disso: o que for feito no site fica no site.
- **Atualizar o jogo no site:** depois do `build3.py`, copiar `jogos_verao/` para `public/demo/jogos-verao/` e enviar (o Vercel publica sozinho).
- **Achado no caminho:** o jogo aplicava o que foi salvo assim que o banco respondia; com o banco rápido, isso acontecia antes de os desenhos dos personagens terminarem de carregar, e os rostos não entravam. Agora espera a página montar. Pode ter sido parte do problema dos rostos de 01/11 de madrugada.
- **Teste:** `testes/wzsite.cjs` com `testes/wzsite_host.html` (moldura igual à do site, com um Supabase de mentira).

## Desenho inteiro e pintura no editor (01/11, pedido do dono)
- **Desenho inteiro de cada quadro** (Rostos e quadros > "Desenho inteiro neste quadro"): mover (já existia), tamanho e giro em volta dos pés, em número ou arrastando ("Tamanho do desenho" e "Girar o desenho"). Vale para todos os personagens (`f.ks` e `f.kr` nos quadros; desenhados em `anim5.js`, `animb2.js`, `skp.js`, `ebp.js`, `bcp.js`).
- **Aba Pintura (`cart2/pintura.js`), escolha do dono: pintura própria no estilo Procreate, sem anúncios (o Photopea foi descartado):**
  - abre qualquer quadro dos personagens (inclusive os "quadros do meio", marcados ½) ou qualquer imagem do cenário (galeria; "só as grandes" ou "todas");
  - ferramentas: pincel, borracha, conta-gotas (também Alt + clique), balde, mão; desfazer e refazer (40 passos); zoom na rodinha e com dois dedos; atalhos B, E, I, G, H/Espaço, [ ], Ctrl+Z, Ctrl+Shift+Z;
  - pincel com pressão da caneta (tamanho, e opacidade se ligar), opacidade, fluxo, suavizar (estabilizador); pincéis prontos: Redondo, Aerógrafo, Nanquim, Lápis (com grão) e Giz;
  - importa pincéis do Procreate (.brush e .brushset: a forma e o grão) e do Photoshop (.abr de versão 6 em diante, pincéis de amostra), e imagens (.png/.jpg/.webp) como ponta; os importados ficam guardados no navegador (IndexedDB) e saem com o ×;
  - camadas: nova, mostrar/esconder, opacidade, juntar para baixo, apagar; o quadro anterior clarinho por baixo nos personagens;
  - "Salvar no jogo" junta as camadas, monta a folha inteira de novo com o quadro pintado e guarda a imagem; o jogo troca a imagem na hora (registro de imagens `cart2/imgreg.js`, primeiro script da página) e as versões coloridas dos Amiguinhos são refeitas. Vale para todo mundo depois do "Aplicar no jogo". "Voltar à original" tira a pintura daquela imagem.
  - Onde a imagem fica: no site, na pasta `jogos` do Storage. Na página do Claude não há onde guardar imagens: a pintura vale só até recarregar (o editor avisa) e não vai para o banco.
  - Limites desta etapa: os quadros têm o tamanho que o jogo usa (ex.: 105×160 o IAmiguinho parado), então o traço fica do tamanho do jogo; a máscara do visor (onde o rosto aparece) não muda com a pintura; ainda não tem seleção, transformar, borrar/dedo, modos de mistura nem as configurações finas dos pincéis do Procreate (só forma e grão).
  - Teste: `testes/wzpintura.cjs` (pincéis de teste em `testes/pinceis/`).

