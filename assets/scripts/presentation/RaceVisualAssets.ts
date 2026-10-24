import { JsonAsset, resources, Texture2D, SpriteFrame, Rect } from 'cc';
import { RaceEventCatalog } from '../events/RaceEventCatalog';
import { EquipmentCatalog } from './equipment/EquipmentCatalog';
import { EquipmentMotionCatalog } from './equipment/EquipmentMotionCatalog';
import { PreRaceArtCatalog } from './PreRaceArtCatalog';
import { TurnArtCatalog } from './TurnArtCatalog';
import { EnvironmentArtCatalog } from './EnvironmentArtCatalog';
export interface FrameSpec {x:number;y:number;width:number;height:number;nose:number;}
export interface HorseSheet {horse:number;view:string;name:string;scale:number;frames:FrameSpec[];}
export interface PropSpec {name:string;x:number;y:number;width:number;height:number;}
interface Manifest {version:string;horses:HorseSheet[];props:PropSpec[];}
export class RaceVisualAssets {
 manifest!:Manifest;readonly frames=new Map<string,SpriteFrame[]>();readonly props=new Map<string,SpriteFrame>();readonly ground=new Map<string,SpriteFrame>();
 catalog!:RaceEventCatalog;equipmentCatalog!:EquipmentCatalog;readonly equipment=new Map<string,SpriteFrame>();
 motionCatalog!:EquipmentMotionCatalog;readonly motionFrames=new Map<string,SpriteFrame[]>();
 preRaceCatalog!:PreRaceArtCatalog;readonly preRaceFrames=new Map<string,SpriteFrame[]>();
 turnCatalog!:TurnArtCatalog;readonly turnFrames=new Map<string,SpriteFrame[]>();
 environmentCatalog!:EnvironmentArtCatalog;readonly environmentFrames=new Map<string,SpriteFrame[]>();
 private owned:SpriteFrame[]=[];private disposed=false;
 async load():Promise<void>{
  const json=await new Promise<JsonAsset>((resolve,reject)=>resources.load('race/manifest',JsonAsset,(e,a)=>e?reject(e):resolve(a)));if(this.disposed)return;
  const data:unknown=json.json;if(!this.validManifest(data))throw Error('Invalid race artwork manifest');this.manifest=data;
  const [events,equipment,motion,preRace,turn,environment]=await Promise.all([this.json('race/events'),this.json('race/equipment-catalog'),this.json('race/equipment-motion'),this.json('race/pre-race-art'),this.json('race/turn-art'),this.json('race/environment-art')]);if(this.disposed)return;
  this.catalog=RaceEventCatalog.parse(events);this.equipmentCatalog=EquipmentCatalog.parse(equipment);this.motionCatalog=EquipmentMotionCatalog.parse(motion);
  this.preRaceCatalog=PreRaceArtCatalog.parse(preRace);
  this.turnCatalog=TurnArtCatalog.parse(turn);this.environmentCatalog=EnvironmentArtCatalog.parse(environment);
  await Promise.all(this.environmentCatalog.groups.map(async g=>{const texture=await this.texture('race/environment/'+g.resource+'/texture');if(this.disposed)return;if(texture.width!==g.sourceWidth||texture.height!==g.sourceHeight)throw Error('Environment texture dimensions mismatch');for(const part of g.parts)this.environmentFrames.set(g.id+':'+part.id,part.frames.map(f=>this.frame(texture,f.rect)));}));
  await Promise.all(this.turnCatalog.horses.map(async part=>{
   const texture=await this.texture('race/turn/'+part.resource+'/texture');if(this.disposed)return;
   if(texture.width!==part.sourceWidth||texture.height!==part.sourceHeight)throw Error('Turn texture dimensions mismatch: '+part.resource);
   this.turnFrames.set(part.resource,part.angles.flatMap(a=>a.frames.map(f=>this.frame(texture,f.rect))));
  }));
  await Promise.all(this.preRaceCatalog.parts.map(async part=>{
   const texture=await this.texture('race/pre-race/'+part.resource+'/texture');if(this.disposed)return;
   if(texture.width!==part.sourceWidth||texture.height!==part.sourceHeight)throw Error('Pre-race texture dimensions mismatch: '+part.resource);
   this.preRaceFrames.set(part.resource,part.frames.map(f=>this.frame(texture,f.rect)));
  }));
  await Promise.all(this.motionCatalog.parts.map(async part=>{
   const texture=await this.texture('race/equipment/'+part.resource+'/texture');if(this.disposed)return;
   if(texture.width!==part.sourceWidth||texture.height!==part.sourceHeight)throw Error('Equipment motion dimensions mismatch: '+part.resource);
   this.motionFrames.set(part.resource,part.frames.map(f=>this.frame(texture,f.rect)));
  }));
  await Promise.all(this.equipmentCatalog.items.map(async item=>{
   const texture=await this.texture('race/equipment/'+item.id+'/texture');if(this.disposed)return;
   if(texture.width!==item.sourceWidth||texture.height!==item.sourceHeight)throw Error('Equipment texture dimensions mismatch: '+item.id);
   this.equipment.set(item.id,this.frame(texture,item.frame));
  }));
  await Promise.all(this.manifest.horses.map(async sheet=>{const tex=await this.texture('race/'+sheet.name+'/texture');if(!this.disposed)this.frames.set(sheet.name,sheet.frames.map(f=>this.frame(tex,f)));}));
  const tex=await this.texture('race/scenery/texture');if(!this.disposed)for(const p of this.manifest.props)this.props.set(p.name,this.frame(tex,p));
  const ground=await this.texture('race/ground/texture');if(!this.disposed){this.ground.set('dirt',this.frame(ground,{x:2,y:2,width:764,height:1020}));this.ground.set('grass',this.frame(ground,{x:770,y:2,width:764,height:1020}));}
 }
 private validManifest(value:unknown):value is Manifest{
  const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
  const rect=(v:unknown):v is Record<string,number>=>object(v)&&['x','y','width','height'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k]))&&Number(v.x)>=0&&Number(v.y)>=0&&Number(v.width)>0&&Number(v.height)>0&&Number(v.x)+Number(v.width)<=1536&&Number(v.y)+Number(v.height)<=1024;
  if(!object(value)||value.version!=='mobile-r02-144'||!Array.isArray(value.horses)||value.horses.length!==18||!Array.isArray(value.props)||value.props.length!==12)return false;
  const keys=new Set<string>();
  for(const s of value.horses){if(!object(s)||typeof s.horse!=='number'||!Number.isInteger(s.horse)||s.horse<1||s.horse>6||typeof s.view!=='string'||!['side','diagonal','front'].includes(s.view)||typeof s.name!=='string'||!/^h0[1-6]-(side|diagonal|front)(-r02)?$/.test(s.name)||typeof s.scale!=='number'||!Number.isFinite(s.scale)||s.scale<=0||s.scale>1||!Array.isArray(s.frames)||s.frames.length!==8||!s.frames.every(f=>rect(f)&&typeof f.nose==='number'&&Number.isFinite(f.nose)&&f.nose>=f.x&&f.nose<=f.x+f.width))return false;
   keys.add(s.horse+':'+s.view);}
  const names=new Set<string>();for(const p of value.props){if(!rect(p)||typeof p.name!=='string')return false;names.add(p.name);}
  return keys.size===18&&['shrub','flowers','fence','gate','starter','distance','scoreboard','canopy','truck','crates','tree','spectators'].every(n=>names.has(n));
 }
 private texture(url:string):Promise<Texture2D>{return new Promise((resolve,reject)=>resources.load(url,Texture2D,(error,asset)=>error?reject(error):resolve(asset)));}
 private json(url:string):Promise<unknown>{return new Promise((resolve,reject)=>resources.load(url,JsonAsset,(error,asset)=>error?reject(error):resolve(asset.json)));}
 private frame(texture:Texture2D,spec:{x:number;y:number;width:number;height:number}):SpriteFrame{texture.setFilters(Texture2D.Filter.NEAREST,Texture2D.Filter.NEAREST);const frame=new SpriteFrame();frame.texture=texture;frame.rect=new Rect(spec.x,spec.y,spec.width,spec.height);this.owned.push(frame);return frame;}
 sheet(horse:number,view:string):HorseSheet{return this.manifest.horses.find(s=>s.horse===horse&&s.view===view)!;}
 dispose():void{this.disposed=true;this.owned.forEach(f=>f.destroy());this.owned=[];}
}
