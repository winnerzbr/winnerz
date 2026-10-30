# IAmiguinho: Jogos de Verão (fontes)

Tudo que é preciso para montar de novo o jogo publicado: o jogo base, os programas, os quadros recortados das pranchas aprovadas, a ficha de modelo, as pranchas originais e o cenário do skate, além das páginas de pedidos. Testado: montar a partir desta pasta gera o mesmo jogo publicado, idêntico.

## Montar o jogo
Pede Python 3 com numpy, scipy, Pillow e opencv.

```bash
cd cart2
python3 mv5.py       # IAmiguinho no vôlei  -> mv5.js
python3 mvb2.py      # Amiguinho no vôlei   -> mvb.js
python3 mvsk.py      # IAmiguinho no skate  -> mvsk.js
python3 skscene.py   # cenário do skate     -> skscene.js e skvd.js
python3 build3.py    # junta tudo           -> ../jogos_verao/index.html + img/
```

## Prancha nova
```bash
cd cart2
python3 mv2/cutf.py '{"nome":"caminho/da/prancha.png"}'   # recorta os 8 quadros em mv2/
python3 regua.py nome                                      # régua de proporção (cabeça e corpo × ficha)
```
Depois, acrescente a prancha no `SH`/`ANIM` do montador certo (`mv5.py`, `mvb2.py` ou `mvsk.py`) e no `mv2/previa.py`. A prévia publicada sai de `python3 previa_pack.py`, rodado na raiz desta pasta.

## Pastas
| Pasta | O que tem |
|---|---|
| `verao/` | o jogo base com as 19 provas (16 bits) |
| `verao_cartoon/` | o vôlei em desenho (cena, rede, placar) |
| `cart2/` | programas, quadros recortados (`mv2/`) e medidas (`mv2/info.json`) |
| `procreate/` | ficha de modelo, grade-guia e o modelo congelado usado pela régua |
| `blob_src/` | pranchas originais aprovadas do Amiguinho no vôlei (versão 2) |
| `skate/` | pranchas originais aprovadas do skate, cenário (`vd/`, `scene/`), sprites antigos e os pedidos |
| `moveset_volei/`, `skate_moveset/` | páginas de pedidos das pranchas |
