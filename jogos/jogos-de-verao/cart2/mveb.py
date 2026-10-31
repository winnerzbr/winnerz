"""Embaixadinha pintada do IAmiguinho -> mveb.js (window.MVEB): pranchas no mesmo formato do vôlei e do skate (mv5.py).
Escala: cabeça igualada à do vôlei (régua: 0,505 / cabeça mediana da prancha, medida com regua.py)."""
import mv5
SH = {
 'eb_espera': (0.896, 'linha', 1), 'eb_olhar': (0.911, 'linha', 1), 'eb_andar': (0.883, 'linha', 1), 'eb_andar2': (0.742, 'linha', 1),
 'eb_pe': (0.981, 'linha', 1), 'eb_coxa': (0.874, 'linha', 1), 'eb_cabeca': (0.985, 'linha', .35), 'eb_firula': (1.012, 'linha', 1),
 'eb_levanta': (0.973, 'linha', 1), 'eb_caiu': (0.906, 'linha', 1), 'eb_fim': (0.908, 'linha', 1), 'eb_festa': (0.915, 'linha', 1),
}
ANIM = {'espera': ['eb_espera'], 'olhar': ['eb_olhar'], 'andar': ['eb_andar'], 'pe': ['eb_pe'], 'coxa': ['eb_coxa'], 'cabeca': ['eb_cabeca'],
        'firula': ['eb_firula'], 'levanta': ['eb_levanta'], 'caiu': ['eb_caiu'], 'fim': ['eb_fim'], 'festa': ['eb_festa']}
# cabeça de cada quadro igualada à mediana da prancha (o ChatGPT varia), menos onde a cabeça gira ou abaixa de verdade;
# no cabeceio o pulo desenhado entra só em 35% (a cabeça tem que bater na bola na altura do toque)
_ff = mv5.frame_fix
SEM_FIX = ('eb_olhar', 'eb_fim', 'eb_caiu')  # nestas a cabeça gira ou abaixa de verdade
def ff(nm): return _ff(nm) if not nm.startswith('eb_') else [1.0] * len(mv5.I[nm]) if nm in SEM_FIX else _fix(nm)
def _fix(nm):
    # o mesmo cálculo do mv5.frame_fix (que só vale para v2_ e sk_)
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
OUT = mv5.build(ANIM, SH, set(), {}, 'MVEB', 'mveb.js')
