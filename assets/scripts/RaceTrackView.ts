import { Color, Graphics, Layers, Node, UITransform, UIOpacity, Mask, Label } from 'cc';
import { bendPoint, coursePoint, courseCamera, projectPoint, CoursePoint, COURSE_FINISH_X, HorsePose } from './TrackVisual';

/** One persistent world, clipped to the race viewport. All scenery and racers share its transform. */
export class RaceTrackView {
  readonly world:Node;
  readonly paintBuilds:number;
  private cameraPoint:CoursePoint={x:0,y:0};
  constructor(parent:Node){
    const viewport=new Node('RaceViewport');viewport.layer=Layers.Enum.UI_2D;viewport.parent=parent;
    viewport.setPosition(0,109);viewport.addComponent(UITransform).setContentSize(960,334);
    viewport.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
    this.world=new Node('ContinuousRaceWorld');this.world.parent=viewport;this.world.layer=Layers.Enum.UI_2D;
    this.world.addComponent(UITransform).setContentSize(2200,1000);
    const paintNode=new Node('CoursePaint');paintNode.parent=this.world;paintNode.layer=Layers.Enum.UI_2D;
    const g=paintNode.addComponent(Graphics);
    g.fillColor=new Color(16,115,52);g.rect(-1000,-2000,5000,4000);g.fill();
    this.outline(g,5.5);g.fillColor=new Color(176,137,82);g.fill();
    g.strokeColor=new Color(239,231,208);g.lineWidth=5;g.stroke();
    this.outline(g,-.5);g.fillColor=new Color(16,115,52);g.fill();
    g.strokeColor=new Color(239,231,208);g.lineWidth=5;g.stroke();
    for(let lane=.5;lane<5;lane++){
      this.outline(g,lane);g.strokeColor=new Color(154,113,64);g.lineWidth=1;g.stroke();
    }
    for(let i=0;i<360;i++){
      const point=coursePoint(((i*17)%60)/10-.5,i/360);
      g.fillColor=i%2?new Color(196,149,89):new Color(151,108,59);
      g.rect(point.x,-point.y,4+(i%4),2);g.fill();
    }
    for(let i=0;i<100;i++){
      for(const lane of [-.5,5.5]){
        const point=coursePoint(lane,i/100);g.fillColor=new Color(231,228,206);
        g.rect(point.x-2,-point.y,4,17);g.fill();
      }
    }
    for(let row=0;row<11;row++)for(let col=0;col<2;col++){
      g.fillColor=(row+col)%2?new Color(245,244,232):new Color(20,21,30);
      g.rect(COURSE_FINISH_X+col*10,-(661+row*10),10,-10);g.fill();
    }
    const sign=new Node('FinishSign');sign.parent=this.world;sign.layer=Layers.Enum.UI_2D;
    sign.setPosition(COURSE_FINISH_X+10,-638);sign.addComponent(UITransform).setContentSize(110,30);
    const label=sign.addComponent(Label);label.string='起点 / 终点';label.fontSize=18;label.color=new Color(255,235,80);
    this.paintBuilds=1;this.follow(0);
  }
  private outline(g:Graphics,lane:number):void{
    const start=bendPoint(lane,0,'right-bend');g.moveTo(start.x,-start.y);
    for(const side of ['right-bend','left-bend'] as const){
      const begin=bendPoint(lane,0,side);g.lineTo(begin.x,-begin.y);
      for(let i=1;i<=64;i++){const point=bendPoint(lane,i/64,side);g.lineTo(point.x,-point.y);}
    }
    g.close();
  }
  follow(progress:number):void{
    this.cameraPoint=courseCamera(progress);this.world.setPosition(-this.cameraPoint.x,this.cameraPoint.y);
  }
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
    const g=this.paint;g.clear();g.lineWidth=2;g.strokeColor=new Color(18,15,34);
    const step=Math.sin(seconds*20)*5;
    for(const side of [-1,1]){
      g.fillColor=this.coat;g.rect(side*13-4,4+(side>0?step:-step),8,22);g.fill();g.stroke();
      g.fillColor=new Color(25,23,28);g.rect(side*13-5,2+(side>0?step:-step),10,5);g.fill();
    }
    g.fillColor=this.coat;g.ellipse(0,34,23,23);g.fill();g.stroke();
    if(pose.turn==='front'){
      g.ellipse(0,40,10,19);g.fill();g.stroke();g.fillColor=new Color(25,23,28);
      g.circle(-6,48,2);g.circle(6,48,2);g.fill();
    }else{
      g.fillColor=new Color(35,24,30);g.rect(-3,17,6,23);g.fill();
    }
    g.fillColor=new Color(248,214,38);g.rect(-11,48,22,15);g.fill();g.stroke();
    g.fillColor=new Color(226,178,138);g.circle(0,68,7);g.fill();g.stroke();
    g.fillColor=new Color(212,34,34);g.ellipse(0,73,10,5);g.fill();
  }
}
