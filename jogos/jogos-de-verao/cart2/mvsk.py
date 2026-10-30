"""Skate pintado do IAmiguinho -> mvsk.js (window.MVSK): pranchas do half-pipe no mesmo formato do vôlei (mv5.py)
e o skate solto girando (kickflip e shove-it), na mesma escala do skate desenhado nas pranchas."""
import json, base64, io, numpy as np
from PIL import Image
import mv5, visor
visor.ROUND = True  # a lixa preta do skate não pode ser confundida com a tela do rosto
# escala: cabeça igualada à do vôlei (régua: 0,505 / cabeça mediana). chao 'unica' + pulo 0 = âncora nas rodas de cada quadro (no ar a altura vem da física)
SH = {
 'sk_idle': (0.94, 'linha', 1), 'sk_imp': (0.906, 'linha', 1), 'sk_freio': (0.92, 'linha', 1), 'sk_deseq': (0.922, 'linha', 1), 'sk_pouso': (0.939, 'linha', 1),
 'sk_saida': (0.89, 'unica', 0), 'sk_noar': (0.92, 'unica', 0), 'sk_flip': (0.853, 'unica', 0),
 'sk_foguete': (0.877, 'unica', 0), 'sk_helice': (0.847, 'unica', 0), 'sk_giro1': (0.925, 'unica', 0), 'sk_giro2': (0.925, 'unica', 0),
 'sk_manual': (0.907, 'unica', 0), 'sk_plant_c': (0.953, 'unica', 0), 'sk_grind': (0.804, 'unica', 0), 'sk_stall': (0.91, 'unica', 0),
 'sk_tombo1_a': (0.85, 'unica', 0), 'sk_tombo2': (0.839, 'linha', 1),
 'sk_cbsuper': (0.832, 'unica', 0), 'sk_cbcristo_a': (0.884, 'unica', 0), 'sk_cbfoguete': (0.845, 'unica', 0), 'sk_cbhelice': (0.878, 'unica', 0),
 'sk_cbindy_b': (0.856, 'unica', 0), 'sk_cbrabeta_b': (0.798, 'unica', 0),
 'sk_indy': (0.88, 'unica', 0), 'sk_rabeta': (0.861, 'unica', 0), 'sk_melao': (0.853, 'unica', 0), 'sk_super': (0.858, 'unica', 0), 'sk_cristo': (0.89, 'unica', 0),
}
ANIM = {'idle': ['sk_idle'], 'pump': ['sk_imp'], 'brake': ['sk_freio'], 'wob': ['sk_deseq'], 'land': ['sk_pouso'], 'takeoff': ['sk_saida'], 'air': ['sk_noar'],
        'flip': ['sk_flip'], 'indy': ['sk_indy'], 'rabeta': ['sk_rabeta'], 'melao': ['sk_melao'], 'super': ['sk_super'], 'cristo': ['sk_cristo'],
        'foguete': ['sk_foguete'], 'helice': ['sk_helice'], 'giro1': ['sk_giro1'], 'giro2': ['sk_giro2'],
        'manual': ['sk_manual'], 'plant': ['sk_plant_c'], 'grind': ['sk_grind'], 'stall': ['sk_stall'], 'bail': ['sk_tombo1_a'], 'dizzy': ['sk_tombo2'],
        'cb_super': ['sk_cbsuper'], 'cb_cristo': ['sk_cbcristo_a'], 'cb_foguete': ['sk_cbfoguete'], 'cb_helice': ['sk_cbhelice'], 'cb_indy': ['sk_cbindy_b'], 'cb_rabeta': ['sk_cbrabeta_b']}
# giro: as vistas de costas não mostram a tela, e de frente a tela parece maior que de lado; o tamanho fica o da prancha inteira
_ff = mv5.frame_fix
mv5.frame_fix = lambda nm: [1.0] * len(mv5.I[nm]) if nm.startswith(('sk_giro', 'sk_cb')) else _ff(nm)
# âncora no meio do skate (rodas); no cristo e no foguete o skate fica em pé ao lado, então vale a cabeça; no tombo, o corpo
OUT = mv5.build(ANIM, SH, set(), {}, 'MVSK', 'mvsk.js', AXB=set(SH) - {'sk_cristo', 'sk_foguete', 'sk_tombo1_a', 'sk_tombo2'} - {n for n in SH if n.startswith('sk_cb')}, HEAD={n for n in SH if n.startswith('sk_cb')})
# de cabeça para baixo (parada de mão, tombo): o rosto gira meia volta dentro da tela
for an, A in OUT['a'].items():
    for f in A['f']:
        if f.get('s'):
            cy = f['s'][5] if len(f['s']) > 5 else (f['s'][1] + f['s'][3]) / 2
            if cy > f['h'] * .55: f['inv'] = 1
# skate solto: kickflip (gira no comprimento) e shove-it (gira deitado). Escala: o skate de lado igual ao das pranchas
SIDE = 247 * SH['sk_idle'][0] * mv5.Q  # comprimento do skate de lado, em pixels guardados
BOARDS = {'kf': 'sk_bkf', 'sv': 'sk_bsv_b'}
tiles, X = [], 0; OUT['boards'] = {}
for key, nm in BOARDS.items():
    k = SIDE / Image.open(f'mv2/{nm}_0.png').width; L = []
    for j in range(8):
        im = Image.open(f'mv2/{nm}_{j}.png'); w, h = max(1, round(im.width * k)), max(1, round(im.height * k))
        tiles.append(im.resize((w, h), Image.LANCZOS)); L.append(dict(x=X, w=w, h=h)); X += w + 2
    OUT['boards'][key] = L
atl = Image.new('RGBA', (X, max(t.height for t in tiles)), (0, 0, 0, 0)); x = 0
for t in tiles: atl.paste(t, (x, 0)); x += t.width + 2
b = io.BytesIO(); atl.save(b, 'WEBP', quality=86, method=5)
OUT['bsrc'] = 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
open('mvsk.js', 'w').write('window.MVSK = ' + json.dumps(OUT) + ';\n'); print('mvsk.js', len(open('mvsk.js').read()) // 1024, 'KB', OUT['boards']['kf'][0])
