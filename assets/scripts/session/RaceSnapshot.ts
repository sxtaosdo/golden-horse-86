import { BetReceipt, PairMode, Phase, RaceResult } from '../RaceModel';
import { RaceEventId } from '../events/RaceEventCatalog';

export interface RaceSnapshot {
 version:1;pairMode:PairMode;bettingSeconds:number;raceSeconds:number;phase:Phase;round:number;credits:number;
 countdown:number;preparationRemaining:number;raceElapsed:number;resultElapsed:number;eventId:RaceEventId;
 cells:{key:string;stake:number;odds:number}[];pendingOrder:number[];finishTimes:number[];presentationSeed:number;visualSeed:number;
 history:RaceResult[];lastResultRound:number|null;message:string;milestones?:MilestoneProgress;
}
export interface MilestoneProgress {completed:number;regional:boolean;championship:boolean;}
export interface SnapshotRules {pairMode:PairMode;bettingSeconds:number;raceSeconds:number;preparationSeconds:number;cells:readonly {key:string;odds:number}[];tiers:readonly {id:RaceEventId;minCredits:number}[];}
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const number=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const order=(v:unknown):v is number[]=>Array.isArray(v)&&v.length===6&&v.every(x=>integer(x,1,6))&&new Set(v).size===6;
const event=(v:unknown):v is RaceEventId=>v==='station'||v==='regional'||v==='championship';

/** Validates untrusted storage before any balance or phase can enter the model. */
export class RaceSnapshotCodec {
 static parse(value:unknown,rules:SnapshotRules):RaceSnapshot{
  if(!object(value)||value.version!==1||value.pairMode!==rules.pairMode||value.bettingSeconds!==rules.bettingSeconds||value.raceSeconds!==rules.raceSeconds)throw Error('存档版本或比赛配置不兼容');
  const v=value;
  if(typeof v.phase!=='string'||!['betting','preparing','racing','result'].includes(v.phase)||!integer(v.round,1)||!integer(v.credits)||!number(v.countdown,0,rules.bettingSeconds)||!number(v.preparationRemaining,0,rules.preparationSeconds)||!number(v.raceElapsed,0,rules.raceSeconds+8)||!number(v.resultElapsed,0,315360000)||!event(v.eventId)||!integer(v.presentationSeed,0,0xffffffff)||!integer(v.visualSeed,0,0xffffffff)||typeof v.message!=='string'||v.message.length>200)throw Error('存档比赛状态损坏');
  if(!Array.isArray(v.cells)||v.cells.length!==rules.cells.length)throw Error('存档押分表损坏');
  const cells=v.cells.map((c:unknown,i:number)=>{if(!object(c)||c.key!==rules.cells[i].key||c.odds!==rules.cells[i].odds||!integer(c.stake))throw Error('存档押分数据损坏');return {key:rules.cells[i].key,odds:rules.cells[i].odds,stake:c.stake};});
  const total=cells.reduce((sum,c)=>sum+c.stake,0);if(!integer(total)||!integer(v.credits+total))throw Error('存档积分越界');
  if(!order(v.pendingOrder)||!Array.isArray(v.finishTimes)||v.finishTimes.length!==6||!v.finishTimes.every(t=>number(t,0,rules.raceSeconds+2)))throw Error('存档名次损坏');
  if(!Array.isArray(v.history)||v.history.length>20)throw Error('存档历史损坏');
  const history=v.history.map(r=>this.receipt(r,rules)),milestones=this.milestones(v.milestones,history);
  for(let i=0;i<history.length;i++)if(history[i].round>v.round||(i>0&&history[i].round>=history[i-1].round))throw Error('存档历史场次不一致');
  const phase=v.phase as Phase;
  if(phase==='betting'||phase==='preparing'){
   if(v.raceElapsed!==0||v.resultElapsed!==0||v.lastResultRound!==null)throw Error('存档赛前阶段不一致');
   const tier=rules.tiers.find(t=>t.id===v.eventId);if(rules.tiers.length&&(!tier||v.credits+total<tier.minCredits))throw Error('存档赛事资格不一致');
   if(phase==='preparing'&&(total===0||v.preparationRemaining<=0))throw Error('存档准备状态不一致');
   if(phase==='betting'&&v.preparationRemaining!==0)throw Error('存档押分状态不一致');
  }else{
   if(total===0||v.preparationRemaining!==0)throw Error('存档比赛押分不一致');
   v.pendingOrder.forEach((horse,rank)=>{if(Math.abs((v.finishTimes as number[])[horse-1]-(rules.raceSeconds-2+rank*.35))>1e-8)throw Error('存档完成时刻不一致');});
   const settledAt=Math.max(...v.finishTimes as number[])+.65;
   if(phase==='racing'&&(v.lastResultRound!==null||v.resultElapsed!==0||v.raceElapsed>=settledAt+.000001))throw Error('存档未结算状态不一致');
   if(phase==='result'&&(v.lastResultRound!==v.round||history[0]?.round!==v.round||v.raceElapsed<settledAt-1e-8||history[0].order.some((h,i)=>h!==(v.pendingOrder as number[])[i])||history[0].stake!==total||history[0].eventId!==v.eventId))throw Error('存档已结算状态不一致');
  }
  const currentRound=v.round;if(phase!=='result'&&history.some(r=>r.round>=currentRound))throw Error('存档重复结算标记');
  if(phase==='result'&&cells.some(c=>c.stake!==(history[0].bets.find(b=>b.key===c.key)?.stake??0)))throw Error('存档已结算押分明细不一致');
  return {version:1,pairMode:rules.pairMode,bettingSeconds:rules.bettingSeconds,raceSeconds:rules.raceSeconds,phase,round:v.round,credits:v.credits,countdown:v.countdown,preparationRemaining:v.preparationRemaining,raceElapsed:v.raceElapsed,resultElapsed:v.resultElapsed,eventId:v.eventId,cells,pendingOrder:[...v.pendingOrder],finishTimes:[...v.finishTimes] as number[],presentationSeed:v.presentationSeed,visualSeed:v.visualSeed,history,milestones,lastResultRound:phase==='result'?v.round:null,message:v.message};
 }
 private static milestones(value:unknown,history:readonly RaceResult[]):MilestoneProgress{
  const regional=history.some(r=>r.eventId==='regional'),championship=history.some(r=>r.eventId==='championship');
  // Old v1 archives have no cumulative ledger; migrate only the results actually retained.
  if(value===undefined)return {completed:history.length,regional,championship};
  if(!object(value)||!integer(value.completed,history.length)||typeof value.regional!=='boolean'||typeof value.championship!=='boolean'||(regional&&!value.regional)||(championship&&!value.championship)||((value.regional||value.championship)&&value.completed===0))throw Error('存档累计里程碑损坏');
  return {completed:value.completed,regional:value.regional,championship:value.championship};
 }
 private static receipt(value:unknown,rules:SnapshotRules):RaceResult{
  if(!object(value)||!order(value.order)||!integer(value.round,1)||!event(value.eventId)||value.first!==value.order[0]||value.second!==value.order[1]||typeof value.pair!=='string'||!integer(value.stake,1)||!integer(value.payout)||!integer(value.odds,1)||!number(value.net,-Number.MAX_SAFE_INTEGER)||!Number.isSafeInteger(value.net)||!Array.isArray(value.bets)||value.bets.length===0||value.bets.length>rules.cells.length)throw Error('存档结算明细损坏');
  const keys=new Set<string>(),bets:BetReceipt[]=value.bets.map((b:unknown)=>{if(!object(b)||typeof b.key!=='string'||!rules.cells.some(c=>c.key===b.key)||keys.has(b.key)||!integer(b.stake,1)||!integer(b.odds,1))throw Error('存档组合明细损坏');keys.add(b.key);return Object.freeze({key:b.key,stake:b.stake,odds:b.odds});});
  const pair=rules.pairMode==='ordered'?value.first+'-'+value.second:[value.first,value.second].sort((a,b)=>Number(a)-Number(b)).join('-'),win=bets.find(b=>b.key===pair);
  if(value.pair!==pair||bets.reduce((s,b)=>s+b.stake,0)!==value.stake||value.payout!==(win?win.stake*win.odds:0)||value.net!==value.payout-value.stake||(win&&value.odds!==win.odds))throw Error('存档结算账目不一致');
  return Object.freeze({first:value.order[0],second:value.order[1],order:Object.freeze([...value.order]),round:value.round,eventId:value.eventId,pair,payout:value.payout,stake:value.stake,odds:value.odds,net:value.net,bets:Object.freeze(bets)});
 }
}
