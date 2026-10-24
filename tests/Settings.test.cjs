const assert=require('node:assert/strict'),{createGame}=require('./helpers/game-fixture.cjs'),{ARCHIVE_KEY}=require('../.test/session/RaceArchive.js');
(async()=>{
 const data=new Map;let busy=false;const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},locks={request:async(n,o,cb)=>{if(busy)return cb(null);busy=true;try{return await cb({});}finally{busy=false;}}};
 const {game:g,Node,sources}=await createGame({storage,locks});const before=g.game.countdown;g.quickButtons[1].emit(Node.EventType.TOUCH_END);await g.dialogAction(2);assert.equal(g.dialog,'settings');g.update(.1);assert.equal(g.game.countdown,before);
 for(let i=0;i<20;i++)await g.dialogAction(0);assert.equal(g.settings.master,0);await g.dialogAction(1);assert.equal(g.settings.master,.1);for(let i=0;i<20;i++)await g.dialogAction(1);assert.equal(g.settings.master,1);
 await g.dialogAction(2);await g.dialogAction(4);assert.equal(g.settings.effects,.9);assert.equal(g.settings.ambience,.9);await g.dialogAction(6);assert.equal(g.settings.muted,true);assert.ok(sources.every(s=>!s.pending));
 await g.dialogAction(7);assert.equal(g.settings.reducedMotion,true);assert.equal(g.activeReducedMotion,false);assert.equal(JSON.parse(data.get(ARCHIVE_KEY)).settings.reducedMotion,true);g.utilityClose.emit(Node.EventType.TOUCH_END);assert.equal(g.paused,false);
 g.bet('1-2',1);g.beginRace();for(let i=0;i<330;i++)g.update(.1);assert.equal(g.activeReducedMotion,false);g.beginRace();assert.equal(g.activeReducedMotion,true);assert.equal(g.preRace.cameraCue.ratio,1);g.onDestroy();await new Promise(r=>setImmediate(r));
 const {game:r}=await createGame({storage,locks});assert.equal(r.dialog,'resume');assert.equal(r.settings.master,1);assert.equal(r.settings.effects,.9);assert.equal(r.settings.ambience,.9);assert.equal(r.settings.muted,true);assert.equal(r.activeReducedMotion,true);r.onDestroy();
 console.log('Settings: real menu callbacks, clamp, pause, mute, immediate persistence, next-round motion and reopen passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
