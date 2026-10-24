'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,dependencies){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:n=>{if(n in dependencies)return dependencies[n];throw Error(n);}});return exports;}
class Node {
 constructor(name){this.name=name;this.children=[];this.position={x:0,y:0};this.active=true;this.components=new Map();}
 set parent(value){if(this.owner)this.owner.children.splice(this.owner.children.indexOf(this),1);this.owner=value;if(value)value.children.push(this);}
 get parent(){return this.owner;}
 setPosition(x,y){this.position={x,y};}setScale(){}
 getSiblingIndex(){return this.parent.children.indexOf(this);}
 setSiblingIndex(index){const c=this.parent.children;c.splice(c.indexOf(this),1);c.splice(Math.min(index,c.length),0,this);}
 addComponent(Type){const c=new Type();c.node=this;this.components.set(Type,c);if(Type===Mask)this.addComponent(Graphics);return c;}
 getComponent(Type){return this.components.get(Type);}
 destroy(){this.destroyScheduled=true;}
}
class UITransform{setAnchorPoint(){}setContentSize(){}}
class Sprite{}Sprite.SizeMode={CUSTOM:0};
class Graphics{clear(){}moveTo(){}lineTo(){}close(){}fill(){}stroke(){}}
class Mask{}Mask.Type={GRAPHICS_STENCIL:1};class Color{fromHEX(){return this;}}
const cc={Node,UITransform,Sprite,Graphics,Mask,Color,Layers:{Enum:{UI_2D:1}}};
const track=require('../.test/TrackVisual.js'),layer={RACE_WORLD_LAYER:2};
const {RaceTrackView}=load('assets/scripts/RaceTrackView.ts',{'cc':cc,'./presentation/equipment/RaceLayers':layer,'./TrackVisual':track,'./presentation/MobileLayout':require('../.test/presentation/MobileLayout.js')});
const {EquipmentScene}=load('assets/scripts/presentation/equipment/EquipmentScene.ts',{'cc':cc,'./RaceLayers':layer,'./RaceBroadcast':{},'./EquipmentAnimation':require('../.test/presentation/equipment/EquipmentAnimation.js'),'../../TrackVisual':track});
const {EquipmentCatalog}=require('../.test/presentation/equipment/EquipmentCatalog.js'),{EquipmentMotionCatalog}=require('../.test/presentation/equipment/EquipmentMotionCatalog.js');
const motion=EquipmentMotionCatalog.parse(JSON.parse(fs.readFileSync('assets/resources/race/equipment-motion.json')));
const assets={catalog:{get:id=>({equipment:id==='championship'?['starting-gate']:[]})},equipmentCatalog:EquipmentCatalog.parse(JSON.parse(fs.readFileSync('assets/resources/race/equipment-catalog.json'))),equipment:new Map([['starting-gate',{}]]),motionCatalog:motion,motionFrames:new Map(motion.parts.map(p=>[p.resource,p.frames.map(()=>({}))]))};
const course=Object.create(RaceTrackView.prototype);course.world=new Node('world');course.horseLayer=new Node('horses');course.horseLayer.parent=course.world;
const preRace=require('../.test/presentation/PreRaceArtCatalog.js').PreRaceArtCatalog.parse(JSON.parse(fs.readFileSync('assets/resources/race/pre-race-art.json')));
Object.assign(assets,{ground:new Map(),props:{get:()=>({rect:{width:1,height:1}})},preRaceCatalog:preRace,preRaceFrames:new Map([[preRace.starter.resource,preRace.starter.frames.map(()=>({}))]])});
course.tiles=course.rect=course.label=course.sprite=()=>{};course.decorate(assets);
const starter=course.horseLayer.children.find(n=>n.name==='AnimatedStarter');assert.ok(starter,'actual decoration must put starter in depth layer');assert.equal(starter.position.y,-350);
for(let i=0;i<6;i++){course.updateStarter(assets,i);assert.equal(starter.position.x,535);assert.equal(starter.position.y,-350);}
const horses=Array.from({length:6},(_,i)=>{const n=new Node('Horse_'+(i+1));n.setPosition(400,-track.coursePoint(i,0).y);n.parent=course.horseLayer;return n;});
const scene=new EquipmentScene(course,new Node('host'),assets);scene.setTier('championship');course.sortDepth();
const visible=()=>course.horseLayer.children.filter(n=>n.active),order=()=>visible().filter(n=>n!==starter).map(n=>n.name);
assert.equal(visible().at(-1),starter,'starter covers all more distant starting horses');
assert.deepEqual(order(),['GateFarRail','Horse_6','GateNearRail6','Horse_5','GateNearRail5','Horse_4','GateNearRail4','Horse_3','GateNearRail3','Horse_2','GateNearRail2','Horse_1','GateNearRail1']);
for(let i=1;i<=6;i++){
 const names=order(),horse=names.indexOf('Horse_'+i),near=names.indexOf('GateNearRail'+i);
 assert.ok(horse<near,'own near rail must cover the horse');if(i>1)assert.ok(near<names.indexOf('Horse_'+(i-1)),'closer lane horse must cover the far rail');
}
assert.equal(visible().filter(n=>n.name.startsWith('Gate')).length,7);
const focus={round:1,phase:'betting',raceElapsed:0,preparationRemaining:0,horse:1,point:{x:400,y:300}};
for(const [phase,time,frame] of [['betting',0,0],['preparing',0,0],['racing',.1,1],['racing',.2,2],['racing',.3,3],['betting',0,0]]){
 scene.update(.016,{mode:'off',text:''},{...focus,phase,raceElapsed:time});const gates=scene.observation.gates;assert.equal(gates.length,6);assert.ok(gates.every(g=>g.frame===frame&&g.renderedFrame===frame));assert.deepEqual(order(),['GateFarRail','Horse_6','GateNearRail6','Horse_5','GateNearRail5','Horse_4','GateNearRail4','Horse_3','GateNearRail3','Horse_2','GateNearRail2','Horse_1','GateNearRail1']);
}
// Ground-depth crossing must reorder actual nodes rather than retain a fixed horse-only list.
horses[5].setPosition(600,-400);course.sortDepth();assert.equal(order().at(-1),'Horse_6');assert.equal(visible().at(-1),horses[5],'a closer horse covers starter rather than a fixed overlay');
const oldGates=visible().filter(n=>n.name.startsWith('Gate'));scene.setTier('station');assert.ok(oldGates.every(n=>!n.active&&n.destroyScheduled),'deferred destruction must not leave a visible ghost');assert.equal(visible().length,7);assert.equal(scene.observation.gates.length,0);
scene.setTier('championship');course.sortDepth();assert.equal(visible().length,14);scene.dispose();assert.equal(visible().length,7);assert.ok(horses.every(n=>n.active));
console.log('GateOcclusion: actual per-lane interleaving, seven shared boundaries, six synchronized doors, depth changes and deferred tier/dispose cleanup passed.');
