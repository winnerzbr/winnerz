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

# 3b) soltar os braços do tronco: no modelo o começo do braço vem fundido na lateral do corpo (do pescoço até
#     quase o cotovelo). Corta na linha em que o tubo do braço encontra o "ovo" do tronco e fecha os dois lados:
#     o tronco com um remendo curvo no formato do ovo e o braço com a metade do tubo que faltava.
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components,maximum_flow,breadth_first_order
inv=np.r_[inv,inv.max()+1+np.arange(len(V)-len(inv))]
import os; LIM=float(os.environ.get('LIM','0.036')); EMIN=float(os.environ.get('EMIN','0.9'))
AXB=np.array([0.657,-0.695,0.291]); AXB/=np.linalg.norm(AXB); CB=np.array([0.144,0.378,-0.032]); RB=0.029
def ovo(P):
    Rt=np.interp(P[:,1],[0.30,0.32,0.34,0.36,0.40,0.42,0.44,0.46,0.49],[0.055,0.068,0.078,0.081,0.077,0.072,0.064,0.054,0.04])
    return np.sqrt((P[:,0]/(1.12*Rt))**2+((P[:,2]+0.047)/Rt)**2),Rt
def no_ovo(P):
    e,Rt=ovo(P); Q=P.copy(); Q[:,0]/=e; Q[:,2]=(Q[:,2]+0.047)/e-0.047
    n=np.c_[Q[:,0]/(1.12*Rt)**2,np.zeros(len(Q)),(Q[:,2]+0.047)/Rt**2]; n/=np.linalg.norm(n,axis=1,keepdims=True); return Q,n
armset=np.zeros(len(V),bool)
for s_ in (1,-1):
    ax=AXB*[s_,1,1]; cb=CB*[s_,1,1]
    d=V-cb; t=d@ax; pv=d-np.outer(t,ax); perp=np.linalg.norm(pv,axis=1)
    e,_=ovo(V)
    zona=(V[:,0]*s_>0.02)&(V[:,1]>0.33)&(V[:,1]<0.495)&(perp<0.085)
    # corte mínimo (pelo comprimento das arestas) entre o lado de fora do braço e o tronco: cai na dobra entre os dois
    fonte=zona&(((e>1.38)&(perp<0.05)&(V[:,1]<0.466))|((V[:,1]<0.35)&(perp<0.06)))
    ralo=zona&((perp>0.07)|(V[:,1]>0.481)|(e<0.9)|(V[:,0]*s_<0.035))&~fonte
    nw_=inv.max()+1; zw=np.zeros(nw_,bool); zw[inv[zona]]=True; fw=np.zeros(nw_,bool); fw[inv[fonte]]=True; rw_=np.zeros(nw_,bool); rw_[inv[ralo]]=True; rw_&=~fw
    ee=np.r_[F[:,[0,1]],F[:,[1,2]],F[:,[2,0]]]; ke=zona[ee].all(1); ee=ee[ke]
    ln=np.maximum(1,np.round(np.linalg.norm(V[ee[:,0]]-V[ee[:,1]],axis=1)*2e5)).astype(np.int32)
    a_i,b_i=inv[ee[:,0]],inv[ee[:,1]]; S_,T_=nw_,nw_+1; BIG=2**28
    rr=np.r_[a_i,b_i,np.full(fw.sum(),S_),np.where(rw_)[0]]; cc_=np.r_[b_i,a_i,np.where(fw)[0],np.full(rw_.sum(),T_)]
    cap=np.r_[ln,ln,np.full(fw.sum()+rw_.sum(),BIG,np.int32)]
    M=coo_matrix((cap,(rr,cc_)),shape=(nw_+2,nw_+2)).tocsr(); M.data=np.minimum(M.data,BIG).astype(np.int32)
    res=maximum_flow(M,S_,T_); R=(M-res.flow).tocsr(); R.data=np.maximum(R.data,0); R.eliminate_zeros()
    od=breadth_first_order(R,S_,directed=True,return_predecessors=False); sd=np.zeros(nw_+2,bool); sd[od]=True
    arm=zona&sd[inv]
    print('ombro',s_,'fonte',int(fonte.sum()),'ralo',int(ralo.sum()),'corte',res.flow_value/2e5,'lado do braço',int(arm.sum()))
    fz=zona[F].all(1); fa=arm[F]; mix=fz&fa.any(1)&~fa.all(1)
    Fmix=F[mix]; F=F[~mix]
    n_antes=len(V)
    def _w(m):
        o=np.zeros(inv.max()+1,bool); o[inv[m[:len(inv)]]]=True; return o
    def pecas(F_):
        _Fw=inv[F_]; _n=inv.max()+1
        _nc,_lab=connected_components(coo_matrix((np.ones(len(_Fw)*3),(np.r_[_Fw[:,0],_Fw[:,1],_Fw[:,2]],np.r_[_Fw[:,1],_Fw[:,2],_Fw[:,0]])),shape=(_n,_n)),directed=False)
        return _lab[inv]
    _tip=np.argmax(V[:,0]*s_); _cab=np.argmax(V[:,1])
    lv_=pecas(F); H=lv_==lv_[_tip]; T=lv_==lv_[_cab]
    # devolve as faces cortadas que não separam nada (as duas pontas ficaram na mesma peça)
    volta=H[Fmix].all(1)|T[Fmix].all(1); F=np.r_[F,Fmix[volta]]; Fmix=Fmix[~volta]
    # ilhas soltas (nem braço nem corpo) somem
    ilha=~(H|T)&zona; F=F[~ilha[F].all(1)]
    lv_=pecas(F); H=lv_==lv_[_tip]; T=lv_==lv_[_cab]
    print('  depois do corte: braço',int(H.sum()),'corpo',int(T.sum()),'faces tiradas',len(Fmix),'devolvidas',int(volta.sum()),'ilhas',int(ilha.sum()))
    rvw=np.zeros(inv.max()+1,bool); rvw[np.unique(inv[Fmix])]=True; rv=rvw[inv]
    eo=np.r_[F[:,[0,1]],F[:,[1,2]],F[:,[2,0]]]; es=np.sort(inv[eo],1)
    u,idx,cnt=np.unique(es,axis=0,return_index=True,return_counts=True); be=eo[idx[cnt==1]]
    be=be[rv[be].all(1)]
    arm=H.copy()
    # alisa as rebarbas que o corte deixa: no corpo, o que sobrou do braço deita no "ovo"; no braço, o que sobrou do corpo deita no tubo
    ss_=lambda a,b,x: np.clip((x-a)/(b-a),0,1)**2*(3-2*np.clip((x-a)/(b-a),0,1))
    mt=T&zona&(perp<0.075)&(V[:,1]<0.478)
    if mt.any():
        Q,nq=no_ovo(V[mt]); k=ss_(1.015,1.07,e[mt])[:,None]; V[mt]=V[mt]*(1-k)+Q*k; N[mt]=N[mt]*(1-k)+nq*k
    ma=H&zona&(perp>RB*1.12)&(perp<0.085)
    if ma.any():
        k=ss_(RB*1.12,RB*1.5,perp[ma])[:,None]; nn=pv[ma]/perp[ma][:,None]
        V[ma]=V[ma]*(1-k)+(cb+np.outer(t[ma],ax)+nn*RB)*k; N[ma]=N[ma]*(1-k)+nn*k
    N/=np.maximum(np.linalg.norm(N,axis=1,keepdims=True),1e-9)
    print('  alisou corpo',int(mt.sum()),'braço',int(ma.sum()))
    for lado_arm in (True,False):
        e2=be[H[be].all(1)] if lado_arm else be[T[be].all(1)]
        if not len(e2): continue
        ring=np.unique(e2); ctr=V[ring].mean(0)
        NIV=4
        def proj(P):
            if lado_arm:
                dd=P-cb; tt=dd@ax; pp=dd-np.outer(tt,ax); nn=pp/np.maximum(np.linalg.norm(pp,axis=1,keepdims=True),1e-9); return cb+np.outer(tt,ax)+nn*RB,-nn*0+nn
            return no_ovo(P)
        base=len(V); wid={}; newP=[]; 
        rw=np.unique(inv[ring]); rep={w_:ring[np.where(inv[ring]==w_)[0][0]] for w_ in rw}
        for li in range(1,NIV):
            f_=li/NIV
            for w_ in rw: wid[(w_,li)]=base+len(newP); newP.append(V[rep[w_]]*(1-f_)+ctr*f_)
        ci=base+len(newP); newP.append(ctr)
        newP=np.array(newP,np.float32); Pp,Nn_=proj(newP)
        # mistura: perto da borda fica onde está, para o meio vai para a forma (ovo ou tubo)
        lv=np.r_[np.repeat(np.arange(1,NIV),len(rw)),NIV]/NIV; k=np.minimum(1,lv*2)[:,None]
        newP=newP*(1-k)+Pp*k
        cor=np.median(C[ring],0); uvr=UV[ring[0]]
        V=np.r_[V,newP]; N=np.r_[N,Nn_.astype(np.float32)]; C=np.r_[C,np.tile(cor,(len(newP),1)).astype(np.float32)]; UV=np.r_[UV,np.tile(uvr,(len(newP),1))]
        inv=np.r_[inv,inv.max()+1+np.arange(len(newP))]
        armset=np.r_[armset,np.full(len(newP),lado_arm)]; arm=np.r_[arm,np.full(len(newP),lado_arm)]; H=np.r_[H,np.full(len(newP),lado_arm)]; T=np.r_[T,np.full(len(newP),not lado_arm)]; zona=np.r_[zona,np.ones(len(newP),bool)]; rv=np.r_[rv,np.zeros(len(newP),bool)]
        nf=[]
        for a_,b_ in e2:
            wa,wb=inv[a_],inv[b_]; pa,pb=a_,b_
            for li in range(1,NIV):
                na,nb_=wid[(wa,li)],wid[(wb,li)]; nf+= [[pa,pb,nb_],[pa,nb_,na]]; pa,pb=na,nb_
            nf.append([pa,pb,ci])
        F=np.r_[F,np.array(nf,np.int64)]
        print('ombro',s_,'braço' if lado_arm else 'tronco','arestas',len(e2),'novos',len(newP))
    # lixa a cicatriz: alisa só a região do remendo (dos dois lados) e refaz as normais ali
    d=V-cb; t=d@ax; pv=d-np.outer(t,ax); perp=np.linalg.norm(pv,axis=1)
    nw_=inv.max()+1; Fw=inv[F]
    A=coo_matrix((np.ones(len(Fw)*6),(np.r_[Fw[:,0],Fw[:,1],Fw[:,2],Fw[:,1],Fw[:,2],Fw[:,0]],np.r_[Fw[:,1],Fw[:,2],Fw[:,0],Fw[:,0],Fw[:,1],Fw[:,2]])),shape=(nw_,nw_)).tocsr(); A.data[:]=1
    deg=np.maximum(1,np.asarray(A.sum(1)).ravel())
    # perto do corte: vizinhança (alguns anéis) dos vértices da borda cortada e dos remendos
    perto=np.zeros(nw_,bool); perto[inv[rv|(np.arange(len(V))>=n_antes)]]=True
    for _ in range(int(os.environ.get('ANEIS','6'))): perto=perto|(A@perto.astype(np.float32)>0)
    Pw=np.zeros((nw_,3)); Pw[inv]=V
    for msk,it in ((perto&_w(T),int(os.environ.get('ITT','40'))),(perto&_w(H),int(os.environ.get('ITA','10')))):
        for _ in range(it):
            Lp=(A@Pw)/deg[:,None]; Pw[msk]=Pw[msk]*0.4+Lp[msk]*0.6
    mv=perto[inv]; V[mv]=Pw[inv[mv]].astype(np.float32)
    fn=np.cross(V[F[:,1]]-V[F[:,0]],V[F[:,2]]-V[F[:,0]]); Nw=np.zeros((nw_,3))
    for k_ in range(3): np.add.at(Nw,Fw[:,k_],fn)
    Nw/=np.maximum(np.linalg.norm(Nw,axis=1,keepdims=True),1e-12)
    # as faces novas podem estar ao contrário: mantém o sentido que a normal já tinha
    _,ne=no_ovo(V[mv]); nr=pv[mv]/np.maximum(perp[mv],1e-9)[:,None]; ref=np.where(_w(H)[inv[mv]][:,None],nr,ne)
    sg=np.sign((Nw[inv[mv]]*ref).sum(1,keepdims=True)); sg[sg==0]=1; N[mv]=(Nw[inv[mv]]*sg).astype(np.float32)
    print('  lixou',int(mv.sum()))
# o braço agora é uma peça solta: acha pela ligação da malha (a peça que contém a ponta da mão)
Fw=inv[F]; nw=inv.max()+1
ncomp,lab=connected_components(coo_matrix((np.ones(len(Fw)*3),(np.r_[Fw[:,0],Fw[:,1],Fw[:,2]],np.r_[Fw[:,1],Fw[:,2],Fw[:,0]])),shape=(nw,nw)),directed=False)
labv=lab[inv]; print('peças',ncomp,np.sort(np.bincount(labv))[-5:])
PECA={}
for s_ in (1,-1):
    tip=np.argmax(V[:,0]*s_); PECA[s_]=labv==labv[tip]; print('peça do braço',s_,int(PECA[s_].sum()))
side=np.sign(V[:,0]); side[side==0]=1
leg=((V[:,1]<0.30)&(np.abs(V[:,0])<0.125+GAP))|((V[:,1]<0.165)&(np.abs(V[:,0])<0.2+GAP))
prop=np.r_[prop,np.zeros(len(V)-len(prop),bool)]
newV=[]

# 4) ossos
Z=-0.048
SH=np.array([0.062,0.466,-0.057]); SHV=np.array([0.076,0.452,-0.047]); AD=np.array([0.59,-0.77,0.24]); AD/=np.linalg.norm(AD)
J={ 'quadril':[0,0.31,Z],'peito':[0,0.37,Z],'cabeca':[0,0.49,Z],'helice':PIV.tolist() }
for s,nm in ((1,'E'),(-1,'D')):
    sh=SH*[s,1,1]; ad=AD*[s,1,1]
    J['braco'+nm]=sh.tolist(); shv=SHV*[s,1,1]; J['ante'+nm]=(shv+ad*0.098).tolist(); J['mao'+nm]=(shv+ad*0.168).tolist()
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
    sh=SHV*[s,1,1]; ad=AD*[s,1,1]
    d=V-sh; t=d@ad
    inarm=PECA[s].astype(np.float32)
    i0=NAMES.index('braco'+nm)
    we=ss(0.083,0.118,t); ww=ss(0.153,0.178,t)
    up=(1-we); fo=we*(1-ww); ha=ww
    W*= (1-inarm)[:,None]
    W[:,i0]+=inarm*up; W[:,i0+1]+=inarm*fo; W[:,i0+2]+=inarm*ha
# dedos: os quatro dedos juntos em dois ossos (base e meio) e o polegar, em cada mão
AXh,LAh,NOh=np.array([0.6348,-0.7403,0.2212]),np.array([0.7517,0.658,0.0451]),np.array([-0.1789,0.1377,0.9742])  # mão esquerda em repouso (medido uma vez com mao.py)
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
