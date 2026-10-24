const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../..'),{read,bounds}=require(path.join(root,'tests/helpers/png-inspect.cjs'));
const final=path.join(root,'art/final/gameplay/r09'),runtime=path.join(root,'assets/resources/race/pre-race');fs.mkdirSync(runtime,{recursive:true});
const catalog={version:1,idleTiming:{horseRepeatSeconds:6,horseSpecialRepeatSeconds:24,starterRepeatSeconds:3},horses:[],starter:null},manifest={status:'implementation',source:'built-in image_gen',assets:[]};
for(const id of [1,2,3,4,5,6,0]){
 const resource=id?'h0'+id+'-idle-r09':'starter-r09',file=id===5?'h05-idle-r09-repair':resource;
 const source=path.join(__dirname,'generated',file+'.png'),img=read(source),cols=id?5:3,frames=[];
 for(let row=0;row<2;row++){
  // The starter's raised flag crosses the nominal 512px row boundary.
  const y0=id?Math.floor(row*img.h/2):row?480:0,y1=id?Math.floor((row+1)*img.h/2):row?img.h:480,bands=[];let start=-1;
  for(let x=0;x<=img.w;x++){
   let on=false;if(x<img.w)for(let y=y0;y<y1;y++)if(img.pixels[(y*img.w+x)*4+3]>180){on=true;break;}
   if(on&&start<0)start=x;if(!on&&start>=0){if(x-start>30)bands.push([start,x]);start=-1;}
  }
  if(bands.length!==cols)throw Error(resource+' row '+row+' found '+bands.length+' bands');
  for(let col=0;col<cols;col++){
   const [l,r]=bands[col],left=Math.max(0,l-3),right=Math.min(img.w,r+3),rect=bounds(img,left,y0,right-left,y1-y0);
   if(rect.count<1000||rect.x<1||rect.x+rect.width>=img.w-1)throw Error('Clipped '+resource);
   frames.push({rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},col});
  }
 }
 const scale=(id?108:110)/Math.max(...frames.map(f=>f.rect.height)),first=frames[0].rect;
 const pivot=id?first.x+first.width-65.13888888888889/(1.05*scale):305.95;
 // Source podium right edges (exclusive) are 424/925/1405, not 512px apart.
 const part={resource,sourceWidth:img.w,sourceHeight:img.h,frames:frames.map(({rect,col})=>({rect,width:rect.width*scale,height:rect.height*scale,anchor:{x:(pivot+(id?Math.floor(col*img.w/cols):[0,501,981][col])-rect.x)/rect.width,y:0},flipX:false}))};
 for(const f of part.frames)if(f.anchor.x<0||f.anchor.x>1)throw Error('Bad pivot '+resource);
 if(id)catalog.horses.push(part);else catalog.starter=part;
 const bytes=fs.readFileSync(source);fs.writeFileSync(path.join(final,resource+'.png'),bytes);fs.writeFileSync(path.join(runtime,resource+'.png'),bytes);
 manifest.assets.push({resource,source:path.relative(root,source).replaceAll('\\','/'),file:resource+'.png',runtime:'assets/resources/race/pre-race/'+resource+'.png',width:img.w,height:img.h,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
for(const name of ['ambience','countdown','broadcast','latch','hoof']){
 const file=name+'-r09.wav',source=path.join(__dirname,'generated',file),bytes=fs.readFileSync(source);
 fs.writeFileSync(path.join(final,file),bytes);fs.writeFileSync(path.join(root,'assets/resources/audio',file),bytes);
 manifest.assets.push({source:path.relative(root,source).replaceAll('\\','/'),file,runtime:'assets/resources/audio/'+file,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),sourceType:'original procedural PCM16 mono 22050Hz'});
}
fs.writeFileSync(path.join(root,'assets/resources/race/pre-race-art.json'),JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync(path.join(final,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Calibrated 60 independent idle/ready horse frames, 6 starter frames and 5 audio clips; raw pixels preserved.');
