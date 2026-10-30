"""Referências de pose: as pranchas antigas aprovadas remontadas em cinza (só a pose; os tamanhos vêm da ficha e da grade)."""
import json, os, numpy as np
from PIL import Image, ImageDraw, ImageFont
I = json.load(open('mv2/info.json')); OUT = '../moveset_volei/pose'; os.makedirs(OUT, exist_ok=True)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
IA = [['idleA', 'idleB'], ['ready'], ['run2A', 'run2B'], ['startstop'], ['back'], ['turn'], ['jump1', 'jump2', 'jump3'], ['set1', 'set2'], ['bump1', 'bump2'],
      ['serve1', 'serve2', 'serve3', 'serve4', 'serve5'], ['spk1', 'spk2', 'spk3'], ['gnd1', 'gnd2'], [None, None], ['specB'], ['dive1', 'dive2', 'dive3', 'getup'], ['party1', 'party2'], ['sad1', 'sad2']]
BL = [['b_h', 'b_g'], ['b_f'], ['b_b', 'b_e'], ['bl_ss'], ['bl_back'], ['bl_turn'], ['bl_jump1', 'bl_jump2', 'bl_jump3'], ['bl_set1', 'bl_set2'], ['bl_bump1', 'bl_bump2'],
      ['bl_srv1', 'bl_srv2', 'bl_srv3', 'bl_srv4', 'bl_land'], ['bl_spk1', 'bl_spkA', 'bl_airA'], ['bl_gnd1', 'bl_gnd2'], [None, None], ['bl_spec'], ['bl_dive1', 'bl_dive2', 'bl_dive3', 'bl_getup'], ['bl_party1', 'bl_party2'], ['bl_sad1', 'bl_sad2']]
GW, GH = 1774, 887; cw, ch = GW / 4, GH / 2
def sheet(nm, path):
    S = Image.new('RGB', (GW, GH), (246, 246, 246)); d = ImageDraw.Draw(S)
    for k, q in enumerate(I[nm]):
        im = Image.open(f'mv2/{nm}_{k}.png').convert('RGBA'); a = np.array(im)
        al = a[..., 3] > 100; hx = np.where(al[:int(al.shape[0] * .45)].any(0))[0]; hc = (hx.min() + hx.max()) / 2 if len(hx) else im.width / 2
        g = np.array(im.convert('L')).astype(float); g = 70 + g * .62  # cinza claro: lê a pose, não copia a cor
        gi = Image.fromarray(np.dstack([g, g, g, a[..., 3]]).clip(0, 255).astype(np.uint8))
        x0, y0 = (k % 4) * cw, (k // 4) * ch
        S.paste(gi, (int(x0 + q['cx'] - hc), int(y0 + q['top'])), gi)
        d.text((x0 + 8, y0 + 6), str(k + 1), font=F, fill=(150, 150, 150))
    S.save(path, quality=88)
n = {}
for who, L in (('ia', IA), ('bl', BL)):
    for i, move in enumerate(L):
        for j, nm in enumerate(move):
            if nm is None or nm not in I: continue
            sheet(nm, f'{OUT}/{who}_{i}_{j}.jpg'); n[who] = n.get(who, 0) + 1
print(n)
