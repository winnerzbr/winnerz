"""Moveset aprovado do IAmiguinho -> mv5.js (atlas por animação + máscara da tela do rosto + âncoras)."""
import numpy as np, json, base64, io
from PIL import Image
from scipy import ndimage
I = json.load(open('mv2/info.json')); Q = .5  # pixels guardados por pixel original (já na escala igualada)
SH = {'b_h': (1, 'linha', 1), 'b_g': (1, 'linha', 1), 'b_f': (1, 'linha', 1), 'b_b': (1, 'unica', .35), 'b_e': (1, 'unica', .35)}
ANIM = {'idle': ['b_h', 'b_g'], 'ready': ['b_f'], 'run': ['b_b', 'b_e']}
FRONT = set()

def screen(a):
    al = a[..., 3] > 200; lum = a[..., :3].astype(float).mean(2); H = a.shape[0]
    dk = (lum < 75) & (a[..., 2].astype(int) > a[..., 0].astype(int)) & al; dk[int(H * .75):] = False
    dk = ndimage.binary_opening(dk, iterations=2); lab, n = ndimage.label(dk)
    if not n: return None, None
    sz = ndimage.sum(dk, lab, range(1, n + 1)); b = int(np.argmax(sz)) + 1
    m = ndimage.binary_fill_holes(ndimage.binary_closing(lab == b, iterations=2))
    return m, int(sz[b - 1])
# altura do centro da tela acima dos pés, em pé (parado, quadro 1)
a0 = np.array(Image.open('mv2/b_h_0.png')); m0, _ = screen(a0); ys0 = np.where(m0.any(1))[0]
SCRH = (I['b_h'][0]['h'] - (ys0.min() + ys0.max()) / 2)
OUT = {'q': Q, 'scrh': round(SCRH * Q, 1), 'a': {}}
for an, sheets in ANIM.items():
    tiles, metas = [], []
    for nm in sheets:
        k, chao, pulo = SH[nm]; fr = I[nm]; g = [max(q['bot'] for q in fr[:4]), max(q['bot'] for q in fr[4:])]
        if chao == 'unica': g = [g[0], g[0]]
        sizes = []
        for j, q in enumerate(fr):
            im = Image.open(f'mv2/{nm}_{j}.png'); a = np.array(im); H, W = a.shape[:2]
            al = a[..., 3] > 100; hx = np.where(al[:int(H * .45)].any(0))[0]
            ax = (hx.min() + hx.max()) / 2 if W < H * 1.2 else W * .55
            ay = H + (g[j // 4] - q['bot']) * pulo
            m, sz = screen(a)
            s = None; rot = None; area = 0
            if m is not None and sz > 900:
                ys, xs = np.where(m); s = [xs.min(), ys.min(), xs.max() + 1, ys.max() + 1]; sizes.append((s[2] - s[0], s[3] - s[1]))
                # inclinação da tela: eixo maior da elipse (momentos de segunda ordem)
                x0, y0 = xs.mean(), ys.mean(); mu20 = ((xs - x0) ** 2).mean(); mu02 = ((ys - y0) ** 2).mean(); mu11 = ((xs - x0) * (ys - y0)).mean()
                rot = .5 * np.arctan2(2 * mu11, mu20 - mu02); area = int(m.sum())
                if abs(rot) > 1.2: rot = None
                s += [x0, y0]
            f = k * Q; w2, h2 = max(1, round(W * f)), max(1, round(H * f))
            rgb = im.resize((w2, h2), Image.LANCZOS)
            mk = Image.fromarray(((ndimage.binary_dilation(m, iterations=1) if m is not None else np.zeros((H, W), bool)) * 255).astype(np.uint8)).resize((w2, h2), Image.BILINEAR)
            hd = None
            if False:  # palma da mão da frente (onde a bola fica)
                cols = np.where(al.any(0))[0]; xr = cols.max(); reg = al[:, max(0, xr - 40):xr + 1]; yy = np.where(reg.any(1))[0]
                hd = [round((xr - 20) * f, 1), round(yy.min() * f, 1)]
            tiles.append((rgb, mk)); metas.append(dict(w=w2, h=h2, ax=round(ax * f, 1), ay=round(ay * f, 1), s=[round(float(v) * f, 1) for v in s] if s else None, hd=hd, r=None if rot is None else round(float(rot), 3), ar=area))
        if sizes:
            sw, sh = np.median([z[0] for z in sizes]) * k * Q, np.median([z[1] for z in sizes]) * k * Q
            for mt in metas[-len(fr):]: mt['sz'] = [round(sw, 1), round(sh, 1)]
        # tela muito tapada (mão na frente, boné): a inclinação vem do quadro vizinho mais limpo
        mine = metas[-len(fr):]; big = max([mt['ar'] for mt in mine] + [1])
        good = [j for j, mt in enumerate(mine) if mt['r'] is not None and mt['ar'] > big * .6]
        for j, mt in enumerate(mine):
            if mt['r'] is None or mt['ar'] <= big * .6:
                mt['r'] = mine[min(good, key=lambda g: abs(g - j))]['r'] if good else 0
            mt['r'] = round(float(mt['r']), 3)
    X = 0
    for mt in metas: mt['x'] = X; X += mt['w'] + 2
    Hh = max(m['h'] for m in metas)
    atl = Image.new('RGBA', (X, Hh), (0, 0, 0, 0)); msk = Image.new('L', (X, Hh), 0)
    for (rgb, mk), mt in zip(tiles, metas): atl.paste(rgb, (mt['x'], 0)); msk.paste(mk, (mt['x'], 0))
    b = io.BytesIO(); atl.save(b, 'WEBP', quality=84, method=5)
    mm = Image.new('RGBA', msk.size, (255, 255, 255, 0)); mm.putalpha(msk); b2 = io.BytesIO(); mm.save(b2, 'WEBP', quality=60, method=5)
    OUT['a'][an] = {'src': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), 'mask': 'data:image/webp;base64,' + base64.b64encode(b2.getvalue()).decode(), 'front': an in FRONT, 'f': metas}
    print(an, [round(np.degrees(m['r'])) for m in metas], atl.size, len(b.getvalue()) // 1024, 'KB', len(b2.getvalue()) // 1024, 'KB máscara')
open('mvb.js', 'w').write('window.MVB = ' + json.dumps(OUT) + ';\n'); print(len(open('mvb.js').read()) // 1024, 'KB', 'scrh', OUT['scrh'])
