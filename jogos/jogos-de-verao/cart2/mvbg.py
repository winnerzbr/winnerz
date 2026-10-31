"""Corrida de bugue pintada: o bugue do IAmiguinho visto de cima (prancha 4x2 do dono, apontando para a direita) -> mvbg.js (window.BGA).
Quadros 1-4: reto (hélice do boné girando, pneus rodando); 5-6: rodas da frente para a esquerda; 7-8: para a direita.
Cada quadro é recortado numa caixa fixa da célula (o bugue está no mesmo lugar em todas), então o centro do bugue não pula."""
import json, base64, io
from PIL import Image
from cc import key_green
SRC = '../bugue/pranchas/bg_ia.png'
CELL = 512; BOX = (16, 56, 496, 448)   # caixa dentro da célula (cobre os pneus virados)
CX, CY = 255.5, 256                    # centro do bugue reto (meio da caixa do quadro 1)
LEN_PX, LEN_U, U = 459, 24, 6          # comprimento desenhado (com o estepe) -> 24 unidades do jogo; 6 pixels guardados por unidade
rgba = Image.fromarray(key_green(SRC)); k = LEN_U * U / LEN_PX
tiles = []
for i in range(8):
    x0, y0 = (i % 4) * CELL, (i // 4) * CELL
    t = rgba.crop((x0 + BOX[0], y0 + BOX[1], x0 + BOX[2], y0 + BOX[3]))
    tiles.append(t.resize((round(t.width * k), round(t.height * k)), Image.LANCZOS))
w, h = tiles[0].size; atl = Image.new('RGBA', ((w + 2) * 8, h))
for i, t in enumerate(tiles): atl.paste(t, (i * (w + 2), 0))
b = io.BytesIO(); atl.save(b, 'WEBP', quality=88, method=5)
OUT = {'src': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), 'n': 8, 'w': w, 'h': h, 'ax': round((CX - BOX[0]) * k, 1), 'ay': round((CY - BOX[1]) * k, 1), 'u': U}
open('mvbg.js', 'w').write('window.BGA = ' + json.dumps(OUT) + ';\n'); print('mvbg.js', len(open('mvbg.js').read()) // 1024, 'KB', atl.size, OUT['ax'], OUT['ay'])
