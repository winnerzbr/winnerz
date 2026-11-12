"""Versão leve do IAmiguinho para o site: junta vértices numa grade (sem misturar partes nem faces opostas) e grava IAM1."""
import sys,struct; sys.path.insert(0,'/home/claude/iam/src')
from load import *
G=float(sys.argv[1]) if len(sys.argv)>1 else 0.0065
d=np.load('out/full.npz'); sk=json.load(open('out/skel.json'))
V,N,C,F,W,mat=d['V'],d['N'],d['C'],d['F'],d['W'],d['mat']
grp=np.array([0,0,0,1,2,2,2,3,3,3,4,4,4,5,5,5]); part=grp[W.argmax(1)]
an=np.abs(N); ax=an.argmax(1); nb=ax*2+(N[np.arange(len(N)),ax]>0)
cell=np.floor(V/G).astype(np.int64); cell-=cell.min(0)
key=((cell[:,0]*4096+cell[:,1])*4096+cell[:,2])*64+part*8+nb
key=key*4+mat
u,inv=np.unique(key,return_inverse=True); n=len(u)
cnt=np.bincount(inv,minlength=n).astype(np.float64)
def avg(A): return np.stack([np.bincount(inv,A[:,k],n) for k in range(A.shape[1])],1)/cnt[:,None]
Vn=avg(V); Nn=avg(N); Nn/=np.maximum(np.linalg.norm(Nn,axis=1,keepdims=True),1e-9); Cn=avg(C); Wn=avg(W)
matn=(u%4).astype(np.uint8)
Fn=inv[F]; ok=(Fn[:,0]!=Fn[:,1])&(Fn[:,1]!=Fn[:,2])&(Fn[:,0]!=Fn[:,2]); Fn=Fn[ok]
Fn=np.unique(Fn[np.arange(len(Fn)),:],axis=0)
# tira duplicadas (mesmos 3 vértices em outra ordem)
s=np.sort(Fn,1); _,i=np.unique(s,axis=0,return_index=True); Fn=Fn[i]
# remove vértices sem uso
used=np.unique(Fn); remap=-np.ones(n,int); remap[used]=np.arange(len(used)); Fn=remap[Fn]
Vn,Nn,Cn,Wn,matn=Vn[used],Nn[used],Cn[used],Wn[used],matn[used]
print('vértices',len(Vn),'triângulos',len(Fn))
o=np.argsort(-Wn,1)[:,:2]; w0=Wn[np.arange(len(Wn)),o[:,0]]; w1=Wn[np.arange(len(Wn)),o[:,1]]; w0=w0/(w0+w1)
lo=Vn.min(0); hi=Vn.max(0); ctr=(lo+hi)/2; sc=float((hi-lo).max()/2)
q=np.round((Vn-ctr)/sc*32767).astype(np.int16)
nB=len(sk['names'])
buf=bytearray()
buf+=b'IAM1'+struct.pack('<III',len(Vn),len(Fn)*3,nB)+struct.pack('<4f',*ctr,sc)
buf+=np.array(sk['joints'],np.float32).tobytes()+np.array(sk['parent'],np.int8).tobytes()
while len(buf)%4: buf+=b'\0'
pv=np.zeros((len(Vn),4),np.int16); pv[:,:3]=q; buf+=pv.tobytes()
nm=np.zeros((len(Vn),4),np.int8); nm[:,:3]=np.round(Nn*127); nm[:,3]=matn; buf+=nm.tobytes()
cl=np.zeros((len(Vn),4),np.uint8); cl[:,:3]=np.clip(np.round(Cn),0,255); cl[:,3]=255; buf+=cl.tobytes()
bw=np.zeros((len(Vn),4),np.uint8); bw[:,:2]=o; bw[:,2]=np.round(w0*255); buf+=bw.tobytes()
big=len(Vn)>65535
buf+=(Fn.astype(np.uint32) if big else Fn.astype(np.uint16)).tobytes()
open('out/iamiguinho.bin','wb').write(buf); print('bytes',len(buf),'indices32',big)
np.savez('out/leve.npz',V=Vn,N=Nn,C=Cn,F=Fn,W=Wn)
import gzip; print('gz',len(gzip.compress(bytes(buf))))
