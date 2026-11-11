import numpy as np
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix,csr_matrix
from scipy.sparse.csgraph import connected_components,dijkstra
from PIL import Image
d=np.load('/home/claude/zen/m0.npz');V,N,I,th=d['V'],d['N'],d['I'],d['th']
n=len(V)
# eixo do mastro: pontas
top=V[(V[:,1]>.9)&(V[:,0]<-.3)].mean(0)
lowc=V[(np.abs(V[:,1]+.25)<.02)&(V[:,0]<-.25)&(V[:,0]>-.4)]
print('top',top,'low n',len(lowc),lowc.mean(0),lowc.std(0))
low=lowc.mean(0);ax=(top-low);ax/=np.linalg.norm(ax)
rel=V-low;tpar=rel@ax;perp=np.linalg.norm(rel-np.outer(tpar,ax),axis=1)
mast=perp<.028
print('mast',mast.sum())
thin=(th<=.017)&~mast
e=np.concatenate([I[:,[0,1]],I[:,[1,2]],I[:,[2,0]]])
ke=thin[e[:,0]]&thin[e[:,1]]
g=coo_matrix((np.ones(ke.sum()),(e[ke,0],e[ke,1])),shape=(n,n))
nc,lab=connected_components(g,directed=False)
seed=thin&(perp<.06)&(V[:,1]>.6)
print('seed',seed.sum(),'labels of seed',np.bincount(lab[seed]).argsort()[-3:],np.sort(np.bincount(lab[seed]))[-3:])
L=np.bincount(lab[seed]).argmax();flag=lab==L
print('flag verts',flag.sum(),V[flag].min(0),V[flag].max(0))
np.savez('/home/claude/zen/seg.npz',flag=flag,mast=mast,thin=thin,perp=perp,low=low,ax=ax)
# vis
def render(ang,name,col):
    ca,sa=np.cos(ang),np.sin(ang);R=np.array([[ca,0,sa],[0,1,0],[-sa,0,ca]]);v=V@R.T;S=800
    sc=(S-40)/1.6;x=(v[:,0]*sc+S/2).astype(int);y=(S/2-(v[:,1]-.15)*sc).astype(int);o=np.argsort(v[:,2])
    sh=.3+.7*np.clip((N@R.T)@np.array([.3,.5,.8]),0,1);img=np.zeros((S,S,3))
    for dx in(0,1):
        for dy in(0,1):img[np.clip(y[o]+dy,0,S-1),np.clip(x[o]+dx,0,S-1)]=(col*sh[:,None])[o]
    return img
col=np.tile([.5,.5,.5],(n,1));col[thin]=[.2,.5,1];col[flag]=[1,.3,.2];col[mast]=[.2,1,.3]
W=np.concatenate([render(0,'f',col),render(np.pi,'b',col)],1);Image.fromarray((W*255).astype('uint8')).save('/home/claude/zen/seg.png')
