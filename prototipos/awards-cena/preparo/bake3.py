import numpy as np
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix
from PIL import Image
d=np.load('/home/claude/zen/m0.npz');V,N,I=d['V'],d['N'],d['I'];s=np.load('/home/claude/zen/seg2.npz');mast=s['mast']
n=len(V)
T=V[I];fn=np.cross(T[:,1]-T[:,0],T[:,2]-T[:,0]);ar=np.linalg.norm(fn,axis=1)/2;fn/=(2*ar[:,None]+1e-12)
print('area',ar.sum(),'edge len pct',np.percentile(np.linalg.norm(T[:,1]-T[:,0],axis=1),[50,90,99,99.9,100]))
# amostras na superfície (~espaçamento .003)
rng=np.random.default_rng(1);cnt=np.maximum(1,np.round(ar/(.003**2)).astype(int));cnt=np.minimum(cnt,4000)
ti=np.repeat(np.arange(len(I)),cnt);u=rng.random(len(ti));v=rng.random(len(ti));f=u+v>1;u[f]=1-u[f];v[f]=1-v[f]
SP=T[ti,0]+(T[ti,1]-T[ti,0])*u[:,None]+(T[ti,2]-T[ti,0])*v[:,None];SN=fn[ti];print('samples',len(SP))
t=cKDTree(SP);th=np.full(n,9.)
for st in np.arange(.004,.05,.002):
    dd,k=t.query(V-N*st,distance_upper_bound=.0035);ok=(dd<.0035)&(th>8);k2=np.where(ok,k,0)
    th[ok&((SN[k2]*N).sum(1)<-.3)]=st
thin=(th<=.022)&~mast
# filtro de maioria na malha
e=np.concatenate([I[:,[0,1]],I[:,[1,2]],I[:,[2,0]]]);A=coo_matrix((np.ones(len(e)),(e[:,0],e[:,1])),shape=(n,n)).tocsr();A=A+A.T;deg=np.asarray(A.sum(1)).ravel()+1e-9
x=thin.astype(float)
for _ in range(6):x=(A@x)/deg
thin=x>.5
from scipy.sparse.csgraph import dijkstra
ln=np.linalg.norm(V[e[:,0]]-V[e[:,1]],axis=1)
GA=coo_matrix((ln,(e[:,0],e[:,1])),shape=(n,n)).tocsr()
dth=dijkstra(GA,directed=False,indices=np.where(thin)[0],min_only=True,limit=.05)
thin=((dth<.03)|s['fside'])&~mast
solid=~thin
ke=(~solid)[e[:,0]]&(~solid)[e[:,1]];ln=np.linalg.norm(V[e[:,0]]-V[e[:,1]],axis=1)
G=coo_matrix((ln[ke],(e[ke,0],e[ke,1])),shape=(n,n)).tocsr()
src=np.where((~solid)&((A@solid.astype(float))>0))[0];print('src',len(src))
geo=dijkstra(G,directed=False,indices=src,min_only=True);geo[~np.isfinite(geo)]=0
print('geo pct',np.percentile(geo[~solid],[50,90,99,100]))
w=np.clip((geo-.04)/(.75-.04),0,1);w=w*w*(3-2*w);w[solid]=0
for _ in range(10):w=.5*w+.5*(A@w)/deg
w[mast]=0
print('thin',thin.mean(),'w>0.05',(w>.05).mean(),'w max',w.max())
# tamanho dos triângulos no pano
wm=w[I].max(1);el=np.max([np.linalg.norm(T[:,a]-T[:,b],axis=1) for a,b in((0,1),(1,2),(2,0))],0)
print('cloth tris',(wm>.02).sum(),'edge pct',np.percentile(el[wm>.02],[50,90,99,100]))
np.savez('/home/claude/zen/w.npz',w=w,thin=thin)
def render(ang):
    ca,sa=np.cos(ang),np.sin(ang);R=np.array([[ca,0,sa],[0,1,0],[-sa,0,ca]]);pv=SP@R.T;S=800
    sc=(S-40)/1.6;x=(pv[:,0]*sc+S/2).astype(int);y=(S/2-(pv[:,1]-.15)*sc).astype(int);o=np.argsort(pv[:,2])
    sh=.3+.7*np.clip((SN@R.T)@np.array([.3,.5,.8]),0,1)
    ws=(w[I[ti,0]]*(1-u-v)+w[I[ti,1]]*u+w[I[ti,2]]*v);col=np.stack([.5+.5*ws,.5-.3*ws,.5-.4*ws],1)*sh[:,None]
    img=np.zeros((S,S,3));img[np.clip(y[o],0,S-1),np.clip(x[o],0,S-1)]=col[o];return img
W=np.concatenate([render(0),render(np.pi)],1);Image.fromarray((W*255).astype('uint8')).save('/home/claude/zen/w.png')
