import sys; sys.path.insert(0,'/home/claude/iam/src')
from load import *
def rx(a): c,s=np.cos(a),np.sin(a); return np.array([[1,0,0],[0,c,-s],[0,s,c]])
def ry(a): c,s=np.cos(a),np.sin(a); return np.array([[c,0,s],[0,1,0],[-s,0,c]])
def rz(a): c,s=np.cos(a),np.sin(a); return np.array([[c,-s,0],[s,c,0],[0,0,1]])
def mats(sk,rot):
    J=np.array(sk['joints']); n=len(J); M=[None]*n
    for i in range(n):
        R=rot.get(sk['names'][i],np.eye(3)); L=np.eye(4); L[:3,:3]=R; L[:3,3]=J[i]-R@J[i]
        p=sk['parent'][i]; M[i]=L if p<0 else M[p]@L
    return np.array(M)
def skin(V,N,W,M):
    Vh=np.c_[V,np.ones(len(V))]; out=np.zeros((len(V),3)); on=np.zeros((len(V),3))
    for i in range(len(M)):
        w=W[:,i:i+1]
        if not w.any(): continue
        out+=w*(Vh@M[i].T)[:,:3]; on+=w*(N@M[i][:3,:3].T)
    return out,on
if __name__=='__main__':
    d=np.load('out/full.npz'); sk=json.load(open('out/skel.json'))
    V,N,C,W=d['V'],d['N'],d['C'],d['W']
    pal=np.array([[200,200,200],[120,120,120],[250,220,150],[255,0,255],[255,0,0],[255,150,0],[255,255,0],[0,0,255],[0,150,255],[0,255,255],[0,160,0],[0,255,0],[160,255,160],[120,0,160],[200,0,255],[255,160,255]],float)
    Cw=W@pal
    A=Image.new('RGB',(2800,700))
    A.paste(render2(V,N,Cw,0,0),(0,0)); A.paste(render2(V,N,Cw,np.pi/2,0),(700,0))
    rot={'bracoE':rz(2.2),'anteE':rz(0.6),'maoE':rz(0.3),'bracoD':rx(-1.2),'anteD':rx(-0.8),'coxaE':rx(-0.9),'canelaE':rx(1.0),'coxaD':rx(0.5),'peD':rx(0.4),'cabeca':rz(0.2)@ry(0.3),'helice':ry(0.8),'peito':rz(0.1)}
    P,Pn=skin(V,N,W,mats(sk,rot))
    lo=np.array([-0.5,-0.05]);hi=np.array([0.5,1.1])
    A.paste(render2(P,Pn,C,0.3,0.1,lo=lo,hi=hi),(1400,0)); A.paste(render2(P,Pn,C,-1.2,0.1,lo=lo,hi=hi),(2100,0))
    A.save('out/pose.jpg',quality=88)
    m=(V[:,1]>0.68)&(V[:,1]<0.9); B=Image.new('RGB',(1800,900))
    B.paste(render2(V[m],N[m],C[m],0,-1.1,900,shade=False),(0,0))
    m=(V[:,1]<0.2)&(np.abs(V[:,0])<0.2); B.paste(render2(V[m],N[m],C[m],0,-0.9,900),(900,0)); B.save('out/fix.jpg',quality=88)
