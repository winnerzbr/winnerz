"""Surfe pintado (01/11/2026): mar e céu do Pico da Pedra Furada nos 4 horários (com as luzes da noite), a parede da onda nos 4 horários
(faixa que repete), o tubo em 3 módulos, os objetos e a espuma -> sfcen.js (window.SFC). Fonte: ../surfe/arte (o pacote do dono)."""
import json, base64, io, numpy as np
from PIL import Image
from scipy import ndimage
from cc import key_green
A = '../surfe/arte/01_imagens/'; T = '../surfe/arte/02_modulos_tubo/transparente/'
def uri(im, fmt='WEBP', q=82):
    b = io.BytesIO(); im.save(b, fmt, quality=q, method=5); return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()
HORAS = {'dia': ('04_cenario_dia', '05_onda_dia'), 'manha': ('06_cenario_amanhecer', '07_onda_amanhecer'), 'tarde': ('08_cenario_por_do_sol', '09_onda_por_do_sol'), 'noite': ('10_cenario_noite', '11_onda_noite')}
OUT = {'f': {}, 'o': {}}
for h, (f, o) in HORAS.items():
    OUT['f'][h] = uri(Image.open(A + f + '.png').convert('RGB').resize((1280, 720), Image.LANCZOS), q=80)
    # a faixa da onda: o alto (a espuma da crista) termina macio em cima, sem a linha reta da borda da imagem
    im = np.array(Image.open(A + o + '.png').convert('RGBA').resize((1600, 400), Image.LANCZOS)); Hh = im.shape[0]
    ramp = np.clip(np.arange(Hh) / 7.0, 0, 1)[:, None]; im[..., 3] = (im[..., 3] * ramp).astype(np.uint8)
    OUT['o'][h] = uri(Image.fromarray(im), q=82)
# horizonte do mar (em % da altura): a primeira linha de cima onde o céu vira mar (medida no dia)
d = np.array(Image.open(A + '04_cenario_dia.png').convert('RGB')).astype(float); col = d[:, :, :].mean(1); g = np.abs(np.diff(col[:, 2] - col[:, 0]))
OUT['hz'] = 0.405
OUT['lf'] = uri(Image.open(A + '12_luzes_noite.png').convert('RGB').resize((960, 540), Image.LANCZOS), q=76)
# tubo: entrada, meio (repete) e fechamento, todos da mesma altura
OUT['tubo'] = {}
for k, nm in (('entrada', '01_entrada'), ('meio', '02_meio_repetivel'), ('fecha', '03_fechamento')):
    im = Image.open(T + nm + '.png').convert('RGBA'); w, h = round(im.width * .75), round(im.height * .75)
    if k != 'meio':  # a entrada (à esquerda) e o fechamento (à direita) terminam macios na ponta de fora, sem o corte reto da imagem
        a_ = np.array(im); n_ = int(a_.shape[1] * .1); r_ = np.clip(np.arange(a_.shape[1]) / n_, 0, 1) if k == 'entrada' else np.clip((a_.shape[1] - 1 - np.arange(a_.shape[1])) / n_, 0, 1)
        a_[..., 3] = (a_[..., 3] * r_[None, :]).astype(np.uint8); im = Image.fromarray(a_)
    OUT['tubo'][k] = {'src': uri(im.resize((w, h), Image.LANCZOS), q=84), 'w': w, 'h': h}
# peças: componentes de cada folha em fundo verde
def parts(path, minpx=1500):
    rgba = key_green(path); m = ndimage.binary_closing(rgba[..., 3] > 40, iterations=3); lab, _ = ndimage.label(m); out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        mm = lab[sl] == i + 1
        if mm.sum() < minpx: continue
        im = rgba[sl].copy(); im[..., 3] = np.where(mm, im[..., 3], 0); out.append(((sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2, Image.fromarray(im)))
    return out
def rows(P, gap):
    R = {}
    for cy, cx, im in sorted(P, key=lambda p: p[0]):
        k = next((k for k in R if abs(k - cy) < gap), cy); R.setdefault(k, []).append((cx, im))
    return [[im for _, im in sorted(v, key=lambda t: t[0])] for _, v in sorted(R.items())]
U = 4.0  # pixels guardados por unidade do jogo
tiles, meta = [], {}
def add(name, im, w_units, ax=None, ay=None):
    k = w_units * U / im.width; w, h = max(1, round(im.width * k)), max(1, round(im.height * k)); tiles.append(im.resize((w, h), Image.LANCZOS))
    meta[name] = dict(w=w, h=h, ax=round((ax if ax is not None else im.width / 2) * k, 1), ay=round((ay if ay is not None else im.height / 2) * k, 1))
O = rows(parts(A + '01_objetos_surf.png'), 150); print('objetos por linha', [len(r) for r in O])
for nm, im, wu in zip(['estrela', 'concha', 'alta', 'boia', 'pedra'], O[0], [17, 16, 18, 15, 27]): add(nm, im, wu)
for nm, im, wu in zip(['prancha', 'gaivota1', 'gaivota2', 'drone1', 'drone2'], O[1], [32, 22, 22, 24, 24]): add(nm, im, wu)
X = rows(parts(A + '02_efeitos_agua.png', 800), 140); print('efeitos por linha', [len(r) for r in X])
for j, im in enumerate(X[0][:3]): add(f'col{j}', im, 44, ay=im.height)
for j, im in enumerate(X[1][:4]): add(f'sp{j}', im, [16, 22, 28, 36][j], ay=im.height)
for j, im in enumerate(X[2][:2]): add(f'puf{j}', im, 20, ay=im.height)
x = 0; atl = Image.new('RGBA', (sum(t.width + 2 for t in tiles), max(t.height for t in tiles)))
for (name, f), t in zip(meta.items(), tiles): atl.paste(t, (x, 0)); f['x'] = x; x += t.width + 2
OUT['atl'] = uri(atl, q=88); OUT['p'] = meta; OUT['u'] = U
open('sfcen.js', 'w').write('window.SFC = ' + json.dumps(OUT) + ';\n'); print('sfcen.js', len(open('sfcen.js').read()) // 1024, 'KB', atl.size)
