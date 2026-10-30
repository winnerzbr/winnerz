from PIL import Image, ImageDraw
import sys
names=sys.argv[2:]; out=sys.argv[1]
ims=[Image.open(f'outD/{n}.png') for n in names]
W=sum(i.width for i in ims)+20*len(ims); H=max(i.height for i in ims)+30
sh=Image.new('RGB',(W,H),(200,200,210)); d=ImageDraw.Draw(sh); x=10
for n,im in zip(names,ims):
    sh.paste(im,(x,20),im)
    for gx in range(0,im.width,20): d.line([(x+gx,20),(x+gx,20+im.height)],fill=(255,0,0) if gx%100==0 else (120,120,255),width=1)
    for gy in range(0,im.height,20): d.line([(x,20+gy),(x+im.width,20+gy)],fill=(255,0,0) if gy%100==0 else (120,120,255),width=1)
    d.text((x,4),n,fill=(0,0,0)); x+=im.width+20
sh.save(out)
