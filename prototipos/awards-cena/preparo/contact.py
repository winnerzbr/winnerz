import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components,dijkstra
from scipy.spatial import cKDTree
from PIL import Image,ImageDraw
d=np.load('zen/m0.npz');V,N,I=d['V'],d['N'],d['I'];s=np.load('zen/seg.npz');mast=s['mast'];thin=np.load('zen/w.npz')['thin']
n=len(V);e=np.concatenate([I[:,[0,1]],I[:,[1,2]],I[:,[2,0]]])
A=coo_matrix((np.ones(len(e)),(e[:,0],e[:,1])),shape=(n,n)).tocsr();A=A+A.T
cloth=thin&~mast;body=~thin&~mast
# pano que toca o corpo (não o mastro)
tb=cloth&((A@body.astype(float))>0);tm=cloth&((A@mast.astype(float))>0)
print('cloth',cloth.sum(),'toca corpo',tb.sum(),'toca mastro',tm.sum())
# componentes do pano
ke=cloth[e[:,0]]&cloth[e[:,1]];g=coo_matrix((np.ones(ke.sum()),(e[ke,0],e[ke,1])),shape=(n,n));nc,lab=connected_components(g,directed=False)
cnt=np.bincount(lab[cloth]);
for c in np.argsort(-cnt)[:8]:
    m=(lab==c)&cloth;print('comp',c,cnt[c],'bbox',V[m].min(0).round(2),V[m].max(0).round(2),'tocaM',(tm&m).sum(),'tocaB',(tb&m).sum())
# grupos de contato com o corpo
idx=np.where(tb)[0];t=cKDTree(V[idx]);pairs=t.query_pairs(.03,output_type='ndarray')
gg=coo_matrix((np.ones(len(pairs)),(pairs[:,0],pairs[:,1])),shape=(len(idx),len(idx)));k,l2=connected_components(gg,directed=False)
for c in np.argsort(-np.bincount(l2))[:14]:
    m=idx[l2==c];print('contato',len(m),'centro',V[m].mean(0).round(2),'ext',(V[m].max(0)-V[m].min(0)).round(2),'comp pano',np.bincount(lab[m]).argmax())
np.savez('zen/contact.npz',tb=tb,lab=lab,cloth=cloth)
