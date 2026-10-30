import numpy as np, cv2, sys
from PIL import Image
from scipy import ndimage
src = np.array(Image.open('src/conceptD.png').convert('RGB'))
boxes = {'frente': (95, 20, 390, 505), 'tres4': (490, 20, 770, 505), 'lado': (850, 20, 1090, 505), 'costas': (1160, 20, 1440, 505),
         'corre': (40, 530, 470, 990), 'corta': (515, 530, 880, 960), 'mergulho': (930, 640, 1520, 960)}
D = int(sys.argv[1]) if len(sys.argv) > 1 else 3
for nm, (x0, y0, x1, y1) in boxes.items():
    c = src[y0:y1, x0:x1].copy(); f = c.astype(float)
    lum = f @ [.3, .59, .11]; mx, mn = f.max(2), f.min(2); sat = (mx - mn) / np.maximum(mx, 1)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    line = (lum < 150) & ~((r > g) & (g > b) & (r - b > 50))  # contorno escuro (não a areia)
    blue = (b > r + 40) & (sat > .3)
    wall = ndimage.binary_dilation(line | blue, iterations=D)
    free = ~wall
    lab, n = ndimage.label(free)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    fg = ~bg
    fg = ndimage.binary_erosion(fg, iterations=max(0, D - 1))
    lab2, n2 = ndimage.label(fg); sizes = ndimage.sum(fg, lab2, range(1, n2 + 1))
    keep = lab2 == (np.argmax(sizes) + 1)
    keep = ndimage.binary_fill_holes(keep)
    a = ndimage.gaussian_filter(keep.astype(float), .6)
    out = np.dstack([c, (a * 255).clip(0, 255).astype(np.uint8)])
    ys, xs = np.where(keep); bb = (max(0, xs.min() - 3), max(0, ys.min() - 3), xs.max() + 4, ys.max() + 4)
    Image.fromarray(out).crop(bb).save(f'poses/{nm}.png')
ns = list(boxes); ims = [Image.open(f'poses/{n}.png') for n in ns]
W = sum(i.width for i in ims) + 10 * len(ims); H = max(i.height for i in ims)
bg = Image.new('RGBA', (W, H), (40, 160, 60, 255)); x = 0
for i in ims: bg.alpha_composite(i, (x, 0)); x += i.width + 10
bg.convert('RGB').save('chk_poses.png')
