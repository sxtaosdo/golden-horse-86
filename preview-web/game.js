/* AUTO-GENERATED: node tools/build_preview.cjs */
(()=>{
const COURSE_BREAKS = [0, .22, .38, .57, .73, 1];
const SECTION_NAMES = ['straight', 'right-bend', 'backstraight', 'left-bend', 'finish'];
const clamp = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const mix = (a, b, t) => a + (b - a) * t;
const ease = (x) => { const t = clamp(x); return t * t * (3 - 2 * t); };
const cubic = (a, b, c, d, t) => {
    const n = 1 - t;
    return n * n * n * a + 3 * n * n * t * b + 3 * n * t * t * c + t * t * t * d;
};
function trackSection(t) {
    const v = clamp(t);
    for (let i = 0; i < SECTION_NAMES.length - 1; i++)
        if (v < COURSE_BREAKS[i + 1])
            return SECTION_NAMES[i];
    return 'finish';
}
function trackSectionName(section) {
    return ({ straight: '起跑直道', 'right-bend': '第一弯道', backstraight: '对向直道', 'left-bend': '第二弯道', finish: '终点直道' })[section];
}
/**
 * A smooth continuous path with two real turning sections. Horse sprites swing
 * round each end, shrink in the distance, reverse on the far straight, and
 * regain scale on the home straight. This is visual geometry only, never used
 * to select a winner or to change payouts.
 */
function horsePose(horseIndex, progress, seconds = 0) {
    if (!Number.isInteger(horseIndex) || horseIndex < 0 || horseIndex > 5)
        throw Error('horseIndex must be 0..5');
    const p = clamp(progress), lane = horseIndex;
    const near = 122 + lane * 43, far = 125 + lane * 30;
    const bob = Math.sin(seconds * 20 + lane * 1.4) * 2;
    const [a, b, c, d, e, f] = COURSE_BREAKS;
    let x = 70, y = near, scale = .92, angle = 0, flipX = false;
    if (p < b) { // first straight, rightwards
        const t = ease((p - a) / (b - a));
        x = mix(70, 755 - lane * 3, t);
        y = near;
        scale = .92;
    }
    else if (p < c) { // turn at right side: horses curve up and point left
        const t = ease((p - b) / (c - b));
        x = cubic(755, 895, 885, 750, t) - lane * 3;
        y = cubic(near, near - 25, far + 8, far, t);
        scale = mix(.92, .76, t);
        angle = t < .5 ? mix(0, -33, t * 2) : mix(33, 0, (t - .5) * 2);
        flipX = t >= .5;
    }
    else if (p < d) { // distant opposite straight, moving leftwards
        const t = ease((p - c) / (d - c));
        x = mix(750 - lane * 3, 190 + lane * 3, t);
        y = far;
        scale = .76;
        flipX = true;
    }
    else if (p < e) { // return bend: horses swing toward viewer and right again
        const t = ease((p - d) / (e - d));
        x = cubic(190 + lane * 3, 30, 25, 160 + lane * 5, t);
        y = cubic(far, far - 17, near - 10, near, t);
        scale = mix(.76, .92, t);
        angle = t < .5 ? mix(0, 32, t * 2) : mix(-32, 0, (t - .5) * 2);
        flipX = t < .5;
    }
    else { // finishing straight, approaching goal
        const t = ease((p - e) / (f - e));
        x = mix(160 + lane * 5, 780, t);
        y = near;
        scale = .92;
    }
    return { x, y: y + bob, scale, angle, flipX };
}
/**
 * Illustrative odds only. These are not advertised as the 1986 machine's odds.
 * All pairs can be overridden through RaceOptions.odds.
 */
const DEMO_ODDS = {
    '1-2': 3, '1-3': 4, '1-4': 5, '1-5': 8, '1-6': 10,
    '2-3': 12, '2-4': 15, '2-5': 20, '2-6': 30,
    '3-4': 40, '3-5': 60, '3-6': 80,
    '4-5': 100, '4-6': 150,
    '5-6': 200,
};
class RaceModel {
    /** Visual timeline only; winner selection and payout remain unchanged. */
    get courseFraction() { return Math.min(1, this.raceElapsed / (this.raceSeconds + 2.2)); }
    constructor(random = Math.random, opts = {}) {
        this.cells = [];
        this.progress = [0, 0, 0, 0, 0, 0];
        this.phase = 'betting';
        this.raceElapsed = 0;
        this.resultElapsed = 0;
        this.round = 1;
        this.message = '点击号码组合押分 / Enter 开跑';
        this.lastResult = null;
        this.history = [];
        this.finishTimes = [18, 18, 18, 18, 18, 18];
        this.pendingOrder = [1, 2, 3, 4, 5, 6];
        this.random = random;
        this.pairMode = opts.pairMode ?? 'unordered';
        this.bettingSeconds = opts.bettingSeconds ?? 30;
        this.countdown = this.bettingSeconds;
        this.credits = opts.initialCredits ?? 500;
        this.raceSeconds = opts.raceSeconds ?? 16;
        for (let a = 1; a <= 6; a++) {
            for (let b = this.pairMode === 'unordered' ? a + 1 : 1; b <= 6; b++) {
                if (a === b)
                    continue;
                const key = `${a}-${b}`;
                const normalized = RaceModel.normalizedPair(a, b);
                const odds = opts.odds?.[key] ?? opts.odds?.[normalized] ?? DEMO_ODDS[normalized] ?? 10;
                this.cells.push({ first: a, second: b, key, odds, stake: 0 });
            }
        }
    }
    static normalizedPair(a, b) {
        return `${Math.min(a, b)}-${Math.max(a, b)}`;
    }
    get totalStake() { return this.cells.reduce((s, c) => s + c.stake, 0); }
    getCell(key) {
        if (this.pairMode === 'unordered') {
            const parts = key.split('-').map(Number);
            if (parts.length === 2 && parts.every(x => Number.isInteger(x) && x >= 1 && x <= 6)) {
                key = RaceModel.normalizedPair(parts[0], parts[1]);
            }
        }
        return this.cells.find(c => c.key === key);
    }
    placeBet(key, change = 1) {
        if (this.phase !== 'betting' || !Number.isSafeInteger(change) || change === 0)
            return false;
        const cell = this.getCell(key);
        if (!cell)
            return false;
        if (change > 0 && this.credits < change) {
            this.message = '积分不足';
            return false;
        }
        if (change < 0 && cell.stake < -change) {
            this.message = '未押分无法撤销';
            return false;
        }
        cell.stake += change;
        this.credits -= change;
        this.message = `已押 ${cell.key} / 本局 ${this.totalStake} 分`;
        return true;
    }
    addTestCredits(amount = 100) {
        if (this.phase !== 'betting' || !Number.isSafeInteger(amount) || amount <= 0)
            return;
        this.credits += amount;
        this.message = `测试投币 +${amount}`;
    }
    clearBets() {
        if (this.phase !== 'betting')
            return;
        this.credits += this.totalStake;
        this.cells.forEach(c => c.stake = 0);
        this.message = '本局押分已清空';
    }
    /** Simulation of the old clear-score key: no cash-out functionality. */
    clearCredits() {
        if (this.phase !== 'betting')
            return;
        this.cells.forEach(c => c.stake = 0);
        this.credits = 0;
        this.message = '模拟清分完成（不涉及真实交易）';
    }
    startRace() {
        if (this.phase === 'result') {
            this.nextRound();
            return true;
        }
        if (this.phase !== 'betting')
            return false;
        if (!this.totalStake) {
            this.message = '请先选择号码组合押分';
            return false;
        }
        const order = [1, 2, 3, 4, 5, 6];
        for (let i = order.length - 1; i > 0; i--) {
            const rand = Math.min(0.999999, Math.max(0, this.random()));
            const j = Math.floor(rand * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }
        this.pendingOrder = order;
        order.forEach((horse, rank) => { this.finishTimes[horse - 1] = this.raceSeconds - 2.0 + rank * 0.8; });
        this.progress.fill(0);
        this.raceElapsed = 0;
        this.phase = 'racing';
        this.message = '比赛进行中';
        return true;
    }
    update(dt) {
        if (!Number.isFinite(dt) || dt <= 0)
            return;
        // The 0.1s clamp intentionally mirrors a paused game's conservative tick.
        dt = Math.min(0.1, dt);
        if (this.phase === 'betting') {
            this.countdown = Math.max(0, this.countdown - dt);
            if (this.countdown <= 0.00001) {
                if (this.totalStake)
                    this.startRace();
                else
                    this.countdown = this.bettingSeconds;
            }
        }
        else if (this.phase === 'racing') {
            this.raceElapsed += dt;
            for (let i = 0; i < 6; i++) {
                const ratio = this.raceElapsed / this.finishTimes[i];
                const wobble = .023 * Math.sin(this.raceElapsed * 2.1 + i * 3.7)
                    * Math.sin(Math.PI * Math.min(1, ratio));
                this.progress[i] = Math.min(1, Math.max(0, ratio + wobble));
            }
            if (this.raceElapsed >= Math.max(...this.finishTimes) + .15)
                this.resolve();
        }
        else {
            this.resultElapsed += dt;
        }
    }
    resolve() {
        const order = this.pendingOrder.slice();
        const first = order[0], second = order[1];
        const pair = this.pairMode === 'unordered'
            ? RaceModel.normalizedPair(first, second) : `${first}-${second}`;
        const winCell = this.getCell(pair);
        const stake = this.totalStake;
        const payout = winCell ? winCell.stake * winCell.odds : 0;
        this.credits += payout;
        const result = { first, second, order, pair, payout, stake };
        this.lastResult = result;
        this.history.unshift(result);
        if (this.history.length > 20)
            this.history.length = 20;
        this.phase = 'result';
        this.resultElapsed = 0;
        this.progress.fill(1);
        this.message = `本场 ${pair}  得分 +${payout}   Enter 下一场`;
    }
    nextRound() {
        this.round++;
        this.phase = 'betting';
        this.countdown = this.bettingSeconds;
        this.raceElapsed = 0;
        this.resultElapsed = 0;
        this.progress.fill(0);
        this.cells.forEach(c => c.stake = 0);
        this.message = '下一场：请选择号码组合';
    }
}

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

})();
