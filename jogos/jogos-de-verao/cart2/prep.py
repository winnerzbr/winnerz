import numpy as np, cv2, json, base64, io, math
from PIL import Image
from scipy import ndimage
from cc import key_green
PX = 8  # pixels guardados por unidade do mundo
def enc(im, q=88):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
def load(n): return Image.open(f'out/{n}.png').convert('RGBA')
A = {}
def put(name, im, s, **pts):
    """s = unidades por pixel do recorte; pts em pixels do recorte -> guarda em pixels da imagem final"""
    f = PX * s; w, h = max(1, round(im.width * f)), max(1, round(im.height * f))
    im2 = im.resize((w, h), Image.LANCZOS)
    d = {'src': enc(im2), 'w': w, 'h': h}
    for k, v in pts.items(): d[k] = v if k == 'ang' else [round(v[0] * w / im.width, 2), round(v[1] * h / im.height, 2)] if isinstance(v, (tuple, list)) else round(v * f, 2)
    A[name] = d
def limb(name, Apt, Bpt, s, ra, rb):
    """membro: gira até a linha A→B ficar deitada (A à esquerda)"""
    im = np.array(load(name)); h, w = im.shape[:2]
    phi = math.degrees(math.atan2(Bpt[1] - Apt[1], Bpt[0] - Apt[0]))
    M = cv2.getRotationMatrix2D((w / 2, h / 2), phi, 1)
    cs, sn = abs(M[0, 0]), abs(M[0, 1]); nw, nh = int(h * sn + w * cs) + 4, int(h * cs + w * sn) + 4
    M[0, 2] += nw / 2 - w / 2; M[1, 2] += nh / 2 - h / 2
    r = cv2.warpAffine(im, M, (nw, nh), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    a2 = M @ np.array([*Apt, 1]); b2 = M @ np.array([*Bpt, 1])
    assert abs(a2[1] - b2[1]) < 1.5, (name, a2, b2)
    put(name, Image.fromarray(r), s, a=tuple(a2), b=tuple(b2), ra=ra, rb=rb)
# ---- IAmiguinho (folha nova: tubos sem bolinhas, cabeça e boné de lado e de frente)
def loadD(n): return Image.open(f'outD/{n}.png').convert('RGBA')
def no_eyes(im, box):
    """apaga os olhos pintados: a tela vira um vidro escuro liso (o jogo desenha as expressões por cima)"""
    a = np.array(im).astype(float); x0, y0, x1, y1 = box; sub = a[y0:y1, x0:x1]
    lum = sub[..., :3].mean(axis=2)
    eye = (sub[..., 1] > 110) & (sub[..., 2] > 140) & (sub[..., 0] < 150)
    scr = ((lum < 95) | eye) & (sub[..., 3] > 200)
    scr = ndimage.binary_fill_holes(ndimage.binary_closing(scr, iterations=4))
    lab, n = ndimage.label(scr); big = np.argmax(ndimage.sum(scr, lab, range(1, n + 1))) + 1; scr = lab == big
    inner = ndimage.binary_erosion(scr, iterations=3)
    H = sub.shape[0]; yy = (np.arange(H)[:, None] / H)
    col = np.dstack([14 + 10 * yy + 0 * scr, 18 + 14 * yy + 0 * scr, 34 + 26 * yy + 0 * scr])
    soft = ndimage.gaussian_filter(inner.astype(float), 1.2)[..., None]
    sub[..., :3] = sub[..., :3] * (1 - soft) + col * soft
    a[y0:y1, x0:x1] = sub
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))
def tube(name, s):
    im = loadD(name); w, h = im.size; r = w / 2 - 4
    limb2(name, im, (w / 2, r + 4), (w / 2, h - r - 4), s, r, r)
def limb2(name, img, Apt, Bpt, s, ra, rb):
    im = np.array(img); h, w = im.shape[:2]
    phi = math.degrees(math.atan2(Bpt[1] - Apt[1], Bpt[0] - Apt[0]))
    M = cv2.getRotationMatrix2D((w / 2, h / 2), phi, 1)
    cs, sn = abs(M[0, 0]), abs(M[0, 1]); nw, nh = int(h * sn + w * cs) + 4, int(h * cs + w * sn) + 4
    M[0, 2] += nw / 2 - w / 2; M[1, 2] += nh / 2 - h / 2
    r = cv2.warpAffine(im, M, (nw, nh), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
    a2 = M @ np.array([*Apt, 1]); b2 = M @ np.array([*Bpt, 1])
    put(name, Image.fromarray(r), s, a=tuple(a2), b=tuple(b2), ra=ra, rb=rb)
tube('braco', .036); tube('antebraco', .036); tube('coxa', .04); tube('canela', .04)
put('tronco', loadD('tronco'), .0435, hip=(90, 232), neck=(88, 18))
put('cabeca', no_eyes(loadD('cabeca'), (180, 60, 262, 200)), .06, neck=(132, 214), scr=(212, 128), top=(132, 10))
put('cabeca_f', no_eyes(loadD('cabeca_f'), (60, 50, 260, 205)), .06, neck=(160, 216), scr=(160, 126), top=(160, 10))
put('bone', loadD('bone'), .068, bot=(118, 142), top=(125, 12))
put('bone_f', loadD('bone_f'), .068, bot=(128, 150), top=(128, 12))
put('helice', loadD('helice'), .04, hub=(110, 32), stem=(110, 74))
put('mao', loadD('mao'), .03, wr=(25, 88), ang=math.atan2(75 - 88, 110 - 25))
put('punho', loadD('punho'), .033, wr=(68, 142), ang=-math.pi / 2)
put('aponta', loadD('aponta'), .032, wr=(62, 162), ang=-math.pi / 2)
put('sapato', loadD('sapato'), .055, ank=(78, 26), sole=(105, 150))
put('sapato_f', loadD('sapato_f'), .055, ank=(90, 26), sole=(90, 158))
# ---- Amiguinho (bolha): contorno escuro uniforme em volta de tudo
def outline(im, px=4, col=(52, 22, 66)):
    a = np.array(im); m = a[..., 3] > 100
    big = np.pad(m, px + 2); dil = ndimage.binary_dilation(big, iterations=px)[px + 2:-px - 2, px + 2:-px - 2]
    out = np.zeros((a.shape[0], a.shape[1], 4), np.uint8); out[dil] = (*col, 255)
    base = Image.fromarray(out); base.alpha_composite(im); return base
SB = .107
put('b_frente', outline(load('b_frente')), SB, foot=(152, 330), vis=(152, 122))
put('b_34', outline(load('b_34')), SB, foot=(150, 338), vis=(170, 110))
put('b_lado', outline(load('b_lado')), SB, foot=(160, 338), vis=(225, 112))
put('b_amassa', outline(load('b_amassa')), SB, foot=(190, 244), vis=(205, 132))
put('b_pulo', outline(load('b_pulo')), SB, foot=(150, 392), vis=(165, 92))
put('b_mao', outline(load('b_mao'), 3), .092, c=(48, 52))
# ---- objetos
put('bola', load('bp1'), 23 / 216, c=(112, 110))
for k in (1, 2, 3): im = load(f'areia{k}'); put(f'areia{k}', im, [0, .06, .07, .075][k], c=(im.width / 2, im.height))
rede = load('rede')
put('poste', rede.crop((128, 0, 222, 392)), .1, cx=(172 - 128, 0))
put('malha', rede.crop((330, 122, 640, 240)), .1)
put('faixa', rede.crop((330, 72, 640, 124)), .1)
put('placar', load('placar').crop((0, 20, 348, 232)), .12, c1=(125, 120), c2=(245, 120))
# ---- cenário (16:9, guardado com 1440 de largura)
def bg(path, key, q=84):
    im = Image.open(path).convert('RGB')
    if key: im = Image.fromarray(key_green(path))
    im = im.convert('RGBA').resize((1440, 810), Image.LANCZOS)
    return {'src': enc(im, q), 'w': 1440, 'h': 810}
A['ceu'] = bg('src/ceu.png', False); A['mar'] = bg('src/mar.png', True); A['areia'] = bg('src/areia.png', True)
js = 'window.C2 = ' + json.dumps(A) + ';\n'
open('assets.js', 'w').write(js)
print(len(js) // 1024, 'KB'); print({k: (v['w'], v['h']) for k, v in A.items()})
print({k: {kk: vv for kk, vv in v.items() if kk not in ('src', 'w', 'h')} for k, v in A.items()})
