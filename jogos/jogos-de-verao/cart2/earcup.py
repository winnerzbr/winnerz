import numpy as np, json
from PIL import Image
from scipy import ndimage
from visor import visor
I = json.load(open('mv2/info.json'))
def cup(a):
    rgb = a[..., :3].astype(int); al = a[..., 3] > 150
    cy = al & (rgb[..., 0] < 110) & (rgb[..., 1] > 170) & (rgb[..., 2] > 200)
    m, core = visor(a)
    if m is None or core < 900: return None
    near = ndimage.binary_dilation(m, iterations=70); cy &= near
    cy = ndimage.binary_closing(cy, iterations=2); lab, n = ndimage.label(cy)
    if not n: return None
    sz = ndimage.sum(cy, lab, range(1, n + 1)); b = int(np.argmax(sz)) + 1
    if sz[b - 1] < 150: return None
    ys, xs = np.where(lab == b); ev = np.linalg.eigvalsh(np.cov(np.stack([xs, ys])))
    return 4 * np.sqrt(ev[-1])
def sheet(nm):
    v = [c for j in range(len(I[nm])) if (c := cup(np.array(Image.open(f'mv2/{nm}_{j}.png')))) is not None]
    return (float(np.median(v)) if v else None), len(v)
if __name__ == '__main__':
    src = open('mv5.py').read(); g = {}; exec(src[src.index('SH ='):src.index('FRONT')], g)
    r0 = sheet('idleA')[0]; old = {'idleA':1,'idleB':1,'ready':1,'run2A':1,'run2B':1,'startstop':1,'back':1,'turn':1.06,'jump1':1,'jump2':1,'jump3':1.08,'set1':1,'set2':1,'bump1':1,'bump2':1,'serve1':1,'serve2':1,'serve3':1,'serve4':1,'serve5':.945,'spk1':.94,'spk2':1.13,'spk3':1.12,'gnd1':1.19,'gnd2':1.065,'specB':.93,'dive1':.98,'dive2':.98,'dive3':1,'getup':.98,'party1':.88,'party2':.92,'sad1':.87,'sad2':.87}
    for nm in g['SH']:
        c, n = sheet(nm); print(f'{nm:10s} manual={old[nm]:.3f} circ={g["SH"][nm][0]:.3f} fone={(r0 / c if c else 0):.3f} n={n}')
