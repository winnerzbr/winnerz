"""Pingue-pongue pintado: a folha da raquete (frente vermelha, de lado, 3/4, inclinada, verso preto) e a bolinha -> mvpp.js (window.PPA).
Âncora de cada raquete: o meio da cabeça (onde o jogo gira a raquete). Comprimento da raquete no jogo: 14 unidades (a antiga tinha 13)."""
import json, base64, io, numpy as np
from PIL import Image
from scipy import ndimage
from cc import key_green
rg = key_green('../pingue/arte/raquete.png'); r_, g_, b_ = (rg[..., i].astype(float) for i in range(3))
ex = np.clip((g_ - np.maximum(r_, b_) * .97) / 20, 0, 1); rg[..., 3] = (rg[..., 3] * (1 - ex)).astype(np.uint8); rg[..., 1] = np.minimum(g_, np.maximum(r_, b_)).astype(np.uint8)
BOX = {'frente': (66, 89, 445, 628), 'lado': (540, 84, 626, 628), 'tres': (741, 84, 1035, 628), 'incl': (1106, 107, 1496, 606), 'verso': (1559, 89, 1938, 628), 'bola': (1994, 332, 2109, 445)}
K = .25  # pixels guardados por pixel da folha
tiles, meta = [], {}
for nm, (x0, y0, x1, y1) in BOX.items():
    a = rg[y0 - 6:y1 + 6, x0 - 6:x1 + 6].copy(); al = a[..., 3] > 60; H = al.shape[0]
    lab, n = ndimage.label(ndimage.binary_closing(al, iterations=2)); sz = ndimage.sum(al, lab, range(1, n + 1)); keep = int(np.argmax(sz)) + 1
    a[..., 3] = np.where(ndimage.binary_dilation(lab == keep, iterations=3), a[..., 3], 0)
    ys, xs = np.where(a[..., 3] > 60)
    if nm == 'bola': ax, ay = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    else:
        # cabeça = parte de cima mais larga; o centro dela fica a 1/3 do alto (o cabo é o terço de baixo)
        top, bot = ys.min(), ys.max(); hy = top + (bot - top) * .34; row = np.where(a[int(hy), :, 3] > 60)[0]; ax, ay = (row.min() + row.max()) / 2, hy
    im = Image.fromarray(a); t = im.resize((round(im.width * K), round(im.height * K)), Image.LANCZOS); tiles.append(t)
    meta[nm] = {'w': t.width, 'h': t.height, 'ax': round(ax * K, 1), 'ay': round(ay * K, 1), 'len': round((ys.max() - ys.min()) * K, 1)}
X = 0; atl = Image.new('RGBA', (sum(t.width + 2 for t in tiles), max(t.height for t in tiles)))
for (nm, m), t in zip(meta.items(), tiles): atl.paste(t, (X, 0)); m['x'] = X; X += t.width + 2
b = io.BytesIO(); atl.save(b, 'WEBP', quality=88, method=5)
open('mvpp.js', 'w').write('window.PPA = ' + json.dumps({'src': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), 'p': meta}) + ';\n')
print('mvpp.js', len(open('mvpp.js').read()) // 1024, 'KB', meta['frente'], meta['bola'])
atl.save('/tmp/ppatl.png')
