"""Referências de pose do skate: os sprites antigos de 16 bits ampliados e em cinza, cada um no seu quadro da prancha 4x2."""
import json, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, 'skate'); from moves import MOVES
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
SP = {n: (Image.open(f'skate/old/{n}.png').convert('RGBA'), json.load(open(f'skate/old/{n}.json'))) for n in ('ia_sk', 'ia_giro', 'shape')}
GW, GH = 1774, 887; cw, ch = GW / 4, GH / 2
def frame(ref):
    n, a, i = ref[:3]; im, js = SP[n]; q = js[a][i]
    c = im.crop((q['x'], q['y'], q['x'] + q['w'], q['y'] + q['h']))
    if len(ref) > 3 and ref[3]: c = c.transpose(Image.FLIP_LEFT_RIGHT)
    return c, q
def sheet(refs, path, start):
    S = Image.new('RGB', (GW, GH), (246, 246, 246)); d = ImageDraw.Draw(S)
    for k, ref in enumerate(refs):
        x0, y0 = (k % 4) * cw, (k // 4) * ch
        d.text((x0 + 8, y0 + 6), str(start + k), font=F, fill=(150, 150, 150))
        if ref is None: continue
        c, q = frame(ref); sc = 4.4 if ref[0] == 'shape' else 3.1
        c = c.resize((round(c.width * sc), round(c.height * sc)), Image.NEAREST); a = np.array(c)
        g = np.array(c.convert('L')).astype(float) * .62 + 70
        gi = Image.fromarray(np.dstack([g, g, g, a[..., 3]]).clip(0, 255).astype(np.uint8))
        ax = (c.width - q['ax'] * sc) if len(ref) > 3 and ref[3] else q['ax'] * sc
        by = y0 + ch * (.55 if ref[0] == 'shape' else .9)
        S.paste(gi, (int(x0 + cw / 2 - ax), int(by - q['ay'] * sc)), gi)
    # linha do chão
    for r in range(2): d.line((0, r * ch + ch * .9, GW, r * ch + ch * .9), fill=(215, 215, 215), width=1)
    S.save(path, quality=88)
n = 0
for i, m in enumerate(MOVES):
    for j, s in enumerate(m['sheets']):
        if s['ref'] is None: continue
        sheet(s['ref'], f'skate_moveset/pose/sk_{i}_{j}.jpg', 1 + 8 * j); n += 1
print(n)
