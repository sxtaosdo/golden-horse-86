const assert=require('assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {read}=require('./helpers/png-inspect.cjs'),{mobileLayout}=require('../.test/presentation/MobileLayout.js');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/resources/race/manifest.json')));
let count=0;
for(const sheet of manifest.horses){const img=read(path.join(__dirname,'../assets/resources/race',sheet.name+'.png')),hashes=new Set();
 for(const frame of sheet.frames){const hash=crypto.createHash('sha256');for(let y=frame.y;y<frame.y+frame.height;y++)hash.update(img.pixels.subarray((y*img.w+frame.x)*4,(y*img.w+frame.x+frame.width)*4));hashes.add(hash.digest('hex'));count++;}
 assert.equal(hashes.size,8,'eight authored frames must differ for '+sheet.name);
}
assert.equal(count,144);
// Close view keeps the starting field/bend readable and every actual crossing fully visible.
const {RaceModel}=require('../.test/RaceModel.js');
const {courseCamera,horsePose,FINAL_STRAIGHT_START,HORSE_SCALE,HORSE_NOSE_X}=require('../.test/TrackVisual.js');
const {raceFraming}=require('../.test/presentation/MobileLayout.js');
for(const height of [1000,1334,1623,1750]){const layout=mobileLayout(height),framing=raceFraming(750,layout.raceHeight),zoom=framing.zoom;
 if(height>=1334)assert.ok(zoom>=1.9*Math.min(750/960,(layout.raceHeight-90)/520),'target phones must materially enlarge the race');
 const m=new RaceModel(()=>.3);m.placeBet('1-6',1);m.startRace();let previous=m.progress.slice(),crossings=0;
 for(let tick=0;tick<1800;tick++){
  m.update(1/60);if(m.phase!=='racing')break;const camera=courseCamera(m.courseFraction);camera.y-=framing.yBias;
  m.progress.forEach((p,i)=>{const pose=horsePose(i,p,m.raceElapsed),x=375+(pose.x-camera.x)*zoom,y=layout.raceHeight/2+45+(pose.y-camera.y)*zoom;
   assert.ok(y-150*zoom>=89,'horse and badge must clear HUD');assert.ok(y<=layout.raceHeight,'hooves must remain in race viewport');
   const direction=Math.min(4,Math.round(pose.angle/(Math.PI/4))),name=['side','diagonal','front','diagonal','side'][direction],sheet=manifest.horses.find(s=>s.horse===i+1&&s.view===name),f=sheet.frames[Math.floor(m.raceElapsed*10)%8];
   const pivot=name==='side'?f.nose-HORSE_NOSE_X/HORSE_SCALE/sheet.scale:f.x+f.width*.5;
   const left=(direction>=3?f.x+f.width-pivot:pivot-f.x)*sheet.scale*HORSE_SCALE,right=(direction>=3?pivot-f.x:f.x+f.width-pivot)*sheet.scale*HORSE_SCALE;
   const crossed=previous[i]<1&&p>=1;if(crossed)crossings++;
   // The close home-straight shot allows runners to enter/leave; the entire crossing must fit.
   if(p<FINAL_STRAIGHT_START||crossed)assert.ok(x-left*zoom>=0&&x+right*zoom<=750,'start, bend and each finish silhouette must fit');
  });previous=m.progress.slice();
 }
 assert.equal(crossings,6,'all six finishers are checked in the close view');
}
console.log('MobileArtwork: 144 distinct frames, enlarged track framing, complete start/bend and six visible finishers passed.');
