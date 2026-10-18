# IAmiguinho M6, os olhos vivos: apaga a luz do rosto (olhos e boca) da camada do corpo e mede a tela, para o site
# desenhar o rosto em vetor por cima (src/lib/iamiguinhoRosto.ts) e trocar de expressão, piscar e olhar para os lados.
# Rode depois do separar-helice.py, a partir das imagens originais:
#   python3 art/iamiguinho/separar-helice.py && python3 art/iamiguinho/limpar-tela.py
# Muda public/brand/iamiguinho/anim/*-corpo.webp no lugar e escreve src/lib/iamiguinhoTela.ts (a tela e, nas poses
# com placa, a área branca da placa, onde o site escreve o texto).
import sys, os, json, glob
import numpy as np, cv2
from PIL import Image
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
src = out = os.path.join(ROOT, 'public', 'brand', 'iamiguinho', 'anim')
names = sys.argv[1:] or None
meta = {}
# Imagens com um objeto escuro na frente da tela (o controle). O vidro é achado só pela parte azulada; o objeto não é
# apagado, e sai uma máscara (-tela.webp) com a parte visível da tela, para o rosto em vetor ficar atrás do objeto.
NA_FRENTE = {'pose-controle'}
mascaras = set()
placas = {}
for path in sorted(glob.glob(os.path.join(src, '*-corpo.webp'))):
    name = os.path.basename(path)[:-len('-corpo.webp')]
    if names and name not in names: continue
    im = np.array(Image.open(path).convert('RGBA')); H, W = im.shape[:2]
    rgb = im[:, :, :3]; a = im[:, :, 3]
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)  # h 0..179, s,v 0..255
    h, s, v = hsv[:, :, 0].astype(int), hsv[:, :, 1].astype(int), hsv[:, :, 2].astype(int)
    lim = int(H * (0.6 if name.startswith('pose-') else 1.0))
    # Vidro: escuro e azulado (ou quase preto), opaco.
    dark = (a > 200) & (v < 70) & ((h > 95) & (h < 135) | (v < 35))
    dark[lim:, :] = False
    n, lab, st, cen = cv2.connectedComponentsWithStats(dark.astype(np.uint8), 8)
    if n < 2: meta[name] = None; continue
    i = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA])
    tela = (lab == i).astype(np.uint8)
    objeto = None
    if name in NA_FRENTE:
        azul = ((a > 200) & (v < 70) & (h > 95) & (h < 135) & (s > 70)).astype(np.uint8) & tela
        azul = cv2.morphologyEx(azul, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
        casco = np.zeros_like(tela); cv2.drawContours(casco, [cv2.convexHull(cv2.findNonZero(azul))], -1, 1, -1)
        tela = cv2.dilate(casco, np.ones((17, 17), np.uint8)) & (a > 200).astype(np.uint8)
        # O objeto: a maior mancha cinza (pouca cor) que encosta na metade de baixo da tela.
        cinza = ((a > 200) & (s < 60) & (v < 150) & ~((h > 95) & (h < 135) & (s > 40))).astype(np.uint8)
        k3, lab3, st3, _ = cv2.connectedComponentsWithStats(cinza, 8)
        ys0, ys1 = np.nonzero(tela)[0].min(), np.nonzero(tela)[0].max()
        meio = (ys0 + ys1) // 2
        cand = [(st3[q, cv2.CC_STAT_AREA], q) for q in range(1, k3) if ((lab3 == q)[meio:ys1 + 1] & (tela[meio:ys1 + 1] == 1)).any()]
        if cand:
            objeto = cv2.dilate((lab3 == max(cand)[1]).astype(np.uint8), np.ones((3, 3), np.uint8))
    # Fecha os buracos (os olhos e a boca ficam dentro da tela).
    cnts, _ = cv2.findContours(tela, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(cnts, key=cv2.contourArea)
    cheia = np.zeros_like(tela); cv2.drawContours(cheia, [c], -1, 1, -1)
    # Luz: dentro da tela, tudo que não é vidro escuro (olhos, boca e o brilho em volta), menos reflexo branco.
    luz = (cheia == 1) & (dark == 0) & (a > 0)
    reflexo = (s < 60) & (v > 170)
    luz &= ~reflexo
    luz = cv2.dilate(luz.astype(np.uint8), np.ones((5, 5), np.uint8), iterations=2)
    luz &= cv2.erode(cheia, np.ones((3, 3), np.uint8), iterations=2)
    if objeto is not None:
        luz &= (1 - objeto)
        visivel = (cv2.dilate(cheia, np.ones((25, 25), np.uint8)) & (1 - objeto)) * 255
        mimg = np.zeros((H, W, 4), np.uint8); mimg[:, :, 3] = visivel
        Image.fromarray(mimg).save(os.path.join(out, name + '-tela.webp'), lossless=True)
        mascaras.add(name)
    limpo = cv2.inpaint(rgb, luz, 7, cv2.INPAINT_TELEA)
    outim = im.copy(); outim[:, :, :3] = np.where(luz[:, :, None] == 1, limpo, rgb)
    Image.fromarray(outim).save(path, quality=92)
    (cx, cy), (rw, rh), ang = cv2.minAreaRect(c)
    if rw < rh: rw, rh, ang = rh, rw, ang + 90
    if ang > 45: ang -= 90
    if ang < -45: ang += 90
    if 'placa' in name or 'espiando' in name:
        branco = ((a > 200) & (s < 40) & (v > 190)).astype(np.uint8)
        k, lb, stw, _ = cv2.connectedComponentsWithStats(branco, 8)
        if k > 1:
            j = 1 + np.argmax(stw[1:, cv2.CC_STAT_AREA])
            if stw[j, cv2.CC_STAT_AREA] > 0.05 * W * H:
                cp, _ = cv2.findContours((lb == j).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                (px, py), (pw, ph), pa = cv2.minAreaRect(max(cp, key=cv2.contourArea))
                if pa > 45: pw, ph, pa = ph, pw, pa - 90
                if pa < -45: pw, ph, pa = ph, pw, pa + 90
                placas[name] = {'x': round(px / W * 100, 2), 'y': round(py / H * 100, 2), 'w': round(pw / W * 100, 2), 'h': round(ph / H * 100, 2), 'r': round(pw / ph, 3), 'a': round(pa, 1)}
    meta[name] = {'x': round(cx / W * 100, 2), 'y': round(cy / H * 100, 2), 'w': round(rw / W * 100, 2), 'h': round(rh / H * 100, 2), 'a': round(ang, 1)}
ts = os.path.join(ROOT, 'src', 'lib', 'iamiguinhoTela.ts')
linhas = [f"  '{k}': {{ x: {v['x']}, y: {v['y']}, w: {v['w']}, a: {v['a']} }}," for k, v in sorted(meta.items()) if v]
open(ts, 'w').write('/** Gerado por art/iamiguinho/limpar-tela.py: a tela do rosto em cada imagem (centro e largura em %, inclinação em graus). */\nexport const TELA: Record<string, { x: number; y: number; w: number; a: number }> = {\n' + '\n'.join(linhas) + '\n};\n'
    + '/** Imagens em que um objeto fica na frente da tela: o rosto usa a máscara <nome>-tela.webp. */\nexport const MASCARA: Record<string, true> = {' + ', '.join(f"'{k}': true" for k in sorted(mascaras)) + '};\n'
    + '/** A área branca da placa (centro, largura e altura em %, proporção largura/altura em pixels, inclinação). */\nexport const PLACA: Record<string, { x: number; y: number; w: number; h: number; r: number; a: number }> = {\n'
    + '\n'.join(f"  '{k}': {{ x: {v['x']}, y: {v['y']}, w: {v['w']}, h: {v['h']}, r: {v['r']}, a: {v['a']} }}," for k, v in sorted(placas.items())) + '\n};\n')
print(len(linhas), 'telas')
