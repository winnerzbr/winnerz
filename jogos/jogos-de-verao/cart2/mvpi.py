"""Pingue-pongue pintado do IAmiguinho (8 pranchas do dono, 01/11/2026) -> mvpi.js (window.MVPI), no formato do vôlei (mv5.py).
A raquete vem desenhada na mão; o jogo não desenha a raquete separada nesses quadros.
Escala: cabeça igualada à do vôlei (régua: 0,505 / cabeça mediana da prancha) e cada quadro igualado à mediana da prancha (±12%).
O âncora (meio da cabeça) não conta a raquete vermelha. A bolinha desenhada no saque (quadros 1-3) sai: o jogo desenha a dele,
e a posição dela na mão (quadro 1) vai em 'bola' para o jogo pôr a bolinha de verdade ali."""
import json, numpy as np
from PIL import Image
from scipy import ndimage
import mv5
from mveb import _fix
I = mv5.I
# tira a bolinha (pedaço solto pequeno) dos 3 primeiros quadros do saque e recorta de novo
BOLA = []
for j in range(3):
    nm = f'mv2/pp_saque_{j}.png'; a = np.array(Image.open(nm)); al = a[..., 3] > 60
    lab, n = ndimage.label(al); sz = ndimage.sum(al, lab, range(1, n + 1)); big = int(np.argmax(sz)) + 1
    small = [i + 1 for i in range(n) if i + 1 != big and sz[i] < 600]
    if small:
        ys, xs = np.where(np.isin(lab, small)); BOLA.append([float(xs.mean()), float(ys.mean())])
        keep = ndimage.binary_dilation(lab == big, iterations=3); a[..., 3] = np.where(keep, a[..., 3], 0)
        ys, xs = np.where(a[..., 3] > 60); x0, y0 = xs.min(), ys.min()
        a = a[y0:, x0:xs.max() + 1]; BOLA[-1] = [BOLA[-1][0] - x0, BOLA[-1][1] - y0]
        q = I['pp_saque'][j]; q['h'] = int(a.shape[0] - 1); q['top'] = int(q['bot'] - q['h']); Image.fromarray(a).save(nm)
    else: BOLA.append(None)
import os
if BOLA[0]: json.dump(BOLA, open('mv2/pp_bola.json', 'w')); json.dump(I, open('mv2/info.json', 'w'))
elif os.path.exists('mv2/pp_bola.json'): BOLA = json.load(open('mv2/pp_bola.json'))  # já tirada numa rodada anterior
N = ['espera', 'lado', 'topspin', 'cortada', 'efeito', 'saque', 'andar', 'balao']
K = {'espera': 1.064, 'lado': 1.009, 'topspin': 1.040, 'cortada': 1.017, 'efeito': 1.015, 'saque': 1.043, 'andar': 1.059, 'balao': 1.099}
SH = {f'pp_{n}': (K[n], 'linha', 1) for n in N}
ANIM = {n: [f'pp_{n}'] for n in N}
_ff = mv5.frame_fix
mv5.frame_fix = lambda nm: _fix(nm) if nm.startswith('pp_') else _ff(nm)
OUT = mv5.build(ANIM, SH, set(), {}, 'MVPI', 'mvpi.js', NORED=set(SH))
# bolinha na mão no quadro 1 do saque, em relação ao âncora (pixels guardados)
f0 = OUT['a']['saque']['f'][0]; W0 = Image.open('mv2/pp_saque_0.png').width; r = f0['w'] / W0
OUT['bola'] = [round(BOLA[0][0] * r - f0['ax'], 1), round(BOLA[0][1] * r - f0['ay'], 1)] if BOLA[0] else None
# quadro do contato da raquete com a bola em cada golpe (0 = primeiro)
OUT['toque'] = {'topspin': 3, 'cortada': 3, 'efeito': 3, 'balao': 4, 'saque': 4}
open('mvpi.js', 'w').write('window.MVPI = ' + json.dumps(OUT) + ';\n')
print('bola', OUT['bola'], 'q', OUT['q'])
