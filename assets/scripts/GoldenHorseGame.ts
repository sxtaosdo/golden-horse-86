import { _decorator, Component, Node, Label, Color, Graphics, UITransform,
  Sprite, SpriteFrame, resources, AudioClip, AudioSource, input, Input,
  EventKeyboard, EventMouse, Layers, Texture2D, view, ResolutionPolicy, profiler } from 'cc';
import { PREVIEW } from 'cc/env';
import { GoldenHorseTestBridge } from '../tests/GoldenHorseTestBridge';
import { RaceModel } from './RaceModel';
import { RaceTrackView, HorseTurnView } from './RaceTrackView';
import { horsePose, trackSection, trackSectionName, TrackSection, COURSE_FINISH_X, HORSE_NOSE_X } from './TrackVisual';
const { ccclass } = _decorator;
const HEX = (v: string) => new Color().fromHEX(v);

/** Attach to a Canvas in a 960x720 2D scene. Everything else builds at runtime. */
@ccclass('GoldenHorseGame')
export class GoldenHorseGame extends Component {
  private game = new RaceModel();
  private textCredits!: Label; private textTimer!: Label; private textMessage!: Label;
  private textRace!: Label; private textHistory!: Label; private textResult!: Label;
  private grid: Array<{ key: string; label: Label; node: Node }> = [];
  private horseNodes: Node[] = [];
  private horseSprites: Sprite[] = [];
  private frames: Array<Array<SpriteFrame | null>> = Array.from({ length: 6 }, () => [null,null,null,null]);
  private sounds: Record<string, AudioClip> = {};
  private audio!: AudioSource;
  private frameCounter = 0;
  private gallopTimer = 0;
  private lastPhase = 'betting';
  private heldF8 = false;
  private activeSection:TrackSection='straight';
  private textSection!:Label;
  private finishLabel!:Label;
  private pendingAssets = 31;
  private readonly loadErrors: string[] = [];
  private testBridge: GoldenHorseTestBridge | null = null;
  private courseView!:RaceTrackView;
  private readonly turnViews:HorseTurnView[]=[];
  private resultPanel!:Node;
  private resultText!:Label;
  private startText!:Label;

  onLoad(): void {
    view.setDesignResolutionSize(960,720,ResolutionPolicy.SHOW_ALL);
    profiler.hideStats();
    this.node.getComponent(UITransform)?.setContentSize(960, 720);
    this.makeRect('Back',0,0,960,720,'#060818','#060818');
    const header=this.makeRect('Header',0,323,954,68,'#0d0d2d','#7f2dcc');
    this.makeLabel(header,'Title','黄金赛马 86   GOLDEN HORSE',0,12,32,'#f9cc25',700);
    this.textRace=this.makeLabel(header,'Race','第 1 场',-369,-18,18,'#31d6ff');
    this.textTimer=this.makeLabel(header,'Time','TIME 30',350,-18,20,'#f95148');
    this.makeRect('TrackBorder',0,109,960,338,'#ae8953','#7a4b43');
    this.courseView=new RaceTrackView(this.node);
    this.textSection=this.makeLabel(this.node,'CourseSection','',-363,245,16,'#d0edb0');
    this.finishLabel=this.makeLabel(this.node,'FinishLine','',386,227,16,'#fffbce');
    const racers=new Node('Racers');racers.layer=Layers.Enum.UI_2D;racers.parent=this.courseView.world;
    racers.addComponent(UITransform).setContentSize(960,720);
    for(let i=0;i<6;i++){
      const n=new Node(`Horse_${i+1}`);n.layer=Layers.Enum.UI_2D;n.parent=racers;
      n.getComponent(UITransform) ?? n.addComponent(UITransform);
      n.getComponent(UITransform)!.setContentSize(134,84);
      n.getComponent(UITransform)!.setAnchorPoint(.5,0);
      const side=new Node('SideFacing');side.parent=n;side.layer=Layers.Enum.UI_2D;
      const sideTransform=side.addComponent(UITransform);sideTransform.setContentSize(134,84);sideTransform.setAnchorPoint(.5,0);
      const s=side.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;
      this.horseNodes.push(n);this.horseSprites.push(s);
      this.turnViews.push(new HorseTurnView(n,i));
      for(let f=0;f<4;f++){
        const ii=i,ff=f;
        this.loadFrame(`art/horse_${i+1}_${f}`,(err,asset)=>{
          if(!err && asset) {this.frames[ii][ff]=asset; if(ff===0) s.spriteFrame=asset;}
        });
      }
    }
    this.makeRect('Controls',0,-219,956,271,'#0d1028','#4886ae');
    this.makeLabel(this.node,'BetGuide','冠亚军组合（不分先后） 左键加分 / 右键撤销',-95,-103,16,'#29e7e5');
    this.makeLabel(this.node,'OddsNotice','赔率暂定',378,-103,14,'#e8ab59');
    for (let idx=0;idx<this.game.cells.length;idx++) {
      const cell=this.game.cells[idx];const row=Math.floor(idx/5),col=idx%5;
      const x=-372+186*col, y=-158-61*row;
      const node=this.makeRect(`Bet_${cell.key}`,x,y,173,52,'#1b1c43','#367fb5');
      const label=this.makeLabel(node,`CellLabel_${cell.key}`,`${cell.key} ×${cell.odds}\n押 0`,0,0,17,'#ffe54e');
      node.on(Node.EventType.TOUCH_END,()=>this.bet(cell.key,1),this);
      node.on(Node.EventType.MOUSE_DOWN,(e:EventMouse)=>{
        if(e.getButton()===EventMouse.BUTTON_RIGHT) this.bet(cell.key,-1);
      },this);
      this.grid.push({key:cell.key,label,node});
    }
    this.makeRect('Footer',0,-335,956,45,'#07101c','#384b73');
    this.textCredits=this.makeLabel(this.node,'Credit','CREDIT 500',-355,-335,18,'#16efba');
    this.textResult=this.makeLabel(this.node,'Result','BET 0   WIN 0',-110,-335,17,'#e7d928');
    this.textHistory=this.makeLabel(this.node,'History','',75,262,14,'#eae854');
    this.makeButton('Clear',312,-335,105,36,'清空',()=>{this.game.clearBets();this.sound('cancel');});
    this.startText=this.makeButton('Start',424,-335,100,36,'开始',()=>this.beginRace(), '#246531');
    this.textMessage=this.makeLabel(this.node,'Message','',-80,-74,16,'#fff3be');
    this.resultPanel=this.makeRect('ResultPanel',0,-210,680,198,'#10152e','#f9cc25');
    this.resultText=this.makeLabel(this.resultPanel,'ResultSummary','',0,0,22,'#fff3be');
    this.resultText.node.getComponent(UITransform)!.setContentSize(654,180);
    this.resultPanel.active=false;
    this.audio=this.node.addComponent(AudioSource);
    for (const name of ['bet','cancel','start','win','finish','error','gallop']) {
      resources.load(`audio/${name}`,AudioClip,(err,clip)=>{
        this.pendingAssets--; if(err)this.loadErrors.push(`audio/${name}: ${err.message}`);
        else if(clip)this.sounds[name]=clip;
      });
    }
    input.on(Input.EventType.KEY_DOWN,this.keyDown,this);
    input.on(Input.EventType.KEY_UP,this.keyUp,this);
    this.refresh();
    if(PREVIEW) this.testBridge=new GoldenHorseTestBridge(this.game,()=>({
      ready:this.pendingAssets===0 && this.loadErrors.length===0,
      pendingAssets:this.pendingAssets,loadErrors:[...this.loadErrors],
      section:this.activeSection,horseFrames:this.frames.flat().filter(Boolean).length,
      backgrounds:1,sounds:Object.keys(this.sounds).length,
      worldId:this.courseView.world.uuid,worldPaintBuilds:this.courseView.paintBuilds,camera:{...this.courseView.camera},
      finishWorldX:COURSE_FINISH_X,horseNoseOffset:HORSE_NOSE_X,
      uiCredits:this.textCredits.string,uiResult:this.textResult.string,
      resultPanel:this.resultPanel.active,startButton:this.startText.string,
      horsePositions:this.horseNodes.map(node=>({x:node.position.x,y:-node.position.y})),
      screenHorsePositions:this.horseNodes.map(node=>this.courseView.project({x:node.position.x,y:-node.position.y})),
    }));
  }
  onDestroy():void{
    this.testBridge?.dispose();
    for(const frame of this.frames.flat())frame?.destroy();
    input.off(Input.EventType.KEY_DOWN,this.keyDown,this);
    input.off(Input.EventType.KEY_UP,this.keyUp,this);
  }
  private loadFrame(path:string,done:(error:Error|null,frame:SpriteFrame|null)=>void):void{
    resources.load(`${path}/texture`,Texture2D,(error,texture)=>{
      if(!this.isValid)return;
      this.pendingAssets--;
      if(error){this.loadErrors.push(`${path}: ${error.message}`);done(error,null);return;}
      const frame=new SpriteFrame();frame.texture=texture;done(null,frame);
    });
  }
  private makeRect(name:string,x:number,y:number,w:number,h:number,fill:string,edge:string):Node{
    const node=new Node(name);node.layer=Layers.Enum.UI_2D;node.parent=this.node;node.setPosition(x,y,0);
    node.addComponent(UITransform).setContentSize(w,h);
    const g=node.addComponent(Graphics);g.fillColor=HEX(fill);g.strokeColor=HEX(edge);g.lineWidth=2;
    g.rect(-w/2,-h/2,w,h);g.fill();g.stroke();return node;
  }
  private makeLabel(parent:Node,name:string,content:string,x:number,y:number,size:number,hex:string,_weight=400):Label{
    const node=new Node(name);node.layer=Layers.Enum.UI_2D;node.parent=parent;node.setPosition(x,y,0);
    node.addComponent(UITransform).setContentSize(Math.min(960,Math.max(40,parent.getComponent(UITransform)?.width||360)),Math.max(45,size*2.9));
    const label=node.addComponent(Label);label.string=content;label.fontSize=size;
    label.lineHeight=size+4;label.color=HEX(hex);label.horizontalAlign=Label.HorizontalAlign.CENTER;
    label.verticalAlign=Label.VerticalAlign.CENTER;label.overflow=Label.Overflow.SHRINK;
    return label;
  }
  private createImage(name:string,x:number,y:number,w:number,h:number,path:string,parent:Node,index?:number):void{
    const node=new Node(name);node.layer=Layers.Enum.UI_2D;node.parent=parent;node.setPosition(x,y,0);
    node.addComponent(UITransform).setContentSize(w,h);
    const spr=node.addComponent(Sprite);spr.sizeMode=Sprite.SizeMode.CUSTOM;
    if(index!==undefined) node.setSiblingIndex(index);
    resources.load(`${path}/spriteFrame`,SpriteFrame,(err,asset)=>{if(!err && asset)spr.spriteFrame=asset;});
  }
  private makeButton(name:string,x:number,y:number,w:number,h:number,text:string,fn:()=>void,color='#284a75'):Label{
    const node=this.makeRect(name,x,y,w,h,color,'#79b9ef');
    const label=this.makeLabel(node,name+'Label',text,0,0,19,'#ffffff');
    node.on(Node.EventType.TOUCH_END,fn,this);
    return label;
  }
  private bet(key:string,delta:number):void{
    if(this.pendingAssets>0 || this.loadErrors.length)return;
    if(this.game.placeBet(key,delta))this.sound(delta>0?'bet':'cancel');
    else this.sound('error');this.refresh();
  }
  private beginRace():void{
    if(this.pendingAssets>0 || this.loadErrors.length)return;
    const prev=this.game.phase;
    if(this.game.startRace()){this.sound(prev==='result'?'finish':'start');}
    else this.sound('error');this.refresh();
  }
  private keyDown(e:EventKeyboard):void{
    const k=e.keyCode as number;
    if(k===119) this.heldF8=true;
    else if(k===120 && this.heldF8){this.game.addTestCredits(100);this.sound('bet');}
    else if(k===123 && this.heldF8)this.game.clearCredits();
    else if(k===13 || k===32)this.beginRace();
    else if(k===67){this.game.clearBets();this.sound('cancel');}
    this.refresh();
  }
  private keyUp(e:EventKeyboard):void{if((e.keyCode as number)===119)this.heldF8=false;}
  private sound(name:string):void{const clip=this.sounds[name];if(this.audio && clip)this.audio.playOneShot(clip,.5);}
  update(dt:number):void{
    if(this.pendingAssets===0 && !this.loadErrors.length)this.game.update(dt);
    this.frameCounter+=dt;
    if(this.game.phase==='racing') {
      this.gallopTimer -= dt;
      if(this.gallopTimer<=0) {this.sound('gallop');this.gallopTimer=1.7;}
    } else this.gallopTimer=0;
    if(this.lastPhase !== this.game.phase){
      if(this.game.phase==='result')this.sound(this.game.lastResult?.payout?'win':'finish');
      this.lastPhase=this.game.phase;
    }
    const section:TrackSection=this.game.phase==='racing'
      ?trackSection(this.game.courseFraction):this.game.phase==='result'?'finish':'straight';
    if(this.activeSection!==section){
      this.activeSection=section;
    }
    this.textSection.string=this.game.phase==='racing'?trackSectionName(section):'';
    this.finishLabel.string='';
    this.courseView.follow(this.game.courseFraction);
    for(let i=0;i<6;i++) {
      const progress=this.game.phase==='betting'?0:this.game.progress[i];
      const pose=horsePose(i,progress,this.game.raceElapsed);
      this.horseNodes[i].setPosition(pose.x,-pose.y,0);
      this.horseNodes[i].setScale(pose.flipX?-pose.scale:pose.scale,pose.scale,1);
      this.horseNodes[i].angle=-pose.angle;
      this.horseSprites[i].color=new Color(255,255,255,Math.round(255*pose.sideOpacity));
      this.turnViews[i].render(pose,this.game.raceElapsed);
      const frame=this.game.phase!=='betting'?Math.floor(this.game.raceElapsed*9)%4:0;
      if(this.frames[i][frame])this.horseSprites[i].spriteFrame=this.frames[i][frame]!;
    }
    [...this.horseNodes].sort((a,b)=>b.position.y-a.position.y).forEach((node,index)=>node.setSiblingIndex(index));
    this.refresh();
    this.testBridge?.sampleFrame();
  }
  private refresh():void{
    this.textCredits.string=`CREDIT ${this.game.credits}`;
    this.textTimer.string=this.game.phase==='betting'?`TIME ${Math.ceil(this.game.countdown)}`:this.game.phase==='racing'?'RACING':'RESULT';
    this.textRace.string=`第 ${this.game.round} 场`;
    this.textResult.string=`BET ${this.game.totalStake}   WIN ${this.game.lastResult?.payout ?? 0}`;
    this.startText.string=this.game.phase==='result'?'下一场':this.game.phase==='racing'?'比赛中':'开始';
    this.resultPanel.active=this.game.phase==='result';
    const result=this.game.lastResult;
    if(result)this.resultText.string=`比赛结束   冠军 ${result.first}  亚军 ${result.second}\n`+
      `完整名次：${result.order.join(' → ')}\n组合 ${result.pair}   本局押分 ${result.stake}   返分 +${result.payout}\n按 Enter 或点击「下一场」继续`;
    this.textMessage.string=this.loadErrors.length?`资源加载失败：${this.loadErrors[0]}`:
      this.pendingAssets>0?`正在加载资源 ${31-this.pendingAssets}/31`:this.game.message;
    this.textHistory.string=this.game.history.slice(0,5).map(v=>`${v.first}-${v.second}`).join('  ');
    for (const row of this.grid){
      const c=this.game.getCell(row.key)!;
      row.label.string=`${c.key} ×${c.odds}\n押 ${c.stake}`;
      row.label.color=HEX(this.game.phase==='result'&&result?.pair===c.key?'#ffffff':c.stake?'#21ff72':'#ffe94e');
    }
  }
}

