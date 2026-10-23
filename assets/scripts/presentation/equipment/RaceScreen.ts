import { Phase, RaceResult } from '../../RaceModel';

export interface RaceScreenState {readonly mode:'off'|'betting'|'preparing'|'live'|'result';readonly text:string;}
/** A projection of the sole race model; no separate race or screen timer. */
export function raceScreen(phase:Phase,round:number,eventName:string,preparation:number,result:RaceResult|null,resultElapsed:number,holdSeconds:number):RaceScreenState{
 if(phase==='betting')return {mode:'betting',text:eventName+'\n第 '+round+' 场 · 等待开跑'};
 if(phase==='preparing')return {mode:'preparing',text:'准备起跑\n'+Math.max(1,Math.ceil(preparation))};
 if(phase==='result'&&result&&resultElapsed<holdSeconds)return {mode:'result',text:'第 '+result.round+' 场\n冠军 '+result.first+'  亚军 '+result.second};
 return {mode:'live',text:''};
}
