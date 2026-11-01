"""Soma as pranchas do pingue-pongue (IAmiguinho e Amiguinho) à Prévia publicada (previa_add/index.html), sem regerar o resto."""
import json, io, hashlib, numpy as np, pathlib
from PIL import Image
R = pathlib.Path('previa_add'); s = (R / 'index.html').read_text(encoding='utf-8')
I = json.load(open('cart2/mv2/info.json')); K = .6; dec = json.JSONDecoder()
i = s.index('window.FR=') + 10; FR, e1 = dec.raw_decode(s[i:])
j = s.index('window.ATL=') + 11; ATL, e2 = dec.raw_decode(s[j:])
k = s.index('window.ANIM=') + 12; ANIM, e3 = dec.raw_decode(s[k:])
NOTAS = {
 'espera': ('Pingue-pongue · pronto', 'Já no jogo: parado esperando a bola, em laço. Cabeça varia de um quadro para outro; no jogo cada quadro fica igualado.'),
 'lado': ('Pingue-pongue · passos de lado', 'Já no jogo: andando sem a raquete preparada (para trás, os quadros tocam ao contrário).'),
 'topspin': ('Pingue-pongue · rebater (topspin)', 'Já no jogo: quadros 1 a 3 preparando (o braço vai para trás com o tempo de preparo); contato no 4 e o resto depois da batida.'),
 'cortada': ('Pingue-pongue · cortada', 'Já no jogo: raquete no alto nos quadros 2 e 3, contato no 4 com o passo para a frente.'),
 'efeito': ('Pingue-pongue · efeito por baixo', 'Já no jogo: vale para o efeito e o toque curto; contato no 4.'),
 'saque': ('Pingue-pongue · saque', 'Já no jogo: bolinha na mão (1), jogada para cima (2 e 3), raquete atrás (4), batida do 5 ao 8. A bolinha desenhada saiu dos quadros 1 a 3: o jogo desenha a dele no lugar da mão.'),
 'andar': ('Pingue-pongue · andando com a raquete atrás', 'Já no jogo: andando com o golpe preparado.'),
 'balao': ('Pingue-pongue · balão', 'Já no jogo: contato no 5, bem baixo, e a raquete sobe até o alto.'),
}
KS = {'espera': 1.064, 'lado': 1.009, 'topspin': 1.040, 'cortada': 1.017, 'efeito': 1.015, 'saque': 1.043, 'andar': 1.059, 'balao': 1.099}
NOTAS_B = {
 'espera': ('Pingue-pongue · pronto', 'Já no jogo: parado esperando a bola, quicando de leve.'),
 'lado': ('Pingue-pongue · pulinhos de lado', 'Já no jogo: andando sem a raquete preparada (para trás, ao contrário).'),
 'topspin': ('Pingue-pongue · rebater (topspin)', 'Já no jogo: preparo 1 a 3, contato no 4.'),
 'cortada': ('Pingue-pongue · cortada', 'Já no jogo: estica como um arco no 2, contato no 4 com um pulinho.'),
 'efeito': ('Pingue-pongue · efeito por baixo', 'Já no jogo: efeito e toque curto; contato no 4.'),
 'saque': ('Pingue-pongue · saque', 'Já no jogo: bolinha na mão (1), jogada para cima (2 e 3), raquete atrás (4 e 5), contato no 6. A bolinha desenhada saiu dos quadros 1 a 3.'),
 'andar': ('Pingue-pongue · pulinhos com a raquete atrás', 'Já no jogo: andando com o golpe preparado.'),
 'balao': ('Pingue-pongue · balão', 'Já no jogo: contato no 5, bem baixo.'),
}
ANIM = [a for a in ANIM if not str(a['sh'][0]).startswith(('pp_', 'bv2_pp_'))]
TODAS = [('IAmiguinho', f'pp_{n}', t, nota, round(KS[n] / 1.04, 3)) for n, (t, nota) in NOTAS.items()] + [('Amiguinho', f'bv2_pp_{n}', t, nota, 1) for n, (t, nota) in NOTAS_B.items()]
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
