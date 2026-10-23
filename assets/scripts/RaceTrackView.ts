import { Color, Graphics, Layers, Node, UITransform, UIOpacity } from 'cc';
import { bendPoint, HorsePose, TrackSection } from './TrackVisual';

/** Curve paint and horse paths use the same lane centres and boundaries. No 3D transforms. */
export class RaceTrackView {
  private readonly node:Node;
  private readonly paint:Graphics;
  constructor(parent:Node){
    this.node=new Node('BendTrack');this.node.layer=Layers.Enum.UI_2D;this.node.parent=parent;
    this.node.addComponent(UITransform).setContentSize(960,720);
    this.paint=this.node.addComponent(Graphics);this.node.active=false;
  }
  setSection(section:TrackSection):void{
    const bend=section==='right-bend'||section==='left-bend';this.node.active=bend;
    if(!bend)return;
    const g=this.paint;g.clear();g.fillColor=new Color(16,115,52);g.rect(-480,-58,960,334);g.fill();
    const side=section as 'right-bend'|'left-bend',edge=side==='right-bend'?0:960;
    const outer=Array.from({length:65},(_,i)=>bendPoint(5.5,i/64,side));
    const inner=Array.from({length:65},(_,i)=>bendPoint(-.5,1-i/64,side));
    const road=[{x:edge,y:outer[0].y},...outer,{x:edge,y:outer[64].y},
      {x:edge,y:inner[0].y},...inner,{x:edge,y:inner[64].y}];
    g.moveTo(road[0].x-480,360-road[0].y);
    for(const point of road.slice(1))g.lineTo(point.x-480,360-point.y);
    g.close();g.fillColor=new Color(176,137,82);g.fill();
    for(const lane of [-.5,.5,1.5,2.5,3.5,4.5,5.5]){
      g.lineWidth=lane===-.5||lane===5.5?4:1;
      g.strokeColor=lane===-.5||lane===5.5?new Color(239,231,208):new Color(154,113,64);
      const begin=bendPoint(lane,0,side);g.moveTo(edge-480,360-begin.y);g.lineTo(begin.x-480,360-begin.y);
      for(let i=1;i<=64;i++){const point=bendPoint(lane,i/64,side);g.lineTo(point.x-480,360-point.y);}
      const end=bendPoint(lane,1,side);g.lineTo(edge-480,360-end.y);g.stroke();
    }
  }
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
