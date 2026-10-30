import numpy as np
from PIL import Image
from cc import key_light
from scipy import ndimage
rgba=key_light('src/blobB.png',236)
m=rgba[...,3]>128
lab,n=ndimage.label(m)
boxes={'b_frente':(145,112,433,432),'b_34':(638,104,900,434),'b_lado':(1091,107,1367,437),'b_amassa':(111,662,473,898),'b_pulo':(641,510,885,894),'b_mao':(428,257,509,345)}
for nm,(x0,y0,x1,y1) in boxes.items():
    p=8; X0,Y0,X1,Y1=x0-p,y0-p,x1+p,y1+p
    sub=lab[Y0:Y1,X0:X1]
    # componente principal = o maior dentro da caixa
    ids,cnt=np.unique(sub[sub>0],return_counts=True); lid=ids[np.argmax(cnt)]
    own=ndimage.binary_fill_holes(sub==lid)
    own=ndimage.binary_dilation(own,iterations=2)
    c=rgba[Y0:Y1,X0:X1].copy()
    a=c[...,3].astype(float)
    a=np.where(ndimage.binary_erosion(own,iterations=3),255,a)  # dentro: opaco (brilhos brancos não viram furo)
    c[...,3]=np.where(own,a,0).astype(np.uint8)
    Image.fromarray(c).save(f'out/{nm}.png'); print(nm,c.shape[1],c.shape[0])
