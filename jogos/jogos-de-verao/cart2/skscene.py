"""Cenário pintado do half-pipe -> skscene.js (window.SKSC): texturas e peças recortadas e prontas para o jogo."""
import io, base64, json, numpy as np
from PIL import Image
from cc import key_green
S = '../skate/scene/'
def b64(im, q=84):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=5); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
OUT = {}
# parede da rampa: a versão que repete sem emenda (4 x 4 painéis)
OUT['lado'] = b64(Image.open(S + 'lado_b.png').convert('RGB').resize((640, 640), Image.LANCZOS))
# pista: compensado
OUT['pista'] = b64(Image.open(S + 'pista.png').convert('RGB').resize((512, 512), Image.LANCZOS))
# calçadão: a faixa de cima (mais longe), a tela inteira de largura
OUT['calc'] = b64(Image.open(S + 'calc_b.png').convert('RGB').crop((0, 0, 2172, 260)).resize((1600, 192), Image.LANCZOS))
# céu alto: do roxo que emenda com o topo do céu do vôlei até as estrelas; a parte de baixo some aos poucos
t = Image.open(S + 'ceu_b.png').convert('RGBA'); a = np.array(t)[:880].copy(); n = 140
a[-n:, :, 3] = (np.linspace(1, 0, n) ** 1.3 * 255).astype(np.uint8)[:, None]
OUT['alto'] = b64(Image.fromarray(a).resize((768, 880), Image.LANCZOS), 82)
# peças (fundo verde): deck de compensado e o corrimão
p = key_green(S + 'pecas_a.png')
OUT['deck'] = b64(Image.fromarray(p[300:452, 30:1744]).resize((1200, 106), Image.LANCZOS), 86)
OUT['rail'] = b64(Image.fromarray(p[524:800, 20:700]).resize((480, 195), Image.LANCZOS), 86)
# Skatepark do Viaduto (Costa WinnerZ): fundo distante e meio-plano nos 4 horários + camadas de luzes da noite + chão
from vdkey import key_vd
V = '../skate/vd/'
OUT['vd'] = {'f': {}, 'm': {}, 'top': {}}
for h in ('manha', 'dia', 'tarde', 'noite'):
    f = Image.open(V + f'fundo_{h}.png').convert('RGB'); OUT['vd']['f'][h] = b64(f.resize((1100, 1100), Image.LANCZOS), 80)
    OUT['vd']['top'][h] = '#%02x%02x%02x' % tuple(int(c) for c in np.array(f)[:12].reshape(-1, 3).mean(0))
    OUT['vd']['m'][h] = b64(Image.fromarray(key_vd(V + f'meio_{h}.png')).resize((1600, 900), Image.LANCZOS), 80)
OUT['vd']['lf'] = b64(Image.open(V + 'luz_fundo.png').convert('RGB').resize((1100, 1100), Image.LANCZOS), 78)
OUT['vd']['lm'] = b64(Image.open(V + 'luz_meio.png').convert('RGB').resize((1600, 900), Image.LANCZOS), 78)
OUT['vd']['chao'] = b64(Image.open(V + 'chao.png').convert('RGB').crop((0, 0, 2172, 300)).resize((1600, 221), Image.LANCZOS), 84)
VD = OUT.pop('vd')
open('skvd.js', 'w').write('window.SKVD = ' + json.dumps(VD) + ';\n'); print('skvd', len(open('skvd.js').read()) // 1024, 'KB', VD['top'])
open('skscene.js', 'w').write('window.SKSC = ' + json.dumps(OUT) + ';\n'); print({k: len(v) // 1024 for k, v in OUT.items()})
