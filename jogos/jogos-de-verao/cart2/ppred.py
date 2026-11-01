"""Raquete vermelha do pingue-pongue: máscara da borracha (vermelho vivo, em bloco) e do cabo de madeira em volta."""
import numpy as np
from scipy import ndimage
def raquete(a):
    r, g, b = [a[..., i].astype(int) for i in range(3)]; al = a[..., 3] > 128
    m = (r > 205) & (g < 70) & (b < 75) & al; m = ndimage.binary_opening(m, iterations=3)
    lab, n = ndimage.label(m); sz = ndimage.sum(m, lab, range(1, n + 1)); keep = [i + 1 for i in range(n) if sz[i] > 250]
    m = np.isin(lab, keep); return ndimage.binary_dilation(m, iterations=5) & al
