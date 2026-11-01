"""Basquete: as pranchas do Amiguinho defensor (01/11/2026) -> mvbbq.js. Mesma montagem do vôlei (mvb2.py), acrescentando as animações
bqDefesa e bqToco em window.MVB (desenhadas pelo Amiguinho do vôlei, animb2.js, com a cor de cada um).
Das 6 pranchas que o dono mandou (4 de defesa, 2 de pulo), ficaram as de 3/4 (visor grande, como o Amiguinho do vôlei): defesa_c e toco_a.
A defesa_d veio com a 2ª linha espelhada; a defesa_a com as mãos abaixadas; defesa_b e toco_b de perfil. Ficam guardadas.
Escala pela massa: 0,983 x massa da espera do vôlei / massa mediana da prancha. No pulo o desenho fica no chão (a altura vem da física)."""
import json
src = open('mvb2.py', encoding='utf-8').read()
N = {'bv2_bq_defesa_c': ('bqDefesa', 1.045, 1), 'bv2_bq_toco_a': ('bqToco', 1.127, 0)}
NEW = {an: [nm] for nm, (an, k, p) in N.items()}
SHN = {nm: (k, 'linha', p) for nm, (an, k, p) in N.items()}
def sub(a, b):
    global src; assert src.count(a) == 1, a; src = src.replace(a, b)
sub("ALIGN = {", "SH.update(SHN); ANIM.update(NEW)\nALIGN = {")
sub("PLANT = {'idle',", "PLANT = {'bqDefesa', 'idle',")
sub("NOHOP = {'idle',", "NOHOP = {'bqDefesa', 'idle',")
sub("for an, sheets in ANIM.items():\n    tiles, metas = [], []", "for an, sheets in NEW.items():\n    tiles, metas = [], []")
sub("if MIDS: OUT['a'].update(look_anims(TL))", "")
sub("open('mvb.js', 'w').write('window.MVB = ' + json.dumps(OUT) + ';\\n'); print(len(open('mvb.js').read()) // 1024, 'KB', 'scrh', OUT['scrh'])",
    "open('mvbbq.js', 'w').write('if (window.MVB) { Object.assign(window.MVB.a, ' + json.dumps(OUT['a']) + '); }\\n'); print(len(open('mvbbq.js').read()) // 1024, 'KB')")
exec(compile(src, 'mvb2.py', 'exec'), {'SHN': SHN, 'NEW': NEW, '__name__': '__mvbbq__'})
