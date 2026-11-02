"""Corrida na areia: as 4 pranchas do Amiguinho (02/11/2026: correndo, largada, salto da barreira, tropeço e queda) -> mvbcr.js.
Mesma montagem do vôlei (mvb2.py), acrescentando crSprint, crLargada, crSalto e crQueda em window.MVB (desenhadas pelo Amiguinho
do vôlei, animb2.js, com a cor de cada um). Escala pela massa (0,983 x raiz da massa da espera do vôlei / massa da prancha):
1,09 a 1,15 entre as pranchas; ficou 1,10 para todas (as poses encolhidas do salto e da largada baixam a massa).
No salto o desenho fica no chão (a altura vem do jogo)."""
import json
src = open('mvb2.py', encoding='utf-8').read()
N = {'bv2_cr_sprint': ('crSprint', 1.10, .5), 'bv2_cr_largada': ('crLargada', 1.10, 1), 'bv2_cr_salto': ('crSalto', 1.10, 0), 'bv2_cr_queda': ('crQueda', 1.10, 1)}
NEW = {an: [nm] for nm, (an, k, p) in N.items()}
SHN = {nm: (k, 'linha', p) for nm, (an, k, p) in N.items()}
def sub(a, b):
    global src; assert src.count(a) == 1, a; src = src.replace(a, b)
sub("ALIGN = {", "SH.update(SHN); ANIM.update(NEW)\nALIGN = {")
sub("for an, sheets in ANIM.items():\n    tiles, metas = [], []", "for an, sheets in NEW.items():\n    tiles, metas = [], []")
sub("if MIDS: OUT['a'].update(look_anims(TL))", "")
sub("open('mvb.js', 'w').write('window.MVB = ' + json.dumps(OUT) + ';\\n'); print(len(open('mvb.js').read()) // 1024, 'KB', 'scrh', OUT['scrh'])",
    "open('mvbcr.js', 'w').write('if (window.MVB) Object.assign(window.MVB.a, ' + json.dumps(OUT['a']) + ');\\n'); print(len(open('mvbcr.js').read()) // 1024, 'KB')")
exec(compile(src, 'mvb2.py', 'exec'), {'SHN': SHN, 'NEW': NEW, '__name__': '__mvbcr__'})
