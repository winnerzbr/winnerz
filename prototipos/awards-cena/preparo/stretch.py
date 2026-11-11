import numpy as np,struct,sys
b=open(sys.argv[1],'rb').read();_,nv,ni=struct.unpack('<4sII',b[:12])
A=np.frombuffer(b,'<i2',nv*4,12).reshape(-1,4).astype(float)/32767;B=np.frombuffer(b,'i1',nv*4,12+nv*8).reshape(-1,4)
I=np.frombuffer(b,'<u4',ni,12+nv*12).reshape(-1,3)
P=A[:,:3]*6;w=A[:,3];N=B[:,:3]/127.;M=B[:,3]
WD=np.array([.938,0,-.346]);DD=np.array([.346,0,.938])
def disp(T):
    ph=(P@WD)*4.2-T*3.4+P[:,1]*1.3;g=.74+.26*np.sin(T*.6+P[:,1]*.4)
    fl=w*w*np.sin(ph*4.1-T*4.5)*.028;d=w*g*(np.sin(ph)*.18+np.sin(ph*2.3+1.7)*.06)+fl
    Q=P+DD*d[:,None];Q[:,1]+=w*g*np.cos(ph*.5)*.055;Q+=WD*(w*g*np.sin(ph*.5+1.))[:,None]*.03;return Q
def el(Q):
    T_=Q[I];return np.max([np.linalg.norm(T_[:,a]-T_[:,c],axis=1) for a,c in((0,1),(1,2),(2,0))],0)
e0=el(P);worst=np.zeros(len(I))
for T in np.linspace(0,20,40):worst=np.maximum(worst,el(disp(T)))
bad=(worst>e0*3)&(worst>.04)
print('tris',len(I),'esticados',bad.sum())
for k in np.argsort(-(worst-e0))[:12]:
    t=I[k];print(k,'e0 %.3f max %.3f'%(e0[k],worst[k]),'w',w[t].round(2),'pos',P[t].mean(0).round(2),'mat',M[t])
np.save('/tmp/bad.npy',np.where(bad)[0])
