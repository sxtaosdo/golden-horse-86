'use strict';
const assert=require('node:assert/strict'),{RaceModel}=require('../.test/RaceModel.js');
const m=new RaceModel(()=>.3);m.placeBet('3-4',2);m.placeBet('1-2',5);m.startRace();while(m.phase==='racing')m.update(.1);
const r=m.lastResult;assert.equal(r.stake,7);assert.equal(r.payout,80);assert.equal(r.net,73);assert.equal(r.odds,40);assert.deepEqual(r.bets,[{key:'1-2',stake:5,odds:3},{key:'3-4',stake:2,odds:40}]);
for(const mutate of [()=>r.order.push(1),()=>r.bets[0].stake=999,()=>r.bets.push({}),()=>r.payout=1])assert.throws(mutate,TypeError);
m.nextRound();m.placeBet('1-2',3);m.cells[0].odds=123;assert.equal(r.bets[0].stake,5);assert.equal(r.bets[0].odds,3);assert.equal(r.odds,40);assert.equal(m.history[0],r);
console.log('RaceReceipt: immutable full bets/odds/order, settlement net, history survives new bets and future odds changes passed.');
