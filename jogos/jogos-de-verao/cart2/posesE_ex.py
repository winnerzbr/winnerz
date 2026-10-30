import numpy as np, sys
from PIL import Image
from scipy import ndimage
src = np.array(Image.open('src/posesE.png').convert('RGB'))
boxes = {'c1': (8, 240, 245, 592), 'c2': (228, 240, 432, 592), 'c3': (414, 240, 640, 592), 'c4': (622, 240, 826, 592), 'toque': (826, 240, 1040, 592), 'manchete': (1030, 240, 1232, 592),
         'saque': (1224, 240, 1484, 592), 'corte2': (1482, 180, 1732, 495), 'pouso': (1660, 340, 1970, 592), 'festa': (1918, 190, 2170, 545)}
D = int(sys.argv[1]) if len(sys.argv) > 1 else 3
for nm, (x0, y0, x1, y1) in boxes.items():
    c = src[y0:y1, x0:x1].copy(); f = c.astype(float)
    lum = f @ [.3, .59, .11]; mx, mn = f.max(2), f.min(2); sat = (mx - mn) / np.maximum(mx, 1)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    line = lum < 150; blue = (b > r + 40) & (sat > .3)
    wall = ndimage.binary_dilation(line | blue, iterations=D)
    lab, n = ndimage.label(~wall)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = ~np.isin(lab, list(edge)); fg = ndimage.binary_erosion(fg, iterations=max(0, D - 1))
    lab2, n2 = ndimage.label(fg); sizes = ndimage.sum(fg, lab2, range(1, n2 + 1))
    keep = ndimage.binary_fill_holes(lab2 == (np.argmax(sizes) + 1))
    a = ndimage.gaussian_filter(keep.astype(float), .6)
    out = np.dstack([c, (a * 255).clip(0, 255).astype(np.uint8)])
    ys, xs = np.where(keep); bb = (max(0, xs.min() - 3), max(0, ys.min() - 3), xs.max() + 4, ys.max() + 4)
    Image.fromarray(out).crop(bb).save(f'posesE/{nm}.png')
ims = [Image.open(f'posesE/{n}.png') for n in boxes]
W = sum(i.width for i in ims) + 10 * len(ims); H = max(i.height for i in ims)
bg = Image.new('RGBA', (W, H), (40, 160, 60, 255)); x = 0
for i in ims: bg.alpha_composite(i, (x, 0)); x += i.width + 10
bg.convert('RGB').save('chk_posesE.png')
