'use strict';
// Browser presentation for the exact same RaceModel.ts used by Cocos Creator.
const canvas=document.getElementById('game'), ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
const game=new RaceModel();
const art={};
function img(key,file){const im=new Image();im.src='../assets/resources/art/'+file;art[key]=im;}
img('track','race_track.png');img('marquee','marquee.png');
img('right-bend','track_curve_right.png');img('backstraight','track_backstraight.png');
img('left-bend','track_curve_left.png');img('finish','track_finish.png');
for(let i=1;i<=6;i++)for(let f=0;f<4;f++)img('h'+i+'_'+f,`horse_${i}_${f}.png`);
let animationTime=0, previousPhase='betting', heldF8=false, gallopTimer=0;
let muted=false;
function play(name){if(muted)return;try{
 const s=new Audio('../assets/resources/audio/'+name+'.wav');s.volume=.27;
 s.play().catch(()=>{});
}catch(_e){}}
function box(x,y,w,h,bg,border='#5389b4',line=2){
 ctx.fillStyle=bg;ctx.fillRect(x,y,w,h);ctx.strokeStyle=border;ctx.lineWidth=line;
 ctx.strokeRect(x+1,y+1,w-2,h-2);
}
function txt(s,x,y,size=20,col='#fff',align='left'){
 ctx.font=`bold ${size}px monospace`;ctx.textAlign=align;ctx.textBaseline='middle';
 ctx.fillStyle=col;ctx.fillText(String(s),x,y);
}
function image(key,x,y,w,h){
 const im=art[key];if(im&&im.complete&&im.naturalWidth){ctx.drawImage(im,x,y,w,h);return true;}
 return false;
}
const cells=()=>game.cells;
function bet(cell,delta){play(game.placeBet(cell.key,delta)?(delta>0?'bet':'cancel'):'error');}
function clear(){game.clearBets();play('cancel');}
function start(){const was=game.phase;play(game.startRace()?(was==='result'?'finish':'start'):'error');}
function draw(){
 ctx.clearRect(0,0,960,720);
 box(0,0,960,720,'#06081a','#24304a');image('marquee',0,0,960,70);
 txt('黄金赛马 86',480,29,34,'#ffdb33','center');
 txt('ARCADE HORSE RACING · RESEARCH PROTOTYPE',480,58,14,'#c992db','center');
 box(0,72,960,340,'#aa8051','#a9b29a');
 const section=game.phase==='racing'?trackSection(game.courseFraction):
                 (game.phase==='result'?'finish':'straight');
 image(section==='straight'?'track':section,0,74,960,334);
 if(game.phase==='racing'){box(7,80,120,28,'#080f18','#4d8a91');txt(trackSectionName(section),67,94,14,'#e9f4b6','center');}
 // Track visualizer is independent of payout and shares TrackVisual.ts with Creator.
 for(let i=5;i>=0;i--){
   const p=game.phase==='racing'?game.progress[i]:game.phase==='result'?1:0;
   const pose=horsePose(i,p,animationTime);
   if(game.phase==='result')pose.x=780-(game.lastResult?.order.indexOf(i+1)??0)*32;
   const key='h'+(i+1)+'_'+(game.phase==='racing'?Math.floor(animationTime*9)%4:0);
   const w=128*pose.scale,h=79*pose.scale;
   // During the hairpins, transform the actual 4-frame horse sprite.
   ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.angle*Math.PI/180);
   ctx.scale(pose.flipX?-1:1,1);
   if(!image(key,-w/2,-h/2,w,h))txt('#'+(i+1),0,0,25);
   ctx.restore();
 }
 if(game.phase==='result'&&game.lastResult){
  box(341,158,278,98,'#0a0b25','#ffe04a',4);
  txt(game.lastResult.pair,480,201,48,'#fa4141','center');
  txt('RACE RESULT',480,241,15,'#ffe655','center');
 }
 box(0,412,960,242,'#0c1029','#4674aa');
 txt('冠亚军组合押分 · 不分先后（待原版核对）',20,435,19,'#32e9e9');
 txt('赔率暂定',947,435,14,'#eec265','right');
 for(let j=0;j<cells().length;j++){
  const row=Math.floor(j/5), col=j%5, item=cells()[j];
  const x=19+188*col,y=461+61*row;
  box(x,y,174,54,item.stake?'#16472f':'#181a3a',item.stake?'#2ff37b':'#367cbd');
  txt(item.key,x+13,y+17,20,'#ffe445');
  txt('×'+item.odds,x+163,y+18,15,'#30e9d1','right');
  txt('押 '+item.stake,x+13,y+41,16,item.stake?'#22fa75':'#a4d1a7');
 }
 box(0,656,960,64,'#07101a','#384869');
 txt('CREDIT '+game.credits,14,677,21,'#22eeb2');
 txt('BET '+game.totalStake,250,677,20,'#fff357');
 txt('TIME '+(game.phase==='betting'?Math.ceil(game.countdown):game.phase==='racing'?'RUN':'END'),414,677,20,'#ff554a');
 txt('第 '+game.round+' 场',595,677,20,'#67bcfa');
 box(746,662,94,43,'#524053','#eac970');txt('清空',792,684,19,'#fff','center');
 box(846,662,100,43,'#1f6536','#8de5b8');txt(game.phase==='result'?'下局':'开始',896,684,19,'#fff','center');
 txt(game.message,14,701,13,'#f1e8c3');
 txt('历史 '+game.history.slice(0,6).map(x=>x.pair).join('  '),958,701,12,'#a3cbef','right');
}
function resize(){
 const ratio=Math.min(innerWidth/960,innerHeight/720);
 canvas.style.width=960*ratio+'px';canvas.style.height=720*ratio+'px';
}
window.addEventListener('resize',resize);resize();
function pointer(e){
 const rect=canvas.getBoundingClientRect();
 const x=(e.clientX-rect.left)*960/rect.width,y=(e.clientY-rect.top)*720/rect.height;
 if(y>=461 && y<=637){
   const col=Math.floor((x-19)/188),row=Math.floor((y-461)/61);
   const localX=x-(19+col*188),localY=y-(461+row*61);
   if(col>=0&&col<5&&row>=0&&row<3&&localX>=0&&localX<174&&localY>=0&&localY<54){
      const item=cells()[row*5+col];if(item)bet(item,e.button===2?-1:1);
      return;
   }
 }
 if(y>=662&&y<=705){if(x>=746&&x<=840)clear();else if(x>=846&&x<=946)start();}
}
canvas.addEventListener('pointerdown',pointer);
canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('keydown',e=>{
 if(e.code==='F8')heldF8=true;
 else if(e.code==='F9'&&heldF8){e.preventDefault();game.addTestCredits(100);play('bet');}
 else if(e.code==='F12'&&heldF8){e.preventDefault();game.clearCredits();play('cancel');}
 else if(e.code==='Enter'||e.code==='Space'){e.preventDefault();start();}
 else if(e.code==='KeyC')clear();
 else if(e.code==='KeyM'){muted=!muted;game.message='音效'+(muted?'关闭':'开启');}
});
window.addEventListener('keyup',e=>{if(e.code==='F8')heldF8=false;});
let last=performance.now();
function loop(now){
 const dt=(now-last)/1000;last=now;
 game.update(dt);animationTime+=dt;
 if(game.phase==='racing'){
   gallopTimer-=dt;if(gallopTimer<=0){play('gallop');gallopTimer=1.7;}
 }else gallopTimer=0;
 if(previousPhase!==game.phase){
    if(game.phase==='result')play(game.lastResult?.payout?'win':'finish');
    previousPhase=game.phase;
 }
 draw();requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
