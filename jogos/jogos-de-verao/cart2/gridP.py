from PIL import Image, ImageDraw
import sys
for n in sys.argv[1:]:
    im=Image.open(f'poses5/{n}.png'); W,H=im.width*2,im.height*2
    sh=Image.new('RGB',(W+40,H+30),(200,200,210)); big=im.resize((W,H)); sh.paste(big,(30,20),big); d=ImageDraw.Draw(sh)
    for g in range(0,im.width,10): d.line([(30+g*2,20),(30+g*2,20+H)],fill=(255,0,0) if g%50==0 else (150,150,255),width=1)
    for g in range(0,im.height,10): d.line([(30,20+g*2),(30+W,20+g*2)],fill=(255,0,0) if g%50==0 else (150,150,255),width=1)
    for g in range(0,im.width,50): d.text((30+g*2,4),str(g),fill=(0,0,0))
    for g in range(0,im.height,50): d.text((2,20+g*2),str(g),fill=(0,0,0))
    sh.save(f'gp_{n}.png')
