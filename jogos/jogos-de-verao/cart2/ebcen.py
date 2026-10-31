"""Embaixadinha pintada: cenário da Praia do Centro (fundo e meio-plano nos 4 horários, luzes da noite), bolas, biruta e gaivota
-> ebcen.js (window.EBC). Fonte: ../embaix/arte (as imagens do dono, renomeadas)."""
import json, base64, io, numpy as np
from PIL import Image
from scipy import ndimage
from cc import key_green
A = '../embaix/arte/'; W, H = 1280, 720
def uri(im, fmt='WEBP', q=82):
    b = io.BytesIO(); im.save(b, fmt, quality=q, method=5); return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()
OUT = {'f': {}, 'm': {}}
for h in ('dia', 'manha', 'tarde', 'noite'):
    OUT['f'][h] = uri(Image.open(A + f'fundo_{h}.png').convert('RGB').resize((W, H), Image.LANCZOS), q=80)
    rgba = key_green(A + f'meio_{h}.png'); al = rgba[..., 3].astype(float)
    # a faixa de areia do meio-plano acaba antes do chão do jogo: o fim dela some aos poucos sobre a areia do fundo
    Hs = al.shape[0]; cols = al[:, int(al.shape[1] * .3):int(al.shape[1] * .7)]; rows = np.where((cols > 128).mean(1) > .9)[0]; bot = rows.max()
    ramp = np.clip((bot - np.arange(Hs)) / (Hs * .07), 0, 1)[:, None]; al = al * ramp
    rgba[..., 3] = al.clip(0, 255).astype(np.uint8)
    OUT['m'][h] = uri(Image.fromarray(rgba).resize((W, H), Image.LANCZOS), q=86)
    print(h, 'fim da areia do meio-plano em', round(bot / Hs * 100), '% da altura')
OUT['lf'] = uri(Image.open(A + 'luz_fundo.png').convert('RGB').resize((960, 540), Image.LANCZOS), q=76)
OUT['lm'] = uri(Image.open(A + 'luz_meio.png').convert('RGB').resize((960, 540), Image.LANCZOS), q=76)
# peças: componentes de cada folha em fundo verde
def parts(path, minpx=2000):
    rgba = key_green(path); m = ndimage.binary_closing(rgba[..., 3] > 40, iterations=3); lab, _ = ndimage.label(m); out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        mm = lab[sl] == i + 1
        if mm.sum() < minpx: continue
        im = rgba[sl].copy(); im[..., 3] = np.where(mm, im[..., 3], 0); out.append(((sl[0].start + sl[0].stop) / 2, (sl[1].start + sl[1].stop) / 2, Image.fromarray(im), sl))
    return out
tiles, meta = [], {}
def add(name, im, k, ax=None, ay=None):
    w, h = max(1, round(im.width * k)), max(1, round(im.height * k)); r = im.resize((w, h), Image.LANCZOS); tiles.append(r)
    meta.setdefault(name, []).append(dict(w=w, h=h, ax=round((ax if ax is not None else im.width / 2) * k, 1), ay=round((ay if ay is not None else im.height / 2) * k, 1)))
U = 3.2 * 1.25  # pixels guardados por unidade do jogo (folga para a tela cheia)
P = sorted(parts(A + 'bolas.png'), key=lambda p: (p[0], p[1]))
rows = {}
for cy, cx, im, sl in P: rows.setdefault(round(cy / 140), []).append((cx, im))
R = [sorted(v, key=lambda t: t[0]) for _, v in sorted(rows.items())]
assert [len(r) for r in R] == [4, 1, 3, 2, 1], [len(r) for r in R]
soc = R[0][0][1].width
for _, im in R[0]: add('futebol', im, 17 * U / soc)
add('futebol_firula', R[1][0][1], 17 * U / soc, ax=R[1][0][1].width - soc / 2)  # âncora no centro da bola (o rastro fica para trás)
for _, im in R[2]: add('praia', im, 24 * U / im.width)
for _, im in R[3]: add('pingue', im, 9.2 * U / im.width)
G = sorted(parts(A + 'gaivota.png'), key=lambda p: p[1])
for _, _, im, _ in G: add('gaivota', im, 36 * U / G[0][2].width)
B = sorted(parts(A + 'biruta.png'), key=lambda p: p[1])
pole_h = max(im.height for _, _, im, _ in B)
for _, _, im, _ in B:
    a = np.array(im)[..., 3] > 100; low = np.where(a[int(im.height * .9):].any(0))[0]; px = (low.min() + low.max()) / 2
    add('biruta', im, 52 * U / pole_h, ax=px, ay=im.height)
X = 0; HH = max(t.height for t in tiles); atl = Image.new('RGBA', (sum(t.width + 2 for t in tiles), HH)); i = 0
for name, L in meta.items():
    for f in L: t = tiles[i]; atl.paste(t, (X, 0)); f['x'] = X; X += t.width + 2; i += 1
OUT['atl'] = uri(atl, q=88); OUT['p'] = meta; OUT['u'] = U
open('ebcen.js', 'w').write('window.EBC = ' + json.dumps(OUT) + ';\n'); print('ebcen.js', len(open('ebcen.js').read()) // 1024, 'KB', {k: len(v) for k, v in meta.items()}, atl.size)
