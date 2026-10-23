import { JsonAsset, resources, Texture2D, SpriteFrame, Rect } from 'cc';
export interface FrameSpec {x:number;y:number;width:number;height:number;nose:number;}
export interface HorseSheet {horse:number;view:string;name:string;scale:number;frames:FrameSpec[];}
export interface PropSpec {name:string;x:number;y:number;width:number;height:number;}
interface Manifest {version:string;horses:HorseSheet[];props:PropSpec[];}
export class RaceVisualAssets {
 manifest!:Manifest;readonly frames=new Map<string,SpriteFrame[]>();readonly props=new Map<string,SpriteFrame>();readonly ground=new Map<string,SpriteFrame>();
 private owned:SpriteFrame[]=[];private disposed=false;
 async load():Promise<void>{
  const json=await new Promise<JsonAsset>((resolve,reject)=>resources.load('race/manifest',JsonAsset,(e,a)=>e?reject(e):resolve(a)));if(this.disposed)return;
  const data:unknown=json.json;if(!this.validManifest(data))throw Error('Invalid race artwork manifest');this.manifest=data;
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
 private frame(texture:Texture2D,spec:{x:number;y:number;width:number;height:number}):SpriteFrame{texture.setFilters(Texture2D.Filter.NEAREST,Texture2D.Filter.NEAREST);const frame=new SpriteFrame();frame.texture=texture;frame.rect=new Rect(spec.x,spec.y,spec.width,spec.height);this.owned.push(frame);return frame;}
 sheet(horse:number,view:string):HorseSheet{return this.manifest.horses.find(s=>s.horse===horse&&s.view===view)!;}
 dispose():void{this.disposed=true;this.owned.forEach(f=>f.destroy());this.owned=[];}
}
