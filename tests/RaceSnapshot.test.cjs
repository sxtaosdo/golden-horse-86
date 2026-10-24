const assert=require('node:assert/strict'),{RaceModel}=require('../.test/RaceModel.js'),{RaceEventCatalog}=require('../.test/events/RaceEventCatalog.js');
const events=RaceEventCatalog.parse(require('../assets/resources/race/events.json')).rules,opts={events,presentationSeed:123};let draws=0;
const m=new RaceModel(()=>{draws++;return .3;},opts);m.placeBet('3-4',2);m.placeBet('1-2',5);
const roundtrip=model=>{let resumedDraws=0;const copy=RaceModel.restore(JSON.parse(JSON.stringify(model.exportSnapshot())),()=>{resumedDraws++;return .3;},opts);assert.equal(resumedDraws,0);assert.deepEqual(copy.exportSnapshot(),model.exportSnapshot());assert.deepEqual(copy.progress,model.progress);return copy;};
roundtrip(m);m.startRace();assert.equal(m.phase,'preparing');roundtrip(m);assert.equal(draws,0);
for(let k=0;k<300;k++){m.update(.1);if(k%7===0)roundtrip(m);}assert.equal(m.phase,'result');assert.equal(draws,5);const paid=m.credits;
for(let k=0;k<5;k++){const copy=roundtrip(m);copy.update(.1);assert.equal(copy.credits,paid);assert.equal(copy.history.length,1);}
m.nextRound();roundtrip(m);m.repeatLastBets();roundtrip(m);assert.equal(m.totalStake,7);
const good=m.exportSnapshot();for(const mutate of [s=>s.version=2,s=>s.credits=-1,s=>s.cells[0].stake=Infinity,s=>s.pendingOrder=[1,1,2,3,4,5],s=>s.phase='oops',s=>s.phase=['betting'],s=>s.history[0].payout++,s=>s.history[0].bets[0].stake++,s=>s.lastResultRound=1,s=>s.pairMode='ordered']){const s=JSON.parse(JSON.stringify(good));mutate(s);assert.throws(()=>RaceModel.restore(s,()=>.3,opts));}
assert.ok(m.changeId>0);console.log('RaceSnapshot: four phases roundtrip, deterministic progress, zero restore draws, repeated result pays once, immutable receipts and corrupt ledger rejection passed.');
