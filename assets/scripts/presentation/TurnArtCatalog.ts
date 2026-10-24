export interface TurnFrame {rect:{x:number;y:number;width:number;height:number};width:number;height:number;anchor:{x:number;y:number};}
export interface TurnSheet {angle:22.5|67.5;frames:readonly TurnFrame[];}
export interface TurnHorse {horse:number;resource:string;sourceWidth:number;sourceHeight:number;angles:readonly TurnSheet[];}
const object=(v:unknown):v is Record<string,unknown>=>typeof v==='object'&&v!==null&&!Array.isArray(v);
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
export class TurnArtCatalog {
 private constructor(readonly horses:readonly TurnHorse[]){}
 static parse(value:unknown):TurnArtCatalog{
  if(!object(value)||value.version!==1||!Array.isArray(value.horses)||value.horses.length!==6)throw Error('Invalid turn art catalog');
  const result:TurnHorse[]=[],resources=new Set<string>();
  for(let i=0;i<6;i++){
   const h:unknown=value.horses[i];
   if(!object(h)||h.horse!==i+1||typeof h.resource!=='string'||!/^h0[1-6]-turn-r\d+$/.test(h.resource)||resources.has(h.resource)||!Number.isInteger(h.sourceWidth)||!Number.isInteger(h.sourceHeight)||!finite(h.sourceWidth)||h.sourceWidth<=0||!finite(h.sourceHeight)||h.sourceHeight<=0||!Array.isArray(h.angles)||h.angles.length!==2)throw Error('Invalid turn horse '+(i+1));
   resources.add(h.resource);const angles:TurnSheet[]=[];
   for(let j=0;j<2;j++){
    const part:unknown=h.angles[j],angle=j===0?22.5:67.5;if(!object(part)||part.angle!==angle||!Array.isArray(part.frames)||part.frames.length!==8)throw Error('Invalid turn direction');
    const frames:TurnFrame[]=[];
    for(const f of part.frames){
     if(!object(f)||!object(f.rect)||!object(f.anchor))throw Error('Invalid turn frame');const r=f.rect,a=f.anchor;
     if(![r.x,r.y,r.width,r.height].every(v=>finite(v)&&Number.isInteger(v))||!finite(r.x)||!finite(r.y)||!finite(r.width)||!finite(r.height)||r.x<0||r.y<0||r.width<=0||r.height<=0||r.x+r.width>h.sourceWidth||r.y+r.height>h.sourceHeight||!finite(f.width)||!finite(f.height)||f.width<=0||f.width>180||f.height<=0||f.height>110||!finite(a.x)||!finite(a.y)||a.x<0||a.x>1||a.y!==0)throw Error('Invalid turn frame bounds');
     frames.push({rect:{x:r.x,y:r.y,width:r.width,height:r.height},width:f.width,height:f.height,anchor:{x:a.x,y:a.y}});
    }
    angles.push({angle,frames});
   }
   result.push({horse:i+1,resource:h.resource,sourceWidth:h.sourceWidth,sourceHeight:h.sourceHeight,angles});
  }
  return new TurnArtCatalog(result);
 }
}
