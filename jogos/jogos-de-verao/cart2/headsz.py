"""Tamanho da cabeça (tela) por prancha, para igualar a escala entre animações."""
import numpy as np, json, sys
from PIL import Image
from visor import visor, geom, solid
I = json.load(open('mv2/info.json'))
def measure(SH, blob, base):
    out = {}
    for nm, (k, _, _) in SH.items():
        hs, ws = [], []
        for j in range(len(I[nm])):
            m, core = visor(np.array(Image.open(f'mv2/{nm}_{j}.png')), blob)
            if m is None or core < 900 or solid(m) < (.855 if blob else .925): continue
            x0, y0, W, H, r = geom(m); hs.append(H); ws.append(W)
        out[nm] = (float(np.median(hs)) if hs else None, float(np.median(ws)) if ws else None, len(hs))
    return out
if __name__ == '__main__':
    for f, blob, ref in (('mv5.py', False, 'idleA'), ('mvb2.py', True, 'b_h')):
        src = open(f).read(); g = {}; exec(src[src.index('SH ='):src.index('FRONT')], g)
        M = measure(g['SH'], blob, ref); hr = M[ref][0]
        print(f)
        for nm, (h, w, n) in M.items():
            k = g['SH'][nm][0]
            print(f'  {nm:10s} k={k:.3f} cabeça_atual={h * k / hr if h else 0:.2f} k_novo={hr / h if h else 0:.3f} n={n}')
