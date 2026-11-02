"""Corrida na areia pintada do IAmiguinho -> mvcr.js (window.MVCR): as 6 pranchas do dono (02/11/2026), montagem do vôlei (mv5.py).
O pacote veio com a escala igualada entre as pranchas: uma escala só (0,505 / 0,468 da cabeça na largada e no salto), sem ajuste por quadro.
Âncora embaixo, no meio dos pés. No salto cada quadro fica no chão (a altura vem do jogo)."""
import mv5, json
from junta import junta
K = 1.08
SH = {'cr_sprint': (K, 'linha', 1), 'cr_trote': (K, 'linha', 1), 'cr_largada': (K, 'linha', 1), 'cr_queda': (K, 'linha', 1),
      'cr_cansado': (K, 'linha', 1), 'cr_salto': (K, 'unica', 0)}
ANIM = {'sprint': ['cr_sprint'], 'trote': ['cr_trote'], 'largada': ['cr_largada'], 'salto': ['cr_salto'], 'queda': ['cr_queda'], 'cansado': ['cr_cansado']}
_ff = mv5.frame_fix
mv5.frame_fix = lambda nm: [1.0] * len(mv5.I[nm]) if nm.startswith('cr_') else _ff(nm)
OUT = mv5.build(ANIM, SH, set(), {}, 'MVCR', 'mvcr.js', AXB=set(SH) - {'cr_queda'})
for an, A in OUT['a'].items():
    for f in A['f']: f.pop('inv', None)
junta(OUT)
open('mvcr.js', 'w').write('window.MVCR = ' + json.dumps(OUT) + ';\n'); print('mvcr.js', len(open('mvcr.js').read()) // 1024, 'KB')
