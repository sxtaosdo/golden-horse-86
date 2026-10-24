import { RaceEventId } from '../events/RaceEventCatalog';
export interface EnvironmentFrame {rect:{x:number;y:number;width:number;height:number};anchor:{x:number;y:number};}
export interface EnvironmentPart {id:string;moving:boolean;frames:EnvironmentFrame[];}
export interface EnvironmentGroup {id:'flag'|'crowd';resource:string;sourceWidth:number;sourceHeight:number;scale:number;parts:EnvironmentPart[];}
export interface EnvironmentPlacement {kind:'flag'|'crowd';x:number;y:number;idleRepeatSeconds?:number;}
const obj=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const num=(v:unknown,lo:number,hi:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
export class EnvironmentArtCatalog {
 private constructor(readonly groups:readonly EnvironmentGroup[],readonly tiers:Readonly<Record<RaceEventId,readonly EnvironmentPlacement[]>>){}
 static parse(value:unknown):EnvironmentArtCatalog{
  if(!obj(value)||value.version!==1||!Array.isArray(value.groups)||value.groups.length!==2||!obj(value.tiers))throw Error('Invalid environment art');
  const ids=new Set<string>();
  for(const g of value.groups){
   if(!obj(g)||(g.id!=='flag'&&g.id!=='crowd')||ids.has(g.id)||g.resource!==g.id+'-r11'||g.sourceWidth!==1536||g.sourceHeight!==1024||!num(g.scale,.1,.5)||!Array.isArray(g.parts)||g.parts.length!==(g.id==='flag'?3:2))throw Error('Invalid environment group');ids.add(g.id);
   const parts=new Set<string>();let animated=0;
   for(const p of g.parts){if(!obj(p)||typeof p.id!=='string'||parts.has(p.id)||typeof p.moving!=='boolean'||!Array.isArray(p.frames)||p.frames.length!==(p.moving?4:1))throw Error('Invalid environment part');parts.add(p.id);if(p.moving)animated++;
    for(const f of p.frames){if(!obj(f)||!obj(f.rect)||!obj(f.anchor)||!num(f.rect.x,0,1536)||!num(f.rect.y,0,1024)||!num(f.rect.width,1,1536)||!num(f.rect.height,1,1024)||f.rect.x+f.rect.width>1536||f.rect.y+f.rect.height>1024||!num(f.anchor.x,-3,3)||!num(f.anchor.y,-3,3))throw Error('Invalid environment crop');}
   }if(animated!==1)throw Error('Missing environment motion');
  }
  for(const [i,id] of (['station','regional','championship'] as const).entries()){const rows=value.tiers[id];if(!Array.isArray(rows)||rows.length!==(i+1)*2||rows.filter(r=>obj(r)&&r.kind==='flag').length!==i+1||rows.filter(r=>obj(r)&&r.kind==='crowd').length!==i+1||rows.some(r=>!obj(r)||!num(r.x,-1900,2900)||!num(r.y,-650,1300)))throw Error('Invalid environment placement');}
  for(const rows of Object.values(value.tiers))if(Array.isArray(rows))for(const row of rows)if(obj(row)&&row.idleRepeatSeconds!==undefined&&(row.kind!=='crowd'||!num(row.idleRepeatSeconds,2,3600)))throw Error('Invalid environment idle interval');
  return new EnvironmentArtCatalog(value.groups as unknown as EnvironmentGroup[],value.tiers as unknown as Record<RaceEventId,EnvironmentPlacement[]>);
 }
}
