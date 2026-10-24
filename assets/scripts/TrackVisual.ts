/** Observed 86 course: outbound straight, one clockwise hairpin, leftward finish. */
export type TrackSection='straight'|'right-bend'|'finish';
export interface CoursePoint {x:number;y:number;}
export interface HorsePose extends CoursePoint {scale:number;angle:number;flipX:boolean;sideOpacity:number;turn:'front'|'rear'|null;}
export const COURSE_FINISH_X=400;
export const HORSE_SCALE=1.05;
export const HORSE_SPRITE_WIDTH=134;
// Source PNG is 216px wide; its rightmost opaque muzzle is x208. Include node scale.
export const HORSE_NOSE_X=(208/216-.5)*HORSE_SPRITE_WIDTH*HORSE_SCALE;
export const RACE_VIEWPORT={width:960,height:660,centreX:480,centreY:330} as const;
const RIGHT=2000,CENTRE_Y=500,START_X=400,FINISH_FOOT=COURSE_FINISH_X+HORSE_NOSE_X;
const ARC_SAMPLES=128;
const ARC_TABLE:readonly number[]=(()=>{
  const table=[0];let previous={x:0,y:300};
  for(let i=1;i<=ARC_SAMPLES;i++){
    const theta=i/ARC_SAMPLES*Math.PI,point={x:420*Math.sin(theta),y:300*Math.cos(theta)};
    table.push(table[i-1]+Math.hypot(point.x-previous.x,point.y-previous.y));previous=point;
  }return table;
})();
const ARC_LENGTH=ARC_TABLE[ARC_SAMPLES];
const LENGTH=RIGHT-START_X+ARC_LENGTH+RIGHT-FINISH_FOOT;
export const COURSE_BREAKS=[0,(RIGHT-START_X)/LENGTH,(RIGHT-START_X+ARC_LENGTH)/LENGTH,1] as const;
export const FINAL_STRAIGHT_START=COURSE_BREAKS[2];
/** Authored time/distance fit to the observed launch, turn and second acceleration. */
export class RacePace {
 static readonly homeTime=.66;
 // time, distance, d(distance)/d(normalised time); Hermite slopes keep speed continuous.
 private static readonly knots:readonly (readonly [number,number,number])[]=[
  [0,0,0],[.065,.025,.72],[.15,.123,1.4],[.29,.28,1.1],
  [.4,COURSE_BREAKS[1],.95],[RacePace.homeTime,FINAL_STRAIGHT_START,.75],
 ];
 static progress(seconds:number,finishSeconds:number,referenceSeconds=finishSeconds):number{
  const time=Math.max(0,Number.isFinite(seconds)?seconds:0),entry=referenceSeconds*this.homeTime;
  if(time>=finishSeconds)return Math.min(1.5,1+(time-finishSeconds)*1.3/referenceSeconds);
  if(time>=entry){
   const duration=finishSeconds-entry;
   return this.segment((time-entry)/duration,FINAL_STRAIGHT_START,1,.75*duration/referenceSeconds,1.3*duration/referenceSeconds);
  }
  const t=time/referenceSeconds;
  for(let i=1;i<this.knots.length;i++){
   const [end,p1,v1]=this.knots[i];if(t>end)continue;
   const [start,p0,v0]=this.knots[i-1],duration=end-start;
   return this.segment((t-start)/duration,p0,p1,v0*duration,v1*duration);
  }
  return FINAL_STRAIGHT_START;
 }
 private static segment(t:number,p0:number,p1:number,m0:number,m1:number):number{
  const t2=t*t,t3=t2*t;
  return (2*t3-3*t2+1)*p0+(t3-2*t2+t)*m0+(-2*t3+3*t2)*p1+(t3-t2)*m1;
 }
}

const clamp=(v:number)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
/** Bounded lane rivalry. Progress is shared by horses, cameras and finish detection. */
export class RaceChoreography {
 static progress(horse:number,seconds:number,finishSeconds:number,referenceSeconds:number,seed:number):number{
  const base=RacePace.progress(seconds,finishSeconds,referenceSeconds);
  const limits=[0,COURSE_BREAKS[1]/2,COURSE_BREAKS[1],(COURSE_BREAKS[1]+FINAL_STRAIGHT_START)/2,FINAL_STRAIGHT_START,.94];
  if(base<=0||base>=.94)return base;
  let section=0;while(base>=limits[section+1])section++;
  const local=(base-limits[section])/(limits[section+1]-limits[section]);
  const a=this.offset(seed,horse,section),b=this.offset(seed,horse,section+1),ease=local*local*(3-2*local);
  return base+a+(b-a)*ease;
 }
 private static offset(seed:number,horse:number,knot:number):number{
  if(knot===0||knot===5)return 0;
  // Seeded relative positions keep visible spread at joins without drawing race RNG.
  const value=this.weight(seed,horse,knot,0);let rank=0;
  for(let i=0;i<6;i++){const other=this.weight(seed,i,knot,0);if(other<value||(other===value&&i<horse))rank++;}
  return (rank/2.5-1)*(knot===1?.012:.006);
 }
 private static weight(seed:number,horse:number,section:number,axis:number):number{
  let x=(seed^Math.imul(horse+1,0x9e3779b9)^Math.imul(section+1,0x85ebca6b)^Math.imul(axis+1,0xc2b2ae35))>>>0;
  x=Math.imul(x^(x>>>16),0x7feb352d);x=Math.imul(x^(x>>>15),0x846ca68b);return ((x^(x>>>16))>>>0)/4294967295*2-1;
 }
}
function curveAngle(fraction:number):number{
  const distance=clamp(fraction)*ARC_LENGTH;let low=0,high=ARC_SAMPLES;
  while(high-low>1){const middle=(low+high)>>1;if(ARC_TABLE[middle]<distance)low=middle;else high=middle;}
  return (low+(distance-ARC_TABLE[low])/(ARC_TABLE[high]-ARC_TABLE[low]))/ARC_SAMPLES*Math.PI;
}
export function trackSection(progress:number):TrackSection{
  if(clamp(progress)<COURSE_BREAKS[1])return 'straight';
  return clamp(progress)<FINAL_STRAIGHT_START?'right-bend':'finish';
}
export function trackSectionName(section:TrackSection):string{
  return ({straight:'起跑直道','right-bend':'弯道',finish:'终点直道'})[section];
}
export function bendPoint(lane:number,fraction:number,_side:'right-bend'='right-bend'):CoursePoint{
  const theta=curveAngle(fraction);
  return {x:RIGHT+(320+40*lane)*Math.sin(theta),y:CENTRE_Y-(200+40*lane)*Math.cos(theta)};
}
export function coursePoint(lane:number,progress:number):CoursePoint{
  const p=Number.isFinite(progress)?Math.max(0,progress):0;
  if(p<COURSE_BREAKS[1])return {x:START_X+(RIGHT-START_X)*p/COURSE_BREAKS[1],y:CENTRE_Y-200-40*lane};
  if(p<FINAL_STRAIGHT_START)return bendPoint(lane,(p-COURSE_BREAKS[1])/(FINAL_STRAIGHT_START-COURSE_BREAKS[1]));
  return {x:RIGHT-(RIGHT-FINISH_FOOT)*(p-FINAL_STRAIGHT_START)/(1-FINAL_STRAIGHT_START),y:CENTRE_Y+200+40*lane};
}
export function courseCamera(progress:number):CoursePoint{
  let p=clamp(progress);
  if(p>.9){const t=(p-.9)/.1;p=.9+.1*(t+t*t-t*t*t);}
  return coursePoint(2.5,p);
}
export function projectPoint(point:CoursePoint,camera:CoursePoint):CoursePoint{
  return {x:RACE_VIEWPORT.centreX+point.x-camera.x,y:RACE_VIEWPORT.centreY+point.y-camera.y};
}
export function horsePose(index:number,progress:number,seconds=0):HorsePose{
  if(!Number.isInteger(index)||index<0||index>5)throw Error('horseIndex must be 0..5');
  const pose:HorsePose={...coursePoint(index,progress),scale:HORSE_SCALE,angle:0,flipX:progress>=FINAL_STRAIGHT_START,sideOpacity:1,turn:null};
  if(trackSection(progress)==='right-bend'){
    const theta=curveAngle((progress-COURSE_BREAKS[1])/(FINAL_STRAIGHT_START-COURSE_BREAKS[1]));
    pose.angle=theta;
    pose.turn='front';pose.flipX=theta>=Math.PI/2;pose.sideOpacity=Math.pow(Math.abs(Math.cos(theta)),6);
  }
  if(progress>=FINAL_STRAIGHT_START)pose.angle=Math.PI;
  if(progress>0)pose.y+=Math.sin(seconds*20+index*1.4)*1.2;
  return pose;
}
