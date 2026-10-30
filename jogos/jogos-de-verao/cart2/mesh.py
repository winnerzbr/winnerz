"""Poses inteiras do IAmiguinho: cada desenho vira uma malha de triângulos com ossos (pesos automáticos)."""
import numpy as np, cv2, json, base64, io, math
from PIL import Image
from scipy import ndimage
F = .733  # pixels do recorte -> pixels guardados (8 por unidade)
BONES = ['tronco', 'cabeca', 'A_braco', 'A_ante', 'A_mao', 'B_braco', 'B_ante', 'B_mao', 'A_coxa', 'A_canela', 'A_pe', 'B_coxa', 'B_canela', 'B_pe']
PARENT = [-1, 0, 0, 2, 3, 0, 5, 6, 0, 8, 9, 0, 11, 12]
# juntas em pixels do recorte: hip, neck, top, shA elA wrA hdA, shB elB wrB hdB, hpA knA anA ftA, hpB knB anB ftB
J = {
 'tres4': dict(hip=(128,300), neck=(128,210), top=(130,40), shA=(95,228), elA=(78,262), wrA=(65,290), hdA=(55,335), shB=(163,228), elB=(185,262), wrB=(205,290), hdB=(225,335),
               hpA=(110,300), knA=(102,345), anA=(100,388), ftA=(85,442), hpB=(150,300), knB=(160,345), anB=(170,388), ftB=(205,442), sole=470, scr=(160,140,110), order='B_braco B_ante B_mao B_coxa B_canela B_pe A_coxa A_canela A_pe tronco cabeca A_braco A_ante A_mao'),
 'corre': dict(hip=(228,292), neck=(262,200), top=(285,70), shA=(228,188), elA=(168,180), wrA=(128,183), hdA=(78,208), shB=(272,215), elB=(302,235), wrB=(330,245), hdB=(368,235),
               hpA=(215,300), knA=(152,300), anA=(112,300), ftA=(58,318), hpB=(240,300), knB=(258,322), anB=(278,348), ftB=(335,382), sole=430, scr=(300,145,92), order='B_braco B_ante B_mao A_coxa A_canela A_pe tronco B_coxa B_canela B_pe cabeca A_braco A_ante A_mao'),
 'corta': dict(hip=(218,288), neck=(208,178), top=(160,45), shA=(232,188), elA=(258,148), wrA=(295,100), hdA=(318,45), shB=(178,198), elB=(125,210), wrB=(95,215), hdB=(42,240),
               hpA=(215,285), knA=(178,290), anA=(135,298), ftA=(100,296), hpB=(225,300), knB=(208,338), anB=(178,345), ftB=(160,365), sole=None, scr=(205,108,100), order='B_braco B_ante B_mao B_coxa B_canela B_pe A_coxa A_canela A_pe tronco cabeca A_braco A_ante A_mao'),
 'mergulho': dict(hip=(232,218), neck=(318,215), top=(360,75), shA=(330,240), elA=(390,242), wrA=(432,246), hdA=(500,240), shB=(330,200), elB=(392,196), wrB=(460,196), hdB=(512,190),
               hpA=(232,212), knA=(160,205), anA=(115,195), ftA=(65,180), hpB=(232,240), knB=(170,255), anB=(130,262), ftB=(92,268), sole=None, scr=(395,142,100), order='B_braco B_ante B_mao B_coxa B_canela B_pe A_coxa A_canela A_pe tronco cabeca A_braco A_ante A_mao'),
 'frente': dict(hip=(148,300), neck=(148,210), top=(148,40), shA=(110,226), elA=(92,265), wrA=(80,292), hdA=(70,332), shB=(188,226), elB=(206,265), wrB=(218,292), hdB=(230,332),
               hpA=(126,300), knA=(121,345), anA=(118,388), ftA=(110,442), hpB=(172,300), knB=(177,345), anB=(180,388), ftB=(190,442), sole=470, scr=(148,138,125), order='tronco A_coxa A_canela A_pe B_coxa B_canela B_pe A_braco A_ante A_mao B_braco B_ante B_mao cabeca'),
}
SEG = {'tronco': ('hip', 'neck'), 'cabeca': ('neck', 'top'), 'A_braco': ('shA', 'elA'), 'A_ante': ('elA', 'wrA'), 'A_mao': ('wrA', 'hdA'), 'B_braco': ('shB', 'elB'), 'B_ante': ('elB', 'wrB'), 'B_mao': ('wrB', 'hdB'),
       'A_coxa': ('hpA', 'knA'), 'A_canela': ('knA', 'anA'), 'A_pe': ('anA', 'ftA'), 'B_coxa': ('hpB', 'knB'), 'B_canela': ('knB', 'anB'), 'B_pe': ('anB', 'ftB')}
def segdist(P, a, b):
    a, b = np.array(a, float), np.array(b, float); d = b - a; t = np.clip(((P - a) @ d) / (d @ d), 0, 1)
    return np.linalg.norm(P - (a + t[:, None] * d), axis=1)
def no_eyes(a, scr):
    cx, cy, w = scr; x0, x1, y0, y1 = int(cx - w * .75), int(cx + w * .75), int(cy - w * .7), int(cy + w * .7)
    sub = a[y0:y1, x0:x1].astype(float); lum = sub[..., :3].mean(2)
    eye = (sub[..., 1] > 110) & (sub[..., 2] > 140) & (sub[..., 0] < 160)
    scrm = ((lum < 90) | eye) & (sub[..., 3] > 200)
    scrm = ndimage.binary_opening(scrm, iterations=2); scrm = ndimage.binary_fill_holes(ndimage.binary_closing(scrm, iterations=4))
    lab, n = ndimage.label(scrm); big = np.argmax(ndimage.sum(scrm, lab, range(1, n + 1))) + 1; scrm = lab == big
    inner = ndimage.binary_erosion(scrm, iterations=4); H = sub.shape[0]; yy = (np.arange(H)[:, None] / H) + 0 * inner
    col = np.dstack([14 + 10 * yy, 18 + 14 * yy, 34 + 26 * yy]); soft = ndimage.gaussian_filter(inner.astype(float), 1.4)[..., None]
    sub[..., :3] = sub[..., :3] * (1 - soft) + col * soft; a[y0:y1, x0:x1] = sub.clip(0, 255).astype(np.uint8)
    ys, xs = np.where(scrm); return [(xs.mean() + x0), (ys.mean() + y0), xs.max() - xs.min(), ys.max() - ys.min()]
out = {}
for nm, j in J.items():
    im = np.array(Image.open(f'poses5/{nm}.png').convert('RGBA'))
    if nm == 'corre':  # mancha de areia embaixo dos tênis
        f = im.astype(float); r, g, b = f[..., 0], f[..., 1], f[..., 2]; mx, mn = f[..., :3].max(2), f[..., :3].min(2)
        bad = (r > b + 8) & ((mx - mn) / np.maximum(mx, 1) < .55) & (mx < 215); bad[:380] = False
        im[..., 3] = np.where(bad, 0, im[..., 3])
    if nm == 'mergulho':
        f = im.astype(float); r, g, b = f[..., 0], f[..., 1], f[..., 2]; bad = (r > b + 30) & (r > 150); bad[:, 140:] = False; im[..., 3] = np.where(bad, 0, im[..., 3])
    sc = no_eyes(im, j['scr'])
    h, w = im.shape[:2]; W2, H2 = round(w * F), round(h * F)
    im2 = np.array(Image.fromarray(im).resize((W2, H2), Image.LANCZOS))
    P = lambda k: (j[k][0] * F, j[k][1] * F)
    # malha: grade em cima da silhueta (com folga)
    m = ndimage.binary_dilation(im2[..., 3] > 10, iterations=4)
    step = 7; xs = np.arange(0, W2 + step, step); ys = np.arange(0, H2 + step, step)
    vid = -np.ones((len(ys), len(xs)), int); V = []
    cell = lambda x, y: m[min(H2 - 1, y):min(H2, y + step), min(W2 - 1, x):min(W2, x + step)].any()
    tris = []
    for yi in range(len(ys) - 1):
        for xi in range(len(xs) - 1):
            if not cell(xs[xi], ys[yi]): continue
            q = []
            for (a, b) in [(0, 0), (1, 0), (1, 1), (0, 1)]:
                if vid[yi + b, xi + a] < 0: vid[yi + b, xi + a] = len(V); V.append((xs[xi + a], ys[yi + b]))
                q.append(vid[yi + b, xi + a])
            tris.append((q[0], q[1], q[2], (xs[xi] + step / 2, ys[yi] + step / 2))); tris.append((q[0], q[2], q[3], (xs[xi] + step / 2, ys[yi] + step / 2)))
    V = np.array(V, float)
    D = np.stack([segdist(V, P(SEG[b][0]), P(SEG[b][1])) for b in BONES], 1)
    # um vértice só pertence a um braço/perna se estiver dentro da "grossura" dele (senão fica com tronco/cabeça)
    RAD = {'braco': 24, 'ante': 24, 'mao': 48, 'coxa': 26, 'canela': 26, 'pe': 62}
    for k, b in enumerate(BONES):
        if '_' in b: D[:, k] = np.where(D[:, k] > RAD[b.split('_')[1]], 1e6, D[:, k])
    # pesos: os ossos mais perto, com transição suave (mais suave no tronco/cabeça)
    dmin = D.min(1, keepdims=True); Wt = np.exp(-((D - dmin) / 5.0) ** 2) * (D - dmin < 9)
    Wt /= Wt.sum(1, keepdims=True)
    # cada triângulo pertence a uma parte (o osso mais perto do centro); os vértices são copiados por parte,
    # e cada cópia só escuta ossos vizinhos daquela parte. Parado, tudo encaixa; mexendo, uma parte não arrasta a outra.
    order = j['order'].split(); rank = {b: order.index(b) for b in BONES}
    C = np.array([t[3] for t in tris]); DC = np.stack([segdist(C, P(SEG[b][0]), P(SEG[b][1])) for b in BONES], 1)
    for k, b in enumerate(BONES):
        if '_' in b: DC[:, k] = np.where(DC[:, k] > RAD[b.split('_')[1]], 1e6, DC[:, k])
    part = DC.argmin(1)
    NB = len(BONES); near = {L: {L} | {k for k in range(NB) if PARENT[k] == L} | ({PARENT[L]} if PARENT[L] >= 0 else set()) | ({0, 1} if L < 2 else set()) for L in range(NB)}
    copy = {}; V2 = []; BI = []; BW = []; T = []
    for k in sorted(range(len(tris)), key=lambda k: rank[BONES[part[k]]]):
        L = part[k]; tri = []
        for vi in tris[k][:3]:
            key = (vi, L)
            if key not in copy:
                w = Wt[vi].copy(); mask = np.zeros(NB); mask[list(near[L])] = 1; w *= mask
                if w.sum() < 1e-6: w = np.zeros(NB); w[L] = 1
                w /= w.sum(); top = np.argsort(-w)[:3]; ww = w[top] / w[top].sum()
                copy[key] = len(V2); V2.append(V[vi]); BI.append(top); BW.append(ww)
            tri.append(copy[key])
        T.append(tri)
    V = np.array(V2); idx = np.array(BI); ws = np.array(BW)
    b = io.BytesIO(); Image.fromarray(im2).save(b, 'WEBP', quality=90, method=6)
    sole = (j['sole'] if j['sole'] else j['hip'][1] + 170) * F
    out[nm] = {'src': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), 'w': W2, 'h': H2,
               'v': [round(x, 1) for p in V for x in p], 't': [int(x) for t in T for x in t],
               'bi': [int(x) for x in idx.ravel()], 'bw': [round(float(x), 3) for x in ws.ravel()],
               'j': {k: [round(j[k][0] * F, 1), round(j[k][1] * F, 1)] for k in j if isinstance(j[k], tuple) and len(j[k]) == 2},
               'sole': round(sole, 1), 'scr': [round(sc[0] * F, 1), round(sc[1] * F, 1), round(sc[2] * F, 1), round(sc[3] * F, 1)]}
    print(nm, W2, H2, 'vértices', len(V), 'triângulos', len(T))
open('iaposes.js', 'w').write('window.C2P = ' + json.dumps({'bones': BONES, 'parent': PARENT, 'seg': SEG, 'poses': out}) + ';\n')
print(len(open('iaposes.js').read()) // 1024, 'KB')
