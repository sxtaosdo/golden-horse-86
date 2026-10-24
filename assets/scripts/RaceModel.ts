/**
 * Golden Horse 86 research prototype: game rules and odds can be revised when
 * an actual recording or ROM becomes available. NO monetary transactions.
 */
import { RaceChoreography, RacePace } from './TrackVisual';
import { RaceEventId, RaceEventRules, RaceEventTier } from './events/RaceEventCatalog';
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
  first: number; second: number; order: number[];
  pair: string; payout: number; stake: number;
  round:number;eventId:RaceEventId;
}
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
  message = '点击号码组合押分 / Enter 开跑';
  lastResult: RaceResult | null = null;
  history: RaceResult[] = [];

  private readonly random: () => number;
  private readonly finishTimes: number[] = [18,18,18,18,18,18];
  private readonly raceSeconds: number;
  private readonly presentationSeed:number;
  private visualSeed=0;
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
    this.selectedEventId=id;this.message='已选择'+this.eventName;return true;
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
    return true;
  }
  addTestCredits(amount = 100): void {
    if (this.phase !== 'betting' || !Number.isSafeInteger(amount) || amount <= 0) return;
    this.credits += amount;
    this.message = `测试投币 +${amount}`;
  }
  clearBets(): void {
    if (this.phase !== 'betting') return;
    this.credits += this.totalStake;
    this.cells.forEach(c => c.stake = 0);
    this.message = '本局押分已清空';
  }
  /** Simulation of the old clear-score key: no cash-out functionality. */
  clearCredits(): void {
    if (this.phase !== 'betting') return;
    this.cells.forEach(c => c.stake = 0);
    this.credits = 0;
    this.chooseHighestEvent();
    this.message = '模拟清分完成（不涉及真实交易）';
  }
  startRace(): boolean {
    if (this.phase === 'result') { this.nextRound(); return true; }
    if (this.phase !== 'betting') return false;
    if (!this.totalStake) { this.message = '请先选择号码组合押分'; return false; }
    if(this.events&&!this.canEnterEvent(this.selectedEventId)){this.message='参赛积分不足，请切换赛事';return false;}
    this.preparationRemaining=this.events?.preparationSeconds??0;
    if(this.preparationRemaining>0){this.phase='preparing';this.message='准备起跑';}
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
    const order = this.pendingOrder.slice();
    const first = order[0], second = order[1];
    const pair = this.pairMode === 'unordered'
      ? RaceModel.normalizedPair(first,second) : `${first}-${second}`;
    const winCell = this.getCell(pair);
    const stake = this.totalStake;
    const payout = winCell ? winCell.stake * winCell.odds : 0;
    this.credits += payout;
    const result = { first,second,order,pair,payout,stake,round:this.round,eventId:this.selectedEventId };
    this.lastResult = result;
    this.history.unshift(result);
    if (this.history.length > 20) this.history.length=20;
    this.phase = 'result';
    this.resultElapsed = 0;
    this.message = `本场 ${pair}  得分 +${payout}   Enter 下一场`;
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
    this.lastResult=null;
    this.message = '下一场：请选择号码组合';
  }
}
