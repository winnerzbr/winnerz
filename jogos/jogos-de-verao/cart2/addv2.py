"""Coloca pranchas da versão 2 no jogo e na prévia. Uso: python3 addv2.py '<json>'
json: {"anim": "ready", "sheets": ["v2_ready"], "k": 0.87, "prev": {"m": "...", "t": "...", "n": "..."}}"""
import json, sys
A = json.loads(sys.argv[1])
s = open('mv5.py').read()
line = [l for l in s.split('\n') if l.startswith(" 'idleB':")][0]
for nm in A['sheets']:
    if f" '{nm}':" not in s: s = s.replace(line, line + f"\n '{nm}': ({A['k']}, {A.get('chao', 'linha')!r}, {A.get('pulo', 1)}),", 1)
i = s.index(f"'{A['anim']}': ["); j = s.index(']', i)
s = s[:i] + f"'{A['anim']}': {A['sheets']!r}"[:-1] + s[j:]
open('mv5.py', 'w').write(s)
K = json.load(open('mv2/k_auto.json')); K.update({n: A['k'] for n in A['sheets']}); json.dump(K, open('mv2/k_auto.json', 'w'), indent=1)
p = 'mv2/previa.py'; t = open(p).read()
P = A['prev']; ent = f" dict(p='IAmiguinho', m={P['m']!r}, t={P['t']!r}, sh={A['sheets']!r}, v='ok',\n      n={P['n']!r}),\n"
if repr(A['sheets']) not in t:
    anchor = " dict(p='IAmiguinho', m='Parado', t='Parado',"
    t = t.replace(anchor, ent + anchor, 1)
open(p, 'w').write(t)
print('ok', A['anim'], A['sheets'])
