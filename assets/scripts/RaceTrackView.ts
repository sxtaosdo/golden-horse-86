import { Color, Graphics, Layers, Node, UITransform, UIOpacity, Mask, Label } from 'cc';
import { bendPoint, coursePoint, courseCamera, projectPoint, CoursePoint, COURSE_FINISH_X, RACE_VIEWPORT, HorsePose } from './TrackVisual';

/** One open U-shaped world. The finish is a separate lower straight, never a second bend. */
export class RaceTrackView {
  readonly viewport:Node;
  readonly world:Node;
  readonly paintBuilds=1;
  private cameraPoint:CoursePoint={x:0,y:0};
  constructor(parent:Node){
    this.viewport=new Node('RaceViewport');this.viewport.layer=Layers.Enum.UI_2D;this.viewport.parent=parent;
    this.viewport.setPosition(0,30);this.viewport.addComponent(UITransform).setContentSize(RACE_VIEWPORT.width,RACE_VIEWPORT.height);
    this.viewport.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
    this.world=new Node('ContinuousRaceWorld');this.world.parent=this.viewport;this.world.layer=Layers.Enum.UI_2D;
    this.world.addComponent(UITransform).setContentSize(5000,1400);
    const paintNode=new Node('CoursePaint');paintNode.parent=this.world;paintNode.layer=Layers.Enum.UI_2D;
    const g=paintNode.addComponent(Graphics);
    this.rect(g,-2000,-1000,6500,3000,'#00b94c');
    const outer=Array.from({length:97},(_,i)=>bendPoint(5.5,i/96));
    const inner=Array.from({length:97},(_,i)=>bendPoint(-.5,1-i/96));
    const road=[{x:-1800,y:outer[0].y},...outer,{x:-1800,y:outer[96].y},
      {x:-1800,y:inner[0].y},...inner,{x:-1800,y:inner[96].y}];
    g.moveTo(road[0].x,-road[0].y);for(const q of road.slice(1))g.lineTo(q.x,-q.y);
    g.close();g.fillColor=new Color(179,143,78);g.fill();
    for(const lane of [-.5,5.5]){
      const first=bendPoint(lane,0);g.moveTo(-1800,-first.y);g.lineTo(first.x,-first.y);
      for(let k=1;k<=96;k++){const q=bendPoint(lane,k/96);g.lineTo(q.x,-q.y);}
      const end=bendPoint(lane,1);g.lineTo(-1800,-end.y);g.strokeColor=new Color(238,238,222);g.lineWidth=4;g.stroke();
      for(let x=-1700;x<2000;x+=115){
        for(const y of [first.y,end.y])this.rect(g,x,y,5,-20,'#eeeecc');
      }
    }
    for(let i=0;i<36;i++){
      const x=-1700+i*108;
      for(const y of [40,360,640,960]){
        this.bush(g,x,y);if(i%2===0)this.flowers(g,x+45,y+27);
      }
    }
    for(let i=0;i<=24;i++){
      const q=bendPoint(-1.05,i/24);this.bush(g,q.x,q.y);
    }
    for(let lane=0;lane<6;lane++){
      const q=coursePoint(lane,0);
      this.rect(g,310,q.y-38,10,40,'#d6c3ed');this.rect(g,320,q.y-38,54,20,'#ffe42c');
      this.rect(g,320,q.y-18,54,19,'#4e425c');this.rect(g,326,q.y-14,42,4,'#b6bbcf');
      this.rect(g,326,q.y-6,42,4,'#b6bbcf');this.label('Gate'+lane,String(lane+1),346,q.y-28,19,'#171017');
    }
    this.rect(g,520,370,52,40,'#b3a4d1');this.rect(g,536,344,13,26,'#f4d534');
    this.rect(g,536,331,13,13,'#e1a66c');this.rect(g,550,322,4,55,'#d6d5bc');
    g.fillColor=new Color(237,32,38);g.moveTo(554,-322);g.lineTo(586,-332);g.lineTo(554,-342);g.close();g.fill();
    // The leftward finish crosses a single upright post, not the departure line.
    this.rect(g,COURSE_FINISH_X,650,7,290,'#161321');this.rect(g,COURSE_FINISH_X+2,652,3,286,'#f5dc28');
    this.rect(g,COURSE_FINISH_X-165,624,240,37,'#10102b');
    this.label('FinishBoard','FINISH',COURSE_FINISH_X-45,640,23,'#599dff');
    for(let i=1;i<=4;i++){
      const x=COURSE_FINISH_X+i*330;
      this.rect(g,x,630,6,48,'#efefdc');this.rect(g,x-16,613,39,24,'#eeefce');
      this.label('Distance'+i,String(i),x+3,625,20,'#bd272c');
    }
    this.follow(0);
  }
  private rect(g:Graphics,x:number,y:number,w:number,h:number,hex:string):void{
    g.fillColor=new Color().fromHEX(hex);g.rect(x,-y,w,-h);g.fill();
  }
  private bush(g:Graphics,x:number,y:number):void{
    this.rect(g,x-20,y-7,47,21,'#1038b0');this.rect(g,x-24,y-18,44,20,'#327b45');
    this.rect(g,x-16,y-26,37,22,'#b8df37');this.rect(g,x-9,y-30,22,12,'#f4ed4b');
    for(let j=0;j<5;j++)this.rect(g,x-18+j*9,y-20+(j%2)*9,5,9,'#1ebd65');
  }
  private flowers(g:Graphics,x:number,y:number):void{
    this.rect(g,x-20,y,44,7,'#1a5f73');this.rect(g,x-18,y-4,40,5,'#f02e2e');
    for(let j=0;j<5;j++)this.rect(g,x-16+j*8,y-6+(j%2)*2,5,4,'#ffe845');
  }
  private label(name:string,text:string,x:number,y:number,size:number,hex:string):void{
    const node=new Node(name);node.parent=this.world;node.layer=Layers.Enum.UI_2D;node.setPosition(x,-y);
    node.addComponent(UITransform).setContentSize(240,40);const label=node.addComponent(Label);
    label.string=text;label.fontFamily='monospace';label.fontSize=size;label.color=new Color().fromHEX(hex);
  }
  follow(progress:number):void{this.cameraPoint=courseCamera(progress);this.world.setPosition(-this.cameraPoint.x,this.cameraPoint.y);}
  project(point:CoursePoint):CoursePoint{return projectPoint(point,this.cameraPoint);}
  get camera():Readonly<CoursePoint>{return this.cameraPoint;}
}
/** Upright front/rear turn views blend over the side sprite before its invisible direction swap. */
export class HorseTurnView {
  private readonly node:Node;
  private readonly paint:Graphics;
  private readonly opacity:UIOpacity;
  private readonly coat:Color;
  constructor(parent:Node,index:number){
    this.node=new Node('TurnFacing');this.node.parent=parent;this.node.layer=Layers.Enum.UI_2D;
    this.node.addComponent(UITransform).setContentSize(134,84);
    this.paint=this.node.addComponent(Graphics);this.opacity=this.node.addComponent(UIOpacity);
    this.coat=new Color(['#e8e9e8','#e331a4','#e62c2a','#283ddb','#ffd825','#2cb240'][index]);
  }
  render(pose:HorsePose,seconds:number):void{
    this.node.active=pose.turn!==null;
    if(!pose.turn)return;
    this.opacity.opacity=Math.round(255*(1-pose.sideOpacity));
    const g=this.paint;g.clear();g.lineWidth=1;g.strokeColor=new Color(16,13,30);
    const step=Math.round(Math.sin(seconds*20)*5);
    const block=(x:number,y:number,w:number,h:number,color:Color)=>{g.fillColor=color;g.rect(x,y,w,h);g.fill();g.stroke();};
    const dark=new Color(25,25,44),skin=new Color(226,160,120),blue=new Color(33,49,180);
    for(const side of [-1,1]){
      block(side*16-4,8+(side>0?step:-step),9,25,this.coat);
      block(side*16-5,5+(side>0?step:-step),11,7,blue);
    }
    block(-21,25,42,28,this.coat);block(-16,48,32,14,this.coat);
    block(-10,34,20,32,this.coat);block(-14,29,28,13,this.coat);
    block(-12,63,7,10,this.coat);block(5,63,7,10,this.coat);
    block(-10,51,5,5,dark);block(5,51,5,5,dark);
    block(-8,31,4,4,dark);block(4,31,4,4,dark);
    block(-14,42,28,3,blue);block(-2,34,4,29,blue);
    block(-20,65,40,7,new Color(243,217,34));
    block(-14,70,28,11,new Color(223,47,53));
    block(-9,80,18,12,skin);block(-11,90,22,5,new Color(223,47,53));
    block(-15,86,30,4,new Color(223,47,53));
  }
}
