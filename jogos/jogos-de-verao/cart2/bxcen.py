"""BMX pintado (01/11/2026): a pista da Costa WinnerZ nos 4 horários (fundo distante em panorama, plano médio com as dunas e a faixa
de terra da pista), as luzes da noite e os objetos (vala, tábua da rampa, pneus, cerca, bandeiras e poeira) -> bxcen.js (window.BXC).
Fonte: ../bmx/arte (o pacote do dono). Para caber no limite de arquivos da página publicada, os 4 horários de cada camada ficam
empilhados numa imagem só (uma linha por horário: dia, manhã, tarde, noite)."""
import json, base64, io, numpy as np
from PIL import Image
from cc import key_green
A = '../bmx/arte/'
def uri(im, fmt='WEBP', q=82):
    b = io.BytesIO(); im.save(b, fmt, quality=q, method=5); return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()
HORAS = [('dia', 'dia'), ('manha', 'amanhecer'), ('tarde', 'por_do_sol'), ('noite', 'noite')]
OUT = {'horas': [h for h, _ in HORAS]}
# fundo distante (32:9): 1280 × 360 por horário
F = Image.new('RGB', (1280, 360 * 4))
for i, (_, d) in enumerate(HORAS): F.paste(Image.open(A + d + '/fundo_distante.png').convert('RGB').resize((1280, 360), Image.LANCZOS), (0, i * 360))
OUT['f'] = uri(F, q=80); OUT['fw'], OUT['fh'] = 1280, 360
# plano médio (dunas, fundo verde) e faixa da pista (6:1): 1536 × 256 cada, plano médio nas linhas 0-3 e pista nas 4-7
M = Image.new('RGBA', (1536, 256 * 8))
for i, (_, d) in enumerate(HORAS):
    M.paste(Image.fromarray(key_green(A + d + '/plano_medio.png')).resize((1536, 256), Image.LANCZOS), (0, i * 256))
    M.paste(Image.open(A + d + '/pista.png').convert('RGBA').resize((1536, 256), Image.LANCZOS), (0, (4 + i) * 256))
OUT['m'] = uri(M, q=84); OUT['mw'], OUT['mh'] = 1536, 256
# cor da terra embaixo da faixa da pista (média das últimas linhas, por horário)
OUT['base'] = {}
for i, (h, d) in enumerate(HORAS):
    a = np.asarray(Image.open(A + d + '/pista.png').convert('RGB'), float); OUT['base'][h] = '#%02x%02x%02x' % tuple(int(v) for v in a[-30:].reshape(-1, 3).mean(0))
# luzes da noite: fundo distante (960 × 270) em cima e plano médio (1536 × 256) embaixo
L = Image.new('RGB', (1536, 270 + 256))
L.paste(Image.open(A + 'luzes/fundo_distante.png').convert('RGB').resize((960, 270), Image.LANCZOS), (0, 0))
L.paste(Image.open(A + 'luzes/plano_medio.png').convert('RGB').resize((1536, 256), Image.LANCZOS), (0, 270))
OUT['l'] = uri(L, q=76)
# objetos (recortes do pacote, com a âncora dele no pé); U pixels por unidade do jogo
R = {a['name']: a for a in json.load(open(A + 'objetos/assets_atlas.json'))['assets']}
U = 4.0; tiles, meta = [], {}
def add(name, rgba, w_units, ax, ay):
    im = Image.fromarray(rgba); k = w_units * U / im.width; w, h = max(1, round(im.width * k)), max(1, round(im.height * k))
    tiles.append(im.resize((w, h), Image.LANCZOS)); meta[name] = dict(w=w, h=h, ax=round(ax * k, 1), ay=round(ay * k, 1))
def rec(nm): return key_green(A + 'objetos/' + R[nm]['file'])
# vala: a tábua (canto de cima, à esquerda) sai da vala e vira a peça da borda da rampa; a abertura da água vai de x 215 a 935 da peça
pit = rec('pit_lip'); tab = pit[15:122, 48:342].copy(); pit[:100, 190:345, 3] = 0; pit[:100, :190, 3] = 0
OUT['vala'] = {'o0': 215, 'o1': 935, 'borda': 100}  # abertura da água (x) e a borda de terra (y) na peça original
add('vala', pit, 1099 / U, 0, 0)
add('tabua', tab, 30, 294, 0)  # âncora: ponta da tábua (em cima, à direita)
for nm, w in (('tires', 22), ('fence', 34), ('flag_01', 15), ('flag_02', 15), ('dust_01', 20), ('dust_02', 24), ('dust_03', 28), ('dust_04', 32)):
    add(nm, rec(nm), w, *R[nm]['anchor_xy'])
x = 0; atl = Image.new('RGBA', (sum(t.width + 2 for t in tiles), max(t.height for t in tiles)))
for (name, f), t in zip(meta.items(), tiles): atl.paste(t, (x, 0)); f['x'] = x; x += t.width + 2
OUT['atl'] = uri(atl, q=88); OUT['p'] = meta; OUT['u'] = U
open('bxcen.js', 'w').write('window.BXC = ' + json.dumps(OUT) + ';\n'); print('bxcen.js', len(open('bxcen.js').read()) // 1024, 'KB', atl.size, OUT['base'])
