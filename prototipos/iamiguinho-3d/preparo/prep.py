"""IAmiguinho 3D: conserta a aba do boné, separa os pés, nivela a hélice e calcula os ossos e pesos.
Saída: out/full.npz (malha completa com cores por vértice, ossos e pesos)."""
import sys; sys.path.insert(0,'/home/claude/iam/src')
from load import *
from scipy.spatial import cKDTree
V,N,UV,F,imgs,j=load(); C=np.load('out/C.npy').astype(np.float32)
inv=np.load('out/inv.npy')
# 0) pontinhos pretos: vértices que caem numa emenda da textura pegam preto; recebem a cor dos vizinhos
bad=C.sum(1)<48
for it in range(6):
    if not bad.any(): break
    acc_=np.zeros((len(V),3)); cnt_=np.zeros(len(V))
    for a_,b_ in ((0,1),(1,2),(2,0),(1,0),(2,1),(0,2)):
        src=F[:,a_]; dst=F[:,b_]; k=bad[dst]&~bad[src]
        np.add.at(acc_,dst[k],C[src[k]]); np.add.at(cnt_,dst[k],1)
    fix=bad&(cnt_>0); C[fix]=(acc_[fix]/cnt_[fix,None]).astype(np.float32); bad&=~fix
# e os pontos escuros no meio de uma área clara (sobra da mesma emenda): duas passadas, comparando com os vizinhos
for it in range(2):
    acc_=np.zeros((len(V),3)); cnt_=np.zeros(len(V))
    for a_,b_ in ((0,1),(1,2),(2,0),(1,0),(2,1),(0,2)):
        np.add.at(acc_,F[:,b_],C[F[:,a_]]); np.add.at(cnt_,F[:,b_],1)
    Cn=acc_/np.maximum(cnt_,1)[:,None]; lum=C@[0.3,0.59,0.11]; ln=Cn@[0.3,0.59,0.11]
    esc=(lum<0.72*ln)&(ln>110)&(cnt_>0)
    C[esc]=Cn[esc].astype(np.float32)
    print('escuros corrigidos',int(esc.sum()))
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
newV=[];newN=[];newC=[];newF=[];rings=[]
for s in (1,-1):
    k=side[be[:,0]]==s; e2=be[k]
    if not len(e2): continue
    ring=np.unique(e2); rings.append(ring); ctr=V[ring].mean(0); ctr[0]=s*EPS
    ci=len(V)+len(newV); newV.append(ctr); newN.append([-s,0,0]); newC.append(np.median(C[ring],0))
    # orientação: normal da tampa aponta para -s (para dentro, entre os pés)
    a,b_=V[e2[:,0]],V[e2[:,1]]
    nx=np.cross(a-ctr,b_-ctr)[:,0]
    flip=(nx*(-s))<0
    f=np.c_[e2[:,0],e2[:,1],np.full(len(e2),ci)]; f[flip]=f[flip][:,[1,0,2]]
    newF.append(f)
nv0=len(V)
V=np.r_[V,np.array(newV,np.float32)]; N=np.r_[N,np.array(newN,np.float32)]; C=np.r_[C,np.array(newC,np.float32)]; F=np.r_[F,np.concatenate(newF)]
UV=np.r_[UV,UV[[e2r[0] for e2r in rings]]]
side=np.sign(V[:,0]); side[side==0]=1
# afasta as pernas (mais embaixo, nada no quadril)
leg=((V[:,1]<0.30)&(np.abs(V[:,0])<0.125))|((V[:,1]<0.165)&(np.abs(V[:,0])<0.2))
def ss(a,b,x): t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
GAP=0.014
V[leg,0]+=side[leg]*GAP*(1-ss(0.13,0.29,V[leg,1]))

# 4) ossos
Z=-0.048
SH=np.array([0.076,0.452,-0.047]); AD=np.array([0.59,-0.77,0.24]); AD/=np.linalg.norm(AD)
J={ 'quadril':[0,0.31,Z],'peito':[0,0.37,Z],'cabeca':[0,0.49,Z],'helice':PIV.tolist() }
for s,nm in ((1,'E'),(-1,'D')):
    sh=SH*[s,1,1]; ad=AD*[s,1,1]
    J['braco'+nm]=sh.tolist(); J['ante'+nm]=(sh+ad*0.098).tolist(); J['mao'+nm]=(sh+ad*0.168).tolist()
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
    rad=np.interp(t,[0.072,0.128,0.153],[0.038,0.075,0.16])
    # braço = o que sai para fora do "ovo" do tronco (raio medido por altura); a emenda mistura os dois
    Rt=np.interp(y,[0.30,0.32,0.34,0.36,0.40,0.42,0.44,0.46,0.49],[0.055,0.068,0.078,0.081,0.077,0.072,0.064,0.054,0.04])
    e=np.sqrt((x/(1.12*Rt))**2+((V[:,2]+0.047)/Rt)**2)
    inarm=ss(0.98,1.2,e)*(side==s)*(1-ss(0.462,0.478,y))*(~leg)*(np.abs(x)>0.05)*(t>-0.06)*(1-ss(0.05,0.065,perp)*(t<0.04))
    i0=NAMES.index('braco'+nm)
    we=ss(0.083,0.118,t); ww=ss(0.153,0.178,t)
    up=(1-we); fo=we*(1-ww); ha=ww
    W*= (1-inarm)[:,None]
    W[:,i0]+=inarm*up; W[:,i0+1]+=inarm*fo; W[:,i0+2]+=inarm*ha
# dedos: os quatro dedos juntos em dois ossos (base e meio) e o polegar, em cada mão
MA=np.load('out/mao.npz'); AXh,LAh,NOh=MA['ax'],MA['la'],MA['no']
NAMES+=['dedosE','dedos2E','polegarE','dedosD','dedos2D','polegarD']
PARENT+=[6,16,6,9,19,9]
W=np.c_[W,np.zeros((len(V),6),np.float32)]
for s_,nm,ih in ((1,'E',6),(-1,'D',9)):
    wr=np.array(J['mao'+nm]); axh=AXh*[s_,1,1]; lah=LAh*[s_,1,1]
    q=V-wr; t=q@axh; l=q@lah
    th_dir=np.array([0.40,0.92]); ts=(t-0.052)*th_dir[0]+(l-0.045)*th_dir[1]; tp=-(t-0.052)*th_dir[1]+(l-0.045)*th_dir[0]
    isth=ss(0.006,0.03,ts)*(np.abs(tp)<0.032)*(l>0.048)
    wA=ss(0.088,0.116,t)*(1-(isth>0)); wB=ss(0.132,0.152,t)*(wA>0)
    base=W[:,ih].copy(); i0=NAMES.index('dedos'+nm)
    W[:,i0]=base*wA*(1-wB); W[:,i0+1]=base*wA*wB; W[:,i0+2]=base*isth; W[:,ih]=base*(1-wA)*(1-isth)
    J['dedos'+nm]=(wr+axh*0.102+lah*0.004).tolist(); J['dedos2'+nm]=(wr+axh*0.142+lah*0.004).tolist(); J['polegar'+nm]=(wr+axh*0.055+lah*0.05).tolist()
nb=len(NAMES)
# hélice
W[propm]=0; W[propm,3]=1
W/=W.sum(1,keepdims=True)
# material: 0 normal, 1 visor, 2 luz (anéis ciano)
r,g,b=C[:,0],C[:,1],C[:,2]
mat=np.zeros(len(V),np.uint8)
mat[(y>0.5)&(y<0.72)&(V[:,2]>0.08)&(r<45)&(g<55)&(b<115)&(np.abs(x)<0.2)]=1
mat[(g>170)&(b>190)&(r<110)&(y>0.5)]=2
np.savez('out/full.npz',V=V,N=N,C=C,F=F,W=W,mat=mat,UV=UV,nv0=nv0)
json.dump({'names':NAMES,'parent':PARENT,'joints':[J[n] for n in NAMES],'mao':{'ax':AXh.tolist(),'la':LAh.tolist(),'no':NOh.tolist()}},open('out/skel.json','w'))
print('ok',V.shape,F.shape)
