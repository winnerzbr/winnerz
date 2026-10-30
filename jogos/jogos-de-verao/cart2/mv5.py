"""Moveset aprovado do IAmiguinho -> mv5.js (atlas por animação + máscara da tela do rosto + âncoras)."""
import numpy as np, json, base64, io
from PIL import Image
from mids import add_mids
from scipy import ndimage
from visor import visor, geom, solid
I = json.load(open('mv2/info.json')); Q = .5  # pixels guardados por pixel original (já na escala igualada)
SH = {  # escala: cabeça igualada (mediana de 3 medidas); pranchas com corpo fora do modelo usam o meio-termo cabeça/corpo (kmix.py)
 'idleA': (1.0, 'linha', 1),
 'idleB': (1.001, 'linha', 1),
 'v2_readyD': (0.86, 'linha', 1),
 'v2_readyU': (0.866, 'linha', 1),
 'v2_dive1': (0.91, 'linha', 1),
 'v2_dive2': (0.915, 'linha', 1),
 'v2_dive3': (0.89, 'linha', 1),
 'v2_getup': (0.87, 'linha', 1),
 'v2_party1': (0.74, 'linha', 1),
 'v2_party2': (0.77, 'linha', 1),
 'v2_sad1': (0.845, 'linha', 1),
 'v2_sad2': (0.81, 'linha', 1),
 'v2_set1': (0.829, 'linha', 1),
 'v2_set2': (0.82, 'linha', 1),
 'v2_bump1': (0.852, 'linha', 1),
 'v2_bump2': (0.858, 'linha', 1),
 'v2_serve1': (0.87, 'linha', 1),
 'v2_serve2': (0.867, 'linha', 1),
 'v2_serve3': (0.852, 'linha', 1),
 'v2_serve4': (0.925, 'linha', 1),
 'v2_serve5': (0.9, 'linha', 1),
 'v2_spk1': (0.836, 'linha', 1),
 'v2_spk2': (0.909, 'linha', 1),
 'v2_spk3': (0.874, 'linha', 1),
 'v2_gnd1': (0.853, 'linha', 1),
 'v2_gnd2': (0.863, 'linha', 1),
 'v2_gndwF': (0.828, 'linha', 1),
 'v2_gndwB': (0.838, 'linha', 1),
 'v2_spec': (0.88, 'linha', 1),
 'v2_jump3': (0.883, 'linha', 1),
 'v2_jump2': (0.883, 'linha', 1),
 'v2_jump1': (0.883, 'linha', 1),
 'v2_turn': (0.88, 'linha', 1),
 'v2_back': (0.883, 'linha', 1),
 'v2_ss': (0.903, 'linha', 1),
 'v2_runB': (0.945, 'unica', 0.35),
 'v2_runA': (0.945, 'unica', 0.35),
 'v2_ready': (0.87, 'linha', 1),
 'v2_idleA': (0.87, 'linha', 1),
 'v2_idleB': (0.87, 'linha', 1),
 'ready': (0.99, 'linha', 1),
 'run2A': (np.float64(1.002), 'unica', 0.35),
 'run2B': (np.float64(1.011), 'unica', 0.35),
 'startstop': (0.996, 'linha', 1),
 'back': (1.011, 'linha', 1),
 'turn': (0.993, 'linha', 1),
 'jump1': (1.009, 'linha', 1),
 'jump2': (1.068, 'linha', 1),
 'jump3': (1.132, 'linha', 1),
 'set1': (0.971, 'linha', 1),
 'set2': (0.897, 'linha', 1),
 'bump1': (1.021, 'linha', 1),
 'bump2': (0.945, 'linha', 1),
 'serve1': (1.016, 'linha', 1),
 'serve2': (1.016, 'linha', 1),
 'serve3': (np.float64(1.006), 'linha', 1),
 'serve4': (np.float64(0.981), 'linha', 1),
 'serve5': (0.971, 'linha', 1),
 'spk1': (0.926, 'linha', 1),
 'spk2': (np.float64(1.149), 'linha', 1),
 'spk3': (np.float64(1.092), 'linha', 1),
 'gnd1': (1.191, 'linha', 1),
 'gnd2': (1.112, 'linha', 1),
 'specB': (np.float64(0.996), 'linha', 1),
 'dive1': (0.978, 'linha', 1),
 'dive2': (0.993, 'linha', 1),
 'dive3': (0.98, 'linha', 1),
 'getup': (np.float64(1.078), 'linha', 1),
 'party1': (0.848, 'linha', 1),
 'party2': (1.035, 'linha', 1),
 'sad1': (0.901, 'linha', 1),
 'sad2': (0.981, 'linha', 1),
}
ANIM = {'idle': ['v2_idleA', 'v2_idleB'], 'ready': ['v2_ready'], 'readyU': ['v2_readyU'], 'readyD': ['v2_readyD'], 'run': ['v2_runA', 'v2_runB'], 'ss': ['v2_ss'], 'back': ['v2_back'], 'turn': ['v2_turn'],
        'jump': ['v2_jump1', 'v2_jump2', 'v2_jump3'], 'set': ['v2_set1', 'v2_set2'], 'bump': ['v2_bump1', 'v2_bump2'], 'serve': ['v2_serve1', 'v2_serve2', 'v2_serve3', 'v2_serve4', 'v2_serve5'],
        'spike': ['v2_spk1', 'v2_spk2', 'v2_spk3'], 'gnd': ['v2_gnd1', 'v2_gnd2'], 'spec': ['v2_spec'], 'dive': ['v2_dive1', 'v2_dive2', 'v2_dive3', 'v2_getup'],
        'gndw': ['v2_gndwF', 'v2_gndwB'], 'party': ['v2_party1', 'v2_party2'], 'sad': ['v2_sad1', 'v2_sad2']}
FRONT = {'party', 'sad'}
def screen(a):
    al = a[..., 3] > 200; lum = a[..., :3].astype(float).mean(2); H = a.shape[0]
    dk = (lum < 58) & al; dk[int(H * .75):] = False
    dk = ndimage.binary_opening(dk, iterations=2); lab, n = ndimage.label(dk)
    if not n: return None, None
    sz = ndimage.sum(dk, lab, range(1, n + 1)); b = int(np.argmax(sz)) + 1
    m = ndimage.binary_fill_holes(ndimage.binary_closing(lab == b, iterations=2))
    return m, int(sz[b - 1])
# altura do centro da tela acima dos pés, em pé (parado, quadro 1)
a0 = np.array(Image.open('mv2/idleA_0.png')); m0, _ = screen(a0); ys0 = np.where(m0.any(1))[0]
SCRH = (I['idleA'][0]['h'] - (ys0.min() + ys0.max()) / 2)
R0 = np.median([(lambda g: g[2] / g[3])(geom(visor(np.array(Image.open(f'mv2/{nm}_{j}.png')), False)[0])) for nm in ANIM['party'] for j in range(len(I[nm]))])
print('R0', R0)

# pranchas novas (v2): o ChatGPT às vezes desenha a cabeça maior ou menor de um quadro para outro.
# Cada quadro ganha um ajuste próprio para a cabeça ficar do tamanho da mediana da prancha (no máximo ±12%).
def frame_fix(nm):
    if not nm.startswith(('v2_', 'sk_')): return [1.0] * len(I[nm])
    from regua import metrics
    M = [metrics(np.array(Image.open(f'mv2/{nm}_{j}.png'))) for j in range(len(I[nm]))]
    med = {k: float(np.median([m[k] for m in M if k in m])) for k in ('visor', 'circ', 'fone') if any(k in m for m in M)}
    hd = []  # cabeça de cada quadro em relação à mediana da prancha (mediana das medidas disponíveis)
    for m in M:
        ks = ('visor', 'circ', 'fone') if 'visor' in m else ('circ',)
        rs = [m[k] / med[k] for k in ks if k in med and k in m and m[k] > 0]
        hd.append(float(np.median(rs)) if rs else None)
    ref = float(np.median([h for h in hd if h])) if any(hd) else 1.0
    out = []
    for h in hd:
        r = ref / h if h else 1.0
        out.append(float(np.clip(r, .88, 1.12)) if abs(r - 1) > .02 else 1.0)
    return out
ALIGN = {'v2_readyU': 'v2_ready', 'v2_readyD': 'v2_ready'}
def build(ANIM, SH, FRONT, ALIGN, var, path, AXB=(), HEAD=(), mids=False):
    OUT = {'q': Q, 'scrh': round(SCRH * Q, 1), 'a': {}}
    for an, sheets in ANIM.items():
        tiles, metas = [], []
        for nm in sheets:
            k, chao, pulo = SH[nm]; fr = I[nm]; g = [max(q['bot'] for q in fr[:4]), max(q['bot'] for q in fr[4:])]
            if chao == 'unica': g = [g[0], g[0]]
            sizes = []
            FF = frame_fix(nm)
            for j, q in enumerate(fr):
                im = Image.open(f'mv2/{nm}_{j}.png'); a = np.array(im); H, W = a.shape[:2]
                al = a[..., 3] > 100; hx = np.where(al[:int(H * .45)].any(0))[0]
                ax = (hx.min() + hx.max()) / 2 if W < H * 1.2 else W * .55
                if nm in AXB:  # skate: âncora no meio da prancha (as rodas), não na cabeça
                    bc = np.where(al[int(H * .8):].any(0))[0]; ax = (bc.min() + bc.max()) / 2
                if nm in ALIGN:  # mesmo lugar dos pés da prancha de referência
                    rf = np.array(Image.open(f'mv2/{ALIGN[nm]}_{j}.png'))[..., 3] > 100; Hr = rf.shape[0]
                    hr = np.where(rf[:int(Hr * .45)].any(0))[0]; axr = (hr.min() + hr.max()) / 2
                    lg = lambda m: np.where(m[int(m.shape[0] * .7):])[1].mean()
                    ax = lg(al) - (lg(rf) - axr)
                ay = H + (g[j // 4] - q['bot']) * pulo
                if nm in HEAD:  # giro com manobra: a hélice (topo do desenho) fica no mesmo lugar em todas as vistas
                    tc = np.where(al[:max(4, int(H * .1))].any(0))[0]; ax = (tc.min() + tc.max()) / 2
                    ay = float(np.median([qq['h'] for qq in fr]))
                m, sz = visor(a, False)  # tela inteira: parte escura + borda de vidro iluminada
                s = None; rot = None; area = 0; so = 0
                if m is not None and sz > 900:
                    ys, xs = np.where(m); s = [xs.min(), ys.min(), xs.max() + 1, ys.max() + 1]; sizes.append((s[2] - s[0], s[3] - s[1]))
                    x0, y0, Wv, Hv, rot = geom(m); area = sz; so = solid(m)
                    # cabeça girada para o lado (desenhos olham para a direita): a tela fica mais estreita que de frente;
                    # o rosto achata junto e escorrega um pouco para o lado para onde a cabeça vira
                    if an not in FRONT and an != 'turn':
                        cy_ = min(1, (Wv / Hv) / R0); sy_ = np.sqrt(max(0, 1 - cy_ * cy_)); x0 += .14 * Wv * sy_ * np.cos(rot); y0 += .14 * Wv * sy_ * np.sin(rot)
                    s += [x0, y0, Wv, Hv]
                f = k * Q * FF[j]; w2, h2 = max(1, round(W * f)), max(1, round(H * f))
                rgb = im.resize((w2, h2), Image.LANCZOS)
                mk = Image.fromarray(((ndimage.binary_dilation(m, iterations=1) if m is not None else np.zeros((H, W), bool)) * 255).astype(np.uint8)).resize((w2, h2), Image.BILINEAR)
                hd = None
                if nm in ('serve1', 'serve2', 'v2_serve1', 'v2_serve2'):  # palma da mão da frente (onde a bola fica)
                    # só abaixo do meio do desenho: a aba do boné pode ir mais para a direita que a mão
                    y_lo = int(H * .42); al2 = al.copy(); al2[:y_lo] = False
                    cols = np.where(al2.any(0))[0]; xr = cols.max(); band = al2[:, max(0, xr - 14):xr + 1]; yy = np.where(band.any(1))[0]
                    y0h, y1h = yy.min(), yy.max(); sub = al2[y0h:y1h + 1, max(0, xr - 60):xr + 1]; hx = np.where(sub)[1].mean() + max(0, xr - 60)
                    hd = [round(float(hx) * f, 1), round(float(y0h) * f, 1)]
                tiles.append((rgb, mk)); metas.append(dict(w=w2, h=h2, ax=round(ax * f, 1), ay=round(ay * f, 1), s=[round(float(v) * f, 1) for v in s] if s else None, hd=hd, r=None if rot is None else round(float(rot), 3), ar=area, so=so))
            if sizes:
                sw, sh = np.median([z[0] for z in sizes]) * k * Q, np.median([z[1] for z in sizes]) * k * Q
                for mt in metas[-len(fr):]: mt['sz'] = [round(sw, 1), round(sh, 1)]
            # tela muito tapada (mão na frente, boné): a inclinação vem do quadro vizinho mais limpo
            mine = metas[-len(fr):]; big = max([mt['ar'] for mt in mine] + [1]); so0 = .925  # forma da tela abaixo disso = algo na frente
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
        if mids: OUT['a'][an].update(add_mids(tiles, metas, an in {'idle', 'ready', 'readyU', 'readyD', 'run', 'back', 'spec', 'party'})); print('   quadros do meio:', OUT['a'][an].get('_n', 0))
        print(an, [round(np.degrees(m['r'])) for m in metas], atl.size, len(b.getvalue()) // 1024, 'KB', len(b2.getvalue()) // 1024, 'KB máscara')
    open(path, 'w').write('window.' + var + ' = ' + json.dumps(OUT) + ';\n'); print(len(open(path).read()) // 1024, 'KB', 'scrh', OUT['scrh'])
    return OUT
if __name__ == '__main__': build(ANIM, SH, FRONT, ALIGN, 'MV5', 'mv5.js', mids=True)
