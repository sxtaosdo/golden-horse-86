/** A single continuous 2D racecourse in world coordinates; no background/scene changes. */
export type TrackSection='straight'|'right-bend'|'backstraight'|'left-bend'|'finish';
export interface CoursePoint {x:number;y:number;}
export interface HorsePose extends CoursePoint {scale:number;angle:number;flipX:boolean;sideOpacity:number;turn:'front'|'rear'|null;}
export const COURSE_FINISH_X=1000;
export const HORSE_NOSE_X=40;
const LEFT=400,RIGHT=1600,CENTRE_Y=500,START_X=COURSE_FINISH_X-HORSE_NOSE_X,FINISH_FOOT=START_X;
const ARC_SAMPLES=128;
// Reference-lane arc lengths keep the tracking view at a continuous speed through joins.
const ARC_TABLE:readonly number[]=(()=>{
  const table=[0];let previous={x:0,y:215};
  for(let i=1;i<=ARC_SAMPLES;i++){
    const theta=i/ARC_SAMPLES*Math.PI,point={x:305*Math.sin(theta),y:215*Math.cos(theta)};
    table.push(table[i-1]+Math.hypot(point.x-previous.x,point.y-previous.y));previous=point;
  }
  return table;
})();
const ARC_LENGTH=ARC_TABLE[ARC_SAMPLES];
const LENGTH=(RIGHT-START_X)+2*ARC_LENGTH+(RIGHT-LEFT)+(FINISH_FOOT-LEFT);
export const COURSE_BREAKS=[0,(RIGHT-START_X)/LENGTH,(RIGHT-START_X+ARC_LENGTH)/LENGTH,
  (RIGHT-START_X+ARC_LENGTH+RIGHT-LEFT)/LENGTH,(RIGHT-START_X+2*ARC_LENGTH+RIGHT-LEFT)/LENGTH,1] as const;
const SECTIONS:TrackSection[]=['straight','right-bend','backstraight','left-bend','finish'];
const clamp=(v:number)=>Math.max(0,Math.min(1,Number.isFinite(v)?v:0));
function curveAngle(fraction:number):number{
  const distance=clamp(fraction)*ARC_LENGTH;
  let low=0,high=ARC_SAMPLES;
  while(high-low>1){const middle=(low+high)>>1;if(ARC_TABLE[middle]<distance)low=middle;else high=middle;}
  const weight=(distance-ARC_TABLE[low])/(ARC_TABLE[high]-ARC_TABLE[low]);
  return (low+weight)/ARC_SAMPLES*Math.PI;
}
export function trackSection(progress:number):TrackSection{
  for(let i=0;i<4;i++)if(clamp(progress)<COURSE_BREAKS[i+1])return SECTIONS[i];return 'finish';
}
export function trackSectionName(section:TrackSection):string{
  return ({straight:'起跑直道','right-bend':'第一弯道',backstraight:'对向直道','left-bend':'第二弯道',finish:'终点直道'})[section];
}
export function bendPoint(lane:number,fraction:number,side:'right-bend'|'left-bend'):CoursePoint{
  const theta=curveAngle(fraction),right=side==='right-bend';
  return {x:(right?RIGHT:LEFT)+(right?1:-1)*(260+18*lane)*Math.sin(theta),
    y:CENTRE_Y+(right?1:-1)*(170+18*lane)*Math.cos(theta)};
}
export function coursePoint(lane:number,progress:number):CoursePoint{
  const p=Number.isFinite(progress)?Math.max(0,progress):0;
  const [a,b,c,d,e]=COURSE_BREAKS,near=CENTRE_Y+170+18*lane,far=CENTRE_Y-170-18*lane;
  if(p<b)return {x:START_X+(RIGHT-START_X)*(p-a)/(b-a),y:near};
  if(p<c)return bendPoint(lane,(p-b)/(c-b),'right-bend');
  if(p<d)return {x:RIGHT-(RIGHT-LEFT)*(p-c)/(d-c),y:far};
  if(p<e)return bendPoint(lane,(p-d)/(e-d),'left-bend');
  if(p<=1)return {x:LEFT+(FINISH_FOOT-LEFT)*(p-e)/(1-e),y:near};
  const runout=(p-1)*LENGTH;
  if(runout<RIGHT-FINISH_FOOT)return {x:FINISH_FOOT+runout,y:near};
  return bendPoint(lane,(runout-(RIGHT-FINISH_FOOT))/ARC_LENGTH,'right-bend');
}
export function courseCamera(progress:number):CoursePoint{
  let fraction=clamp(progress);
  // Arrive at the finish view without an instantaneous camera stop.
  if(fraction>.9){const t=(fraction-.9)/.1;fraction=.9+.1*(t+t*t-t*t*t);}
  return coursePoint(2.5,fraction);
}
export function projectPoint(point:CoursePoint,camera:CoursePoint):CoursePoint{
  return {x:480+point.x-camera.x,y:251+point.y-camera.y};
}
export function horsePose(index:number,progress:number,seconds=0):HorsePose{
  if(!Number.isInteger(index)||index<0||index>5)throw Error('horseIndex must be 0..5');
  const pose:HorsePose={...coursePoint(index,progress),scale:.65,angle:0,flipX:false,sideOpacity:1,turn:null};
  const section=trackSection(progress);let turnFraction:number|null=null;
  if(section==='right-bend'){turnFraction=(progress-COURSE_BREAKS[1])/(COURSE_BREAKS[2]-COURSE_BREAKS[1]);pose.turn='rear';}
  if(section==='left-bend'){turnFraction=(progress-COURSE_BREAKS[3])/(COURSE_BREAKS[4]-COURSE_BREAKS[3]);pose.turn='front';}
  if(progress>1){
    const distance=(progress-1)*LENGTH-(RIGHT-FINISH_FOOT);
    if(distance>0){turnFraction=clamp(distance/ARC_LENGTH);pose.turn='rear';}
  }
  if(turnFraction!==null){const theta=curveAngle(turnFraction);pose.flipX=pose.turn==='rear'?theta>=Math.PI/2:theta<Math.PI/2;
    pose.sideOpacity=Math.pow(Math.abs(Math.cos(theta)),4);
  }else pose.flipX=section==='backstraight';
  if(progress>0)pose.y+=Math.sin(seconds*20+index*1.4)*1.2;
  return pose;
}
