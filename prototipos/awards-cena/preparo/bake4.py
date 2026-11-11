import numpy as np,pickle,struct,json
from scipy.spatial import cKDTree
d=np.load('/home/claude/zen/m0.npz');V0,N0,I0=d['V'],d['N'],d['I'];w0=np.load('/home/claude/zen/w.npz')['w']
rest=pickle.load(open('/home/claude/zen/rest.pkl','rb'))
Vs=[V0];Ns=[N0];Is=[I0];Ws=[w0];Ms=[np.zeros(len(V0))];off=len(V0);t=cKDTree(V0)
for k,(v,n,i) in enumerate(rest):
    Vs.append(v);Ns.append(n);Is.append(i+off);off+=len(v)
    Ws.append(w0[t.query(v)[1]] if k==0 else np.zeros(len(v)));Ms.append(np.full(len(v),k+1))
V=np.concatenate(Vs);N=np.concatenate(Ns);I=np.concatenate(Is);W=np.concatenate(Ws);M=np.concatenate(Ms)
lo,hi=V.min(0),V.max(0);s=5.5/(hi[1]-lo[1]);c=np.array([(lo[0]+hi[0])/2,lo[1],(lo[2]+hi[2])/2])
P=(V-c)*s;print('scaled bbox',P.min(0),P.max(0),'scale',s)
cl=P[:len(V0)][w0>.3];m=cl.mean(0);hx=cl[:,[0,2]]-m[[0,2]];u,sv,vt=np.linalg.svd(hx,full_matrices=False);wd=vt[0];print('wind',wd,'cloth center',m)
# pontos de interesse
for nm,k in(('simbolo',1),('base',2),('logo',3)):
    q=P[M==k];print(nm,q.min(0).round(2),q.max(0).round(2))
h=P[:len(V0)];print('cabeca aprox',h[(h[:,1]>4.2)&(np.abs(h[:,0])<.5)].mean(0) if ((h[:,1]>4.2)&(np.abs(h[:,0])<.5)).any() else None)
R=6.0
A=np.zeros((len(P),4),'<i2');A[:,:3]=np.round(np.clip(P/R,-1,1)*32767);A[:,3]=np.round(W*32767)
B=np.zeros((len(P),4),'i1');B[:,:3]=np.round(np.clip(N,-1,1)*127);B[:,3]=M
out=struct.pack('<4sII',b'ZEN1',len(P),I.size)+A.tobytes()+B.tobytes()+I.astype('<u4').tobytes()
open('/home/claude/aw-cine/zenite.bin','wb').write(out);print('bytes',len(out))
