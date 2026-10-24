'use strict';
const assert=require('node:assert/strict');
const {RaceModel}=require('../.test/RaceModel.js');
const {horsePose,coursePoint,courseCamera,projectPoint,COURSE_BREAKS,COURSE_FINISH_X,HORSE_NOSE_X}=require('../.test/TrackVisual.js');
for(const boundary of COURSE_BREAKS.slice(1)){
  const before=coursePoint(2.5,boundary-1e-6),at=coursePoint(2.5,boundary),after=coursePoint(2.5,boundary+1e-6);
  assert.ok(Math.hypot(before.x-at.x,before.y-at.y)<.01,'world path must not jump at a segment boundary');
  assert.ok(Math.hypot(after.x-at.x,after.y-at.y)<.01,'run-out and track must join continuously');
  const v1=Math.hypot(at.x-before.x,at.y-before.y),v2=Math.hypot(after.x-at.x,after.y-at.y);
  assert.ok(v1/v2>.97&&v1/v2<1.03,'reference-lane speed must not jump at joins');
}
for(let lane=0;lane<6;lane++){
  for(let sample=0;sample<=1000;sample++){
    const point=coursePoint(lane,sample/1000);
    const dx=point.x>2000?point.x-2000:0;
    const dy=point.y-500;
    assert.ok(dx*dx/(540*540)+dy*dy/(420*420)<=1.001,'hoof must be inside outer rail');
    assert.ok(dx*dx/(300*300)+dy*dy/(180*180)>=.999,'hoof must be outside inner rail');
    const screen=projectPoint(point,courseCamera(sample/1000));
    assert.ok(screen.x>70&&screen.x<890&&screen.y>110&&screen.y<550,'tracking viewport must retain all six horses');
  }
  for(const [begin,end] of [[COURSE_BREAKS[1],COURSE_BREAKS[2]]]){
    const middle=(begin+end)/2,before=horsePose(lane,middle-1e-6,0),after=horsePose(lane,middle+1e-6,0);
    assert.ok(before.sideOpacity<1e-12&&after.sideOpacity<1e-12,'side sprite must be hidden at the direction swap');
    assert.equal(before.turn,after.turn);
  }
}
for(const random of [()=>.01,()=>.3,()=>.99]){
  const model=new RaceModel(random);model.placeBet('3-4',10);model.startRace();
  const crossed=[];let previous=model.progress.slice();
  for(let frame=0;frame<2400&&model.phase==='racing';frame++){
    model.update(1/60);
    for(let horse=0;horse<6;horse++){
      const pose=horsePose(horse,model.progress[horse],model.strideTime(horse));
      if(previous[horse]<1&&pose.x-HORSE_NOSE_X<=COURSE_FINISH_X&&model.progress[horse]>=1)crossed.push(horse+1);
      assert.ok(model.progress[horse]>=previous[horse]-1e-8,'forward progress');
    }
    previous=model.progress.slice();
  }
  assert.equal(model.phase,'result');assert.deepEqual(crossed,model.lastResult.order);
  const credits=model.credits,positions=model.progress.slice();
  for(let frame=0;frame<365;frame++)model.update(1/60);
  assert.equal(model.credits,credits,'pay once while run-out continues');
  assert.ok(model.progress.some((p,i)=>p>positions[i]),'result must not freeze the run-out');
  const camera=courseCamera(model.courseFraction);
  for(let horse=0;horse<6;horse++){
    const screen=projectPoint(horsePose(horse,model.progress[horse],model.strideTime(horse)),camera);
    assert.ok(screen.x>1035||screen.x< -75||screen.y<0||screen.y>760,'finishers must clear the race viewport including their side-sprite bounds');
  }
  model.startRace();assert.equal(model.lastResult,null);assert.equal(model.totalStake,0);
}
console.log('RacePresentation: continuous world/camera, join speeds, six world-space crossings, live run-out and next-round reset passed.');
