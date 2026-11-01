"""Junta os atlas de todas as animações de um personagem num atlas só (e as máscaras do rosto em outra imagem só): cada animação ganha
'y' (onde a faixa dela começa); a imagem e a máscara ficam em OUT['src'] e OUT['mask']. A página publicada aceita no máximo 511 arquivos; com uma imagem por animação o jogo passava disso (01/11)."""
import base64, io, json
from PIL import Image
def _img(uri): return Image.open(io.BytesIO(base64.b64decode(uri.split(',', 1)[1]))).convert('RGBA')
def _uri(im, q): b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=5); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
def junta(OUT, q=84, qm=60):
    A = OUT['a']
    if 'src' in OUT: return OUT
    ims = {k: _img(v['src']) for k, v in A.items()}; mks = {k: _img(v['mask']) for k, v in A.items()}
    W = max(i.width for i in ims.values()); H = sum(i.height + 2 for i in ims.values())
    atl = Image.new('RGBA', (W, H)); msk = Image.new('RGBA', (W, H), (255, 255, 255, 0)); y = 0
    for k in A: atl.paste(ims[k], (0, y)); msk.paste(mks[k], (0, y)); A[k]['y'] = y; y += ims[k].height + 2
    s, m = _uri(atl, q), _uri(msk, qm)
    for k in A: A[k].pop('src', None); A[k].pop('mask', None)
    OUT['src'] = s; OUT['mask'] = m
    print('atlas junto', atl.size)
    return OUT
def junta_arquivo(path, var):
    OUT = json.loads(open(path).read().split('=', 1)[1].strip().rstrip(';')); junta(OUT)
    open(path, 'w').write(f'window.{var} = ' + json.dumps(OUT) + ';\n'); print(path, len(open(path).read()) // 1024, 'KB')
if __name__ == '__main__':
    import sys; junta_arquivo(sys.argv[1], sys.argv[2])
