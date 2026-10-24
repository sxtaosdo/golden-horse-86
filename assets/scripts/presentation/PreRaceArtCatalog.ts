import { MotionPart } from './equipment/EquipmentMotionCatalog';

/** Independent pre-race art; the existing 144 running frames keep their contract. */
export class PreRaceArtCatalog {
 private constructor(readonly horses:readonly MotionPart[],readonly starter:MotionPart){}
 static parse(value:unknown):PreRaceArtCatalog{
  const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
  const positive=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>0;
  const part=(v:unknown,count:number):MotionPart=>{
   if(!object(v)||typeof v.resource!=='string'||!/^([a-z0-9]+-)+r09$/.test(v.resource)||!Number.isSafeInteger(v.sourceWidth)||!positive(v.sourceWidth)||!Number.isSafeInteger(v.sourceHeight)||!positive(v.sourceHeight)||!Array.isArray(v.frames)||v.frames.length!==count)throw Error('Invalid pre-race art part');
   const width=v.sourceWidth,height=v.sourceHeight;
   const frames=v.frames.map((f:unknown)=>{
    if(!object(f)||!object(f.rect)||!object(f.anchor)||!positive(f.width)||!positive(f.height)||f.flipX!==false)throw Error('Invalid pre-race frame');
    const r=f.rect,a=f.anchor;
    if(!['x','y','width','height'].every(k=>Number.isSafeInteger(r[k]))||Number(r.x)<0||Number(r.y)<0||!positive(r.width)||!positive(r.height)||Number(r.x)+r.width>width||Number(r.y)+r.height>height||typeof a.x!=='number'||!Number.isFinite(a.x)||a.x<0||a.x>1||a.y!==0)throw Error('Invalid pre-race frame bounds');
    return {rect:{x:Number(r.x),y:Number(r.y),width:r.width,height:r.height},anchor:{x:a.x,y:0},width:f.width,height:f.height,flipX:false};
   });return {resource:v.resource,sourceWidth:width,sourceHeight:height,frames};
  };
  if(!object(value)||value.version!==1||!Array.isArray(value.horses)||value.horses.length!==6)throw Error('Invalid pre-race art catalog');
  const horses=value.horses.map(h=>part(h,10)),starter=part(value.starter,6);
  horses.forEach((h,i)=>{if(h.resource!=='h0'+(i+1)+'-idle-r09')throw Error('Pre-race horse identity mismatch');});
  if(new Set([...horses,starter].map(p=>p.resource)).size!==7)throw Error('Duplicate pre-race art resource');
  return new PreRaceArtCatalog(horses,starter);
 }
 get parts():readonly MotionPart[]{return [...this.horses,this.starter];}
}
