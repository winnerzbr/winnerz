"""Tira do jogo do navegador a arte que o vôlei usa e grava no projeto Godot (o mesmo formato do ferramentas/extrai_arte.py:
arte/<NOME>/ com as imagens e arte/<NOME>.json com as fichas, cada imagem trocada por "res://arte/<NOME>/<arquivo>").

Por que um programa só do vôlei: as pranchas dos personagens pintados (MV5 = IAmiguinho, MVB = Amiguinho) e as peças do cenário
(C2) guardam muitas imagens em arquivos img/<12 letras>.webp, que o extrai_arte.py ainda não reconhece (ele espera 32 letras).

O que ele faz além de copiar:
  - MV5: aplica os ajustes de rosto que o dono fez no editor do jogo (arquivo editor_aplicado.json, parte "rostos"),
    do mesmo jeito que o navegador (WZ.apply → applyRosto): centro do rosto (fx, fy), tamanho (fs), giro (fr) e encaixe (ax, ay).
    Assim o Godot já abre com o rosto onde o dono deixou.
  - C2: só as peças que o vôlei pintado desenha (céu, mar, areia, torcida, rede, placar, bola, areia levantando).
    Também grava a torcida já pintada nas 7 cores (o desenho é rosa; as outras cores saem girando o tom, como no navegador)
    e o poste de trás escurecido.

Uso: python3 provas/volei/extrai_arte_volei.py <pasta jogos_verao> <editor_aplicado.json>
"""
import base64, colorsys, json, math, re, shutil, sys
from io import BytesIO
from pathlib import Path
from PIL import Image

src = Path(sys.argv[1]); html = (src / 'index.html').read_text(encoding='utf-8')
cfg_editor = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
cfg_editor = json.loads(cfg_editor['json']) if isinstance(cfg_editor.get('json'), str) else cfg_editor.get('json', cfg_editor)
G = Path(__file__).resolve().parent.parent.parent


def objeto(nome):
    m = re.search(r'window\.' + nome + r'\s*=\s*\{', html)
    return json.JSONDecoder().raw_decode(html[m.end() - 1:])[0]


def salva_imagem(v, dst, arq_base):
    """grava a imagem (data: embutida ou img/xxx.webp) e devolve o nome do arquivo"""
    m = re.match(r'data:image/(\w+);base64,(.+)$', v, re.S)
    if m:
        ext = 'jpg' if m.group(1) == 'jpeg' else m.group(1)
        arq = f'{arq_base}.{ext}'; (dst / arq).write_bytes(base64.b64decode(m.group(2))); return arq
    m = re.match(r'(?:\./)?img/([0-9a-f]+\.webp)$', v)
    if m:
        arq = f'{arq_base}.webp'; shutil.copy(src / 'img' / m.group(1), dst / arq); return arq
    raise SystemExit(f'imagem desconhecida: {v[:60]}')


def aplica_rostos(mv, rostos):
    """o mesmo que applyRosto do navegador (cada ajuste vale para o quadro e para o quadro do meio que vem depois dele)"""
    n = 0
    for chave, o in rostos.items():
        conj, an, k = chave.split('.'); k = int(k)
        if conj != 'ia' or an not in mv['a']: continue
        A = mv['a'][an]
        if k >= len(A['f']): continue
        qs = [A['f'][k]] + ([A['m'][k]] if A.get('m') and k < len(A['m']) and A['m'][k] else [])
        for f in qs:
            g = {'s': list(f['s']) if f.get('s') else None, 'r': f.get('r'), 'ax': f['ax'], 'ay': f['ay']}
            if g['s'] and f.get('s'):
                s = f['s']
                cx = g['s'][4] if len(g['s']) > 4 and g['s'][4] is not None else (g['s'][0] + g['s'][2]) / 2
                cy = g['s'][5] if len(g['s']) > 5 and g['s'][5] is not None else (g['s'][1] + g['s'][3]) / 2
                while len(s) < 8: s.append(None)
                s[4] = cx + (o.get('fx') or 0); s[5] = cy + (o.get('fy') or 0)
                L1 = (g['s'][6] if len(g['s']) > 6 and g['s'][6] else 0) or (f['sz'][0] if f.get('sz') else 0)
                L2 = (g['s'][7] if len(g['s']) > 7 and g['s'][7] else 0) or (f['sz'][1] if f.get('sz') else 0)
                s[6] = L1 * (o.get('fs') or 1); s[7] = L2 * (o.get('fs') or 1)
            f['r'] = (g['r'] or 0) + (o.get('fr') or 0) * math.pi / 180
            f['ax'] = g['ax'] - (o.get('ax') or 0); f['ay'] = g['ay'] - (o.get('ay') or 0)
            if o.get('ks') and o['ks'] != 1: f['ks'] = o['ks']
            if o.get('kr'): f['kr'] = o['kr'] * math.pi / 180
        n += 1
    return n


def pranchas(nome, rostos=None):
    mv = objeto(nome); dst = G / 'arte' / nome; dst.mkdir(parents=True, exist_ok=True); n = 0
    for an, A in mv['a'].items():
        for campo, suf in (('src', ''), ('mask', '_mask'), ('msrc', '_m'), ('mmask', '_mmask')):
            if A.get(campo):
                A[campo] = f'res://arte/{nome}/' + salva_imagem(A[campo], dst, an + suf); n += 1
    if rostos:
        mv['rostos_do_editor'] = aplica_rostos(mv, rostos)
    (G / 'arte' / f'{nome}.json').write_text(json.dumps(mv, ensure_ascii=False))
    print(nome, n, 'imagens', f"({mv.get('rostos_do_editor', 0)} rostos do editor aplicados)" if rostos else '')


# ---- cores da torcida e o tom de rosa original (o mesmo "tinted" do navegador)
TORCIDA = ['#9a7cf0', '#f08a3c', '#5cc7a0', '#e86fa8', '#ffcf3f', '#5aa0f0', '#f07070', '#b0d060']


def hsv(r, g, b):
    mx, mn = max(r, g, b), min(r, g, b); d = mx - mn; h = 0.0
    if d:
        if mx == r: h = ((g - b) / d) % 6
        elif mx == g: h = (b - r) / d + 2
        else: h = (r - g) / d + 4
        h *= 60
        if h < 0: h += 360
    return h, (d / mx if mx else 0), mx / 255


def rgb_de(h, s, v):
    c = v * s; x = c * (1 - abs(((h / 60) % 2) - 1)); m = v - c
    r, g, b = [(c, x, 0), (x, c, 0), (0, c, x), (0, x, c), (x, 0, c), (c, 0, x)][min(5, int(h // 60))]
    return (r + m) * 255, (g + m) * 255, (b + m) * 255


def hexrgb(h): return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


ROSA = hsv(*hexrgb('#e86fa8'))


def pinta(im, cor):
    T = hsv(*hexrgb(cor))
    if abs(T[0] - ROSA[0]) <= 2 and abs(T[1] - ROSA[1]) <= .03: return im
    im = im.convert('RGBA'); px = im.load(); ks = T[1] / ROSA[1]; kv = T[2] / ROSA[2]
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, s, v = hsv(r, g, b)
            if s < .18 or 40 < h < 270: continue  # o visor azul-marinho e o contorno ficam
            nh = ((T[0] + (h - ROSA[0]) * .6) % 360 + 360) % 360
            rr, gg, bb = rgb_de(nh, min(1, max(0, s * ks)), min(1, max(0, v * (.55 + .45 * kv))))
            px[x, y] = (round(rr), round(gg), round(bb), a)
    return im


def escurece(im):
    """o lado de trás: uma camada roxa a 30% por cima (só onde tem desenho)"""
    im = im.convert('RGBA'); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a: px[x, y] = (round(r + (46 - r) * .3), round(g + (24 - g) * .3), round(b + (96 - b) * .3), a)
    return im


def cenario():
    C2 = objeto('C2'); usa = ['ceu', 'mar', 'areia', 'b_frente', 'poste', 'malha', 'faixa', 'placar', 'bola', 'areia1', 'areia2', 'areia3']
    dst = G / 'arte' / 'C2'; dst.mkdir(parents=True, exist_ok=True); out = {}
    for n in usa:
        a = dict(C2[n]); a['src'] = f'res://arte/C2/' + salva_imagem(a['src'], dst, n); out[n] = a
    base = Image.open(dst / Path(out['b_frente']['src']).name)
    out['b_frente']['cores'] = {}
    for cor in TORCIDA:
        arq = f'b_frente_{cor[1:]}.png'; pinta(base, cor).save(dst / arq); out['b_frente']['cores'][cor] = f'res://arte/C2/{arq}'
    escurece(Image.open(dst / Path(out['poste']['src']).name)).save(dst / 'poste_escuro.png'); out['poste']['escuro'] = 'res://arte/C2/poste_escuro.png'
    (G / 'arte' / 'C2.json').write_text(json.dumps(out, ensure_ascii=False))
    print('C2', len(usa), 'peças + torcida em', len(TORCIDA), 'cores + poste escuro')


pranchas('MV5', cfg_editor.get('rostos', {}))
pranchas('MVB')
cenario()
