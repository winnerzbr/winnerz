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
# tubo: entrada, meio (repete) e fechamento, todos da mesma altura.
# 01/11 (pedido do dono: as ondas estavam cortadas e destoavam do mar): o tubo e as colunas de espuma ganham as cores de cada horário,
# tiradas das faixas da onda (as 4 faixas têm o mesmo desenho e só mudam de cor, então a cor do dia vira a do horário por uma conta
# ajustada pixel a pixel nelas). As bordas ficam macias: o pé de todos os módulos some na água, a entrada some à direita sobre o meio,
# o fechamento some à esquerda sobre o meio e à direita, sem o corte reto da imagem. Um atlas por horário (OUT['th']).
def _feats(c):
    r, g, b = c.T; return np.stack([np.ones_like(r), r, g, b, r * r, g * g, b * b, r * g, r * b, g * b], 1)
_dia = np.asarray(Image.open(A + '05_onda_dia.png').convert('RGB').resize((512, 128), Image.LANCZOS), float).reshape(-1, 3) / 255
COR = {}
for h, (_, o) in HORAS.items():
    _o = np.asarray(Image.open(A + o + '.png').convert('RGB').resize((512, 128), Image.LANCZOS), float).reshape(-1, 3) / 255
    COR[h] = np.linalg.lstsq(_feats(_dia), _o, rcond=None)[0]
def colore(im, h):
    a = np.asarray(im.convert('RGBA'), float) / 255
    rgb = a[..., :3] if h == 'dia' else np.clip(_feats(a[..., :3].reshape(-1, 3)) @ COR[h], 0, 1).reshape(a.shape[0], a.shape[1], 3)
    return Image.fromarray((np.dstack([rgb, a[..., 3:]]) * 255).round().astype(np.uint8))
def macio(im, esq=0., dir=0., pe=0.):
    a = np.array(im); hh, ww = a.shape[:2]; m = np.ones((hh, ww))
    if esq: m *= np.clip(np.arange(ww) / (ww * esq), 0, 1)[None, :]
    if dir: m *= np.clip((ww - 1 - np.arange(ww)) / (ww * dir), 0, 1)[None, :]
    if pe: m *= np.clip((hh - 1 - np.arange(hh)) / (hh * pe), 0, 1)[:, None]
    a[..., 3] = (a[..., 3] * m).astype(np.uint8); return Image.fromarray(a)
TUBO = {}
for k, nm, b in (('entrada', '01_entrada', dict(esq=.1, dir=.15, pe=.22)), ('meio', '02_meio_repetivel', dict(pe=.22)), ('fecha', '03_fechamento', dict(esq=.15, dir=.3, pe=.22))):
    im = Image.open(T + nm + '.png').convert('RGBA'); w, h = round(im.width * .75), round(im.height * .75)
    TUBO[k] = macio(im.resize((w, h), Image.LANCZOS), **b)
OUT['tubo'] = {k: {'w': im.width, 'h': im.height} for k, im in TUBO.items()}
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
COLS = X[0][:3]  # as colunas de espuma da quebra vão para o atlas de cada horário (com a cor do horário)
for j, im in enumerate(X[1][:4]): add(f'sp{j}', im, [16, 22, 28, 36][j], ay=im.height)
for j, im in enumerate(X[2][:2]): add(f'puf{j}', im, 20, ay=im.height)
x = 0; atl = Image.new('RGBA', (sum(t.width + 2 for t in tiles), max(t.height for t in tiles)))
for (name, f), t in zip(meta.items(), tiles): atl.paste(t, (x, 0)); f['x'] = x; x += t.width + 2
OUT['atl'] = uri(atl, q=88); OUT['p'] = meta; OUT['u'] = U
# atlas de cada horário: entrada, meio e fechamento do tubo (no tamanho guardado) e as 3 colunas de espuma (U pixels por unidade, pé embaixo)
OUT['th'] = {}
for h in HORAS:
    pcs = [(k, colore(TUBO[k], h), None) for k in ('entrada', 'meio', 'fecha')]
    # fundo do tubo (provisório, 01/11): o vão do meio é transparente e mostrava a onda do cenário. A parede de trás é feita com o
    # próprio teto do meio (20% a 50% da altura) virado de cabeça para baixo e escurecido, mais escuro em cima (embaixo do teto).
    mm = np.asarray(pcs[1][1], float); hh_ = mm.shape[0]; sl = mm[int(hh_ * .27):int(hh_ * .5)][::-1].copy()
    sl = np.asarray(Image.fromarray(sl.astype(np.uint8)).resize((mm.shape[1], int(hh_ * .42)), Image.LANCZOS), float)
    al = sl[..., 3:] / 255; base = (sl[..., :3] * al).sum((0, 1)) / max(1, al.sum()); sl[..., :3] = sl[..., :3] * al + base * (1 - al)  # sem os pixels pretos da borda
    sh = np.linspace(.5, .85, sl.shape[0])[:, None, None]; sl[..., :3] *= sh; sl[..., 3] = 255
    pcs.append(('fundo', Image.fromarray(sl.clip(0, 255).astype(np.uint8)), None))
    for j, im in enumerate(COLS):
        kk = 44 * U / im.width; pcs.append((f'col{j}', colore(im, h).resize((max(1, round(im.width * kk)), max(1, round(im.height * kk))), Image.LANCZOS), 1))
    at = Image.new('RGBA', (sum(im.width + 2 for _, im, _ in pcs), max(im.height for _, im, _ in pcs))); x = 0; pm = {}
    for k, im, c in pcs:
        at.paste(im, (x, 0)); pm[k] = dict(x=x, w=im.width, h=im.height, ax=im.width / 2, ay=im.height); x += im.width + 2
    OUT['th'][h] = {'src': uri(at, q=84), 'p': pm}
open('sfcen.js', 'w').write('window.SFC = ' + json.dumps(OUT) + ';\n'); print('sfcen.js', len(open('sfcen.js').read()) // 1024, 'KB', atl.size)
