"""Quadros intermediários (30/10/2026): entre dois desenhos parecidos de uma animação, um quadro do meio feito por fluxo óptico.
O jogo mostra o do meio na primeira metade de cada troca de quadro, então o movimento fica com o dobro de quadros e para de tremer.
Só entre desenhos parecidos (respiração, espera, toque...): em movimentos grandes o quadro do meio sairia borrado, então não entra."""
import numpy as np, io, base64, cv2
from PIL import Image

def _flow(a, b):
    ga = cv2.addWeighted(cv2.cvtColor(a, cv2.COLOR_RGBA2GRAY), .6, a[..., 3], .4, 0)
    gb = cv2.addWeighted(cv2.cvtColor(b, cv2.COLOR_RGBA2GRAY), .6, b[..., 3], .4, 0)
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    return dis.calc(ga, gb, None)

def _warp(img, flow, t):
    H, W = flow.shape[:2]; gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    return cv2.remap(img, gx + flow[..., 0] * t, gy + flow[..., 1] * t, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)

def tween(a, b, ma, mb):
    """a, b: RGBA alinhados; ma, mb: máscaras (L) da tela do rosto. Devolve RGBA e máscara do meio."""
    fab, fba = _flow(a, b), _flow(b, a)
    wa, wb = _warp(a, fba, .5).astype(np.float32), _warp(b, fab, .5).astype(np.float32)
    aa, ab = wa[..., 3:] / 255, wb[..., 3:] / 255; al = (aa + ab) / 2
    rgb = (wa[..., :3] * aa + wb[..., :3] * ab) / np.maximum(aa + ab, 1e-3)
    A = np.clip((al[..., 0] * 255 - 60) * 255 / 120, 0, 255)
    out = np.dstack([np.clip(rgb, 0, 255), A]).astype(np.uint8)
    m = ((_warp(ma, fba, .5).astype(np.float32) + _warp(mb, fab, .5).astype(np.float32)) / 2).astype(np.uint8)
    # onde os dois desenhos levados ao meio não concordam (um tem tinta, o outro não) fica fantasma: mede quanto
    dis = (np.abs(aa - ab)[..., 0] > .5).sum() / max(1, ((aa + ab)[..., 0] > .5).sum())
    both = (aa[..., 0] > .5) & (ab[..., 0] > .5); cd = np.abs(wa[..., :3] - wb[..., :3]).max(2)
    dis = max(dis, .6 * (cd[both] > 70).mean() if both.any() else 1)  # por dentro: mãos e contornos que não se encontram
    return out, m, dis

def _place(tile, mt, OX, OY, Wc, Hc):
    rgb, mk = tile; c = np.zeros((Hc, Wc, 4), np.uint8); m = np.zeros((Hc, Wc), np.uint8)
    x0, y0 = int(round(OX - mt['ax'])), int(round(OY - mt['ay'])); a = np.array(rgb.convert('RGBA')); k = np.array(mk)
    c[y0:y0 + a.shape[0], x0:x0 + a.shape[1]] = a; m[y0:y0 + k.shape[0], x0:x0 + k.shape[1]] = k
    return c, m, x0, y0

def add_mids(tiles, metas, loop=False, thr=.8):
    n = len(metas); mids = [None] * n; mt_out = []; im_out = []
    pairs = [(j, j + 1) for j in range(n - 1)] + ([(n - 1, 0)] if loop and n > 2 else [])
    for j, k in pairs:
        A, B = metas[j], metas[k]
        if not A.get('s') or not B.get('s') or not A.get('sz') or not B.get('sz'): continue
        pad = 8; OX = max(A['ax'], B['ax']) + pad; OY = max(A['ay'], B['ay']) + pad
        Wc = int(OX + max(A['w'] - A['ax'], B['w'] - B['ax']) + pad); Hc = int(OY + max(A['h'] - A['ay'], B['h'] - B['ay']) + pad)
        ca, ma, xa, ya = _place(tiles[j], A, OX, OY, Wc, Hc); cb, mb, xb, yb = _place(tiles[k], B, OX, OY, Wc, Hc)
        sa, sb = ca[..., 3] > 100, cb[..., 3] > 100; iou = (sa & sb).sum() / max(1, (sa | sb).sum())
        if iou < thr: continue
        out, m, dis = tween(ca, cb, ma, mb)
        if dis > .05: continue
        ys, xs = np.where(out[..., 3] > 0)
        if not len(xs): continue
        cx0, cy0, cx1, cy1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        out = out[cy0:cy1, cx0:cx1]; m = m[cy0:cy1, cx0:cx1]
        def mv(s, x0, y0): return [s[0] + x0, s[1] + y0, s[2] + x0, s[3] + y0] + ([s[4] + x0, s[5] + y0, s[6], s[7]] if len(s) > 4 else [])
        s = [(u + v) / 2 for u, v in zip(mv(A['s'], xa, ya), mv(B['s'], xb, yb))]
        s = [v - (cx0 if q in (0, 2, 4) else cy0 if q in (1, 3, 5) else 0) for q, v in enumerate(s)]
        ra, rb = A.get('r') or 0, B.get('r') or 0
        meta = dict(w=int(cx1 - cx0), h=int(cy1 - cy0), ax=round(OX - cx0, 1), ay=round(OY - cy0, 1), s=[round(float(v), 1) for v in s],
                    r=round((ra + rb) / 2, 3), sz=[round((u + v) / 2, 1) for u, v in zip(A['sz'], B['sz'])])
        if A.get('hd') and B.get('hd'): meta['hd'] = [round((A['hd'][0] + xa + B['hd'][0] + xb) / 2 - cx0, 1), round((A['hd'][1] + ya + B['hd'][1] + yb) / 2 - cy0, 1)]
        for key in ('inv',):
            if key in A: meta[key] = A[key]
        mids[j] = len(mt_out); mt_out.append(meta); im_out.append((Image.fromarray(out), Image.fromarray(m)))
    if not mt_out: return {}
    X = 0
    for mt in mt_out: mt['x'] = X; X += mt['w'] + 2
    Hh = max(m['h'] for m in mt_out); atl = Image.new('RGBA', (X, Hh), (0, 0, 0, 0)); msk = Image.new('L', (X, Hh), 0)
    for (rgb, mk), mt in zip(im_out, mt_out): atl.paste(rgb, (mt['x'], 0)); msk.paste(mk, (mt['x'], 0))
    b = io.BytesIO(); atl.save(b, 'WEBP', quality=84, method=5)
    mm = Image.new('RGBA', msk.size, (255, 255, 255, 0)); mm.putalpha(msk); b2 = io.BytesIO(); mm.save(b2, 'WEBP', quality=60, method=5)
    return {'m': [None if v is None else mt_out[v] for v in mids], 'msrc': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(),
            'mmask': 'data:image/webp;base64,' + base64.b64encode(b2.getvalue()).decode(), '_n': len(mt_out)}
