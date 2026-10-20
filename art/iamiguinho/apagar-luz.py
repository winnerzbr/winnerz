# IAmiguinho: tira a luz azul do peito. Ela ia parar em lugares diferentes conforme a pose, então o peito fica liso,
# da cor do corpo. Acha a luz do peito (o círculo azul-claro cercado de bege; a luz do rosto e os anéis dos fones têm
# outra coisa em volta e ficam), apaga a luz e o aro e preenche com uma superfície suave (polinômio de grau 2 por canal)
# ajustada no bege em volta, com o mesmo grão leve do plástico. Braços e juntas que passam por perto não são apagados.
# Muda no lugar public/brand/iamiguinho/pose-*.webp e anim/pose-*-corpo.webp. Rodar de novo não muda nada.
#   python3 art/iamiguinho/apagar-luz.py [nome ...]
import os, sys, glob
import numpy as np, cv2
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
PASTA = os.path.join(ROOT, 'public', 'brand', 'iamiguinho')
nomes = sys.argv[1:] or None
arquivos = sorted(glob.glob(os.path.join(PASTA, 'pose-*.webp')) + glob.glob(os.path.join(PASTA, 'anim', 'pose-*-corpo.webp')))

for path in arquivos:
    nome = os.path.basename(path)[:-5].replace('-corpo', '')
    if nomes and nome not in nomes: continue
    im = np.array(Image.open(path).convert('RGBA')); H, W = im.shape[:2]
    rgb = np.ascontiguousarray(im[:, :, :3]).astype(float); a = im[:, :, 3]
    hsv = cv2.cvtColor(im[:, :, :3].copy(), cv2.COLOR_RGB2HSV)
    h, s, v = [hsv[:, :, i].astype(int) for i in range(3)]
    beige = (a > 200) & (h >= 8) & (h <= 25) & (s > 30) & (s < 150) & (v > 130)
    luz = (a > 200) & (h > 78) & (h < 102) & (s > 70) & (v > 170)
    k, lab, st, cen = cv2.connectedComponentsWithStats(luz.astype(np.uint8), 8)
    yy, xx = np.mgrid[0:H, 0:W]
    melhor = None
    for i in range(1, k):
        r0 = max(st[i, 2], st[i, 3]) / 2
        if st[i, 4] < 30 or not 5 <= r0 <= 22 or not 0.55 < st[i, 2] / max(1, st[i, 3]) < 1.8: continue
        if st[i, 4] / (np.pi * r0 * r0) < 0.5: continue  # a luz do peito é um disco cheio (um olho em anel não é)
        d = np.hypot(xx - cen[i][0], yy - cen[i][1])
        cerca = beige[(d > r0 * 1.7) & (d < r0 * 2.6)].mean()
        if cerca > 0.5 and (melhor is None or cerca > melhor[0]): melhor = (cerca, i, r0)
    if not melhor: print(nome, os.path.basename(path), 'sem luz no peito'); continue
    _, i, r = melhor; lx, ly = cen[i]
    R = r * 1.55  # a luz, o brilho em volta e o aro escuro
    d0 = np.hypot(xx - lx, yy - ly)
    em_volta = beige & (d0 > R * 1.15) & (d0 < R * 2.6)
    ys, xs = np.nonzero(em_volta)
    def base(x, y):
        x = (x - lx) / R; y = (y - ly) / R
        return np.stack([np.ones_like(x), x, y, x * x, x * y, y * y], -1)
    # Ajuste robusto: tira da conta o que destoa (sombra embaixo da cabeça, reflexo) e ajusta de novo.
    B = base(xs.astype(float), ys.astype(float)); alvo = rgb[ys, xs]; ok = np.ones(len(xs), bool)
    for _ in range(3):
        coef, *_ = np.linalg.lstsq(B[ok], alvo[ok], rcond=None)
        res = np.abs(B @ coef - alvo).sum(1); ok = res < max(6.0, 2.5 * res[ok].std())
    liso = np.clip(base(xx.astype(float), yy.astype(float)) @ coef, 0, 255)
    ys, xs = ys[ok], xs[ok]
    # O grão do plástico: o resíduo do bege em volta, com a mesma força, para o remendo não ficar "pintado".
    resid = (rgb[ys, xs] - liso[ys, xs]).std()
    rng = np.random.default_rng(7)
    grao = cv2.GaussianBlur(rng.normal(0, 1, (H, W)).astype(np.float32), (0, 0), 1.2)
    grao = (grao / max(1e-6, grao.std()) * min(resid * 0.6, 1.4))[:, :, None]
    # O buraco: a luz, o brilho e o aro escuro. O aro acaba onde a cor volta a ser a do plástico em volta (o "azul menos
    # vermelho" de cada anel em volta, pela mediana, igual ao do bege mais longe); um pouco de folga para a borda.
    br = rgb[:, :, 2] - rgb[:, :, 0]
    longe = (d0 >= r * 1.6) & (d0 < r * 2.0) & (a > 200)
    ref = np.median(br[longe])
    fim = r * 1.4
    for t in np.arange(r * 0.7, r * 1.6, 0.5):
        anel = (d0 >= t) & (d0 < t + 1) & (a > 200)
        if anel.sum() and abs(np.median(br[anel]) - ref) < 8: fim = t; break
    fim += 1.5
    buraco = (d0 < fim) & (a > 200)
    # Preenche com o plástico liso mais a diferença suave da borda puxada para dentro (equação de Laplace, por
    # iteração), para a emenda não aparecer.
    res = rgb - liso
    borda = cv2.dilate(buraco.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool) & ~buraco
    rb = res[borda]; med = np.median(rb, 0)
    campo = np.where(buraco[:, :, None], med, res)
    y0, y1 = max(0, int(ly - fim - 4)), min(H, int(ly + fim + 5)); x0, x1 = max(0, int(lx - fim - 4)), min(W, int(lx + fim + 5))
    c = campo[y0:y1, x0:x1].copy(); m = buraco[y0:y1, x0:x1]
    for _ in range(8000):
        viz = (np.roll(c, 1, 0) + np.roll(c, -1, 0) + np.roll(c, 1, 1) + np.roll(c, -1, 1)) / 4
        c[m] = viz[m]
    # A sombra de outra peça que encosta na borda (embaixo da cabeça) entra só um pouquinho e some, como sombra de
    # verdade: a parte mais escura que o normal decai com a distância da borda.
    dist = cv2.distanceTransform(buraco.astype(np.uint8), cv2.DIST_L2, 3)
    dd = dist[y0:y1, x0:x1][:, :, None]
    escuro = np.minimum(c - med, 0)
    c = np.where(m[:, :, None], c - escuro * (1 - np.exp(-np.maximum(dd - 0.5, 0) / 3.0)), c)
    campo[y0:y1, x0:x1] = c
    fundo = liso + campo
    peso = np.clip(dist / 3.0, 0, 1)[:, :, None]
    novo = np.where(buraco[:, :, None], np.clip(fundo + grao * peso, 0, 255), rgb).astype(np.uint8)
    out = im.copy(); out[:, :, :3] = novo
    Image.fromarray(out).save(path, quality=92)
    print(nome, os.path.basename(path), f'luz em ({lx:.0f}, {ly:.0f}) r={r:.1f} aro até {fim:.1f} apagada')
