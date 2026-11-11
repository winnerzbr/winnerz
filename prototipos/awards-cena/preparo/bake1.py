import struct,json,numpy as np
from scipy.spatial import cKDTree
from scipy.sparse import coo_matrix
P='/mnt/user-data/uploads/24c20a98-WinnerZ_Awards_Novo_Trofeu_Materiais.glb'
b=open(P,'rb').read()
cl=struct.unpack('<I',b[12:16])[0];j=json.loads(b[20:20+cl]);bin0=20+cl+8
acc=j['accessors'];bv=j['bufferViews']
def arr(i,dt):
    a=acc[i];v=bv[a['bufferView']];o=bin0+v.get('byteOffset',0)+a.get('byteOffset',0)
    n=a['count']*(3 if a['type']=='VEC3' else 1);return np.frombuffer(b,dt,n,o).reshape(-1,3)
M=[]
for m in j['meshes']:
    p=m['primitives'][0];ia=acc[p['indices']];dt={5125:'<u4',5123:'<u2'}[ia['componentType']]
    M.append((arr(p['attributes']['POSITION'],'<f4').copy(),arr(p['attributes']['NORMAL'],'<f4').copy(),arr(p['indices'],dt).astype(np.int64)))
V,N,I=M[0]
t=cKDTree(V)
th=np.full(len(V),9.)
for s in np.arange(.003,.045,.002):
    d,k=t.query(V-N*s,distance_upper_bound=.004)
    ok=(d<.004)&(th>8);k2=np.where(ok,k,0)
    opp=(N[k2]*N).sum(1)<-.2
    th[ok&opp]=s
print('thin hist',np.histogram(th[th<8],bins=10)[0],np.round(np.histogram(th[th<8],bins=10)[1],3),'none',(th>8).mean())
np.savez('/home/claude/zen/m0.npz',V=V,N=N,I=I,th=th)
import pickle;pickle.dump(M[1:],open('/home/claude/zen/rest.pkl','wb'))
