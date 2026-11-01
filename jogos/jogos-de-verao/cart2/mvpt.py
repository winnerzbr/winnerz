"""Patins pintado do IAmiguinho -> mvpt.js (window.MVPT): as 12 animações do pacote do dono (01/11/2026) no formato do vôlei (mv5.py).
O pacote já veio com a escala igualada (do topo do boné ao queixo = 134 px em todos os quadros): uma escala só para tudo (0,505 / 0,49),
sem ajuste por quadro. Âncora no meio dos patins, embaixo (no ar, embaixo de cada desenho; a altura vem da física)."""
import mv5, visor, json
from junta import junta
K = 1.03
SH = {'pt_passada': (K, 'linha', 1), 'pt_agachamento': (K, 'linha', 1), 'pt_soul_grind': (K, 'linha', 1), 'pt_royale_grind': (K, 'linha', 1), 'pt_grind_baixo': (K, 'linha', 1),
      'pt_queda': (K, 'linha', 1), 'pt_salto': (K, 'unica', 0), 'pt_grab': (K, 'unica', 0), 'pt_aviao': (K, 'unica', 0), 'pt_tesoura': (K, 'unica', 0), 'pt_flip': (K, 'unica', 0), 'pt_giro': (K, 'unica', 0)}
ANIM = {'passada': ['pt_passada'], 'agacha': ['pt_agachamento'], 'salto': ['pt_salto'], 'grab': ['pt_grab'], 'aviao': ['pt_aviao'], 'tesoura': ['pt_tesoura'], 'flip': ['pt_flip'],
        'soul': ['pt_soul_grind'], 'royale': ['pt_royale_grind'], 'baixo': ['pt_grind_baixo'], 'giro': ['pt_giro'], 'queda': ['pt_queda']}
_ff = mv5.frame_fix
mv5.frame_fix = lambda nm: [1.0] * len(mv5.I[nm]) if nm.startswith('pt_') else _ff(nm)
OUT = mv5.build(ANIM, SH, set(), {}, 'MVPT', 'mvpt.js', AXB=set(SH) - {'pt_queda'})
for an, A in OUT['a'].items():  # deitado de lado (queda): a tela fica baixa no desenho; o rosto não vira de cabeça para baixo
    for f in A['f']: f.pop('inv', None)
junta(OUT)
open('mvpt.js', 'w').write('window.MVPT = ' + json.dumps(OUT) + ';\n'); print('mvpt.js', len(open('mvpt.js').read()) // 1024, 'KB')
