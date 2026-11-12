import json,struct,numpy as np,io
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
def load(path='/mnt/user-data/uploads/c5026325-IAmiguinho_3D_Final.glb'):
    b=open(path,'rb').read()
    cl=struct.unpack('<I',b[12:16])[0]; j=json.loads(b[20:20+cl]); o=20+cl+8; bin_=b[o:]
    def acc(i):
        a=j['accessors'][i]; bv=j['bufferViews'][a['bufferView']]
        n={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']]; dt={5126:np.float32,5125:np.uint32,5123:np.uint16}[a['componentType']]
        off=bv.get('byteOffset',0)+a.get('byteOffset',0)
        return np.frombuffer(bin_,dt,a['count']*n,off).reshape(-1,n) if n>1 else np.frombuffer(bin_,dt,a['count'],off)
    p=j['meshes'][0]['primitives'][0]
    V=acc(p['attributes']['POSITION']).copy(); N=acc(p['attributes']['NORMAL']).copy(); UV=acc(p['attributes']['TEXCOORD_0']).copy(); F=acc(p['indices']).reshape(-1,3).astype(np.int64)
    imgs=[]
    for im in j['images']:
        bv=j['bufferViews'][im['bufferView']]; imgs.append(Image.open(io.BytesIO(bin_[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])))
    return V,N,UV,F,imgs,j
def vcol(UV,tex):
    T=np.asarray(tex.convert('RGB')); h,w=T.shape[:2]
    u=np.clip((UV[:,0]%1.0)*w,0,w-1).astype(int); v=np.clip((UV[:,1]%1.0)*h,0,h-1).astype(int)
    return T[v,u]
def render(V,C,yaw=0,pitch=0,size=700,lo=None,hi=None,bg=40):
    cy,sy=np.cos(yaw),np.sin(yaw); cp,sp=np.cos(pitch),np.sin(pitch)
    x=V[:,0]*cy+V[:,2]*sy; z=-V[:,0]*sy+V[:,2]*cy; y=V[:,1]
    y2=y*cp-z*sp; z2=y*sp+z*cp
    if lo is None: lo=np.array([x.min(),y2.min()]); hi=np.array([x.max(),y2.max()])
    s=(size-20)/max(hi[0]-lo[0],hi[1]-lo[1])
    px=((x-(lo[0]+hi[0])/2)*s+size/2).astype(int); py=(size/2-(y2-(lo[1]+hi[1])/2)*s).astype(int)
    ok=(px>=1)&(px<size-1)&(py>=1)&(py<size-1)
    o=np.argsort(z2[ok]); px,py,c=px[ok][o],py[ok][o],C[ok][o]
    img=np.full((size,size,3),bg,np.uint8)
    for dx in(-1,0,1):
        for dy in(-1,0,1): img[py+dy,px+dx]=c
    return Image.fromarray(img)

def render2(V,N,C,yaw=0,pitch=0,size=700,lo=None,hi=None,bg=40,shade=True):
    cy,sy=np.cos(yaw),np.sin(yaw); cp,sp=np.cos(pitch),np.sin(pitch)
    def rot(P):
        x=P[:,0]*cy-P[:,2]*sy; z=P[:,0]*sy+P[:,2]*cy; y=P[:,1]
        return np.c_[x,y*cp-z*sp,y*sp+z*cp]
    P=rot(V); Nn=rot(N)
    ok=Nn[:,2]>-0.05
    if lo is None: lo=P[:,:2].min(0); hi=P[:,:2].max(0)
    s=(size-20)/max(hi[0]-lo[0],hi[1]-lo[1])
    px=((P[:,0]-(lo[0]+hi[0])/2)*s+size/2).astype(int); py=(size/2-(P[:,1]-(lo[1]+hi[1])/2)*s).astype(int)
    ok&=(px>=2)&(px<size-2)&(py>=2)&(py<size-2)
    c=C.astype(float)
    if shade: c=c*(0.55+0.45*np.clip(Nn[:,2:3],0,1))
    o=np.argsort(P[ok,2]); px,py,c=px[ok][o],py[ok][o],c[ok][o].astype(np.uint8)
    img=np.full((size,size,3),bg,np.uint8)
    for dx in(-1,0,1):
        for dy in(-1,0,1): img[py+dy,px+dx]=c
    return Image.fromarray(img)
