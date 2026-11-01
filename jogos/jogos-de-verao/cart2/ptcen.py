"""Patins pintado (01/11/2026): o Calçadão das Ondas nos 4 horários (orla em panorama que repete + faixa do calçadão), as luzes da noite,
os obstáculos e prêmios e o corrimão em 3 peças -> ptcen.js (window.PTC). Fonte: ../patins/arte (o pacote do dono, com as regiões dele)."""
import json, base64, io, numpy as np
from PIL import Image
from cc import key_green
A = '../patins/arte/'
def uri(im, fmt='WEBP', q=82):
    b = io.BytesIO(); im.save(b, fmt, quality=q, method=5); return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()
OUT = {'f': {}, 'c': {}}
for h, (f, c) in {'dia': ('03_background_day', '04_sidewalk_day'), 'manha': ('05_background_morning', '06_sidewalk_morning'),
                  'tarde': ('07_background_sunset', '08_sidewalk_sunset'), 'noite': ('09_background_night', '10_sidewalk_night')}.items():
    OUT['f'][h] = uri(Image.open(A + f + '.png').convert('RGB').resize((1920, 540), Image.LANCZOS), q=80)
    OUT['c'][h] = uri(Image.open(A + c + '.png').convert('RGB').resize((1536, 256), Image.LANCZOS), q=80)
OUT['lf'] = uri(Image.open(A + '11_background_lights_only.png').convert('RGB').resize((1536, 432), Image.LANCZOS), q=76)
# peças pelas regiões do pacote (fundo verde vira transparente)
R = json.load(open(A + 'asset_regions.json'))['regions']; sheet = key_green(A + '01_obstacles_and_prizes.png')
U = 4.0; tiles, meta = [], {}
def add(name, rgba, w_units=None, h_units=None, ax=None, ay=None):
    im = Image.fromarray(rgba); k = (w_units * U / im.width) if w_units else (h_units * U / im.height)
    w, h = max(1, round(im.width * k)), max(1, round(im.height * k)); tiles.append(im.resize((w, h), Image.LANCZOS))
    meta[name] = dict(w=w, h=h, ax=round((ax if ax is not None else im.width / 2) * k, 1), ay=round((ay if ay is not None else im.height / 2) * k, 1))
def reg(nm, pad=3):
    r = R[nm]; return sheet[max(0, r['y'] - pad):r['y'] + r['height'] + pad, max(0, r['x'] - pad):r['x'] + r['width'] + pad]
add('buraco', reg('sidewalk_hole'), 40)
for j in range(4): add(f'coco{j}', reg(f'rolling_coconut_{j + 1}'), 17)
add('queda', reg('brown_coconut'), 17)
add('sombra', reg('shadow'), 24)
add('bola', reg('frescobol_ball'), 24)
add('picole', reg('bitten_popsicle'), h_units=16)
add('agua', reg('coconut_with_straw'), h_units=16)
# corrimão: as 3 peças na mesma altura; do topo da barra (y 14) ao chão (y 114) = 100 px da peça
L = json.load(open(A + 'handrail_parts/layout.json')); RU = 8.0  # o corrimão guarda mais pixels por unidade (fica grande na tela)
OUT['rail'] = {'top': L['bar_top_y'], 'chao': L['ground_y'], 'u': RU}
for k, nm in (('esq', 'left_post'), ('meio', 'bar_repeat'), ('dir', 'right_post')):
    im = Image.fromarray(key_green(A + f'handrail_parts/{nm}.png')); OUT['rail'][k] = {'src': uri(im, q=88), 'w': im.width, 'h': im.height}
x = 0; atl = Image.new('RGBA', (sum(t.width + 2 for t in tiles), max(t.height for t in tiles)))
for (name, f), t in zip(meta.items(), tiles): atl.paste(t, (x, 0)); f['x'] = x; x += t.width + 2
OUT['atl'] = uri(atl, q=88); OUT['p'] = meta; OUT['u'] = U
open('ptcen.js', 'w').write('window.PTC = ' + json.dumps(OUT) + ';\n'); print('ptcen.js', len(open('ptcen.js').read()) // 1024, 'KB', atl.size, {k: (v['w'], v['h']) for k, v in meta.items()})
