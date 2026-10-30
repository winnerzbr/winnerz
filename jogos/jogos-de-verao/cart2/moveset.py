"""Pranchas de movimento (4x2, fundo verde) -> atlas por movimento com âncoras e tela do rosto."""
import numpy as np, json, base64, io
from PIL import Image
from scipy import ndimage
from cc import key_green
A = '/mnt/user-data/attachments/e0bf145e-a626-5d21-b81a-9d762c809f56/'
# nome: (arquivo, nº de quadros, quadro de referência em pé (índice) ou None, de frente?)
S = {
 'idle': ('dec1f2e2', 8, 0, False), 'run': ('940d247f', 8, None, False), 'jump': ('3afd7f25', 8, 0, False),
 'land': ('39ef5a39', 6, 5, False), 'set': ('a49c3df7', 8, 0, False), 'bump': ('a7dac50e', 8, 0, False),
 'serve1': ('fcfe8bce', 8, 0, False), 'serve2': ('87e74182', 8, 7, False), 'spike1': ('ecbc7b79', 8, None, False),
 'spike2': ('34eb5803', 8, None, False), 'dive': ('1e503e71', 8, None, False), 'getup': ('8e400c3f', 6, 5, False),
 'party': ('ea78ed60', 8, 1, True), 'sad': ('b1393716', 6, 0, True), 'turn': ('37a7bd61', 6, 0, False),
}
STAND = 340.0  # altura de pé (pixels guardados, 8 por unidade)
raw = {}
for nm, (f, n, ref, front) in S.items():
    rgba = key_green(A + f + '-image.png'); H, W = rgba.shape[:2]; cw, ch = W / 4, H / 2
    m = rgba[..., 3] > 60; lab, nl = ndimage.label(ndimage.binary_closing(m, iterations=2))
    cells = [[] for _ in range(8)]
    for i, sl in enumerate(ndimage.find_objects(lab)):
        sz = (lab[sl] == i + 1).sum()
        if sz < 150: continue
        ys, xs = np.where(lab[sl] == i + 1); cx, cy = xs.mean() + sl[1].start, ys.mean() + sl[0].start
        cells[int(cy // ch) * 4 + int(cx // cw)].append(i + 1)
    fr = []
    for k in range(n):
        mm = np.isin(lab, cells[k]); ys, xs = np.where(mm)
        x0, y0, x1, y1 = xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3
        im = rgba[y0:y1, x0:x1].copy(); im[..., 3] = np.where(mm[y0:y1, x0:x1], im[..., 3], 0)
        # tela do rosto: maior mancha bem escura na metade de cima
        lum = im[..., :3].astype(float).mean(2); dk = (lum < 55) & (im[..., 3] > 200)
        dk = ndimage.binary_opening(dk, iterations=2); dk = ndimage.binary_fill_holes(ndimage.binary_closing(dk, iterations=3))
        l2, n2 = ndimage.label(dk); scr = None
        if n2:
            sz = ndimage.sum(dk, l2, range(1, n2 + 1)); b = int(np.argmax(sz)) + 1
            yy, xx = np.where(l2 == b); scr = [xx.min(), yy.min(), xx.max() + 1, yy.max() + 1, int(sz[b - 1])]
        f3 = im[..., :3].astype(int); cy_ = (f3[..., 1] > 200) & (f3[..., 2] > 215) & (f3[..., 0] < 150) & (f3[..., 1] > f3[..., 2] * .82) & (im[..., 3] > 200)
        lab_c, nc = ndimage.label(cy_)
        if nc: cy_ = lab_c == (np.argmax(ndimage.sum(cy_, lab_c, range(1, nc + 1))) + 1)
        cy_ = ndimage.binary_opening(cy_, iterations=1); ry = np.where(cy_.any(1))[0]
        ring = (ry.max() - ry.min()) if len(ry) > 5 else None
        fr.append(dict(im=im, x0=x0, y0=y0, row=k // 4, bot=y1 - 3, scr=scr, ring=ring))
    raw[nm] = fr
# altura da tela de pé (referência: parado, quadro 1) -> escala das pranchas sem quadro em pé
def h(fr): return fr['im'].shape[0] - 5
k_idle = STAND / h(raw['idle'][0]); scrH = np.median([q['scr'][3] - q['scr'][1] for q in raw['idle']]) * k_idle
idle0 = raw['idle'][0]; sc0 = idle0['scr']
SCR_Y = ((sc0[1] + sc0[3]) / 2 - h(idle0)) * k_idle  # centro da tela em relação aos pés (negativo)
# deslocamento da tela para a frente do corpo (vista 3/4): centro da tela - centro dos pés
a0 = idle0['im'][..., 3] > 128; ys, xs = np.where(a0[int(a0.shape[0] * .8):]); body_x = xs.mean()
SCR_DX = ((sc0[0] + sc0[2]) / 2 - body_x) * k_idle
RING = np.median([q['ring'] for q in raw['idle'] if q['ring']]) * k_idle
print('anel', RING); print('tela de pé: altura %.1f, centro y %.1f, à frente %.1f' % (scrH, SCR_Y, SCR_DX))
OUT = {'stand': STAND, 'scrY': round(SCR_Y, 1), 'scrDX': round(SCR_DX, 1), 'm': {}}
for nm, (f, n, ref, front) in S.items():
    fr = raw[nm]
    # escala pela altura do anel do fone (peça rígida, do mesmo tamanho em qualquer pose)
    KM = {'run': 1.15, 'spike1': 1.07, 'spike2': 1.08, 'dive': 1.12, 'set': 1.15, 'bump': 1.18}
    k = KM[nm] if nm in KM else STAND / h(fr[ref])
    rowg = {}
    for q in fr: rowg[q['row']] = max(rowg.get(q['row'], 0), q['bot'])
    ims, meta, X = [], [], 0
    for q in fr:
        im = Image.fromarray(q['im']); w2, h2 = max(1, round(im.width * k)), max(1, round(im.height * k))
        ims.append(im.resize((w2, h2), Image.LANCZOS))
        s = q['scr']; cx = ((s[0] + s[2]) / 2) * k if s else w2 / 2; cy = ((s[1] + s[3]) / 2) * k if s else h2 * .3
        meta.append({'x': X, 'w': w2, 'h': h2,
                     'g': round((rowg[q['row']] - q['y0']) * k, 1),  # linha do chão (na prancha) dentro do quadro
                     's': [round(s[0] * k, 1), round(s[1] * k, 1), round(s[2] * k, 1), round(s[3] * k, 1)] if s and s[4] > 300 else None,
                     'c': [round(cx, 1), round(cy, 1)]})
        if nm == 'serve1' and len(meta) <= 3:  # mão aberta da frente (palma para cima): onde a bola fica
            al = np.array(ims[-1])[..., 3] > 128; cols = np.where(al.any(0))[0]; xr = cols.max(); reg = al[:, xr - 34:xr + 1]
            yy = np.where(reg.any(1))[0]; meta[-1]['hd'] = [float(xr - 17), float(yy.min())]
        X += w2 + 2
    atl = Image.new('RGBA', (X, max(i.height for i in ims)), (0, 0, 0, 0))
    for im, mt in zip(ims, meta): atl.paste(im, (mt['x'], 0))
    b = io.BytesIO(); atl.save(b, 'WEBP', quality=84, method=4)
    OUT['m'][nm] = {'src': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), 'f': meta, 'front': front}
    atl.save(f'mv/{nm}.png'); print(nm, 'k=%.2f' % k, atl.size, len(b.getvalue()) // 1024, 'KB')
open('mvset.js', 'w').write('window.MV = ' + json.dumps(OUT) + ';\n'); print(len(open('mvset.js').read()) // 1024, 'KB total')
