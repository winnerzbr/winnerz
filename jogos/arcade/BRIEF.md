# Arcade do IAmiguinho: como fazer um jogo novo

O dono do WinnerZ (canal de games, site e mascote IAmiguinho) tem uma página jogável, o **Arcade do IAmiguinho**, com 13 minijogos em pixel art, ranking da semana, trilha chiptune por jogo e um gabinete de fliperama. Você vai acrescentar **um** jogo novo.

## Onde fica o quê
- `/home/claude/winnerz/jogos/arcade/index.html`: o Arcade inteiro (um arquivo só, cerca de 4.360 linhas). **Só leitura: não edite.**
- `/home/claude/winnerz/jogos/arcade/novos/<id>.js`: o **seu** arquivo. Escreva o jogo inteiro aqui: constantes, música, objeto do jogo e `ARCADE_NOVOS.push(seuJogo);` no fim. O código roda dentro do mesmo `<script>` do Arcade, logo antes de `const GAMES = [...]`, e enxerga tudo o que foi declarado antes.
- `python3 /home/claude/winnerz/jogos/arcade/montar.py <id>` gera `build/<id>.html`: o Arcade com o seu jogo incluído (no fim da lista).
- Teste: `cd /home/claude/winnerz/jogos/arcade && node teste.cjs <id>.html <id> /tmp/<id> 1280 860 play wait:1500 shot ...`
  - As ações estão no começo de `teste.cjs`: `play`, `wait:ms`, `shot`, `down:Tecla`, `up:Tecla`, `tap:x,y` (no canvas, coordenadas 320×360), `hold:x,y,ms`, `eval:js`, ou o nome de uma tecla.
  - A captura mostra o gabinete. Use também 390 844 para celular: em largura menor que 600, o teste simula toque.
  - O servidor da porta 8767 já está no ar. Se não responder: `cd /home/claude/winnerz/jogos/arcade && nohup python3 -m http.server 8767 &`.
  - Veja as capturas com Read.
- Não faça commit, push nem publicação. Não mexa em arquivos de outros jogos (outros ajudantes fazem os outros 9 em paralelo).

## Estude antes de escrever (no index.html)
- **Exemplos completos de jogo:** `balacaxi` (~linha 1421, corrida), `downloadJogo` (~2634, segurar/soltar), `pescaJogo` (~3599, com fases e lojinha), `escondeJogo` (~3233) e `penJogo` (~1646). Veja como montam o objeto e desenham.
- **Contrato do objeto do jogo:**
  - Campos: `id`, `name`, `tag` ("Gênero · detalhe"), `unit` (unidade do placar), `ia` (pontuação do IAmiguinho no ranking), `bestKey: '.v1'`, `desc` (uma linha), `how` (texto do menu, 1–2 frases: é o único lugar com explicação), `ctl` (lista de [tecla, ação, 'pc'|'touch']), `pad` (botões de toque: [['Rótulo', 'CódigoDaTecla'], ...] ou null), `rank` (4 linhas de exemplo com @duda @carol @rafa @bia), `nota` (desculpa curta do IAmiguinho no ranking) e `falas` (3–5 frases dele no balão do menu).
  - Funções: `init()` zera o estado. `demo()` é opcional e deixa a cena bonita para a miniatura da lista. `update(dt)` devolve `true` quando a partida acaba. `draw(t)` também é chamado parado, no menu e na miniatura (`draw(1.3)`), então tem que funcionar logo depois de `init()`. `hud()` devolve `[rótulo, valor, texto da direita]`. `overText()` é opcional.
  - O placar fica em `this.score`. Use `asc: true` se o menor vence e `fmt` para formatar.
- **Ajudantes globais:**
  - Desenho: `W=320`, `H=360`, `ctx`, `spr(linhas, x, y, escala, flip, paleta)` e `sprO(...)` (com contorno). `drawIA(x, y, escala, t, {flip, dizzy, fast})` desenha **o IAmiguinho oficial do Arcade** (14×16 pixels, normalmente em escala 2; a hélice gira em cima). Também há `helice`, `stars`, `banner(linhas, y)`, as fontes `F_BIG`, `F_MID` e `F_SM`, a paleta `PAL`, `SK` (inclinação de 22°) e `BOT` (sprite de Amiguinho, com cores O/o).
  - Utilidades: `rand`, `pick`, `clamp`, `shake = .3` (tremor) e `sfx.flap/point/hit/coin/big/start/over` (ou `beep(freq, dur, tipo, vol, slide)`).
- **Entrada:**
  - `inp.act` é true no quadro em que tocou ou apertou espaço/↑/A.
  - `keys.has('Space')`, `isHeld('Space', 'ArrowUp')` e `pressedAny(...)` dizem o que está apertado.
  - `inp.ax` e `inp.ay` vão de −1 a 1 (setas, WASD ou analógico). `inp.down` é abaixar no controle.
  - `inp.drag` traz `{x0, y0, x, y}` do arrasto, em coordenadas do canvas, e `inp.tap` traz o ponto do toque.
  - Os botões de `pad` viram teclas.
- **Música:** `Music.define('<id>', { bpm, lead, arp, bass, drums, mix })`. A trilha tem que ser chiptune **original**, no formato das outras. O Arcade toca `Music.play(id)` sozinho quando o jogo começa.

## Regras do dono
- **Visual:** o mesmo estilo de pixel art do Arcade, em coordenadas inteiras, com cenário escuro e luzes coloridas. O personagem é sempre o IAmiguinho do Arcade (`drawIA`), e os inimigos e ajudantes são Amiguinhos (`BOT`, em cores variadas) ou objetos do mundo gamer.
- **Nada de terceiros:** nenhum personagem, logo, arte ou nome de jogo de terceiros. O nome do jogo que inspirou a mecânica não aparece no jogo.
- **Textos:** em português do Brasil, com linguagem neutra de gênero. Nada de tutorial na tela durante a partida: a explicação fica só no `how` do menu.
- **Controles:** funciona igual no teclado, no controle e no celular (toque).
- **IAmiguinho:** confiante e atrapalhado, sarcástico, com humor ácido de internet. Ri de jeitos variados (kkkk, hahaha, lol), mas não em toda frase, e **nunca se deprecia**. Nada de política nem religião.
- **Partida e progressão:** partidas curtas, de 1 a 3 minutos para quem joga bem no começo. Tem que haver progressão (dificuldade que cresce, fases ou obstáculos novos aparecendo), como nos outros jogos do Arcade. O placar entra no ranking da semana.
- **Prefixo:** dê às suas constantes e funções globais um prefixo único (o seu está no pedido) para não colidir com o resto.

## Antes de terminar
1. Rode partidas reais pelo teste, até a tela de fim (`estado: over`). Se precisar, use um atalho de teste por `eval`.
2. Confira que não há erros de JavaScript, que a miniatura da lista aparece (veja a lista na captura da página toda, se quiser) e que fica bom em 390×844 com toque.
3. Corrija o que estiver feio ou quebrado.

Relatório final (até 150 palavras, em português simples): controles por aparelho, como pontua, como progride e o que ficou de fora. Salve uma captura boa em `/tmp/novo-<id>.png`.
