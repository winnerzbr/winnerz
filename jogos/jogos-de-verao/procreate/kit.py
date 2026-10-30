"""Kit para redesenhar no Procreate: referência congelada sem o fundo verde + grade + linhas de proporção + camada vazia."""
import numpy as np, os
from PIL import Image, ImageDraw, ImageFont
from psdw import write_psd

FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; FONTB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
SC = 1.5  # ampliação da folha original
OUT = 'kit'; os.makedirs(OUT, exist_ok=True)

CH = {
    'iamiguinho': dict(src='ia_src.png', top=23, ground=704, fronts=[(121, 561), (686, 1096), (1210, 1590), (1655, 2061)],
        lines=[(23, 'Topo da hélice'), (96, 'Topo do boné'), (201, 'Topo do visor'), (351, 'Base do visor'), (376, 'Queixo / pescoço'),
               (480, 'Pulsos / fim do tronco'), (562, 'Cano do tênis'), (604, 'Começo do tênis'), (704, 'Chão')],
        head=(96, 376), n=16),
    'amiguinho': dict(src='bl_src.png', top=137, ground=601, fronts=[(40, 595), (626, 1126), (1182, 1522), (1575, 2131)],
        lines=[(137, 'Topo do corpo'), (272, 'Topo do visor'), (383, 'Base do visor'), (424, 'Centro das mãos'),
               (500, 'Começo dos pés'), (601, 'Chão')],
        head=None, n=12),
}
VIEWS = ['frente', '3/4', 'perfil', 'costas']


def key_green(a):
    a = a.astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = g - np.maximum(r, b)
    al = np.clip((150 - d) / 90, 0, 1)
    g2 = np.where(al < 1, np.minimum(g, np.maximum(r, b) + 20), g)  # tira o verde que vaza nas bordas
    out = np.dstack([r, g2, b, al * 255]).round().clip(0, 255).astype(np.uint8)
    out[al == 0, :3] = 0
    return out


for nm, C in CH.items():
    src = Image.open(C['src']).convert('RGB')
    w0, h0 = src.size; w1, h1 = round(w0 * SC), round(h0 * SC)
    PADL, PADT, PADB = 360, 150, 120  # margem da esquerda guarda os nomes das linhas
    W, H = PADL + w1 + 60, PADT + h1 + PADB
    Y = lambda y: PADT + y * SC; X = lambda x: PADL + x * SC

    ref = np.zeros((H, W, 4), np.uint8)
    ref[PADT:PADT + h1, PADL:PADL + w1] = key_green(np.array(src.resize((w1, h1), Image.LANCZOS)))

    # ---- grade: quadrados com 1/16 da altura do personagem, presa no chão; linha forte a cada 4 (1/4 da altura)
    Hc = (C['ground'] - C['top']) * SC; cell = Hc / C['n']
    grid = Image.new('RGBA', (W, H), (0, 0, 0, 0)); gd = ImageDraw.Draw(grid)
    gy0 = Y(C['ground']); gx0 = X((C['fronts'][0][0] + C['fronts'][0][1]) / 2)
    k0 = -int(gy0 / cell) - 1
    for k in range(k0, int((H - gy0) / cell) + 2):
        y = gy0 + k * cell
        if 0 <= y < H: gd.line([(0, y), (W, y)], fill=(40, 110, 230, 200 if k % 4 == 0 else 95), width=3 if k % 4 == 0 else 1)
    for k in range(-int(gx0 / cell) - 1, int((W - gx0) / cell) + 2):
        x = gx0 + k * cell
        if 0 <= x < W: gd.line([(x, 0), (x, H)], fill=(40, 110, 230, 200 if k % 4 == 0 else 95), width=3 if k % 4 == 0 else 1)

    # ---- linhas de proporção (as mesmas alturas nas 4 vistas) + eixo central de cada vista
    pr = Image.new('RGBA', (W, H), (0, 0, 0, 0)); pd = ImageDraw.Draw(pr)
    f = ImageFont.truetype(FONT, 30); fb = ImageFont.truetype(FONTB, 34)
    for y, lab in C['lines']:
        yy = Y(y); col = (225, 30, 120, 230) if lab != 'Chão' else (200, 20, 20, 255)
        pd.line([(PADL - 20, yy), (W, yy)], fill=col, width=4 if lab in ('Chão',) else 3)
        tw = pd.textlength(lab, font=f); pd.text((PADL - 30 - tw, yy - 18), lab, font=f, fill=col)
    for (x0, x1), vn in zip(C['fronts'], VIEWS):
        cx = X((x0 + x1) / 2)
        for yy in range(int(Y(C['top']) - 40), int(Y(C['ground']) + 30), 28): pd.line([(cx, yy), (cx, yy + 14)], fill=(225, 30, 120, 200), width=3)
        tw = pd.textlength(vn, font=fb); pd.text((cx - tw / 2, Y(C['ground']) + 40), vn, font=fb, fill=(120, 20, 70, 255))
    if C['head']:
        a, b = C['head']; xh = X(C['fronts'][0][0]) - 40
        pd.line([(xh, Y(a)), (xh, Y(b))], fill=(120, 20, 70, 255), width=5)
        for yy in (Y(a), Y(b)): pd.line([(xh - 14, yy), (xh + 14, yy)], fill=(120, 20, 70, 255), width=5)
        hq = (b - a) * SC / cell; lab = f'cabeça ≈ {hq:.1f} quadrados'.replace('.', ',')
        im_t = Image.new('RGBA', (int(pd.textlength(lab, font=f)) + 10, 40), (0, 0, 0, 0)); ImageDraw.Draw(im_t).text((0, 0), lab, font=f, fill=(120, 20, 70, 255))
        im_t = im_t.rotate(90, expand=True); pr.alpha_composite(im_t, (int(xh - 50), int((Y(a) + Y(b)) / 2 - im_t.height / 2)))
    titulo = f"{nm.upper()} · ficha de modelo congelada · altura total = {C['n']} quadrados da grade"
    pd.text((PADL, 40), titulo, font=fb, fill=(60, 20, 50, 255))

    bg = np.zeros((H, W, 4), np.uint8); bg[:] = (255, 255, 255, 255)
    empty = np.zeros((H, W, 4), np.uint8)
    layers = [dict(name='Fundo branco', rgba=bg), dict(name='Referência congelada', rgba=ref, opacity=128),
              dict(name='Grade', rgba=np.array(grid)), dict(name='Linhas de proporção', rgba=np.array(pr)),
              dict(name='Meu desenho', rgba=empty)]
    comp = write_psd(f'{OUT}/{nm}_procreate.psd', W, H, layers)
    Image.fromarray(comp).save(f'{OUT}/{nm}_previa.jpg', quality=88)
    Image.fromarray(ref).save(f'{OUT}/{nm}_referencia.png'); grid.save(f'{OUT}/{nm}_grade.png'); pr.save(f'{OUT}/{nm}_proporcoes.png')
    print(nm, W, H, 'célula', round(cell, 1), 'px', os.path.getsize(f'{OUT}/{nm}_procreate.psd') // 1024, 'KB')
