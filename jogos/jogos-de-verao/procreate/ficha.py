"""Para anexar nos pedidos ao ChatGPT:
- ficha_<p>.png: as 4 vistas congeladas com as linhas de proporção (rótulos em inglês, que é a língua dos pedidos)
- grade_<p>.png: prancha 4x2 vazia, no tamanho das pranchas (1774x887), com as linhas da mesma proporção em cada quadro"""
import numpy as np, os
from PIL import Image, ImageDraw, ImageFont
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
GREEN = (2, 247, 2); OUT = 'ficha'; os.makedirs(OUT, exist_ok=True)
P = {
    'iamiguinho': dict(src='ia_src.png', top=23, ground=704, fronts=[(121, 561), (686, 1096), (1210, 1590), (1655, 2061)],
        lines=[(23, 'PROPELLER TOP'), (96, 'CAP TOP'), (201, 'VISOR TOP'), (351, 'VISOR BOTTOM'), (376, 'CHIN / NECK'),
               (480, 'WRISTS / END OF TORSO'), (562, 'SOCK CUFF'), (604, 'SHOE STARTS'), (704, 'GROUND')],
        note='HEAD (cap top to chin) = 41% of total height · BODY (neck to ground) = 48% · PROPELLER = 11%.  Same proportions in EVERY pose and EVERY view.',
        cell_h=325),
    'amiguinho': dict(src='bl_src.png', top=137, ground=601, fronts=[(40, 595), (626, 1126), (1182, 1522), (1575, 2131)],
        lines=[(137, 'BODY TOP'), (272, 'VISOR TOP'), (383, 'VISOR BOTTOM'), (424, 'HANDS CENTER'), (500, 'FEET START'), (601, 'GROUND')],
        note='VISOR = 24% of total height, upper half of the body · hands and feet are separate small balls, always the same size.  Squash and stretch keep the same amount of body.',
        cell_h=320),
}
VIEWS = ['FRONT', '3/4', 'SIDE', 'BACK']
for nm, C in P.items():
    src = Image.open(C['src']).convert('RGB'); w0, h0 = src.size
    L = 470; T = 110; W, H = L + w0 + 30, T + h0 + 90
    im = Image.new('RGB', (W, H), GREEN); im.paste(src, (L, T)); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(F, 22); fb = ImageFont.truetype(FB, 30); fs = ImageFont.truetype(FB, 24)
    d.text((24, 20), f'MODEL SHEET · {nm.upper()} · the only valid proportions', font=fb, fill=(20, 20, 20))
    d.text((24, 62), C['note'], font=f, fill=(20, 20, 20))
    for y, lab in C['lines']:
        yy = T + y; col = (200, 0, 90)
        d.line([(L - 10, yy), (W, yy)], fill=col, width=3)
        tw = d.textlength(lab, font=fs); d.text((L - 20 - tw, yy - 14), lab, font=fs, fill=col)
    for (x0, x1), vn in zip(C['fronts'], VIEWS):
        cx = L + (x0 + x1) / 2
        for yy in range(T + C['top'] - 20, T + C['ground'] + 10, 22): d.line([(cx, yy), (cx, yy + 11)], fill=(200, 0, 90), width=2)
        tw = d.textlength(vn, font=fs); d.text((cx - tw / 2, T + C['ground'] + 20), vn, font=fs, fill=(20, 20, 20))
    im.save(f'{OUT}/ficha_{nm}.png')

    # ---- grade-guia: mesmo formato das pranchas (4 x 2 quadros de ~443 px), chão a 405 px do topo de cada quadro
    GW, GH = 1774, 887; cw, ch = GW / 4, GH / 2; G = Image.new('RGB', (GW, GH), GREEN); g = ImageDraw.Draw(G)
    k = C['cell_h'] / (C['ground'] - C['top']); gy = 405; ft = ImageFont.truetype(F, 15)
    for r in range(2):
        for c in range(4):
            x0, y0 = c * cw, r * ch
            g.rectangle((x0, y0, x0 + cw - 1, y0 + ch - 1), outline=(0, 150, 0), width=2)
            for y, lab in C['lines']:
                yy = y0 + gy - (C['ground'] - y) * k
                main = lab in ('GROUND', 'CAP TOP', 'CHIN / NECK', 'BODY TOP')
                g.line([(x0 + 4, yy), (x0 + cw - 4, yy)], fill=(0, 105, 0) if not main else (0, 60, 0), width=3 if main else 2)
                if c == 0: g.text((x0 + 6, yy - 15), lab.lower(), font=ft, fill=(0, 90, 0))
            cx = x0 + cw / 2
            for yy in range(int(y0 + 20), int(y0 + ch - 20), 16): g.line([(cx, yy), (cx, yy + 8)], fill=(0, 120, 0), width=1)
            g.text((x0 + cw - 26, y0 + 8), str(r * 4 + c + 1), font=ImageFont.truetype(FB, 16), fill=(0, 90, 0))
    G.save(f'{OUT}/grade_{nm}.png')
    print(nm, im.size, G.size)
