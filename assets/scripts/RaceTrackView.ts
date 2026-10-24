import { Canvas, Color, Graphics, Layers, Node, UITransform, Mask, Label, Sprite, SpriteFrame } from 'cc';
import { RACE_WORLD_LAYER } from './presentation/equipment/RaceLayers';
import { bendPoint, coursePoint, courseCamera, CoursePoint, COURSE_FINISH_X } from './TrackVisual';
import { RaceVisualAssets } from './presentation/RaceVisualAssets';
import { raceFraming } from './presentation/MobileLayout';
/** A single persistent orthographic world. Tiles are clipped to the same U-shaped road as the horses. */
export class RaceTrackView {
 readonly viewport:Node;readonly world:Node;readonly horseLayer:Node;readonly paintBuilds=1;
 private cameraPoint:CoursePoint={x:0,y:0};private width=750;private height=696;private zoom=.78;private yBias=75;
 constructor(parent:Node){
  for(let ancestor:Node|null=parent;ancestor;ancestor=ancestor.parent){const camera=ancestor.getComponent(Canvas)?.cameraComponent;if(camera){camera.visibility|=RACE_WORLD_LAYER;break;}}
  this.viewport=this.node(parent,'RaceViewport');this.viewport.addComponent(UITransform).setContentSize(750,696);this.viewport.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
  this.world=this.node(this.viewport,'ContinuousRaceWorld');this.world.addComponent(UITransform).setContentSize(5000,1400);this.horseLayer=this.node(this.world,'RaceHorses');this.follow(0);
 }
 resize(width:number,height:number):void{this.width=width;this.height=height;const framing=raceFraming(width,height);this.zoom=framing.zoom;this.yBias=framing.yBias;this.world.setScale(this.zoom,this.zoom,1);this.viewport.setPosition(0,0);this.viewport.getComponent(UITransform)!.setContentSize(width,height);}
 decorate(assets:RaceVisualAssets):void{
  const grass=this.node(this.world,'GrassTiles');this.tiles(grass,assets.ground.get('grass')!,-1900,-650,4800,2304);
  const outer=Array.from({length:97},(_,i)=>bendPoint(5.5,i/96)),inner=Array.from({length:97},(_,i)=>bendPoint(-.5,1-i/96));
  const road=[{x:-1900,y:outer[0].y},...outer,{x:-1900,y:outer[96].y},{x:-1900,y:inner[0].y},...inner,{x:-1900,y:inner[96].y}];
  const roadNode=this.node(this.world,'TexturedRoadMask');roadNode.addComponent(UITransform).setContentSize(5000,1600);
  roadNode.addComponent(Mask).type=Mask.Type.GRAPHICS_STENCIL;const mask=roadNode.getComponent(Graphics)!;mask.clear();
  mask.moveTo(road[0].x,-road[0].y);road.slice(1).forEach(p=>mask.lineTo(p.x,-p.y));mask.close();mask.fill();
  this.tiles(roadNode,assets.ground.get('dirt')!,-1900,60,4800,1024);
  const rails=this.node(this.world,'RailsAndMarkers').addComponent(Graphics);
  for(const lane of [-.5,5.5]){
   const first=bendPoint(lane,0);rails.moveTo(-1900,-first.y);rails.lineTo(first.x,-first.y);
   for(let i=1;i<=96;i++){const p=bendPoint(lane,i/96);rails.lineTo(p.x,-p.y);}
   const end=bendPoint(lane,1);rails.lineTo(-1900,-end.y);rails.strokeColor=new Color(240,232,201);rails.lineWidth=4;rails.stroke();
   for(let x=-1800;x<2000;x+=115)for(const y of [first.y,end.y])this.rect(rails,x,y,4,-18,'#e7d8ac');
  }
  for(let lane=0;lane<6;lane++){const q=coursePoint(lane,0);this.rect(rails,315,q.y-36,9,39,'#d6c3ed');this.rect(rails,324,q.y-36,50,18,'#d2b15c');this.rect(rails,324,q.y-18,50,18,'#283e42');this.label('Gate'+lane,String(lane+1),348,q.y-27,17,'#141e23');}
  this.rect(rails,COURSE_FINISH_X,650,7,290,'#14222b');this.rect(rails,COURSE_FINISH_X+2,652,3,286,'#f7db76');
  const prop=(name:string,x:number,y:number,width:number)=>{const frame=assets.props.get(name)!;this.sprite(this.world,name,frame,x,y,width,width*frame.rect.height/frame.rect.width);};
  for(let x=-1300;x<2100;x+=300){prop('shrub',x,45,92);prop('flowers',x+100,365,98);prop('shrub',x+80,625,90);}
  for(let i=0;i<=16;i++){const q=bendPoint(-1.3,i/16);prop(i%3?'shrub':'flowers',q.x,q.y,85);}
  prop('gate',300,65,210);prop('starter',540,365,100);prop('canopy',1050,585,210);prop('truck',1750,610,200);prop('crates',1270,590,92);prop('tree',1950,610,175);prop('spectators',1300,650,170);prop('scoreboard',200,500,220);
  this.label('FinishBoard','FINISH',200,430,22,'#ffd56b');
  this.horseLayer.setSiblingIndex(this.world.children.length-1);
 }
 private node(parent:Node,name:string):Node{const n=new Node(name);n.layer=RACE_WORLD_LAYER;n.parent=parent;return n;}
 private sprite(parent:Node,name:string,frame:SpriteFrame,x:number,y:number,width:number,height:number):void{
  const n=this.node(parent,name);n.setPosition(x,-y);const t=n.addComponent(UITransform);t.setContentSize(width,height);t.setAnchorPoint(.5,0);const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.spriteFrame=frame;
 }
 private tiles(parent:Node,frame:SpriteFrame,x:number,y:number,width:number,height:number):void{for(let dx=0;dx<width;dx+=256)for(let dy=0;dy<height;dy+=256)this.sprite(parent,'GroundTile',frame,x+dx+128,y+dy+256,256.5,256.5);}
 private rect(g:Graphics,x:number,y:number,w:number,h:number,color:string):void{g.fillColor=new Color().fromHEX(color);g.rect(x,-y,w,-h);g.fill();}
 private label(name:string,text:string,x:number,y:number,size:number,color:string):void{const n=this.node(this.world,name);n.setPosition(x,-y);n.addComponent(UITransform).setContentSize(180,34);const l=n.addComponent(Label);l.string=text;l.fontFamily='Arial';l.fontSize=size;l.lineHeight=size+2;l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.color=new Color().fromHEX(color);}
 follow(progress:number):void{const p=courseCamera(progress);this.cameraPoint={x:p.x,y:p.y-this.yBias};this.world.setPosition(-this.cameraPoint.x*this.zoom,this.cameraPoint.y*this.zoom-45);}
 project(point:CoursePoint):CoursePoint{return{x:this.width/2+(point.x-this.cameraPoint.x)*this.zoom,y:this.height/2+45+(point.y-this.cameraPoint.y)*this.zoom};}
 get camera():Readonly<CoursePoint>{return this.cameraPoint;}
 get scale():number{return this.zoom;}
}
