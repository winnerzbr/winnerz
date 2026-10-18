# IAmiguinho: a luz azul do peito fica no centro do tronco. Nas imagens geradas ela saiu deslocada para um lado; este
# script acha a luz (o círculo azul-claro cercado de bege), apaga ela com inpainting e redesenha no meio do tronco,
# na mesma altura. Poses em que o peito está escondido (controle, mapa, placa, espiando) ficam como estão.
# Rode antes do separar-helice.py e do limpar-tela.py:
#   python3 art/iamiguinho/centralizar-luz.py && python3 art/iamiguinho/separar-helice.py && python3 art/iamiguinho/limpar-tela.py
# Muda public/brand/iamiguinho/pose-*.webp no lugar. Rodar de novo não muda nada (a luz já está no centro).
import os, sys, glob
import numpy as np, cv2
from PIL import Image

def beige_ou_luz(nucleo, beige, luz, d0, R):
    # Dentro do disco, apaga tudo que é luz ou bege (o aro e o brilho), mas não o que é de outra peça (braço, junta).
    outra = ~(beige | luz | nucleo) & (d0 < R)
    outra = cv2.morphologyEx(outra.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    return (~outra)[:, :, None].astype(float)

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
PASTA = os.path.join(ROOT, 'public', 'brand', 'iamiguinho')
nomes = sys.argv[1:] or None

for path in sorted(glob.glob(os.path.join(PASTA, 'pose-*.webp'))):
    nome = os.path.basename(path)[:-5]
    if nomes and nome not in nomes: continue
    im = np.array(Image.open(path).convert('RGBA')); H, W = im.shape[:2]
    rgb = np.ascontiguousarray(im[:, :, :3]); a = im[:, :, 3]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    h, s, v = [hsv[:, :, i].astype(int) for i in range(3)]
    beige = (a > 200) & (h >= 8) & (h <= 25) & (s > 40) & (s < 140) & (v > 150)
    luz = (a > 200) & (h > 80) & (h < 100) & (s > 90) & (v > 200)
    k, lab, st, cen = cv2.connectedComponentsWithStats(luz.astype(np.uint8), 8)
    yy, xx = np.mgrid[0:H, 0:W]
    melhor = None
    for i in range(1, k):
        r0 = max(st[i, 2], st[i, 3]) / 2
        if st[i, 4] < 60 or r0 < 8 or not 0.6 < st[i, 2] / max(1, st[i, 3]) < 1.6: continue
        d = np.hypot(xx - cen[i][0], yy - cen[i][1])
        cerca = beige[(d > r0 * 1.6) & (d < r0 * 2.4)].mean()
        if cerca > 0.45 and (melhor is None or cerca > melhor[0]): melhor = (cerca, i, r0)
    if not melhor: print(nome, 'peito escondido'); continue
    _, i, r = melhor; lx, ly = cen[i]
    # O meio do tronco: média dos trechos bege que passam sob a luz, um pouco abaixo dela.
    centros = []
    for row in range(int(ly + r * 1.6), int(ly + r * 3.0)):
        xs = np.where(beige[row])[0]
        if not len(xs): continue
        segs = np.split(xs, np.where(np.diff(xs) > 3)[0] + 1)
        seg = [sg for sg in segs if sg[0] - r <= lx <= sg[-1] + r]
        if seg and seg[0][-1] - seg[0][0] > r * 4: centros.append((seg[0][0] + seg[0][-1]) / 2)
    if not centros: print(nome, 'tronco não achado'); continue
    cx = float(np.median(centros))
    if abs(cx - lx) < r * 0.5: print(nome, 'já no centro'); continue
    R = r * 1.5
    # Apaga a luz antiga: o plástico bege em volta é liso, então o buraco é preenchido com uma superfície suave
    # (polinômio de grau 2 por canal) ajustada só nos pixels bege ao redor; as juntas escuras não vazam para dentro.
    d0 = np.hypot(xx - lx, yy - ly)
    em_volta = beige & (d0 > R) & (d0 < R * 2.4)
    ys, xs = np.nonzero(em_volta)
    def base(x, y):
        x = (x - lx) / R; y = (y - ly) / R
        return np.stack([np.ones_like(x), x, y, x * x, x * y, y * y], -1)
    coef, *_ = np.linalg.lstsq(base(xs.astype(float), ys.astype(float)), rgb[ys, xs].astype(float), rcond=None)
    liso = np.clip(base(xx.astype(float), yy.astype(float)) @ coef, 0, 255)
    apaga = np.clip((R * 1.25 - d0) / (R * 0.55), 0, 1)[:, :, None] * beige_ou_luz(d0 < R * 1.1, beige, luz, d0, R * 1.25)
    limpo = rgb * (1 - apaga) + liso * apaga
    # A luz (núcleo, aro e brilho) colada no meio, na mesma altura, com a borda suave sobre o bege do lugar novo.
    dx = int(round(cx - lx))
    M = np.float32([[1, 0, dx], [0, 1, 0]])
    luzrgb = cv2.warpAffine(rgb, M, (W, H), borderMode=cv2.BORDER_REPLICATE)
    d2 = np.hypot(xx - (lx + dx), yy - ly)
    proprio = cv2.warpAffine(beige_ou_luz(d0 < r * 1.06, beige, luz, d0, R)[:, :, 0].astype(np.uint8), M, (W, H)).astype(bool)
    alfa = (np.clip((r * 1.32 - d2) / (r * 0.22), 0, 1) * proprio)[:, :, None]
    novo = np.clip(luzrgb * alfa + limpo * (1 - alfa), 0, 255).astype(np.uint8)
    out = im.copy(); out[:, :, :3] = novo
    Image.fromarray(out).save(path, quality=92)
    print(nome, f'luz de x={lx:.0f} para x={cx:.0f}')
