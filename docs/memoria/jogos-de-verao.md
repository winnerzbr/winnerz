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
O plano tem 22 provas, e o jogo publicado tem 16 delas. Os lugares, as paletas e as regras propostas de cada prova estão no doc do plano visual.
- **No jogo:** Surfe, Half-pipe, Embaixadinha, Patins, Basquete, Salto do píer, BMX, Corrida na areia, Frisbee, Tiro com arco, Duelo de água, Canoagem, Futebol de areia, Natação, Jet ski e Vôlei.
- **Retiradas em 30/10/2026:** Salto de hélice, Corrida do isopor e Minigolfe. O código delas fica no backup em 16 bits (`verao/index.html`). O `build3.py` só as tira da lista. O Minigolfe vai para o Arcade do IAmiguinho.
- **Troca:** o Salto do píer vira Salto do penhasco, na Falésia do Farol, com as mesmas regras e 5 alturas cada vez maiores.
- **Novas, ainda não feitas:** as regras propostas aguardam a aprovação do dono. As novas já nascem pintadas, sem passar pelo 16 bits.

  | Prova | Lugar | Pontos principais |
  |---|---|---|
  | Voo do teco-teco | Aeroclube da Restinga, sobrevoando a costa | vista de lado: argolas, balões, rasantes nos marcos, looping e turbo |
  | Frescobol | Praia Lotada | cooperativo contra o recorde; sozinho, um Amiguinho é o parceiro; pode ser jogado em duas pessoas |
  | Paraquedismo em formação | Céu da Enseada Cristal | queda livre fechando a roda, abrir o paraquedas baixo e pousar no alvo |
  | Pingue-pongue no quiosque | Quiosque do Coqueiral | 1 contra 1, partida até 11, cortada e bola com efeito |
  | Bocha na areia | Vila dos Pescadores | vista de cima, mira e força, rolar ou bater, até 7 pontos |
  | Corrida de bugue | Dunas Brancas | vista de cima, corrida de kart: derrapagem com turbo, largada com turbo e itens de praia (bola, balão d'água teleguiado, protetor solar, água de coco, guarda-sol, onda); 3 voltas e a Copa das Dunas com 3 pistas |

## Páginas publicadas (Claude)
| Página | Endereço | Para quê |
|---|---|---|
| Jogos de Verão | https://claude.ai/artifact/2dFTqQJ77p3TJovNPM7v9v | o jogo em desenvolvimento (16 provas; vôlei e skate pintados) |
| Jogos de Verão 16 bits | https://claude.ai/artifact/KATSnXhZbmXS4ptNGZKRcx | backup congelado em 16 bits |
| Prévia das pranchas | https://claude.ai/artifact/4JU4Gtd5ri3iU786ezarkP | toda prancha nova toca em loop com o veredito antes de entrar no jogo |
| Moveset do Vôlei | https://claude.ai/artifact/1dXVWLrYSy4Z9z9pCrnZAf | pedidos das pranchas do vôlei (IAmiguinho e Amiguinho) |
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
