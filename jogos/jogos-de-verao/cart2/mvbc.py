"""Bocha pintada: as 4 pranchas do IAmiguinho (mv5.py -> MVBC) e as peças (bolas, bolim, conchas, pegadas, tábuas -> BCA) em mvbc.js.
Escala dos personagens pela régua (cabeça igualada à do vôlei: 0,505 / cabeça mediana da prancha)."""
import json, base64, io, numpy as np
from PIL import Image
from scipy import ndimage
import mv5
from cc import key_green
from mveb import _fix  # mesma igualagem de cabeça por quadro da embaixadinha
SH = {'bc_espera': (1.044, 'linha', 1), 'bc_rolar': (1.047, 'linha', 1), 'bc_alto': (0.984, 'linha', 1), 'bc_torce': (1.027, 'linha', 1)}
ANIM = {'espera': ['bc_espera'], 'rolar': ['bc_rolar'], 'alto': ['bc_alto'], 'torce': ['bc_torce']}
_ff = mv5.frame_fix
mv5.frame_fix = lambda nm: _fix(nm) if nm.startswith('bc_') else _ff(nm)
OUT = mv5.build(ANIM, SH, set(), {}, 'MVBC', 'mvbc_p.js')
# peças em fundo verde
def parts(path, minpx=1500):
    rgba = key_green(path); m = ndimage.binary_closing(rgba[..., 3] > 40, iterations=3); lab, _ = ndimage.label(m); out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        mm = lab[sl] == i + 1
        if mm.sum() < minpx: continue
        im = rgba[sl].copy(); im[..., 3] = np.where(mm, im[..., 3], 0); out.append(((sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2, Image.fromarray(im)))
    return out
def rows(P, gap):
    R = {}
    for cy, cx, im in sorted(P, key=lambda p: p[0]):
        k = next((k for k in R if abs(k - cy) < gap), cy); R.setdefault(k, []).append((cx, im))
    return [[im for _, im in sorted(v, key=lambda t: t[0])] for _, v in sorted(R.items())]
U = 3.2 * 1.25  # pixels guardados por unidade do jogo
tiles, meta = [], {}
def add(name, im, k):
    w, h = max(1, round(im.width * k)), max(1, round(im.height * k)); tiles.append(im.resize((w, h), Image.LANCZOS)); meta.setdefault(name, []).append(dict(w=w, h=h))
B = rows(parts('../bocha/pranchas/bc_bolas.png'), 120); assert [len(r) for r in B] == [4, 4, 1], [len(r) for r in B]
for im in B[0]: add('azul', im, 12 * U / im.width)
for im in B[1]: add('rosa', im, 12 * U / im.width)
add('bolim', B[2][0], 7 * U / B[2][0].width)
P = rows(parts('../bocha/pranchas/bc_pecas.png'), 120); assert [len(r) for r in P] == [5, 4, 2], [len(r) for r in P]
for im in P[0]: add('concha', im, 7 * U / max(im.width, im.height))
for im in P[1]: add('pegada', im, 7 * U / im.height)
th = P[2][0].height  # grossura da tábua comprida (com o contorno)
for im in P[2]: add('tabua', im, 4.4 * U / th)
X = 0; atl = Image.new('RGBA', (sum(t.width + 2 for t in tiles), max(t.height for t in tiles))); i = 0
for name, L in meta.items():
    for f in L: t = tiles[i]; atl.paste(t, (X, 0)); f['x'] = X; X += t.width + 2; i += 1
b = io.BytesIO(); atl.save(b, 'WEBP', quality=88, method=5)
BCA = {'atl': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), 'p': meta, 'u': U}
open('mvbc.js', 'w').write(open('mvbc_p.js').read() + 'window.BCA = ' + json.dumps(BCA) + ';\n')
print('mvbc.js', len(open('mvbc.js').read()) // 1024, 'KB', {k: len(v) for k, v in meta.items()}, atl.size)
