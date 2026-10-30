import numpy as np
from PIL import Image
from scipy import ndimage
def key_vd(path):
    """meio-plano: fundo verde fora, inclusive os halos das lâmpadas sobre o verde (o brilho vem da camada de luzes)"""
    im = np.array(Image.open(path).convert('RGB')).astype(float); r, g, b = im[..., 0], im[..., 1], im[..., 2]
    gd = g - np.maximum(r, b)
    a = np.clip(1 - (gd - 12) / 34, 0, 1)
    # halo amarelo-esverdeado das lâmpadas (luz sobre o verde): some também; o brilho de verdade é laranja (vermelho > verde)
    lime = (g > b + 40) & (g > r - 12)
    a = np.where(lime, np.minimum(a, np.clip((r - g + 4) / 26, 0, 1)), a)
    a = ndimage.grey_erosion(a, size=(2, 2))  # come o fio de verde das bordas
    g2 = np.where(a < .99, np.minimum(g, np.maximum(r, b)), g)
    return np.dstack([r, g2, b, a * 255]).clip(0, 255).astype(np.uint8)
