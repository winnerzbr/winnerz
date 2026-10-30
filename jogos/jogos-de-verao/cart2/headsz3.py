"""Tamanho do personagem por prancha:
IAmiguinho -> raio do maior círculo que cabe na cabeça (perto da tela), mede a cabeça inteira, não só o visor;
Amiguinho  -> raiz da área da silhueta (a geleia amassa e estica, mas a quantidade de 'massa' fica igual)."""
import numpy as np, json
from PIL import Image
from scipy import ndimage
from visor import visor
I = json.load(open('mv2/info.json'))
def size_of(nm, blob):
    v = []
    for j in range(len(I[nm])):
        a = np.array(Image.open(f'mv2/{nm}_{j}.png')); al = ndimage.binary_fill_holes(a[..., 3] > 128)
        if blob: v.append(np.sqrt(al.sum())); continue
        dt = ndimage.distance_transform_edt(al); m, core = visor(a)
        if m is not None and core > 900: dt = dt * ndimage.binary_dilation(m, iterations=40)
        v.append(dt.max())
    return float(np.median(v))
def ks(SH, blob, ref):
    D = {n: size_of(n, blob) for n in SH}; return {n: D[ref] / D[n] for n in SH}
if __name__ == '__main__':
    for f, blob, ref in (('mv5.py', False, 'idleA'), ('mvb2.py', True, 'b_h')):
        src = open(f).read(); g = {}; exec(src[src.index('SH ='):src.index('FRONT')], g); K = ks(g['SH'], blob, ref)
        print(f, ' '.join(f'{n}:{g["SH"][n][0]:.2f}->{K[n]:.3f}' for n in g['SH']))
