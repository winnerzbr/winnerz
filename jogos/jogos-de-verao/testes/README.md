# Simulações do vôlei

Rodam com o jogo montado servido em `http://localhost:8765` (`python3 -m http.server 8765 --directory jogos_verao`).

- `vlvl2.cjs '[0.05,0.45,0.75,1.02]' on`: partidas de um jogador automático contra cada nível do Amiguinho. Mostra quantas vence (com a dificuldade que se adapta ao placar ligada).
- `vdiag.cjs '[0.75,1.02]' 16`: como cada ponto acaba (erro do Amiguinho, ponto direto, 4 toques...).
- `vtune.cjs '<variações>' 20`: testa mudanças no cérebro do Amiguinho (trocas de texto no código) e compara erros por toque, cortadas e vitórias.
