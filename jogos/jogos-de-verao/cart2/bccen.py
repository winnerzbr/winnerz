"""Bocha pintada: a Vila dos Pescadores vista de cima nos 4 horários e as luzes da noite -> bccen.js (window.BCC).
Fonte: ../bocha/arte (as imagens do dono, renomeadas). A cancha pintada (lado de dentro das tábuas) vai de x 261 a 1837 e
de y 365 a 880 na imagem de 1920x1080; o jogo encaixa essa cancha na dele (BC.x0..x1, BC.y0..y1)."""
import json, base64, io
from PIL import Image
A = '../bocha/arte/'
def uri(im, q=80):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=5); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
OUT = {'f': {}, 'c': [261, 365, 1837, 880], 'w': 1920, 'h': 1080}
for h in ('dia', 'manha', 'tarde', 'noite'):
    OUT['f'][h] = uri(Image.open(A + f'vila_{h}.png').convert('RGB').resize((1280, 720), Image.LANCZOS))
OUT['lz'] = uri(Image.open(A + 'vila_luzes.png').convert('RGB').resize((960, 540), Image.LANCZOS), 76)
open('bccen.js', 'w').write('window.BCC = ' + json.dumps(OUT) + ';\n'); print('bccen.js', len(open('bccen.js').read()) // 1024, 'KB')
