const assert=require('node:assert/strict'),{RaceModel}=require('../.test/RaceModel.js');
const finish=m=>{m.startRace();while(m.phase==='racing')m.update(.1);m.nextRound();};
const m=new RaceModel(()=>.3);assert.equal(m.repeatLastBets(),false);m.placeBet('3-4',2);m.placeBet('1-2',5);finish(m);m.placeBet('1-6',20);
assert.equal(m.repeatLastBets(),true);assert.equal(m.totalStake,7);assert.equal(m.credits,566);assert.equal(m.getCell('1-6').stake,0);assert.equal(m.getCell('3-4').stake,2);assert.equal(m.repeatLastBets(),true);assert.equal(m.credits,566);assert.equal(m.totalStake,7);
m.startRace();assert.equal(m.repeatLastBets(),false);
const low=new RaceModel(()=>.3,{initialCredits:7});low.placeBet('1-2',7);finish(low);low.addTestCredits(5);low.placeBet('1-3',3);const before=JSON.stringify({credits:low.credits,cells:low.cells});assert.equal(low.repeatLastBets(),false);assert.equal(JSON.stringify({credits:low.credits,cells:low.cells}),before);
console.log('RepeatBets: whole-receipt replacement, refund-before-check, idempotence, insufficient funds preserve original bets and phase locks passed.');
