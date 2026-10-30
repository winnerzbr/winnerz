"""Recorta pranchas 4x2 (caminhos de arquivo) em quadros mv2/<nome>_<k>.png e junta as medidas em mv2/info.json."""
import numpy as np, sys, json, os
from PIL import Image
from scipy import ndimage
sys.path.insert(0, '.'); from cc import key_green
S = json.loads(sys.argv[1]); info = json.load(open('mv2/info.json')) if os.path.exists('mv2/info.json') else {}
for nm, path in S.items():
    rgba = key_green(path); H, W = rgba.shape[:2]; cw, ch = W / 4, H / 2
    m = rgba[..., 3] > 60; lab, _ = ndimage.label(ndimage.binary_closing(m, iterations=2))
    cells = [[] for _ in range(8)]
    for i, sl in enumerate(ndimage.find_objects(lab)):
        if (lab[sl] == i + 1).sum() < 150: continue
        ys, xs = np.where(lab[sl] == i + 1)
        cells[min(7, int((ys.mean() + sl[0].start) // ch) * 4 + int((xs.mean() + sl[1].start) // cw))].append(i + 1)
    fr = []
    for k in range(8):
        if not cells[k]: break
        mm = np.isin(lab, cells[k]); ys, xs = np.where(mm); r = k // 4
        im = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy(); im[..., 3] = np.where(mm[ys.min():ys.max() + 1, xs.min():xs.max() + 1], im[..., 3], 0)
        Image.fromarray(im).save(f'mv2/{nm}_{k}.png')
        fr.append(dict(h=int(ys.max() - ys.min()), bot=int(ys.max() - r * ch), top=int(ys.min() - r * ch), cx=float(xs.mean() - (k % 4) * cw), edge=bool(xs.min() % cw < 4 or (xs.max() % cw) > cw - 4)))
    info[nm] = fr
    print(nm, len(fr), 'altura', [q['h'] for q in fr], 'chão', [q['bot'] for q in fr], 'borda' if any(q['edge'] for q in fr) else '')
json.dump(info, open('mv2/info.json', 'w'))
