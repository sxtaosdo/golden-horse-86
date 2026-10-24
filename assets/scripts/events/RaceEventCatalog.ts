export type RaceEventId='station'|'regional'|'championship';
export type EquipmentId='rail'|'distance'|'finish-post'|'toolbox'|'camera'|'mirror'|'speaker'|'warning'|'screen'|'tractor'|'ambulance'|'starting-gate';
export interface RaceEventTier {readonly id:RaceEventId;readonly name:string;readonly minCredits:number;}
export interface RaceEventRules {readonly preparationSeconds:number;readonly resultDisplaySeconds:number;readonly tiers:readonly RaceEventTier[];}
export interface RaceEventSpec extends RaceEventTier {readonly equipment:readonly EquipmentId[];}

/** Validated presentation catalog; only the rule projection is passed to gameplay. */
export class RaceEventCatalog {
 readonly rules:RaceEventRules;
 private constructor(readonly tiers:readonly RaceEventSpec[],preparationSeconds:number,resultDisplaySeconds:number){
  this.rules=Object.freeze({preparationSeconds,resultDisplaySeconds,tiers:Object.freeze(tiers.map(t=>Object.freeze({id:t.id,name:t.name,minCredits:t.minCredits})))});
 }
 static parse(value:unknown):RaceEventCatalog{
  const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
  if(!object(value)||value.version!==1||!Array.isArray(value.tiers)||value.tiers.length!==3)throw Error('Invalid event catalog');
  const validSeconds=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0&&v<=30;
  if(!validSeconds(value.preparationSeconds)||!validSeconds(value.resultDisplaySeconds))throw Error('Invalid event timing');
  const ids:RaceEventId[]=['station','regional','championship'];
  const equipment:EquipmentId[]=['rail','distance','finish-post','toolbox','camera','mirror','speaker','warning','screen','tractor','ambulance','starting-gate'];
  const counts=[4,8,12];const tiers:RaceEventSpec[]=[];
  for(let i=0;i<3;i++){
   const t:unknown=value.tiers[i];
   if(!object(t)||t.id!==ids[i]||typeof t.name!=='string'||!t.name.trim()||typeof t.minCredits!=='number'||!Number.isSafeInteger(t.minCredits)||t.minCredits<0||!Array.isArray(t.equipment)||t.equipment.length!==counts[i]||t.equipment.some((id,j)=>id!==equipment[j]))throw Error('Invalid event tier '+ids[i]);
   if(i===0?t.minCredits!==0:t.minCredits<=tiers[i-1].minCredits)throw Error('Event thresholds must increase from zero');
   tiers.push(Object.freeze({id:ids[i],name:t.name,minCredits:t.minCredits,equipment:Object.freeze(equipment.slice(0,counts[i]))}));
  }
  return new RaceEventCatalog(Object.freeze(tiers),value.preparationSeconds,value.resultDisplaySeconds);
 }
 get(id:RaceEventId):RaceEventSpec{return this.tiers.find(t=>t.id===id)!;}
}
