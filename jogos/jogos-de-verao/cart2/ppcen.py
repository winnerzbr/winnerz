"""Pingue-pongue pintado: o Quiosque do Coqueiral (fundo e meio-plano nos 4 horários, luzes da noite) -> ppcen.js (window.PPC).
Fonte: ../pingue/arte (as imagens do dono, 01/11/2026, renomeadas). O meio-plano do dia é o que bate com os outros horários
(o outro, meio_dia_outra, fica guardado: banquinhos mais baixos e cocos verdes)."""
import json, base64, io
from PIL import Image
from cc import key_green
A = '../pingue/arte/'
def uri(im, q=82):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=5); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
OUT = {'f': {}, 'm': {}}
for h in ('dia', 'manha', 'tarde', 'noite'):
    OUT['f'][h] = uri(Image.open(A + f'fundo_{h}.png').convert('RGB').resize((1280, 720), Image.LANCZOS), 80)
    OUT['m'][h] = uri(Image.fromarray(key_green(A + f'meio_{h}.png')).resize((1280, 720), Image.LANCZOS), 86)
OUT['lf'] = uri(Image.open(A + 'luz_fundo.png').convert('RGB').resize((960, 540), Image.LANCZOS), 76)
OUT['lm'] = uri(Image.open(A + 'luz_meio.png').convert('RGB').resize((960, 540), Image.LANCZOS), 76)
open('ppcen.js', 'w').write('window.PPC = ' + json.dumps(OUT) + ';\n'); print('ppcen.js', len(open('ppcen.js').read()) // 1024, 'KB')
