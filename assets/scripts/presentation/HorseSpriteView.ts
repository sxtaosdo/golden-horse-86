import { Node, UITransform, Sprite, Layers, Color, Label } from 'cc';
import { HorsePose, HORSE_NOSE_X, HORSE_SCALE } from '../TrackVisual';
import { RaceVisualAssets } from './RaceVisualAssets';
import { RACE_WORLD_LAYER } from './equipment/RaceLayers';
export class HorseSpriteView {
 readonly node:Node;private sprites:Sprite[]=[];private badge:Label;private mode='running';private displayedFrame=0;
 constructor(parent:Node,private horse:number,private assets:RaceVisualAssets){
  this.node=new Node('Horse_'+horse);this.node.layer=RACE_WORLD_LAYER;this.node.parent=parent;this.node.addComponent(UITransform);
  const visual=new Node('AuthoredDirection');visual.layer=RACE_WORLD_LAYER;visual.parent=this.node;visual.addComponent(UITransform);const sprite=visual.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;this.sprites.push(sprite);
  const n=new Node('ReadableNumber');n.layer=RACE_WORLD_LAYER;n.parent=this.node;n.addComponent(UITransform).setContentSize(40,30);n.setPosition(0,124);
  this.badge=n.addComponent(Label);this.badge.string=String(horse);this.badge.fontSize=23;this.badge.lineHeight=26;this.badge.isBold=true;this.badge.color=new Color(255,231,105);this.badge.horizontalAlign=Label.HorizontalAlign.CENTER;
 }
 render(pose:HorsePose,time:number,running:boolean,idle?:{frame:number;highlight:number}):void{
  this.node.setPosition(pose.x,-pose.y);this.node.setScale(HORSE_SCALE,HORSE_SCALE,1);
  const highlight=idle?.highlight??0;this.badge.color=highlight>0?new Color(255,255,240):new Color(255,231,105);this.badge.node.setScale(1+.08*highlight,1+.08*highlight,1);
  if(!running&&idle){
   const part=this.assets.preRaceCatalog.horses[this.horse-1],f=part.frames[idle.frame],sprite=this.sprites[0],size=sprite.node.getComponent(UITransform)!;
   this.mode=idle.frame>=8?'ready':'idle';this.displayedFrame=idle.frame;sprite.spriteFrame=this.assets.preRaceFrames.get(part.resource)![idle.frame];sprite.color=new Color(255,255,255,255);
   size.setContentSize(f.width,f.height);size.setAnchorPoint(f.anchor.x,f.anchor.y);sprite.node.setScale(1,1,1);return;
  }
  // Pixel-art directions switch at their halfway angle. Alpha mixing unrelated silhouettes creates ghost limbs.
  const direction=Math.min(4,Math.round(pose.angle/(Math.PI/4)));
  const views=['side','diagonal','front','diagonal','side'],frame=running?Math.floor(time*10)%8:0;
  this.mode='running';this.displayedFrame=frame;
  [direction].forEach((v,i)=>{const s=this.sprites[i],sheet=this.assets.sheet(this.horse,views[v]),f=sheet.frames[frame],size=sheet.scale;
   s.spriteFrame=this.assets.frames.get(sheet.name)![frame];s.color=new Color(255,255,255,255);
   const pivot=views[v]==='side'?f.nose-HORSE_NOSE_X/HORSE_SCALE/size:f.x+f.width*.5;
   s.node.getComponent(UITransform)!.setContentSize(f.width*size,f.height*size);s.node.getComponent(UITransform)!.setAnchorPoint((pivot-f.x)/f.width,0);
   s.node.setScale(v>=3?-1:1,1,1);
  });
 }
 get observation():Record<string,unknown>{return {mode:this.mode,frame:this.displayedFrame,highlight:this.badge.color.r===255&&this.badge.color.g===255};}
}
