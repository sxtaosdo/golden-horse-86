import { Color, Graphics, Node, UITransform } from 'cc';
import { coursePoint, horsePose } from '../TrackVisual';
import { Phase } from '../RaceModel';
import { RACE_WORLD_LAYER } from './equipment/RaceLayers';

interface Dust {node:Node;graphic:Graphics;age:number;x:number;y:number;dx:number;dy:number;size:number;}
/** Small, ground-depth sorted hoof puffs. No gameplay clock or outcome is held here. */
export class RaceGroundEffects {
 private particles:Dust[]=[];private beats:number[]=Array(6).fill(-1);private previous:number[]=Array(6).fill(0);private round=-1;private disabled=false;
 constructor(private readonly parent:Node){}
 update(dt:number,round:number,phase:Phase,progress:readonly number[],strides:readonly number[],reduced=false):void{
  const step=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
  if(round!==this.round||reduced!==this.disabled){this.clear();this.round=round;this.disabled=reduced;}
  for(const p of this.particles)if(p.node.active){p.age+=step;if(p.age>=.36){p.node.active=false;continue;}const t=p.age/.36;p.node.setPosition(p.x+p.dx*t,-p.y-p.dy*t);p.graphic.clear();p.graphic.fillColor=new Color(166,120,67,Math.round(45*(1-t)));p.graphic.ellipse(0,0,p.size*(1+t),p.size*.38*(1+t));p.graphic.fill();}
  for(let i=0;i<6;i++){
   const beat=Math.floor(strides[i]*5),moving=(phase==='racing'||phase==='result')&&progress[i]>0&&progress[i]<1.12;
   if(!reduced&&moving&&this.beats[i]>=0&&beat!==this.beats[i]&&step>0){
    const pose=horsePose(i,progress[i]),speed=Math.max(0,(progress[i]-this.previous[i])/step),c=Math.cos(pose.angle),s=Math.sin(pose.angle),ground=coursePoint(i,progress[i]);
    this.spawn(ground.x-18*c,ground.y-8*s,-12*c+((i+beat)%3-1)*3,-9*s,Math.min(6,2+speed*45));
   }
   this.beats[i]=beat;this.previous[i]=progress[i];
  }
 }
 private spawn(x:number,y:number,dx:number,dy:number,size:number):void{
  let p=this.particles.find(p=>!p.node.active);
  if(!p){if(this.particles.length>=48)return;const node=new Node('HoofDust');node.layer=RACE_WORLD_LAYER;node.parent=this.parent;node.addComponent(UITransform);p={node,graphic:node.addComponent(Graphics),age:0,x,y,dx,dy,size};this.particles.push(p);}
  Object.assign(p,{age:0,x,y,dx,dy,size});p.node.active=true;p.node.setPosition(x,-y);p.graphic.clear();p.graphic.fillColor=new Color(166,120,67,45);p.graphic.ellipse(0,0,size,size*.38);p.graphic.fill();
 }
 clear():void{for(const p of this.particles)p.node.active=false;this.beats.fill(-1);this.previous.fill(0);}
 get observation():Record<string,number>{return {active:this.particles.filter(p=>p.node.active).length,allocated:this.particles.length,limit:48};}
 dispose():void{for(const p of this.particles){p.node.active=false;p.node.destroy();}this.particles=[];}
}
