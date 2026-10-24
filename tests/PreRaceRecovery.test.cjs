const assert=require('node:assert/strict'),{PreRacePresentation}=require('../.test/presentation/PreRacePresentation.js');
for(const phase of ['betting','preparing','racing','result'])for(const seed of [1,123,811]){
 const c=new PreRacePresentation(seed),state={round:1,phase,preparationRemaining:phase==='preparing'?1.8:0,raceElapsed:phase==='racing'?6:0,eventId:'championship'};
 for(let i=0;i<10;i++)c.update(.1,state);const saved=c.exportSnapshot(),copy=new PreRacePresentation(999);copy.restore(JSON.parse(JSON.stringify(saved)),state);assert.deepEqual(copy.exportSnapshot(),saved);assert.deepEqual(copy.cameraCue,c.cameraCue);assert.deepEqual(copy.observation.horseFrames,c.observation.horseFrames);assert.equal(copy.cues.length,0,'resume emits no broadcast/countdown/latch');
 c.update(.1,state);copy.update(.1,state);assert.deepEqual(copy.exportSnapshot(),c.exportSnapshot());
}
const quiet=new PreRacePresentation(1),s={round:1,phase:'betting',preparationRemaining:0,raceElapsed:0,eventId:'station'};quiet.update(0,s,true);assert.deepEqual(quiet.cameraCue,{x:0,y:0,ratio:1});
assert.throws(()=>quiet.restore({...quiet.exportSnapshot(),shot:7},s));console.log('PreRaceRecovery: stable shot, cosmetic RNG/clock/poses, no phase cue replay and reduced camera passed.');
