"""Referências de pose da embaixadinha: os desenhos antigos (16 bits) do IAmiguinho em cinza, nos quadros da grade-guia (4x2)."""
import json, base64, io, pathlib
from PIL import Image, ImageDraw, ImageFont, ImageOps
ROOT = pathlib.Path(__file__).resolve().parent.parent
s = (ROOT / 'verao' / 'index.html').read_text(encoding='utf-8')
i = s.index('const EBS = '); j = s.index('\n', i)
d = json.loads(s[i + len('const EBS = '):j].rstrip(';'))['ia_eb']
sheet = Image.open(io.BytesIO(base64.b64decode(d['img'].split(',', 1)[1]))).convert('RGBA')
P = d['anims']['pose']
W, H, CW, CH, GROUND, CX = 1774, 887, 443.5, 443.5, 405, 221
K = 325 / 104  # altura do desenho parado (104) = da hélice ao chão na grade (325)
def frame(n):
    f = P[n]; im = sheet.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
    g = ImageOps.grayscale(im.convert('RGB')); g = g.point(lambda v: int(70 + v * .72))
    out = Image.new('RGBA', im.size); out.paste(Image.merge('RGBA', (g, g, g, im.split()[3])), (0, 0))
    return out.resize((round(f['w'] * K), round(f['h'] * K)), Image.NEAREST), f
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
except Exception: font = ImageFont.load_default()
REFS = {  # prancha: {quadro: (desenho antigo, subida em px da grade)}
    'eb_espera': {1: (0, 0)},
    'eb_pe': {1: (0, 0), 4: (1, 0), 8: (0, 0)},
    'eb_coxa': {1: (0, 0), 4: (2, 0), 8: (0, 0)},
    'eb_cabeca': {1: (0, 0), 4: (3, 40), 8: (0, 0)},
    'eb_firula': {1: (0, 0), 5: (4, 0), 8: (0, 0)},
    'eb_levanta': {1: (0, 0), 5: (1, 0), 8: (0, 0)},
    'eb_caiu': {1: (0, 0), 4: (5, 0)},
    'eb_fim': {1: (5, 0)},
}
out = ROOT / 'novas' / 'anexos'
for name, cells in REFS.items():
    im = Image.new('RGB', (W, H), '#f6f6f6'); dr = ImageDraw.Draw(im)
    for r in range(1, 3): dr.line([(0, r * CH), (W, r * CH)], fill='#d8d8d8', width=1)
    for c in range(1, 4): dr.line([(c * CW, 0), (c * CW, H)], fill='#d8d8d8', width=1)
    for k in range(8): dr.text((8 + (k % 4) * CW, 8 + (k // 4) * CH), str(k + 1), fill='#999999', font=font)
    for cell, (n, lift) in cells.items():
        spr, f = frame(n); c, r = (cell - 1) % 4, (cell - 1) // 4
        x = round(c * CW + CX - f['ax'] * K); y = round(r * CH + GROUND - lift - f['ay'] * K)
        im.paste(spr, (x, y), spr)
    im.save(out / f'pose_{name}.jpg', quality=88)
print('ok', len(REFS))
