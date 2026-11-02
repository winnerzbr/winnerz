"""Corrida na areia pintada (02/11/2026): o pacote do dono (Praia da Maré Baixa, só o dia por enquanto) -> crcen.js (window.CRC).
f: fundo distante (céu, mar e areia), anda bem devagar; areia: faixa da areia do fundo, emendada nas pontas, que as raias repetem;
m: as duas peças do meio-plano (guarda-sóis com a torcida e o posto de salva-vidas); atl: obstáculos, faixa de chegada, bandeira e marca
da largada (fundo verde vira transparente, cada peça separada pelo desenho dela). Fonte: ../corrida/arte.
02/11 (mais tarde): chegaram a manhã, o pôr do sol e a noite (com as luzes do fundo e do posto): f, areia e m ficam por horário;
lf e lm são as luzes da noite (fundo preto, somadas por cima). Fonte: ../corrida/arte_horas.
Cada camada vem numa imagem só com os 4 horários empilhados (dia, manhã, tarde, noite: linha 0 a 3), para caber no limite de arquivos da página."""
import json, base64, io, numpy as np
from PIL import Image
from scipy import ndimage
from cc import key_green
A = '../corrida/arte/'
def uri(im, fmt='WEBP', q=82):
    b = io.BytesIO(); im.save(b, fmt, quality=q, method=5); return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()
OUT = {'m': {}}; FS, AS, ROW = [], [], {}
B = '../corrida/arte_horas/'
HORAS = {'dia': (A + '03_Cenario_Distante_Dia', A + '04_Camada_Intermediaria_Dia'), 'manha': (B + '01_Distante_Manha', B + '02_Intermediaria_Manha'),
         'tarde': (B + '03_Distante_Por_do_Sol', B + '04_Intermediaria_Por_do_Sol'), 'noite': (B + '05_Distante_Noite', B + '06_Intermediaria_Noite')}
OUT['fw'], OUT['fh'] = 1600, 900
for h, (ff, _) in HORAS.items():
    far = Image.open(ff + '.png').convert('RGB')
    ROW[h] = len(FS); FS.append(far.resize((1600, 900), Image.LANCZOS))
    # areia das raias: a parte de baixo do fundo (só areia), emendada (as pontas se misturam) para repetir sem costura
    a = np.array(far).astype(float)[740:941]; n = 260; w = a.shape[1] - n
    t = np.linspace(0, 1, n)[None, :, None]
    s = a[:, :w].copy(); s[:, :n] = a[:, w:] * (1 - t) + a[:, :n] * t
    AS.append(Image.fromarray(s.clip(0, 255).astype(np.uint8)).resize((1024, 146), Image.LANCZOS))
def pilha(ims):
    out = Image.new(ims[0].mode, (max(i.width for i in ims), sum(i.height for i in ims)))
    for j, i in enumerate(ims): out.paste(i, (0, j * ims[0].height))
    return out
OUT['f'] = uri(pilha(FS), q=80); OUT['areia'] = uri(pilha(AS), q=80); OUT['row'] = ROW
OUT['lf'] = uri(Image.open(B + '07_Luzes_Distante_Noite.png').convert('RGB').resize((1600, 900), Image.LANCZOS), q=80)
# peças: separadas pelo desenho (componente), cada uma com a sua máscara
def pecas(path, boxes=None, minpx=4000):
    k = key_green(path); m = ndimage.binary_closing(k[..., 3] > 40, iterations=3); lab, nn = ndimage.label(m); out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        mm = lab[sl] == i + 1
        if mm.sum() < minpx: continue
        p = k[sl].copy(); p[..., 3] = np.where(ndimage.binary_dilation(mm, iterations=2), p[..., 3], 0); out.append(((sl[1].start, sl[0].start), p))
    return sorted(out, key=lambda q: (q[0][1] // 150, q[0][0]))
U = 6.0; tiles, meta = [], {}
def add(name, rgba, upx):  # upx: unidades do jogo por pixel da prancha (mantém os tamanhos entre as peças da mesma prancha)
    im = Image.fromarray(rgba); bb = im.getbbox(); im = im.crop(bb); kk = upx * U
    w, h = max(1, round(im.width * kk)), max(1, round(im.height * kk)); tiles.append(im.resize((w, h), Image.LANCZOS)); meta[name] = dict(w=w, h=h)
ob = pecas(A + '01_Obstaculos.png')
assert len(ob) == 9, len(ob)
for nm, (_, p) in zip(['cerca', 'cerca_caida', 'tronco', 'castelo', 'castelo_caido', 'siri0', 'siri1', 'poca', 'fofa'], ob): add(nm, p, .046)  # a cerca em pé: 13 de altura
fl = pecas(A + '02_Largada_Chegada_Bandeiras.png', minpx=2000)
assert len(fl) == 4, len(fl)
add('chegada', fl[0][1], .075); add('bandeira', fl[1][1], .06)
k2 = key_green(A + '02_Largada_Chegada_Bandeiras.png'); add('largada', k2[800:925, 930:1412], .06)
x = 0; atl = Image.new('RGBA', (sum(t.width + 2 for t in tiles), max(t.height for t in tiles)))
for (name, f), t in zip(meta.items(), tiles): atl.paste(t, (x, 0)); f['x'] = x; x += t.width + 2
OUT['atl'] = uri(atl, q=88); OUT['p'] = meta; OUT['u'] = U
# meio-plano: as duas peças (guarda-sol vermelho com a torcida atrás da corda; guarda-sol azul com o posto de salva-vidas), por horário;
# a luz do posto (noite) recortada no mesmo lugar da peça do posto
def meio(path):
    k = key_green(path); m = ndimage.binary_closing(k[..., 3] > 40, iterations=3); lab, nn = ndimage.label(m); out = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        mm = lab[sl] == i + 1
        if mm.sum() < 4000: continue
        p = k[sl].copy(); p[..., 3] = np.where(ndimage.binary_dilation(mm, iterations=2), p[..., 3], 0)
        bb = Image.fromarray(p).getbbox(); out.append(((sl[1].start + bb[0], sl[0].start + bb[1], sl[1].start + bb[2], sl[0].start + bb[3]), p[bb[1]:bb[3], bb[0]:bb[2]]))
    return sorted(out, key=lambda q: q[0][0])
BOX = None; MS = []
# 02/11: mais 3 peças (quiosque de coco, coqueiros, rede de vôlei; ../corrida/props). Vieram manhã, pôr do sol, noite e luzes;
# o dia ainda não: de dia usa a manhã. Mesma escala da prancha antiga (a prancha nova tem 1536 de largura, a antiga 1672).
PR = '../corrida/props/Costa_WinnerZ_Props_Praia_'
PROPS = {'dia': PR + 'Manha', 'manha': PR + 'Manha', 'tarde': PR + 'Por_do_Sol', 'noite': PR + 'Noite'}
KBOX = None
for h, (_, fm) in HORAS.items():
    ims = []; hs = []
    for bx, p in meio(fm + '.png'):
        ims.append(Image.fromarray(p)); hs.append(p.shape[0] * 1.0)
        if h == 'noite': BOX = bx
    for bx, p in meio(PROPS[h] + '.png'):
        ims.append(Image.fromarray(p)); hs.append(p.shape[0] * 1672 / 1536)
        if h == 'noite' and len(ims) == 3: KBOX = bx
    ims = [im.resize((round(im.width * 300 / im.height), 300), Image.LANCZOS) for im in ims]
    row = Image.new('RGBA', (sum(im.width + 4 for im in ims), 300)); x = 0; OUT['m'] = []
    for im, hh in zip(ims, hs): row.paste(im, (x, 0)); OUT['m'].append({'x': x, 'w': im.width, 'h': 300, 'hs': round(hh)}); x += im.width + 4
    MS.append(row)
OUT['ms'] = uri(pilha(MS), q=86)
lm = Image.open(B + '08_Luzes_Intermediaria_Noite.png').convert('RGB').crop(BOX); OUT['lm'] = uri(lm.resize((OUT['m'][1]['w'], 300), Image.LANCZOS), q=84)
lk = Image.open(PR + 'Luzes.png').convert('RGB').crop(KBOX); OUT['lk'] = uri(lk.resize((OUT['m'][2]['w'], 300), Image.LANCZOS), q=84)
open('crcen.js', 'w').write('window.CRC = ' + json.dumps(OUT) + ';\n')
print('crcen.js', len(open('crcen.js').read()) // 1024, 'KB', atl.size, {k: (v['w'], v['h']) for k, v in meta.items()}, OUT['m'], BOX, KBOX)
atl.save('/tmp/claude-0/-home-claude/e0bf145e-a626-5d21-b81a-9d762c809f56/scratchpad/cr_atl.png')
