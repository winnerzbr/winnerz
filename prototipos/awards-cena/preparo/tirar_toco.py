# Tira o "toco" da bandeira que ficou grudado nas costas depois do corte (pedaço de pano parado que atravessava a bandeira).
import numpy as np
d=np.load('zen/m0.npz');V,N,I,th=d['V'],d['N'],d['I'],d['th'];s2=np.load('zen/seg2.npz');fs=s2['fside'];mast=s2['mast']
o=np.load('zen/m0_orig.npz');n0=len(o['V'])
c=np.load('zen/contact.npz');lab,cloth=c['lab'],c['cloth']
FL=np.bincount(lab[cloth&(o['V'][:,1]>.6)&(o['V'][:,0]<-.3)]).argmax();flag=np.zeros(len(V),bool);flag[:n0]=(lab==FL)&cloth
stub=flag&~fs&~mast;n=len(V)
def bordas(T):
    E=np.concatenate([T[:,[0,1]],T[:,[1,2]],T[:,[2,0]]]);k=np.minimum(E[:,0],E[:,1]).astype(np.int64)*n+np.maximum(E[:,0],E[:,1])
    u,ix,cn=np.unique(k,return_index=True,return_counts=True);return set(u[cn==1].tolist()),E[ix[cn==1]]
velhas,_=bordas(I)
I2=I[~stub[I].any(1)];print('triângulos tirados',len(I)-len(I2))
_,B=bordas(I2);B=np.array([q for q in B if (min(q)*n+max(q)) not in velhas])
nxt={}
for a,b in B:nxt.setdefault(a,[]).append(b)
loops=[];used=set()
for a,b in B:
    if (a,b) in used:continue
    lp=[a];cur=b;used.add((a,b));ok=True
    while cur!=a:
        lp.append(cur);c2=[z for z in nxt.get(cur,[]) if (cur,z) not in used]
        if not c2:ok=False;break
        used.add((cur,c2[0]));cur=c2[0]
    if ok and len(lp)>=3:loops.append(lp)
print('furos novos',[(len(l),round(float(np.linalg.norm(V[l].max(0)-V[l].min(0))),3)) for l in loops])
nv=[];nn=[];nt=[]
for lp in loops:
    P=V[lp];cen=P.mean(0);nr=np.zeros(3)
    for k in range(len(lp)):nr+=np.cross(P[k]-cen,P[(k+1)%len(lp)]-cen)
    nr=-nr/(np.linalg.norm(nr)+1e-12);ci=n+len(nv);nv.append(cen);nn.append(nr)
    for k in range(len(lp)):nt.append([lp[(k+1)%len(lp)],lp[k],ci])
if nv:
    V=np.concatenate([V,np.array(nv)]);N=np.concatenate([N,np.array(nn)]);I2=np.concatenate([I2,np.array(nt)])
    fs=np.concatenate([fs,np.zeros(len(nv),bool)]);mast=np.concatenate([mast,np.zeros(len(nv),bool)]);th=np.concatenate([th,np.full(len(nv),9.)])
np.savez('zen/m0.npz',V=V.astype('f4'),N=N.astype('f4'),I=I2,th=th)
np.savez('zen/seg2.npz',mast=mast,fside=fs)
