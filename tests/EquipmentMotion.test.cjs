'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {RaceModel}=require('../.test/RaceModel.js');
const {EquipmentAnimation}=require('../.test/presentation/equipment/EquipmentAnimation.js');
const {EquipmentMotionCatalog}=require('../.test/presentation/equipment/EquipmentMotionCatalog.js');
const {read}=require('./helpers/png-inspect.cjs');
const raw=JSON.parse(fs.readFileSync('assets/resources/race/equipment-motion.json')),catalog=EquipmentMotionCatalog.parse(raw);
assert.deepEqual(catalog.parts.map(p=>p.frames.length),[1,8,1,2,1,4]);
for(const part of catalog.parts){
 const img=read('assets/resources/race/equipment/'+part.resource+'.png');assert.equal(img.w,part.sourceWidth);assert.equal(img.h,part.sourceHeight);
 for(const f of part.frames){assert.ok(f.width>0&&f.height>0);assert.ok(f.anchor.x>=0&&f.anchor.x<=1&&f.anchor.y>=0&&f.anchor.y<=1);}
}
const manifest=JSON.parse(fs.readFileSync('art/final/gameplay/r06/manifest.json'));
for(const item of manifest.assets){
 const source=fs.readFileSync(item.source),final=fs.readFileSync('art/final/gameplay/r06/'+item.file),runtime=fs.readFileSync(item.runtime);
 assert.ok(source.equals(final)&&source.equals(runtime));assert.equal(crypto.createHash('sha256').update(source).digest('hex'),item.sha256);
 const im=read(item.runtime);let clear=0;for(let i=3;i<im.pixels.length;i+=4)if(!im.pixels[i])clear++;assert.ok(clear>im.w*im.h*.1,item.file);
}
for(const mutate of [v=>v.camera.head.frames.pop(),v=>v.warning.head.frames[0].rect.width=99999,v=>v.gate.head.frames[1].height=0,v=>v.camera.mount.y=NaN,v=>v.camera.turnDegreesPerSecond=0,v=>v.warning.blinkSeconds=0,v=>v.warning.head.resource=v.camera.head.resource]){
 const bad=structuredClone(raw);mutate(bad);assert.throws(()=>EquipmentMotionCatalog.parse(bad));
}
const origin={x:0,y:0},target=degrees=>({x:100*Math.cos(degrees*Math.PI/180),y:-100*Math.sin(degrees*Math.PI/180)});
for(let i=0;i<8;i++){const a=new EquipmentAnimation(180);assert.equal(a.update(0,1,origin,target(i*45)),i);}
const a=new EquipmentAnimation(180);a.update(0,1,origin,target(359));a.update(.1,1,origin,target(1));assert.ok(Math.abs(a.observation.angle-1)<1e-6,'use the short arc through zero');
a.update(.1,1,origin,target(91));assert.ok(Math.abs(a.observation.angle-19)<1e-6,'turn speed is bounded');
assert.equal(a.update(0,2,origin,target(180)),4,'new round resets pose');a.update(.1,2,origin,origin);assert.ok(Number.isFinite(a.observation.angle));
assert.equal(EquipmentAnimation.lampFrame('betting',0,.5),0);assert.equal(EquipmentAnimation.lampFrame('result',0,.5),0);
assert.notEqual(EquipmentAnimation.lampFrame('preparing',2.6,.5),EquipmentAnimation.lampFrame('preparing',2.4,.5));assert.equal(EquipmentAnimation.lampFrame('racing',0,.5),1);
for(const p of ['betting','preparing'])assert.equal(EquipmentAnimation.gateFrame(p,999,.3),0);
for(const [seconds,frame] of [[0,0],[.1,1],[.2,2],[.3,3],[10,3]])assert.equal(EquipmentAnimation.gateFrame('racing',seconds,.3),frame);
assert.equal(EquipmentAnimation.gateFrame('result',30,.3),3);assert.equal(EquipmentAnimation.gateFrame('betting',0,.3),0);
let draws=0;const model=new RaceModel(()=>{draws++;return 0;});model.placeBet('1-6',1);model.startRace();const before=draws;
model.progress.splice(0,6,.2,.1,.4,.3,.8,.5);assert.equal(model.leaderIndex,4);model.progress[0]=.9;assert.equal(model.leaderIndex,0);
model.progress.fill(0);assert.equal(model.leaderIndex,0,'equal starts choose stable horse number');assert.equal(draws,before,'leader queries never draw results');
console.log('EquipmentMotion: calibrated parts, eight bearings, bounded yaw, real leader, local lamp states and synchronized gate timing passed.');
