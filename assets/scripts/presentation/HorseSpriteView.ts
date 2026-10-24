import { Node, UITransform, Sprite, Layers, Color, Label, Graphics } from 'cc';
import { HorsePose, HORSE_NOSE_X, HORSE_SCALE } from '../TrackVisual';
import { RaceVisualAssets } from './RaceVisualAssets';
import { RACE_WORLD_LAYER } from './equipment/RaceLayers';
export class HorseSpriteView {
 readonly node:Node;private sprites:Sprite[]=[];private badge:Label;private shadow:Graphics;private shadowAngle=-1;private mode='running';private displayedFrame=0;private direction=0;
 constructor(parent:Node,private horse:number,private assets:RaceVisualAssets){
  this.node=new Node('Horse_'+horse);this.node.layer=RACE_WORLD_LAYER;this.node.parent=parent;this.node.addComponent(UITransform);
  const ground=new Node('GroundShadow');ground.layer=RACE_WORLD_LAYER;ground.parent=this.node;ground.addComponent(UITransform);this.shadow=ground.addComponent(Graphics);
  const visual=new Node('AuthoredDirection');visual.layer=RACE_WORLD_LAYER;visual.parent=this.node;visual.addComponent(UITransform);const sprite=visual.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;this.sprites.push(sprite);
  const n=new Node('ReadableNumber');n.layer=RACE_WORLD_LAYER;n.parent=this.node;n.addComponent(UITransform).setContentSize(40,30);n.setPosition(0,124);
  this.badge=n.addComponent(Label);this.badge.string=String(horse);this.badge.fontSize=23;this.badge.lineHeight=26;this.badge.isBold=true;this.badge.color=new Color(255,231,105);this.badge.horizontalAlign=Label.HorizontalAlign.CENTER;
 }
 render(pose:HorsePose,time:number,running:boolean,idle?:{frame:number;highlight:number;reducedMotion?:boolean}):void{
  this.node.setPosition(pose.x,-pose.y);this.node.setScale(HORSE_SCALE,HORSE_SCALE,1);
  const shadowAngle=Math.round(pose.angle*16)/16;
  if(shadowAngle!==this.shadowAngle){this.shadowAngle=shadowAngle;const width=54-24*Math.sin(pose.angle);this.shadow.clear();for(const [ratio,alpha] of [[1,12],[.8,18],[.6,24]]){this.shadow.fillColor=new Color(29,35,23,alpha);this.shadow.ellipse(-8,0,width*ratio,7*ratio);this.shadow.fill();}}
  const highlight=idle?.highlight??0,pulse=idle?.reducedMotion?0:highlight;this.badge.color=highlight>0?new Color(255,255,240):new Color(255,231,105);this.badge.node.setScale(1+.08*pulse,1+.08*pulse,1);
  if(!running&&idle){
   const part=this.assets.preRaceCatalog.horses[this.horse-1],f=part.frames[idle.frame],sprite=this.sprites[0],size=sprite.node.getComponent(UITransform)!;
   this.direction=0;this.mode=idle.frame>=8?'ready':'idle';this.displayedFrame=idle.frame;sprite.spriteFrame=this.assets.preRaceFrames.get(part.resource)![idle.frame];sprite.color=new Color(255,255,255,255);
   size.setContentSize(f.width,f.height);size.setAnchorPoint(f.anchor.x,f.anchor.y);sprite.node.setScale(1,1,1);return;
  }
  // Pixel-art directions switch at their halfway angle. Alpha mixing unrelated silhouettes creates ghost limbs.
  const direction=Math.min(8,Math.round(pose.angle/(Math.PI/8)));this.direction=direction;
  const views=['side','diagonal','front','diagonal','side'],frame=running?Math.floor(time*10)%8:0;
  this.mode='running';this.displayedFrame=frame;
  if(direction%2===1){
   const horse=this.assets.turnCatalog.horses[this.horse-1],slot=direction===1||direction===7?0:1,f=horse.angles[slot].frames[frame],sprite=this.sprites[0],size=sprite.node.getComponent(UITransform)!;
   sprite.spriteFrame=this.assets.turnFrames.get(horse.resource)![slot*8+frame];sprite.color=new Color(255,255,255,255);size.setContentSize(f.width,f.height);size.setAnchorPoint(f.anchor.x,f.anchor.y);sprite.node.setScale(direction>4?-1:1,1,1);return;
  }
  [direction/2].forEach((v,i)=>{const s=this.sprites[i],sheet=this.assets.sheet(this.horse,views[v]),f=sheet.frames[frame],size=sheet.scale;
   s.spriteFrame=this.assets.frames.get(sheet.name)![frame];s.color=new Color(255,255,255,255);
   const pivot=views[v]==='side'?f.nose-HORSE_NOSE_X/HORSE_SCALE/size:f.x+f.width*.5;
   s.node.getComponent(UITransform)!.setContentSize(f.width*size,f.height*size);s.node.getComponent(UITransform)!.setAnchorPoint((pivot-f.x)/f.width,0);
   s.node.setScale(v>=3?-1:1,1,1);
  });
 }
 get observation():Record<string,unknown>{return {mode:this.mode,frame:this.displayedFrame,direction:this.direction,highlight:this.badge.color.r===255&&this.badge.color.g===255};}
}
