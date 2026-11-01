"""Teaser do IAmiguinho: monta o vídeo a partir das peças pintadas do dono (pecas/) e grava em mp4.
Uso: python3 render.py 16x9|9x16 [t1 t2 ...]   (com tempos: só salva fotos desses instantes em fotos/)
Linha do tempo (segundos):
  0.0-8.2   plano do alto: a câmera desce e se aproxima do exército de robôs (escuro, névoa, poeira, luz piscando)
  8.2-14.6  na altura dos robôs: avança pelo corredor até o robô do meio; o fundo vai saindo de foco
  14.6-24.6 o cientista entra, coloca o boné e sai
  24.6-31.8 close do peito para cima, a câmera chega perto; o visor pisca, acende e os olhos abrem
  31.8-33.5 tela preta"""
import sys, os, math, subprocess, numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops
from cc import key_green

FMT = sys.argv[1] if len(sys.argv) > 1 else '16x9'
W, H = (1920, 1080) if FMT == '16x9' else (1080, 1920)
FPS, TOTAL = 30, 33.5
P = 'pecas/'

def ease(u): u = min(1, max(0, u)); return u * u * (3 - 2 * u)
def lerp(a, b, u): return a + (b - a) * u
def keyed(nm):
    k = key_green(P + nm + '.png'); return Image.fromarray(k)

# ---------- peças
ALTO = Image.open(P + 'galpao_alto.png').convert('RGB')
NIVEL = Image.open(P + 'galpao_nivel.png').convert('RGB')
NIVEL_BL = [NIVEL] + [NIVEL.filter(ImageFilter.GaussianBlur(r)) for r in (0.8, 2.0, 4.0)]
SEM, COM = keyed('robo_sem'), keyed('robo_com')
CLOSE = keyed('close')
CI = keyed('cientista')
# cor das peças com o tom do galpão: medido num robô vizinho do plano na altura dos robôs (cúpula da cabeça)
viz = np.array(NIVEL).astype(float)[432:452, 712:772].reshape(-1, 3).mean(0)
dom = np.array(SEM).astype(float); dm = dom[200:300, 450:800][..., :3][dom[200:300, 450:800][..., 3] > 200].mean(0)
GAIN = np.clip(viz / dm, .2, 1.2)
def grade(im, gain, amb=(0, 0, 0)):
    a = np.array(im).astype(float); a[..., :3] = np.clip(a[..., :3] * gain + amb, 0, 255); return Image.fromarray(a.astype(np.uint8))
GAIN = GAIN * np.array([.92, .96, 1.04]); SEM_G, COM_G = grade(SEM, GAIN, (0, 2, 10)), grade(COM, GAIN, (0, 2, 10))
SEM_A = grade(SEM, GAIN * .85)  # no plano do alto, um pouco mais escuro
# cientista: mais escuro e frio, como o resto
CI_G = grade(CI, np.array([.62, .66, .82]))
# células do cientista: recorte e pé de apoio (meio dos sapatos)
CW, CH = CI.width / 4, CI.height / 2
CELL = []
for i in range(8):
    x0, y0 = int((i % 4) * CW), int((i // 4) * CH); c = CI_G.crop((x0, y0, x0 + int(CW), y0 + int(CH))); al = np.array(c)[..., 3] > 128
    ys, xs = np.where(al); bot = ys.max(); fx = np.where(al[bot - 18:bot + 1].any(0))[0]
    # o alto do corpo some no escuro (no vertical, o peito do cientista fica dentro da tela)
    a = np.array(c); top = ys.min(); g = np.clip((np.arange(a.shape[0]) - top) / 150, 0, 1) ** 1.5
    a[..., 3] = (a[..., 3] * g[:, None]).astype(np.uint8); a[..., :3] = (a[..., :3] * (.35 + .65 * g[:, None, None])).astype(np.uint8); c = Image.fromarray(a)
    CELL.append((c, (fx.min() + fx.max()) / 2, bot, ys.min()))

# ---------- câmera sobre uma placa (coordenadas da placa, s = pixels de saída por pixel da placa)
def cam_img(plate, cx, cy, s, size=(W, H)):
    hw, hh = size[0] / 2 / s, size[1] / 2 / s
    cx = min(max(cx, hw), plate.width - hw) if plate.width > 2 * hw else plate.width / 2
    cy = min(max(cy, hh), plate.height - hh) if plate.height > 2 * hh else plate.height / 2
    return plate.transform(size, Image.EXTENT, (cx - hw, cy - hh, cx + hw, cy + hh), Image.BICUBIC), cx, cy
def put(dst, spr, x, y, w, h):
    """sprite redimensionado para w x h com o canto em x,y (coordenadas de saída)"""
    w, h = max(1, round(w)), max(1, round(h))
    if x + w < 0 or y + h < 0 or x > dst.width or y > dst.height: return
    dst.alpha_composite(spr.resize((w, h), Image.LANCZOS if w < spr.width else Image.BICUBIC), (round(x), round(y))) if 0 <= round(x) and 0 <= round(y) and round(x) + w <= dst.width and round(y) + h <= dst.height else _put_clip(dst, spr.resize((w, h), Image.LANCZOS), round(x), round(y))
def _put_clip(dst, im, x, y):
    L = Image.new('RGBA', dst.size, (0, 0, 0, 0)); L.paste(im, (x, y)); dst.alpha_composite(L)
def shadow(dst, x, y, rx, ry, a=110):
    L = Image.new('L', dst.size, 0); ImageDraw.Draw(L).ellipse((x - rx, y - ry, x + rx, y + ry), fill=a); L = L.filter(ImageFilter.GaussianBlur(ry * .8))
    dst.paste(Image.new('RGBA', dst.size, (5, 8, 20, 255)), (0, 0), L)

# ---------- névoa, poeira, vinheta
rng = np.random.default_rng(7)
def _fog():
    n = np.zeros((540, 960))
    for sc, w in ((6, .55), (18, .3), (48, .15)):
        z = rng.random((540 // sc + 2, 960 // sc + 2)); im = Image.fromarray((z * 255).astype(np.uint8)).resize((960 + 2 * sc, 540 + 2 * sc), Image.BICUBIC)
        n += w * np.array(im).astype(float)[:540, :960] / 255
    n = (n - n.min()) / (n.max() - n.min()); return Image.fromarray((n * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))
FOG = _fog()
FOGC = Image.new('RGB', (W, H), (70, 95, 150))
def fog(frame, t, amt):
    if amt <= 0: return frame
    x = (t * 9) % 300; f = FOG.crop((x, 40, x + 640, 40 + 640 * H / W)).resize((W, H), Image.BICUBIC)
    m = f.point(lambda v: int(v * amt))
    return Image.composite(FOGC, frame, m)
DUST = rng.random((140, 4))
def dust(frame, t, amt):
    if amt <= 0: return frame
    L = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(L)
    for x0, y0, sp, br in DUST:
        x = (x0 * W + math.sin(t * .4 + y0 * 9) * 30) % W; y = (y0 * H + t * (8 + sp * 14)) % H; r = 1 + sp * 2.2 * (W / 1920)
        d.ellipse((x - r, y - r, x + r, y + r), fill=(200, 220, 255, int(60 + 120 * br * amt)))
    frame = frame.convert('RGBA'); frame.alpha_composite(L.filter(ImageFilter.GaussianBlur(1))); return frame.convert('RGB')
yy, xx = np.mgrid[0:H, 0:W]; VIG = np.clip(1.15 - .55 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2), .35, 1)[..., None]
def finish(frame, bright):
    a = np.asarray(frame).astype(np.float32) * VIG * bright; return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
def flicker(t):
    # luzes do galpão: quase sempre firmes, com tremidas curtas de vez em quando
    f = 1.0
    for t0 in (2.3, 5.9, 10.7, 12.1, 17.4, 21.6, 26.2):
        if 0 <= t - t0 < .35: f *= 1 - .22 * abs(math.sin((t - t0) * 40)) * (1 - (t - t0) / .35)
    return f

# ---------- planos
HERO_N = dict(x=832, feet=535, h=110)          # robô do meio no plano na altura dos robôs (cúpula até o pé, sem boné)
HERO_A = dict(x=836, feet=416, h=55)           # no plano do alto
SRC_BODY = 1140 - 164                           # robô sem boné: do pé ao alto da cabeça, em pixels da peça
def hero_on_plate(frame, cx, cy, s, hp, spr, cap=False, squash=1.0):
    k = hp['h'] / SRC_BODY * s                  # pixels de saída por pixel da peça
    w, h = spr.width * k, spr.height * k * squash
    fx = (hp['x'] - cx) * s + W / 2; fy = (hp['feet'] - cy) * s + H / 2
    # o pé do robô fica na linha 1140 da peça e o meio dele na coluna 627
    shadow(frame, fx, fy, 300 * k, 40 * k, 120)
    put(frame, spr, fx - 627 * k, fy - 1140 * k * squash, w, h)
    return k, fx, fy

if FMT == '16x9':
    S1 = [(1.148, 836, 470.5), (2.6, 836, 418)]
    S2 = [(1.148, 832, 470.5), (6.38, 853.9, 470.7)]
else:
    S1 = [(2.04, 836, 470.5), (4.2, 836, 418)]
    S2 = [(2.04, 832, 470.5), (5.87, 855.8, 410.6)]

def shot1(t):
    u = ease((t - 0) / 8.2); s = math.exp(lerp(math.log(S1[0][0]), math.log(S1[1][0]), u)); cx = lerp(S1[0][1], S1[1][1], u); cy = lerp(S1[0][2], S1[1][2], u)
    fr, cx, cy = cam_img(ALTO, cx, cy, s); fr = fr.convert('RGBA')
    hero_on_plate(fr, cx, cy, s, HERO_A, SEM_A)
    fr = fog(fr.convert('RGB'), t, .32); fr = dust(fr, t, .6)
    b = flicker(t) * ease(t / 1.8) * (1 - ease((t - 7.4) / .8))
    return finish(fr, b)

def cam2(t):
    u = ease((t - 8.2) / 6.4); s = math.exp(lerp(math.log(S2[0][0]), math.log(S2[1][0]), u))
    return s, lerp(S2[0][1], S2[1][1], u), lerp(S2[0][2], S2[1][2], u), u
def plate_blur(s, extra=0.0):
    # o fundo vai saindo de foco conforme a câmera chega perto (só o robô do meio fica nítido)
    lv = min(3, max(0, (math.log(s) - math.log(1.6)) / (math.log(6.4) - math.log(1.6)) * 3 + extra))
    return lv
def nivel_at(cx, cy, s, lv):
    i = int(lv); f = lv - i; a, cx2, cy2 = cam_img(NIVEL_BL[i], cx, cy, s)
    if f > .02 and i < 3: b, _, _ = cam_img(NIVEL_BL[i + 1], cx, cy, s); a = Image.blend(a, b, f)
    return a, cx2, cy2

def shot2(t):
    s, cx, cy, u = cam2(t); fr, cx, cy = nivel_at(cx, cy, s, plate_blur(s)); fr = fr.convert('RGBA')
    hero_on_plate(fr, cx, cy, s, HERO_N, SEM_G)
    fr = fog(fr.convert('RGB'), t, .26 * (1 - .5 * u)); fr = dust(fr, t, .5)
    b = flicker(t) * ease((t - 8.2) / .7)
    return finish(fr, b)

# cientista: tempos (início, quadro) e posição do pé
SCI = [(14.8, 'in'), (17.0, 2), (17.9, 3), (18.7, 4), (19.5, 5), (20.1, 'out'), (22.3, None)]
SWAP = 19.5
def sci_state(t):
    cur = None
    for i, (t0, q) in enumerate(SCI):
        if t >= t0: cur = (i, t0, q)
    return cur
def shot3(t):
    s, cx, cy = S2[1]; drift = ease((t - 22.0) / 2.6) * .06
    s = s * (1 + drift)
    fr, cx, cy = nivel_at(cx, cy, s, 3.0); fr = fr.convert('RGBA')
    swap = t >= SWAP; sq = 1 - .035 * math.sin(min(1, max(0, (t - SWAP) / .18)) * math.pi) if swap else 1
    k, rx, ry = hero_on_plate(fr, cx, cy, s, HERO_N, COM_G if swap else SEM_G, squash=sq)
    # cientista: escala pelo boné (boné na mão = boné na cabeça do robô) e pé de apoio um pouco à frente do robô
    st = sci_state(t)
    if st and st[2] is not None:
        i, t0, q = st; sk = 480 / 117 * k
        Xend = rx + 179 * sk; feet = ry + 78 * k
        if q == 'in':
            u = (t - t0) / (SCI[i + 1][0] - t0); x = lerp(Xend + 1.25 * W / 2 + 500 * sk / 2.8, Xend, 1 - (1 - min(1, u)) ** 2); cell = 0 if int((t - t0) / .28) % 2 == 0 else 1
        elif q == 'out':
            u = (t - t0) / (SCI[i + 1][0] - t0); x = lerp(Xend, Xend + W * .9 + 300 * sk / 2.8, min(1, u) ** 1.6); cell = 6 if int((t - t0) / .28) % 2 == 0 else 7
        else: x, cell = Xend, q
        c, fxc, bot, top = CELL[cell]
        shadow(fr, x, feet, 130 * sk, 14 * sk, 120)
        put(fr, c, x - fxc * sk, feet - bot * sk, c.width * sk, c.height * sk)
    fr = fog(fr.convert('RGB'), t, .12); fr = dust(fr, t, .45)
    return finish(fr, flicker(t))

# close: o visor e os olhos desenhados na própria peça (mesmo rosto do jogo: olhos de luz ciano)
VM = Image.open('visor_close.png').convert('L')
VMb = VM.filter(ImageFilter.GaussianBlur(3)); VMg = VM.filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(40))
VC = (559, 818); VH = 415; FK = VH / 14.5; KX = 1.24
def _vglow():
    h, w = CLOSE.height, CLOSE.width; y, x = np.mgrid[0:h, 0:w]; r = np.sqrt(((x - VC[0]) / 360) ** 2 + ((y - VC[1]) / 230) ** 2)
    inside = np.asarray(VMb).astype(np.float32) / 255; out = np.asarray(VMg).astype(np.float32) / 255 * (np.asarray(CLOSE.getchannel('A')) > 0)
    core = np.clip(1.05 - .55 * r, .25, 1)[..., None]
    col = np.array([8, 58, 150], np.float32); spill = np.array([20, 60, 110], np.float32)
    return inside[..., None] * core * col + (out * (1 - inside))[..., None] * .5 * spill
VGLOW = _vglow()
def close_layer(t):
    on = 0.0
    for a, b, v in ((28.6, 28.66, .55), (28.8, 28.84, .75), (29.0, 29.5, None)):
        if a <= t < b: on = v if v is not None else ease((t - a) / (b - a))
    if t >= 29.5: on = 1.0
    im = CLOSE.copy()
    if on > 0:
        # tela acesa: luz azul somada por dentro do visor (o escuro vira azul profundo e o reflexo do desenho continua)
        # e um pouco de luz vazando no rosto em volta
        a = np.asarray(im).astype(np.float32); add = VGLOW * on
        a[..., :3] = np.clip(a[..., :3] + add, 0, 255); im = Image.fromarray(a.astype(np.uint8))
    # olhos abrindo (30.2 a 30.5, com um pouquinho de passada)
    ou = (t - 30.2) / .3
    if ou > 0:
        o = 1 - (1 - min(1, ou)) ** 3; o = o + .12 * math.sin(min(1, max(0, (t - 30.5) / .25)) * math.pi) if t > 30.5 else o
        ey = VC[1] + VH * .03 - 1.5 * FK; ry = max(3, 2.3 * FK * o); rx = 1.45 * KX * FK
        e = Image.new('RGBA', im.size, (0, 0, 0, 0)); ed = ImageDraw.Draw(e)
        for sx in (-1, 1): x = VC[0] + sx * 4.3 * KX * FK; ed.ellipse((x - rx, ey - ry, x + rx, ey + ry), fill=(127, 248, 255, 255))
        glow = e.filter(ImageFilter.GaussianBlur(34)); glow2 = e.filter(ImageFilter.GaussianBlur(10))
        al = ImageChops.multiply(VMb, Image.new('L', im.size, 255))
        for L in (glow, glow, glow2, e):
            m = ImageChops.multiply(L.getchannel('A'), al); L.putalpha(m); im = Image.alpha_composite(im, L)
    return im
BG4 = NIVEL_BL[3].transform((W, H), Image.EXTENT, (832 - 140 * W / H, 470 - 140, 832 + 140 * W / H, 470 + 140) if FMT == '16x9' else (832 - 79, 470 - 140, 832 + 79, 470 + 140), Image.BICUBIC)
BG4 = Image.fromarray((np.asarray(BG4.filter(ImageFilter.GaussianBlur(14))).astype(float) * .55).astype(np.uint8))
def shot4(t):
    u = ease((t - 24.6) / 7.0)
    if FMT == '16x9': s0, s1, y0, y1 = 1.0, 1.5, H - (1402 - 818) * 1.0 + 30, H * .5
    else: s0, s1, y0, y1 = 1080 / 1122 * 1.02, 1.85, H - (1402 - 818) * 1080 / 1122 + 10, H * .48
    s = lerp(s0, s1, u); vy = lerp(y0, y1, u); vx = W / 2
    fr = BG4.copy().convert('RGBA'); L = close_layer(t)
    put(fr, L, vx - VC[0] * s, vy - VC[1] * s, L.width * s, L.height * s)
    fr = dust(fr.convert('RGB'), t, .35)
    b = 1.0 if t >= 24.95 else ease((t - 24.6) / .35)
    return finish(fr, b * flicker(t))

def frame(t):
    if t < 8.2: return shot1(t)
    if t < 14.6: return shot2(t)
    if t < 24.6: return shot3(t)
    if t < 31.8: return shot4(t)
    return Image.new('RGB', (W, H), (0, 0, 0))

if __name__ == '__main__':
    if len(sys.argv) > 2:
        os.makedirs('fotos', exist_ok=True)
        for a in sys.argv[2:]: frame(float(a)).save(f'fotos/{FMT}_{a}.jpg', quality=88)
        sys.exit()
    out = f'teaser_{FMT}_video.mp4'; tmp = out.replace('.mp4', '.tmp.mp4')
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', tmp], stdin=subprocess.PIPE)
    n = int(TOTAL * FPS)
    for i in range(n):
        p.stdin.write(frame(i / FPS).tobytes())
        if i % 60 == 0: print(FMT, i, '/', n, flush=True)
    p.stdin.close(); p.wait()
    if p.returncode == 0: os.replace(tmp, out); print('ok', out)
