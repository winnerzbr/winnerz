"""Prévia publicada: junta os quadros de cada prancha numa imagem só (menos arquivos) e tira as imagens de dentro da página."""
import json, base64, io, shutil, pathlib, hashlib
from PIL import Image
R = pathlib.Path('previa_pub'); shutil.rmtree(R, ignore_errors=True); (R / 'img').mkdir(parents=True)
s = open('previa/frames.js', encoding='utf-8').read()
FR = json.loads(s[s.index('window.FR=') + 10:s.index(';window.ANIM=')]); ANIM = s[s.index(';window.ANIM=') + 1:]
groups = {}
for k in FR: groups.setdefault(k.rsplit('_', 1)[0], []).append(k)
ATL = {}
for g, ks in groups.items():
    ims = [Image.open(io.BytesIO(base64.b64decode(FR[k]['s'].split(',', 1)[1]))).convert('RGBA') for k in ks]
    W = sum(i.width + 2 for i in ims); H = max(i.height for i in ims); A = Image.new('RGBA', (W, H)); x = 0
    for k, im in zip(ks, ims):
        A.paste(im, (x, 0)); f = FR[k]; f.pop('s'); f.update(a=g, x=x); x += im.width + 2
    b = io.BytesIO(); A.save(b, 'WEBP', quality=86); n = hashlib.md5(b.getvalue()).hexdigest()[:12] + '.webp'; (R / 'img' / n).write_bytes(b.getvalue()); ATL[g] = 'img/' + n
js = 'window.FR=' + json.dumps(FR) + ';window.ATL=' + json.dumps(ATL) + ';' + ANIM
tail = open('previa/tail.html', encoding='utf-8').read()
tail = tail.replace("const IM = {}; for (const [k, f] of Object.entries(FR)) { IM[k] = new Image(); IM[k].src = f.s; }",
                    "const AI = {}; for (const [g, p] of Object.entries(ATL)) { AI[g] = new Image(); AI[g].src = p; }")
tail = tail.replace("fr = FR[q.k], im = IM[q.k];", "fr = FR[q.k], im = AI[fr.a];")
tail = tail.replace("x.drawImage(im, 230 - fr.cx * z,", "x.drawImage(im, fr.x, 0, fr.w, fr.h, 230 - fr.cx * z,")
assert 'AI[fr.a]' in tail and 'fr.x, 0, fr.w' in tail
(R / 'index.html').write_text(open('previa/head.html', encoding='utf-8').read() + js + tail, encoding='utf-8')
fs = sorted(p.name for p in (R / 'img').iterdir())
json.dump([{'path': 'img/' + f} for f in fs], open('previa_files.json', 'w'))
print((R / 'index.html').stat().st_size // 1024, 'KB página', len(fs), 'imagens', sum((R / 'img' / f).stat().st_size for f in fs) // 1024, 'KB')
