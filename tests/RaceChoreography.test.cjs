const assert=require('node:assert/strict');
const {RaceChoreography,RacePace,COURSE_BREAKS,FINAL_STRAIGHT_START}=require('../.test/TrackVisual.js');
const {RaceModel}=require('../.test/RaceModel.js');
const leaders=new Set();let changes=0;
for(let seed=1;seed<=64;seed++){
 let previous=Array(6).fill(0),leader=-1;
 for(let t=0;t<28;t+=.02){
  const poses=previous.map((_,i)=>RaceChoreography.progress(i,t,24+i*.35,24,seed*3181));
  poses.forEach((p,i)=>{assert.ok(Number.isFinite(p)&&p>=previous[i]-1e-10,'monotonic progress');assert.ok(Math.abs(p-RacePace.progress(t,24+i*.35,24))<=.012000001);});
  const next=poses.indexOf(Math.max(...poses));if(t>2&&t<15){leaders.add(next);if(leader!==-1&&leader!==next)changes++;leader=next;}previous=poses;
 }
 for(let i=0;i<6;i++){
  assert.equal(RaceChoreography.progress(i,24+i*.35,24+i*.35,24,seed*3181),1);
  for(const t of [9.6,15.84]){const h=.0001,f=x=>RaceChoreography.progress(i,x,24+i*.35,24,seed*3181);assert.ok(Math.abs((f(t)-f(t-h))/h-(f(t+h)-f(t))/h)<1e-5,'C1 section join');}
 }
}
assert.equal(leaders.size,6);assert.ok(changes>64,'seeded rivalry gives natural lead changes');
for(const dt of [1/30,1/60,1/120]){
 let draws=0;const m=new RaceModel(()=>{draws++;return .3;},{presentationSeed:123});m.placeBet('3-4',2);m.startRace();const crossed=[];let prev=m.progress.slice();
 while(m.phase==='racing'){m.update(dt);m.progress.forEach((p,i)=>{if(p>=1&&prev[i]<1)crossed.push({horse:i+1,time:m.raceElapsed});});assert.equal(m.leaderIndex,m.progress.indexOf(Math.max(...m.progress)));prev=m.progress.slice();}
 assert.equal(draws,5);assert.deepEqual(crossed.map(x=>x.horse),m.lastResult.order);assert.equal(m.lastResult.payout,80);crossed.forEach((x,i)=>assert.ok(Math.abs(x.time-24-i*.35)<=dt+1e-8));
}
console.log('RaceChoreography: 64 seeds, six leaders, C1 boundaries, bounded monotonic progress, original RNG/rank/payout and finish times passed.');
