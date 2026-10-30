import numpy as np, json, sys
from PIL import Image, ImageDraw
from visor import visor, geom
exec(open(sys.argv[1]).read().split(sys.argv[2])[0])
cells=[]; Z=int(sys.argv[6]) if len(sys.argv)>6 else 110; ONLY=sys.argv[4].split(",") if len(sys.argv)>4 and sys.argv[4] else None
for an, sheets in ANIM.items():
    for nm in [x for x in sheets if not ONLY or x in ONLY]:
        for j in range(len(I[nm])):
            a=np.array(Image.open(f'mv2/{nm}_{j}.png')); m,core=visor(a, 'mvb' in sys.argv[1])
            bg=Image.new('RGBA',(a.shape[1],a.shape[0]),(0,150,0,255)); bg.alpha_composite(Image.fromarray(a)); im=bg.convert('RGB')
            if m is None: continue
            x0,y0,W,Hh,roll=geom(m)
            ov=np.array(im); ov[m & ~(np.array(im).mean(2)<58)]=[255,0,255]; im=Image.fromarray(ov)
            d=ImageDraw.Draw(im); c,s=np.cos(roll),np.sin(roll)
            def P(u,w): return (x0+u*c-w*s, y0+u*s+w*c)
            fk=Hh/14.5; kx=.62*W/(11.6*fk)
            for ex in (-1,1):
                cx,cy=P(ex*3.2*fk*kx,-1.5*fk); r=1.3*fk
                d.ellipse((cx-r*kx,cy-r*1.3,cx+r*kx,cy+r*1.3),fill=(120,250,255))
            d.line([P(u*fk*kx,2.2*fk+ (u*u)*.12*fk) for u in np.linspace(-2.5,2.5,9)],fill=(120,250,255),width=3)
            S=max(W,Hh)*1.1; cr=im.crop((int(x0-S),int(y0-S),int(x0+S),int(y0+S))).resize((Z,Z))
            ImageDraw.Draw(cr).text((2,2),f'{nm}{j} {np.degrees(roll):.0f}',fill=(255,255,0))
            cells.append(cr)
n=len(cells); C=int(sys.argv[5]) if len(sys.argv)>5 else 18; R=(n+C-1)//C; G=Image.new('RGB',(C*Z,R*Z))
for i,c in enumerate(cells): G.paste(c,((i%C)*Z,(i//C)*Z))
G.save(sys.argv[3]); print(n)
