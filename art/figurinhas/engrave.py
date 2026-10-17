"""Textura de gravura: linhas finas cuja espessura segue o tom (mais grossas na sombra, somem na luz)."""
import sys, numpy as np
from PIL import Image, ImageFilter
src, out, period, alpha = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(np.float32)/255
H,W,_ = a.shape
L = 0.2126*a[...,0]+0.7152*a[...,1]+0.0722*a[...,2]
Lb = np.asarray(Image.fromarray((L*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))).astype(np.float32)/255
# tom relativo: realça as linhas nos meios-tons
dark = np.clip(1-Lb*1.6,0,1)**0.9
yy,xx = np.mgrid[0:H,0:W].astype(np.float32)
wave = 1.1*np.sin(xx/53.0)+0.5*np.sin(xx/23.0+yy/90.0)
def lines(coord, p, d):
    ph = np.mod(coord, p); dist = np.abs(ph - p/2); half = d*p/2
    return np.clip((half - dist)/0.8 + 0.5, 0, 1) * np.clip(half/0.6, 0, 1)
ink = np.clip(lines(yy+wave, period, dark*0.9) + lines((xx-yy)*0.7071, period*1.1, np.clip((dark-0.78)/0.22,0,1)*0.6),0,1)
# clarear os espaços entre linhas para compensar
lift = a + (1-a)*0.10*dark[...,None]
o = lift*(1-alpha*ink[...,None]) + np.array([0.02,0.02,0.04])*alpha*ink[...,None]
Image.fromarray((np.clip(o,0,1)*255).astype(np.uint8)).save(out)
