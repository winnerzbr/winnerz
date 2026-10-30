"""Moveset aprovado do IAmiguinho -> mv5.js (atlas por animação + máscara da tela do rosto + âncoras)."""
import numpy as np, json, base64, io
from PIL import Image
from scipy import ndimage
from visor import visor, geom, solid
I = json.load(open('mv2/info.json')); Q = .5  # pixels guardados por pixel original (já na escala igualada)
SH = {  # escala de cada prancha: medida automática para a cabeça (IAmiguinho) / a massa (Amiguinho) ficarem do mesmo tamanho
 'bl_land': (0.994, 'linha', 1),
 'bl_getup': (1.094, 'linha', 1),
 'bl_gnd2': (1.009, 'linha', 1),
 'bl_srv4': (1.071, 'linha', 1),
 'bl_spkA': (1.046, 'linha', 1),
 'bl_airA': (1.153, 'linha', 1),
 'bl_jump1': (1.094, 'linha', 1),
 'bl_dive1': (1.121, 'linha', 1),
 'bl_gnd1': (1.007, 'linha', 1),
 'bl_dive3': (1.325, 'linha', 1),
 'bl_srv3': (1.066, 'linha', 1),
 'bl_dive2': (1.275, 'linha', 1),
 'bl_srv2': (1.105, 'linha', 1),
 'bl_spec': (1.034, 'linha', 1),
 'bl_spk1': (1.053, 'linha', 1),
 'bl_srv1': (0.989, 'linha', 1),
 'bl_jump3': (1.036, 'linha', 1),
 'bl_set2': (1.093, 'linha', 1),
 'bl_bump2': (0.995, 'linha', 1),
 'bl_jump2': (1.072, 'linha', 1),
 'bl_set1': (1.022, 'linha', 1),
 'bl_bump1': (1.007, 'linha', 1),
 'bl_back': (1.048, 'linha', 1),
 'bl_turn': (1.02, 'linha', 1),
 'bl_ss': (0.979, 'linha', 1),
 'bl_sad2': (1.109, 'linha', 1),
 'bl_party2': (1.067, 'linha', 1),
 'bl_sad1': (1.011, 'linha', 1),
 'bl_party1': (1.084, 'linha', 1),
 'b_h': (1.0, 'linha', 1),
 'b_g': (0.99, 'linha', 1),
 'b_f': (1.0, 'linha', 1),
 'b_b': (0.993, 'unica', 0.35),
 'b_e': (1.001, 'unica', 0.35),
}
ANIM = {'idle': ['b_h', 'b_g'], 'ready': ['b_f'], 'run': ['b_b', 'b_e'], 'ss': ['bl_ss'], 'back': ['bl_back'], 'turn': ['bl_turn'], 'jump': ['bl_jump1', 'bl_jump2', 'bl_jump3'], 'set': ['bl_set1', 'bl_set2'], 'bump': ['bl_bump1', 'bl_bump2'], 'serve': ['bl_srv1', 'bl_srv2', 'bl_srv3', 'bl_srv4', 'bl_land'], 'spike': ['bl_spk1', 'bl_spkA', 'bl_airA'], 'gnd': ['bl_gnd1', 'bl_gnd2'], 'spec': ['bl_spec'], 'dive': ['bl_dive1', 'bl_dive2', 'bl_dive3', 'bl_getup'], 'party': ['bl_party1', 'bl_party2'], 'sad': ['bl_sad1', 'bl_sad2']}
FRONT = {'party', 'sad'}


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
R0 = np.median([(lambda g: g[2] / g[3])(geom(visor(np.array(Image.open(f'mv2/{nm}_{j}.png')), True)[0])) for nm in ANIM['party'] for j in range(len(I[nm]))])
print('R0', R0)
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
            m, sz = visor(a, True)  # tela inteira: parte escura + borda de vidro iluminada
            s = None; rot = None; area = 0; so = 0
            if m is not None and sz > 900:
                ys, xs = np.where(m); s = [xs.min(), ys.min(), xs.max() + 1, ys.max() + 1]; sizes.append((s[2] - s[0], s[3] - s[1]))
                x0, y0, Wv, Hv, rot = geom(m); area = sz; so = solid(m)
                # cabeça girada para o lado (desenhos olham para a direita): a tela fica mais estreita que de frente;
                # o rosto achata junto e escorrega um pouco para o lado para onde a cabeça vira
                if an not in FRONT and an != 'turn':
                    cy_ = min(1, (Wv / Hv) / R0); sy_ = np.sqrt(max(0, 1 - cy_ * cy_)); x0 += .14 * Wv * sy_ * np.cos(rot); y0 += .14 * Wv * sy_ * np.sin(rot)
                s += [x0, y0, Wv, Hv]
            f = k * Q; w2, h2 = max(1, round(W * f)), max(1, round(H * f))
            rgb = im.resize((w2, h2), Image.LANCZOS)
            mk = Image.fromarray(((ndimage.binary_dilation(m, iterations=1) if m is not None else np.zeros((H, W), bool)) * 255).astype(np.uint8)).resize((w2, h2), Image.BILINEAR)
            hd = None
            if nm in ('bl_srv1', 'bl_srv2'):  # palma da mão da frente (onde a bola fica)
                cols = np.where(al.any(0))[0]; xr = cols.max(); band = al[:, max(0, xr - 14):xr + 1]; yy = np.where(band.any(1))[0]
                y0h, y1h = yy.min(), yy.max(); sub = al[y0h:y1h + 1, max(0, xr - 60):xr + 1]; hx = np.where(sub)[1].mean() + max(0, xr - 60)
                hd = [round(float(hx) * f, 1), round(float(y0h) * f, 1)]
            tiles.append((rgb, mk)); metas.append(dict(w=w2, h=h2, ax=round(ax * f, 1), ay=round(ay * f, 1), s=[round(float(v) * f, 1) for v in s] if s else None, hd=hd, r=None if rot is None else round(float(rot), 3), ar=area, so=so))
        if sizes:
            sw, sh = np.median([z[0] for z in sizes]) * k * Q, np.median([z[1] for z in sizes]) * k * Q
            for mt in metas[-len(fr):]: mt['sz'] = [round(sw, 1), round(sh, 1)]
        # tela muito tapada (mão na frente, boné): a inclinação vem do quadro vizinho mais limpo
        mine = metas[-len(fr):]; big = max([mt['ar'] for mt in mine] + [1]); so0 = .855  # forma da tela abaixo disso = algo na frente
        good = [j for j, mt in enumerate(mine) if mt['r'] is not None and mt['ar'] > big * .7 and mt['so'] >= so0]
        for j, mt in enumerate(mine):
            if mt['r'] is None or mt['ar'] <= big * .7 or mt['so'] < so0:
                gj = min(good, key=lambda g: abs(g - j)) if good else None
                mt['r'] = mine[gj]['r'] if good else 0
                if good and mt['s'] and mine[gj]['s']: mt['s'] = mt['s'][:4] + [(mt['s'][0] + mt['s'][2]) / 2, (mt['s'][1] + mt['s'][3]) / 2] + mine[gj]['s'][6:8]
            mt['r'] = round(float(mt['r']), 3)
        # inclinação suavizada entre quadros vizinhos (a medida oscila uns graus de um desenho para o outro e o rosto tremia)
        rr = [float(mt['r']) for mt in mine]; n_ = len(rr)
        med = [float(np.median(rr[max(0, j - 1):j + 2])) for j in range(n_)]
        for j, mt in enumerate(mine): mt['r'] = round(.25 * med[max(0, j - 1)] + .5 * med[j] + .25 * med[min(n_ - 1, j + 1)], 3)
    X = 0
    for mt in metas: mt['x'] = X; X += mt['w'] + 2; mt.pop('so', None)
    Hh = max(m['h'] for m in metas)
    atl = Image.new('RGBA', (X, Hh), (0, 0, 0, 0)); msk = Image.new('L', (X, Hh), 0)
    for (rgb, mk), mt in zip(tiles, metas): atl.paste(rgb, (mt['x'], 0)); msk.paste(mk, (mt['x'], 0))
    b = io.BytesIO(); atl.save(b, 'WEBP', quality=84, method=5)
    mm = Image.new('RGBA', msk.size, (255, 255, 255, 0)); mm.putalpha(msk); b2 = io.BytesIO(); mm.save(b2, 'WEBP', quality=60, method=5)
    OUT['a'][an] = {'src': 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), 'mask': 'data:image/webp;base64,' + base64.b64encode(b2.getvalue()).decode(), 'front': an in FRONT, 'f': metas}
    print(an, [round(np.degrees(m['r'])) for m in metas], atl.size, len(b.getvalue()) // 1024, 'KB', len(b2.getvalue()) // 1024, 'KB máscara')
open('mvb.js', 'w').write('window.MVB = ' + json.dumps(OUT) + ';\n'); print(len(open('mvb.js').read()) // 1024, 'KB', 'scrh', OUT['scrh'])
