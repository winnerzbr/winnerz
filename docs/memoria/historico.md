# Histórico

A entrada mais nova fica em cima. Cada entrada traz o que foi feito, o que foi decidido e o que ficou pendente.

---

## 30/10/2026: Jogos de Verão, cérebro novo do Amiguinho e animações sem tremer
O dono jogou de novo e relatou:
- o Amiguinho jogava a bola muito para trás;
- no saque, ele tocava a bola para o meio da quadra, facilitando a cortada perto da rede;
- ele usava pouco a cortada;
- ele errava o lado do peixinho em todos os níveis;
- as animações tremiam.

**Pedido do dono:** a assertividade do Amiguinho vai de 40% no nível mais fácil a 90% no mais difícil. No mais difícil, ela pode variar de 80% a 95% com a dificuldade que se adapta ao placar.

**Cérebro novo** (`cart2/aivolei.js`, usado só pelo Amiguinho; o jogador automático dos testes usa o antigo):
- **Planeja o toque:** antes de cada toque, ele simula (imagina) várias posições, pulando ou não, e escolhe a melhor. Pode mandar a bola para o outro lado, longe de você, ou levantar alto perto da rede para cortar em seguida.
- **Cortada:** ele calcula quando pular para a cortada dar certo, confirmando com a mesma física do jogo, e corta no ar quando dá.
- **Saque:** nos níveis altos, joga a bola mais alto e corta (no mais difícil, em cerca de 2 de cada 3 saques). O saque de toque vai rápido e longe de você.
- **Peixinho:** mergulha para o lado em que a bola vai cair. Antes ia para onde a bola estava naquele instante; esse era o erro.
- **Assertividade:** é sorteada uma vez por lance. Quando o sorteio sai errado, ele lê mal onde a bola cai, se posiciona torto, não corta ou mergulha tarde.
- **Simulação contra o jogador automático:**

  | Nível | Vitórias do jogador automático | Erros do Amiguinho por toque | Cortadas por partida |
  |---|---|---|---|
  | Fácil | 12 de 12 | 12,7% | 0,8 |
  | Médio | 10 de 12 | 8,5% | 9,5 |
  | Difícil | 2 de 12 | 4,9% | 10,8 |
  | Final | 0 de 12 (só 2 pontos por partida) | 4,9% | 12 |

**Animações sem tremer:** cada animação ganhou quadros intermediários entre desenhos parecidos, feitos por fluxo óptico (`cart2/mids.py`), no IAmiguinho e no Amiguinho do vôlei.
- O jogo mostra o quadro do meio na primeira metade de cada troca, então o movimento fica com o dobro de desenhos.
- Onde o quadro do meio sairia borrado (movimentos grandes, mãos que mudam muito de lugar), ele não entra.
- O skate ainda não tem quadros intermediários.

## 30/10/2026: Jogos de Verão, ajustes de jogabilidade (vôlei e skate)
O dono jogou e pediu os ajustes abaixo.
- **Vôlei, dificuldade:** o Amiguinho Dourado (final do torneio) estava fácil. O motivo, achado em simulação: quando ia cortar, ele se posicionava longe demais da bola; se a cortada não saía, a bola batia de lado na cabeça e ia reta na rede.
  - Agora, quanto mais forte o adversário, mais perto da bola ele se posiciona.
  - No nível mais alto, os erros por toque caíram de 5,6% para 2,3%, e as cortadas por partida subiram de 3,8 para 7.
  - Contra o jogador automático das simulações: nível fácil e médio quase sempre perdem; o difícil ganha 19 de 20; o final ganha 20 de 20, deixando cerca de 2 pontos.
- **Vôlei, dificuldade que se adapta:** é a mesma do 16 bits. Se você está na frente, o adversário se concentra e erra menos; se ele está na frente, pode relaxar. Os adversários fortes (difícil e final) agora sempre usam isso; antes era sorteado a cada partida.
- **Vôlei, pontos:** partida normal até 7 e final até 10, no torneio e na Copa. Antes era 5 nas primeiras fases.
- **Vôlei, cortada:** a cortada carregada até o fim sai até 14% mais rápida.
- **Vôlei, animação do Amiguinho com "cara de stop-motion":** o encaixe de cada desenho seguia o alto do corpo. Como a geleia inclina, os pés escorregavam até 6 pixels da quadra de um quadro para o outro.
  - Agora, parado no chão, os pés ficam presos. Andando ou no ar, segue o centro do corpo.
  - É o mesmo encaixe em todos os movimentos, para a troca entre eles não dar pulinho.
  - A Prévia também foi ajustada.
  - A troca de um quadro para o outro ficou parecida com a do IAmiguinho.
  - Se ainda parecer travado, o próximo passo são pranchas de quadros intermediários.
- **Skate, pouso mais difícil:**
  - cai com giro mais de 35° fora (antes 45°) ou faltando mais de 20% da manobra (antes 30%);
  - desequilibra acima de 10° (antes 15°) ou faltando mais de 4% (antes 6%).
- **Skate, bônus por segurar:** +60% da manobra por segundo segurado, até dobrar. O nome mostra o tempo, por exemplo "Superman (0,7 s)", e vale também nas combinadas.
- **Pendente:** o dono vai testar os botões no celular e os pontos das manobras combinadas.

## 30/10/2026: Jogos de Verão, Amiguinho do vôlei completo
- Chegaram mais 22 pranchas. Com elas, o Amiguinho tem todos os movimentos do vôlei na versão da ficha de modelo.
- **Entraram no jogo e na Prévia:**
  - saque, parte 5;
  - espera olhando para cima e para baixo;
  - cortada no ar;
  - cortada no chão;
  - cortada no chão andando;
  - especial;
  - peixinho;
  - comemoração;
  - tristeza.
- As duas pranchas "sem par" da leva anterior eram tentativas da parte 5 do saque.
- **Novidade no jogo:** o Amiguinho também olha para a bola, inclinando o corpo para cima ou para baixo como o IAmiguinho. E anda de verdade com o braço armado na cortada no chão; antes, só quicava no lugar.
- Quando vieram tentativas repetidas, ficou uma e as outras ficaram guardadas na Prévia como "outra tentativa".
- **Pendente no vôlei:** placar, menus e HUD pintados; ajustes de jogabilidade.

## 30/10/2026: Jogos de Verão, Amiguinho do vôlei (17 pranchas)
- Chegaram 19 pranchas novas do Amiguinho. Entraram no jogo e na Prévia:
  - posição de espera;
  - corrida (2 partes);
  - arrancar e frear;
  - andar para trás;
  - virar;
  - pulo (3 partes);
  - toque (2 partes);
  - manchete (2 partes);
  - saque, partes 1 a 4. A parte 5 ainda é a antiga.
- Tamanho igualado pela massa ao Amiguinho de antes, e cada quadro com a mesma massa. O visor ocupa a mesma parte do corpo que antes.
- Na corrida, o Amiguinho sobe metade da altura desenhada.
- Duas pranchas quase iguais (`bv2_x1` e `bv2_x2`) não batem com nenhum cartão. Ficaram fora do jogo; perguntado ao dono qual movimento são.
- **Faltam:** saque parte 5, cortada no ar (3), cortada no chão (2), cortada no chão andando (2), especial, peixinho (4), comemoração (2), tristeza (2) e espera olhando para a bola (2).

## 30/10/2026: Jogos de Verão, troca de provas
- **Saíram do jogo:** Salto de hélice, Corrida do isopor e Minigolfe. O código delas continua no backup em 16 bits. O Minigolfe vai para o Arcade do IAmiguinho, com os gráficos do Arcade.
- **Troca:** o Salto do píer vai virar Salto do penhasco, na Falésia do Farol. Enquanto o penhasco não fica pronto, o Salto do píer continua no jogo.
- **Provas novas aprovadas:**
  - Voo do teco-teco;
  - Frescobol (precisa ter modo para uma pessoa, com um Amiguinho de parceiro);
  - Paraquedismo em formação;
  - Pingue-pongue no quiosque;
  - Bocha na areia;
  - Corrida de bugue: vista de cima, com mecânicas de corrida de kart e itens para acertar quem corre contra.
- Com as novas, o jogo fica com 22 provas. Hoje o jogo publicado tem 16 provas, e os textos da tela não dizem mais o número.
- O plano visual (doc) ganhou o lugar, o horário da capa, a paleta, os extras, os desafios e as **regras propostas** de cada prova nova.
- O Parque do Boardwalk ficou sem prova. A ideia é que vire a porta do Arcade no mapa (a decidir).
- **Pendente:** o dono aprovar as regras propostas antes de começar qualquer prova nova.

## 30/10/2026: Jogos de Verão, Amiguinho do vôlei
- Começaram as pranchas novas do Amiguinho (com a ficha de modelo). Parado (partes 1 e 2) aprovado e já no jogo e na Prévia.
- Tamanho igualado pela massa ao Amiguinho de antes; cada quadro com a mesma massa (o 1º quadro da parte 1 tinha vindo 6% menor).

## 30/10/2026: Jogos de Verão, correção no skate
- No começo da partida, sem apertar nada, o IAmiguinho ficava trocando entre em pé e agachado. A causa era a demonstração do menu (o voo de exemplo), que era contada como um pulo e deixava o jogo achando que ele estava pousando. Agora só pulos de verdade, durante a partida, ativam o pouso.

## 30/10/2026: memória dos projetos
- Criados o `CLAUDE.md` na raiz e a pasta `docs/memoria/` (este histórico, `site.md`, `jogos-de-verao.md` e `lives.md`). Agora toda sessão começa lendo esses arquivos e termina atualizando o histórico.
- Fontes do Jogos de Verão guardadas em `jogos/jogos-de-verao/`: 107 pranchas aprovadas (856 quadros), programas, ficha, cenário do skate e páginas de pedidos. Testado: montar a partir delas gera o jogo publicado idêntico.

## 30/10/2026: Jogos de Verão, skate pintado
- **Giro no ar:** pranchas refeitas, com 14 vistas diferentes.
- **Manobras combinadas:** criadas as 6 combinadas com giro (Superman Giratório, Cristo Giratório, Foguete Espiral, Helicóptero, Indy Giratória e Rabeta Giratória).
  - Cada uma tem prancha própria, com 8 vistas.
  - Valem a manobra × 1,5, mais o giro, × 1,3.
  - A Melão ficou de fora porque o comando dela (↖) se confunde com o giro.
- **Segurar:** segurar o botão ou a direção mantém a manobra, e ela só termina ao soltar. Pousar segurando derruba.
- **Cenário:** Skatepark do Viaduto, nos 4 horários do relógio de quem joga, com camada de luzes à noite e a cor da luz na rampa. O chão passou a ser de concreto.
- **IAmiguinho:** todas as pranchas do skate pintadas e no jogo (chão, ar, flips, pegadas, botões, borda e tombo).
- **Pendente:** ajustes de jogabilidade do skate; um possível bônus por segurar mais tempo.

## 29 e 30/10/2026: Jogos de Verão, vôlei e decisões gerais
- **Vôlei do IAmiguinho:** refeito com a ficha de modelo e a grade-guia, em 38 pranchas.
  - Rosto aceso dentro do visor, olhando para a bola.
  - Espera com a cabeça acompanhando a bola.
  - Saque só jogando a bola para cima.
- **Plataforma:** o vôlei foi testado no Godot (`/demo/volei-godot`) e o Unity foi avaliado. Decisão: continuar no navegador.
- **Prévia das pranchas:** fica como página de trabalho para todas as pranchas.
- **Pendente:**
  - pranchas do Amiguinho no vôlei;
  - placar, menus e HUD pintados;
  - ajustes de jogabilidade do vôlei.
