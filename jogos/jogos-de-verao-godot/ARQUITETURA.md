# Como o projeto funciona (para quem programa)

Godot 4.7.2, renderizador "Compatibility". Janela de 1280 × 720, que estica guardando a proporção.

## Fluxo
`cenas/menu.tscn` → escolhe uma prova (`Jogo.prova_atual`) → `cenas/partida.tscn`. A partida mostra a explicação
(`prova.explicacao()`), roda `prova.passo(DT, I)` 60 vezes por segundo até ele devolver `true`, e mostra o resultado
(`prova.pontos`, `placar_txt()`, `estatisticas()`, medalha por `Jogo.PROVAS[...].med`).

## Autoloads
- **Jogo** (`nucleo/jogo.gd`): lista das provas (`PROVAS`), recordes (`user://recordes.cfg`), opções (`user://opcoes.cfg`), fontes MSDF e a fala do IAmiguinho (`Jogo.falar(linhas, prob)`; o sinal `fala` é mostrado pela partida).
- **Entrada** (`nucleo/entrada.gd`): monta o pacote `I`, o mesmo do navegador (`l r u d a b c e`, os `p*` de apertou agora e os eixos `ax ay rx ry`).
- **Som** (`nucleo/som.gd`): `Som.toca(nome, vol, rate, lado, atraso)` e `Som.laco(id, nome, vol, rate)`, chamado a cada passo; some sozinho em 0,15 s quando deixa de ser chamado. É o mesmo motor do `sons.js` do navegador.
- **Musica** (`nucleo/musica.gd`): `Musica.toca(faixa)` e `Musica.abaixa(k)`.

## Passar uma prova do navegador para cá
1. **Código de referência:** `jogos_verao/index.html` do navegador, com as imagens trocadas por marcadores, para dar para ler (no ambiente do Claude: `/home/claude/work/gref/jogo_ref.html`). O código de cada prova é um objeto `const <id> = {...}`, com os desenhos pintados em `cart2/*p.js`.
2. **Arte:** `python3 ferramentas/extrai_arte.py <pasta jogos_verao> NOME...` (use `--lista` para ver os nomes). Sai em `arte/NOME/` + `arte/NOME.json`.
3. **Script:** `provas/<id>/<id>.gd` com `extends Prova`, e a cena `<id>.tscn` com um Node2D com esse script. Defina `W` e `H` (o tamanho lógico da tela da prova).
   - `update(dt, I)` vira `passo(dt, I)`; `draw(tt)` vira `desenhar(tt)`; `init()` vira `iniciar()`; `hud()`, `stats()` → `estatisticas()`, `score` → `pontos`.
   - O desenho tem os mesmos comandos do canvas: `save/restore`, `translate_/rotate_/scale_`, `alpha`, `R(x,y,w,h,cor)`, `img(tex, sx,sy,sw,sh, dx,dy,dw,dh)`, `grad_rect`, `circle`, `ellipse`, `poly`, `line`, `text`.
   - O "lighter" (luzes somadas) vai em `desenhar_luz(tt)`, com `tem_luz() = true`.
   - `pop(...)`, `banner(...)`, `tremer(k)` e `falar(...)` são os mesmos do navegador.
4. **Sons:** os bipes do navegador (`sfx.jump()` etc.) passam a chamar `Som.toca(...)`, com os nomes de `FOL_TROCA`/`FOL_PASSO` do `cart2/sons.js` do navegador.
5. **Registro:** em `Jogo.PROVAS`, preencha `"cena": "res://provas/<id>/<id>.tscn"`.
6. **Teste:** `testes/fotos_<id>.tscn` tira fotos da prova rodando. Antes, rode `godot --headless --path . --import` (para preparar imagens novas). Depois, rode `xvfb-run -a -s "-screen 0 1280x720x24" godot --path . --rendering-driver opengl3 --resolution 1280x720 res://testes/fotos_<id>.tscn`.

## Sons e música
- **Sons:** `ferramentas/sons.py <sons.mp3> <sons.json>` corta o arquivo de sons escolhido pelo dono (feito no navegador por `som/jogo_sons.py`) em `sons/<nome>.wav`. Os `_loop` repetem sem emenda; as variações são `_1`, `_2`...
- **Música:** as faixas do dono ficam em `musica/*.mp3`, com os nomes de `Musica.NOMES`.
