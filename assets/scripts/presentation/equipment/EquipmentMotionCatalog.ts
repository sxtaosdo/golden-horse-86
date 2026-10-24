import { EquipmentRect } from './EquipmentCatalog';

export interface MotionFrame {readonly rect:EquipmentRect;readonly anchor:{readonly x:number;readonly y:number};readonly width:number;readonly height:number;readonly flipX:boolean;}
export interface MotionPart {readonly resource:string;readonly sourceWidth:number;readonly sourceHeight:number;readonly frames:readonly MotionFrame[];}
interface RigSpec {readonly referenceWidth:number;readonly base:MotionPart;readonly head:MotionPart;readonly mount:{readonly x:number;readonly y:number};}
export interface CameraRig extends RigSpec {readonly turnDegreesPerSecond:number;}
export interface SignalRig extends RigSpec {readonly blinkSeconds:number;}
export interface GateRig extends RigSpec {readonly openingSeconds:number;}

/** Authored frame geometry and installation points, separate from playback state. */
export class EquipmentMotionCatalog {
 private constructor(readonly camera:CameraRig,readonly warning:SignalRig,readonly gate:GateRig){}
 static parse(value:unknown):EquipmentMotionCatalog{
  const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
  const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
  const positive=(v:unknown):v is number=>finite(v)&&v>0;
  const part=(v:unknown,count:number):MotionPart=>{
   if(!object(v)||typeof v.resource!=='string'||!/^[a-z0-9-]+$/.test(v.resource)||!Number.isSafeInteger(v.sourceWidth)||!positive(v.sourceWidth)||!Number.isSafeInteger(v.sourceHeight)||!positive(v.sourceHeight)||!Array.isArray(v.frames)||v.frames.length!==count)throw Error('Invalid equipment motion part');
   const sourceWidth=v.sourceWidth,sourceHeight=v.sourceHeight;
   const frames:MotionFrame[]=v.frames.map((f:unknown)=>{
    if(!object(f)||!object(f.rect)||!object(f.anchor)||!positive(f.width)||(f.height!==undefined&&!positive(f.height))||typeof f.flipX!=='boolean')throw Error('Invalid equipment motion frame');
    const r=f.rect,a=f.anchor;
    if(!['x','y','width','height'].every(k=>Number.isSafeInteger(r[k]))||Number(r.x)<0||Number(r.y)<0||!positive(r.width)||!positive(r.height)||Number(r.x)+r.width>sourceWidth||Number(r.y)+r.height>sourceHeight||!finite(a.x)||!finite(a.y)||a.x<0||a.x>1||a.y<0||a.y>1)throw Error('Invalid equipment motion bounds');
    return {rect:{x:Number(r.x),y:Number(r.y),width:r.width,height:r.height},anchor:{x:a.x,y:a.y},width:f.width,height:f.height===undefined?f.width*r.height/r.width:Number(f.height),flipX:f.flipX};
   });
   return {resource:v.resource,sourceWidth:v.sourceWidth,sourceHeight:v.sourceHeight,frames};
  };
  const rig=(v:unknown,count:number):RigSpec=>{
   if(!object(v)||!positive(v.referenceWidth)||!object(v.mount)||!finite(v.mount.x)||!finite(v.mount.y)||v.mount.y<0)throw Error('Invalid equipment motion rig');
   return {referenceWidth:v.referenceWidth,base:part(v.base,1),head:part(v.head,count),mount:{x:v.mount.x,y:v.mount.y}};
  };
  if(!object(value)||value.version!==1||!object(value.camera)||!object(value.warning)||!object(value.gate)||!positive(value.camera.turnDegreesPerSecond)||value.camera.turnDegreesPerSecond>720||!positive(value.warning.blinkSeconds)||value.warning.blinkSeconds>5||!positive(value.gate.openingSeconds)||value.gate.openingSeconds>2)throw Error('Invalid equipment motion catalog');
  const catalog=new EquipmentMotionCatalog({...rig(value.camera,8),turnDegreesPerSecond:value.camera.turnDegreesPerSecond},{...rig(value.warning,2),blinkSeconds:value.warning.blinkSeconds},{...rig(value.gate,4),openingSeconds:value.gate.openingSeconds});
  if(new Set(catalog.parts.map(p=>p.resource)).size!==catalog.parts.length)throw Error('Equipment motion parts require distinct resource keys');
  return catalog;
 }
 get parts():readonly MotionPart[]{return [this.camera.base,this.camera.head,this.warning.base,this.warning.head,this.gate.base,this.gate.head];}
}
