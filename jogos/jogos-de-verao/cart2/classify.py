"""Compara a silhueta de cada quadro das pranchas novas com as pranchas antigas (mesmo índice de quadro) para descobrir qual movimento é."""
import numpy as np, json
from PIL import Image
I = json.load(open('mv2/info.json'))
OLD = {'dive1':'Peixinho 1','dive2':'Peixinho 2','dive3':'Peixinho 3','getup':'Peixinho 4','party1':'Comemoração 1','party2':'Comemoração 2','sad1':'Tristeza 1','sad2':'Tristeza 2'}


def sil(p):
    a = np.array(Image.open(p))[..., 3] > 128; ys, xs = np.where(a); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = a.shape; s = max(h, w); c = np.zeros((s, s), bool); c[(s - h) // 2:(s - h) // 2 + h, (s - w) // 2:(s - w) // 2 + w] = a
    return np.array(Image.fromarray(c.astype(np.uint8) * 255).resize((48, 48), Image.BILINEAR)) > 100
REF = {o: [sil(f'mv2/{o}_{j}.png') for j in range(len(I[o]))] for o in OLD}
new = sorted(k for k in I if k.startswith('m') and k[1:].isdigit())
for n in new:
    S = [sil(f'mv2/{n}_{j}.png') for j in range(8)]
    sc = {o: np.mean([(S[j] & R[j]).sum() / (S[j] | R[j]).sum() for j in range(min(8, len(R)))]) for o, R in REF.items()}
    top = sorted(sc.items(), key=lambda t: -t[1])[:3]
    print(n, ' | '.join(f'{OLD[o]} {v:.2f}' for o, v in top))
