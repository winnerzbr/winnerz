"""Bocha: as 4 pranchas do Amiguinho (esperando a vez, lançar rolando, lançar pelo alto, medindo/torcendo) -> mvbcb.js.
Usa a mesma montagem do vôlei (mvb2.py: massa igualada, pés presos no chão, máscara da tela, quadros do meio) e só
acrescenta as animações novas em window.MVB (o desenho do Amiguinho do vôlei, animb2.js, desenha as duas).
Escala pela massa: 0,983 x massa da espera do vôlei / massa mediana da prancha."""
src = open('mvb2.py', encoding='utf-8').read()
NEW = {'bcEspera': ['bv2_bc_espera'], 'bcRolar': ['bv2_bc_rolar'], 'bcAlto': ['bv2_bc_alto'], 'bcTorce': ['bv2_bc_torce']}
SHN = {'bv2_bc_espera': (0.969, 'linha', 1), 'bv2_bc_rolar': (0.974, 'linha', 1), 'bv2_bc_alto': (0.989, 'linha', 1), 'bv2_bc_torce': (0.997, 'linha', 1)}
def sub(a, b):
    global src; assert src.count(a) == 1, a; src = src.replace(a, b)
sub("ALIGN = {", "SH.update(SHN); ANIM.update(NEW)\nALIGN = {")
sub("PLANT = {'idle',", "PLANT = {'bcEspera', 'bcRolar', 'bcAlto', 'bcTorce', 'idle',")
sub("NOHOP = {'idle',", "NOHOP = {'bcEspera', 'bcRolar', 'bcAlto', 'bcTorce', 'idle',")
sub("for an, sheets in ANIM.items():\n    tiles, metas = [], []", "for an, sheets in NEW.items():\n    tiles, metas = [], []")
sub("if MIDS: OUT['a'].update(look_anims(TL))", "")
sub("open('mvb.js', 'w').write('window.MVB = ' + json.dumps(OUT) + ';\\n'); print(len(open('mvb.js').read()) // 1024, 'KB', 'scrh', OUT['scrh'])",
    "open('mvbcb.js', 'w').write('if (window.MVB) Object.assign(window.MVB.a, ' + json.dumps(OUT['a']) + ');\\n'); print(len(open('mvbcb.js').read()) // 1024, 'KB')")
exec(compile(src, 'mvb2.py', 'exec'), {'SHN': SHN, 'NEW': NEW, '__name__': '__mvbcb__'})
