# Simulações do vôlei

Rodam com o jogo montado servido em `http://localhost:8765` (`python3 -m http.server 8765 --directory jogos_verao`).

- `vlvl2.cjs '[0.05,0.45,0.75,1.02]' on`: partidas de um jogador automático contra cada nível do Amiguinho. Mostra quantas vence (com a dificuldade que se adapta ao placar ligada).
- `vdiag.cjs '[0.75,1.02]' 16`: como cada ponto acaba (erro do Amiguinho, ponto direto, 4 toques...).
- `vtune.cjs '<variações>' 20`: testa mudanças no cérebro do Amiguinho (trocas de texto no código) e compara erros por toque, cortadas e vitórias.
- `vlv3.cjs '[0.05,0.45,0.75,1.02]' 12`: partidas contra o cérebro novo (30/10/2026): vitórias, erros por toque, cortadas, peixinhos.
- `verr2.cjs`: lista como o Amiguinho mais forte perde pontos (qual jogada ele tinha planejado).
- `vsrv.cjs`: saques do Amiguinho por nível (com cortada ou de toque).
- `vflick.cjs`: joga uma partida desenhando e conta quantas vezes cada personagem troca de desenho e quantos trechos duram menos de 0,1 s (o que parece tremida).
- `repro.cjs`: bola alta caindo do lado do Amiguinho; lista, quadro a quadro, o desenho escolhido, a posição e a velocidade dele.
- `vsrv2.cjs`: força 20 saques do Amiguinho por nível e conta quantos foram com cortada.
- `pingue.cjs [partidas]`: partidas de pingue-pongue de jogadores automáticos (o mesmo cérebro do Amiguinho, com acerto de 0,92 a 0,45) contra o Amiguinho: vitórias, pontos, maior troca, troca média, qualidade das batidas, como os pontos acabam e quais golpes saíram. Salva fotos em `amg/`.
- `ppkeys.cjs`: pingue-pongue pelo teclado (andar, sacar, preparar) e as teclas do jogador 2.
- `todas.cjs`: abre cada prova por 2 s procurando erros, confere o botão de 2 jogadores do pingue-pongue e abre a prova no celular.
- `bocha.cjs [partidas]`: bocha, jogador automático (o mesmo cérebro do Amiguinho, com acerto de 0,92 a 0,45) contra o Amiguinho: vitórias, pontos, rodadas, encostos, tiradas e rodadas anuladas. Salva fotos em `amg/`.
- `bckeys.cjs`: bocha pelo teclado (mirar, segurar e soltar para rolar e para jogar pelo alto).
- `bcburaco.cjs`: rola 4 bolas em cada buraco (um com areia fofa) e mostra quanto tempo cada uma leva para parar.
- `teco.cjs [voos]`: teco-teco: decolagem, voo sem comando, looping e estol, e um piloto automático em 3 níveis (pontos, argolas, balões, rasantes, batidas e motivo das batidas).
- `tcshots.cjs`: fotos do avião passando por cada marco e por uma sequência de argolas.
