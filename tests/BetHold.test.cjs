const assert=require('node:assert/strict'),{BetHold}=require('../.test/presentation/BetHold.js');
const h=new BetHold;assert.equal(h.update(.1),0);h.begin(2,5,7);assert.equal(h.update(.1),0);assert.equal(h.update(.1),0);assert.equal(h.update(.1),0);assert.equal(h.update(.1),1);assert.equal(h.update(.1),0);assert.equal(h.update(.1),1);assert.equal(h.delta,5);assert.equal(h.cell,2);
h.end(8);assert.equal(h.cell,2);h.end(7);assert.equal(h.cell,-1);assert.equal(h.update(.1),0);
h.begin(0,-10,3);h.update(.3);assert.equal(h.observation.elapsed,.1,'long frames do not flood repeat intents');h.cancel();assert.equal(h.cell,-1);assert.equal(h.update(Infinity),0);
console.log('BetHold: 400ms delay, 120ms repeat, pointer ownership, cancellation, negative units and bounded long-frame behavior passed.');
