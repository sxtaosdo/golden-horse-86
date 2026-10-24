import { EquipmentId } from '../../events/RaceEventCatalog';
export interface EquipmentRect {readonly x:number;readonly y:number;readonly width:number;readonly height:number;}
export interface EquipmentPosition {readonly x:number;readonly y:number;readonly width:number;readonly label?:string;}
export type EquipmentMode='static'|'tracking'|'signal'|'live'|'gate';
export interface EquipmentSpec {readonly id:EquipmentId;readonly mode:EquipmentMode;readonly sourceWidth:number;readonly sourceHeight:number;readonly frame:EquipmentRect;readonly positions:readonly EquipmentPosition[];readonly front:boolean;readonly window?:EquipmentRect;}

/** Independent PNG definitions, not the legacy scenery atlas. */
export class EquipmentCatalog {
 private constructor(readonly items:readonly EquipmentSpec[]){}
 static parse(value:unknown):EquipmentCatalog{
  const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
  const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
  const rect=(v:unknown):v is EquipmentRect=>object(v)&&['x','y','width','height'].every(k=>finite(v[k]))&&Number(v.x)>=0&&Number(v.y)>=0&&Number(v.width)>0&&Number(v.height)>0;
  const ids:EquipmentId[]=['rail','distance','finish-post','toolbox','camera','mirror','speaker','warning','screen','tractor','ambulance','starting-gate'];
  if(!object(value)||value.version!==1||!Array.isArray(value.items)||value.items.length!==ids.length)throw Error('Invalid equipment catalog');
  const seen=new Set<string>(),items:EquipmentSpec[]=[];
  for(const v of value.items){
   if(!object(v)||typeof v.id!=='string'||!ids.includes(v.id as EquipmentId)||seen.has(v.id)||!finite(v.sourceWidth)||!finite(v.sourceHeight)||!rect(v.frame)||v.frame.x+v.frame.width>v.sourceWidth||v.frame.y+v.frame.height>v.sourceHeight||typeof v.front!=='boolean'||!Array.isArray(v.positions)||!v.positions.length)throw Error('Invalid equipment definition');
   const mode:EquipmentMode=v.id==='camera'?'tracking':v.id==='warning'?'signal':v.id==='screen'?'live':v.id==='starting-gate'?'gate':'static';
   if(v.mode!==mode)throw Error('Invalid equipment presentation mode: '+v.id);
   const positions:EquipmentPosition[]=[];
   for(const p of v.positions){if(!object(p)||!finite(p.x)||!finite(p.y)||!finite(p.width)||p.width<=0||(p.label!==undefined&&typeof p.label!=='string'))throw Error('Invalid equipment placement');positions.push({x:p.x,y:p.y,width:p.width,label:p.label});}
   if(v.id==='starting-gate'&&(positions.length!==6||new Set(positions.map(p=>p.y)).size!==6))throw Error('Starting gate requires six distinct stalls');
   if(v.id==='screen'&&(!rect(v.window)||v.window.x<v.frame.x||v.window.y<v.frame.y||v.window.x+v.window.width>v.frame.x+v.frame.width||v.window.y+v.window.height>v.frame.y+v.frame.height))throw Error('Invalid screen window');
   seen.add(v.id);items.push({id:v.id as EquipmentId,mode,sourceWidth:v.sourceWidth,sourceHeight:v.sourceHeight,frame:v.frame,front:v.front,positions,window:v.id==='screen'?v.window as EquipmentRect:undefined});
  }
  return new EquipmentCatalog(items);
 }
 get(id:EquipmentId):EquipmentSpec{return this.items.find(item=>item.id===id)!;}
}
