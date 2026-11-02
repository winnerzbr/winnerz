"""BMX pintado do IAmiguinho -> mvbx.js (window.MVBX): as 8 animações do pacote do dono (01/11/2026) no formato do vôlei (mv5.py).
O pacote veio com escala e registro iguais em todos os quadros: uma escala só (régua: cabeça 0,466 -> 0,505, K = 1,08), sem ajuste
por quadro. Âncora no meio da bike, embaixo (entre as rodas: o desenho gira junto com a bike no ângulo da física); no ar, embaixo de
cada desenho (a altura vem da física). Na queda, a linha do chão."""
import mv5, visor, json
from junta import junta
visor.ROUND = True  # pneus e o contorno escuro da bike não podem ser confundidos com a tela do rosto
visor.SOLID = True  # 02/11: o pneu da frente levantado (empinando, corpo para trás) era tomado pela tela: o visor ficava apagado
K = 1.08
SH = {'bx_pedal': (K, 'linha', 1), 'bx_pump': (K, 'linha', 1), 'bx_pouso': (K, 'linha', 1), 'bx_queda': (K, 'linha', 1),
      'bx_salto': (K, 'unica', 0), 'bx_super': (K, 'unica', 0), 'bx_semmao': (K, 'unica', 0), 'bx_tail': (K, 'unica', 0),
      # 02/11: o pacote dos movimentos novos (mesma escala e registro do primeiro)
      'bx_superH': (K, 'unica', 0), 'bx_semmaoH': (K, 'unica', 0), 'bx_tailC': (K, 'unica', 0), 'bx_hop': (K, 'unica', 0), 'bx_tuck': (K, 'unica', 0),
      'bx_corpo': (K, 'unica', 0), 'bx_wheelie': (K / 1.08, 'linha', 1),  # 02/11: a prancha do empinando veio desenhada ~8% maior (bike e IAmiguinho)
      'bx_deseq': (K, 'linha', 1)}
ANIM = {'pedal': ['bx_pedal'], 'pump': ['bx_pump'], 'pouso': ['bx_pouso'], 'queda': ['bx_queda'], 'salto': ['bx_salto'],
        'super': ['bx_super'], 'semmao': ['bx_semmao'], 'tail': ['bx_tail'],
        'superH': ['bx_superH'], 'semmaoH': ['bx_semmaoH'], 'tailC': ['bx_tailC'], 'hop': ['bx_hop'], 'tuck': ['bx_tuck'], 'corpo': ['bx_corpo'], 'wheelie': ['bx_wheelie'], 'deseq': ['bx_deseq']}
_ff = mv5.frame_fix
mv5.frame_fix = lambda nm: ([1, 1, 1, 1 / 1.08, 1, 1, 1, 1] if nm == 'bx_corpo' else [1.0] * len(mv5.I[nm])) if nm.startswith('bx_') else _ff(nm)  # corpo 4: o mesmo desenho maior do empinando
OUT = mv5.build(ANIM, SH, set(), {}, 'MVBX', 'mvbx.js', AXB=set(SH) - {'bx_queda'})
for an, A in OUT['a'].items():
    for f in A['f']: f.pop('inv', None)  # na queda ele fica deitado de lado; o rosto não vira de cabeça para baixo
# empinando: em cada quadro, onde a roda de trás toca o chão (rx, em px do atlas a partir da âncora) e quanto o desenho já vem
# inclinado (tilt, rad): o jogo prende esse ponto na roda de trás da física e gira só o que falta
import numpy as np, base64, io
from PIL import Image
A = OUT['a']['wheelie']
for f in A['f']:
    im = np.asarray(Image.open(io.BytesIO(base64.b64decode(A['src'].split(',', 1)[1]))).convert('RGBA'))[:, int(f['x']):int(f['x'] + f['w'])]
    al = im[..., 3] > 120; ys, xs = np.where(al); yb = ys.max(); xr = xs[ys >= yb - 2].mean()
    rt = xs > xs.min() + (xs.max() - xs.min()) * .62; yf = ys[rt].max(); xf = xs[rt][ys[rt] >= yf - 2].mean()
    f['rx'] = round(float(xr - f['ax']), 1); f['tilt'] = round(float(np.arctan2(yb - yf, xf - xr)), 3)
print('empinando', [(f['rx'], f['tilt']) for f in A['f']])
junta(OUT)
open('mvbx.js', 'w').write('window.MVBX = ' + json.dumps(OUT) + ';\n'); print('mvbx.js', len(open('mvbx.js').read()) // 1024, 'KB')
