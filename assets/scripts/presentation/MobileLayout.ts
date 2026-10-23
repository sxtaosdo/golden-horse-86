export interface MobileLayout {height:number;safeX:number;safeY:number;safeWidth:number;safeHeight:number;raceHeight:number;panelHeight:number;footerHeight:number;}
export function mobileLayout(height:number,safe={x:0,y:0,width:750,height}):MobileLayout {
 const footerHeight=104,panelHeight=534;
 return {height,safeX:safe.x,safeY:safe.y,safeWidth:safe.width,safeHeight:safe.height,
  raceHeight:Math.max(0,safe.height-panelHeight-footerHeight),panelHeight,footerHeight};
}
export function betPosition(index:number):{x:number;y:number}{let k=0;for(let a=1;a<=5;a++)for(let b=6;b>a;b--){if(k++===index)return{x:-288+(6-b)*144,y:188-(a-1)*94};}throw Error('bet index');}
