import numpy as np, sys
from PIL import Image
from scipy import ndimage
def key_green(path):
    im=np.array(Image.open(path).convert('RGB')).astype(float)
    r,g,b=im[...,0],im[...,1],im[...,2]
    gd=g-np.maximum(r,b)
    a=np.clip(1-(gd-40)/80,0,1)  # gd>120 -> transparent
    # despill
    g2=np.where(gd>0,np.maximum(r,b)+gd*0.15*a,g)
    out=np.dstack([r,np.minimum(g,g2),b,a*255]).clip(0,255).astype(np.uint8)
    return out
def key_light(path,thr=236):
    im=np.array(Image.open(path).convert('RGB')).astype(float)
    mx=im.min(axis=2); 
    a=np.clip((thr+12-mx)/24,0,1)
    return np.dstack([im,a*255]).clip(0,255).astype(np.uint8)
def comps(rgba,minpx=400,dil=3):
    m=rgba[...,3]>40
    m=ndimage.binary_closing(m,iterations=dil)
    lab,n=ndimage.label(m)
    out=[]
    for i,sl in enumerate(ndimage.find_objects(lab)):
        sz=(lab[sl]==i+1).sum()
        if sz<minpx: continue
        out.append((sl[1].start,sl[0].start,sl[1].stop,sl[0].stop,int(sz)))
    return sorted(out,key=lambda q:(q[1]//150,q[0]))
if __name__=='__main__':
    f=sys.argv[1]; mode=sys.argv[2]
    rgba=key_green(f) if mode=='g' else key_light(f)
    for c in comps(rgba): print(c)
