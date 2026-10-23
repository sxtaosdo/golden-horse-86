'use strict';
const assert=require('node:assert/strict');
const { horsePose, trackSection, trackSectionName, COURSE_BREAKS }=require('../.test/TrackVisual.js');
const { RaceModel }=require('../.test/RaceModel.js');
assert.deepEqual(['straight','right-bend','finish'].map((_,i)=>trackSection((COURSE_BREAKS[i]+COURSE_BREAKS[i+1])/2)),
  ['straight','right-bend','finish']);
assert.equal(trackSection(-1),'straight');assert.equal(trackSection(1),'finish');
assert.equal(trackSectionName('right-bend'),'弯道');
for(let i=0;i<6;i++){
  for(let k=0;k<101;k++){
    const pose=horsePose(i,k/100,13.5);
    for(const prop of ['x','y','scale','angle'])assert.ok(Number.isFinite(pose[prop]),`${prop} horse ${i}`);
    assert.ok(pose.scale>=.6 && pose.scale<=1.1);
    assert.ok(pose.x>0&&pose.x<2600&&pose.y>80&&pose.y<920,'world coordinates must stay on the continuous course');
  }
  for(const at of COURSE_BREAKS.slice(1,-1)){
    const p1=horsePose(i,at-1e-6,0),p2=horsePose(i,at+1e-6,0);
    assert.ok(Math.abs(p1.x-p2.x)<1,`x path discontinuity at ${at} horse ${i}`);
    assert.ok(Math.abs(p1.y-p2.y)<1,`y path discontinuity at ${at} horse ${i}`);
    assert.ok(Math.abs(p1.scale-p2.scale)<.01);
  }
  assert.equal(horsePose(i,.1).flipX,false,'horses depart to the right');
  assert.equal(horsePose(i,.85).flipX,true,'horses finish to the left');
}
const m=new RaceModel(()=>.2);
m.placeBet('1-2',1);m.startRace();
const visited=new Set();let prev=0;
for(let frame=0;frame<320;frame++){
  m.update(.1);
  assert.ok(m.courseFraction+1e-9>=prev,'course animation must not run backwards');
  prev=m.courseFraction;
  visited.add(trackSection(m.courseFraction));
}
assert.deepEqual([...visited].sort(),['finish','right-bend','straight'].sort());
assert.equal(m.phase,'result');
console.log('TrackVisual: 600+ trajectory samples, smooth transitions, one bend, and race completion passed.');
