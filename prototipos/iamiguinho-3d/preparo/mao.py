import sys; sys.path.insert(0,'/home/claude/iam/src')
from load import *
d=np.load('out/full.npz'); sk=json.load(open('out/skel.json'))
V,N,C,W=d['V'],d['N'],d['C'],d['W']
i=sk['names'].index('maoE'); m=W[:,i]>0.5; P=V[m]
wr=np.array(sk['joints'][i]); print('n',m.sum(),'punho',wr)
c=P.mean(0); u,s,vt=np.linalg.svd(P-c,full_matrices=False); print(s.round(2)); print(vt.round(3))
ax=vt[0]*np.sign(vt[0]@(c-wr)); la=vt[1]; no=vt[2]
Q=np.c_[(P-wr)@ax,(P-wr)@la,(P-wr)@no]; print(Q.min(0).round(3),Q.max(0).round(3))
np.savez('out/mao.npz',ax=ax,la=la,no=no,wr=wr)
S=900; img=np.full((S,S,3),30,np.uint8)
x=((Q[:,1]+0.12)/0.24*S).astype(int).clip(0,S-1); y=(S-1-(Q[:,0]+0.02)/0.24*S).astype(int).clip(0,S-1)
col=(np.clip((Q[:,2]+0.03)/0.06,0,1)[:,None]*np.array([255,120,0])+ (1-np.clip((Q[:,2]+0.03)/0.06,0,1))[:,None]*np.array([0,120,255])).astype(np.uint8)
img[y,x]=col
for t in np.arange(0,0.22,0.02):
    yy=int(S-1-(t+0.02)/0.24*S); img[yy,::8]=90
Image.fromarray(img).save('out/mao.png')
