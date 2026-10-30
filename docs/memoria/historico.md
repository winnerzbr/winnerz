# Histórico

A entrada mais nova fica em cima. Cada entrada traz o que foi feito, o que foi decidido e o que ficou pendente.

---

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
