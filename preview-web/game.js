/* AUTO-GENERATED: node tools/build_preview.cjs */
(()=>{
const COURSE_FINISH_X = 400;
const HORSE_SCALE = 1.05;
const HORSE_SPRITE_WIDTH = 134;
// Source PNG is 216px wide; its rightmost opaque muzzle is x208. Include node scale.
const HORSE_NOSE_X = (208 / 216 - .5) * HORSE_SPRITE_WIDTH * HORSE_SCALE;
const RACE_VIEWPORT = { width: 960, height: 660, centreX: 480, centreY: 330 };
const RIGHT = 2000, CENTRE_Y = 500, START_X = 400, FINISH_FOOT = COURSE_FINISH_X + HORSE_NOSE_X;
const ARC_SAMPLES = 128;
const ARC_TABLE = (() => {
    const table = [0];
    let previous = { x: 0, y: 300 };
    for (let i = 1; i <= ARC_SAMPLES; i++) {
        const theta = i / ARC_SAMPLES * Math.PI, point = { x: 420 * Math.sin(theta), y: 300 * Math.cos(theta) };
        table.push(table[i - 1] + Math.hypot(point.x - previous.x, point.y - previous.y));
        previous = point;
    }
    return table;
})();
const ARC_LENGTH = ARC_TABLE[ARC_SAMPLES];
const LENGTH = RIGHT - START_X + ARC_LENGTH + RIGHT - FINISH_FOOT;
const COURSE_BREAKS = [0, (RIGHT - START_X) / LENGTH, (RIGHT - START_X + ARC_LENGTH) / LENGTH, 1];
const FINAL_STRAIGHT_START = COURSE_BREAKS[2];
/** Authored time/distance fit to the observed launch, turn and second acceleration. */
class RacePace {
    static progress(seconds, finishSeconds, referenceSeconds = finishSeconds) {
        const time = Math.max(0, Number.isFinite(seconds) ? seconds : 0), entry = referenceSeconds * this.homeTime;
        if (time >= finishSeconds)
            return Math.min(1.5, 1 + (time - finishSeconds) * 1.3 / referenceSeconds);
        if (time >= entry) {
            const duration = finishSeconds - entry;
            return this.segment((time - entry) / duration, FINAL_STRAIGHT_START, 1, .75 * duration / referenceSeconds, 1.3 * duration / referenceSeconds);
        }
        const t = time / referenceSeconds;
        for (let i = 1; i < this.knots.length; i++) {
            const [end, p1, v1] = this.knots[i];
            if (t > end)
                continue;
            const [start, p0, v0] = this.knots[i - 1], duration = end - start;
            return this.segment((t - start) / duration, p0, p1, v0 * duration, v1 * duration);
        }
        return FINAL_STRAIGHT_START;
    }
    static segment(t, p0, p1, m0, m1) {
        const t2 = t * t, t3 = t2 * t;
        return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
    }
}
RacePace.homeTime = .66;
// time, distance, d(distance)/d(normalised time); Hermite slopes keep speed continuous.
RacePace.knots = [
    [0, 0, 0], [.065, .025, .72], [.15, .123, 1.4], [.29, .28, 1.1],
    [.4, COURSE_BREAKS[1], .95], [RacePace.homeTime, FINAL_STRAIGHT_START, .75],
];
const clamp = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
function curveAngle(fraction) {
    const distance = clamp(fraction) * ARC_LENGTH;
    let low = 0, high = ARC_SAMPLES;
    while (high - low > 1) {
        const middle = (low + high) >> 1;
        if (ARC_TABLE[middle] < distance)
            low = middle;
        else
            high = middle;
    }
    return (low + (distance - ARC_TABLE[low]) / (ARC_TABLE[high] - ARC_TABLE[low])) / ARC_SAMPLES * Math.PI;
}
function trackSection(progress) {
    if (clamp(progress) < COURSE_BREAKS[1])
        return 'straight';
    return clamp(progress) < FINAL_STRAIGHT_START ? 'right-bend' : 'finish';
}
function trackSectionName(section) {
    return ({ straight: '起跑直道', 'right-bend': '弯道', finish: '终点直道' })[section];
}
function bendPoint(lane, fraction, _side = 'right-bend') {
    const theta = curveAngle(fraction);
    return { x: RIGHT + (320 + 40 * lane) * Math.sin(theta), y: CENTRE_Y - (200 + 40 * lane) * Math.cos(theta) };
}
function coursePoint(lane, progress) {
    const p = Number.isFinite(progress) ? Math.max(0, progress) : 0;
    if (p < COURSE_BREAKS[1])
        return { x: START_X + (RIGHT - START_X) * p / COURSE_BREAKS[1], y: CENTRE_Y - 200 - 40 * lane };
    if (p < FINAL_STRAIGHT_START)
        return bendPoint(lane, (p - COURSE_BREAKS[1]) / (FINAL_STRAIGHT_START - COURSE_BREAKS[1]));
    return { x: RIGHT - (RIGHT - FINISH_FOOT) * (p - FINAL_STRAIGHT_START) / (1 - FINAL_STRAIGHT_START), y: CENTRE_Y + 200 + 40 * lane };
}
function courseCamera(progress) {
    let p = clamp(progress);
    if (p > .9) {
        const t = (p - .9) / .1;
        p = .9 + .1 * (t + t * t - t * t * t);
    }
    return coursePoint(2.5, p);
}
function projectPoint(point, camera) {
    return { x: RACE_VIEWPORT.centreX + point.x - camera.x, y: RACE_VIEWPORT.centreY + point.y - camera.y };
}
function horsePose(index, progress, seconds = 0) {
    if (!Number.isInteger(index) || index < 0 || index > 5)
        throw Error('horseIndex must be 0..5');
    const pose = { ...coursePoint(index, progress), scale: HORSE_SCALE, angle: 0, flipX: progress >= FINAL_STRAIGHT_START, sideOpacity: 1, turn: null };
    if (trackSection(progress) === 'right-bend') {
        const theta = curveAngle((progress - COURSE_BREAKS[1]) / (FINAL_STRAIGHT_START - COURSE_BREAKS[1]));
        pose.angle = theta;
        pose.turn = 'front';
        pose.flipX = theta >= Math.PI / 2;
        pose.sideOpacity = Math.pow(Math.abs(Math.cos(theta)), 6);
    }
    if (progress >= FINAL_STRAIGHT_START)
        pose.angle = Math.PI;
    if (progress > 0)
        pose.y += Math.sin(seconds * 20 + index * 1.4) * 1.2;
    return pose;
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
    get courseFraction() { return Math.min(1, RacePace.progress(this.raceElapsed, this.raceSeconds - 2)); }
    /** Continuous cadence follows distance as well as elapsed time; renderers own no pace state. */
    strideTime(index) { return .25 * this.raceElapsed + .75 * this.progress[index] * (this.raceSeconds - 2); }
    constructor(random = Math.random, opts = {}) {
        this.cells = [];
        this.progress = [0, 0, 0, 0, 0, 0];
        this.phase = 'betting';
        this.raceElapsed = 0;
        this.resultElapsed = 0;
        this.round = 1;
        this.preparationRemaining = 0;
        this.selectedEventId = 'station';
        this.message = '点击号码组合押分 / Enter 开跑';
        this.lastResult = null;
        this.history = [];
        this.finishTimes = [18, 18, 18, 18, 18, 18];
        this.pendingOrder = [1, 2, 3, 4, 5, 6];
        this.random = random;
        this.events = opts.events;
        this.pairMode = opts.pairMode ?? 'unordered';
        this.bettingSeconds = opts.bettingSeconds ?? 30;
        this.countdown = this.bettingSeconds;
        this.credits = opts.initialCredits ?? 500;
        this.raceSeconds = opts.raceSeconds ?? 26;
        this.chooseHighestEvent();
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
    /** Current course leader; never reads the pre-drawn finishing order. Ties use horse number. */
    get leaderIndex() { return this.progress.reduce((best, p, i) => p > this.progress[best] ? i : best, 0); }
    get eventId() { return this.selectedEventId; }
    get eventTiers() { return this.events?.tiers ?? []; }
    get eventName() { return this.eventTiers.find(t => t.id === this.selectedEventId)?.name ?? ''; }
    get eligibilityCredits() { return this.credits + ((this.phase === 'betting' || this.phase === 'preparing') ? this.totalStake : 0); }
    canEnterEvent(id) { const tier = this.eventTiers.find(t => t.id === id); return Boolean(tier && this.eligibilityCredits >= tier.minCredits); }
    selectEvent(id) {
        if (this.phase !== 'betting')
            return false;
        if (!this.canEnterEvent(id)) {
            this.message = '参赛积分不足';
            return false;
        }
        this.selectedEventId = id;
        this.message = '已选择' + this.eventName;
        return true;
    }
    chooseHighestEvent() {
        const tiers = this.events?.tiers;
        if (!tiers)
            return;
        this.selectedEventId = tiers.filter(t => this.credits >= t.minCredits).slice(-1)[0]?.id ?? 'station';
    }
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
        this.chooseHighestEvent();
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
        if (this.events && !this.canEnterEvent(this.selectedEventId)) {
            this.message = '参赛积分不足，请切换赛事';
            return false;
        }
        this.preparationRemaining = this.events?.preparationSeconds ?? 0;
        if (this.preparationRemaining > 0) {
            this.phase = 'preparing';
            this.message = '准备起跑';
        }
        else
            this.startRunning();
        return true;
    }
    startRunning() {
        const order = [1, 2, 3, 4, 5, 6];
        for (let i = order.length - 1; i > 0; i--) {
            const rand = Math.min(0.999999, Math.max(0, this.random()));
            const j = Math.floor(rand * (i + 1));
            [order[i], order[j]] = [order[j], order[i]];
        }
        this.pendingOrder = order;
        order.forEach((horse, rank) => { this.finishTimes[horse - 1] = this.raceSeconds - 2.0 + rank * 0.35; });
        this.progress.fill(0);
        this.raceElapsed = 0;
        this.phase = 'racing';
        this.message = '比赛进行中';
    }
    update(dt) {
        if (!Number.isFinite(dt) || dt <= 0)
            return;
        // The 0.1s clamp intentionally mirrors a paused game's conservative tick.
        dt = Math.min(0.1, dt);
        if (this.phase === 'betting') {
            this.countdown = Math.max(0, this.countdown - dt);
            if (this.countdown <= 0.00001) {
                if (this.totalStake) {
                    if (!this.startRace())
                        this.countdown = this.bettingSeconds;
                }
                else
                    this.countdown = this.bettingSeconds;
            }
        }
        else if (this.phase === 'preparing') {
            this.preparationRemaining = Math.max(0, this.preparationRemaining - dt);
            if (this.preparationRemaining <= .00001) {
                this.preparationRemaining = 0;
                this.startRunning();
            }
        }
        else if (this.phase === 'racing') {
            this.raceElapsed += dt;
            const finalStart = (this.raceSeconds - 2) * RacePace.homeTime;
            for (let i = 0; i < 6; i++) {
                if (this.raceElapsed >= finalStart) {
                    // One shared scene timeline up to the home straight; actual finish times then separate the field.
                    this.progress[i] = RacePace.progress(this.raceElapsed, this.finishTimes[i], this.raceSeconds - 2);
                }
                else {
                    const fraction = this.courseFraction;
                    let section = 0;
                    while (section < COURSE_BREAKS.length - 2 && fraction >= COURSE_BREAKS[section + 1])
                        section++;
                    const start = COURSE_BREAKS[section], end = COURSE_BREAKS[section + 1];
                    const local = (fraction - start) / (end - start);
                    const offset = .010 * Math.sin(Math.PI * local) ** 2 * Math.sin(this.raceElapsed * 1.4 + i * .7);
                    this.progress[i] = Math.max(start, Math.min(end - 1e-9, fraction + offset));
                }
            }
            if (this.raceElapsed >= Math.max(...this.finishTimes) + .65)
                this.resolve();
        }
        else {
            this.resultElapsed += dt;
            // Keep the physical run-out moving through the same world after paying once.
            if (this.resultElapsed < 6) {
                this.raceElapsed += dt;
                for (let i = 0; i < 6; i++)
                    this.progress[i] = RacePace.progress(this.raceElapsed, this.finishTimes[i], this.raceSeconds - 2);
            }
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
        const result = { first, second, order, pair, payout, stake, round: this.round, eventId: this.selectedEventId };
        this.lastResult = result;
        this.history.unshift(result);
        if (this.history.length > 20)
            this.history.length = 20;
        this.phase = 'result';
        this.resultElapsed = 0;
        this.message = `本场 ${pair}  得分 +${payout}   Enter 下一场`;
    }
    nextRound() {
        if (this.phase !== 'result')
            return;
        this.round++;
        this.phase = 'betting';
        this.countdown = this.bettingSeconds;
        this.raceElapsed = 0;
        this.resultElapsed = 0;
        this.progress.fill(0);
        this.cells.forEach(c => c.stake = 0);
        this.preparationRemaining = 0;
        this.chooseHighestEvent();
        this.lastResult = null;
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
 const camera=courseCamera(game.courseFraction);
 ctx.save();ctx.beginPath();ctx.rect(0,74,960,334);ctx.clip();ctx.translate(480-camera.x,241-camera.y);
 ctx.fillStyle='#107334';ctx.fillRect(-1000,-2000,5000,4000);
 const outer=Array.from({length:65},(_,i)=>bendPoint(5.5,i/64));
 const inner=Array.from({length:65},(_,i)=>bendPoint(-.5,1-i/64));
 const road=[{x:-1800,y:outer[0].y},...outer,{x:-1800,y:outer[64].y},
             {x:-1800,y:inner[0].y},...inner,{x:-1800,y:inner[64].y}];
 ctx.beginPath();ctx.moveTo(road[0].x,road[0].y);
 for(const point of road.slice(1))ctx.lineTo(point.x,point.y);
 ctx.closePath();ctx.fillStyle='#b08952';ctx.fill();ctx.strokeStyle='#efe7d0';ctx.lineWidth=5;ctx.stroke();
 for(let k=0;k<24;k++)for(let c=0;c<2;c++){ctx.fillStyle=(k+c)%2?'#f5f4e8':'#14151e';ctx.fillRect(COURSE_FINISH_X+c*10,680+k*10,10,10);}
 for(let i=0;i<6;i++){
  const progress=game.phase==='betting'?0:game.progress[i],pose=horsePose(i,progress,game.strideTime(i));
  const key='h'+(i+1)+'_'+(game.phase==='betting'?0:Math.floor(game.strideTime(i)*9)%4);
  const w=134*pose.scale,h=84*pose.scale;
  ctx.save();ctx.translate(pose.x,pose.y);ctx.scale(pose.flipX?-1:1,1);
  if(!image(key,-w/2,-h,w,h))txt('#'+(i+1),0,-15,25);ctx.restore();
 }ctx.restore();
 if(game.phase==='racing'){box(7,80,120,28,'#080f18','#4d8a91');txt(trackSectionName(section),67,94,14,'#e9f4b6','center');}
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
