# a bolha é convexa: onde a mão tapava o corpo ficou um "dente"; preenche com o fecho convexo do corpo (sem os pés)
import numpy as np, cv2
from PIL import Image
from scipy import ndimage
from skimage.morphology import convex_hull_image
for nm, lim in [('b_frente', .8), ('b_34', .8), ('b_lado', .82), ('b_amassa', .72), ('b_pulo', .74)]:
    c = np.array(Image.open(f'out/{nm}.png')); H = c.shape[0]; cut = int(H * lim)
    m = c[..., 3] > 128
    up = m.copy(); up[cut:] = False
    hull = convex_hull_image(up); hull[cut:] = False
    hull = ndimage.binary_erosion(hull, iterations=2)  # não cresce além da borda pintada
    hole = hull & ~ndimage.binary_erosion(m, iterations=2)
    # também os pixels claros demais (a fresta branca entre a mão e o corpo) perto da borda
    mn = c[..., :3].min(axis=2); pale = (mn > 205) & hull & ~ndimage.binary_erosion(m, iterations=10)
    hole |= pale
    bgr = cv2.cvtColor(c[..., :3], cv2.COLOR_RGB2BGR)
    fix = cv2.inpaint(bgr, (ndimage.binary_dilation(hole, iterations=2)).astype(np.uint8) * 255, 12, cv2.INPAINT_TELEA)
    rgb = np.where(ndimage.binary_dilation(hole, iterations=2)[..., None], cv2.cvtColor(fix, cv2.COLOR_BGR2RGB), c[..., :3])
    a = np.where(hull, 255, c[..., 3])
    out = np.dstack([rgb, a]).astype(np.uint8)
    Image.fromarray(out).save(f'out/{nm}.png'); print(nm, int(hole.sum()))
