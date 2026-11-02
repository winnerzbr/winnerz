"""BMX: o pacote do cenário da trilha nova (02/11/2026, ../bmx/arte2) -> bxcen2.js (window.BXC2). O desenho da pista continua em código
(contorno da trilha); o pacote entra assim, nos 4 horários (dia, manhã, tarde, noite; uma linha por horário em cada imagem):
f   fundo distante estendido (8:3; o céu continua para cima quando a câmera sobe), anda a 30%;
m   dunas estendidas (3:1; a encosta continua para baixo), anda a 55%;
t   terra (ladrilho que repete para todos os lados), dentro do contorno da trilha;
b   beirada de cima da trilha (faixa que repete para os lados), dobrada ao longo da trilha em pedacinhos girados;
l / ld  luzes da noite do fundo e das dunas (somadas por cima);
bico  a ponta da rampa (tábuas e beirada) do kicker pintado, colada em cada ponta de rampa;
atl objetos (portal da largada, placa de distância, bandeiras quadriculadas, fardo de feno, pneus, cones, cerca de corda) e poeira
    (nuvem do pouso 4 quadros, torrões 3, poeira da derrapada 3), com a âncora no pé."""
import json, base64, io, numpy as np
from PIL import Image
from cc import key_green
A = '../bmx/arte2/'
def uri(im, fmt='WEBP', q=82):
    b = io.BytesIO(); im.save(b, fmt, quality=q, method=5); return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()
H = [('dia', 'day'), ('manha', 'morning'), ('tarde', 'sunset'), ('noite', 'night')]
N = {'dirt': {'day': '01', 'morning': '06', 'sunset': '08', 'night': '10'}, 'edge': {'day': '02', 'morning': '07', 'sunset': '09', 'night': '11'},
     'dunes': {'day': '12', 'morning': '14', 'sunset': '16', 'night': '18'}, 'far': {'day': '13', 'morning': '15', 'sunset': '17', 'night': '19'}}
def arq(kind, d): return A + f"{N[kind][d]}_{ {'dirt': 'dirt', 'edge': 'trail_edge', 'dunes': 'dunes', 'far': 'far_background'}[kind] }_{d}.png"
def pilha(ims):
    out = Image.new(ims[0].mode, (ims[0].width, sum(i.height for i in ims)))
    for j, i in enumerate(ims): out.paste(i, (0, j * ims[0].height))
    return out
O = {'horas': [h for h, _ in H], 'ceu': {}, 'duna': {}, 'areia': {}, 'base': {}}
FS, MS, TS, BS = [], [], [], []
for h, d in H:
    f = Image.open(arq('far', d)).convert('RGB'); FS.append(f.resize((1600, 600), Image.LANCZOS))
    O['ceu'][h] = '#%02x%02x%02x' % tuple(int(v) for v in np.asarray(f.crop((0, 0, f.width, 8)), float).reshape(-1, 3).mean(0))
    m = key_green(arq('dunes', d)); MS.append(Image.fromarray(m).resize((1050, 350), Image.LANCZOS))
    O['duna'][h] = '#%02x%02x%02x' % tuple(int(v) for v in m[-12:, :, :3].reshape(-1, 3).mean(0))
    t = Image.open(arq('dirt', d)).convert('RGB'); TS.append(t.resize((512, 512), Image.LANCZOS))
    O['base'][h] = '#%02x%02x%02x' % tuple(int(v) for v in np.asarray(t, float).reshape(-1, 3).mean(0))
    e = key_green(arq('edge', d))[30:204]
    # a parte de baixo some aos poucos (encosta na terra pintada embaixo)
    e = e.copy(); fade = np.clip((204 - 30 - np.arange(e.shape[0])) / 40, 0, 1); e[..., 3] = (e[..., 3] * fade[:, None]).astype(np.uint8)
    BS.append(Image.fromarray(e).resize((1024, 87), Image.LANCZOS))
    O['areia'][h] = '#%02x%02x%02x' % tuple(int(v) for v in e[30:60, :, :3].reshape(-1, 3).mean(0))
O['f'] = uri(pilha(FS), q=80); O['fw'], O['fh'] = 1600, 600
O['m'] = uri(pilha(MS), q=84); O['mw'], O['mh'] = 1050, 350
O['t'] = uri(pilha(TS), q=82); O['tw'] = 512
O['b'] = uri(pilha(BS), q=86); O['bw'], O['bh'], O['by'] = 1024, 87, 9  # by: a linha escura da trilha (y 48 da faixa original, 39 depois do corte, metade)
O['l'] = uri(Image.open(A + '21_far_background_lights_only.png').convert('RGB').resize((1600, 600), Image.LANCZOS), q=78)
O['ld'] = uri(Image.open(A + '20_dunes_lights_only.png').convert('RGB').resize((1050, 350), Image.LANCZOS), q=78)
# ponta da rampa: o bico do kicker pintado (tábuas e beirada), com a parte de baixo e da esquerda sumindo aos poucos
k = key_green(A + '03_kicker_lip.png'); x0, y0, x1, y1 = 700, 200, 902, 430
c = k[y0:y1, x0:x1].copy(); hh, ww = c.shape[:2]
fy = np.clip((hh - np.arange(hh)) / 90, 0, 1); fx = np.clip(np.arange(ww) / 70, 0, 1); c[..., 3] = (c[..., 3] * fy[:, None] * fx[None, :]).astype(np.uint8)
O['bico'] = {'src': uri(Image.fromarray(c), q=88), 'w': ww, 'h': hh, 'tx': 893 - x0, 'ty': 213 - y0, 'ang': float(np.arctan2(260 - 213, 893 - 850))}
# objetos e poeira: U pixels por unidade; escala dos objetos pela régua do pacote (IAmiguinho em pé = 325 px ≈ 50 unidades)
U = 4.0; tiles, meta = [], {}
def add(name, rgba, upx, ax=None, ay=None):
    im = Image.fromarray(rgba); bb = im.getbbox(); im = im.crop(bb); ax = (ax - bb[0]) if ax is not None else im.width / 2; ay = (ay - bb[1]) if ay is not None else im.height
    kk = upx * U; w, h = max(1, round(im.width * kk)), max(1, round(im.height * kk)); tiles.append(im.resize((w, h), Image.LANCZOS))
    meta[name] = dict(w=w, h=h, ax=round(ax * kk, 1), ay=round(ay * kk, 1))
PK = .45 * 50 / 325
for nm in ['start_gate', 'distance_sign', 'hay_bale', 'three_tires', 'cone_01', 'cone_02', 'rope_fence_repeat']:
    add(nm, key_green(A + 'track_prop_parts/' + nm + '.png'), PK)
# as duas bandeiras: o mesmo recorte nas duas (o mastro fica no mesmo lugar), âncora no pé do mastro
F1, F2 = key_green(A + 'track_prop_parts/checkered_flag_01.png'), key_green(A + 'track_prop_parts/checkered_flag_02.png')
al = (F1[..., 3] > 60) | (F2[..., 3] > 60); ys, xs = np.where(al); y0_, y1_, x0_, x1_ = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
pe = np.where(al[y1_ - 6:y1_].any(0))[0]; px = (pe.min() + pe.max()) / 2 - x0_
for nm, F in (('checkered_flag_01', F1), ('checkered_flag_02', F2)):
    c = F[y0_:y1_, x0_:x1_].copy(); c[0, 0, 3] = max(c[0, 0, 3], 1); c[-1, -1, 3] = max(c[-1, -1, 3], 1)  # o recorte não encolhe
    add(nm, c, PK, px, y1_ - y0_)
EF = json.load(open(A + 'effect_frames.json'))
for fr in EF['frames']:
    p = A + 'effect_frames/' + fr['name'] + '.png'
    add(fr['name'], key_green(p), .085, None, fr['baseline_local_y'])
x = 0; atl = Image.new('RGBA', (sum(t.width + 2 for t in tiles), max(t.height for t in tiles)))
for (name, f), t in zip(meta.items(), tiles): atl.paste(t, (x, 0)); f['x'] = x; x += t.width + 2
O['atl'] = uri(atl, q=88); O['p'] = meta; O['u'] = U
open('bxcen2.js', 'w').write('window.BXC2 = ' + json.dumps(O) + ';\n'); print('bxcen2.js', len(open('bxcen2.js').read()) // 1024, 'KB', atl.size, {k: (v['w'], v['h']) for k, v in meta.items()}, O['bico']['ang'])
