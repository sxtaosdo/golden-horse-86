import { _decorator, Component, Node, Label, Color, Sprite, UITransform, resources, AudioClip, Game, game as engineGame, input, Input, EventKeyboard, EventMouse, EventTouch, view, ResolutionPolicy, profiler, sys } from 'cc';
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
import { PreRacePresentation, PreRaceCue } from './presentation/PreRacePresentation';
import { PreRaceAudio } from './presentation/PreRaceAudio';
import { RaceGroundEffects } from './presentation/RaceGroundEffects';
import { BetHold } from './presentation/BetHold';
import { GameAudio } from './presentation/GameAudio';
import { ArchiveMode, RaceArchive, StoragePort } from './session/RaceArchive';
import { DEFAULT_SETTINGS, PlayerSettings, readSettings } from './session/PlayerSettings';
const { ccclass, property } = _decorator;
type SessionDialog='none'|'resume'|'busy'|'corrupt'|'save-error'|'history'|'settings';
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
 @property([Sprite]) betBorders:Sprite[]=[];
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
 @property([Node]) quickButtons:Node[]=[];
 @property([Label]) quickLabels:Label[]=[];
 @property(Label) oddsHeader:Label|null=null;
 @property(Node) utilityPanel:Node|null=null;
 @property(Label) utilityTitle:Label|null=null;
 @property(Label) utilityBody:Label|null=null;
 @property([Node]) utilityActions:Node[]=[];
 @property([Label]) utilityActionLabels:Label[]=[];
 @property(Label) archiveStatus:Label|null=null;
 @property(Node) utilityClose:Node|null=null;
 @property([Node]) menuButtons:Node[]=[];
 private game!:RaceModel;
 private equipment:EquipmentScene|null=null;
 private readonly artwork=new RaceVisualAssets();
 private courseView!:RaceTrackView;
 private horses:HorseSpriteView[]=[];
 private keys:string[]=[];
 private sounds:Record<string,AudioClip>={};
 private loadErrors:string[]=[];
 private pendingAssets=9;
 private preRace=new PreRacePresentation();private preAudio:PreRaceAudio|null=null;
 private groundEffects:RaceGroundEffects|null=null;
 private readonly betHold=new BetHold();private settings:PlayerSettings={...DEFAULT_SETTINGS};private activeReducedMotion=false;private visualRound=0;
 private get stakeUnit():1|5|10{return this.settings.chip;}
 private set stakeUnit(value:1|5|10){this.settings.chip=value;}
 private archive:RaceArchive|null=null;private gameAudio:GameAudio|null=null;private dialog:SessionDialog='none';private background=false;private archiveInvalid=false;private retrying=false;
 private savedChangeId=-1;private checkpointSeconds=0;private queuedCues:PreRaceCue[]=[];private equipmentNeedsSync=true;
 private pagePending=false;private disposed=false;private pageTask:Promise<void>=Promise.resolve();
 private heldF8=false;private lastPhase='betting';private gallopTimer=0;
 private undo=false;private layoutHeight=1334;
 private testBridge:GoldenHorseTestBridge|null=null;
 onLoad():void{
  if(!this.uiRoot||!this.raceHost||!this.bettingPage||!this.footer||!this.hud||!this.resultPanel||!this.historyPanel||this.betNodes.length!==15||this.buttons.length!==4||this.oddsLabels.length!==15||this.stakeLabels.length!==15||![this.textCredits,this.textTimer,this.textMessage,this.textHistory,this.resultText,this.resultOdds,this.startText,this.undoText,...this.betNodes,...this.buttons,...this.oddsLabels,...this.stakeLabels].every(Boolean))throw Error('Mobile scene bindings incomplete');
  if(!this.eventButton||!this.eventPanel||!this.eventClose||!this.eventText||this.eventChoices.length!==3||this.eventChoiceLabels.length!==3||![...this.eventChoices,...this.eventChoiceLabels].every(Boolean))throw Error('Event scene bindings incomplete');
  if(this.quickButtons.length!==2||this.quickLabels.length!==2||this.betBorders.length!==15||!this.oddsHeader||![...this.quickButtons,...this.quickLabels,...this.betBorders].every(Boolean))throw Error('Quick bet scene bindings incomplete');
  if(!this.utilityPanel||!this.utilityTitle||!this.utilityBody||!this.archiveStatus||this.utilityActions.length!==8||this.utilityActionLabels.length!==8||![...this.utilityActions,...this.utilityActionLabels].every(Boolean))throw Error('Session scene bindings incomplete');
  if(!this.utilityClose||this.menuButtons.length!==1||!this.menuButtons.every(Boolean))throw Error('Settings scene bindings incomplete');
  view.setDesignResolutionSize(750,1334,ResolutionPolicy.FIXED_WIDTH);profiler.hideStats();
  this.courseView=new RaceTrackView(this.raceHost);this.courseView.viewport.setSiblingIndex(0);
  for(let a=1;a<=5;a++)for(let b=6;b>a;b--)this.keys.push(a+'-'+b);
  this.betNodes.forEach((node,i)=>{
   const p=betPosition(i);node.setPosition(p.x,p.y);
   node.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{this.betHold.cancel();const amount=this.undo?-this.stakeUnit:this.stakeUnit;if(this.bet(this.keys[i],amount))this.betHold.begin(i,amount,e.getID()??0);},this);
   node.on(Node.EventType.TOUCH_END,(e:EventTouch)=>this.betHold.end(e.getID()??0),this);node.on(Node.EventType.TOUCH_CANCEL,(e:EventTouch)=>this.betHold.end(e.getID()??0),this);
   node.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>{if(this.betHold.matches(i,e.getID()??0)&&!node.getComponent(UITransform)!.hitTest(e.getLocation()))this.betHold.cancel();},this);
   node.on(Node.EventType.MOUSE_DOWN,(e:EventMouse)=>{if(e.getButton()===EventMouse.BUTTON_RIGHT){this.betHold.cancel();this.bet(this.keys[i],-this.stakeUnit);}},this);
  });
  this.quickButtons[0].on(Node.EventType.TOUCH_END,()=>{if(this.canBet()){this.betHold.cancel();this.stakeUnit=this.stakeUnit===1?5:this.stakeUnit===5?10:1;this.writeCheckpoint();}},this);
  this.quickButtons[1].on(Node.EventType.TOUCH_END,()=>{if(this.canBet()){this.betHold.cancel();const ok=this.game.repeatLastBets();if(ok){this.preRace.clearFeedback();this.writeCheckpoint();}this.sound(ok?'bet':'error');}},this);
  this.buttons[0].on(Node.EventType.TOUCH_END,()=>{if(this.canBet()){this.betHold.cancel();this.undo=!this.undo;}},this);
  this.buttons[1].on(Node.EventType.TOUCH_END,()=>{if(this.canBet()){this.betHold.cancel();this.game.clearBets();this.preRace.clearFeedback();this.writeCheckpoint();this.sound('cancel');}},this);
  this.buttons[2].on(Node.EventType.TOUCH_END,()=>{if(this.canOperate())this.openDialog('history');},this);
  this.buttons[3].on(Node.EventType.TOUCH_END,this.beginRace,this);
  this.eventButton.on(Node.EventType.TOUCH_END,()=>{if(this.canBet()){this.betHold.cancel();this.queuedCues=[];this.gameAudio?.stop();this.preAudio?.stop();this.eventPanel!.active=true;}},this);
  this.eventClose.on(Node.EventType.TOUCH_END,()=>{this.eventPanel!.active=false;},this);
  this.eventChoices.forEach((node,index)=>node.on(Node.EventType.TOUCH_END,()=>{
   if(this.canInput()&&!this.background&&this.dialog==='none'&&this.game.phase==='betting'&&this.eventPanel?.active){const ok=this.game.selectEvent(this.artwork.catalog.tiers[index].id);if(ok){this.eventPanel!.active=false;this.writeCheckpoint();}this.sound(ok?'bet':'error');}
  },this));this.eventPanel.active=false;
  this.historyPanel.active=false;this.utilityPanel.active=false;this.gameAudio=new GameAudio(this.node);this.preAudio=new PreRaceAudio(this.node);
  this.archive=new RaceArchive(this.storagePort(),typeof navigator==='undefined'?undefined:navigator.locks);
  this.utilityActions.forEach((node,i)=>node.on(Node.EventType.TOUCH_END,()=>{void this.dialogAction(i);},this));
  this.menuButtons[0].on(Node.EventType.TOUCH_END,()=>{if(this.canOperate())this.openDialog('settings');},this);
  this.utilityClose.on(Node.EventType.TOUCH_END,()=>{if(this.canInput()&&!this.background&&['history','settings'].includes(this.dialog))this.dialog='none';},this);
  this.uiRoot.on(Node.EventType.TOUCH_START,()=>this.preAudio?.unlock(),this);this.uiRoot.on(Node.EventType.MOUSE_DOWN,()=>this.preAudio?.unlock(),this);
  input.on(Input.EventType.KEY_DOWN,this.keyDown,this);input.on(Input.EventType.KEY_UP,this.keyUp,this);
  view.on('canvas-resize',this.relayout,this);view.on('design-resolution-changed',this.relayout,this);this.relayout();
  engineGame.on(Game.EVENT_HIDE,this.onHidden,this);engineGame.on(Game.EVENT_SHOW,this.onShown,this);
  if(typeof window!=='undefined'){window.addEventListener('pagehide',this.onHidden);window.addEventListener('pageshow',this.onShown);}
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
  this.utilityPanel?.getComponent(UITransform)?.setContentSize(750,l.safeHeight);
 }
 showLoading():void{if(this.disposed)return;this.resultPanel!.active=false;this.loadResources();}
 showBetting():void{if(this.disposed)return;this.bettingPage!.active=true;this.courseView.viewport.active=true;this.resultPanel!.active=false;this.undo=false;}
 showRace():void{if(this.disposed)return;this.bettingPage!.active=true;this.courseView.viewport.active=true;this.historyPanel!.active=false;this.eventPanel!.active=false;this.undo=false;}
 private changePage(Page:typeof LoadingPage|typeof BettingPage|typeof RacingPage):void{
  if(this.disposed||this.pagePending||this.StateMachine.is(Page))return;this.pagePending=true;
  this.pageTask=this.StateMachine.changeState(Page).catch((error:unknown)=>{if(!this.disposed&&this.isValid)this.loadErrors.push(error instanceof Error?error.message:String(error));}).finally(()=>{this.pagePending=false;});
 }
 private loadResources():void{
  void this.artwork.load().then(async()=>{
   if(this.disposed)return;
   await this.initializeArchive();if(this.disposed)return;
   this.courseView.decorate(this.artwork);
   for(let i=1;i<=6;i++)this.horses.push(new HorseSpriteView(this.courseView.horseLayer,i,this.artwork));
   this.equipment=new EquipmentScene(this.courseView,this.raceHost!,this.artwork);this.equipment.setTier(this.game.eventId);this.groundEffects=new RaceGroundEffects(this.courseView.horseLayer);
   if(PREVIEW)this.testBridge=new GoldenHorseTestBridge(this.game,()=>this.observe(),()=>this.canOperate());
  }).catch((error:unknown)=>{if(!this.disposed)this.loadErrors.push(String(error));}).finally(()=>{if(!this.disposed)this.pendingAssets--;});
  void (this.preAudio?.load()??Promise.resolve()).catch((error:unknown)=>{if(!this.disposed)this.preAudio?.warnings.push(String(error));}).finally(()=>{if(!this.disposed)this.pendingAssets--;});
  for(const name of ['bet','cancel','start','win','finish','error','gallop'])resources.load('audio/'+name,AudioClip,(error,clip)=>{if(this.disposed||!this.isValid)return;this.pendingAssets--;if(error)this.loadErrors.push(error.message);else{this.sounds[name]=clip;this.gameAudio?.setClip(name,clip);}});
 }
 private storagePort():StoragePort|null{try{return sys.localStorage;}catch{return null;}}
 private get paused():boolean{return this.background||this.dialog!=='none'||this.eventPanel?.active===true;}
 private async initializeArchive():Promise<void>{
  const mode=await(this.archive?.acquire()??Promise.resolve<ArchiveMode>('temporary'));if(this.disposed)return;this.readArchiveState(mode);
 }
 private readArchiveState(mode:ArchiveMode):void{
  let model=new RaceModel(Math.random,{events:this.artwork.catalog.rules}),presentation=new PreRacePresentation(),settings:PlayerSettings={...DEFAULT_SETTINGS},activeReduced=false,restored=false;
  this.archiveInvalid=false;
  if(mode==='persistent')try{
   const saved=this.archive!.read();
   if(saved!==null){
    if(typeof saved!=='object'||Array.isArray(saved))throw Error('存档格式损坏');const v=saved as Record<string,unknown>;
    if(v.version!==1||typeof v.activeReducedMotion!=='boolean')throw Error('存档版本不兼容');
    const candidate=RaceModel.restore(v.model,Math.random,{events:this.artwork.catalog.rules}),candidateSettings=readSettings(v.settings),candidatePresentation=new PreRacePresentation();
    candidatePresentation.restore(v.presentation,candidate,v.activeReducedMotion);model=candidate;settings=candidateSettings;presentation=candidatePresentation;activeReduced=v.activeReducedMotion;restored=true;
   }
  }catch{this.archiveInvalid=true;}
  this.game=model;this.settings=settings;this.activeReducedMotion=activeReduced;this.preRace=presentation;this.visualRound=model.round;
  if(!restored)this.preRace.update(0,model,this.activeReducedMotion);
  this.queuedCues=[];this.lastPhase=model.phase;this.savedChangeId=model.changeId;this.checkpointSeconds=0;this.equipmentNeedsSync=true;
  if(this.archiveInvalid)this.openDialog('corrupt');else if(mode==='busy')this.openDialog('busy');else if(restored||this.background)this.openDialog('resume');else{this.dialog='none';if(mode==='persistent')this.writeCheckpoint();}
 }
 private writeCheckpoint(silent=false):boolean{
  if(!this.game||!this.archive)return true;if(this.archiveInvalid||this.archive.mode==='busy'||this.archive.mode==='pending')return false;
  const saved=this.archive.save({version:1,model:this.game.exportSnapshot(),presentation:this.preRace.exportSnapshot(),settings:{...this.settings},activeReducedMotion:this.activeReducedMotion});
  if(saved){this.savedChangeId=this.game.changeId;this.checkpointSeconds=0;}else if(!silent&&!this.disposed)this.openDialog('save-error');return saved;
 }
 private synchronizeAction():void{
  if(this.visualRound!==this.game.round){this.visualRound=this.game.round;this.activeReducedMotion=this.settings.reducedMotion;}
  this.preRace.update(0,this.game,this.activeReducedMotion);this.queuedCues.push(...this.preRace.cues);this.writeCheckpoint();
 }
 private openDialog(kind:SessionDialog):void{
  this.dialog=kind;if(this.eventPanel)this.eventPanel.active=false;if(this.historyPanel)this.historyPanel.active=false;this.betHold.cancel();this.queuedCues=[];this.gameAudio?.stop();this.preAudio?.stop();this.refreshDialog();
 }
 private readonly onHidden=():void=>{this.background=true;this.betHold.cancel();this.queuedCues=[];this.gameAudio?.stop();this.preAudio?.stop();this.writeCheckpoint();};
 private readonly onShown=():void=>{if(!this.background||this.disposed)return;this.background=false;if(this.game&&!['busy','corrupt','save-error'].includes(this.dialog))this.openDialog('resume');};
 private async dialogAction(index:number):Promise<void>{
  if(!this.canInput()||this.background||this.retrying)return;this.preAudio?.unlock();
  if(this.dialog==='resume'||this.dialog==='save-error'){
   if(index===0){if(this.writeCheckpoint()){this.lastPhase=this.game.phase;this.dialog='none';}}else if(index===1&&this.dialog==='save-error'){this.archive?.useTemporary();this.dialog='none';this.lastPhase=this.game.phase;}
  }else if(this.dialog==='history'){if(index===0)this.dialog='none';}
  else if(this.dialog==='settings'){
   if(index<6){const key=(['master','effects','ambience'] as const)[Math.floor(index/2)];this.settings[key]=Math.max(0,Math.min(1,Math.round((this.settings[key]+(index%2?.1:-.1))*10)/10));}
   else if(index===6)this.settings.muted=!this.settings.muted;else if(index===7)this.settings.reducedMotion=!this.settings.reducedMotion;
   this.gameAudio?.apply(this.settings);this.preAudio?.stop();this.writeCheckpoint();
  }
  else if(this.dialog==='busy'){
   if(index===1){this.archive?.useTemporary();this.dialog='none';}
   else if(index===0){this.retrying=true;try{const mode=await this.archive!.acquire();if(this.disposed)return;this.readArchiveState(mode);if(PREVIEW){this.testBridge?.dispose();this.testBridge=new GoldenHorseTestBridge(this.game,()=>this.observe(),()=>this.canOperate());}}finally{this.retrying=false;}}
  }else if(this.dialog==='corrupt'){
   if(index===1){this.archive?.useTemporary();this.archiveInvalid=false;this.dialog='none';}
   else if(index===0&&this.archive?.backupUnreadable()){this.archiveInvalid=false;this.dialog='none';this.writeCheckpoint();}
  }
  this.refreshDialog();
 }
 private refreshDialog():void{
  if(!this.utilityPanel)return;this.utilityPanel.active=this.dialog!=='none';if(this.utilityClose)this.utilityClose.active=['history','settings'].includes(this.dialog);if(this.dialog==='none'||!this.game)return;
  let title='',body='',actions:string[]=[];
  if(this.dialog==='resume'){title='继续第 '+this.game.round+' 场';body=(this.game.phase==='betting'?'押分还剩 '+Math.ceil(this.game.countdown)+' 秒':this.game.phase==='preparing'?'起跑准备还剩 '+Math.ceil(this.game.preparationRemaining)+' 秒':this.game.phase==='racing'?'比赛已进行 '+this.game.raceElapsed.toFixed(1)+' 秒':'本场已结算，返分已计入余额')+'\n\n余额 '+this.game.credits+' 分 · 本场押分 '+this.game.totalStake+' 分\n\n离开期间未推进比赛，点击继续后恢复。';actions=['继续比赛'];}
  else if(this.dialog==='busy'){title='已有游戏窗口打开';body='同一份存档只允许一个窗口运行。\n\n请返回原窗口，或关闭原窗口后重试。\n也可以临时游玩，临时进度不会写入存档。';actions=['重试','临时游玩'];}
  else if(this.dialog==='corrupt'){title='无法读取原存档';body='存档损坏或与当前比赛配置不兼容，原数据尚未覆盖。\n\n“备份并重置”会保留原档副本，重新以500分开始。\n也可选择不写入存档的临时模式。'+(this.archive?.lastError?'\n\n'+this.archive.lastError:'');actions=['备份并重置','临时游玩'];}
  else if(this.dialog==='save-error'){title='当前进度尚未保存';body='已暂停比赛，避免继续产生未保存的结果。\n\n请重试保存，或明确选择临时模式。\n临时模式关闭页面后会丢失本次进度。';actions=['重试并继续','临时游玩'];}
  else if(this.dialog==='history'){title='最近五场';body=this.game.history.length?this.game.history.slice(0,5).map(r=>'第'+r.round+'场  '+r.first+' — '+r.second+'  ×'+r.odds+'\n押'+r.stake+'  返'+r.payout+'  净'+(r.net>=0?'+':'')+r.net).join('\n\n'):'暂无比赛记录';actions=['关闭'];}
  else if(this.dialog==='settings'){title='声音与动态';body='总音量 '+Math.round(this.settings.master*100)+'%\n音效 '+Math.round(this.settings.effects*100)+'% · 环境 '+Math.round(this.settings.ambience*100)+'%\n\n静音：'+(this.settings.muted?'开':'关')+'\n减少动态：'+(this.settings.reducedMotion?'开':'关')+'（下场起生效）\n\n开启后保留跟赛，关闭镜头开合、弹跳、扬尘与环境微动。';actions=['总音量 −','总音量 +','音效 −','音效 +','环境 −','环境 +','静音 '+(this.settings.muted?'开':'关'),'减少动态 '+(this.settings.reducedMotion?'开':'关')];}
  this.utilityTitle!.string=title;this.utilityBody!.string=body;this.utilityActions.forEach((n,i)=>{n.active=Boolean(actions[i]);n.setPosition(actions.length===1?0:i%2?160:-160,-100-Math.floor(i/2)*110);this.utilityActionLabels[i].string=actions[i]??'';});
 }
 private clientRect(node:Node):Record<string,number>{
  const r=document.querySelector('canvas')?.getBoundingClientRect(),ui=node.getComponent(UITransform)!;
  if(!r)return{};const root=this.node.parent!.getComponent(UITransform)!,local=root.convertToNodeSpaceAR(node.worldPosition),v=view.getVisibleSize();
  return{x:r.left+(local.x+v.width/2-ui.width/2)/v.width*r.width,y:r.top+(v.height/2-local.y-ui.height/2)/v.height*r.height,width:ui.width/v.width*r.width,height:ui.height/v.height*r.height};
 }
 private observe():Record<string,unknown>{return{
  revision:'upgrade-settings-v1',menuButtons:this.menuButtons.map(n=>this.clientRect(n)),utilityClose:this.utilityClose?this.clientRect(this.utilityClose):{},utilityTitle:this.utilityTitle?.string,utilityBody:this.utilityBody?.string,paused:this.paused,dialog:this.dialog,background:this.background,archiveMode:this.archive?.mode,activeReducedMotion:this.activeReducedMotion,settings:{...this.settings},gameAudio:this.gameAudio?.observation,utilityActions:this.utilityActions.map(n=>({...this.clientRect(n),active:this.utilityPanel?.active===true&&n.active})),stakeUnit:this.stakeUnit,betHold:this.betHold.observation,quickButtons:this.quickButtons.map(n=>this.clientRect(n)),choreographySeed:this.game.choreographySeed,groundEffects:this.groundEffects?.observation,preRace:this.preRace.observation,preAudio:this.preAudio?.observation,horseVisuals:this.horses.map(h=>h.observation),raceElapsed:this.game.raceElapsed,courseFraction:this.game.courseFraction,strideTimes:this.game.progress.map((_,i)=>this.game.strideTime(i)),leaderHorse:this.game.leaderIndex+1,eventId:this.game.eventId,eventName:this.game.eventName,eligibilityCredits:this.game.eligibilityCredits,preparationRemaining:this.game.preparationRemaining,equipment:this.equipment?.observation,eventPickerVisible:this.eventPanel?.active,eventButton:this.eventButton?this.clientRect(this.eventButton):{},eventChoices:this.eventChoices.map(n=>this.clientRect(n)),eventClose:this.eventClose?this.clientRect(this.eventClose):{},ready:this.canInput(),pendingAssets:this.pendingAssets,loadErrors:[...this.loadErrors],section:trackSection(this.game.courseFraction),
  uiMode:this.StateMachine.is(RacingPage)?'race':this.StateMachine.is(BettingPage)?'betting':'loading',bettingPageVisible:this.bettingPage?.active,raceViewportVisible:this.courseView.viewport.active,
  designResolution:{width:750,height:1334},visibleHeight:this.layoutHeight,raceViewport:this.clientRect(this.raceHost!),
  touchTargets:this.betNodes.map((node,i)=>({key:this.keys[i],...this.clientRect(node)})),buttons:this.buttons.map(node=>({name:node.name,...this.clientRect(node)})),undoMode:this.undo,
  horseFrames:this.artwork.frames.size*8,turnFrames:this.artwork.turnCatalog.horses.length*16,preRaceFrames:this.artwork.preRaceCatalog.parts.reduce((sum,p)=>sum+p.frames.length,0),backgrounds:this.artwork.props.size,sounds:Object.keys(this.sounds).length,
  worldId:this.courseView.world.uuid,worldPaintBuilds:this.courseView.paintBuilds,raceScale:this.courseView.scale,camera:{...this.courseView.camera},finishWorldX:COURSE_FINISH_X,horseNoseOffset:HORSE_NOSE_X,finishDirection:-1,
  depthOrder:this.courseView.horseLayer.children.filter(n=>n.active).map(n=>({name:n.name,y:-n.position.y,index:n.getSiblingIndex()})),
  uiTimer:this.textTimer?.string,uiMessage:this.textMessage?.string,uiCredits:this.textCredits?.string,uiResult:this.resultText?.string,resultPanel:this.resultPanel?.active,startButton:this.startText?.string,
  horsePositions:this.horses.map(h=>({x:h.node.position.x,y:-h.node.position.y})),screenHorsePositions:this.horses.map(h=>this.courseView.project({x:h.node.position.x,y:-h.node.position.y}))
 };}
 private canInput():boolean{return !!this.game&&!this.disposed&&!this.pagePending&&this.pendingAssets===0&&!this.loadErrors.length&&!this.StateMachine.is(LoadingPage);}
 private canOperate():boolean{return this.canInput()&&!this.paused;}
 private canBet():boolean{return this.canOperate()&&this.StateMachine.is(BettingPage)&&this.game.phase==='betting'&&!this.historyPanel?.active&&!this.eventPanel?.active;}
 private bet(key:string,delta:number):boolean{
  if(!this.canBet())return false;this.preAudio?.unlock();const ok=this.game.placeBet(key,delta);
  if(ok&&delta>0){const cell=this.game.getCell(key)!;this.preRace.betFeedback(cell.first,cell.second,this.keys.indexOf(cell.key));}
  if(ok)this.writeCheckpoint();this.sound(ok?delta>0?'bet':'cancel':'error');
  return ok;
 }
 private beginRace():void{if(!this.canOperate())return;this.betHold.cancel();this.preAudio?.unlock();const was=this.game.phase;if(!this.game.startRace())this.sound('error');else{this.synchronizeAction();if(was==='result')this.sound('finish');}this.syncPage();}
 private keyDown(event:EventKeyboard):void{
  if(!this.canOperate())return;this.preAudio?.unlock();const key=event.keyCode as number;if(key===119)this.heldF8=true;else if(key===120&&this.heldF8)this.game.addTestCredits(100);else if(key===123&&this.heldF8)this.game.clearCredits();else if(key===13||key===32)this.beginRace();else if(key===67&&this.canBet()){this.betHold.cancel();this.game.clearBets();this.preRace.clearFeedback();this.writeCheckpoint();}
 }
 private keyUp(event:EventKeyboard):void{if((event.keyCode as number)===119)this.heldF8=false;}
 private sound(name:string):void{if(!this.paused)this.gameAudio?.play(name,this.settings);}
 private syncPage():void{if(this.game&&!this.pendingAssets&&!this.loadErrors.length)this.changePage(this.game.phase==='betting'?BettingPage:RacingPage);}
 update(dt:number):void{
  let advance=this.canOperate();if(advance)this.game.update(dt);this.syncPage();
  if(!this.game){this.refresh();return;}
  if(!this.canBet())this.betHold.cancel();else for(let count=this.betHold.update(dt);count>0;count--)if(!this.bet(this.keys[this.betHold.cell],this.betHold.delta)){this.betHold.cancel();break;}
  advance=advance&&!this.paused;if(advance){
   if(this.visualRound!==this.game.round){this.visualRound=this.game.round;this.activeReducedMotion=this.settings.reducedMotion;}
   this.preRace.update(dt,this.game,this.activeReducedMotion);this.checkpointSeconds+=Math.min(.1,Math.max(0,dt));
   if((this.savedChangeId!==this.game.changeId||this.checkpointSeconds>=.5)&&!this.writeCheckpoint())advance=false;
  }
  this.gameAudio?.apply(this.settings);
  if(advance&&!this.paused){
   if(this.game.phase==='racing'){this.gallopTimer-=dt;if(this.gallopTimer<=0){this.sound('gallop');this.gallopTimer=1.7;}}else this.gallopTimer=0;
   if(this.lastPhase!==this.game.phase){if(this.game.phase==='racing')this.sound('start');if(this.game.phase==='result')this.sound(this.game.lastResult?.payout?'win':'finish');this.lastPhase=this.game.phase;}
   this.preAudio?.update(this.game,[...this.queuedCues,...this.preRace.cues],this.settings);this.queuedCues=[];
  }
  this.courseView.follow(this.game.courseFraction,this.preRace.cameraCue);this.courseView.updateStarter(this.artwork,this.preRace.flagFrame);this.horses.forEach((h,i)=>{
   const stride=this.game.strideTime(i);h.render(horsePose(i,this.game.progress[i],stride),stride,this.game.phase==='racing'||this.game.phase==='result',{...this.preRace.horse(i),reducedMotion:this.activeReducedMotion});
  });
  this.equipment?.setTier(this.game.eventId);
  if(advance&&!this.paused)this.groundEffects?.update(dt,this.game.round,this.game.phase,this.game.progress,this.game.progress.map((_,i)=>this.game.strideTime(i)),this.activeReducedMotion);this.courseView.sortDepth();
  const leader=this.game.leaderIndex;
  if((advance&&!this.paused)||this.equipmentNeedsSync){this.equipment?.update(advance&&!this.paused?dt:0,raceScreen(this.game.phase,this.game.round,this.game.eventName,this.game.preparationRemaining,this.game.lastResult,this.game.resultElapsed,this.artwork.catalog.rules.resultDisplaySeconds),{round:this.game.round,phase:this.game.phase,preparationRemaining:this.game.preparationRemaining,raceElapsed:this.game.raceElapsed,horse:leader+1,point:coursePoint(leader,this.game.progress[leader]),scanPoint:this.preRace.scanPoint});this.equipmentNeedsSync=false;}
  this.refresh();this.betNodes.forEach((node,i)=>{const scale=this.activeReducedMotion?1:this.preRace.cellScale(i);node.setScale(scale,scale,1);});this.testBridge?.sampleFrame();
 }
 private refresh():void{
  if(!this.game||this.pendingAssets||this.loadErrors.length){this.textTimer!.string='素材载入中';this.textMessage!.string=this.loadErrors[0]??'加载 '+(9-this.pendingAssets)+'/9';this.startText!.string='载入中';return;}
  this.textCredits!.string='积分 '+this.game.credits+'   押分 '+this.game.totalStake;
  this.textTimer!.string=this.pendingAssets?'素材载入中':this.game.phase==='betting'?'押分 '+Math.ceil(this.game.countdown)+' 秒':this.game.phase==='preparing'?'起跑准备 '+Math.ceil(this.game.preparationRemaining)+' 秒':this.game.phase==='racing'?'比赛中 · 押分锁定':'本场已结算';
  const urgent=this.game.phase==='betting'&&this.game.countdown<=5;this.textTimer!.color=urgent?new Color(255,116,100):new Color(214,230,217);if(urgent)this.textTimer!.string='即将开跑 '+Math.ceil(this.game.countdown)+' 秒';
  this.textMessage!.string=this.game.message;
  this.archiveStatus!.string='黄倍率·红押分 / '+(this.archive?.mode==='persistent'?(this.archive.lastError?'尚未保存':'本地已保存'):'临时不存档');
  this.oddsHeader!.string='前二组合倍率 / 每次'+this.stakeUnit+'分 · 长按连押';this.quickLabels[0].string='每次 '+this.stakeUnit+' 分\n切换档位';this.quickLabels[1].string='沿用上场\n整套替换';
  this.startText!.string=this.game.phase==='result'?'下一场':this.game.phase==='preparing'?'准备中':this.game.phase==='racing'?'比赛中':'开跑';this.undoText!.string=this.undo?'撤销：开':'撤销：关';
  this.resultPanel!.active=this.game.phase==='result';const result=this.game.lastResult;
  if(result){this.resultText!.string=result.first+' — '+result.second;this.resultOdds!.string='倍率 '+(this.game.getCell(result.pair)?.odds??0)+'    返分 '+result.payout;}
  this.textHistory!.string=this.game.history.length?this.game.history.slice(0,5).map((r,i)=>(i+1)+'    '+r.first+' — '+r.second+'    ×'+(this.game.getCell(r.pair)?.odds??0)).join('\n\n'):'暂无比赛记录';
  this.eventText!.string=this.game.eventName+'\n选择赛事';
  this.eventChoiceLabels.forEach((label,i)=>{const tier=this.artwork.catalog.tiers[i],eligible=this.game.canEnterEvent(tier.id);label.string=tier.name+'  ·  '+tier.equipment.length+' 类设备\n'+(this.game.eventId===tier.id?'当前赛事':eligible?'可参加 · 无费用':'需 '+tier.minCredits+' 积分');label.color=eligible?new Color(255,225,146):new Color(155,160,157);});
  this.keys.forEach((key,i)=>{const c=this.game.getCell(key)!;this.oddsLabels[i].string='×'+c.odds;this.stakeLabels[i].string=c.stake?'押 '+c.stake:'—';this.oddsLabels[i].color=this.game.phase==='betting'?new Color(255,224,92):new Color(193,185,143);this.stakeLabels[i].color=c.stake?new Color(255,109,96):new Color(156,164,145);this.betBorders[i].color=c.stake?new Color(235,99,81):new Color(147,121,67);});
  this.refreshDialog();
 }
 onDestroy():void{
  this.writeCheckpoint(true);this.disposed=true;this.betHold.cancel();this.preRace.clearFeedback();for(const node of this.betNodes)if(node.isValid)node.setScale(1,1,1);this.gameAudio?.dispose();this.preAudio?.dispose();this.archive?.dispose();this.groundEffects?.dispose();this.equipment?.dispose();this.testBridge?.dispose();void this.pageTask.then(()=>this.StateMachine.releaseAllStates());this.artwork.dispose();
  for(const node of [...this.betNodes,...this.buttons,...this.eventChoices,...this.quickButtons,...this.utilityActions,...this.menuButtons,this.utilityClose,this.eventButton,this.eventClose,this.uiRoot])node?.targetOff(this);
  input.off(Input.EventType.KEY_DOWN,this.keyDown,this);input.off(Input.EventType.KEY_UP,this.keyUp,this);view.off('canvas-resize',this.relayout,this);view.off('design-resolution-changed',this.relayout,this);
  engineGame.off(Game.EVENT_HIDE,this.onHidden,this);engineGame.off(Game.EVENT_SHOW,this.onShown,this);if(typeof window!=='undefined'){window.removeEventListener('pagehide',this.onHidden);window.removeEventListener('pageshow',this.onShown);}
 }
}
