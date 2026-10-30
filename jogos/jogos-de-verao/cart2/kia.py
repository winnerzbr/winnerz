"""Escala do IAmiguinho por prancha = mediana de 3 medidas da cabeça (altura do visor, círculo da cabeça, fone de ouvido).
Cada medida erra em algumas poses; a do meio é a mais confiável."""
import numpy as np, json
from headsz import measure
from headsz3 import ks
from earcup import sheet
src = open('mv5.py').read(); g = {}; exec(src[src.index('SH ='):src.index('FRONT')], g); SH = g['SH']
V = measure(SH, False, 'idleA'); vr = V['idleA'][0]
C = ks(SH, False, 'idleA'); fr = sheet('idleA')[0]
K = json.load(open('mv2/k_auto.json'))
for nm in SH:
    vals = [C[nm]]
    if V[nm][0]: vals.append(vr / V[nm][0])
    f = sheet(nm)[0]
    if f: vals.append(fr / f)
    K[nm] = round(float(np.median(vals)), 3); print(nm, [round(x, 3) for x in vals], '->', K[nm])
json.dump(K, open('mv2/k_auto.json', 'w'), indent=1)
s = src; a = s.index('SH ='); b = s.index('\nANIM')
body = 'SH = {  # escala de cada prancha: mediana de 3 medidas da cabeça (visor, círculo da cabeça, fone) -> cabeça do mesmo tamanho em todas\n' + ''.join(f' {n!r}: ({K[n]!r}, {v[1]!r}, {v[2]!r}),\n' for n, v in SH.items()) + '}'
open('mv5.py', 'w').write(s[:a] + body + s[b:])
