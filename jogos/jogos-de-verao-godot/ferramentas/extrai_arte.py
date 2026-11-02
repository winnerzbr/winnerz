"""Tira a arte do jogo do navegador (jogos_verao/index.html) para o projeto Godot.
No navegador, cada conjunto de pranchas é um objeto JavaScript com as fichas (tamanhos, âncoras, quadros) e as imagens embutidas
("data:image/...") ou em arquivos (img/<código>.webp). Este programa acha o objeto pelo nome, salva cada imagem num arquivo em
arte/<nome>/ e grava as fichas em arte/<nome>.json com o caminho de cada imagem trocado por "res://arte/<nome>/<arquivo>".
Uso: python3 ferramentas/extrai_arte.py <pasta jogos_verao> NOME [NOME ...]   (ex.: SPR, MV5, BQC)
     python3 ferramentas/extrai_arte.py <pasta jogos_verao> --lista   (mostra os nomes que existem e o tamanho)"""
import base64, hashlib, json, re, shutil, sys
from pathlib import Path

src = Path(sys.argv[1]); html = (src / 'index.html').read_text(encoding='utf-8')
G = Path(__file__).resolve().parent.parent
ATR = re.compile(r'(?:window\.|const |let |var )([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\{)', re.M)

def objeto(nome):
    for m in ATR.finditer(html):
        if m.group(1) != nome: continue
        i = m.start(2); prof = 0; dentro = None; esc = False
        for j in range(i, len(html)):
            c = html[j]
            if dentro:
                if esc: esc = False
                elif c == '\\': esc = True
                elif c == dentro: dentro = None
            elif c in '"\'': dentro = c
            elif c == '{': prof += 1
            elif c == '}':
                prof -= 1
                if prof == 0:
                    txt = html[i:j + 1]
                    try: return json.loads(txt)
                    except Exception: break
    return None

def lista():
    vistos = {}
    for m in ATR.finditer(html):
        n = m.group(1)
        if n in vistos: continue
        o = objeto(n)
        if isinstance(o, dict):
            t = json.dumps(o); k = t.count('data:image') + len(re.findall(r'img/[0-9a-f]{32}\.webp', t))
            if k: vistos[n] = (k, len(t) // 1024)
    for n, (k, kb) in sorted(vistos.items(), key=lambda x: -x[1][1]): print(f'{n:14s} {k:4d} imagens  {kb:7d} KB')

def extrai(nome):
    o = objeto(nome)
    if o is None: print('não achei', nome); return
    dst = G / 'arte' / nome; dst.mkdir(parents=True, exist_ok=True); n = [0]
    def troca(v, caminho):
        if isinstance(v, dict): return {k: troca(x, caminho + [str(k)]) for k, x in v.items()}
        if isinstance(v, list): return [troca(x, caminho + [str(i)]) for i, x in enumerate(v)]
        if isinstance(v, str):
            m = re.match(r'data:image/(\w+);base64,(.+)$', v, re.S)
            base = '_'.join(caminho[-3:]) or 'img'; base = re.sub(r'[^A-Za-z0-9_]', '_', base)[:60]
            if m:
                ext = 'jpg' if m.group(1) == 'jpeg' else m.group(1); dados = base64.b64decode(m.group(2))
                arq = f'{base}_{hashlib.md5(dados).hexdigest()[:6]}.{ext}'; (dst / arq).write_bytes(dados); n[0] += 1
                return f'res://arte/{nome}/{arq}'
            m = re.match(r'(?:\./)?img/([0-9a-f]{32}\.webp)$', v)
            if m and (src / 'img' / m.group(1)).exists():
                arq = f'{base}_{m.group(1)[:6]}.webp'; shutil.copy(src / 'img' / m.group(1), dst / arq); n[0] += 1
                return f'res://arte/{nome}/{arq}'
        return v
    (G / 'arte' / f'{nome}.json').write_text(json.dumps(troca(o, []), ensure_ascii=False))
    print(nome, n[0], 'imagens')

if sys.argv[2] == '--lista': lista()
else:
    for nome in sys.argv[2:]: extrai(nome)
