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
    - Corrida de bugue (`cart2/ev_bugue.js`): esperando o teste do dono.
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
- **Cena:** Dunas Brancas, vista de cima, câmera seguindo o bugue com o norte para cima. 3 voltas contra 5 Amiguinhos, numa pista fechada de cerca de 4.000 px (uma volta leva uns 22 s).
- **Controles:**
  - ◀ ▶ viram;
  - ✕/Espaço acelera e ○/X freia (no celular acelera sozinho, e os botões são Freio, Derrapa e Item);
  - □/C segurado na curva derrapa: com 0,85 s vem a faísca azul (turbo curto) e com 1,7 s a laranja (turbo longo); o turbo sai ao soltar;
  - △/V usa o item.
- **Pista:**
  - **Largada:** contagem 3, 2, 1, Vai!; acelerar de 0,5 s antes do Vai em diante dá turbo, e cedo demais afoga.
  - **Pulos:** duas rampas; pousar alinhado dá turbo curto.
  - **Fora da pista:** é areia fofa (lenta), e os morros nas bordas seguram e devolvem o bugue.
  - **Lagoa:** atalho na curva da direita; só compensa com turbo.
  - **Caixas de item:** 4 fileiras pela pista.
- **Itens** (quem está atrás ganha itens melhores; a onda só sai para o 5º e o 6º):
  - bola de praia: quica reto e volta nas bordas;
  - balão d'água: persegue quem está logo à frente;
  - protetor solar: deixa uma poça atrás;
  - água de coco: turbo;
  - guarda-sol: escudo que bloqueia um ataque;
  - onda: deixa os três primeiros lentos por 2,2 s.
  - Quem é acertado rodopia e perde velocidade, mas continua a corrida.
- **Amiguinhos:** seguem a pista cada um na sua faixa, derrapam nas curvas fortes e usam os itens com critério. Os da frente aliviam um pouco quando abrem muita vantagem, e os de trás apertam.
- **Pontos:**
  - por posição: 1º 3.000, 2º 2.200, 3º 1.600, 4º 1.100, 5º 700, 6º 400;
  - medalhas: bronze em 3º, prata em 2º, ouro em 1º.
- **Testes:**
  - `testes/bugue.cjs`: corridas com o jogador no piloto automático e fotos; as posições variaram de 1º a 6º, em uns 64 a 71 s;
  - `testes/bgkeys.cjs`: largada com turbo, derrapagem e item pelo teclado.
- **Arte provisória:** tudo desenhado pelo jogo. Os pedidos estão na página de pedidos: bugues de cima, derrapagem e rodopio, itens, peças da pista e as dunas de cima em 3 horários.
- **Ainda não feito:** a Copa das Dunas (3 pistas: Lagoa Azul, Duna do Farol e Desce-Duna). Esta pista é a primeira.

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
