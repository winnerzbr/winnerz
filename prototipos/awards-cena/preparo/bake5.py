# versão leve para o site: junta vértices por célula (sem misturar os dois lados do pano)
import numpy as np,pickle,struct,sys
from scipy.spatial import cKDTree
g=float(sys.argv[1]);out=sys.argv[2]
d=np.load('zen/m0.npz');V0,N0,I0=d['V'],d['N'],d['I'];w0=np.load('zen/w.npz')['w']
N0=N0/(np.linalg.norm(N0,axis=1,keepdims=True)+1e-9)
cell=np.floor(V0/g).astype(np.int64);oc=(N0[:,0]>0)*1+(N0[:,1]>0)*2+(N0[:,2]>0)*4
key=((cell[:,0]+2000)*4001+(cell[:,1]+2000))*4001+(cell[:,2]+2000);key=key*8+oc
u,inv=np.unique(key,return_inverse=True);inv=inv.ravel();n=len(u);cnt=np.bincount(inv,minlength=n)[:,None]
V=np.zeros((n,3));np.add.at(V,inv,V0);V/=cnt;N=np.zeros((n,3));np.add.at(N,inv,N0);N/=(np.linalg.norm(N,axis=1,keepdims=True)+1e-9)
W=np.zeros(n);np.add.at(W,inv,w0);W/=cnt[:,0]
I=inv[I0];ok=(I[:,0]!=I[:,1])&(I[:,1]!=I[:,2])&(I[:,0]!=I[:,2]);I=I[ok]
s=np.sort(I,axis=1);_,ix=np.unique(s,axis=0,return_index=True);I=I[np.sort(ix)]
print('mesh0',len(V0),'->',n,'tris',len(I0),'->',len(I))
rest=pickle.load(open('zen/rest.pkl','rb'))
Vs=[V];Ns=[N];Is=[I];Ws=[W];Ms=[np.zeros(n)];off=n;t=cKDTree(V0)
for k,(v,nn,i) in enumerate(rest):
    if k==0:  # símbolo: também junta (menos fino)
        c2=np.floor(v/(g*.6)).astype(np.int64);o2=(nn[:,0]>0)*1+(nn[:,1]>0)*2+(nn[:,2]>0)*4;k2=(((c2[:,0]+4000)*8001+(c2[:,1]+4000))*8001+(c2[:,2]+4000))*8+o2
        u2,iv=np.unique(k2,return_inverse=True);iv=iv.ravel();m=len(u2);c=np.bincount(iv,minlength=m)[:,None];vv=np.zeros((m,3));np.add.at(vv,iv,v);vv/=c;n2=np.zeros((m,3));np.add.at(n2,iv,nn);n2/=(np.linalg.norm(n2,axis=1,keepdims=True)+1e-9)
        ii=iv[i];okk=(ii[:,0]!=ii[:,1])&(ii[:,1]!=ii[:,2])&(ii[:,0]!=ii[:,2]);ii=ii[okk];print('simbolo',len(v),'->',m);v,nn,i=vv,n2,ii
    Vs.append(v);Ns.append(nn);Is.append(i+off);off+=len(v);Ws.append(w0[t.query(v)[1]] if k==0 else np.zeros(len(v)));Ms.append(np.full(len(v),k+1))
V=np.concatenate(Vs);N=np.concatenate(Ns);I=np.concatenate(Is);W=np.concatenate(Ws);M=np.concatenate(Ms)
lo=np.array([-0.5,-0.88,-0.36]);hi=np.array([0.59,0.95,0.28])
import json
a=np.load('zen/m0_orig.npz')['V'];allv=np.concatenate([a]+[r[0] for r in rest]);lo,hi=allv.min(0),allv.max(0)
s=5.5/(hi[1]-lo[1]);c=np.array([(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2]);P=(V-c)*s
A=np.zeros((len(P),4),'<i2');A[:,:3]=np.round(np.clip(P/6.,-1,1)*32767);A[:,3]=np.round(np.clip(W,0,1)*32767)
B=np.zeros((len(P),4),'i1');B[:,:3]=np.round(np.clip(N,-1,1)*127);B[:,3]=M
o=struct.pack('<4sII',b'ZEN1',len(P),I.size)+A.tobytes()+B.tobytes()+I.astype('<u4').tobytes()
open(out,'wb').write(o);print('bytes',len(o))
