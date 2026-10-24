const assert=require('node:assert/strict'),{createGame}=require('./helpers/game-fixture.cjs');
(async()=>{
 const {game:g}=await createGame(),pointer={getID:()=>7,getLocation:()=>({})},start=()=>g.betNodes[0].emit('start',pointer);
 start();assert.equal(g.betHold.cell,0);g.buttons[0].emit('end');assert.equal(g.betHold.cell,-1);assert.equal(g.undo,true);start();assert.equal(g.game.totalStake,0);g.betNodes[0].emit('end',pointer);g.buttons[0].emit('end');
 start();g.buttons[2].emit('end');assert.equal(g.betHold.cell,-1);assert.equal(g.canBet(),false);let before=g.game.totalStake;start();assert.equal(g.game.totalStake,before);await g.dialogAction(0);assert.equal(g.canBet(),true);
 start();g.eventButton.emit('end');assert.equal(g.betHold.cell,-1);assert.equal(g.canBet(),false);before=g.game.totalStake;start();assert.equal(g.game.totalStake,before);g.eventClose.emit('end');assert.equal(g.canBet(),true);g.onDestroy();
 console.log('QuickInput: actual component touch bindings cancel repeat on undo/history/event panels and block covered bets passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
