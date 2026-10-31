"""Corrida de bugue pintada: bugues vistos de cima (pranchas 4x2 do dono, apontando para a direita) -> mvbg.js (window.BGA).
  ia  (bg_ia.png):         1-4 reto (hélice e pneus girando), 5-6 rodas da frente para a esquerda, 7-8 para a direita
  iad (bg_ia_rodopio 1-4): derrapando (traseira escorregando para a esquerda, areia saindo dos pneus de trás)
  ias (bg_ia_rodopio 5-8): rodopiando (desenhado girado 0, 90, 180 e 270 graus, com estrelinhas)
  bl  (bg_bl.png):         bugue do Amiguinho (rosa; o jogo troca a cor), mesmos quadros do ia
  bld/bls (bg_bl_rodopio): Amiguinho derrapando e rodopiando, como iad/ias
Cada quadro guarda a âncora (centro do bugue) e o giro já desenhado (r, em graus, sentido horário), que o jogo desfaz."""
import json, base64, io, numpy as np
from PIL import Image
from cc import key_green
U, LEN_U = 6, 24  # 6 pixels guardados por unidade; bugue (com o estepe) = 24 unidades
def sheet(path, cell, box, center, len_px, rots=None, centers=None, idx=range(8)):
    rgba = Image.fromarray(key_green(path)); k = LEN_U * U / len_px; F = []; tiles = []
    for j, i in enumerate(idx):
        x0, y0 = (i % 4) * cell, (i // 4) * cell; bx = box if not callable(box) else box(i)
        t = rgba.crop((x0 + bx[0], y0 + bx[1], x0 + bx[2], y0 + bx[3])); t = t.resize((round(t.width * k), round(t.height * k)), Image.LANCZOS)
        cx, cy = centers[j] if centers else center
        tiles.append(t); F.append({'w': t.width, 'h': t.height, 'ax': round((cx - bx[0]) * k, 1), 'ay': round((cy - bx[1]) * k, 1), 'r': (rots[j] if rots else 0)})
    W = sum(t.width + 2 for t in tiles); H = max(t.height for t in tiles); atl = Image.new('RGBA', (W, H)); X = 0
    for t, f in zip(tiles, F): atl.paste(t, (X, 0)); f['x'] = X; X += t.width + 2
    b = io.BytesIO(); atl.save(b, 'WEBP', quality=88, method=5)
    return {'src': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), 'f': F}
OUT = {'u': U}
OUT['ia'] = sheet('../bugue/pranchas/bg_ia.png', 512, (16, 56, 496, 448), (255.5, 256), 459)
# rodopio: o centro do bugue é o mesmo nos 4 desenhos girados (meio da caixa do desenho de 0 grau)
OUT['ias'] = sheet('../bugue/pranchas/bg_ia_rodopio.png', 640, (0, 0, 640, 640), None, 459, rots=[0, 90, 180, 270], centers=[(331.5, 319.5)] * 4, idx=range(4, 8))
# derrapagem: giro medido pelo eixo do corpo amarelo (menos o do desenho reto, 2,8 graus); centro = centro do amarelo menos o
# deslocamento dele no desenho reto (55,5, -6,5) girado junto
ANG = [5.1, 9.3, 10.3, 6.9]; YC = [(377, 320), (367, 318), (368, 322), (375, 323)]; cen = []
for a, (x, y) in zip(ANG, YC):
    t = np.radians(a - 2.8); ox, oy = 55.5, -6.5; cen.append((x - (ox * np.cos(t) - oy * np.sin(t)), y - (ox * np.sin(t) + oy * np.cos(t))))
OUT['iad'] = sheet('../bugue/pranchas/bg_ia_rodopio.png', 640, (0, 40, 640, 600), None, 459, rots=[round(a - 2.8, 1) for a in ANG], centers=cen, idx=range(4))
# Amiguinho derrapando e rodopiando (folha de 2000x1000, células de 500): mesma conta do IAmiguinho
ANG = [7.4, 10.2, 12.9, 9.2]; YC = [(283, 253), (280, 253), (281, 256), (279, 254)]; cen = []
for a, (x, y) in zip(ANG, YC):
    t = np.radians(a - 1.9); ox, oy = 24.5, 2.5; cen.append((x - (ox * np.cos(t) - oy * np.sin(t)), y - (ox * np.sin(t) + oy * np.cos(t))))
OUT['bld'] = sheet('../bugue/pranchas/bg_bl_rodopio.png', 500, (0, 30, 500, 470), None, 359, rots=[round(a - 1.9, 1) for a in ANG], centers=cen, idx=range(4))
OUT['bls'] = sheet('../bugue/pranchas/bg_bl_rodopio.png', 500, (0, 0, 500, 500), None, 359, rots=[0, 90, 180, 270], centers=[(258.5, 249.5)] * 4, idx=range(4, 8))
OUT['bl'] = sheet('../bugue/pranchas/bg_bl.png', 640, (60, 100, 580, 560), (318.5, 322), 462)
open('mvbg.js', 'w').write('window.BGA = ' + json.dumps(OUT) + ';\n'); print('mvbg.js', len(open('mvbg.js').read()) // 1024, 'KB')
