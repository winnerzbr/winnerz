import numpy as np, json
from PIL import Image
from scipy import ndimage
from headsz import measure, I
def dtsize(nm):
    v = []
    for j in range(len(I[nm])):
        a = np.array(Image.open(f'mv2/{nm}_{j}.png')); al = ndimage.binary_fill_holes(a[..., 3] > 128)
        v.append(ndimage.distance_transform_edt(al).max())
    return float(np.median(v))
for f, blob, ref in (('mv5.py', False, 'idleA'), ('mvb2.py', True, 'b_h')):
    src = open(f).read(); g = {}; exec(src[src.index('SH ='):src.index('FRONT')], g); SH = g['SH']
    M = measure(SH, blob, ref); D = {n: dtsize(n) for n in SH}
    print(f)
    for n in SH:
        kv = M[ref][0] / M[n][0] if M[n][0] else 0; kd = D[ref] / D[n]
        print(f'  {n:10s} k={SH[n][0]:.3f} visor->{kv:.3f} circulo->{kd:.3f}')
