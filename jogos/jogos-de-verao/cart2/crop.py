import numpy as np
from PIL import Image
from cc import *
from scipy import ndimage
def crops(path,mode,names,dil=3,pad=6,minpx=400):
    rgba=key_green(path) if mode=='g' else key_light(path)
    m=rgba[...,3]>40; mc=ndimage.binary_closing(m,iterations=dil) if dil else m
    lab,n=ndimage.label(mc)
    objs=[]
    for i,sl in enumerate(ndimage.find_objects(lab)):
        sz=(lab[sl]==i+1).sum()
        if sz<minpx: continue
        objs.append((i+1,sl))
    objs.sort(key=lambda q:(q[1][0].start//150,q[1][1].start))
    res={}
    for (lid,sl),nm in zip(objs,names):
        if nm is None: continue
        y0,y1=max(0,sl[0].start-pad),min(rgba.shape[0],sl[0].stop+pad); x0,x1=max(0,sl[1].start-pad),min(rgba.shape[1],sl[1].stop+pad)
        c=rgba[y0:y1,x0:x1].copy()
        own=ndimage.binary_dilation(lab[y0:y1,x0:x1]==lid,iterations=pad)
        c[...,3]=np.where(own,c[...,3],0)
        Image.fromarray(c).save(f'out/{nm}.png'); res[nm]=(x0,y0,c.shape[1],c.shape[0])
    return res
if __name__=='__main__':
    print(crops('src/partsC.png','g',['cabeca','bone','tronco','helice','braco','antebraco','mao','punho','coxa','canela','sapato']))
    print(crops('src/props.png','g',['rede','placar','vb1','vb2','vb3','bp1','bp2','bp3','areia3',None,None,None,None,'areia1',None,'areia2']))
