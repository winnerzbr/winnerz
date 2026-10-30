"""Régua de proporção: compara cada quadro de uma prancha nova com a ficha de modelo congelada.
cabeça = mediana de 3 medidas (altura do visor, círculo da cabeça, fone) em relação à ficha;
corpo  = raiz da área da silhueta em relação à ficha; proporção = corpo / cabeça (1,00 = igual à ficha).
Uso: python3 regua.py <prancha> [frente]"""
import numpy as np, json, sys
from PIL import Image
from scipy import ndimage
from visor import visor, geom, solid
from earcup import cup
sys.path.insert(0, '.'); from cc import key_green
I = json.load(open('mv2/info.json'))
def metrics(a):
    al = ndimage.binary_fill_holes(a[..., 3] > 128); m, core = visor(a)
    out = {'area': float(np.sqrt(al.sum()))}
    if m is not None and core > 900:
        if solid(m) >= .925: out['visor'] = geom(m)[3]
        out['circ'] = float((ndimage.distance_transform_edt(al) * ndimage.binary_dilation(m, iterations=40)).max())
        c = cup(a)
        if c: out['fone'] = c
    return out
def model(view):
    x0, x1 = {'34': (686, 1096), 'frente': (121, 561)}[view]
    rgba = key_green('../procreate/ia_src.png')[:, x0 - 20:x1 + 20]
    return metrics(rgba)
if __name__ == '__main__':
    nm = sys.argv[1]
    if nm.startswith('sk_'): import visor as _v; _v.ROUND = True
    view = 'frente' if len(sys.argv) > 2 else '34'; M = model(view)
    rows = []
    for j in range(len(I[nm])):
        f = metrics(np.array(Image.open(f'mv2/{nm}_{j}.png')))
        hs = [f[k] / M[k] for k in (('visor', 'circ', 'fone') if 'visor' in f else ('circ',)) if k in f and k in M]
        head = float(np.median(hs)) if hs else float('nan'); body = f['area'] / M['area']
        rows.append((j + 1, head, body, body / head, [round(x, 2) for x in hs]))
    hd = np.array([r[1] for r in rows]); pr = np.array([r[3] for r in rows])
    for r in rows: print(f'quadro {r[0]}: cabeça {r[1]:.3f}  corpo {r[2]:.3f}  corpo/cabeça {r[3]:.3f}  {r[4]}')
    print(f'cabeça varia {100 * (hd.max() - hd.min()) / np.median(hd):.1f}% entre quadros · corpo/cabeça mediana {np.median(pr):.3f} (1 = ficha)')
