"""Surfe pintado do IAmiguinho -> mvsf.js (window.MVSF): as 11 pranchas do surfe (01/11/2026) no mesmo formato do vôlei (mv5.py).
Escala: cabeça igualada à do vôlei (régua: 0,505 / cabeça mediana da prancha, medida com regua.py).
Na onda e no ar a âncora fica no meio da prancha, embaixo (a prancha não escorrega quando o corpo inclina); no caldo, na cabeça."""
import mv5, visor
visor.ROUND = True  # a quilha e o contorno azul-marinho da prancha não podem ser confundidos com a tela do rosto
SH = {
 'sf_pe': (1.004, 'linha', 1), 'sf_sobe': (0.942, 'linha', 1), 'sf_tubo': (1.004, 'linha', 1), 'sf_pouso': (1.031, 'linha', 1),
 'sf_ar': (1.031, 'unica', 0), 'sf_super': (1.046, 'unica', 0), 'sf_indy': (1.041, 'unica', 0), 'sf_rabeta': (0.996, 'unica', 0),
 'sf_mortal': (0.979, 'unica', 0), 'sf_giro': (1.0, 'unica', 0), 'sf_caldo': (1.0, 'linha', 1),
}
ANIM = {'pe': ['sf_pe'], 'sobe': ['sf_sobe'], 'tubo': ['sf_tubo'], 'pouso': ['sf_pouso'], 'ar': ['sf_ar'], 'super': ['sf_super'], 'indy': ['sf_indy'],
        'rabeta': ['sf_rabeta'], 'mortal': ['sf_mortal'], 'giro': ['sf_giro'], 'caldo': ['sf_caldo']}
_ff = mv5.frame_fix
SEM_FIX = ('sf_giro', 'sf_caldo')  # no giro e no caldo a cabeça gira ou some de verdade
def ff(nm):
    if not nm.startswith('sf_'): return _ff(nm)
    if nm in SEM_FIX: return [1.0] * len(mv5.I[nm])
    import numpy as np
    from PIL import Image
    from regua import metrics
    M = [metrics(np.array(Image.open(f'mv2/{nm}_{j}.png'))) for j in range(len(mv5.I[nm]))]
    med = {k: float(np.median([m[k] for m in M if k in m])) for k in ('visor', 'circ', 'fone') if any(k in m for m in M)}
    hd = []
    for m in M:
        ks = ('visor', 'circ', 'fone') if 'visor' in m else ('circ',)
        rs = [m[k] / med[k] for k in ks if k in med and k in m and m[k] > 0]
        hd.append(float(np.median(rs)) if rs else None)
    ref = float(np.median([h for h in hd if h])) if any(hd) else 1.0
    return [float(np.clip(ref / h, .88, 1.12)) if h and abs(ref / h - 1) > .02 else 1.0 for h in hd]
mv5.frame_fix = ff
OUT = mv5.build(ANIM, SH, set(), {}, 'MVSF', 'mvsf.js', AXB=set(SH) - {'sf_caldo'})
# de cabeça para baixo (caldo, quadro 4): o rosto gira meia volta dentro da tela
import json
for an, A in OUT['a'].items():
    for f in A['f']:
        if f.get('s'):
            cy = f['s'][5] if len(f['s']) > 5 else (f['s'][1] + f['s'][3]) / 2
            if cy > f['h'] * .55 and an != 'caldo': f['inv'] = 1
    if an == 'caldo' and A['f'][3].get('s'): A['f'][3]['inv'] = 1  # só o quadro 4 está de cabeça para baixo (no 7 e no 8 só a cabeça aparece fora da água)
open('mvsf.js', 'w').write('window.MVSF = ' + json.dumps(OUT) + ';\n'); print('mvsf.js', len(open('mvsf.js').read()) // 1024, 'KB')
