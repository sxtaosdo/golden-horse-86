import math,random,wave,struct,shutil
from pathlib import Path
rate=22050;rng=random.Random(20261024);out=Path('art/work/gameplay/r09/generated')
def save(name,samples):
 peak=max(abs(v) for v in samples) or 1
 if peak>.85:samples=[v*.85/peak for v in samples]
 with wave.open(str(out/(name+'-r09.wav')),'wb') as w:
  w.setparams((1,2,rate,0,'NONE','not compressed'));w.writeframes(b''.join(struct.pack('<h',round(max(-1,min(1,v))*32767)) for v in samples))
def pulse(t,d):return math.sin(math.pi*min(1,t/d))**2
samples=[];low=0
voices=[(rng.uniform(130,255),rng.uniform(0,6.28),rng.uniform(.3,.65)) for _ in range(12)]
for i in range(rate*8):
 t=i/rate;low=.91*low+.09*rng.uniform(-1,1)
 babble=sum(.005*(.45+.55*math.sin(t*f+phase)**2)*(math.sin(2*math.pi*hz*t+phase)+.35*math.sin(2*math.pi*(hz*3.1)*t)) for hz,phase,f in voices)
 edge=min(1,t/.25,(8-t)/.25);samples.append(edge*(.18*low+babble))
save('ambience',samples)
for name,duration in [('countdown',.12),('broadcast',.55),('latch',.28),('hoof',.10)]:
 samples=[];low=0
 for i in range(round(rate*duration)):
  t=i/rate;noise=rng.uniform(-1,1);low=.8*low+.2*noise
  if name=='countdown':v=.25*math.sin(2*math.pi*740*t)*pulse(t,duration)
  elif name=='broadcast':
   segment=t%(.275);hz=660 if t<.275 else 880;v=.19*(math.sin(2*math.pi*hz*t)+.25*math.sin(2*math.pi*hz*2*t))*math.exp(-8*segment)*min(1,segment/.008)
  elif name=='latch':v=.38*noise*math.exp(-35*t)+.23*math.sin(2*math.pi*1450*t)*math.exp(-18*t)+(.32*low*math.exp(-45*(t-.09)) if t>=.09 else 0)
  else:v=.44*low*math.exp(-40*t)+.28*math.sin(2*math.pi*135*t)*math.exp(-60*t)
  samples.append(v*min(1,t/.003,(duration-t)/.008))
 save(name,samples)
print('Generated 5 original PCM16 mono atmosphere clips.')
