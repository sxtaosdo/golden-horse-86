'use strict';
const assert=require('node:assert/strict');
const {RacePace,COURSE_BREAKS,FINAL_STRAIGHT_START,coursePoint}=require('../.test/TrackVisual.js');
const {RaceModel}=require('../.test/RaceModel.js');
const rate=(t,finish=24)=>{const h=1e-5;return (RacePace.progress(t+h,finish,24)-RacePace.progress(Math.max(0,t-h),finish,24))/(t?h*2:h);};
assert.equal(RacePace.progress(0,24),0);
assert.ok(rate(.1)<rate(.5)&&rate(.5)<rate(1.5)&&rate(1.5)<rate(3),'launch builds speed rather than instant cruising');
assert.ok(rate(9.6)<rate(4)&&rate(15.84)<rate(13),'bend ends with a controlled pace');
assert.ok(rate(16)<rate(18)&&rate(18)<rate(20)&&rate(20)<rate(23),'home straight accelerates again');
assert.ok(Math.abs(RacePace.progress(9.6,24)-COURSE_BREAKS[1])<1e-10);
assert.ok(Math.abs(RacePace.progress(15.84,24)-FINAL_STRAIGHT_START)<1e-10);
for(const finish of [24,24.35,25.75]){
 for(const t of [1.56,3.6,6.96,9.6,15.84,finish]){
  const h=1e-4,a=(RacePace.progress(t,finish,24)-RacePace.progress(t-h,finish,24))/h,b=(RacePace.progress(t+h,finish,24)-RacePace.progress(t,finish,24))/h;
  assert.ok(Math.abs(a-b)<1e-5,'velocity continuous at '+t);
 }
 let previous=0;
 for(let t=0;t<32;t+=.001){const p=RacePace.progress(t,finish,24);assert.ok(p>=previous-1e-10&&Number.isFinite(p));previous=p;}
 assert.ok(Math.abs(RacePace.progress(finish,finish,24)-1)<1e-10,'original finish time retained');
}
// Real model at different frame rates: rank RNG consumption and crossing times remain unchanged.
for(const dt of [1/30,1/60,1/120]){
 let calls=0;const m=new RaceModel(()=>{calls++;return .3;});m.placeBet('3-4',1);m.startRace();assert.equal(calls,5);
 let previous=m.progress.slice(),stride=m.progress.slice();const crossings=[];
 while(m.phase==='racing'){
  m.update(dt);
  m.progress.forEach((p,i)=>{assert.ok(p>=previous[i]-1e-9);assert.ok(m.strideTime(i)>=stride[i]-1e-9);if(previous[i]<1&&p>=1)crossings.push({horse:i+1,time:m.raceElapsed});stride[i]=m.strideTime(i);});
  previous=m.progress.slice();
 }
 assert.deepEqual(crossings.map(x=>x.horse),m.lastResult.order);assert.equal(calls,5);
 crossings.forEach((x,rank)=>assert.ok(Math.abs(x.time-(24+.35*rank))<=dt+1e-8));
 const paid=m.credits;m.update(.1);assert.equal(m.credits,paid);assert.equal(m.history.length,1);
}
// Camera and horses share the pace; world scrolling also starts slowly and reaccelerates.
const worldSpeed=t=>{const h=.001,a=coursePoint(2.5,RacePace.progress(t-h,24)),b=coursePoint(2.5,RacePace.progress(t+h,24));return Math.hypot(b.x-a.x,b.y-a.y)/(2*h);};
assert.ok(worldSpeed(.5)<worldSpeed(2));assert.ok(worldSpeed(17)<worldSpeed(21));
console.log('RacePace: launch/bend/home acceleration, C1 joins, frame-rate invariant crossings, cadence and unchanged rank/payout passed.');
