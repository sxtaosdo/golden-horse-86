import { Node, Sprite, UITransform } from 'cc';
import { RaceEventId } from '../events/RaceEventCatalog';
import { RaceTrackView } from '../RaceTrackView';
import { RaceVisualAssets } from './RaceVisualAssets';
import { EnvironmentGroup, EnvironmentPart } from './EnvironmentArtCatalog';
import { RACE_WORLD_LAYER } from './equipment/RaceLayers';
/** Cosmetic only: fixed feet/rail/pole and independently sampled upper-body/cloth sprites. */
export class EnvironmentScene {
 private readonly root:Node;private tier:RaceEventId|null=null;
 private actors:Array<{node:Node;spec:EnvironmentGroup;x:number;y:number;repeat:number;clock:number;frame:number;visible:boolean;parts:Array<{sprite:Sprite;part:EnvironmentPart}>}>=[];
 constructor(private readonly course:RaceTrackView,private readonly assets:RaceVisualAssets){this.root=new Node('RaceEnvironment');this.root.layer=RACE_WORLD_LAYER;this.root.parent=course.world;this.root.setSiblingIndex(course.horseLayer.getSiblingIndex());}
 setTier(tier:RaceEventId):void{
  if(this.tier===tier)return;this.clear();this.tier=tier;
  for(const p of this.assets.environmentCatalog.tiers[tier]){
   const spec=this.assets.environmentCatalog.groups.find(g=>g.id===p.kind)!,node=new Node('Environment-'+p.kind);node.layer=RACE_WORLD_LAYER;node.parent=this.root;node.setPosition(p.x,-p.y);node.setScale(spec.scale,spec.scale,1);
   const parts=spec.parts.map(part=>{const child=new Node(part.id);child.layer=RACE_WORLD_LAYER;child.parent=node;child.addComponent(UITransform);const sprite=child.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;return{sprite,part};});
   this.actors.push({node,spec,x:p.x,y:p.y,repeat:p.idleRepeatSeconds??4/(spec.id==='flag'?3:2),clock:0,frame:0,visible:false,parts});for(const part of parts)this.paint(part.sprite,spec,part.part,0);
  }
 }
 update(dt:number,reduced=false):void{
  const step=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0,size=this.course.viewport.getComponent(UITransform)!;
  for(const a of this.actors){const p=this.course.project(a),z=this.course.scale;
   a.visible=p.x+110*z>0&&p.x-110*z<size.width&&p.y>0&&p.y-125*z<size.height;a.node.active=a.visible;
   if(!a.visible)continue;const fps=a.spec.id==='flag'?3:2;if(!reduced)a.clock=(a.clock+step)%a.repeat;
   const frame=reduced||a.clock>=4/fps?0:Math.floor(a.clock*fps)%4;if(frame===a.frame)continue;a.frame=frame;
   for(const part of a.parts)if(part.part.moving)this.paint(part.sprite,a.spec,part.part,frame);
  }
 }
 get observation():Record<string,unknown>{return {tier:this.tier,count:this.actors.length,actors:this.actors.map(a=>({kind:a.spec.id,visible:a.visible,clock:a.clock,frame:a.frame,staticFrames:a.parts.filter(p=>!p.part.moving).map(p=>this.assets.environmentFrames.get(a.spec.id+':'+p.part.id)!.indexOf(p.sprite.spriteFrame!))}))};}
 dispose():void{this.clear();this.root.active=false;this.root.destroy();this.tier=null;}
 private clear():void{for(const a of this.actors){a.node.active=false;a.node.destroy();}this.actors=[];}
 private paint(sprite:Sprite,g:EnvironmentGroup,part:EnvironmentPart,index:number):void{const frame=part.frames[index],ui=sprite.node.getComponent(UITransform)!;ui.setContentSize(frame.rect.width,frame.rect.height);ui.setAnchorPoint(frame.anchor.x,frame.anchor.y);sprite.spriteFrame=this.assets.environmentFrames.get(g.id+':'+part.id)![index];}
}
