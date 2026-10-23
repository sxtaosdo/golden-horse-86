'use strict';
const assert=require('node:assert/strict');
const {RaceModel}=require('../.test/RaceModel.js');
const {horsePose,trackSection}=require('../.test/TrackVisual.js');

for(let horse=0;horse<6;horse++){
  const foot=horsePose(horse,0,0);
  assert.ok(foot.y-84>=73&&foot.y-84<=309,'feet must be inside the track texture');
  for(const middle of [(.22+.38)/2,(.57+.73)/2]){
    const before=horsePose(horse,middle-1e-5,0),after=horsePose(horse,middle+1e-5,0);
    assert.ok(Math.abs(before.angle-after.angle)<1,'bend must not snap its rotation at the midpoint');
    assert.equal(before.turn,after.turn,'same front/rear image must cover the direction change');
    assert.ok(before.sideOpacity<1e-12&&after.sideOpacity<1e-12,'side sprite must be invisible when its direction swaps');
    assert.ok(Math.abs(before.sideOpacity-after.sideOpacity)<1e-8,'turn blend must be continuous');
  }
  for(const [start,end,centre] of [[.22,.38,560],[.57,.73,300]]){
    for(let frame=1;frame<100;frame++){
      const point=horsePose(horse,start+(end-start)*frame/100,0);
      const x=point.x-centre,y=point.y-(84+195);
      assert.ok(x*x/(290*290)+y*y/(119*119)<=1.04,'hoof must stay inside outer bend rail');
      assert.ok(x*x/(170*170)+y*y/(11*11)>=.96,'hoof must not enter the infield');
    }
  }
}
for(const random of [()=>.01,()=>.3,()=>.99]){
  const model=new RaceModel(random);
  model.placeBet('3-4',10);model.startRace();
  const crossed=[];let previous=model.progress.slice();
  for(let frame=0;frame<1600&&model.phase==='racing';frame++){
    model.update(1/60);
    for(let horse=0;horse<6;horse++){
      assert.equal(trackSection(model.progress[horse]),trackSection(model.courseFraction),'horses and background must share the segment');
      assert.ok(model.progress[horse]>=previous[horse]-1e-8,'a horse must not run backwards');
      if(previous[horse]<1&&model.progress[horse]>=1)crossed.push(horse+1);
    }
    previous=model.progress.slice();
  }
  assert.equal(model.phase,'result');
  assert.deepEqual(crossed,model.lastResult.order,'visible finish order must equal settlement order');
  assert.ok(model.progress.every(value=>value>1),'every horse must actually run through the finish');
  const settled=model.progress.slice(),credits=model.credits;
  for(let frame=0;frame<120;frame++)model.update(1/60);
  assert.deepEqual(model.progress,settled,'settlement must preserve finishing positions');
  assert.equal(model.credits,credits,'settlement must pay once');
  model.startRace();
  assert.equal(model.lastResult,null,'next round must not show the previous payout');
  assert.equal(model.totalStake,0);
}
console.log('RacePresentation: track alignment, turn continuity, six real finish crossings, no settlement reset, next-round clearing passed.');
