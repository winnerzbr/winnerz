"""BMX pintado do IAmiguinho -> mvbx.js (window.MVBX): as 8 animações do pacote do dono (01/11/2026) no formato do vôlei (mv5.py).
O pacote veio com escala e registro iguais em todos os quadros: uma escala só (régua: cabeça 0,466 -> 0,505, K = 1,08), sem ajuste
por quadro. Âncora no meio da bike, embaixo (entre as rodas: o desenho gira junto com a bike no ângulo da física); no ar, embaixo de
cada desenho (a altura vem da física). Na queda, a linha do chão."""
import mv5, visor, json
from junta import junta
visor.ROUND = True  # pneus e o contorno escuro da bike não podem ser confundidos com a tela do rosto
K = 1.08
SH = {'bx_pedal': (K, 'linha', 1), 'bx_pump': (K, 'linha', 1), 'bx_pouso': (K, 'linha', 1), 'bx_queda': (K, 'linha', 1),
      'bx_salto': (K, 'unica', 0), 'bx_super': (K, 'unica', 0), 'bx_semmao': (K, 'unica', 0), 'bx_tail': (K, 'unica', 0)}
ANIM = {'pedal': ['bx_pedal'], 'pump': ['bx_pump'], 'pouso': ['bx_pouso'], 'queda': ['bx_queda'], 'salto': ['bx_salto'],
        'super': ['bx_super'], 'semmao': ['bx_semmao'], 'tail': ['bx_tail']}
_ff = mv5.frame_fix
mv5.frame_fix = lambda nm: [1.0] * len(mv5.I[nm]) if nm.startswith('bx_') else _ff(nm)
OUT = mv5.build(ANIM, SH, set(), {}, 'MVBX', 'mvbx.js', AXB=set(SH) - {'bx_queda'})
for an, A in OUT['a'].items():
    for f in A['f']: f.pop('inv', None)  # na queda ele fica deitado de lado; o rosto não vira de cabeça para baixo
junta(OUT)
open('mvbx.js', 'w').write('window.MVBX = ' + json.dumps(OUT) + ';\n'); print('mvbx.js', len(open('mvbx.js').read()) // 1024, 'KB')
