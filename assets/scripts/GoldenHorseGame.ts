import { _decorator, Component, Node, Label, Color, Graphics, UITransform,
  Sprite, SpriteFrame, resources, AudioClip, AudioSource, input, Input,
  EventKeyboard, EventMouse, Layers, Texture2D, view, ResolutionPolicy, profiler } from 'cc';
import { PREVIEW } from 'cc/env';
import { StateMachine } from 'db://shidai3/runtime/stateMachine';
import { GoldenHorseTestBridge } from '../tests/GoldenHorseTestBridge';
import { RaceModel } from './RaceModel';
import { RaceTrackView, HorseTurnView } from './RaceTrackView';
import { horsePose, trackSection, COURSE_FINISH_X, HORSE_NOSE_X, HORSE_SPRITE_WIDTH, RACE_VIEWPORT } from './TrackVisual';
import { RacePageContext, LoadingPage, BettingPage, RacingPage } from './presentation/RacePages';
const { ccclass } = _decorator;
const HEX=(v:string)=>new Color().fromHEX(v);

/** Product input/presentation; race state and scoring belong to RaceModel. */
@ccclass('GoldenHorseGame')
export class GoldenHorseGame extends Component implements RacePageContext {
  readonly StateMachine:StateMachine<RacePageContext>=new StateMachine<RacePageContext>(this);
  private readonly game=new RaceModel();
  private bettingPage!:Node;
  private resultPanel!:Node;
  private courseView!:RaceTrackView;
  private textCredits!:Label;private textResult!:Label;private textTimer!:Label;
  private textHistory!:Label;private textMessage!:Label;private resultText!:Label;private resultOdds!:Label;
  private startText!:Label;
  private readonly grid:Array<{key:string;odds:Label;stake:Label;node:Node}>=[];
  private readonly horseNodes:Node[]=[];
  private readonly horseSprites:Sprite[]=[];
  private readonly turnViews:HorseTurnView[]=[];
  private readonly frames:Array<Array<SpriteFrame|null>>=Array.from({length:6},()=>[null,null,null,null]);
  private readonly sounds:Record<string,AudioClip>={};
  private readonly loadErrors:string[]=[];
  private pendingAssets=31;
  private pagePending=false;
  private disposed=false;
  private pageTask:Promise<void>=Promise.resolve();
  private audio!:AudioSource;
  private heldF8=false;
  private lastPhase='betting';
  private gallopTimer=0;
  private testBridge:GoldenHorseTestBridge|null=null;

  onLoad():void{
    view.setDesignResolutionSize(960,720,ResolutionPolicy.SHOW_ALL);profiler.hideStats();
    this.node.getComponent(UITransform)?.setContentSize(960,720);
    this.rect(this.node,'Back',0,0,960,720,'#000000','#000000');
    this.courseView=new RaceTrackView(this.node);
    const racers=this.container(this.courseView.world,'Racers');
    for(let i=0;i<6;i++){
      const n=this.container(racers,'Horse_'+(i+1));const transform=n.getComponent(UITransform)!;
      transform.setContentSize(HORSE_SPRITE_WIDTH,84);transform.setAnchorPoint(.5,0);
      const side=this.container(n,'SideFacing');side.getComponent(UITransform)!.setContentSize(HORSE_SPRITE_WIDTH,84);
      side.getComponent(UITransform)!.setAnchorPoint(.5,0);
      const sprite=side.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;
      this.horseNodes.push(n);this.horseSprites.push(sprite);this.turnViews.push(new HorseTurnView(n,i));
    }
    this.buildBettingPage();
    this.rect(this.node,'Footer',0,-330,960,60,'#000000','#000000');
    this.textResult=this.label(this.node,'Win','WIN 0',-350,-330,25,'#ed42df',220,55);
    this.textCredits=this.label(this.node,'Coins','COINS 500',350,-330,25,'#eeee45',220,55);
    this.textMessage=this.label(this.node,'Message','',0,-330,15,'#ffffff',430,55);
    this.resultPanel=this.container(this.node,'FinishOverlay');
    this.resultText=this.label(this.resultPanel,'WinningPair','',-20,35,110,'#ff2929',660,160);
    this.resultOdds=this.label(this.resultPanel,'WinningOdds','',360,30,54,'#f33d27',180,80);
    this.button(this.resultPanel,'Next',350,-260,'下一场',()=>this.beginRace());
    this.audio=this.node.addComponent(AudioSource);
    input.on(Input.EventType.KEY_DOWN,this.keyDown,this);input.on(Input.EventType.KEY_UP,this.keyUp,this);
    this.changePage(LoadingPage);
    if(PREVIEW)this.testBridge=new GoldenHorseTestBridge(this.game,()=>this.observe());
  }
  showLoading():void{if(this.disposed)return;this.bettingPage.active=true;this.courseView.viewport.active=false;this.resultPanel.active=false;this.loadResources();}
  showBetting():void{if(this.disposed)return;this.bettingPage.active=true;this.courseView.viewport.active=false;this.resultPanel.active=false;}
  showRace():void{if(this.disposed)return;this.bettingPage.active=false;this.courseView.viewport.active=true;}
  private changePage(Page:typeof LoadingPage|typeof BettingPage|typeof RacingPage):void{
    if(this.disposed||this.pagePending||this.StateMachine.is(Page))return;
    this.pagePending=true;
    this.pageTask=this.StateMachine.changeState(Page).catch((error:unknown)=>{
      if(!this.disposed&&this.isValid)this.loadErrors.push(error instanceof Error?error.message:String(error));
    }).finally(()=>{this.pagePending=false;});
  }
  private loadResources():void{
    for(let i=0;i<6;i++)for(let f=0;f<4;f++){
      resources.load(`art/horse_${i+1}_${f}/texture`,Texture2D,(error,texture)=>{
        if(this.disposed||!this.isValid)return;this.pendingAssets--;
        if(error){this.loadErrors.push(error.message);return;}
        const frame=new SpriteFrame();frame.texture=texture;this.frames[i][f]=frame;
      });
    }
    for(const name of ['bet','cancel','start','win','finish','error','gallop']){
      resources.load(`audio/${name}`,AudioClip,(error,clip)=>{
        if(this.disposed||!this.isValid)return;this.pendingAssets--;
        if(error)this.loadErrors.push(error.message);else this.sounds[name]=clip;
      });
    }
  }
  private buildBettingPage():void{
    this.bettingPage=this.container(this.node,'BettingPage');
    const garden=this.rect(this.bettingPage,'Garden',0,290,960,140,'#00b94c','#00b94c');
    const paint=garden.getComponent(Graphics)!;
    for(let x=-420;x<440;x+=100){
      paint.fillColor=HEX('#1647ad');paint.rect(x,-55,52,15);paint.fill();
      paint.fillColor=HEX('#97db35');paint.rect(x-5,-43,50,17);paint.fill();
      paint.fillColor=HEX('#f0e849');paint.rect(x+5,-28,30,10);paint.fill();
    }
    this.label(this.bettingPage,'Title','黄金赛马 86',-250,300,36,'#ffe13d',430,65);
    this.textTimer=this.label(this.bettingPage,'Time','TIME 30',345,285,23,'#ffe43b',220,50);
    this.label(this.bettingPage,'OddsHeader','NEW ODDS',-145,180,29,'#f4ed43',620,45);
    this.rect(this.bettingPage,'HistoryBorder',350,-50,220,440,'#000000','#df292b');
    this.label(this.bettingPage,'HistoryHeader','LAST 5\nRESULTS',350,148,27,'#ef40dc',210,78);
    this.textHistory=this.label(this.bettingPage,'History','',350,-55,27,'#ffffff',210,340);
    for(let b=6;b>=2;b--)this.label(this.bettingPage,'Column'+b,String(b),-360+(6-b)*115,151,31,'#25d9ee',100,44);
    for(let a=1;a<=5;a++){
      this.label(this.bettingPage,'Row'+a,String(a),-446,100-(a-1)*64,31,'#25d9ee',40,60);
      for(let b=6;b>a;b--){
        const key=`${a}-${b}`,x=-360+(6-b)*115,y=100-(a-1)*64;
        const node=this.rect(this.bettingPage,'Bet_'+key,x,y,114,63,'#000000','#233edb');
        const odds=this.label(node,'Odds','',0,10,26,'#f4ef3c',110,35);
        const stake=this.label(node,'Stake','',0,-18,23,'#ff2929',110,30);
        node.on(Node.EventType.TOUCH_END,()=>this.bet(key,1),this);
        node.on(Node.EventType.MOUSE_DOWN,(event:EventMouse)=>{if(event.getButton()===EventMouse.BUTTON_RIGHT)this.bet(key,-1);},this);
        this.grid.push({key,odds,stake,node});
      }
    }
    this.label(this.bettingPage,'Legend','黄色：赔率   红色：押分',-90,-195,19,'#eeee3e',400,40);
    this.label(this.bettingPage,'Notice','左键押分 / 右键撤销\n按 C 清空，Enter 开跑',-40,-253,17,'#dddddd',510,58);
    this.startText=this.button(this.bettingPage,'Start',350,-260,'开跑',()=>this.beginRace());
  }
  private observe():Record<string,unknown>{
    return {
      ready:this.pendingAssets===0&&!this.loadErrors.length&&!this.StateMachine.is(LoadingPage)&&!this.pagePending,
      pendingAssets:this.pendingAssets,loadErrors:[...this.loadErrors],section:trackSection(this.game.courseFraction),
      uiMode:this.StateMachine.is(RacingPage)?'race':this.StateMachine.is(BettingPage)?'betting':'loading',
      bettingPageVisible:this.bettingPage.active,raceViewportVisible:this.courseView.viewport.active,
      raceViewport:{x:0,y:0,width:RACE_VIEWPORT.width,height:RACE_VIEWPORT.height},
      horseFrames:this.frames.flat().filter(Boolean).length,backgrounds:1,sounds:Object.keys(this.sounds).length,
      worldId:this.courseView.world.uuid,worldPaintBuilds:this.courseView.paintBuilds,camera:{...this.courseView.camera},
      finishWorldX:COURSE_FINISH_X,horseNoseOffset:HORSE_NOSE_X,finishDirection:-1,
      uiCredits:this.textCredits.string,uiResult:this.textResult.string,
      resultPanel:this.resultPanel.active,startButton:this.game.phase==='result'?'下一场':this.startText.string,
      horsePositions:this.horseNodes.map(node=>({x:node.position.x,y:-node.position.y})),
      screenHorsePositions:this.horseNodes.map(node=>this.courseView.project({x:node.position.x,y:-node.position.y})),
    };
  }
  private container(parent:Node,name:string):Node{
    const node=new Node(name);node.layer=Layers.Enum.UI_2D;node.parent=parent;node.addComponent(UITransform).setContentSize(960,720);return node;
  }
  private rect(parent:Node,name:string,x:number,y:number,w:number,h:number,fill:string,edge:string):Node{
    const node=this.container(parent,name);node.setPosition(x,y);node.getComponent(UITransform)!.setContentSize(w,h);
    const g=node.addComponent(Graphics);g.fillColor=HEX(fill);g.strokeColor=HEX(edge);g.lineWidth=2;
    g.rect(-w/2,-h/2,w,h);g.fill();g.stroke();return node;
  }
  private label(parent:Node,name:string,text:string,x:number,y:number,size:number,hex:string,w:number,h:number):Label{
    const node=this.container(parent,name);node.setPosition(x,y);node.getComponent(UITransform)!.setContentSize(w,h);
    const label=node.addComponent(Label);label.string=text;label.fontFamily='monospace';label.fontSize=size;label.lineHeight=size+5;
    label.color=HEX(hex);label.horizontalAlign=Label.HorizontalAlign.CENTER;label.verticalAlign=Label.VerticalAlign.CENTER;
    label.overflow=Label.Overflow.SHRINK;return label;
  }
  private button(parent:Node,name:string,x:number,y:number,text:string,fn:()=>void):Label{
    const node=this.rect(parent,name,x,y,170,46,'#101810','#e5df40');
    const label=this.label(node,name+'Label',text,0,0,23,'#eeee4b',165,45);node.on(Node.EventType.TOUCH_END,fn,this);return label;
  }
  private canInput():boolean{return !this.disposed&&!this.pagePending&&this.pendingAssets===0&&!this.loadErrors.length&&!this.StateMachine.is(LoadingPage);}
  private bet(key:string,delta:number):void{
    if(!this.canInput()||!this.StateMachine.is(BettingPage))return;
    this.sound(this.game.placeBet(key,delta)?delta>0?'bet':'cancel':'error');this.refresh();
  }
  private beginRace():void{
    if(!this.canInput())return;const was=this.game.phase;
    this.sound(this.game.startRace()?was==='result'?'finish':'start':'error');this.syncPage();this.refresh();
  }
  private keyDown(event:EventKeyboard):void{
    const key=event.keyCode as number;if(key===119)this.heldF8=true;
    else if(key===120&&this.heldF8)this.game.addTestCredits(100);
    else if(key===123&&this.heldF8)this.game.clearCredits();
    else if(key===13||key===32)this.beginRace();
    else if(key===67&&this.canInput())this.game.clearBets();this.refresh();
  }
  private keyUp(event:EventKeyboard):void{if((event.keyCode as number)===119)this.heldF8=false;}
  private sound(name:string):void{const clip=this.sounds[name];if(clip)this.audio.playOneShot(clip,.5);}
  private syncPage():void{
    if(this.pendingAssets||this.loadErrors.length)return;
    this.changePage(this.game.phase==='betting'?BettingPage:RacingPage);
  }
  update(dt:number):void{
    if(this.canInput())this.game.update(dt);this.syncPage();
    if(this.game.phase==='racing'){
      this.gallopTimer-=dt;if(this.gallopTimer<=0){this.sound('gallop');this.gallopTimer=1.7;}
    }else this.gallopTimer=0;
    if(this.lastPhase!==this.game.phase){if(this.game.phase==='result')this.sound(this.game.lastResult?.payout?'win':'finish');this.lastPhase=this.game.phase;}
    this.courseView.follow(this.game.courseFraction);
    for(let i=0;i<6;i++){
      const pose=horsePose(i,this.game.progress[i],this.game.raceElapsed),node=this.horseNodes[i];
      node.setPosition(pose.x,-pose.y);node.setScale(pose.flipX?-pose.scale:pose.scale,pose.scale,1);
      this.horseSprites[i].color=new Color(255,255,255,Math.round(255*pose.sideOpacity));this.turnViews[i].render(pose,this.game.raceElapsed);
      const frame=this.game.phase==='betting'?0:Math.floor(this.game.raceElapsed*9)%4;
      if(this.frames[i][frame])this.horseSprites[i].spriteFrame=this.frames[i][frame];
    }
    [...this.horseNodes].sort((a,b)=>b.position.y-a.position.y).forEach((node,index)=>node.setSiblingIndex(index));
    this.refresh();this.testBridge?.sampleFrame();
  }
  private refresh():void{
    this.textCredits.string=`COINS ${this.game.credits}`;this.textResult.string=`WIN ${this.game.lastResult?.payout??0}`;
    this.textTimer.string=`TIME ${Math.ceil(this.game.countdown)}`;
    this.textMessage.string=this.loadErrors[0]??(this.pendingAssets?`加载 ${31-this.pendingAssets}/31`:
      this.game.phase==='betting'?`BET ${this.game.totalStake}   Enter 开跑`:this.game.phase==='result'?'Enter 下一场':'');
    this.resultPanel.active=this.game.phase==='result';const result=this.game.lastResult;
    if(result){this.resultText.string=`${result.first}-${result.second}`;this.resultOdds.string=String(this.game.getCell(result.pair)?.odds??0);}
    this.textHistory.string=this.game.history.slice(0,5).map(v=>`${v.pair}  ${this.game.getCell(v.pair)?.odds??0}`).join('\n\n');
    for(const row of this.grid){const cell=this.game.getCell(row.key);if(cell){row.odds.string=String(cell.odds);row.stake.string=cell.stake?String(cell.stake):'';}}
  }
  onDestroy():void{
    this.disposed=true;this.testBridge?.dispose();
    void this.pageTask.then(()=>this.StateMachine.releaseAllStates());
    for(const frame of this.frames.flat())frame?.destroy();
    input.off(Input.EventType.KEY_DOWN,this.keyDown,this);input.off(Input.EventType.KEY_UP,this.keyUp,this);
  }
}
