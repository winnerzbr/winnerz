"""Pingue-pongue: as 8 pranchas do Amiguinho (01/11/2026) -> mvbpp.js. Mesma montagem do vôlei (mvb2.py: massa igualada, pés presos
no chão parado, centro da massa andando, máscara da tela e rosto), acrescentando as animações pp* em window.MVB (desenhadas pelo
Amiguinho do vôlei, animb2.js). A raquete (vermelha, desenhada na mão) não entra na massa nem no lugar dos pés (ppred.py).
Escala pela massa: 0,983 x massa da espera do vôlei / massa mediana da prancha (sem a raquete).
A bolinha desenhada no saque (quadros 1-3) sai; a posição dela na mão (quadro 1) vai em MVB.ppBola."""
import json, os, numpy as np
from PIL import Image
from scipy import ndimage
I0 = json.load(open('mv2/info.json'))
# ---- tira a bolinha do saque (o jogo desenha a dele): solta nos quadros 2 e 3; no 1, encostada em cima da mão da frente
def tira_bola():
    if os.path.exists('mv2/bv2_pp_bola.json'): return json.load(open('mv2/bv2_pp_bola.json'))
    out = []
    for j in range(3):
        nm = f'mv2/bv2_pp_saque_{j}.png'; a = np.array(Image.open(nm)); al = a[..., 3] > 60
        lab, n = ndimage.label(al); sz = ndimage.sum(al, lab, range(1, n + 1)); small = [i + 1 for i in range(n) if sz[i] < 600]
        if small: ys, xs = np.where(np.isin(lab, small)); ball = np.isin(lab, small)
        else:
            hid = int(np.argsort(sz)[-2]) + 1; Hm = lab == hid; top = np.where(Hm)[0].min()
            r, g, b = [a[..., i].astype(int) for i in range(3)]; mx = np.maximum(np.maximum(r, g), b); mn = np.minimum(np.minimum(r, g), b)
            l2, n2 = ndimage.label((mn > 185) & (mx - mn < 45) & Hm); k = next(k for k in range(1, n2 + 1) if 40 <= (l2 == k).sum() <= 600 and np.where(l2 == k)[0].min() - top < 8)
            ys, xs = np.where(l2 == k); ball = ndimage.binary_dilation(l2 == k, iterations=5) & Hm; ball[ys.max() + 4:] = False
        out.append([float(xs.mean()), float(ys.mean())]); a[..., 3] = np.where(ball, 0, a[..., 3])
        yy, xx = np.where(a[..., 3] > 60); x0, y0 = xx.min(), yy.min(); a = a[y0:yy.max() + 1, x0:xx.max() + 1]; out[-1] = [out[-1][0] - x0, out[-1][1] - y0]
        q = I0[f'bv2_pp_saque'][j]; q['h'] = int(a.shape[0] - 1); q['top'] = int(q['bot'] - q['h']); Image.fromarray(a).save(nm)
    json.dump(I0, open('mv2/info.json', 'w')); json.dump(out, open('mv2/bv2_pp_bola.json', 'w')); return out
BOLA = tira_bola()
src = open('mvb2.py', encoding='utf-8').read()
N = {'espera': 1.012, 'lado': 1.047, 'topspin': 1.027, 'cortada': 1.069, 'efeito': 0.999, 'saque': 0.986, 'andar': 0.978, 'balao': 0.967, 'festa': 1.012, 'lamento': 1.012}  # reações (01/11): mesma escala da espera
an_ = lambda n: 'pp' + n[0].upper() + n[1:]
NEW = {an_(n): [f'bv2_pp_{n}'] for n in N}
SHN = {f'bv2_pp_{n}': (k, 'linha', 1) for n, k in N.items()}
PL = ['ppEspera', 'ppTopspin', 'ppCortada', 'ppEfeito', 'ppSaque', 'ppBalao']; NH = ['ppEspera', 'ppTopspin', 'ppEfeito', 'ppSaque']
def sub(a, b):
    global src; assert src.count(a) == 1, a; src = src.replace(a, b)
sub("ALIGN = {", "SH.update(SHN); ANIM.update(NEW)\nALIGN = {")
sub("PLANT = {'idle',", "PLANT = {" + ''.join(f"'{x}', " for x in PL) + "'idle',")
sub("NOHOP = {'idle',", "NOHOP = {" + ''.join(f"'{x}', " for x in NH) + "'idle',")
# a raquete não conta na massa nem nos pés
sub("def _feet(a):\n    al = a[..., 3] > 100;", "from ppred import raquete\ndef _feet(a):\n    al = (a[..., 3] > 100) & ~raquete(a);")
sub("def _mass(a):\n    al = ndimage.binary_fill_holes(a[..., 3] > 128)", "def _mass(a):\n    al = ndimage.binary_fill_holes((a[..., 3] > 128) & ~raquete(a))")
sub("ms = [np.sqrt(ndimage.binary_fill_holes(np.array(Image.open(f'mv2/{nm}_{j}.png'))[..., 3] > 128).sum())", "ms = [np.sqrt(ndimage.binary_fill_holes((lambda a: (a[..., 3] > 128) & ~raquete(a))(np.array(Image.open(f'mv2/{nm}_{j}.png')))).sum())")
sub("for an, sheets in ANIM.items():\n    tiles, metas = [], []", "for an, sheets in NEW.items():\n    tiles, metas = [], []")
sub("if MIDS: OUT['a'].update(look_anims(TL))", "")
sub("open('mvb.js', 'w').write('window.MVB = ' + json.dumps(OUT) + ';\\n'); print(len(open('mvb.js').read()) // 1024, 'KB', 'scrh', OUT['scrh'])",
    "_f0 = OUT['a']['ppSaque']['f'][0]; _r = _f0['w'] / Image.open('mv2/bv2_pp_saque_0.png').width; EXTRA = {'ppBola': [round(BOLA[0][0] * _r - _f0['ax'], 1), round(BOLA[0][1] * _r - _f0['ay'], 1)], 'ppToque': {'topspin': 3, 'cortada': 3, 'efeito': 3, 'balao': 4, 'saque': 5}}\n"
    "open('mvbpp.js', 'w').write('if (window.MVB) { Object.assign(window.MVB.a, ' + json.dumps(OUT['a']) + '); Object.assign(window.MVB, ' + json.dumps(EXTRA) + '); }\\n'); print(len(open('mvbpp.js').read()) // 1024, 'KB', EXTRA)")
exec(compile(src, 'mvb2.py', 'exec'), {'SHN': SHN, 'NEW': NEW, 'BOLA': BOLA, '__name__': '__mvbpp__'})
# reações (01/11): quando a tela escura não aparece de verdade (de costas ou de lado, só uma fresta do visor), a medida pegava o
# contorno do corpo inteiro e o rosto aceso saía em cima do corpo. Nesses quadros (caixa da tela maior que 60% do desenho) fica sem rosto.
_s = open('mvbpp.js').read(); _i = _s.index('Object.assign(window.MVB.a, ') + len('Object.assign(window.MVB.a, '); _A, _e = json.JSONDecoder().raw_decode(_s[_i:]); _n = 0
for _an in ('ppFesta', 'ppLamento'):
    for _f in _A[_an]['f']:
        if _f.get('s') and ((_f['s'][2] - _f['s'][0]) > _f['w'] * .6 or (_f['s'][3] - _f['s'][1]) > _f['h'] * .6): _f['s'] = None; _n += 1
open('mvbpp.js', 'w').write(_s[:_i] + json.dumps(_A) + _s[_i + _e:]); print('reações sem rosto (tela não visível):', _n)
