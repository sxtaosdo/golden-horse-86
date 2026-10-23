'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {RaceModel}=require('../.test/RaceModel.js');
const {RaceEventCatalog}=require('../.test/events/RaceEventCatalog.js');
const raw=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/resources/race/events.json')));
const catalog=RaceEventCatalog.parse(raw),rules=catalog.rules;
for(const [credits,id] of [[0,'station'],[999,'station'],[1000,'regional'],[2999,'regional'],[3000,'championship']]){
 const m=new RaceModel(()=>.3,{initialCredits:credits,events:rules});assert.equal(m.eventId,id);
 assert.equal(m.selectEvent('championship'),credits>=3000);assert.equal(m.credits,credits,'eligibility is not a fee');
}
const tick=(m,s)=>{for(let i=0;i<Math.round(s*10);i++)m.update(.1);};
let draws=0;const model=new RaceModel(()=>{draws++;return .3;},{initialCredits:1000,events:rules});
assert.ok(model.placeBet('3-4',50));assert.equal(model.eligibilityCredits,1000);assert.ok(model.canEnterEvent('regional'));
assert.ok(model.startRace());assert.equal(model.phase,'preparing');assert.equal(draws,0);
assert.equal(model.startRace(),false);assert.equal(model.selectEvent('station'),false);assert.equal(model.placeBet('3-4',-1),false);
model.clearBets();model.clearCredits();assert.equal(model.totalStake,50);assert.equal(model.credits,950);
tick(model,2.9);assert.equal(model.phase,'preparing');assert.equal(draws,0);assert.equal(model.raceElapsed,0);
tick(model,.1);assert.equal(model.phase,'racing');assert.equal(draws,5);tick(model,30);
assert.equal(model.phase,'result');const paid=model.credits;tick(model,6);assert.equal(model.credits,paid);
const legacy=new RaceModel(()=>.3,{initialCredits:1000});legacy.placeBet('3-4',50);legacy.startRace();tick(legacy,30);
assert.deepEqual(model.lastResult.order,legacy.lastResult.order);assert.equal(model.lastResult.payout,legacy.lastResult.payout);
assert.equal(model.lastResult.eventId,'regional');assert.equal(model.lastResult.round,1);
const automatic=new RaceModel(()=>.3,{events:rules,bettingSeconds:1});automatic.placeBet('1-6',1);tick(automatic,1);
assert.equal(automatic.phase,'preparing');tick(automatic,3);assert.equal(automatic.phase,'racing');
const empty=new RaceModel(()=>.3,{events:rules,bettingSeconds:1});tick(empty,4);assert.equal(empty.phase,'betting');
const loss=new RaceModel(()=>.3,{initialCredits:3000,events:rules});loss.placeBet('1-6',2000);loss.startRace();tick(loss,35);
assert.equal(loss.phase,'result');assert.equal(loss.credits,1000);assert.equal(loss.totalStake,2000);loss.nextRound();
assert.equal(loss.eventId,'regional','old consumed stake must not count towards the next admission');assert.equal(loss.totalStake,0);
assert.equal(loss.preparationRemaining,0);assert.equal(loss.lastResult,null);
for(const mutate of [v=>v.tiers[1].minCredits=0,v=>v.tiers[2].equipment.pop(),v=>v.tiers[0].id='oops',v=>v.preparationSeconds=NaN]){
 const bad=JSON.parse(JSON.stringify(raw));mutate(bad);assert.throws(()=>RaceEventCatalog.parse(bad));
}
assert.deepEqual(catalog.tiers.map(t=>t.equipment.length),[4,8,11]);
console.log('RaceEvents: admission boundaries, locked preparation, auto/manual start, unchanged RNG/payout and next-round downgrade passed.');
