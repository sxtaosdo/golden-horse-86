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
const clamp=(v:number)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
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
    pose.turn='front';pose.flipX=theta>=Math.PI/2;pose.sideOpacity=Math.pow(Math.abs(Math.cos(theta)),6);
  }
  if(progress>0)pose.y+=Math.sin(seconds*20+index*1.4)*1.2;
  return pose;
}
