'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {EquipmentCatalog}=require('../.test/presentation/equipment/EquipmentCatalog.js');
const {raceScreen}=require('../.test/presentation/equipment/RaceScreen.js');
const {read}=require('./helpers/png-inspect.cjs');
const raw=JSON.parse(fs.readFileSync('assets/resources/race/equipment-catalog.json'));
const catalog=EquipmentCatalog.parse(raw),hashes=new Set();
assert.equal(catalog.items.length,12);
for(const item of catalog.items){
 const file='assets/resources/race/equipment/'+item.id+'.png',bytes=fs.readFileSync(file),img=read(file);
 assert.equal(img.w,item.sourceWidth);assert.equal(img.h,item.sourceHeight);
 assert.ok(bytes.equals(fs.readFileSync('art/final/gameplay/'+(item.id==='starting-gate'?'r06':'r05')+'/'+item.id+'.png')),'runtime retains the selected original');
 hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
 let transparent=0,opaque=0;for(let i=3;i<img.pixels.length;i+=4){if(img.pixels[i]===0)transparent++;if(img.pixels[i]>=250)opaque++;}
 assert.ok(transparent>img.w*img.h*.1,'transparent outside silhouette: '+item.id);assert.ok(opaque>1000,'visible silhouette: '+item.id);
 for(const p of item.positions){const top=p.y-p.width*item.frame.height/item.frame.width;
  // Straight sections occupy y=80..320 and 680..920. Every asset sits outside them.
  if(item.id!=='starting-gate')assert.ok(p.y<=80||top>=320&&p.y<=680||top>=920,'equipment must stay outside straight road: '+item.id);
 }
}
assert.equal(hashes.size,12,'each type is an independent image');
assert.deepEqual(catalog.items.filter(s=>s.mode!=='static').map(s=>s.id),['camera','warning','screen','starting-gate']);
assert.deepEqual(catalog.get('starting-gate').positions.map(p=>p.y),[320,280,240,200,160,120]);
for(const mutate of [v=>v.items.pop(),v=>v.items[1].id=v.items[0].id,v=>v.items[0].frame.width=99999,v=>v.items[8].window.x=0,v=>v.items[0].positions[0].width=0]){
 const bad=JSON.parse(JSON.stringify(raw));mutate(bad);assert.throws(()=>EquipmentCatalog.parse(bad));
}
const result={round:4,first:2,second:6};
assert.equal(raceScreen('betting',5,'冠军赛',0,null,0,5).text,'冠军赛\n第 5 场 · 等待开跑');
for(const [seconds,text] of [[3,'3'],[1.9,'2'],[.1,'1']])assert.ok(raceScreen('preparing',5,'冠军赛',seconds,null,0,5).text.endsWith(text));
assert.equal(raceScreen('racing',4,'冠军赛',0,null,0,5).mode,'live');
assert.equal(raceScreen('result',4,'冠军赛',0,result,4.999,5).text,'第 4 场\n冠军 2  亚军 6');
assert.equal(raceScreen('result',4,'冠军赛',0,result,5,5).mode,'live');
assert.equal(raceScreen('betting',5,'冠军赛',0,null,0,5).mode,'betting');
console.log('EquipmentAssets: 12 equipment types, static/dynamic modes, alpha, placement/crop integrity and screen state boundaries passed.');
