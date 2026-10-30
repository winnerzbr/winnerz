"""Quadros inteiros (desenhados prontos): corrida em 4, toque, manchete, saque, fim da cortada, pouso, comemoração."""
import numpy as np, json, base64, io
from PIL import Image
from scipy import ndimage
exec(open('mesh.py').read().split("out = {}")[0].split("def no_eyes")[0])  # BONES etc. (não usados aqui)
src_mesh = open('mesh.py').read(); exec('def no_eyes' + src_mesh.split('def no_eyes')[1].split('out = {}')[0])
IA = json.loads(open('iaposes.js').read().split('=', 1)[1].strip().rstrip(';'))
REF_H = IA['poses']['tres4']['scr'][3]  # altura da tela do rosto (pixels guardados) no desenho de referência
Q = {}
KG = IA['poses']['tres4']['h'] / Image.open('posesE/saque.png').height * .985
AIR = {'corte2'}
for nm in ['c1', 'c2', 'c3', 'c4', 'toque', 'manchete', 'saque', 'corte2', 'pouso', 'festa']:
    im = np.array(Image.open(f'posesE/{nm}.png').convert('RGBA'))
    a = im[..., 3] > 128; H, W = a.shape
    # tela do rosto: o maior pedaço escuro na metade de cima
    lum = im[..., :3].astype(float).mean(2); dk = (lum < 70) & a; dk[int(H * .55):] = False
    dk = ndimage.binary_opening(dk, iterations=2); lab, n = ndimage.label(dk); big = np.argmax(ndimage.sum(dk, lab, range(1, n + 1))) + 1
    ys, xs = np.where(lab == big); cx, cy, sw = xs.mean(), ys.mean(), xs.max() - xs.min()
    ball = None
    if nm == 'saque':
        # bola pintada na mão (medida à mão): tira a parte de cima dela; a mão que segura fica
        ccx, ccy, crr = 212, 116, 37; ball = [ccx, ccy, crr]
        yy, xx = np.arange(H)[:, None], np.arange(W)[None, :]
        f = im[..., :3].astype(float); warm = (f[..., 0] > f[..., 2] + 14)  # dedos (creme) ficam
        cut = (((yy - ccy) ** 2 + (xx - ccx) ** 2) < (crr + 4) ** 2) & ((yy < ccy + crr * .42) | ~ndimage.binary_dilation(warm, iterations=2))
        im2 = im.copy(); im2[..., 3] = np.where(cut, 0, im2[..., 3])
        lab3, n3 = ndimage.label(im2[..., 3] > 30); sz = ndimage.sum(np.ones_like(lab3), lab3, range(1, n3 + 1))
        im2[..., 3] = np.where(np.isin(lab3, [k + 1 for k, z in enumerate(sz) if z < 400]), 0, im2[..., 3])
    sc = no_eyes(im, (cx, cy, sw))
    k = KG  # a folha tem todos na mesma escala: uma escala só, tirada da altura do saque (hélice ao chão) = altura do desenho 3/4
    def pack(arr):
        W2, H2 = round(W * k), round(H * k); b = io.BytesIO(); Image.fromarray(arr).resize((W2, H2), Image.LANCZOS).save(b, 'WEBP', quality=90, method=6)
        return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), W2, H2
    if nm == 'saque': no_eyes(im2, (cx, cy, sw))
    s, W2, H2 = pack(im)
    # âncora: debaixo da cabeça, no chão (pés no 0); no ar: no meio do corpo
    ay = ys_all = np.where(a.any(1))[0].max() if nm not in AIR else H * .62
    d = {'src': s, 'w': W2, 'h': H2, 'ax': round(sc[0] * k, 1), 'ay': round(float(ay) * k, 1), 'scr': [round(v * k, 1) for v in sc], 'air': nm in AIR}
    if ball: d['ball'] = [round(v * k, 1) for v in ball]; d['src2'] = pack(im2)[0]
    Q[nm] = d; print(nm, W2, H2, 'k=%.2f' % k)
IA['quadros'] = Q
open('iaposes.js', 'w').write('window.C2P = ' + json.dumps(IA) + ';\n'); print(len(open('iaposes.js').read()) // 1024, 'KB')
