import numpy as np
from scipy.sparse import coo_matrix,csr_matrix
from scipy.sparse.csgraph import connected_components,dijkstra,maximum_flow,breadth_first_order
from scipy.spatial import cKDTree
d=np.load('zen/m0_orig.npz');V,N,I,th=d['V'].copy(),d['N'].copy(),d['I'],d['th'];s=np.load('zen/seg.npz');mast=s['mast'];c=np.load('zen/contact.npz');tb,lab,cloth=c['tb'],c['lab'],c['cloth']
n=len(V);FL=np.bincount(lab[cloth&(V[:,1]>.6)&(V[:,0]<-.3)]).argmax();flag=(lab==FL)&cloth
C=tb&flag&(V[:,0]>-.2);cc=V[C]
e=np.concatenate([I[:,[0,1]],I[:,[1,2]],I[:,[2,0]]]);ln=np.linalg.norm(V[e[:,0]]-V[e[:,1]],axis=1)
ke=flag[e[:,0]]&flag[e[:,1]];G=coo_matrix((ln[ke],(e[ke,0],e[ke,1])),shape=(n,n)).tocsr()
geo=dijkstra(G,directed=False,indices=np.where(C)[0],min_only=True)
dC=cKDTree(cc).query(V)[0]
src=flag&(geo>.09);hem=(V[:,0]<-.25)&(V[:,1]>.5)
snk=(~cloth)&(~mast)&(~hem)&(dC>.1)
print('src',src.sum(),'snk',snk.sum())
ok=~mast[e[:,0]]&~mast[e[:,1]];a,b=e[ok,0],e[ok,1]
S,T=n,n+1;BIG=10**6
r=np.concatenate([a,b,np.full(src.sum(),S),np.where(snk)[0]]);cidx=np.concatenate([b,a,np.where(src)[0],np.full(snk.sum(),T)])
cap=np.concatenate([np.ones(2*len(a),np.int32),np.full(src.sum()+snk.sum(),BIG,np.int32)])
M=coo_matrix((cap,(r,cidx)),shape=(n+2,n+2)).tocsr();M.data=np.minimum(M.data,BIG).astype(np.int32);M.data[M.data<BIG]=1
res=maximum_flow(M,S,T);print('corte mínimo (arestas)',res.flow_value)
R=M-res.flow;R.data=np.maximum(R.data,0);R.eliminate_zeros()
order=breadth_first_order(R,S,directed=True,return_predecessors=False);side=np.zeros(n+2,bool);side[order]=True;side=side[:n]
print('lado da bandeira',side.sum())
tri=side[I];mixed=tri.any(1)&~tri.all(1)
# não corta junto ao mastro
mixed&=~mast[I].any(1)
print('triângulos cortados',mixed.sum());I2=I[~mixed]
E=np.concatenate([I2[:,[0,1]],I2[:,[1,2]],I2[:,[2,0]]]);key=np.minimum(E[:,0],E[:,1]).astype(np.int64)*n+np.maximum(E[:,0],E[:,1]);u,ix,cn=np.unique(key,return_index=True,return_counts=True)
E0=np.concatenate([I[:,[0,1]],I[:,[1,2]],I[:,[2,0]]]);k0=np.minimum(E0[:,0],E0[:,1]).astype(np.int64)*n+np.maximum(E0[:,0],E0[:,1]);u0,c0=np.unique(k0,return_counts=True);old=set(u0[c0==1].tolist());print('bordas que já existiam no modelo',len(old))
B=E[ix[cn==1]];B=np.array([q for q in B if (min(q)*n+max(q)) not in old]);nxt={}
for x,y in B:nxt.setdefault(x,[]).append(y)
loops=[];used=set()
for x,y in B:
    if (x,y) in used:continue
    lp=[x];cur=y;used.add((x,y));good=True
    while cur!=x:
        lp.append(cur);c2=[z for z in nxt.get(cur,[]) if (cur,z) not in used]
        if not c2:good=False;break
        used.add((cur,c2[0]));cur=c2[0]
    if good and len(lp)>=3:loops.append(lp)
print('furos',[(len(l),round(float(np.linalg.norm(V[l].max(0)-V[l].min(0))),3)) for l in loops])
nv=[];nn=[];nt=[];fsx=[]
for lp in loops:
    P=V[lp];cen=P.mean(0);nr=np.zeros(3)
    for k in range(len(lp)):nr+=np.cross(P[k]-cen,P[(k+1)%len(lp)]-cen)
    nr=-nr/(np.linalg.norm(nr)+1e-12);ci=n+len(nv);nv.append(cen);nn.append(nr);fsx.append(side[lp[0]])
    for k in range(len(lp)):nt.append([lp[(k+1)%len(lp)],lp[k],ci])
V2=np.concatenate([V,np.array(nv)]);N2=np.concatenate([N,np.array(nn)]);I3=np.concatenate([I2,np.array(nt)]);fs=np.concatenate([side,np.array(fsx,bool)])
# normais da borda: suaviza com a tampa
tbod=cKDTree(V[snk]);out=N[snk][tbod.query(cc)[1]].mean(0);out/=np.linalg.norm(out);print('para fora do corpo',out.round(2))
dist=cKDTree(cc).query(V2)[0];f=np.clip(1-dist/.16,0,1);f=f*f*(3-2*f);V2[fs]+=out*(.02*f[fs])[:,None]
np.savez('zen/m0.npz',V=V2.astype('f4'),N=N2.astype('f4'),I=I3,th=np.concatenate([th,np.full(len(nv),9.)]))
np.savez('zen/seg2.npz',mast=np.concatenate([mast,np.zeros(len(nv),bool)]),fside=fs)
print('ok',len(V2),len(I3))
