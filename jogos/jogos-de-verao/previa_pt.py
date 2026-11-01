"""Soma as 12 pranchas do patins (IAmiguinho, 01/11/2026) à Prévia publicada (previa_add/index.html), sem regerar o resto."""
import json, io, hashlib, numpy as np, pathlib
from PIL import Image
R = pathlib.Path('previa_add'); s = (R / 'index.html').read_text(encoding='utf-8')
I = json.load(open('cart2/mv2/info.json')); K = .6; dec = json.JSONDecoder()
i = s.index('window.FR=') + 10; FR, e1 = dec.raw_decode(s[i:])
j = s.index('window.ATL=') + 11; ATL, e2 = dec.raw_decode(s[j:])
k = s.index('window.ANIM=') + 12; ANIM, e3 = dec.raw_decode(s[k:])
NOTAS = {
 'pt_passada': ('Patins · passada', 'Já no jogo: patinando, o quadro segue o caminho andado.'),
 'pt_agachamento': ('Patins · agachado', 'Já no jogo: desce (1 a 4) e fica embaixo em laço (5 a 8).'),
 'pt_salto': ('Patins · salto', 'Já no jogo: no ar sem manobra, o quadro segue a subida e a descida (3 a 7); a altura vem da física.'),
 'pt_grab': ('Patins · pegando o patins', 'Já no jogo: segurando ▼ no ar; fica no 5 enquanto segura.'),
 'pt_aviao': ('Patins · Aviãozinho', 'Já no jogo: o quadro segue o andamento da manobra.'),
 'pt_tesoura': ('Patins · Tesoura', 'Já no jogo: o quadro segue o andamento da manobra.'),
 'pt_flip': ('Patins · Mortal', 'Já no jogo: desenhado em pé; o jogo gira o desenho uma volta para trás.'),
 'pt_soul_grind': ('Patins · corrimão Soul', 'Já no jogo: o estilo padrão no corrimão, em laço.'),
 'pt_royale_grind': ('Patins · corrimão Royale', 'Já no jogo: em laço.'),
 'pt_grind_baixo': ('Patins · corrimão Agachado', 'Já no jogo: em laço.'),
 'pt_giro': ('Patins · giro (8 vistas)', 'Já no jogo: no giro o jogo passa pelas 8 vistas; com manobra junto, perto de lado mostra a manobra.'),
 'pt_queda': ('Patins · queda', 'Já no jogo: no tombo que encerra a prova.'),
}
KS = {k: 1.03 for k in NOTAS}
ANIM = [a for a in ANIM if not str(a['sh'][0]).startswith('pt_')]
TODAS = [('IAmiguinho', nm, t, nota, KS[nm]) for nm, (t, nota) in NOTAS.items()]
for quem, nm, t, nota, kk in TODAS:
    fr = I[nm]; g = [max(q['bot'] for q in fr[:4]), max(q['bot'] for q in fr[4:])]
    ims, lst = [], []
    for kf, q in enumerate(fr):
        key = f'{nm}_{kf}'; im = Image.open(f'cart2/mv2/{key}.png'); a = np.array(im); al = a[..., 3] > 100; H = al.shape[0]
        al2 = al & ~((a[..., 0] > 150) & (a[..., 1] < 110) & (a[..., 2] < 110)); hx = np.where(al2[:int(H * .45)].any(0))[0]
        im2 = im.resize((round(im.width * K), round(im.height * K)), Image.LANCZOS); ims.append(im2)
        cx0 = (hx.min() + hx.max()) / 2
        if quem == 'Amiguinho':  # geleia: o centro da massa (sem a raquete), como no jogo
            import sys; sys.path.insert(0, 'cart2'); from ppred import raquete; from scipy import ndimage
            cx0 = float(np.where(ndimage.binary_fill_holes((a[..., 3] > 128) & ~raquete(a)))[1].mean())
        FR[key] = {'w': im2.width, 'h': im2.height, 'cx': round(cx0 * K, 1), 'a': nm}
        lst.append({'k': key, 'gy': round((g[kf // 4] - q['bot']) * K * kk, 1), 'z': kk})
    W = sum(m.width + 2 for m in ims); A = Image.new('RGBA', (W, max(m.height for m in ims))); x = 0
    for kf, m in enumerate(ims): A.paste(m, (x, 0)); FR[f'{nm}_{kf}']['x'] = x; x += m.width + 2
    b = io.BytesIO(); A.save(b, 'WEBP', quality=86); f = hashlib.md5(b.getvalue()).hexdigest()[:12] + '.webp'; (R / 'img' / f).write_bytes(b.getvalue()); ATL[nm] = 'img/' + f
    ANIM.append({'p': quem, 'm': t, 't': t, 'sh': [nm], 'v': 'ok', 'n': nota, 'f': lst})
s2 = s[:i] + json.dumps(FR) + s[i + e1:]
j = s2.index('window.ATL=') + 11; _, e2 = dec.raw_decode(s2[j:]); s2 = s2[:j] + json.dumps(ATL) + s2[j + e2:]
k = s2.index('window.ANIM=') + 12; _, e3 = dec.raw_decode(s2[k:]); s2 = s2[:k] + json.dumps(ANIM) + s2[k + e3:]
(R / 'index.html').write_text(s2, encoding='utf-8'); print(len(ANIM), 'animações', len(FR), 'quadros', [ATL[nm] for _, nm, *_ in TODAS])
