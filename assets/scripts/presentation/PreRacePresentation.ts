import { Phase } from '../RaceModel';
import { RaceEventId } from '../events/RaceEventCatalog';
import { PreRaceArtCatalog, PreRaceIdleTiming } from './PreRaceArtCatalog';

export interface PreRaceState {readonly round:number;readonly phase:Phase;readonly preparationRemaining:number;readonly raceElapsed:number;readonly eventId:RaceEventId;}
export interface CameraCue {readonly x:number;readonly y:number;readonly ratio:number;}
export type PreRaceCue='countdown'|'broadcast'|'latch'|'hoof';
export interface PreRaceSnapshot {seed:number;round:number;shot:number;phase:Phase;elapsed:number;count:number;}
export const PRE_RACE_SHOTS:readonly CameraCue[]=[{x:0,y:0,ratio:.72},{x:-32,y:0,ratio:.76},{x:24,y:-12,ratio:.78}];

/** Cosmetic state only. The model remains the sole owner of race phases and clocks. */
export class PreRacePresentation {
 private seed:number;private round=-1;private shot=-1;private phase:Phase='betting';private elapsed=0;private count=0;
 private frames:number[]=Array(6).fill(0);private pulses:number[]=Array(6).fill(0);private cells:number[]=Array(15).fill(0);
 private events:PreRaceCue[]=[];private camera:CameraCue={...PRE_RACE_SHOTS[0]};private flag=0;
 constructor(seed=Date.now(),private readonly idle:PreRaceIdleTiming=PreRaceArtCatalog.DEFAULT_IDLE){this.seed=(seed>>>0)||0x6d2b79f5;}
 update(dt:number,state:PreRaceState,reduced=false):void{
  const step=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;this.events=[];
  if(state.round!==this.round){
   this.round=state.round;let choice=Math.floor(this.random()*(this.shot<0?3:2));if(this.shot>=0&&choice>=this.shot)choice++;
   this.shot=choice;this.elapsed=0;this.phase='betting';this.count=0;this.frames.fill(0);this.clearFeedback();
  }
  this.elapsed+=step;
  if(state.phase!==this.phase){
   this.clearFeedback();if(state.phase==='preparing'&&state.eventId!=='station')this.events.push('broadcast');
   if(state.phase==='racing')this.events.push('latch');this.phase=state.phase;this.count=0;
  }
  const preparing=state.phase==='preparing',waiting=state.phase==='betting';
  const count=preparing?Math.max(1,Math.ceil(state.preparationRemaining)):0;
  if(preparing&&count!==this.count){this.count=count;this.events.push('countdown');}
  const t=waiting?0:preparing?Math.max(0,Math.min(1,(3-state.preparationRemaining)/2)):1,ease=t*t*(3-2*t),shot=PRE_RACE_SHOTS[this.shot];
  this.camera=ease===1?{x:0,y:0,ratio:1}:{x:shot.x*(1-ease),y:shot.y*(1-ease),ratio:shot.ratio+(1-shot.ratio)*ease};
  if(reduced)this.camera={x:0,y:0,ratio:1};
  const flagTime=this.elapsed%this.idle.starterRepeatSeconds;
  this.flag=waiting?(flagTime<1?Math.floor(flagTime*2):0):preparing?2+Math.floor(this.elapsed*4)%2:state.phase==='racing'&&state.raceElapsed<.12?4:5;
  for(let i=0;i<6;i++){
   this.pulses[i]=Math.max(0,this.pulses[i]-step);
   const local=this.elapsed+i*1.17,previous=this.frames[i];
   this.frames[i]=preparing?(state.preparationRemaining<=2?8+Math.floor(this.elapsed*2)%2:Math.floor(local*2)%4):
    waiting?this.idleHorse(local):8;
   if(waiting&&previous===6&&this.frames[i]===7)this.events.push('hoof');
  }
  this.cells=this.cells.map(value=>Math.max(0,value-step));
 }
 private idleHorse(local:number):number{
  const special=local%this.idle.horseSpecialRepeatSeconds,slot=local%this.idle.horseRepeatSeconds;
  // A special action replaces one ordinary slot; hold the neutral pose between actions.
  if(special<this.idle.horseRepeatSeconds)return special<.8?(Math.floor(local/this.idle.horseSpecialRepeatSeconds)%2?6:4)+Math.min(1,Math.floor(special/.4)):0;
  return slot<2?Math.floor(slot*2):0;
 }
 betFeedback(first:number,second:number,cell:number):void{if(this.phase!=='betting')return;this.pulses[first-1]=.35;this.pulses[second-1]=.35;if(cell>=0&&cell<15)this.cells[cell]=.35;}
 clearFeedback():void{this.pulses.fill(0);this.cells.fill(0);}
 horse(index:number):{frame:number;highlight:number}{return {frame:this.frames[index],highlight:this.pulses[index]/.35};}
 cellScale(index:number):number{return this.cells[index]>0?1-.06*Math.sin(Math.PI*(1-this.cells[index]/.35)):1;}
 get cameraCue():CameraCue{return this.camera;}
 get flagFrame():number{return this.flag;}
 get scanPoint():{x:number;y:number}{return{x:400+100*Math.sin(this.elapsed*.45),y:200+95*Math.sin(this.elapsed*.6)};}
 get cues():readonly PreRaceCue[]{return this.events;}
 exportSnapshot():PreRaceSnapshot{return {seed:this.seed,round:this.round,shot:this.shot,phase:this.phase,elapsed:this.elapsed,count:this.count};}
 restore(value:unknown,state:PreRaceState,reduced=false):void{
  if(typeof value!=='object'||value===null||Array.isArray(value))throw Error('存档赛前表现损坏');const v=value as Record<string,unknown>;
  if(typeof v.seed!=='number'||!Number.isInteger(v.seed)||v.seed<1||v.seed>0xffffffff||v.round!==state.round||typeof v.shot!=='number'||!Number.isInteger(v.shot)||v.shot<0||v.shot>2||v.phase!==state.phase||typeof v.elapsed!=='number'||!Number.isFinite(v.elapsed)||v.elapsed<0||v.elapsed>315360000||v.count!==(state.phase==='preparing'?Math.max(1,Math.ceil(state.preparationRemaining)):0))throw Error('存档赛前表现状态不一致');
  this.seed=v.seed;this.round=state.round;this.shot=v.shot;this.phase=state.phase;this.elapsed=v.elapsed;this.count=v.count as number;this.frames.fill(0);this.clearFeedback();this.update(0,state,reduced);this.events=[];
 }
 get observation():Record<string,unknown>{return {round:this.round,shot:this.shot,camera:{...this.camera},flag:this.flag,horseFrames:[...this.frames],highlights:[...this.pulses],cellScales:this.cells.map((_,i)=>this.cellScale(i)),cues:[...this.events]};}
 private random():number{let x=this.seed;x^=x<<13;x^=x>>>17;x^=x<<5;this.seed=x>>>0;return this.seed/4294967296;}
}
