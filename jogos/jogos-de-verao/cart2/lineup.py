import numpy as np, json, sys
from PIL import Image, ImageDraw
from visor import visor, geom, solid
from headsz import measure, I
f, blob, ref = sys.argv[1], sys.argv[2] == '1', sys.argv[3]
src = open(f).read(); g = {}; exec(src[src.index('SH ='):src.index('FRONT')], g); SH = g['SH']
M = measure(SH, blob, ref); hr = M[ref][0]
names = [n for n in SH if M[n][0]]
CW, RH, PER = 150, 250, 12; Z = float(sys.argv[5]) if len(sys.argv) > 5 else .42
nrow = (len(names) + PER - 1) // PER
G = Image.new('RGB', (CW * PER, nrow * RH * 2 + nrow * 10), (20, 20, 20)); d = ImageDraw.Draw(G)
for i, nm in enumerate(names):
    best = None
    for j in range(len(I[nm])):
        a = np.array(Image.open(f'mv2/{nm}_{j}.png')); m, core = visor(a, blob)
        if m is not None and core > 900 and solid(m) >= (.855 if blob else .925): best = a; break
    for r, k in enumerate((SH[nm][0], hr / M[nm][0])):
        y0 = (i // PER) * (RH * 2 + 10) + r * RH; x0 = (i % PER) * CW
        d.rectangle((x0, y0, x0 + CW - 2, y0 + RH - 2), fill=(40, 140, 60) if r == 0 else (40, 110, 150))
        im = Image.fromarray(best); s_ = k * Z
        im = im.resize((max(1, int(im.width * s_)), max(1, int(im.height * s_))), Image.LANCZOS)
        G.paste(im, (x0 + (CW - im.width) // 2, y0 + RH - 8 - im.height), im)
        d.text((x0 + 3, y0 + 3), nm + (' antes' if r == 0 else ' depois'), fill=(255, 255, 0))
G.save(sys.argv[4])
