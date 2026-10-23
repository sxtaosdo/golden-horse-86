'use strict';
// Exercise the actual component and the pinned framework, with engine rendering stubbed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const ts=require('typescript'),root=path.resolve(__dirname,'..');
function load(file,dependencies){
 const exports={};const js=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),
  {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
 vm.runInNewContext(js,{exports,require(name){if(name in dependencies)return dependencies[name];throw Error('Unexpected import '+name);},console,Promise,Math});
 return exports;
}
const framework=load('extensions/shidai3/assets/runtime/stateMachine.ts',{});
const pages=load('assets/scripts/presentation/RacePages.ts',{});
const cc={_decorator:{ccclass:()=>Type=>Type},Component:class {isValid=true;},input:{off(){}},Input:{EventType:{KEY_DOWN:1,KEY_UP:2}}};
const component=load('assets/scripts/GoldenHorseGame.ts',{
 cc,'cc/env':{PREVIEW:false},'db://shidai3/runtime/stateMachine':framework,
 '../tests/GoldenHorseTestBridge':{},'./RaceModel':require('../.test/RaceModel.js'),
 './RaceTrackView':{},'./TrackVisual':require('../.test/TrackVisual.js'),'./presentation/RacePages':pages
});
(async()=>{
 const game=new component.GoldenHorseGame();let closed=false,writesAfterClose=0,exits=0,finishExit;
 const ui=()=>({set active(value){if(closed)writesAfterClose++;},get active(){return true;}});
 game.bettingPage=ui();game.courseView={viewport:ui()};game.resultPanel=ui();
 class OldPage {enter(){} exit(){exits++;return new Promise(resolve=>{finishExit=resolve;});}}
 await game.StateMachine.changeState(OldPage);
 game.changePage(pages.RacingPage);game.changePage(pages.RacingPage);
 assert.equal(exits,1,'repeat input must not start a concurrent transition');
 closed=true;game.onDestroy();finishExit();await game.pageTask;
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(writesAfterClose,0,'destroyed component must not show a late page');
 assert.equal(exits,1,'destroy must wait for pending exit rather than exit it twice');
 assert.equal(game.StateMachine.current,null,'all page states must be released');
 console.log('RacePageLifecycle: repeated transition and destroy-during-exit passed against pinned framework.');
})().catch(error=>{console.error(error);process.exitCode=1;});
