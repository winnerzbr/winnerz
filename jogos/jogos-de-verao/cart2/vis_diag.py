import numpy as np, json, cv2, sys
from PIL import Image, ImageDraw
sys.argv += ['ia'] if len(sys.argv)<2 else []
exec(open('mv5.py').read().split('# altura do centro')[0])  # SH, ANIM, screen
cells=[]
for an, sheets in ANIM.items():
    for nm in sheets:
        for j in range(len(I[nm])):
            a=np.array(Image.open(f'mv2/{nm}_{j}.png')); m,sz=screen(a)
            im=Image.fromarray(a).convert('RGB'); 
            if m is None: continue
            ys,xs=np.where(m); cx,cy=xs.mean(),ys.mean()
            cnt,_=cv2.findContours(m.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); c=max(cnt,key=cv2.contourArea)
            (rx,ry),(rw,rh),ang=cv2.minAreaRect(cv2.convexHull(c))
            if rw<rh: rw,rh,ang=rh,rw,ang+90
            ang=(ang+90)%180-90
            d=ImageDraw.Draw(im); box=cv2.boxPoints(((rx,ry),(rw,rh),ang)); d.polygon([tuple(p) for p in box],outline=(255,0,0))
            bw=xs.max()-xs.min(); bh=ys.max()-ys.min()
            S=max(bw,bh)*1.4; cr=im.crop((int(cx-S),int(cy-S),int(cx+S),int(cy+S))).resize((120,120))
            dd=ImageDraw.Draw(cr); dd.text((2,2),f'{nm}{j} {ang:.0f} {bw/bh:.2f}',fill=(255,255,0))
            cells.append(cr)
n=len(cells); C=16; R=(n+C-1)//C; G=Image.new('RGB',(C*120,R*120))
for i,c in enumerate(cells): G.paste(c,((i%C)*120,(i//C)*120))
G.save('../ashots/visdiag.png'); print(n)
