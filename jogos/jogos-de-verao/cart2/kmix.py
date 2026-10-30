"""Paliativo: nas pranchas em que o corpo saiu fora de proporção com a cabeça, escala no meio-termo
(metade do caminho entre igualar a cabeça e igualar o corpo, em escala multiplicativa)."""
import numpy as np, json
from PIL import Image
from scipy import ndimage
I = json.load(open('mv2/info.json')); K = json.load(open('mv2/k_auto.json'))
FORA = ['spk2', 'spk3', 'serve3', 'serve4', 'specB', 'getup', 'run2A', 'run2B']
def ar(nm): return float(np.median([np.sqrt(ndimage.binary_fill_holes(np.array(Image.open(f'mv2/{nm}_{j}.png'))[..., 3] > 128).sum()) for j in range(len(I[nm]))]))
r0 = ar('idleA'); RAT = {}
src = open('mv5.py').read(); g = {}; exec(src[src.index('SH ='):src.index('FRONT')], g); SH = g['SH']
for nm in SH:
    RAT[nm] = round(ar(nm) * K[nm] / r0, 3)  # corpo/cabeça comparado ao modelo (1 = igual)
KM = dict(K)
for nm in FORA: KM[nm] = round(K[nm] / np.sqrt(RAT[nm]), 3); print(nm, K[nm], '->', KM[nm], 'corpo', RAT[nm])
json.dump({'k_cabeca': {n: K[n] for n in SH}, 'corpo': RAT, 'meio': FORA}, open('mv2/proporcao_ia.json', 'w'), indent=1)
a = src.index('SH ='); b = src.index('\nANIM')
body = 'SH = {  # escala: cabeça igualada (mediana de 3 medidas); pranchas com corpo fora do modelo usam o meio-termo cabeça/corpo (kmix.py)\n' + ''.join(f' {n!r}: ({KM[n]!r}, {v[1]!r}, {v[2]!r}),\n' for n, v in SH.items()) + '}'
open('mv5.py', 'w').write(src[:a] + body + src[b:])
K2 = json.load(open('mv2/k_auto.json')); K2.update({n: KM[n] for n in SH}); json.dump(K2, open('mv2/k_auto.json', 'w'), indent=1)
