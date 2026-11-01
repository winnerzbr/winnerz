"""Basquete pintado (01/11/2026): a Quadra da Laje (fundo e meio-plano nos 4 horários, luzes da noite), a cesta em peças, as redes
(parada, chuá e balanço), a bola (4 quadros e 4 em chamas), o carrinho e a torcida (6 cores × 4 quadros) -> bqcen.js (window.BQC).
Fonte: ../basquete/arte (o pacote do dono, com os pontos de encaixe dele). Cada peça guarda o tamanho em unidades do jogo (uw, uh)
e a âncora (ax, ay, em unidades)."""
import json, base64, io, numpy as np
from PIL import Image
from cc import key_green
A = '../basquete/arte/'
def uri(im, fmt='WEBP', q=82):
    b = io.BytesIO(); im.save(b, fmt, quality=q, method=5); return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()
OUT = {'f': {}, 'm': {}}
for h, (f, m) in {'dia': ('04_fundo_dia', '05_meio_dia'), 'manha': ('06_fundo_amanhecer', '07_meio_amanhecer'), 'tarde': ('08_fundo_por_do_sol', '09_meio_por_do_sol'), 'noite': ('10_fundo_noite', '11_meio_noite')}.items():
    OUT['f'][h] = uri(Image.open(A + 'backgrounds/' + f + '.png').convert('RGB').resize((1280, 720), Image.LANCZOS), q=80)
    OUT['m'][h] = uri(Image.fromarray(key_green(A + 'backgrounds/' + m + '.png')).resize((1280, 720), Image.LANCZOS), q=86)
OUT['lf'] = uri(Image.open(A + 'backgrounds/12_luzes_fundo_noite.png').convert('RGB').resize((960, 540), Image.LANCZOS), q=76)
OUT['lm'] = uri(Image.open(A + 'backgrounds/13_luzes_meio_noite.png').convert('RGB').resize((960, 540), Image.LANCZOS), q=76)
P = 4.0  # pixels guardados por unidade do jogo
tiles, meta = [], {}
def add(name, path, kx, ky=None, ax=None, ay=None):
    """kx, ky: unidades do jogo por pixel da peça; ax, ay: âncora em pixels da peça (padrão: meio)"""
    ky = ky or kx; im = Image.fromarray(key_green(A + path)); uw, uh = im.width * kx, im.height * ky
    w, h = max(1, round(uw * P)), max(1, round(uh * P)); tiles.append(im.resize((w, h), Image.LANCZOS))
    meta[name] = dict(w=w, h=h, uw=round(uw, 2), uh=round(uh, 2), ax=round((ax if ax is not None else im.width / 2) * kx, 2), ay=round((ay if ay is not None else im.height / 2) * ky, 2))
KH = .1            # peças de ferro da cesta
KT, KTX = .183, .183 * .45  # tabela: 44 de altura na física; de lado e um pouco de frente (achatada na largura)
KR = 26.4 / 260    # aro: a abertura (260 px) = 2 × (raio do aro + espessura) da física
KB = 11 / 120      # bola: 120 px de diâmetro = 2 × 5,5
add('base', 'assets/cesta/01_base.png', KH, ay=212); add('poste', 'assets/cesta/02_poste_repetivel.png', KH); add('topo', 'assets/cesta/03_topo_poste.png', KH)
add('braco', 'assets/cesta/04_braco_repetivel.png', KH)
add('tabE', 'assets/cesta/05_tabela_esquerda.png', KTX, KT, ax=0, ay=0); add('tabM', 'assets/cesta/06_tabela_meio_repetivel.png', KTX, KT, ax=0, ay=0); add('tabD', 'assets/cesta/07_tabela_direita.png', KTX, KT, ax=0, ay=0)
add('aro', 'assets/cesta/aro_sem_rede_auxiliar.png', KR, ax=139, ay=62)
add('rede', 'assets/cesta/rede_parada_auxiliar.png', KR, ax=160, ay=32)
for j in range(4):
    add(f'swish{j}', f'assets/cesta/rede_swish_0{j + 1}.png', KR, ax=160, ay=18); add(f'bal{j}', f'assets/cesta/rede_balanco_0{j + 1}.png', KR, ax=160, ay=18)
    add(f'bola{j}', f'assets/bolas/bola_0{j + 1}.png', KB, ax=80, ay=80); add(f'fogo{j}', f'assets/bolas/bola_fogo_0{j + 1}.png', KB, ax=252, ay=95)
add('carro', 'assets/bolas/carrinho.png', 30 / 436, ax=0, ay=314)
CORES = ['rosa', 'laranja', 'roxo', 'amarelo', 'azul_claro', 'verde_jade']
for c, nm in enumerate(CORES):
    for j in range(4):
        a = key_green(A + f'torcida/{nm}/0{j + 1}.png'); bot = np.where(a[..., 3] > 100)[0].max()
        add(f't{c}_{j}', f'torcida/{nm}/0{j + 1}.png', .085, ax=128, ay=bot)
X = 0; atl = Image.new('RGBA', (sum(t.width + 2 for t in tiles), max(t.height for t in tiles)))
for (name, f), t in zip(meta.items(), tiles): atl.paste(t, (X, 0)); f['x'] = X; X += t.width + 2
OUT['atl'] = uri(atl, q=88); OUT['p'] = meta; OUT['P'] = P
open('bqcen.js', 'w').write('window.BQC = ' + json.dumps(OUT) + ';\n'); print('bqcen.js', len(open('bqcen.js').read()) // 1024, 'KB', atl.size, {k: (v['uw'], v['uh']) for k, v in list(meta.items())[:12]})
