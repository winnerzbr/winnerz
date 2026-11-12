"""Grava o GLB completo para os jogos: malha cheia consertada, textura com a aba pintada, 22 ossos e a animação da hélice."""
import sys,struct,io; sys.path.insert(0,'/home/claude/iam/src')
from load import *
import cv2
V0,N0,UV0,F0,imgs,j0=load()
d=np.load('out/full.npz'); sk=json.load(open('out/skel.json'))
V,N,F,W,UV=d['V'].astype(np.float32),d['N'].astype(np.float32),d['F'].astype(np.uint32),d['W'],d['UV'].astype(np.float32)
N/=np.maximum(np.linalg.norm(N,axis=1,keepdims=True),1e-9)
pint=np.load('out/pint.npy')
# textura: pinta os triângulos da parte de baixo da aba
T=np.asarray(imgs[0].convert('RGB')).copy(); h,w=T.shape[:2]
pm=np.zeros(len(V),bool); pm[pint]=True
fs=F[(pm[F].sum(1)>=2)]
pts=(UV[fs]%1.0)*[w,h]
for tri in pts: cv2.fillPoly(T,[np.round(tri).astype(np.int32)],(247,72,1))
for tri in pts: cv2.polylines(T,[np.round(tri).astype(np.int32)],True,(247,72,1),3)
b=io.BytesIO(); Image.fromarray(T).save(b,'JPEG',quality=93); base=b.getvalue()
# imagens originais (rm e normal) sem mexer
raw=open('/mnt/user-data/uploads/c5026325-IAmiguinho_3D_Final.glb','rb').read(); cl=struct.unpack('<I',raw[12:16])[0]; bin0=raw[20+cl+8:]
def img_bytes(i): bv=j0['bufferViews'][j0['images'][i]['bufferView']]; o=bv.get('byteOffset',0); return bin0[o:o+bv['byteLength']]
# pesos: 4 maiores
o=np.argsort(-W,1)[:,:4]; w4=np.take_along_axis(W,o,1).astype(np.float32); w4/=w4.sum(1,keepdims=True); j4=o.astype(np.uint8); j4[w4==0]=0
J=np.array(sk['joints'],np.float32); par=sk['parent']; nb=len(J)
ibm=np.tile(np.eye(4,dtype=np.float32),(nb,1,1)); ibm[:,3,:3]=-J    # coluna-maior: translação na última "linha" do array
ang=np.linspace(0,2*np.pi,9); times=np.linspace(0,0.5,9).astype(np.float32); quat=np.c_[np.zeros(9),np.sin(ang/2),np.zeros(9),np.cos(ang/2)].astype(np.float32)
chunks=[];views=[];off=0
def add(data,target=None):
    global off
    bts=data if isinstance(data,(bytes,bytearray)) else data.tobytes()
    pad=(-len(bts))%4; views.append({'buffer':0,'byteOffset':off,'byteLength':len(bts),**({'target':target} if target else {})}); chunks.append(bts+b'\0'*pad); off+=len(bts)+pad; return len(views)-1
acc=[]
def A(view,ct,count,typ,**k): acc.append({'bufferView':view,'componentType':ct,'count':count,'type':typ,**k}); return len(acc)-1
aP=A(add(V,34962),5126,len(V),'VEC3',min=V.min(0).tolist(),max=V.max(0).tolist())
aN=A(add(N,34962),5126,len(V),'VEC3'); aU=A(add(UV,34962),5126,len(V),'VEC2')
aJ=A(add(j4,34962),5121,len(V),'VEC4'); aW=A(add(w4,34962),5126,len(V),'VEC4')
aI=A(add(F.reshape(-1),34963),5125,F.size,'SCALAR')
aM=A(add(ibm),5126,nb,'MAT4'); aT=A(add(times),5126,9,'SCALAR',min=[0.0],max=[0.5]); aQ=A(add(quat),5126,9,'VEC4')
vi=[add(base),add(img_bytes(1)),add(img_bytes(2))]
nodes=[{'name':'IAmiguinho','mesh':0,'skin':0}]
for i in range(nb):
    t=(J[i]-(J[par[i]] if par[i]>=0 else 0)).tolist(); n={'name':sk['names'][i],'translation':t}
    ch=[k+1 for k in range(nb) if par[k]==i]
    if ch: n['children']=ch
    nodes.append(n)
g={'asset':{'version':'2.0','generator':'WinnerZ prep (a partir do Tripo)'},'scene':0,'scenes':[{'nodes':[0,1]}],'nodes':nodes,
 'meshes':[{'name':'IAmiguinho','primitives':[{'attributes':{'POSITION':aP,'NORMAL':aN,'TEXCOORD_0':aU,'JOINTS_0':aJ,'WEIGHTS_0':aW},'indices':aI,'material':0}]}],
 'skins':[{'joints':list(range(1,nb+1)),'inverseBindMatrices':aM,'skeleton':1}],
 'materials':[{'name':'IAmiguinho','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicRoughnessTexture':{'index':1}},'normalTexture':{'index':2}}],
 'textures':[{'source':0,'sampler':0},{'source':1,'sampler':0},{'source':2,'sampler':0}],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}],
 'images':[{'name':'basecolor','bufferView':vi[0],'mimeType':'image/jpeg'},{'name':'rm','bufferView':vi[1],'mimeType':j0['images'][1]['mimeType']},{'name':'normal','bufferView':vi[2],'mimeType':j0['images'][2]['mimeType']}],
 'animations':[{'name':'helice_girando','samplers':[{'input':aT,'output':aQ,'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':1+sk['names'].index('helice'),'path':'rotation'}}]}],
 'accessors':acc,'bufferViews':views,'buffers':[{'byteLength':off}]}
js=json.dumps(g,separators=(',',':')).encode(); js+=b' '*((-len(js))%4); bn=b''.join(chunks)
out=b'glTF'+struct.pack('<II',2,12+8+len(js)+8+len(bn))+struct.pack('<I',len(js))+b'JSON'+js+struct.pack('<I',len(bn))+b'BIN\0'+bn
open('/home/claude/out/IAmiguinho_3D_Rig.glb','wb').write(out); print('bytes',len(out),'ossos',nb,'verts',len(V),'tris',len(F))
