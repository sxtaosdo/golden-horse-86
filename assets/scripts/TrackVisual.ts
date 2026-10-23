/** Shared 2D course geometry. Coordinates use the 960x720 canvas top-left; y is hoof contact. */
export type TrackSection = 'straight' | 'right-bend' | 'backstraight' | 'left-bend' | 'finish';
export interface HorsePose {
  x:number; y:number; scale:number; angle:number; flipX:boolean;
  sideOpacity:number; turn:'front'|'rear'|null;
}
export const COURSE_BREAKS = [0,.22,.38,.57,.73,1] as const;
const SECTIONS:TrackSection[]=['straight','right-bend','backstraight','left-bend','finish'];
const clamp=(value:number)=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
export function trackSection(progress:number):TrackSection {
  const value=clamp(progress);
  for(let i=0;i<4;i++)if(value<COURSE_BREAKS[i+1])return SECTIONS[i];
  return 'finish';
}
export function trackSectionName(section:TrackSection):string {
  return ({straight:'起跑直道','right-bend':'第一弯道',backstraight:'对向直道','left-bend':'第二弯道',finish:'终点直道'})[section];
}
/** Fractional lanes -0.5 and 5.5 are the physical road boundaries used by the view. */
export function bendPoint(lane:number,fraction:number,side:'right-bend'|'left-bend'):{x:number;y:number}{
  const theta=clamp(fraction)*Math.PI,rx=180+20*lane,ry=20+18*lane;
  const right=side==='right-bend';
  return {x:(right?560:300)+(right?1:-1)*rx*Math.sin(theta),
    y:84+195+(right?1:-1)*ry*Math.cos(theta)};
}
export function horsePose(horseIndex:number,progress:number,seconds=0):HorsePose {
  if(!Number.isInteger(horseIndex)||horseIndex<0||horseIndex>5)throw Error('horseIndex must be 0..5');
  const p=Number.isFinite(progress)?Math.max(0,Math.min(1.12,progress)):0;
  const near=84+215+18*horseIndex,far=84+175-18*horseIndex;
  const pose:HorsePose={x:90,y:near,scale:.65,angle:0,flipX:false,sideOpacity:1,turn:null};
  if(p<.22){pose.x=90+470*(p/.22);}
  else if(p<.38){
    const t=(p-.22)/.16;Object.assign(pose,bendPoint(horseIndex,t,'right-bend'));
    pose.flipX=t>=.5;pose.sideOpacity=Math.pow(Math.abs(Math.cos(Math.PI*t)),4);pose.turn='rear';
  }else if(p<.57){pose.x=560-260*((p-.38)/.19);pose.y=far;pose.flipX=true;}
  else if(p<.73){
    const t=(p-.57)/.16;Object.assign(pose,bendPoint(horseIndex,t,'left-bend'));
    pose.flipX=t<.5;pose.sideOpacity=Math.pow(Math.abs(Math.cos(Math.PI*t)),4);pose.turn='front';
  }else if(p<=1){pose.x=300+490*((p-.73)/.27);}
  else {pose.x=790+500*(p-1);}
  // Never bob after a horse has crossed. The nose reaches the painted x=830 line at p=1.
  if(p>0&&p<1)pose.y+=Math.sin(seconds*20+horseIndex*1.4)*1.2;
  return pose;
}
