import { Color, Graphics, Label, Layers, Node, Sprite, UITransform } from 'cc';
import { RaceEventId } from '../../events/RaceEventCatalog';
import { RaceVisualAssets } from '../RaceVisualAssets';
import { RaceTrackView } from '../../RaceTrackView';
import { RaceBroadcast } from './RaceBroadcast';
import { RACE_WORLD_LAYER } from './RaceLayers';
import { RaceScreenState } from './RaceScreen';
import { EquipmentAnimation, EquipmentFocus } from './EquipmentAnimation';
import { MotionPart } from './EquipmentMotionCatalog';
import { coursePoint } from '../../TrackVisual';

/** Owns only presentation nodes. Changing tier never rebuilds the course or simulation. */
export class EquipmentScene {
 private tier:RaceEventId|null=null;
 private roots:Node[]=[];
 private broadcast:RaceBroadcast|null=null;
 private screen:Node|null=null;
 private video:Node|null=null;
 private caption:Label|null=null;
 private captionBackground:Node|null=null;
 private screenFoot={x:0,y:0,width:0,height:0};
 private mode:RaceScreenState['mode']='off';
 private visible=false;
 private ids:readonly string[]=[];
 private cameras:Array<{head:Sprite;animation:EquipmentAnimation;part:MotionPart;scale:number;origin:{x:number;y:number};horse:number;frame:number}>=[];
 private signals:Array<{head:Sprite;part:MotionPart;scale:number;frame:number}>=[];
 private gates:Array<{head:Sprite;part:MotionPart;scale:number;frame:number}>=[];
 constructor(private readonly course:RaceTrackView,private readonly host:Node,private readonly assets:RaceVisualAssets){}
 setTier(id:RaceEventId):void{
  if(this.tier===id)return;
  this.clear();this.tier=id;this.ids=this.assets.catalog.get(id).equipment;
  const back=this.node(this.course.world,'EventEquipmentBack'),front=this.node(this.course.world,'EventEquipmentFront');
  this.roots=[back,front];back.setSiblingIndex(this.course.horseLayer.getSiblingIndex());
  for(const key of this.assets.catalog.get(id).equipment){
   const spec=this.assets.equipmentCatalog.get(key),frame=this.assets.equipment.get(key)!;
   if(spec.mode==='gate'){
    // Six near-side walls are shared boundaries; the outer far wall closes the seventh edge.
    const far=spec.positions.reduce((a,p)=>p.y<a.y?p:a),rig=this.assets.motionCatalog.gate;
    const n=this.node(this.course.horseLayer,'GateFarRail');n.setPosition(far.x,-coursePoint(5.5,0).y);n.addComponent(UITransform);
    const sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;
    this.motionFrame(sprite,rig.base,0,far.width/rig.referenceWidth);this.roots.push(n);
   }
   for(const [row,p] of spec.positions.entries()){
    const screen=key==='screen',gate=spec.mode==='gate',n=this.node(gate?this.course.horseLayer:spec.front?front:back,gate?'GateNearRail'+(row+1):'Equipment-'+key,screen?Layers.Enum.UI_2D:RACE_WORLD_LAYER);
    if(gate)this.roots.push(n);
    const height=p.width*spec.frame.height/spec.frame.width;n.setPosition(p.x,-p.y);
    const transform=n.addComponent(UITransform);transform.setAnchorPoint(.5,0);transform.setContentSize(p.width,height);
    if(spec.mode==='tracking'||spec.mode==='signal'||spec.mode==='gate'){
     const rig=spec.mode==='tracking'?this.assets.motionCatalog.camera:spec.mode==='signal'?this.assets.motionCatalog.warning:this.assets.motionCatalog.gate,scale=p.width/rig.referenceWidth;
     const baseNode=this.node(n,'FixedBase');baseNode.addComponent(UITransform);const base=baseNode.addComponent(Sprite);base.sizeMode=Sprite.SizeMode.CUSTOM;this.motionFrame(base,rig.base,0,scale);
     const headNode=this.node(n,'MovingHead');headNode.addComponent(UITransform);const head=headNode.addComponent(Sprite);head.sizeMode=Sprite.SizeMode.CUSTOM;headNode.setPosition(rig.mount.x*scale,rig.mount.y*scale);this.motionFrame(head,rig.head,0,scale);
     if(spec.mode==='tracking')this.cameras.push({head,part:rig.head,scale,animation:new EquipmentAnimation(this.assets.motionCatalog.camera.turnDegreesPerSecond),origin:{x:p.x+rig.mount.x*scale,y:p.y-rig.mount.y*scale},horse:0,frame:0});
     else (spec.mode==='signal'?this.signals:this.gates).push({head,part:rig.head,scale,frame:0});
     continue;
    }
    const sprite=n.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=frame;
    if(p.label){const label=this.label(n,'DistanceLabel',p.label,22,RACE_WORLD_LAYER);label.node.setPosition(0,height*.79);}
    if(screen){
     this.screen=n;this.screenFoot={x:p.x,y:p.y,width:p.width,height};
     const w=spec.window!,scale=p.width/spec.frame.width;
     const centerX=(w.x-spec.frame.x-spec.frame.width/2+w.width/2)*scale;
     const centerY=(spec.frame.height-(w.y-spec.frame.y)-w.height/2)*scale;
     this.video=this.node(n,'RaceLiveVideo',Layers.Enum.UI_2D);this.video.setPosition(centerX,centerY);
     const videoWidth=Math.min(w.width,w.height*16/9)*scale;
     this.video.addComponent(UITransform).setContentSize(videoWidth,videoWidth*9/16);
     const display=this.video.addComponent(Sprite);display.sizeMode=Sprite.SizeMode.CUSTOM;
     this.broadcast=new RaceBroadcast(this.host,display);
     this.caption=this.label(n,'RaceScreenCaption','',24,Layers.Enum.UI_2D);
     this.caption.node.setPosition(centerX,centerY);this.caption.node.getComponent(UITransform)!.setContentSize(w.width*scale-12,w.height*scale-8);
     this.caption.overflow=Label.Overflow.SHRINK;
     const panel=this.node(n,'CaptionBackground',Layers.Enum.UI_2D);panel.setPosition(centerX,centerY);panel.setSiblingIndex(0);
     const g=panel.addComponent(Graphics);g.fillColor=new Color(5,14,18,255);g.rect(-w.width*scale/2,-w.height*scale/2,w.width*scale,w.height*scale);g.fill();
     this.captionBackground=panel;
    }
   }
  }
 }
 update(dt:number,state:RaceScreenState,focus:EquipmentFocus):void{
  for(const camera of this.cameras){
   const frame=camera.animation.update(dt,focus.round,camera.origin,focus.point);camera.horse=focus.horse;
   if(frame!==camera.frame){camera.frame=frame;this.motionFrame(camera.head,camera.part,frame,camera.scale);}
  }
  const lampFrame=EquipmentAnimation.lampFrame(focus.phase,focus.preparationRemaining,this.assets.motionCatalog.warning.blinkSeconds);
  for(const signal of this.signals)if(lampFrame!==signal.frame){signal.frame=lampFrame;this.motionFrame(signal.head,signal.part,lampFrame,signal.scale);}
  const gateFrame=EquipmentAnimation.gateFrame(focus.phase,focus.raceElapsed,this.assets.motionCatalog.gate.openingSeconds);
  for(const gate of this.gates)if(gateFrame!==gate.frame){gate.frame=gateFrame;this.motionFrame(gate.head,gate.part,gateFrame,gate.scale);}
  if(!this.screen)return;
  this.mode=state.mode;
  const live=state.mode==='live'||state.mode==='preparing',p=this.course.project(this.screenFoot),size=this.course.viewport.getComponent(UITransform)!;
  const visible=p.x+this.screenFoot.width*this.course.scale/2>0&&p.x-this.screenFoot.width*this.course.scale/2<size.width&&p.y>0&&p.y-this.screenFoot.height*this.course.scale<size.height;
  this.visible=visible;
  this.video!.active=live;this.caption!.node.active=state.mode!=='live';this.caption!.string=state.text;
  this.broadcast!.update(dt,visible&&live);
 }
 get observation():Record<string,unknown>{return {tier:this.tier,types:[...this.ids],typeCount:this.ids.length,staticTypes:this.ids.filter(id=>this.assets.equipmentCatalog.items.find(s=>s.id===id)!.mode==='static'),dynamicTypes:this.ids.filter(id=>this.assets.equipmentCatalog.items.find(s=>s.id===id)!.mode!=='static'),cameras:this.cameras.map(c=>({targetHorse:c.horse,renderedFrame:this.assets.motionFrames.get(c.part.resource)!.indexOf(c.head.spriteFrame!),...c.animation.observation,pivot:{...c.origin},basePosition:{x:c.head.node.parent!.position.x,y:-c.head.node.parent!.position.y}})),signals:this.signals.map(s=>({frame:s.frame,renderedFrame:this.assets.motionFrames.get(s.part.resource)!.indexOf(s.head.spriteFrame!),basePosition:{x:s.head.node.parent!.position.x,y:-s.head.node.parent!.position.y}})),gates:this.gates.map(g=>({frame:g.frame,renderedFrame:this.assets.motionFrames.get(g.part.resource)!.indexOf(g.head.spriteFrame!),basePosition:{x:g.head.node.parent!.position.x,y:-g.head.node.parent!.position.y}})),screenMode:this.screen?this.mode:'off',screenVisible:this.visible,broadcastAllocated:!!this.broadcast,broadcastSamples:this.broadcast?.sampleCount??0};}
 dispose():void{this.clear();this.tier=null;}
 private clear():void{this.broadcast?.dispose();this.broadcast=null;for(const root of this.roots){root.active=false;root.destroy();}this.roots=[];this.cameras=[];this.signals=[];this.gates=[];this.screen=null;this.caption=null;this.captionBackground=null;this.video=null;this.mode='off';this.visible=false;this.ids=[];}
 private motionFrame(sprite:Sprite,part:MotionPart,index:number,scale:number):void{
  const frame=part.frames[index],size=sprite.node.getComponent(UITransform)!;
  size.setAnchorPoint(frame.anchor.x,frame.anchor.y);size.setContentSize(frame.width*scale,frame.height*scale);
  sprite.node.setScale(frame.flipX?-1:1,1,1);sprite.spriteFrame=this.assets.motionFrames.get(part.resource)![index];
 }
 private node(parent:Node,name:string,layer=RACE_WORLD_LAYER):Node{const n=new Node(name);n.layer=layer;n.parent=parent;return n;}
 private label(parent:Node,name:string,text:string,size:number,layer:number):Label{
  const n=this.node(parent,name,layer);n.addComponent(UITransform).setContentSize(100,40);const l=n.addComponent(Label);l.string=text;l.fontFamily='Arial';l.fontSize=size;l.lineHeight=size+6;l.color=new Color(255,225,146);l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;return l;
 }
}
