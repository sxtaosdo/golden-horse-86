'use strict';
// A lightweight JavaScript Canvas browser simulation, for environments that
// block headless Chromium local navigation. It tests UI event-to-model wiring.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'preview-web/game.js'),'utf8');
const canvasHandlers={},windowHandlers={};
let raf=null, text=[], pathPoints=[];
const context2d={
  fillRect(){},strokeRect(){},clearRect(){},drawImage(){},save(){},restore(){},translate(){},rotate(){},scale(){},
  beginPath(){},rect(){},clip(){},moveTo(x,y){pathPoints.push({x,y});},lineTo(x,y){pathPoints.push({x,y});},closePath(){},fill(){},stroke(){},
  fillText(s){text.push(String(s))},
};
const canvas={getContext(){return context2d;}, style:{},
  addEventListener(type,fn){canvasHandlers[type]=fn;},
  getBoundingClientRect(){return {left:0,top:0,width:960,height:720};}
};
const window={innerWidth:960,innerHeight:720,
  addEventListener(type,fn){windowHandlers[type]=fn;}
};
class FakeImage {constructor(){this.complete=true;this.naturalWidth=0;this.src='';}}
class FakeAudio {constructor(){} play(){return Promise.resolve();}}
const globals={window,innerWidth:960,innerHeight:720, document:{getElementById:()=>canvas},Image:FakeImage,Audio:FakeAudio,
  requestAnimationFrame(fn){raf=fn;},performance:{now:()=>0},console,Math};
vm.runInNewContext(src,globals,{filename:'game.js',timeout:5000});
const frame=(time)=>{text=[];raf(time);return text;};
const send=(type,code)=>windowHandlers[type]({code,preventDefault(){}});
const click=(x,y,button=0)=>canvasHandlers.pointerdown({clientX:x,clientY:y,button});
const includes=(items,match)=>assert.ok(items.some(s=>s.includes(match)),`Expected text: ${match}`);
let screen=frame(100);assert.ok(pathPoints.some(p=>p.x===-1800),'U road must include both straight sections, not only the hairpin');includes(screen,'CREDIT 500');includes(screen,'BET 0');
assert.equal(screen.filter(s=>s==='1-2').length,1);
assert.equal(screen.filter(s=>s==='5-6').length,1);
click(35,483);screen=frame(200);includes(screen,'CREDIT 499');includes(screen,'BET 1');
click(35,483,2);screen=frame(300);includes(screen,'CREDIT 500');includes(screen,'BET 0');
send('keydown','F8');send('keydown','F9');send('keyup','F8');
screen=frame(400);includes(screen,'CREDIT 600');
click(35,483);send('keydown','Enter');screen=frame(500);
includes(screen,'RUN');
const stageNames=['起跑直道','弯道','终点直道'];
const stages=new Set();
for(let i=1;i<321;i++){
  screen=frame(500+i*100);
  for(const name of stageNames)if(screen.includes(name))stages.add(name);
}
assert.deepEqual([...stages].sort(),stageNames.slice().sort(), 'browser must render one bend and both straights');
includes(screen,'RESULT');
console.log('Preview smoke test: UI, controls, single-bend course, and result passed.');
