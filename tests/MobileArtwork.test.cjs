const assert=require('assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {read}=require('./helpers/png-inspect.cjs'),{mobileLayout}=require('../.test/presentation/MobileLayout.js');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/resources/race/manifest.json')));
let count=0;
for(const sheet of manifest.horses){const img=read(path.join(__dirname,'../assets/resources/race',sheet.name+'.png')),hashes=new Set();
 for(const frame of sheet.frames){const hash=crypto.createHash('sha256');for(let y=frame.y;y<frame.y+frame.height;y++)hash.update(img.pixels.subarray((y*img.w+frame.x)*4,(y*img.w+frame.x+frame.width)*4));hashes.add(hash.digest('hex'));count++;}
 assert.equal(hashes.size,8,'eight authored frames must differ for '+sheet.name);
}
assert.equal(count,144);
// Include the authored sprite and badge extents, rather than checking only hoof coordinates.
const {RaceModel}=require('../.test/RaceModel.js'),{courseCamera,horsePose}=require('../.test/TrackVisual.js');
for(const height of [1000,1334,1623,1750]){const layout=mobileLayout(height),zoom=Math.min(750/960,(layout.raceHeight-90)/520),m=new RaceModel(()=>.3);m.placeBet('1-6',1);m.startRace();
 for(let frame=0;frame<1440;frame++){m.update(1/60);if(m.phase!=='racing')break;const camera=courseCamera(m.courseFraction);
  m.progress.forEach((p,i)=>{const pose=horsePose(i,p,m.raceElapsed),x=375+(pose.x-camera.x)*zoom,y=layout.raceHeight/2+45+(pose.y-camera.y)*zoom;
   assert.ok(y-150*zoom>=89,'horse and badge must clear HUD');assert.ok(y<=layout.raceHeight,'hooves must remain in race viewport');
   // A finisher is expected to leave the screen during natural run-out.
   if(p<1){assert.ok(x-120*zoom>0&&x+120*zoom<750,'pre-finish silhouette must fit portrait width');}
  });
 }
}
console.log('MobileArtwork: 144 distinct frames, calibrated sprite extents and portrait HUD/track bounds passed.');
