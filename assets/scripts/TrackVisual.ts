/**
 * Visual course staging for the six-horse Golden Horse reconstruction.
 * Original ROM/scene timing unavailable: this five-part oval course is an
 * ORIGINAL, REPLACEABLE visual approximation, NOT verified 1986 machine data.
 * Independent of Cocos/DOM so the Creator and Web clients share geometry.
 */
export type TrackSection = 'straight' | 'right-bend' | 'backstraight' | 'left-bend' | 'finish';
export interface HorsePose {
  /** Pixel coordinates of the horse centre in the 960x720 reference canvas. */
  x: number; y: number; scale: number; angle: number; flipX: boolean;
}
export const COURSE_BREAKS = [0, .22, .38, .57, .73, 1] as const;
const SECTION_NAMES: TrackSection[] = ['straight','right-bend','backstraight','left-bend','finish'];
const clamp = (x: number) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const mix = (a: number,b: number,t: number) => a+(b-a)*t;
const ease = (x: number) => {const t=clamp(x);return t*t*(3-2*t);};
const cubic = (a: number,b: number,c: number,d: number,t: number) => {
  const n=1-t;return n*n*n*a+3*n*n*t*b+3*n*t*t*c+t*t*t*d;
};
export function trackSection(t: number): TrackSection {
  const v=clamp(t);
  for(let i=0;i<SECTION_NAMES.length-1;i++)if(v<COURSE_BREAKS[i+1])return SECTION_NAMES[i];
  return 'finish';
}
export function trackSectionName(section:TrackSection):string {
  return ({straight:'起跑直道','right-bend':'第一弯道',backstraight:'对向直道', 'left-bend':'第二弯道',finish:'终点直道'})[section];
}
/**
 * A smooth continuous path with two real turning sections. Horse sprites swing
 * round each end, shrink in the distance, reverse on the far straight, and
 * regain scale on the home straight. This is visual geometry only, never used
 * to select a winner or to change payouts.
 */
export function horsePose(horseIndex: number, progress: number, seconds=0): HorsePose {
  if(!Number.isInteger(horseIndex)||horseIndex<0||horseIndex>5)throw Error('horseIndex must be 0..5');
  const p=clamp(progress), lane=horseIndex;
  const near=122+lane*43,far=125+lane*30;
  const bob=Math.sin(seconds*20+lane*1.4)*2;
  const [a,b,c,d,e,f]=COURSE_BREAKS;
  let x=70,y=near,scale=.92,angle=0,flipX=false;
  if(p<b){ // first straight, rightwards
    const t=ease((p-a)/(b-a));
    x=mix(70,755-lane*3,t);y=near;scale=.92;
  }else if(p<c){ // turn at right side: horses curve up and point left
    const t=ease((p-b)/(c-b));
    x=cubic(755,895,885,750,t)-lane*3;
    y=cubic(near,near-25,far+8,far,t);
    scale=mix(.92,.76,t);
    angle=t<.5 ? mix(0,-33,t*2):mix(33,0,(t-.5)*2);
    flipX=t>=.5;
  }else if(p<d){ // distant opposite straight, moving leftwards
    const t=ease((p-c)/(d-c));
    x=mix(750-lane*3,190+lane*3,t);y=far;
    scale=.76;flipX=true;
  }else if(p<e){ // return bend: horses swing toward viewer and right again
    const t=ease((p-d)/(e-d));
    x=cubic(190+lane*3,30,25,160+lane*5,t);
    y=cubic(far,far-17,near-10,near,t);
    scale=mix(.76,.92,t);
    angle=t<.5 ? mix(0,32,t*2):mix(-32,0,(t-.5)*2);
    flipX=t<.5;
  }else{ // finishing straight, approaching goal
    const t=ease((p-e)/(f-e));
    x=mix(160+lane*5,780,t);y=near;
    scale=.92;
  }
  return {x,y:y+bob,scale,angle,flipX};
}
