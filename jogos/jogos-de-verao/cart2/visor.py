"""Tela (visor) inteira: a parte escura + a borda lateral iluminada (vidro curvo visto de lado)."""
import numpy as np, cv2
from scipy import ndimage
ROUND = False  # ligado só para as pranchas do skate
def visor(a, blob=False):
    al = a[..., 3] > 200; rgb = a[..., :3].astype(float); lum = rgb.mean(2); H = a.shape[0]
    mx, mn = rgb.max(2), rgb.min(2); sat = (mx - mn) / np.maximum(mx, 1)
    dk = ((lum < 75) & (rgb[..., 2] > rgb[..., 0]) if blob else (lum < 58)) & al; dk[int(H * .75):] = False
    dk = ndimage.binary_opening(dk, iterations=2); lab, n = ndimage.label(dk)
    if not n: return None, 0
    sz = ndimage.sum(dk, lab, range(1, n + 1)); b = int(np.argmax(sz)) + 1
    if ROUND:  # skate: a lixa preta do skate também é escura; a tela é a mancha grande mais redonda (o skate é comprido)
        ok = []
        for i, sl in enumerate(ndimage.find_objects(lab)):
            if sz[i] < sz.max() * .25: continue
            h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
            if max(h, w) / max(1, min(h, w)) < 2.2: ok.append(i)
        if ok: b = max(ok, key=lambda i: sz[i]) + 1
    core = ndimage.binary_fill_holes(ndimage.binary_closing(lab == b, iterations=2))
    # vidro iluminado: tons médios azulados/acinzentados, nem a placa creme nem o azul forte do boné/fone
    plate = (lum > 175) & (sat < .35)
    vivid = (rgb[..., 2] > 200) & (rgb[..., 1] > 90) & (rgb[..., 0] < 90)
    skin = (rgb[..., 0] > 170) & (rgb[..., 0] > rgb[..., 2] + 25)
    glass = al & ~plate & ~vivid & ~skin & (lum < 175)
    m = core.copy()
    for _ in range(14): m = ndimage.binary_dilation(m) & (glass | core)
    m = ndimage.binary_opening(m, iterations=1) | core
    m = ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=3))
    lab, n = ndimage.label(m); b = lab[tuple(np.argwhere(core)[0])]; m = lab == b
    return m, int(core.sum())
def geom(m):
    """centro, inclinação (0 quando a tela é quase redonda) e largura/altura medidas nos eixos da inclinação"""
    ys, xs = np.where(m); x0, y0 = xs.mean(), ys.mean()
    C = np.cov(np.stack([xs - x0, ys - y0])); ev, V = np.linalg.eigh(C)
    v = V[:, 1]; ang = np.arctan2(v[1], v[0])
    if ang > np.pi / 2: ang -= np.pi
    if ang < -np.pi / 2: ang += np.pi
    ratio = np.sqrt(ev[1] / max(ev[0], 1))
    roll = 0.0
    if abs(ang) < .8 and ratio > 1.2:  # eixo maior deitado: a tela é mais larga que alta, dá para ler a inclinação
        roll = ang * min(1, (ratio - 1.2) / .15)
    c, s = np.cos(roll), np.sin(roll); u = (xs - x0) * c + (ys - y0) * s; w = -(xs - x0) * s + (ys - y0) * c
    W = 4 * u.std(); Hh = 4 * w.std()
    return x0, y0, W, Hh, roll
def solid(m):
    """quanto a tela está inteira (mão/braço na frente deixa a forma 'mordida')"""
    c = max(cv2.findContours(m.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)
    return float(m.sum() / max(1, cv2.contourArea(cv2.convexHull(c))))
