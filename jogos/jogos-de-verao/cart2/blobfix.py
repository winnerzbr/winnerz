import numpy as np, cv2
from PIL import Image
from scipy import ndimage
from skimage.morphology import disk
for nm,lim in [('b_frente',.8),('b_34',.8),('b_lado',.8),('b_amassa',.7),('b_pulo',.72)]:
    c=np.array(Image.open(f'out/{nm}.png'))
    m=c[...,3]>128
    cl=ndimage.binary_closing(np.pad(m,30),structure=disk(22))[30:-30,30:-30]
    cl=ndimage.binary_fill_holes(cl)
    H=m.shape[0]; cl[int(H*lim):]=m[int(H*lim):]
    hole=cl&~m
    if hole.sum()==0: continue
    bgr=cv2.cvtColor(c[...,:3],cv2.COLOR_RGB2BGR)
    # o que está transparente vira "sem informação" para o inpaint
    msk=(hole|(c[...,3]<200)&cl).astype(np.uint8)*255
    fix=cv2.inpaint(bgr,msk,9,cv2.INPAINT_TELEA)
    c[...,:3]=np.where(msk[...,None]>0,cv2.cvtColor(fix,cv2.COLOR_BGR2RGB),c[...,:3])
    # contorno escuro na borda nova: escurece a faixa de 4 px na borda do preenchimento
    edge=cl&~ndimage.binary_erosion(cl,iterations=4)&ndimage.binary_dilation(hole,iterations=3)
    c[...,:3]=np.where(edge[...,None],(c[...,:3]*.35+np.array([40,20,60])*.65).astype(np.uint8),c[...,:3])
    a=np.where(cl,np.maximum(c[...,3],np.where(ndimage.binary_erosion(cl,iterations=1),255,160)),c[...,3])
    c[...,3]=a.astype(np.uint8)
    Image.fromarray(c).save(f'out/{nm}.png'); print(nm,hole.sum())
