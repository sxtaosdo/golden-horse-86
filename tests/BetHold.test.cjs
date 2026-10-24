const assert=require('node:assert/strict'),{BetHold}=require('../.test/presentation/BetHold.js');
const h=new BetHold;assert.equal(h.update(.1),0);h.begin(2,5,7);assert.equal(h.update(.1),0);assert.equal(h.update(.1),0);assert.equal(h.update(.1),0);assert.equal(h.update(.1),1);assert.equal(h.update(.1),0);assert.equal(h.update(.1),1);assert.equal(h.delta,5);assert.equal(h.cell,2);
h.end(8);assert.equal(h.cell,2);h.end(7);assert.equal(h.cell,-1);assert.equal(h.update(.1),0);
h.begin(0,-10,3);h.update(.3);assert.equal(h.observation.elapsed,.1,'long frames do not flood repeat intents');h.cancel();assert.equal(h.cell,-1);assert.equal(h.update(Infinity),0);
h.begin(1,5,7);assert.equal(h.release(8),null);assert.equal(h.cell,1);assert.equal(JSON.stringify(h.release(7)),JSON.stringify({cell:1,delta:5}));assert.equal(h.cell,-1);
h.begin(1,5,7);for(let i=0;i<4;i++)h.update(.1);assert.equal(h.release(7),null,'a held input must not add another stake on release');h.begin(1,5,7);h.end(7);assert.equal(h.release(7),null,'cancel never commits a short tap');
console.log('BetHold: 400ms delay, 120ms repeat, pointer ownership, cancellation, negative units and bounded long-frame behavior passed.');
