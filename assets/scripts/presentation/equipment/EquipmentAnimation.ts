import { Phase } from '../../RaceModel';
import { CoursePoint } from '../../TrackVisual';

export interface EquipmentFocus {readonly round:number;readonly phase:Phase;readonly preparationRemaining:number;readonly raceElapsed:number;readonly horse:number;readonly point:Readonly<CoursePoint>;}

/** Presentation-only yaw. Zero is right; positive angles turn towards screen up. */
export class EquipmentAnimation {
 private round=-1;
 private angle=0;
 private desired=0;
 private frame=0;
 constructor(private readonly turnDegreesPerSecond:number){}
 update(dt:number,round:number,origin:Readonly<CoursePoint>,target:Readonly<CoursePoint>):number{
  const dx=target.x-origin.x,dy=origin.y-target.y;
  if(dx!==0||dy!==0)this.desired=EquipmentAnimation.normalize(Math.atan2(dy,dx)*180/Math.PI);
  if(this.round!==round){this.round=round;this.angle=this.desired;}
  else if(Number.isFinite(dt)&&dt>0){
   const delta=EquipmentAnimation.delta(this.desired,this.angle),step=this.turnDegreesPerSecond*Math.min(.1,dt);
   this.angle=EquipmentAnimation.normalize(this.angle+Math.sign(delta)*Math.min(Math.abs(delta),step));
  }
  this.frame=Math.round(this.angle/45)%8;return this.frame;
 }
 get observation():Record<string,number>{return {angle:this.angle,desiredAngle:this.desired,frame:this.frame};}
 static lampFrame(phase:Phase,preparationRemaining:number,blinkSeconds:number):number{
  if(phase==='racing')return 1;
  return phase==='preparing'&&Math.floor((Math.max(0,preparationRemaining)+1e-8)/blinkSeconds)%2===0?1:0;
 }
 static gateFrame(phase:Phase,raceElapsed:number,openingSeconds:number):number{
  if(phase==='betting'||phase==='preparing')return 0;
  return phase==='result'?3:Math.max(0,Math.min(3,Math.round(raceElapsed/openingSeconds*3)));
 }
 private static normalize(angle:number):number{return (angle%360+360)%360;}
 private static delta(target:number,current:number):number{return (target-current+540)%360-180;}
}
