from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import numpy as np, wave, os, math, random
random.seed(86)
ROOT=os.path.dirname(__file__)
ART=os.path.join(ROOT,'assets/resources/art'); AUDIO=os.path.join(ROOT,'assets/resources/audio')
os.makedirs(ART,exist_ok=True);os.makedirs(AUDIO,exist_ok=True)
HORSES=[('white',(232,233,232),(231,31,31)),('pink',(227,49,164),(243,226,245)),('red',(230,44,42),(229,223,34)),('blue',(40,61,219),(227,93,42)),('yellow',(255,216,37),(29,56,215)),('green',(44,178,64),(247,193,31))]
BORDER=(18,15,34);BLACK=(0,0,0)
# Pixel horse silhouettes and 4 original cycle frames; not extracted from ROM.
def draw_horse(index,frame):
    w,h=108,68
    im=Image.new('RGBA',(w,h),(0,0,0,0));d=ImageDraw.Draw(im)
    name, coat, rider=HORSES[index]
    def poly(coords,color,outline=BORDER):d.polygon(coords,fill=color,outline=outline)
    # tail: three small pixel tufts
    t=round(math.sin(frame*math.pi/2)*3)
    poly([(20,25+t),(9,20+t),(4,17+t),(10,28+t),(15,32+t),(24,35+t)],coat)
    # legs beneath torso, 4 independent cycles
    gait=[(-7,6,5,-2),(-2,-6,-3,7),(7,-4,-7,2),(-3,7,4,-6)][frame]
    legs=[(31,43,gait[0]),(41,43,gait[1]),(65,44,gait[2]),(77,42,gait[3])]
    for x,y,off in legs:
        poly([(x,y),(x+6,y+2),(x+5+off//3,53),(x+11+off,61),(x+7+off,64),(x+0+off//2,60),(x-1,51)],coat)
        d.line([(x+7+off,62),(x+12+off,64)],fill=(30,25,32),width=4)
    # body/neck/head
    poly([(22,25),(32,17),(61,18),(72,24),(76,38),(69,46),(34,46),(22,37)],coat)
    poly([(65,24),(73,13),(78,8),(82,8),(85,13),(84,26),(77,36),(70,35)],coat)
    poly([(77,10),(87,8),(94,11),(97,16),(96,23),(89,25),(82,22),(79,18)],coat)
    poly([(77,10),(75,2),(81,5),(84,9)],coat)
    # muzzle and eye
    poly([(90,17),(99,17),(104,22),(102,27),(92,27),(87,22)],tuple(min(255,c+20) for c in coat))
    d.rectangle((87,15,89,17),fill=BLACK)
    d.point((100,22),fill=BLACK)
    # mane, bridle and small highlight
    d.line([(77,9),(72,13),(70,19),(68,25)],fill=(26,16,26),width=4)
    d.line([(88,12),(93,21),(91,27)],fill=(241,204,91),width=1)
    d.line([(83,22),(71,35)],fill=(245,225,164),width=1)
    d.line([(31,21),(43,20),(55,22)],fill=tuple(min(255,c+32) for c in coat),width=2)
    # saddle w/ number
    d.rectangle((44,23,64,40),fill=(27,20,47),outline=(253,232,70),width=1)
    d.rectangle((45,24,63,39),fill=(239,198,36))
    try:f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',16)
    except:f=None
    d.text((49,23),str(index+1),font=f,fill=(9,9,12),stroke_width=0)
    # rider boots / legs
    poly([(53,17),(64,20),(61,32),(57,34),(52,25)],(20,17,28))
    d.line([(58,34),(67,38),(69,43)],fill=(22,20,18),width=4)
    # torso, arms, head and helmet
    poly([(45,3),(56,5),(59,16),(54,22),(45,17),(42,11)],rider)
    d.ellipse((46,-1,55,8),fill=(226,178,138),outline=BORDER,width=1)
    d.polygon([(43,3),(44,0),(48,-3),(56,-1),(60,4),(60,6),(45,6)],fill=rider,outline=BORDER)
    d.line([(56,10),(70,16),(79,19)],fill=rider,width=4)
    d.line([(54,20),(68,20)],fill=(25,22,28),width=2)
    # return 216x136, crisp nearest-pixel
    return im.resize((216,136),Image.Resampling.NEAREST)
for i in range(6):
    for f in range(4):
        draw_horse(i,f).save(os.path.join(ART,f'horse_{i+1}_{f}.png'))
# Race-track backdrop 960x334 with vibrant pixel bush scenery
W,H=960,334
base=Image.new('RGB',(W,H),(164,125,77));d=ImageDraw.Draw(base)
# skyline greenery and bushes
d.rectangle((0,0,W,52),fill=(2,139,53));d.rectangle((0,27,W,59),fill=(0,189,67))
for k in range(40):
    x=k*26-10; yy=9+random.randint(-3,4)
    d.ellipse((x,yy,x+28,yy+27),fill=(3,99+random.randint(0,60),35),outline=(0,49,39),width=2)
    for z in range(7):
        xx=x+random.randint(0,24); y=yy+random.randint(2,23)
        d.rectangle((xx,y,xx+3,y+3),fill=random.choice([(32,232,26),(154,250,46),(247,239,40),(1,60,24)]))
# back fence
d.rectangle((0,55,960,61),fill=(235,235,226));d.rectangle((0,63,960,69),fill=(62,76,68))
for x in range(0,960,72):d.rectangle((x,60,x+5,85),fill=(209,205,190))
d.rectangle((0,73,960,309),fill=(176,137,82))
# pixel dust flecks & brown track line
for k in range(230):
    x=random.randrange(W);y=random.randrange(80,298)
    c=random.choice([(155,112,63),(196,149,89),(151,108,59),(214,170,108)])
    d.rectangle((x,y,x+random.randrange(2,7),y+random.randrange(1,3)),fill=c)
# bottom finishing fence
d.rectangle((0,311,960,317),fill=(239,231,208));d.rectangle((0,322,960,329),fill=(112,116,109));
for x in range(0,W,70):d.rectangle((x,311,x+5,333),fill=(210,211,201))
base.save(os.path.join(ART,'race_track.png'))
# v0.3 original, provisional scenery for two BENDS, far-side and finishing straight.
# The source video has not been frame-by-frame inspected; these are not ROM assets.
def curve_texture(side):
    im=base.copy(); d=ImageDraw.Draw(im)
    # Stylized infield makes the track visibly curve away from the camera.
    if side=='right':
        r=(-160,-155,750,489); outline=(-171,-168,765,504)
    else:
        r=(210,-155,1120,489); outline=(195,-168,1131,504)
    d.ellipse(r,fill=(16,115,52))
    d.arc(outline,0,359,fill=(222,225,201),width=7)
    for inset in (35,78):
        l,t,rr,bb=outline
        d.arc((l-inset,t-inset,rr+inset,bb+inset),0,359,
              fill=(140,111,65),width=3)
    # Small checker highlights along the inside grass.
    cx=(390 if side=='right' else 520)
    for k in range(16):
        xx=cx+(k%4)*21; yy=22+(k//4)*18
        d.rectangle((xx,yy,xx+7,yy+7),fill=(18,156+((k*13)%50),46))
    d.rectangle((0,313,960,321),fill=(222,226,209))
    for xx in range(0,960,68):d.rectangle((xx,312,xx+5,333),fill=(226,229,226))
    return im
curve_texture('right').save(os.path.join(ART,'track_curve_right.png'))
curve_texture('left').save(os.path.join(ART,'track_curve_left.png'))
back=ImageOps.mirror(base); bd=ImageDraw.Draw(back)
bd.rectangle((0,61,960,69),fill=(232,242,229))
for xx in range(30,960,110):
    bd.polygon([(xx,55),(xx,30),(xx+26,38),(xx,46)],fill=(255,205,36))
    bd.line((xx,45,xx,75),fill=(24,39,44),width=2)
back.save(os.path.join(ART,'track_backstraight.png'))
finish=base.copy(); fd=ImageDraw.Draw(finish)
for yy in range(75,309,14):
    for xx in range(830,857,14):
        fg=(240,244,239) if ((yy-75)//14+(xx-830)//14)%2 else (20,21,30)
        fd.rectangle((xx,yy,xx+13,yy+13),fill=fg)
fd.rectangle((824,69,859,76),fill=(239,233,211))
fd.rectangle((824,310,859,318),fill=(239,233,211))
finish.save(os.path.join(ART,'track_finish.png'))
# 3 backgrounds and UI accents
marquee=Image.new('RGBA',(960,68),(10,12,31,255));dd=ImageDraw.Draw(marquee)
for xx in range(7,954,10):
  for yy in range(9,61,11):
    if random.random() <.5:dd.rectangle((xx,yy,xx+3,yy+3),fill=(68,18,62,255))
dd.rectangle((4,4,956,63),outline=(129,87,230,255),width=3)
marquee.save(os.path.join(ART,'marquee.png'))
# extra icon assets
for name,col in [('win',(244,217,19)),('credit',(20,218,203)),('start',(44,202,58)),('clear',(230,52,70))]:
    im=Image.new('RGBA',(64,64));d=ImageDraw.Draw(im)
    d.rectangle((4,4,59,59),fill=(10,12,25),outline=col,width=4)
    d.ellipse((14,14,49,49),outline=col,width=5)
    d.rectangle((29,18,34,44),fill=col)
    im.save(os.path.join(ART,f'icon_{name}.png'))
# 8-bit synthesized arcade audio; all original procedural samples
RATE=22050
def wav(name,signal):
    s=np.asarray(signal,dtype=float)
    if len(s)<1:return
    s=np.clip(s,-1,1);s=(np.int16(s*24500))
    with wave.open(os.path.join(AUDIO,name+'.wav'),'wb') as f:
      f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(s.tobytes())
def tone(freq,dur,amp=.27,shape='square'):
    t=np.arange(round(dur*RATE))/RATE
    phase=2*np.pi*freq*t
    s=np.sign(np.sin(phase)) if shape=='square' else np.sin(phase)
    e=np.minimum(1,t/.009)*np.minimum(1,(dur-t)/.035)
    return s*amp*np.clip(e,0,1)
def series(notes):return np.concatenate([tone(f,dt,vol) for f,dt,vol in notes])
wav('bet',series([(820,.055,.24),(1180,.07,.20)]))
wav('cancel',series([(620,.06,.17),(390,.09,.15)]))
wav('start',series([(440,.11,.21),(550,.11,.21),(660,.11,.24),(880,.25,.23)]))
wav('win',series([(659,.13,.21),(784,.13,.21),(988,.13,.22),(1318,.26,.25),(988,.11,.2),(1318,.35,.25)]))
wav('finish',series([(370,.15,.19),(554,.15,.21),(740,.19,.23)]))
wav('error',series([(225,.13,.13),(175,.19,.13)]))
steps=[]
for i in range(22):
    dur=.077;t=np.arange(round(dur*RATE))/RATE
    noise=np.random.default_rng(i+86).normal(0,1,t.size)
    env=np.exp(-t*52)
    pulse= np.sin(2*np.pi*55*t)*.48+noise*.24
    steps.append(pulse*env*.34)
wav('gallop',np.concatenate(steps))
# A static preview of the offline game, made from the same original PNGs.
prev=Image.new('RGB',(960,720),(9,11,26));pd=ImageDraw.Draw(prev)
prev.paste(marquee,(0,0),marquee)
try:
 font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',25)
 small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',16)
 num=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',14)
except:font=None;small=None;num=None
pd.text((351,17),'GOLDEN HORSE 86',font=font,fill=(247,220,36))
pd.text((303,49),'ORIGINAL ASSET RECONSTRUCTION',font=num,fill=(203,144,209))
prev.paste(base,(0,74))
for i in range(6):
    ho=draw_horse(i,i%4).resize((135,85),Image.Resampling.NEAREST)
    prev.paste(ho,(30+i*112,93+i*46),ho)
pd.rectangle((0,412,959,655),fill=(9,11,31))
pd.text((22,423),'TOP TWO - 15 UNORDERED PAIRS (PROVISIONAL)',font=small,fill=(42,224,193))
for k,(a,b) in enumerate((a,b) for a in range(1,7) for b in range(a+1,7)):
    row=k//5; col=k%5; x=19+col*188; y=461+row*61
    pd.rectangle((x,y,x+173,y+53),fill=(24,25,54),outline=(53,168,210),width=2)
    pd.text((x+10,y+5),f'{a}-{b}',font=small,fill=(255,235,70))
    pd.text((x+10,y+30),'BET 0',font=num,fill=(152,242,75))
pd.rectangle((0,655,959,719),fill=(7,16,27))
pd.text((15,665),'CREDIT 500',font=font,fill=(34,238,178))
pd.text((249,665),'BET 0',font=font,fill=(255,243,87))
pd.text((412,665),'TIME 30',font=font,fill=(255,85,74))
pd.rectangle((746,661,840,706),fill=(82,64,83),outline=(235,201,112),width=2)
pd.rectangle((846,661,946,706),fill=(31,101,54),outline=(141,229,184),width=2)
pd.text((757,670),'CLEAR',font=small,fill=(255,255,255))
pd.text((861,670),'START',font=small,fill=(255,255,255))
prev.save(os.path.join(ROOT,'preview.png'))
# Demonstration still for the newly implemented bend. Screenshot composed from
# project assets; not a frame from the 1986 original or from an actual ROM.
turn=Image.new('RGB',(960,720),(9,11,26));turn.paste(marquee,(0,0),marquee)
td=ImageDraw.Draw(turn)
td.text((338,15),'GOLDEN HORSE 86',font=font,fill=(247,220,36))
td.text((376,48),'TURN PROTOTYPE',font=num,fill=(203,144,209))
curve=curve_texture('right');turn.paste(curve,(0,74))
# Pose reconstruction samples right-bend 48% into the segment.
for i in reversed(range(6)):
    near=122+i*43; far=125+i*30; t=.48; n=1-t
    x=(n**3*755 +3*n*n*t*895+3*n*t*t*885+t**3*750)-i*3
    y=n**3*near+3*n*n*t*(near-25)+3*n*t*t*(far+8)+t**3*far
    horse=draw_horse(i,i%4)
    horse=horse.resize((int(128*.84),int(80*.84)),Image.Resampling.NEAREST)
    turn.paste(horse,(round(x-horse.width/2),round(y-horse.height/2)),horse)
# Reuse existing bottom panel to make this a full gameplay scene preview.
turn.paste(prev.crop((0,412,960,720)),(0,412))
turn.save(os.path.join(ROOT,'preview_turn.png'))
print('Created',len(os.listdir(ART)),'png resources,',len(os.listdir(AUDIO)),'wav files')
