/**
 * Golden Horse 86 research prototype: game rules and odds can be revised when
 * an actual recording or ROM becomes available. NO monetary transactions.
 */
import { RaceChoreography, RacePace } from './TrackVisual';
import { RaceEventId, RaceEventRules, RaceEventTier } from './events/RaceEventCatalog';
import { RaceSnapshot, RaceSnapshotCodec, SnapshotRules, MilestoneProgress } from './session/RaceSnapshot';
export type Phase = 'betting' | 'preparing' | 'racing' | 'result';
export type PairMode = 'unordered' | 'ordered';
export interface RaceOptions {
  pairMode?: PairMode;
  bettingSeconds?: number;
  initialCredits?: number;
  odds?: Record<string, number>;
  raceSeconds?: number;
  events?: RaceEventRules;
  presentationSeed?: number;
}
export interface RaceResult {
  readonly first: number; readonly second: number; readonly order: readonly number[];
  readonly pair: string; readonly payout: number; readonly stake: number;
  readonly round:number;readonly eventId:RaceEventId;
  readonly bets:readonly BetReceipt[];readonly odds:number;readonly net:number;
}
export interface BetReceipt {readonly key:string;readonly stake:number;readonly odds:number;}
export interface BetCell {
  first: number; second: number; key: string; odds: number; stake: number;
}
/**
 * Illustrative odds only. These are not advertised as the 1986 machine's odds.
 * All pairs can be overridden through RaceOptions.odds.
 */
export const DEMO_ODDS: Record<string, number> = {
  '1-2':3, '1-3':4, '1-4':5, '1-5':8, '1-6':10,
  '2-3':12, '2-4':15, '2-5':20, '2-6':30,
  '3-4':40, '3-5':60, '3-6':80,
  '4-5':100, '4-6':150,
  '5-6':200,
};

export class RaceModel {
  readonly pairMode: PairMode;
  readonly bettingSeconds: number;
  readonly cells: BetCell[] = [];
  readonly progress: number[] = [0, 0, 0, 0, 0, 0];
  phase: Phase = 'betting';
  credits: number;
  countdown: number;
  raceElapsed = 0;
  resultElapsed = 0;
  round = 1;
  preparationRemaining=0;
  private selectedEventId:RaceEventId='station';
  private readonly events:RaceEventRules|undefined;
  message = '选择前二号码组合押分';
  lastResult: RaceResult | null = null;
  history: RaceResult[] = [];

  private readonly random: () => number;
  private readonly finishTimes: number[] = [18,18,18,18,18,18];
  private readonly raceSeconds: number;
  private presentationSeed:number;
  private visualSeed=0;
  private changeSerial=0;
  private completed:MilestoneProgress={completed:0,regional:false,championship:false};
  private announcement='';
  get milestones():Readonly<MilestoneProgress>{return Object.freeze({...this.completed});}
  get milestoneNotice():string{return this.announcement;}
  get changeId():number{return this.changeSerial;}
  get choreographySeed():number{return this.visualSeed;}
  private pendingOrder: number[] = [1,2,3,4,5,6];
  /** Visual timeline only; winner selection and payout remain unchanged. */
  get courseFraction():number { return Math.min(1,RacePace.progress(this.raceElapsed,this.raceSeconds-2)); }

  /** Continuous cadence follows distance as well as elapsed time; renderers own no pace state. */
  strideTime(index:number):number{return .25*this.raceElapsed+.75*this.progress[index]*(this.raceSeconds-2);}

  constructor(random: () => number = Math.random, opts: RaceOptions = {}) {
    this.random = random;
    this.presentationSeed=(opts.presentationSeed??Date.now())>>>0;
    this.events=opts.events;
    this.pairMode = opts.pairMode ?? 'unordered';
    this.bettingSeconds = opts.bettingSeconds ?? 30;
    this.countdown = this.bettingSeconds;
    this.credits = opts.initialCredits ?? 500;
    this.raceSeconds = opts.raceSeconds ?? 26;
    this.chooseHighestEvent();
    for (let a = 1; a <= 6; a++) {
      for (let b = this.pairMode === 'unordered' ? a + 1 : 1; b <= 6; b++) {
        if (a === b) continue;
        const key = `${a}-${b}`;
        const normalized = RaceModel.normalizedPair(a,b);
        const odds = opts.odds?.[key] ?? opts.odds?.[normalized] ?? DEMO_ODDS[normalized] ?? 10;
        this.cells.push({ first:a, second:b, key, odds, stake:0 });
      }
    }
  }

  static normalizedPair(a: number, b: number): string {
    return `${Math.min(a,b)}-${Math.max(a,b)}`;
  }
  get totalStake(): number { return this.cells.reduce((s,c) => s+c.stake,0); }
  /** Current course leader; never reads the pre-drawn finishing order. Ties use horse number. */
  get leaderIndex():number{return this.progress.reduce((best,p,i)=>p>this.progress[best]?i:best,0);}
  get eventId():RaceEventId{return this.selectedEventId;}
  get eventTiers():readonly RaceEventTier[]{return this.events?.tiers??[];}
  get eventName():string{return this.eventTiers.find(t=>t.id===this.selectedEventId)?.name??'';}
  get eligibilityCredits():number{return this.credits+((this.phase==='betting'||this.phase==='preparing')?this.totalStake:0);}
  canEnterEvent(id:RaceEventId):boolean{const tier=this.eventTiers.find(t=>t.id===id);return Boolean(tier&&this.eligibilityCredits>=tier.minCredits);}
  selectEvent(id:RaceEventId):boolean{
    if(this.phase!=='betting')return false;
    if(!this.canEnterEvent(id)){this.message='参赛积分不足';return false;}
    this.selectedEventId=id;this.message='已选择'+this.eventName;this.changeSerial++;return true;
  }
  private chooseHighestEvent():void{
    const tiers=this.events?.tiers;if(!tiers)return;
    this.selectedEventId=tiers.filter(t=>this.credits>=t.minCredits).slice(-1)[0]?.id??'station';
  }
  getCell(key: string): BetCell | undefined {
    if (this.pairMode === 'unordered') {
      const parts = key.split('-').map(Number);
      if (parts.length === 2 && parts.every(x => Number.isInteger(x) && x >= 1 && x <= 6)) {
        key = RaceModel.normalizedPair(parts[0],parts[1]);
      }
    }
    return this.cells.find(c => c.key === key);
  }
  placeBet(key: string, change = 1): boolean {
    if (this.phase !== 'betting' || !Number.isSafeInteger(change) || change === 0) return false;
    const cell = this.getCell(key);
    if (!cell) return false;
    if (change > 0 && this.credits < change) { this.message = '积分不足'; return false; }
    if (change < 0 && cell.stake < -change) { this.message = '未押分无法撤销'; return false; }
    cell.stake += change;
    this.credits -= change;
    this.message = `已押 ${cell.key} / 本局 ${this.totalStake} 分`;
    this.changeSerial++;
    return true;
  }
  addTestCredits(amount = 100): void {
    if (this.phase !== 'betting' || !Number.isSafeInteger(amount) || amount <= 0) return;
    this.credits += amount;
    this.message = `测试投币 +${amount}`;
    this.changeSerial++;
  }
  clearBets(): void {
    if (this.phase !== 'betting') return;
    this.credits += this.totalStake;
    this.cells.forEach(c => c.stake = 0);
    this.message = '本局押分已清空';
    this.changeSerial++;
  }
  /** Replace as a single transaction. A failed rebet preserves every current cell. */
  repeatLastBets():boolean{
    if(this.phase!=='betting')return false;
    const bets=this.history[0]?.bets;
    if(!bets?.length){this.message='暂无上场押分';return false;}
    const cost=bets.reduce((sum,b)=>sum+b.stake,0),available=this.credits+this.totalStake;
    if(!Number.isSafeInteger(cost)||cost<=0||available<cost){this.message='积分不足，原押分保留';return false;}
    const amounts=new Map(bets.map(b=>[b.key,b.stake]));
    this.credits=available-cost;for(const cell of this.cells)cell.stake=amounts.get(cell.key)??0;
    this.message='已沿用上场 '+cost+' 分';this.changeSerial++;return true;
  }
  /** Simulation of the old clear-score key: no cash-out functionality. */
  clearCredits(): void {
    if (this.phase !== 'betting') return;
    this.cells.forEach(c => c.stake = 0);
    this.credits = 0;
    this.chooseHighestEvent();
    this.message = '模拟清分完成（不涉及真实交易）';
    this.changeSerial++;
  }
  get canRestartJourney():boolean{return this.phase==='betting'&&this.credits===0&&this.totalStake===0;}
  /** Explicitly confirmed by the application; cumulative progress/settings are outside journey data. */
  restartJourney():boolean{
    if(!this.canRestartJourney)return false;
    this.credits=500;this.round=1;this.countdown=this.bettingSeconds;this.raceElapsed=0;this.resultElapsed=0;this.preparationRemaining=0;
    this.progress.fill(0);this.cells.forEach(c=>c.stake=0);this.history=[];this.lastResult=null;this.pendingOrder=[1,2,3,4,5,6];this.finishTimes.fill(18);this.visualSeed=0;this.presentationSeed=Date.now()>>>0;
    this.announcement='';this.chooseHighestEvent();this.message='新旅程：500分，请选择号码组合';this.changeSerial++;return true;
  }
  startRace(): boolean {
    if (this.phase === 'result') { this.nextRound(); return true; }
    if (this.phase !== 'betting') return false;
    if (!this.totalStake) { this.message = '请先选择号码组合押分'; return false; }
    if(this.events&&!this.canEnterEvent(this.selectedEventId)){this.message='参赛积分不足，请切换赛事';return false;}
    this.preparationRemaining=this.events?.preparationSeconds??0;
    if(this.preparationRemaining>0){this.phase='preparing';this.message='准备起跑';this.changeSerial++;}
    else this.startRunning();
    return true;
  }
  private startRunning():void{
    const order = [1,2,3,4,5,6];
    for (let i = order.length-1; i > 0; i--) {
      const rand = Math.min(0.999999, Math.max(0, this.random()));
      const j = Math.floor(rand*(i+1));
      [order[i],order[j]] = [order[j],order[i]];
    }
    this.pendingOrder = order;
    this.visualSeed=(this.presentationSeed+Math.imul(this.round,0x9e3779b9))>>>0;
    order.forEach((horse,rank) => { this.finishTimes[horse-1] = this.raceSeconds - 2.0 + rank*0.35; });
    this.progress.fill(0);
    this.raceElapsed = 0;
    this.phase = 'racing';
    this.message = '比赛进行中';
    this.changeSerial++;
  }
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // The 0.1s clamp intentionally mirrors a paused game's conservative tick.
    dt = Math.min(0.1,dt);
    if (this.phase === 'betting') {
      this.countdown = Math.max(0,this.countdown-dt);
      if (this.countdown <= 0.00001) {
        if (this.totalStake) {if(!this.startRace())this.countdown=this.bettingSeconds;}
        else this.countdown = this.bettingSeconds;
      }
    } else if(this.phase==='preparing'){
      this.preparationRemaining=Math.max(0,this.preparationRemaining-dt);
      if(this.preparationRemaining<=.00001){this.preparationRemaining=0;this.startRunning();}
    } else if (this.phase === 'racing') {
      this.raceElapsed += dt;
      for (let i = 0; i < 6; i++) {
        this.progress[i]=RaceChoreography.progress(i,this.raceElapsed,this.finishTimes[i],this.raceSeconds-2,this.visualSeed);
      }
      if (this.raceElapsed >= Math.max(...this.finishTimes)+.65) this.resolve();
    } else {
      this.resultElapsed += dt;
      // Keep the physical run-out moving through the same world after paying once.
      if(this.resultElapsed<6){
        this.raceElapsed+=dt;
        for(let i=0;i<6;i++)this.progress[i]=RacePace.progress(this.raceElapsed,this.finishTimes[i],this.raceSeconds-2);
      }
    }
  }
  private resolve(): void {
    const order = Object.freeze(this.pendingOrder.slice());
    const first = order[0], second = order[1];
    const pair = this.pairMode === 'unordered'
      ? RaceModel.normalizedPair(first,second) : `${first}-${second}`;
    const winCell = this.getCell(pair);
    const stake = this.totalStake;
    const payout = winCell ? winCell.stake * winCell.odds : 0;
    this.credits += payout;
    const bets=Object.freeze(this.cells.filter(c=>c.stake>0).map(c=>Object.freeze({key:c.key,stake:c.stake,odds:c.odds})));
    const result:RaceResult=Object.freeze({ first,second,order,pair,payout,stake,round:this.round,eventId:this.selectedEventId,bets,odds:winCell?.odds??0,net:payout-stake });
    const unlocked:string[]=[];this.completed.completed++;
    if(this.completed.completed===1)unlocked.push('首次完赛');if(this.completed.completed===10)unlocked.push('完成10场');
    if(this.selectedEventId==='regional'&&!this.completed.regional){this.completed.regional=true;unlocked.push('首次地区赛完赛');}
    if(this.selectedEventId==='championship'&&!this.completed.championship){this.completed.championship=true;unlocked.push('首次冠军赛完赛');}
    this.announcement=unlocked.join(' · ');
    this.lastResult = result;
    this.history.unshift(result);
    if (this.history.length > 20) this.history.length=20;
    this.phase = 'result';
    this.resultElapsed = 0;
    this.message = `本场 ${pair}  得分 +${payout}   Enter 下一场`;
    this.changeSerial++;
  }
  nextRound(): void {
    if(this.phase!=='result')return;
    this.round++;
    this.phase = 'betting';
    this.countdown = this.bettingSeconds;
    this.raceElapsed = 0;
    this.resultElapsed = 0;
    this.progress.fill(0);
    this.cells.forEach(c => c.stake = 0);
    this.preparationRemaining=0;
    this.chooseHighestEvent();
    this.lastResult=null;this.announcement='';
    this.message = '下一场：请选择号码组合';
    this.changeSerial++;
  }
  private snapshotRules():SnapshotRules{return {pairMode:this.pairMode,bettingSeconds:this.bettingSeconds,raceSeconds:this.raceSeconds,preparationSeconds:this.events?.preparationSeconds??0,cells:this.cells,tiers:this.eventTiers};}
  exportSnapshot():RaceSnapshot{
    return {version:1,pairMode:this.pairMode,bettingSeconds:this.bettingSeconds,raceSeconds:this.raceSeconds,phase:this.phase,round:this.round,credits:this.credits,countdown:this.countdown,preparationRemaining:this.preparationRemaining,raceElapsed:this.raceElapsed,resultElapsed:this.resultElapsed,eventId:this.selectedEventId,cells:this.cells.map(c=>({key:c.key,stake:c.stake,odds:c.odds})),pendingOrder:[...this.pendingOrder],finishTimes:[...this.finishTimes],presentationSeed:this.presentationSeed,visualSeed:this.visualSeed,history:[...this.history],lastResultRound:this.lastResult?.round??null,message:this.message,milestones:{...this.completed}};
  }
  static restore(value:unknown,random:()=>number=Math.random,opts:RaceOptions={}):RaceModel{
    const model=new RaceModel(random,opts),s=RaceSnapshotCodec.parse(value,model.snapshotRules());
    model.phase=s.phase;model.round=s.round;model.credits=s.credits;model.countdown=s.countdown;model.preparationRemaining=s.preparationRemaining;model.raceElapsed=s.raceElapsed;model.resultElapsed=s.resultElapsed;model.selectedEventId=s.eventId;model.message=s.message;
    s.cells.forEach((c,i)=>model.cells[i].stake=c.stake);model.pendingOrder=[...s.pendingOrder];model.finishTimes.splice(0,6,...s.finishTimes);model.presentationSeed=s.presentationSeed;model.visualSeed=s.visualSeed;model.history=[...s.history];model.lastResult=s.phase==='result'?model.history[0]:null;model.completed={...s.milestones!};
    if(s.phase==='racing'||s.phase==='result')for(let i=0;i<6;i++)model.progress[i]=RaceChoreography.progress(i,s.raceElapsed,model.finishTimes[i],model.raceSeconds-2,s.visualSeed);
    return model;
  }
}
