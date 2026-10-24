// This batch's metadata-only recipe. Original RGBA pixels are never modified.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../..'),{read,bounds}=require(path.join(root,'tests/helpers/png-inspect.cjs'));
const catalog={version:1,horses:[]},manifest={status:'calibrated',source:'built-in image_gen',assets:[]};
const bands=(length,on)=>{const out=[];let begin=-1;for(let i=0;i<=length;i++){if(i<length&&on(i)){if(begin<0)begin=i;}else if(begin>=0){if(i-begin>20)out.push([begin,i]);begin=-1;}}return out;};
for(let horse=1;horse<=6;horse++){
 const resource='h0'+horse+'-turn-r10',source=path.join(__dirname,'generated',resource+'.png');if(!fs.existsSync(source))continue;
 const img=read(source),rows=bands(img.h,y=>{let count=0;for(let x=0;x<img.w;x++)if(img.pixels[(y*img.w+x)*4+3]>180)count++;return count>10;});
 if(rows.length!==4)throw Error(resource+' requires 4 separate rows: '+JSON.stringify(rows));
 const angles=[{angle:22.5,frames:[]},{angle:67.5,frames:[]}];
 rows.forEach(([y0,y1],row)=>{
  const cols=bands(img.w,x=>{for(let y=y0;y<y1;y++)if(img.pixels[(y*img.w+x)*4+3]>180)return true;return false;});
  if(cols.length!==4)throw Error(resource+' row '+row+' requires 4 columns');
  cols.forEach(([l,r],col)=>{const f=bounds(img,Math.max(0,l-2),Math.max(0,y0-2),Math.min(img.w,r+2)-Math.max(0,l-2),Math.min(img.h,y1+2)-Math.max(0,y0-2));if(f.count<1000||f.x<=0||f.y<=0||f.x+f.width>=img.w||f.y+f.height>=img.h)throw Error('Clipped frame '+resource);angles[Math.floor(row/2)].frames.push({rect:{x:f.x,y:f.y,width:f.width,height:f.height},col});});
 });
 for(const part of angles){const scale=108/Math.max(...part.frames.map(f=>f.rect.height)),projection=part.angle===22.5?.90:.85;part.frames=part.frames.map(({rect,col})=>({rect,width:rect.width*scale*projection,height:rect.height*scale,anchor:{x:((col+.5+(part.angle===22.5?.05:0))*img.w/4-rect.x)/rect.width,y:0}}));for(const f of part.frames)if(f.anchor.x<0||f.anchor.x>1)throw Error('Bad foot pivot');}
 catalog.horses.push({horse,resource,sourceWidth:img.w,sourceHeight:img.h,angles});
 manifest.assets.push({horse,source:path.relative(root,source).replaceAll('\\','/'),file:resource+'.png',runtime:'assets/resources/race/turn/'+resource+'.png',sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')});
}
if(process.argv.includes('--prototype')){fs.writeFileSync(path.join(__dirname,'prototype.json'),JSON.stringify(catalog,null,2)+'\n');console.log('Prototype: '+catalog.horses.length+' horse, 16 foot-aligned frames each; source pixels retained.');}
else{
 if(catalog.horses.length!==6)throw Error('Full production requires six horses');
 fs.mkdirSync(path.join(root,'art/final/gameplay/r10'),{recursive:true});fs.mkdirSync(path.join(root,'assets/resources/race/turn'),{recursive:true});
 for(const a of manifest.assets){fs.copyFileSync(path.join(root,a.source),path.join(root,'art/final/gameplay/r10',a.file));fs.copyFileSync(path.join(root,a.source),path.join(root,a.runtime));}
 fs.writeFileSync(path.join(root,'assets/resources/race/turn-art.json'),JSON.stringify(catalog,null,2)+'\n');fs.writeFileSync(path.join(root,'art/final/gameplay/r10/manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Calibrated 96 distinct direction frames from six original RGBA atlases.');
}
