"""Bocha pintada: a Vila dos Pescadores vista de cima nos 4 horários e as luzes da noite -> bccen.js (window.BCC).
Fonte: ../bocha/arte (as imagens do dono, renomeadas). A cancha pintada (lado de dentro das tábuas) vai de x 261 a 1837 e
de y 365 a 880 na imagem de 1920x1080; o jogo encaixa essa cancha na dele (BC.x0..x1, BC.y0..y1)."""
import json, base64, io
from PIL import Image
A = '../bocha/arte/'
def uri(im, q=80):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=5); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
OUT = {'f': {}, 'c': [261, 365, 1837, 880], 'w': 1920, 'h': 1080}
for h in ('dia', 'manha', 'tarde', 'noite'):
    OUT['f'][h] = uri(Image.open(A + f'vila_{h}.png').convert('RGB').resize((1280, 720), Image.LANCZOS))
OUT['lz'] = uri(Image.open(A + 'vila_luzes.png').convert('RGB').resize((960, 540), Image.LANCZOS), 76)
open('bccen.js', 'w').write('window.BCC = ' + json.dumps(OUT) + ';\n'); print('bccen.js', len(open('bccen.js').read()) // 1024, 'KB')
# relevo da cancha (folha 3x2 de 512): montinho, buraco e areia fofa; em cima redondos, embaixo ovais
from cc import key_green
import numpy as np
rg = key_green(A + 'relevo.png'); r_, g_ = rg[..., 0].astype(float), rg[..., 1].astype(float)
ex = np.clip((g_ - r_ * .86) / 22, 0, 1); rg[..., 3] = (rg[..., 3] * (1 - ex)).astype(np.uint8); rg[..., 1] = np.minimum(g_, r_ * .93).astype(np.uint8)
tiles = []; names = ['monte', 'buraco', 'fofa', 'monte_o', 'buraco_o', 'fofa_o']
for i, nm in enumerate(names):
    c = rg[(i // 3) * 512:(i // 3 + 1) * 512, (i % 3) * 512:(i % 3 + 1) * 512]; ys, xs = np.where(c[..., 3] > 20)
    t = Image.fromarray(c[ys.min():ys.max() + 1, xs.min():xs.max() + 1]); tiles.append((nm, t.resize((t.width // 2, t.height // 2), Image.LANCZOS)))
X = 0; meta = {}; atl = Image.new('RGBA', (sum(t.width + 2 for _, t in tiles), max(t.height for _, t in tiles)))
for nm, t in tiles: atl.paste(t, (X, 0)); meta[nm] = {'x': X, 'w': t.width, 'h': t.height}; X += t.width + 2
OUT['rel'] = {'atl': uri(atl, 84), 'p': meta}
open('bccen.js', 'w').write('window.BCC = ' + json.dumps(OUT) + ';\n'); print('bccen.js com relevo', len(open('bccen.js').read()) // 1024, 'KB', meta)
