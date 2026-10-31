"""Corrida de bugue pintada: chão das Dunas Brancas (3 horários), beira-mar, peças da pista, itens e farol -> bgcen.js (window.BGC).
Fonte: ../bugue/arte (as imagens do dono, renomeadas). Cada peça vai num atlas com o tamanho em pixels; o jogo escolhe o
tamanho no mundo (bgp.js)."""
import json, base64, io, numpy as np
from PIL import Image
from scipy import ndimage
from cc import key_green
A = '../bugue/arte/'
def uri(im, q=82, fmt='WEBP'):
    b = io.BytesIO(); im.save(b, fmt, quality=q, method=5); return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()
OUT = {'d': {}}
for h in ('dia', 'tarde', 'noite'):
    OUT['d'][h] = uri(Image.open(A + f'dunas_{h}.png').convert('RGB').resize((1024, 1024), Image.LANCZOS), 80)
# beira-mar: a faixa repete dos lados; embaixo a areia some aos poucos sobre as dunas
m = np.array(Image.open(A + 'beiramar.png').convert('RGBA').resize((1600, 400), Image.LANCZOS)).astype(float)
Hm = m.shape[0]; ramp = np.clip((Hm - np.arange(Hm)) / (Hm * .3), 0, 1)[:, None]; m[..., 3] = 255 * ramp
OUT['mar'] = uri(Image.fromarray(m.clip(0, 255).astype(np.uint8)), 80)
# chão da pista: faixa 4:1 que repete dos lados (marcas de pneu da esquerda para a direita); o jogo deita ao longo da pista
OUT['pista'] = uri(Image.open(A + 'pista.png').convert('RGB').resize((1600, 400), Image.LANCZOS), 82)
# peças em fundo verde: (nome, arquivo, caixa x0 y0 x1 y1, encolher)
P = [('bola_g', 'itens', (251, 23, 503, 264)), ('bola_p', 'itens', (638, 77, 799, 237)),
     ('balao_g', 'itens', (248, 288, 517, 510)), ('balao_p', 'itens', (648, 327, 785, 488)),
     ('frasco_g', 'itens', (110, 503, 299, 777)), ('poca_g', 'itens', (296, 605, 556, 754)),
     ('frasco_p', 'itens', (633, 596, 741, 746)), ('poca_p', 'itens', (778, 628, 940, 740)),
     ('coco_g', 'itens', (212, 769, 496, 1017)), ('coco_p', 'itens', (630, 831, 828, 1002)),
     ('guarda_g', 'itens', (180, 1020, 490, 1300)), ('guarda_p', 'itens', (627, 1077, 815, 1265)),
     ('onda_g', 'itens', (173, 1300, 524, 1521)), ('onda_p', 'itens', (622, 1351, 838, 1501)),
     ('fofa1', 'chao', (60, 117, 300, 334)), ('fofa2', 'chao', (336, 89, 779, 368)), ('fofa3', 'chao', (815, 23, 1490, 404)),
     ('faixa', 'chao', (48, 418, 1488, 592)), ('rampa_at', 'chao', (73, 634, 604, 977)), ('setas', 'chao', (702, 633, 1050, 978)), ('trilha', 'chao', (1104, 618, 1468, 995)),
     ('caixa', 'pecas', (80, 81, 336, 324)), ('rampa', 'pecas', (50, 369, 701, 741)), ('largada', 'pecas', (742, 475, 1491, 596)),
     ('band_v', 'pecas', (39, 782, 242, 936)), ('band_b', 'pecas', (283, 788, 485, 940)),
     ('mureta', 'pecas', (721, 826, 907, 932)), ('torre', 'farol', (57, 204, 692, 798))]
K = .5  # pixels guardados por pixel da folha
KEYED = {f: key_green(A + f + '.png') for f in ('itens', 'chao', 'pecas', 'farol')}
tiles = []
for nm, f, (x0, y0, x1, y1) in P:
    a = KEYED[f][y0:y1, x0:x1].copy()
    if nm != 'mureta' and nm != 'faixa':  # só a peça do meio da caixa (sem pedaço do vizinho)
        lab, n = ndimage.label(ndimage.binary_closing(a[..., 3] > 40, iterations=2))
        if n > 1:
            sz = ndimage.sum(np.ones(lab.shape), lab, range(1, n + 1)); keep = [i + 1 for i in range(n) if sz[i] > sz.max() * .02]
            a[..., 3] = np.where(np.isin(ndimage.grey_dilation(lab, size=5), keep) | np.isin(lab, keep), a[..., 3], 0)
    if f == 'chao':  # areia nunca tem mais verde que vermelho: a franja verde da borda some
        r, g = a[..., 0].astype(float), a[..., 1].astype(float); ex = np.clip((g - r * .86) / 22, 0, 1)
        a[..., 3] = (a[..., 3] * (1 - ex)).astype(np.uint8); a[..., 1] = np.minimum(g, r * .93).astype(np.uint8)
    im = Image.fromarray(a); tiles.append((nm, im.resize((max(1, round(im.width * K)), max(1, round(im.height * K))), Image.LANCZOS)))
# facho do farol: luz amarela sobre o verde -> transparência pela quantidade de vermelho
fa = np.array(Image.open(A + 'farol.png').convert('RGB')).astype(float)[285:741, 768:1462]
al = np.clip((fa[..., 0] - 8) / 240, 0, 1); beam = np.zeros(fa.shape[:2] + (4,)); beam[..., 0] = 255; beam[..., 1] = 244; beam[..., 2] = 170; beam[..., 3] = al * 255
bi = Image.fromarray(beam.astype(np.uint8)); tiles.append(('facho', bi.resize((round(bi.width * K), round(bi.height * K)), Image.LANCZOS)))
# atlas em prateleiras
WMAX = 2048; x = y = rowh = 0; meta = {}
for nm, t in tiles:
    if x + t.width > WMAX: x = 0; y += rowh + 2; rowh = 0
    meta[nm] = {'x': x, 'y': y, 'w': t.width, 'h': t.height}; x += t.width + 2; rowh = max(rowh, t.height)
atl = Image.new('RGBA', (WMAX, y + rowh))
for nm, t in tiles: atl.paste(t, (meta[nm]['x'], meta[nm]['y']))
OUT['atl'] = uri(atl, 86); OUT['p'] = meta
# lagoa (4 quadros da água, 1 coluna), esteira de turbo (4 quadros, 1 fileira) e efeitos (6 fileiras de 4): verde tirado e a
# franja verde da borda some (só onde o verde passa do vermelho e do azul; a água é mais azul que verde)
def keyd(path):
    k = key_green(path); r, g, b = (k[..., i].astype(float) for i in range(3)); ex = np.clip((g - np.maximum(r, b) * .97) / 20, 0, 1)
    k[..., 3] = (k[..., 3] * (1 - ex)).astype(np.uint8); k[..., 1] = np.minimum(g, np.maximum(r, b)).astype(np.uint8); return k
L4 = keyd(A + 'lagoa.png'); lag = Image.new('RGBA', (576, 4 * 194))
for i in range(4): lag.paste(Image.fromarray(L4[i * 384:(i + 1) * 384]).resize((576, 192), Image.LANCZOS), (0, i * 194))
OUT['lagoa'] = uri(lag, 84)
E4 = keyd(A + 'esteira.png'); ys, xs = np.where(E4[..., 3] > 30); y0, y1 = ys.min(), ys.max() + 1
bx = [(np.where(E4[y0:y1, i * 512:(i + 1) * 512, 3].max(0) > 30)[0]) for i in range(4)]; w0 = max(b.max() - b.min() + 1 for b in bx)
est = Image.new('RGBA', (4 * (w0 // 3 + 2), (y1 - y0) // 3))
for i, b in enumerate(bx):
    c = (b.min() + b.max()) // 2 + i * 512; t = Image.fromarray(E4[y0:y1, c - w0 // 2:c - w0 // 2 + w0]).resize((w0 // 3, (y1 - y0) // 3), Image.LANCZOS); est.paste(t, (i * (w0 // 3 + 2), 0))
OUT['esteira'] = {'src': uri(est, 86), 'w': int(w0 // 3), 'h': int((y1 - y0) // 3)}
F = keyd(A + 'efeitos.png'); fx = Image.new('RGBA', (4 * 128, 6 * 128))
for r in range(6):
    for c in range(4): fx.paste(Image.fromarray(F[r * 512:(r + 1) * 512, c * 512:(c + 1) * 512]).resize((128, 128), Image.LANCZOS), (c * 128, r * 128))
OUT['fx'] = uri(fx, 86)
open('bgcen.js', 'w').write('window.BGC = ' + json.dumps(OUT) + ';\n'); print('bgcen.js', len(open('bgcen.js').read()) // 1024, 'KB', atl.size)
atl.save('/tmp/bgatl.png')
