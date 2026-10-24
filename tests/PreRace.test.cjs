'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),vm=require('node:vm'),ts=require('typescript');
const {PreRacePresentation,PRE_RACE_SHOTS}=require('../.test/presentation/PreRacePresentation.js');
const {PreRaceArtCatalog}=require('../.test/presentation/PreRaceArtCatalog.js');
const {RaceModel}=require('../.test/RaceModel.js');
const {read}=require('./helpers/png-inspect.cjs');
const state=(phase='betting',remaining=3,round=1,eventId='championship')=>({phase,preparationRemaining:remaining,raceElapsed:0,round,eventId});
const shots=new Set();
// Count action appearances; the duration of each authored motion stays unchanged.
const waiting=state(),idle=new PreRacePresentation(123);idle.update(0,waiting);
const counts=Array.from({length:6},(_,i)=>({ordinary:0,special:idle.horse(i).frame>=4?1:0}));let flags=0,hoof=0,previous=idle.observation.horseFrames,lastFlag=idle.flagFrame;
for(let k=0;k<24000;k++){
 idle.update(.01,waiting);const now=idle.observation.horseFrames;
 now.forEach((f,i)=>{if(f===1&&previous[i]!==1)counts[i].ordinary++;if((f===4||f===6)&&previous[i]!==f)counts[i].special++;});
 if(idle.flagFrame===1&&lastFlag!==1)flags++;hoof+=idle.cues.filter(c=>c==='hoof').length;previous=now;lastFlag=idle.flagFrame;
}
assert.equal(flags,80);assert.equal(hoof,30,'five paw cues per horse in 240 seconds');
for(const c of counts){assert.equal(c.ordinary,30);assert.ok(c.special>=10&&c.special<=11);}
const sample=(elapsed,index=0)=>{const c=new PreRacePresentation(123);c.update(0,waiting);c.restore({...c.exportSnapshot(),elapsed},waiting);return {horse:c.horse(index).frame,flag:c.flagFrame,camera:c.cameraCue};};
for(const [t,f] of [[0,4],[.41,5],[.81,0],[2,0],[6,0],[6.5,1],[7,2],[7.5,3],[8,0],[24,6],[24.41,7],[24.81,0]])assert.equal(sample(t).horse,f,'natural horse frames at '+t);
for(const [t,f] of [[0,0],[.5,1],[1,0],[2.9,0],[3,0],[3.5,1]])assert.equal(sample(t).flag,f,'natural flag frames at '+t);
assert.deepEqual(sample(60).camera,sample(0).camera,'idle cadence must not alter waiting camera');
for(let seed=1;seed<=100;seed++){
 const c=new PreRacePresentation(seed*811);let previous=-1;
 for(let round=1;round<=10;round++){
  c.update(0,state('betting',3,round));const choice=c.observation.shot;shots.add(choice);assert.notEqual(choice,previous);previous=choice;
  const pose={...c.cameraCue};for(let k=0;k<6;k++)c.update(.1,state('betting',3,round));assert.deepEqual(c.cameraCue,pose);
  c.update(0,state('betting',3,round,'station'));assert.equal(c.observation.shot,choice,'tier selection cannot reroll the shot');
  for(const remaining of [3,2.5,2,1.5,1,.5,.01]){
   c.update(0,state('preparing',remaining,round));const f=c.cameraCue;assert.ok(f.ratio>=PRE_RACE_SHOTS[choice].ratio&&f.ratio<=1);
   if(remaining<=1)assert.deepEqual(f,{x:0,y:0,ratio:1});
  }
  c.update(0,state('racing',0,round));assert.deepEqual(c.cameraCue,{x:0,y:0,ratio:1});
 }
}
assert.deepEqual([...shots].sort(),[0,1,2]);
const c=new PreRacePresentation(123);c.update(0,state());c.betFeedback(1,6,0);assert.equal(c.horse(0).highlight,1);assert.equal(c.horse(5).highlight,1);assert.equal(c.horse(2).highlight,0);
c.update(.1,state());assert.ok(c.cellScale(0)<1);c.betFeedback(1,6,0);assert.equal(c.horse(0).highlight,1,'repeated feedback restarts rather than accumulates');
for(let k=0;k<4;k++)c.update(.1,state());assert.equal(c.cellScale(0),1);assert.equal(c.horse(0).highlight,0);
let cues=[];for(const remaining of [3,2.9,2.1,2,1.9,1,.5,.01]){c.update(.016,state('preparing',remaining));cues.push(...c.cues);assert.ok(c.horse(0).frame<4||c.horse(0).frame>=8,'preparation stops casual head/paw actions');}
c.update(.016,state('racing',0));cues.push(...c.cues);c.update(.016,state('racing',0));cues.push(...c.cues);
assert.equal(cues.filter(x=>x==='countdown').length,3);assert.equal(cues.filter(x=>x==='broadcast').length,1);assert.equal(cues.filter(x=>x==='latch').length,1);
let draws=0;const m=new RaceModel(()=>{draws++;return .3;});m.placeBet('3-4',1);m.startRace();while(m.phase==='racing'){m.update(1/60);c.update(1/60,m);}assert.equal(draws,5);assert.deepEqual(m.lastResult.order.slice(0,2),[4,3]);
const raw=JSON.parse(fs.readFileSync('assets/resources/race/pre-race-art.json')),catalog=PreRaceArtCatalog.parse(raw);assert.equal(catalog.parts.reduce((sum,p)=>sum+p.frames.length,0),66);
assert.deepEqual(catalog.idleTiming,{horseRepeatSeconds:6,horseSpecialRepeatSeconds:24,starterRepeatSeconds:3});
for(const mutate of [v=>v.idleTiming.horseRepeatSeconds=1,v=>v.idleTiming.horseSpecialRepeatSeconds=25,v=>v.idleTiming.starterRepeatSeconds=NaN]){const bad=structuredClone(raw);mutate(bad);assert.throws(()=>PreRaceArtCatalog.parse(bad));}
// The actual source podium right edge and ground line must not move with the flag.
const podiumRight=[424,925,1405,424,925,1405],ground=[469,469,469,949,949,949];
catalog.starter.frames.forEach((f,i)=>{const scale=f.width/f.rect.width;assert.ok(Math.abs(scale-110/443)<1e-12);assert.ok(Math.abs(podiumRight[i]-f.rect.x-f.anchor.x*f.rect.width-(424-305.95))<=1);assert.equal(f.rect.y+f.rect.height,ground[i]);});
assert.equal(catalog.starter.frames[0].rect.y+catalog.starter.frames[0].rect.height,469,'no next-row flag pixels');assert.equal(catalog.starter.frames[3].rect.y,506,'full raised flag above 512px split');
const recipeWrites=new Map(),recipePath=require('path').resolve('art/work/gameplay/r09/calibrate.cjs');
vm.runInNewContext(fs.readFileSync(recipePath,'utf8'),{__dirname:require('path').dirname(recipePath),console:{log(){}},require:n=>n==='fs'?{...fs,mkdirSync(){},writeFileSync:(file,value)=>recipeWrites.set(require('path').resolve(file),value)}:require(n)});
assert.deepEqual(JSON.parse(recipeWrites.get(require('path').resolve('assets/resources/race/pre-race-art.json'))),raw,'calibration recipe reproduces registered runtime metadata without editing pixels');
for(const mutate of [v=>v.horses.pop(),v=>v.horses[0].frames.pop(),v=>v.horses[0].resource=v.horses[1].resource,v=>v.starter.frames[0].rect.width=99999,v=>v.horses[0].frames[0].anchor.x=NaN]){const bad=structuredClone(raw);mutate(bad);assert.throws(()=>PreRaceArtCatalog.parse(bad));}
const manifest=JSON.parse(fs.readFileSync('art/final/gameplay/r09/manifest.json'));
for(const item of manifest.assets){const bytes=fs.readFileSync(item.runtime);assert.ok(bytes.equals(fs.readFileSync(item.source)));assert.ok(bytes.equals(fs.readFileSync('art/final/gameplay/r09/'+item.file)));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256);}
for(const part of catalog.parts){
 const img=read('assets/resources/race/pre-race/'+part.resource+'.png');assert.equal(img.w,part.sourceWidth);assert.equal(img.h,part.sourceHeight);
 let transparent=0;for(let a=3;a<img.pixels.length;a+=4)if(img.pixels[a]===0)transparent++;assert.ok(transparent>img.w*img.h*.25);
 const hashes=new Set();for(const f of part.frames){let pixels=[];for(let y=f.rect.y;y<f.rect.y+f.rect.height;y++)pixels.push(img.pixels.subarray((y*img.w+f.rect.x)*4,(y*img.w+f.rect.x+f.rect.width)*4));hashes.add(crypto.createHash('sha256').update(Buffer.concat(pixels)).digest('hex'));assert.ok(f.height<=110.001);}
 assert.equal(hashes.size,part.frames.length,'authored poses must differ');
}
// Actual authored frame extents must fit all pre-race shots and close transitions.
const {raceFraming,mobileLayout}=require('../.test/presentation/MobileLayout.js');
for(const height of [1000,1334,1623,1750]){
 const layout=mobileLayout(height),base=raceFraming(750,layout.raceHeight);
 for(const shot of PRE_RACE_SHOTS)for(const t of [0,.25,.5,.75,1]){
  const ease=t*t*(3-2*t),zoom=base.zoom*(shot.ratio+(1-shot.ratio)*ease),cx=400+shot.x*(1-ease),cy=125+shot.y*(1-ease);
  catalog.horses.forEach((part,i)=>{const x=375+(400-cx)*zoom,y=layout.raceHeight/2+45+(300-i*40-cy)*zoom;
   assert.ok(y-150*zoom>=89&&y<=layout.raceHeight,'badge and feet stay in race viewport');
   for(const f of part.frames)assert.ok(x-f.width*f.anchor.x*1.05*zoom>=0&&x+f.width*(1-f.anchor.x)*1.05*zoom<=750,'complete idle silhouette in all shots');
  });
 }
}
// Real optional audio controller: input unlock, no replay every frame, tier volume and late callbacks.
const loads=[],sources=[],nativeLoads=[];
class AudioSource{constructor(){this.volume=1;this.stopped=0;sources.push(this);}set clip(value){this.value=value;if(value)nativeLoads.push(()=>{if(this.value===value&&!this.destroyed&&this.pendingPlay)this.nativeStarts=(this.nativeStarts||0)+1;});}get clip(){return this.value;}play(){this.pendingPlay=true;this.started=(this.started||0)+1;}stop(){this.stopped++;this.pendingPlay=false;}playOneShot(){throw Error('Unowned one-shot sound');}destroy(){this.destroyed=true;}}
const exportsAudio={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/scripts/presentation/PreRaceAudio.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsAudio,require:n=>{if(n==='../session/PlayerSettings')return require('../.test/session/PlayerSettings.js');assert.equal(n,'cc');return {AudioSource,AudioClip:class{},resources:{load:(url,type,cb)=>loads.push({url,cb})}};}});
(async()=>{
 const audio=new exportsAudio.PreRaceAudio({addComponent:Type=>new Type()});const ready=audio.load();assert.equal(loads.length,5);loads.forEach(x=>x.cb(null,{}));await ready;
 audio.update(state(),['countdown']);assert.equal(sources[0].started,undefined,'browser gesture unlock required');audio.unlock();
 audio.update(state('betting',3,1,'station'),[]);const station=sources[0].volume;audio.update(state('betting',3,1,'championship'),[]);assert.ok(sources[0].volume>station);assert.equal(sources[0].started,1);
 audio.update(state('preparing',.5),['countdown']);assert.equal(sources[0].volume,.095*.25);assert.equal(sources[1].started,1);
 audio.update(state('racing',0),['latch']);assert.equal(audio.observation.looping,false);audio.dispose();audio.dispose();assert.ok(sources.slice(0,5).every(s=>s.destroyed&&s.clip===null));
 nativeLoads.forEach(resolve=>resolve());assert.ok(sources.slice(0,5).every(s=>!s.nativeStarts),'late native load cannot play after dispose');
 const failed=new exportsAudio.PreRaceAudio({addComponent:Type=>new Type()}),loading=failed.load();loads.slice(-5).forEach((x,i)=>x.cb(i===0?Error('optional missing'):null,{}));await loading;assert.equal(failed.observation.loaded,4);assert.equal(failed.warnings.length,1);failed.dispose();
 const late=new exportsAudio.PreRaceAudio({addComponent:Type=>new Type()}),pending=late.load();late.dispose();loads.slice(-5).forEach(x=>x.cb(null,{}));await pending;assert.equal(late.observation.loaded,0);
 console.log('PreRace: 3 stable nonrepeating shots, 2-second close/1-second hold, cue/feedback edges, independent RNG, 66 calibrated poses, source hashes and optional audio lifecycle passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
