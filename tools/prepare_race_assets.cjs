// Metadata only: source pixels are preserved; Creator slices the atlases at runtime.
const fs=require('fs'),path=require('path'),{read,bounds}=require('../tests/helpers/png-inspect.cjs');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'art/work/gameplay/r02/generated');
const manifest={version:'mobile-r02-144',horses:[],props:[]};
for(let horse=1;horse<=6;horse++)for(const view of ['side','diagonal','front']){
 const sourceName=`h0${horse}-${view}`,name=sourceName+(horse===1?'-r02':''),img=read(path.join(dir,sourceName+'.png')),frames=[];
 if(img.w!==1536||img.h!==1024)throw Error(name+' dimensions');
 for(let i=0;i<8;i++){const x=i%4*384,y=Math.floor(i/4)*512,r=bounds(img,x,y,384,512);if(r.count<2000)throw Error(name+' empty frame '+i);
  let nose=r.x;for(let yy=Math.floor(r.y+r.height*.2);yy<r.y+r.height*.7;yy++)for(let xx=r.x;xx<r.x+r.width;xx++)if(img.pixels[(yy*img.w+xx)*4+3]>180)nose=Math.max(nose,xx);
  frames.push({...r,nose});
 }
 manifest.horses.push({horse,view,name,scale:108/Math.max(...frames.map(f=>f.height)),frames});
}
// This composed prop sheet uses individual bounds, rather than pretending its irregular gutters are a uniform atlas.
const boxes=[['shrub',0,30,375,300],['flowers',384,100,384,210],['fence',780,80,370,245],['gate',1175,30,360,300],['starter',45,345,300,335],['distance',450,345,150,335],['scoreboard',665,420,460,235],['canopy',1140,345,390,330],['truck',10,750,440,255],['crates',470,755,325,250],['tree',810,650,325,360],['spectators',1150,750,380,260]];
const img=read(path.join(dir,'scenery.png'));
manifest.props=boxes.map(([name,x,y,w,h])=>({name,...bounds(img,x,y,w,h)}));
fs.mkdirSync(path.join(root,'art/final/gameplay/r02'),{recursive:true});
for(const h of manifest.horses)fs.copyFileSync(path.join(dir,`h0${h.horse}-${h.view}.png`),path.join(root,'art/final/gameplay/r02',h.name+'.png'));
fs.copyFileSync(path.join(dir,'scenery.png'),path.join(root,'art/final/gameplay/r02/scenery.png'));
fs.writeFileSync(path.join(root,'art/final/gameplay/r02/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Prepared',manifest.horses.length*8,'frames and',manifest.props.length,'props; original PNG bytes preserved.');
