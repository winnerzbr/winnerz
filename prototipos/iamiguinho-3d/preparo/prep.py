"""IAmiguinho 3D: conserta a aba do boné, separa os pés, nivela a hélice e calcula os ossos e pesos.
Saída: out/full.npz (malha completa com cores por vértice, ossos e pesos)."""
import sys; sys.path.insert(0,'/home/claude/iam/src')
from load import *
from scipy.spatial import cKDTree
V,N,UV,F,imgs,j=load(); C=np.load('out/C.npy').astype(np.float32)
inv=np.load('out/inv.npy')
r,g,b=C[:,0],C[:,1],C[:,2]

# 1) aba do boné: partes brancas viradas para baixo, cercadas de laranja -> laranja
zone=(V[:,1]>0.66)&(V[:,1]<0.88)&(V[:,2]>0.02)
orange=(r>200)&(g>40)&(g<140)&(b<80)
palido=(r>150)&(g>140)&(b>120)          # branco e tons claros de transição
down=N[:,1]<-0.15
okz=zone&palido&down&(V[:,2]>0.06)&(np.abs(V[:,0])<0.196)
cand=np.where(okz)[0]
painted=np.zeros(len(V),bool); src=zone&orange
for it in range(6):
    t=cKDTree(V[src|painted]); d,_=t.query(V[cand]); new=cand[d<0.009]
    if painted[new].all(): break
    painted[new]=True
pint=np.where(painted)[0]
ABA=np.array([247,72,1],np.float32)
print('pintados na aba',len(pint))
C[pint]=ABA
np.save('out/pint.npy',pint)

# 2) hélice: nivelar (o disco veio inclinado) em volta do pino
PIV=np.array([0,0.892,-0.049],np.float32)
prop=V[:,1]>0.892
P=V[V[:,1]>0.905]; ax=np.linalg.svd(P-P.mean(0),full_matrices=False)[2][2]; ax*=np.sign(ax[1])
ang=np.arctan2(ax[2],ax[1]); ca,sa=np.cos(ang),np.sin(ang)   # gira em x para levar o eixo a +y
R=np.array([[1,0,0],[0,ca,sa],[0,-sa,ca]],np.float32)
V[prop]=(V[prop]-PIV)@R.T+PIV; N[prop]=N[prop]@R.T
P=V[V[:,1]>0.905]; print('eixo depois',np.linalg.svd(P-P.mean(0),full_matrices=False)[2][2].round(3),'ang',np.degrees(ang).round(1))

# 3) separar os pés
zf=(V[:,1]<0.125)&(np.abs(V[:,0])<0.2)
side=np.sign(V[:,0]); side[side==0]=1
fz=zf[F].all(1); sF=side[F]
cross=fz&((sF.max(1)>0)&(sF.min(1)<0))
print('faces cortadas',cross.sum())
bv=np.unique(F[cross])
F=F[~cross]
EPS=0.0012
V[bv,0]=side[bv]*EPS
# bordas abertas (em vértices soldados) perto do corte -> tampa em leque
Fw=inv[F]
e=np.r_[Fw[:,[0,1]],Fw[:,[1,2]],Fw[:,[2,0]]]; eo=np.r_[F[:,[0,1]],F[:,[1,2]],F[:,[2,0]]]
es=np.sort(e,1); u,idx,cnt=np.unique(es,axis=0,return_index=True,return_counts=True)
bd=idx[cnt==1]; be=eo[bd]
nearcut=(np.abs(V[be[:,0],0])<0.004)&(np.abs(V[be[:,1],0])<0.004)&(V[be[:,0],1]<0.13)
be=be[nearcut]; print('arestas de borda',len(be))
newV=[];newN=[];newC=[];newF=[]
for s in (1,-1):
    k=side[be[:,0]]==s; e2=be[k]
    if not len(e2): continue
    ring=np.unique(e2); ctr=V[ring].mean(0); ctr[0]=s*EPS
    ci=len(V)+len(newV); newV.append(ctr); newN.append([-s,0,0]); newC.append(np.median(C[ring],0))
    # orientação: normal da tampa aponta para -s (para dentro, entre os pés)
    a,b_=V[e2[:,0]],V[e2[:,1]]
    nx=np.cross(a-ctr,b_-ctr)[:,0]
    flip=(nx*(-s))<0
    f=np.c_[e2[:,0],e2[:,1],np.full(len(e2),ci)]; f[flip]=f[flip][:,[1,0,2]]
    newF.append(f)
nv0=len(V)
V=np.r_[V,np.array(newV,np.float32)]; N=np.r_[N,np.array(newN,np.float32)]; C=np.r_[C,np.array(newC,np.float32)]; F=np.r_[F,np.concatenate(newF)]
UV=np.r_[UV,np.zeros((len(newV),2),np.float32)]
side=np.sign(V[:,0]); side[side==0]=1
# afasta as pernas (mais embaixo, nada no quadril)
leg=((V[:,1]<0.30)&(np.abs(V[:,0])<0.125))|((V[:,1]<0.165)&(np.abs(V[:,0])<0.2))
def ss(a,b,x): t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
GAP=0.014
V[leg,0]+=side[leg]*GAP*(1-ss(0.13,0.29,V[leg,1]))

# 4) ossos
Z=-0.048
SH=np.array([0.085,0.425,-0.045]); AD=np.array([0.59,-0.77,0.24]); AD/=np.linalg.norm(AD)
J={ 'quadril':[0,0.31,Z],'peito':[0,0.37,Z],'cabeca':[0,0.49,Z],'helice':PIV.tolist() }
for s,nm in ((1,'E'),(-1,'D')):
    sh=SH*[s,1,1]; ad=AD*[s,1,1]
    J['braco'+nm]=sh.tolist(); J['ante'+nm]=(sh+ad*0.07).tolist(); J['mao'+nm]=(sh+ad*0.14).tolist()
    J['coxa'+nm]=[s*0.050,0.285,-0.054]; J['canela'+nm]=[s*(0.060+GAP*0.6),0.215,-0.055]; J['pe'+nm]=[s*(0.066+GAP),0.145,-0.056]
NAMES=['quadril','peito','cabeca','helice','bracoE','anteE','maoE','bracoD','anteD','maoD','coxaE','canelaE','peE','coxaD','canelaD','peD']
PARENT=[-1,0,1,2,1,4,5,1,7,8,0,10,11,0,13,14]
nb=len(NAMES); W=np.zeros((len(V),nb),np.float32)
y=V[:,1]; x=V[:,0]
propm=np.r_[prop,np.zeros(len(newV),bool)]
# tronco/cabeça por altura
wh=ss(0.465,0.505,y); wc=ss(0.315,0.365,y)*(1-wh)
W[:,2]=wh; W[:,1]=wc; W[:,0]=1-wh-wc
# pernas
for s,nm in ((1,'E'),(-1,'D')):
    m=leg&(side==s)
    i0=NAMES.index('coxa'+nm)
    wl=1-ss(0.265,0.305,y)            # perna x quadril
    wk=1-ss(0.195,0.235,y)            # canela x coxa
    wf=1-ss(0.135,0.165,y)            # pé x canela
    foot=wf; shin=wk*(1-wf); thigh=(1-wk)
    for i,w in ((i0,thigh),(i0+1,shin),(i0+2,foot)):
        W[m,i]=(w*wl)[m]
    W[m,0]=(1-wl)[m]; W[m,1]=0; W[m,2]=0
# braços
for s,nm in ((1,'E'),(-1,'D')):
    sh=SH*[s,1,1]; ad=AD*[s,1,1]
    d=V-sh; t=d@ad; perp=np.linalg.norm(d-np.outer(t,ad),axis=1)
    rad=np.interp(t,[0.045,0.1,0.125],[0.036,0.075,0.16])
    inarm=ss(-0.012,0.03,t)*(1-ss(rad,rad+0.012,perp))*(side==s)*(y<0.47)*(~leg)*ss(0.082,0.1,np.abs(x))
    i0=NAMES.index('braco'+nm)
    we=ss(0.055,0.09,t); ww=ss(0.125,0.15,t)
    up=(1-we); fo=we*(1-ww); ha=ww
    W*= (1-inarm)[:,None]
    W[:,i0]+=inarm*up; W[:,i0+1]+=inarm*fo; W[:,i0+2]+=inarm*ha
# hélice
W[propm]=0; W[propm,3]=1
W/=W.sum(1,keepdims=True)
# material: 0 normal, 1 visor, 2 luz (anéis ciano)
r,g,b=C[:,0],C[:,1],C[:,2]
mat=np.zeros(len(V),np.uint8)
mat[(y>0.5)&(y<0.72)&(V[:,2]>0.08)&(r<45)&(g<55)&(b<115)&(np.abs(x)<0.2)]=1
mat[(g>170)&(b>190)&(r<110)&(y>0.5)]=2
np.savez('out/full.npz',V=V,N=N,C=C,F=F,W=W,mat=mat,UV=UV,nv0=nv0)
json.dump({'names':NAMES,'parent':PARENT,'joints':[J[n] for n in NAMES]},open('out/skel.json','w'))
print('ok',V.shape,F.shape)
