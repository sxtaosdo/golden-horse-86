import { _decorator, Component, Node, Label, Color, UITransform, resources, AudioClip, AudioSource, input, Input, EventKeyboard, EventMouse, view, ResolutionPolicy, profiler, sys } from 'cc';
import { EquipmentScene } from './presentation/equipment/EquipmentScene';
import { raceScreen } from './presentation/equipment/RaceScreen';
import { PREVIEW } from 'cc/env';
import { StateMachine } from 'db://shidai3/runtime/stateMachine';
import { GoldenHorseTestBridge } from '../tests/GoldenHorseTestBridge';
import { RaceModel } from './RaceModel';
import { RaceTrackView } from './RaceTrackView';
import { coursePoint, horsePose, trackSection, COURSE_FINISH_X, HORSE_NOSE_X } from './TrackVisual';
import { RacePageContext, LoadingPage, BettingPage, RacingPage } from './presentation/RacePages';
import { RaceVisualAssets } from './presentation/RaceVisualAssets';
import { HorseSpriteView } from './presentation/HorseSpriteView';
import { mobileLayout, betPosition } from './presentation/MobileLayout';
const { ccclass, property } = _decorator;
@ccclass('GoldenHorseGame')
export class GoldenHorseGame extends Component implements RacePageContext {
 @property(Node) uiRoot:Node|null=null;
 @property(Node) raceHost:Node|null=null;
 @property(Node) bettingPage:Node|null=null;
 @property(Node) footer:Node|null=null;
 @property(Node) hud:Node|null=null;
 @property(Node) resultPanel:Node|null=null;
 @property(Node) historyPanel:Node|null=null;
 @property([Node]) betNodes:Node[]=[];
 @property([Node]) buttons:Node[]=[];
 @property([Label]) oddsLabels:Label[]=[];
 @property([Label]) stakeLabels:Label[]=[];
 @property(Label) textCredits:Label|null=null;
 @property(Label) textTimer:Label|null=null;
 @property(Label) textMessage:Label|null=null;
 @property(Label) textHistory:Label|null=null;
 @property(Label) resultText:Label|null=null;
 @property(Label) resultOdds:Label|null=null;
 @property(Label) startText:Label|null=null;
 @property(Label) undoText:Label|null=null;
 readonly StateMachine:StateMachine<RacePageContext>=new StateMachine<RacePageContext>(this);
 @property(Node) eventButton:Node|null=null;
 @property(Node) eventPanel:Node|null=null;
 @property(Node) eventClose:Node|null=null;
 @property(Label) eventText:Label|null=null;
 @property([Node]) eventChoices:Node[]=[];
 @property([Label]) eventChoiceLabels:Label[]=[];
 private game!:RaceModel;
 private equipment:EquipmentScene|null=null;
 private readonly artwork=new RaceVisualAssets();
 private courseView!:RaceTrackView;
 private horses:HorseSpriteView[]=[];
 private keys:string[]=[];
 private sounds:Record<string,AudioClip>={};
 private loadErrors:string[]=[];
 private pendingAssets=8;
 private pagePending=false;private disposed=false;private pageTask:Promise<void>=Promise.resolve();
 private audio!:AudioSource;private heldF8=false;private lastPhase='betting';private gallopTimer=0;
 private undo=false;private layoutHeight=1334;
 private testBridge:GoldenHorseTestBridge|null=null;
 onLoad():void{
  if(!this.uiRoot||!this.raceHost||!this.bettingPage||!this.footer||!this.hud||!this.resultPanel||!this.historyPanel||this.betNodes.length!==15||this.buttons.length!==4||this.oddsLabels.length!==15||this.stakeLabels.length!==15||![this.textCredits,this.textTimer,this.textMessage,this.textHistory,this.resultText,this.resultOdds,this.startText,this.undoText,...this.betNodes,...this.buttons,...this.oddsLabels,...this.stakeLabels].every(Boolean))throw Error('Mobile scene bindings incomplete');
  if(!this.eventButton||!this.eventPanel||!this.eventClose||!this.eventText||this.eventChoices.length!==3||this.eventChoiceLabels.length!==3||![...this.eventChoices,...this.eventChoiceLabels].every(Boolean))throw Error('Event scene bindings incomplete');
  view.setDesignResolutionSize(750,1334,ResolutionPolicy.FIXED_WIDTH);profiler.hideStats();
  this.courseView=new RaceTrackView(this.raceHost);this.courseView.viewport.setSiblingIndex(0);
  for(let a=1;a<=5;a++)for(let b=6;b>a;b--)this.keys.push(a+'-'+b);
  this.betNodes.forEach((node,i)=>{const p=betPosition(i);node.setPosition(p.x,p.y);node.on(Node.EventType.TOUCH_END,()=>this.bet(this.keys[i],this.undo?-1:1),this);node.on(Node.EventType.MOUSE_DOWN,(e:EventMouse)=>{if(e.getButton()===EventMouse.BUTTON_RIGHT)this.bet(this.keys[i],-1);},this);});
  this.buttons[0].on(Node.EventType.TOUCH_END,()=>{if(this.canBet())this.undo=!this.undo;},this);
  this.buttons[1].on(Node.EventType.TOUCH_END,()=>{if(this.canBet()){this.game.clearBets();this.sound('cancel');}},this);
  this.buttons[2].on(Node.EventType.TOUCH_END,()=>{this.historyPanel!.active=!this.historyPanel!.active;},this);
  this.buttons[3].on(Node.EventType.TOUCH_END,this.beginRace,this);
  this.eventButton.on(Node.EventType.TOUCH_END,()=>{if(this.canBet())this.eventPanel!.active=true;},this);
  this.eventClose.on(Node.EventType.TOUCH_END,()=>{this.eventPanel!.active=false;},this);
  this.eventChoices.forEach((node,index)=>node.on(Node.EventType.TOUCH_END,()=>{
   if(this.canBet()){const ok=this.game.selectEvent(this.artwork.catalog.tiers[index].id);this.sound(ok?'bet':'error');if(ok)this.eventPanel!.active=false;}
  },this));this.eventPanel.active=false;
  this.historyPanel.active=false;this.audio=this.node.addComponent(AudioSource);
  input.on(Input.EventType.KEY_DOWN,this.keyDown,this);input.on(Input.EventType.KEY_UP,this.keyUp,this);
  view.on('canvas-resize',this.relayout,this);view.on('design-resolution-changed',this.relayout,this);this.relayout();
  this.changePage(LoadingPage);
 }
 private relayout():void{
  if(this.disposed||!this.uiRoot)return;
  const visible=view.getVisibleSize(),safe=sys.getSafeAreaRect(false),l=mobileLayout(visible.height,safe);this.layoutHeight=visible.height;
  this.uiRoot.setPosition(l.safeX+l.safeWidth/2-visible.width/2,l.safeY+l.safeHeight/2-visible.height/2);
  this.uiRoot.getComponent(UITransform)!.setContentSize(750,l.safeHeight);
  this.raceHost!.setPosition(0,l.safeHeight/2-l.raceHeight/2);this.raceHost!.getComponent(UITransform)!.setContentSize(750,l.raceHeight);
  this.bettingPage!.setPosition(0,-l.safeHeight/2+l.footerHeight+l.panelHeight/2);
  this.footer!.setPosition(0,-l.safeHeight/2+l.footerHeight/2);this.hud!.setPosition(0,l.raceHeight/2-45);
  this.courseView.resize(750,l.raceHeight);
 }
 showLoading():void{if(this.disposed)return;this.resultPanel!.active=false;this.loadResources();}
 showBetting():void{if(this.disposed)return;this.bettingPage!.active=true;this.courseView.viewport.active=true;this.resultPanel!.active=false;this.undo=false;}
 showRace():void{if(this.disposed)return;this.bettingPage!.active=true;this.courseView.viewport.active=true;this.historyPanel!.active=false;this.eventPanel!.active=false;this.undo=false;}
 private changePage(Page:typeof LoadingPage|typeof BettingPage|typeof RacingPage):void{
  if(this.disposed||this.pagePending||this.StateMachine.is(Page))return;this.pagePending=true;
  this.pageTask=this.StateMachine.changeState(Page).catch((error:unknown)=>{if(!this.disposed&&this.isValid)this.loadErrors.push(error instanceof Error?error.message:String(error));}).finally(()=>{this.pagePending=false;});
 }
 private loadResources():void{
  void this.artwork.load().then(()=>{
   if(this.disposed)return;
   this.game=new RaceModel(Math.random,{events:this.artwork.catalog.rules});
   this.courseView.decorate(this.artwork);
   for(let i=1;i<=6;i++)this.horses.push(new HorseSpriteView(this.courseView.horseLayer,i,this.artwork));
   this.equipment=new EquipmentScene(this.courseView,this.raceHost!,this.artwork);this.equipment.setTier(this.game.eventId);
   if(PREVIEW)this.testBridge=new GoldenHorseTestBridge(this.game,()=>this.observe());
  }).catch((error:unknown)=>{if(!this.disposed)this.loadErrors.push(String(error));}).finally(()=>{if(!this.disposed)this.pendingAssets--;});
  for(const name of ['bet','cancel','start','win','finish','error','gallop'])resources.load('audio/'+name,AudioClip,(error,clip)=>{if(this.disposed||!this.isValid)return;this.pendingAssets--;if(error)this.loadErrors.push(error.message);else this.sounds[name]=clip;});
 }
 private clientRect(node:Node):Record<string,number>{
  const r=document.querySelector('canvas')?.getBoundingClientRect(),ui=node.getComponent(UITransform)!;
  if(!r)return{};const root=this.node.parent!.getComponent(UITransform)!,local=root.convertToNodeSpaceAR(node.worldPosition),v=view.getVisibleSize();
  return{x:r.left+(local.x+v.width/2-ui.width/2)/v.width*r.width,y:r.top+(v.height/2-local.y-ui.height/2)/v.height*r.height,width:ui.width/v.width*r.width,height:ui.height/v.height*r.height};
 }
 private observe():Record<string,unknown>{return{
  revision:'race-pace-r07-v1',raceElapsed:this.game.raceElapsed,courseFraction:this.game.courseFraction,strideTimes:this.game.progress.map((_,i)=>this.game.strideTime(i)),leaderHorse:this.game.leaderIndex+1,eventId:this.game.eventId,eventName:this.game.eventName,eligibilityCredits:this.game.eligibilityCredits,preparationRemaining:this.game.preparationRemaining,equipment:this.equipment?.observation,eventPickerVisible:this.eventPanel?.active,eventButton:this.eventButton?this.clientRect(this.eventButton):{},eventChoices:this.eventChoices.map(n=>this.clientRect(n)),eventClose:this.eventClose?this.clientRect(this.eventClose):{},ready:this.canInput(),pendingAssets:this.pendingAssets,loadErrors:[...this.loadErrors],section:trackSection(this.game.courseFraction),
  uiMode:this.StateMachine.is(RacingPage)?'race':this.StateMachine.is(BettingPage)?'betting':'loading',bettingPageVisible:this.bettingPage?.active,raceViewportVisible:this.courseView.viewport.active,
  designResolution:{width:750,height:1334},visibleHeight:this.layoutHeight,raceViewport:this.clientRect(this.raceHost!),
  touchTargets:this.betNodes.map((node,i)=>({key:this.keys[i],...this.clientRect(node)})),buttons:this.buttons.map(node=>({name:node.name,...this.clientRect(node)})),undoMode:this.undo,
  horseFrames:this.artwork.frames.size*8,backgrounds:this.artwork.props.size,sounds:Object.keys(this.sounds).length,
  worldId:this.courseView.world.uuid,worldPaintBuilds:this.courseView.paintBuilds,raceScale:this.courseView.scale,camera:{...this.courseView.camera},finishWorldX:COURSE_FINISH_X,horseNoseOffset:HORSE_NOSE_X,finishDirection:-1,
  uiCredits:this.textCredits?.string,uiResult:this.resultText?.string,resultPanel:this.resultPanel?.active,startButton:this.startText?.string,
  horsePositions:this.horses.map(h=>({x:h.node.position.x,y:-h.node.position.y})),screenHorsePositions:this.horses.map(h=>this.courseView.project({x:h.node.position.x,y:-h.node.position.y}))
 };}
 private canInput():boolean{return !!this.game&&!this.disposed&&!this.pagePending&&this.pendingAssets===0&&!this.loadErrors.length&&!this.StateMachine.is(LoadingPage);}
 private canBet():boolean{return this.canInput()&&this.StateMachine.is(BettingPage)&&this.game.phase==='betting';}
 private bet(key:string,delta:number):void{if(this.canBet())this.sound(this.game.placeBet(key,delta)?delta>0?'bet':'cancel':'error');}
 private beginRace():void{if(!this.canInput())return;const was=this.game.phase;if(!this.game.startRace())this.sound('error');else if(was==='result')this.sound('finish');this.syncPage();}
 private keyDown(event:EventKeyboard):void{
  if(!this.canInput())return;const key=event.keyCode as number;if(key===119)this.heldF8=true;else if(key===120&&this.heldF8)this.game.addTestCredits(100);else if(key===123&&this.heldF8)this.game.clearCredits();else if(key===13||key===32)this.beginRace();else if(key===67&&this.canBet())this.game.clearBets();
 }
 private keyUp(event:EventKeyboard):void{if((event.keyCode as number)===119)this.heldF8=false;}
 private sound(name:string):void{const clip=this.sounds[name];if(clip)this.audio.playOneShot(clip,.5);}
 private syncPage():void{if(this.game&&!this.pendingAssets&&!this.loadErrors.length)this.changePage(this.game.phase==='betting'?BettingPage:RacingPage);}
 update(dt:number):void{
  if(this.canInput())this.game.update(dt);this.syncPage();
  if(!this.game){this.refresh();return;}
  if(this.game.phase==='racing'){this.gallopTimer-=dt;if(this.gallopTimer<=0){this.sound('gallop');this.gallopTimer=1.7;}}else this.gallopTimer=0;
  if(this.lastPhase!==this.game.phase){if(this.game.phase==='racing')this.sound('start');if(this.game.phase==='result')this.sound(this.game.lastResult?.payout?'win':'finish');this.lastPhase=this.game.phase;}
  this.courseView.follow(this.game.courseFraction);this.horses.forEach((h,i)=>{
   const stride=this.game.strideTime(i);h.render(horsePose(i,this.game.progress[i],stride),stride,this.game.phase==='racing'||this.game.phase==='result');
  });
  [...this.horses].sort((a,b)=>b.node.position.y-a.node.position.y).forEach(h=>h.node.setSiblingIndex(10000));
  this.equipment?.setTier(this.game.eventId);
  const leader=this.game.leaderIndex;
  this.equipment?.update(dt,raceScreen(this.game.phase,this.game.round,this.game.eventName,this.game.preparationRemaining,this.game.lastResult,this.game.resultElapsed,this.artwork.catalog.rules.resultDisplaySeconds),{round:this.game.round,phase:this.game.phase,preparationRemaining:this.game.preparationRemaining,raceElapsed:this.game.raceElapsed,horse:leader+1,point:coursePoint(leader,this.game.progress[leader])});
  this.refresh();this.testBridge?.sampleFrame();
 }
 private refresh():void{
  if(!this.game||this.pendingAssets||this.loadErrors.length){this.textTimer!.string='素材载入中';this.textMessage!.string=this.loadErrors[0]??'加载 '+(8-this.pendingAssets)+'/8';this.startText!.string='载入中';return;}
  this.textCredits!.string='积分 '+this.game.credits+'   押分 '+this.game.totalStake;
  this.textTimer!.string=this.pendingAssets?'素材载入中':this.game.phase==='betting'?'押分 '+Math.ceil(this.game.countdown)+' 秒':this.game.phase==='preparing'?'起跑准备 '+Math.ceil(this.game.preparationRemaining)+' 秒':this.game.phase==='racing'?'比赛中 · 押分锁定':'本场已结算';
  this.textMessage!.string=this.game.eventName+' · 前二组合';
  this.startText!.string=this.game.phase==='result'?'下一场':this.game.phase==='preparing'?'准备中':this.game.phase==='racing'?'比赛中':'开跑';this.undoText!.string=this.undo?'撤销：开':'撤销：关';
  this.resultPanel!.active=this.game.phase==='result';const result=this.game.lastResult;
  if(result){this.resultText!.string=result.first+' — '+result.second;this.resultOdds!.string='倍率 '+(this.game.getCell(result.pair)?.odds??0)+'    返分 '+result.payout;}
  this.textHistory!.string=this.game.history.length?this.game.history.slice(0,5).map((r,i)=>(i+1)+'    '+r.first+' — '+r.second+'    ×'+(this.game.getCell(r.pair)?.odds??0)).join('\n\n'):'暂无比赛记录';
  this.eventText!.string=this.game.eventName+'\n选择赛事';
  this.eventChoiceLabels.forEach((label,i)=>{const tier=this.artwork.catalog.tiers[i],eligible=this.game.canEnterEvent(tier.id);label.string=tier.name+'  ·  '+tier.equipment.length+' 类设备\n'+(this.game.eventId===tier.id?'当前赛事':eligible?'可参加 · 无费用':'需 '+tier.minCredits+' 积分');label.color=eligible?new Color(255,225,146):new Color(155,160,157);});
  this.keys.forEach((key,i)=>{const c=this.game.getCell(key)!;this.oddsLabels[i].string='×'+c.odds;this.stakeLabels[i].string=c.stake?'押 '+c.stake:'—';this.oddsLabels[i].color=this.game.phase==='betting'?new Color(255,224,92):new Color(193,185,143);});
 }
 onDestroy():void{
  this.disposed=true;this.equipment?.dispose();this.testBridge?.dispose();void this.pageTask.then(()=>this.StateMachine.releaseAllStates());this.artwork.dispose();
  for(const node of [...this.betNodes,...this.buttons,...this.eventChoices,this.eventButton,this.eventClose])node?.targetOff(this);
  input.off(Input.EventType.KEY_DOWN,this.keyDown,this);input.off(Input.EventType.KEY_UP,this.keyUp,this);view.off('canvas-resize',this.relayout,this);view.off('design-resolution-changed',this.relayout,this);
 }
}
