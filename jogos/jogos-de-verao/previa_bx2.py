"""Soma à Prévia publicada (previa_add/index.html), sem regerar o resto: os 8 movimentos novos da BMX (02/11/2026) e as pranchas da
Corrida na areia (6 do IAmiguinho e 4 do Amiguinho, 02/11/2026)."""
import json, io, hashlib, numpy as np, pathlib
from PIL import Image
R = pathlib.Path('previa_add'); s = (R / 'index.html').read_text(encoding='utf-8')
I = json.load(open('cart2/mv2/info.json')); K = .6; dec = json.JSONDecoder()
i = s.index('window.FR=') + 10; FR, e1 = dec.raw_decode(s[i:])
j = s.index('window.ATL=') + 11; ATL, e2 = dec.raw_decode(s[j:])
k = s.index('window.ANIM=') + 12; ANIM, e3 = dec.raw_decode(s[k:])
NOTAS = {
 'bx_superH': ('BMX · Superman segurado', 'Já no jogo: segurando ○ no ar, depois do meio da manobra (em laço).'),
 'bx_semmaoH': ('BMX · Sem mãos segurado', 'Já no jogo: segurando □ no ar, depois do meio da manobra (em laço).'),
 'bx_tailC': ('BMX · Tailwhip contínuo', 'Já no jogo: segurando △, do 2º giro do quadro em diante.'),
 'bx_hop': ('BMX · bunny hop', 'Já no jogo: agachando (▼ antes do pulo) os quadros 1-2; saindo do chão, 3 a 8.'),
 'bx_tuck': ('BMX · mortal encolhido', 'Já no jogo: girando rápido no ar sem manobra.'),
 'bx_wheelie': ('BMX · empinando', 'Já no jogo: no chão, só a roda de trás encostada (o desenho fica preso nela).'),
 'bx_corpo': ('BMX · corpo para trás e para frente', 'Já no jogo: ◀ ▶ no ar: 1-4 para trás, 5-8 para frente.'),
 'bx_deseq': ('BMX · desequilíbrio', 'Já no jogo: pouso torto (sem cair).'),
 'cr_largada': ('Corrida · largada', 'Já no jogo: 1-3 esperando a contagem; 4-8 na saída.'),
 'cr_sprint': ('Corrida · correndo forte', 'Já no jogo: segurando ▶ (o quadro segue a passada).'),
 'cr_trote': ('Corrida · trotando', 'Já no jogo: sem segurar nada (recupera o fôlego).'),
 'cr_salto': ('Corrida · pulo da barreira', 'Já no jogo: 2 a 7 no ar; a altura vem do jogo.'),
 'cr_queda': ('Corrida · tropeço', 'Já no jogo: batendo num obstáculo ou escorregando na poça.'),
 'cr_cansado': ('Corrida · sem fôlego', 'Já no jogo: quando o fôlego acaba e no fim da bateria (quem não ganhou).'),
 'bv2_cr_largada': ('Corrida · largada', 'Já no jogo (na cor de cada um): 1-3 esperando; 4-8 na saída.'),
 'bv2_cr_sprint': ('Corrida · correndo', 'Já no jogo: o quadro segue a passada.'),
 'bv2_cr_salto': ('Corrida · pulo', 'Já no jogo: 2 a 7 no ar.'),
 'bv2_cr_queda': ('Corrida · tropeço', 'Já no jogo: batendo num obstáculo ou escorregando na poça.'),
}
KS = {k: 1.10 if k.startswith('bv2_') else 1.08 for k in NOTAS}
ANIM = [a for a in ANIM if str(a['sh'][0]) not in NOTAS]
TODAS = [('Amiguinho' if nm.startswith('bv2_') else 'IAmiguinho', nm, t, nota, KS[nm]) for nm, (t, nota) in NOTAS.items()]
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
