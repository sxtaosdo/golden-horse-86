const {call,root,temp}=require('./mobile_scene_mcp.cjs'),fs=require('fs'),path=require('path');
const white='9e515fff-f075-4332-ac40-862745b9f862@f9941',colors=[],labels=[];
const key=n=>n;
function node(n,w,h,x=0,y=0,children=[]){return{name:n,size:{width:w,height:h},position:{x,y},children};}
function text(n,string,w,h,x,y,size=26,color='#ffe5a0'){const s=node(n,w,h,x,y);s.type='label';s.label={string,fontSize:size,color:rgba(color)};labels.push([key(n),size]);return s;}
function rgba(hex){return{r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16),a:255};}
function box(n,w,h,x,y,color,children=[]){const s=node(n,w,h,x,y,children);s.type='sprite';s.sprite={spriteFrameUuid:white,sizeMode:'CUSTOM'};colors.push([key(n),color]);return s;}
const bets=[],odds=[],stakes=[];let idx=0;
for(let a=1;a<=5;a++)for(let b=6;b>a;b--){const n='Bet'+idx,ox=-288+(6-b)*144,oy=188-(a-1)*94;
 bets.push(node(n,144,94,ox,oy,[box(n+'Border',138,90,0,0,'#937943'),box(n+'Face',134,86,0,0,'#152a2b'),text(n+'Pair',a+' — '+b,130,24,0,29,20,'#e6c78a'),text(n+'Odds','×12',130,34,0,2,31,'#ffe05c'),text(n+'Stake','—',130,26,0,-29,20,'#fa8c6b')]));odds.push(n+'Odds');stakes.push(n+'Stake');idx++;}
const buttonNames=['Undo','Clear','History','Start'];
const footer=box('Footer',750,104,0,-615,'#0c191d',buttonNames.map((n,i)=>node(n,174,94,-270+i*180,0,[box(n+'Border',170,90,0,0,'#8f7845'),box(n+'Face',166,86,0,0,n==='Start'?'#8b5927':'#203137'),text(n+'ButtonText',['撤销：关','清空','历史','开跑'][i],162,84,0,0,27)])));
const tree=node('Root',750,1334,0,0,[
 node('RaceHost',750,696,0,319,[node('Hud',750,90,0,303,[box('HudBack',750,90,0,0,'#132b30'),text('Title','霓虹荒野 · 黄金赛马',710,40,0,19,30),text('Timer','押分 30 秒',710,35,0,-21,23,'#d6e6d9')]),box('Result',610,190,0,0,'#102229',[text('ResultHeading','驿站杯 · 冠亚军',570,36,0,65,25),text('ResultText','1 — 6',570,84,0,5,62,'#ffcc67'),text('ResultOdds','倍率 12   返分 0',570,36,0,-64,25)]),box('HistoryPanel',610,420,0,-10,'#102229',[text('HistoryHeading','最近五场 · 再点历史收起',580,40,0,170,27),text('HistoryText','暂无记录',570,300,0,-20,28)])]),
 box('BetPanel',750,534,0,-296,'#0c191d',[text('OddsHeader','前二组合倍率  /  点击押 1 分',710,30,0,250,23),...bets,text('Credits','积分 500   押分 0',370,46,145,-112,27),text('Message','驿站杯 · 前二组合',370,40,145,-162,23,'#9cb8ad'),text('Legend','黄色倍率 · 橙色押分',370,32,145,-206,21,'#9cb8ad')]),footer]);
let snapshot=call('scene_get_tree',{});
const built=call('ui_build_tree',{parent:{name:'GoldenHorseGame'},expectedRevision:snapshot.revision,tree,verify:true,save:true});console.log('UI built',built.revision);
snapshot=call('scene_get_tree',{});
const ops=[];
for(const [target,color] of colors)ops.push({op:'setProperty',target:'name:'+target,component:'cc.Sprite',property:'color',value:{$type:'Color',...rgba(color)}});
for(const [target,size] of labels)ops.push({op:'upsertComponent',target:'name:'+target,type:'cc.Label',properties:{horizontalAlign:1,verticalAlign:1,fontFamily:'Arial',lineHeight:size+2,overflow:2}});
const ref=n=>({$type:'NodeReference',semanticKey:'name:'+key(n)}),label=n=>({$type:'ComponentReference',node:'name:'+key(n),type:'cc.Label'});
const properties={uiRoot:ref('Root'),raceHost:ref('RaceHost'),bettingPage:ref('BetPanel'),footer:ref('Footer'),hud:ref('Hud'),resultPanel:ref('Result'),historyPanel:ref('HistoryPanel'),betNodes:bets.map(s=>ref(s.name)),buttons:buttonNames.map(ref),oddsLabels:odds.map(label),stakeLabels:stakes.map(label),textCredits:label('Credits'),textTimer:label('Timer'),textMessage:label('Message'),textHistory:label('HistoryText'),resultText:label('ResultText'),resultOdds:label('ResultOdds'),startText:label('StartButtonText'),undoText:label('UndoButtonText')};
ops.push({op:'upsertComponent',target:'GoldenHorseGame',type:'GoldenHorseGame',properties});
ops.push({op:'upsertComponent',target:'Canvas',type:'cc.UITransform',properties:{contentSize:{$type:'Size',width:750,height:1334}}});
ops.push({op:'setProperty',target:'name:'+key('HistoryPanel'),component:'cc.Node',property:'active',value:false},{op:'setProperty',target:'name:'+key('Result'),component:'cc.Node',property:'active',value:false});
const result=call('scene_apply_patch',{expectedRevision:snapshot.revision,operations:ops,verify:true,save:true});
fs.writeFileSync(path.join(temp,'mobile-scene-result.json'),JSON.stringify(result,null,2));console.log('Saved portrait UI and component references');
