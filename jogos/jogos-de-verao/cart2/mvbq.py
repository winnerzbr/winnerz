"""Basquete pintado do IAmiguinho -> mvbq.js (window.MVBQ): 6 pranchas (01/11/2026) no mesmo formato do vôlei (mv5.py).
Das 12 pranchas que o dono mandou, ficaram as de cabeça mais constante pela régua (as outras estão guardadas em ../basquete/pranchas):
andar = bq_andar_d (1,5%), espera = bq_espera_b (1,0%), carregando = bq_carrega_b (6,8%).
Escala: cabeça igualada à do vôlei (0,505 / cabeça mediana). No arremesso e na comemoração o pulo desenhado entra inteiro."""
import mv5, json
SH = {
 'bq_espera_b': (0.728, 'linha', 1), 'bq_andar_d': (1.101, 'linha', 1), 'bq_carrega_b': (0.787, 'linha', 1),
 'bq_arremesso': (1.031, 'linha', 1), 'bq_festa': (0.839, 'linha', 1), 'bq_errou': (0.872, 'linha', 1),
}
ANIM = {'espera': ['bq_espera_b'], 'andar': ['bq_andar_d'], 'carrega': ['bq_carrega_b'], 'arremesso': ['bq_arremesso'], 'festa': ['bq_festa'], 'errou': ['bq_errou']}
_ff = mv5.frame_fix
SEM_FIX = ('bq_errou',)  # as mãos na cabeça atrapalham a medida da cabeça
def ff(nm):
    if not nm.startswith('bq_'): return _ff(nm)
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
OUT = mv5.build(ANIM, SH, set(), {}, 'MVBQ', 'mvbq.js')
open('mvbq.js', 'w').write('window.MVBQ = ' + json.dumps(OUT) + ';\n'); print('mvbq.js', len(open('mvbq.js').read()) // 1024, 'KB')
