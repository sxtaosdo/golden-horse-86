export interface PlayerSettings {chip:1|5|10;master:number;effects:number;ambience:number;muted:boolean;reducedMotion:boolean;}
export const DEFAULT_SETTINGS:Readonly<PlayerSettings>=Object.freeze({chip:1,master:1,effects:1,ambience:1,muted:false,reducedMotion:false});
export function readSettings(value:unknown):PlayerSettings{
 if(typeof value!=='object'||value===null||Array.isArray(value))throw Error('存档设置损坏');
 const v=value as Record<string,unknown>;
 if(![1,5,10].includes(Number(v.chip))||typeof v.chip!=='number'||![v.master,v.effects,v.ambience].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1)||typeof v.muted!=='boolean'||typeof v.reducedMotion!=='boolean')throw Error('存档设置损坏');
 return {chip:v.chip as 1|5|10,master:v.master as number,effects:v.effects as number,ambience:v.ambience as number,muted:v.muted,reducedMotion:v.reducedMotion};
}
