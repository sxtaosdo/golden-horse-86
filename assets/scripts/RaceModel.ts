/**
 * Golden Horse 86 research prototype: game rules and odds can be revised when
 * an actual recording or ROM becomes available. NO monetary transactions.
 */
import { COURSE_BREAKS, FINAL_STRAIGHT_START } from './TrackVisual';
export type Phase = 'betting' | 'racing' | 'result';
export type PairMode = 'unordered' | 'ordered';
export interface RaceOptions {
  pairMode?: PairMode;
  bettingSeconds?: number;
  initialCredits?: number;
  odds?: Record<string, number>;
  raceSeconds?: number;
}
export interface RaceResult {
  first: number; second: number; order: number[];
  pair: string; payout: number; stake: number;
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
  message = '点击号码组合押分 / Enter 开跑';
  lastResult: RaceResult | null = null;
  history: RaceResult[] = [];

  private readonly random: () => number;
  private readonly finishTimes: number[] = [18,18,18,18,18,18];
  private readonly raceSeconds: number;
  private pendingOrder: number[] = [1,2,3,4,5,6];
  /** Visual timeline only; winner selection and payout remain unchanged. */
  get courseFraction():number { return Math.min(1,this.raceElapsed/(this.raceSeconds-2)); }

  constructor(random: () => number = Math.random, opts: RaceOptions = {}) {
    this.random = random;
    this.pairMode = opts.pairMode ?? 'unordered';
    this.bettingSeconds = opts.bettingSeconds ?? 30;
    this.countdown = this.bettingSeconds;
    this.credits = opts.initialCredits ?? 500;
    this.raceSeconds = opts.raceSeconds ?? 26;
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
    this.message = '模拟清分完成（不涉及真实交易）';
  }
  startRace(): boolean {
    if (this.phase === 'result') { this.nextRound(); return true; }
    if (this.phase !== 'betting') return false;
    if (!this.totalStake) { this.message = '请先选择号码组合押分'; return false; }
    const order = [1,2,3,4,5,6];
    for (let i = order.length-1; i > 0; i--) {
      const rand = Math.min(0.999999, Math.max(0, this.random()));
      const j = Math.floor(rand*(i+1));
      [order[i],order[j]] = [order[j],order[i]];
    }
    this.pendingOrder = order;
    order.forEach((horse,rank) => { this.finishTimes[horse-1] = this.raceSeconds - 2.0 + rank*0.35; });
    this.progress.fill(0);
    this.raceElapsed = 0;
    this.phase = 'racing';
    this.message = '比赛进行中';
    return true;
  }
  update(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // The 0.1s clamp intentionally mirrors a paused game's conservative tick.
    dt = Math.min(0.1,dt);
    if (this.phase === 'betting') {
      this.countdown = Math.max(0,this.countdown-dt);
      if (this.countdown <= 0.00001) {
        if (this.totalStake) this.startRace();
        else this.countdown = this.bettingSeconds;
      }
    } else if (this.phase === 'racing') {
      this.raceElapsed += dt;
      const finalStart=(this.raceSeconds-2)*FINAL_STRAIGHT_START;
      for (let i = 0; i < 6; i++) {
        if(this.raceElapsed>=finalStart){
          // One shared scene timeline up to the home straight; actual finish times then separate the field.
          this.progress[i]=Math.min(1.5,FINAL_STRAIGHT_START+(1-FINAL_STRAIGHT_START)*
            (this.raceElapsed-finalStart)/(this.finishTimes[i]-finalStart));
        }else{
          const fraction=this.courseFraction;
          let section=0;while(section<COURSE_BREAKS.length-2&&fraction>=COURSE_BREAKS[section+1])section++;
          const start=COURSE_BREAKS[section],end=COURSE_BREAKS[section+1];
          const local=(fraction-start)/(end-start);
          const offset=.008*Math.sin(Math.PI*local)**2*Math.sin(this.raceElapsed*1.4+i*.7);
          this.progress[i]=Math.max(start,Math.min(end-1e-9,fraction+offset));
        }
      }
      if (this.raceElapsed >= Math.max(...this.finishTimes)+.65) this.resolve();
    } else {
      this.resultElapsed += dt;
      // Keep the physical run-out moving through the same world after paying once.
      if(this.resultElapsed<6){
        this.raceElapsed+=dt;
        const finalStart=(this.raceSeconds-2)*FINAL_STRAIGHT_START;
        for(let i=0;i<6;i++)this.progress[i]=Math.min(1.5,FINAL_STRAIGHT_START+(1-FINAL_STRAIGHT_START)*
          (this.raceElapsed-finalStart)/(this.finishTimes[i]-finalStart));
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
    const result = { first,second,order,pair,payout,stake };
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
    this.lastResult=null;
    this.message = '下一场：请选择号码组合';
  }
}
