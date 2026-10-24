// Incremental, project-bound Creator authoring. Does not rewrite the existing UI.
const {call,temp}=require('./mobile_scene_mcp.cjs'),fs=require('fs'),path=require('path');
const white='9e515fff-f075-4332-ac40-862745b9f862@f9941',colors=[],labels=[];
const rgba=hex=>({r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16),a:255});
const node=(name,w,h,x=0,y=0,children=[])=>({name,size:{width:w,height:h},position:{x,y},children});
function text(name,string,w,h,x,y,size){labels.push([name,size]);return {...node(name,w,h,x,y),type:'label',label:{string,fontSize:size,color:rgba('#ffe192')}};}
function box(name,w,h,x,y,color,children=[]){colors.push([name,color]);return {...node(name,w,h,x,y,children),type:'sprite',sprite:{spriteFrameUuid:white,sizeMode:'CUSTOM'}};}
if(process.argv[2]==='finish'){
 const ops=[{op:'upsertComponent',target:'name:ResultText',type:'cc.Label',properties:{fontSize:42,lineHeight:46}},{op:'upsertComponent',target:'name:ResultOdds',type:'cc.UITransform',properties:{contentSize:{$type:'Size',width:570,height:62}}},{op:'upsertComponent',target:'name:ResultOdds',type:'cc.Label',properties:{fontSize:24,lineHeight:28}},{op:'setProperty',target:'name:ResultOdds',component:'cc.Node',property:'position',value:{$type:'Vec3',x:0,y:-60,z:0}}];
 const out=call('scene_apply_patch',{expectedRevision:call('scene_get_tree',{}).revision,operations:ops,verify:true,save:true});console.log('Saved full result',out.after?.revision);process.exit(0);
}
if(process.argv[2]==='help'){
 const ref=name=>({$type:'NodeReference',semanticKey:'name:'+name});
 call('ui_build_tree',{parent:{name:'BetPanel'},expectedRevision:call('scene_get_tree',{}).revision,verify:true,save:true,tree:box('HelpButton',144,94,288,-94,'#203137',[text('HelpButtonText','帮助',138,88,0,0,25)])});
 const ops=[{op:'setProperty',target:'name:HelpButton',component:'cc.Sprite',property:'color',value:{$type:'Color',...rgba('#203137')}},{op:'upsertComponent',target:'name:HelpButtonText',type:'cc.Label',properties:{horizontalAlign:1,verticalAlign:1,lineHeight:28,overflow:2}},{op:'upsertComponent',target:'GoldenHorseGame',type:'GoldenHorseGame',properties:{menuButtons:[ref('SettingsButton'),ref('HelpButton')]}}];
 const out=call('scene_apply_patch',{expectedRevision:call('scene_get_tree',{}).revision,operations:ops,verify:true,save:true});console.log('Saved help controls',out.after?.revision);process.exit(0);
}
if(process.argv[2]==='settings'){
 const snapshot=call('scene_get_tree',{}),has=(nodes,name)=>nodes.some(n=>n.name===name||has(n.children,name));if(has(snapshot.roots,'SettingsButton'))throw Error('Settings already exists');
 call('ui_build_tree',{parent:{name:'BetPanel'},expectedRevision:snapshot.revision,verify:true,save:true,tree:box('SettingsButton',144,94,144,-94,'#203137',[text('SettingsButtonText','设置',138,88,0,0,25)])});
 call('ui_build_tree',{parent:{name:'UtilityCard'},expectedRevision:call('scene_get_tree',{}).revision,verify:true,save:true,tree:box('UtilityClose',100,94,265,430,'#315054',[text('UtilityCloseText','关闭',94,66,0,0,24)])});
 const ref=name=>({$type:'NodeReference',semanticKey:'name:'+name}),ops=[];
 for(const [name,color] of colors)ops.push({op:'setProperty',target:'name:'+name,component:'cc.Sprite',property:'color',value:{$type:'Color',...rgba(color)}});
 for(const [name,size] of labels)ops.push({op:'upsertComponent',target:'name:'+name,type:'cc.Label',properties:{horizontalAlign:1,verticalAlign:1,fontFamily:'Arial',lineHeight:size+3,overflow:2}});
 ops.push({op:'upsertComponent',target:'name:UtilityTitle',type:'cc.UITransform',properties:{contentSize:{$type:'Size',width:490,height:70}}},{op:'setProperty',target:'name:UtilityTitle',component:'cc.Node',property:'position',value:{$type:'Vec3',x:-55,y:430,z:0}},{op:'upsertComponent',target:'GoldenHorseGame',type:'GoldenHorseGame',properties:{utilityClose:ref('UtilityClose'),menuButtons:[ref('SettingsButton')]}});
 const out=call('scene_apply_patch',{expectedRevision:call('scene_get_tree',{}).revision,operations:ops,verify:true,save:true});console.log('Saved settings controls',out.after?.revision);process.exit(0);
}
if(process.argv[2]==='session'){
 const snapshot=call('scene_get_tree',{}),has=(nodes,name)=>nodes.some(n=>n.name===name||has(n.children,name));if(has(snapshot.roots,'UtilityPanel'))throw Error('Session panel already exists');
 const actions=Array.from({length:8},(_,i)=>box('UtilityAction'+i,294,94,i%2?160:-160,-100-Math.floor(i/2)*110,'#315054',[text('UtilityActionText'+i,'继续',282,86,0,0,25)]));
 call('ui_build_tree',{parent:{name:'Root'},expectedRevision:snapshot.revision,verify:true,save:true,tree:box('UtilityPanel',750,2400,0,0,'#071317',[box('UtilityCard',680,1000,0,0,'#183537',[text('UtilityTitle','比赛已暂停',620,70,0,430,32),text('UtilityBody','点击继续比赛',620,400,0,175,26),...actions])])});
 const ref=name=>({$type:'NodeReference',semanticKey:'name:'+name}),label=name=>({$type:'ComponentReference',node:'name:'+name,type:'cc.Label'}),ops=[];
 for(const [name,color] of colors)ops.push({op:'setProperty',target:'name:'+name,component:'cc.Sprite',property:'color',value:{$type:'Color',...rgba(color),...(name==='UtilityPanel'?{a:235}:{})}});
 for(const [name,size] of labels)ops.push({op:'upsertComponent',target:'name:'+name,type:'cc.Label',properties:{horizontalAlign:1,verticalAlign:1,fontFamily:'Arial',lineHeight:size+5,overflow:2}});
 ops.push({op:'upsertComponent',target:'name:UtilityPanel',type:'cc.BlockInputEvents',properties:{}},{op:'setProperty',target:'name:UtilityPanel',component:'cc.Node',property:'active',value:false});
 ops.push({op:'upsertComponent',target:'GoldenHorseGame',type:'GoldenHorseGame',properties:{utilityPanel:ref('UtilityPanel'),utilityTitle:label('UtilityTitle'),utilityBody:label('UtilityBody'),utilityActions:actions.map(n=>ref(n.name)),utilityActionLabels:actions.map(n=>label(n.name.replace('UtilityAction','UtilityActionText'))),archiveStatus:label('Legend')}});
 const out=call('scene_apply_patch',{expectedRevision:call('scene_get_tree',{}).revision,operations:ops,verify:true,save:true});fs.writeFileSync(path.join(temp,'session-ui-result.json'),JSON.stringify(out,null,2));console.log('Saved session panel',out.after?.revision);process.exit(0);
}
if(process.argv[2]==='emphasis'){
 const sprite=name=>({$type:'ComponentReference',node:'name:'+name,type:'cc.Sprite'});
 const out=call('scene_apply_patch',{expectedRevision:call('scene_get_tree',{}).revision,operations:[{op:'upsertComponent',target:'GoldenHorseGame',type:'GoldenHorseGame',properties:{betBorders:Array.from({length:15},(_,i)=>sprite('Bet'+i+'Border'))}},{op:'upsertComponent',target:'name:Legend',type:'cc.Label',properties:{string:'黄色赔率 · 红色押分'}}],verify:true,save:true});console.log('Saved bet emphasis',out.after?.revision);process.exit(0);
}
if(process.argv[2]==='quick'){
 const current=call('scene_get_tree',{}),has=(nodes,name)=>nodes.some(n=>n.name===name||has(n.children,name));if(has(current.roots,'StakeUnit'))throw Error('Quick controls already exist');
 const quick=[box('StakeUnit',144,94,288,94,'#203137',[text('StakeUnitText','每次 1 分\n切换档位',138,88,0,0,23)]),box('RepeatBets',144,94,0,-94,'#203137',[text('RepeatBetsText','沿用上场\n整套替换',138,88,0,0,23)])];
 call('ui_build_tree',{parent:{name:'BetPanel'},expectedRevision:current.revision,verify:true,save:true,tree:node('QuickControls',750,534,0,0,quick)});
 const ref=name=>({$type:'NodeReference',semanticKey:'name:'+name}),label=name=>({$type:'ComponentReference',node:'name:'+name,type:'cc.Label'}),ops=[];
 for(const [name,color] of colors)ops.push({op:'setProperty',target:'name:'+name,component:'cc.Sprite',property:'color',value:{$type:'Color',...rgba(color)}});
 for(const [name,size] of labels)ops.push({op:'upsertComponent',target:'name:'+name,type:'cc.Label',properties:{horizontalAlign:1,verticalAlign:1,fontFamily:'Arial',lineHeight:size+3,overflow:2}});
 for(const [name,x,y] of [['EventButton',230,0],['Credits',145,-164],['Message',145,-207],['Legend',145,-245]])ops.push({op:'setProperty',target:'name:'+name,component:'cc.Node',property:'position',value:{$type:'Vec3',x,y,z:0}});
 for(const [name,height,fontSize] of [['Credits',40,26],['Message',32,21],['Legend',24,20]]){ops.push({op:'upsertComponent',target:'name:'+name,type:'cc.UITransform',properties:{contentSize:{$type:'Size',width:370,height}}});ops.push({op:'upsertComponent',target:'name:'+name,type:'cc.Label',properties:{fontSize,lineHeight:fontSize+2}});}
 ops.push({op:'upsertComponent',target:'GoldenHorseGame',type:'GoldenHorseGame',properties:{quickButtons:[ref('StakeUnit'),ref('RepeatBets')],quickLabels:[label('StakeUnitText'),label('RepeatBetsText')],oddsHeader:label('OddsHeader')}});
 const out=call('scene_apply_patch',{expectedRevision:call('scene_get_tree',{}).revision,operations:ops,verify:true,save:true});fs.writeFileSync(path.join(temp,'quick-ui-result.json'),JSON.stringify(out,null,2));console.log('Saved quick bet controls',out.revision);process.exit(0);
}
const snapshot=call('scene_get_tree',{});
const find=(nodes,name)=>nodes.some(n=>n.name===name||find(n.children,name));
if(find(snapshot.roots,'EventButton'))throw Error('Event UI already exists; edit the existing nodes instead of duplicating them');
call('ui_build_tree',{parent:{name:'BetPanel'},expectedRevision:snapshot.revision,verify:true,save:true,tree:
 box('EventButton',230,94,230,16,'#8f7845',[box('EventButtonFace',224,88,0,0,'#203137',[text('EventButtonText','驿站赛\n选择赛事',220,82,0,0,27)])])});
call('ui_build_tree',{parent:{name:'Root'},expectedRevision:call('scene_get_tree',{}).revision,verify:true,save:true,tree:
 box('EventPanel',750,2200,0,0,'#071317',[box('EventCard',650,570,0,0,'#193438',[
  text('EventHeading','选择本场赛事',450,54,-40,225,32),
  box('EventClose',98,94,260,225,'#76552c',[text('EventCloseText','关闭',94,88,0,0,26)]),
  ...['驿站赛','地区赛','冠军赛'].map((name,i)=>box('EventChoice'+i,570,112,0,115-i*130,'#294548',[text('EventChoiceText'+i,name,550,104,0,0,28)])),
  text('EventHint','积分仅决定场地设备 · 参加不扣费',600,42,0,-240,23)
 ])])});
const ops=[];
for(const [name,color] of colors)ops.push({op:'setProperty',target:'name:'+name,component:'cc.Sprite',property:'color',value:{$type:'Color',...rgba(color),...(name==='EventPanel'?{a:220}:{})}});
for(const [name,size] of labels)ops.push({op:'upsertComponent',target:'name:'+name,type:'cc.Label',properties:{horizontalAlign:1,verticalAlign:1,fontFamily:'Arial',lineHeight:size+5,overflow:2}});
const ref=name=>({$type:'NodeReference',semanticKey:'name:'+name}),label=name=>({$type:'ComponentReference',node:'name:'+name,type:'cc.Label'});
ops.push({op:'upsertComponent',target:'name:EventPanel',type:'cc.BlockInputEvents',properties:{}});
ops.push({op:'setProperty',target:'name:EventPanel',component:'cc.Node',property:'active',value:false});
ops.push({op:'upsertComponent',target:'GoldenHorseGame',type:'GoldenHorseGame',properties:{eventButton:ref('EventButton'),eventPanel:ref('EventPanel'),eventClose:ref('EventClose'),eventText:label('EventButtonText'),eventChoices:[0,1,2].map(i=>ref('EventChoice'+i)),eventChoiceLabels:[0,1,2].map(i=>label('EventChoiceText'+i))}});
const result=call('scene_apply_patch',{expectedRevision:call('scene_get_tree',{}).revision,operations:ops,verify:true,save:true});
fs.writeFileSync(path.join(temp,'event-ui-result.json'),JSON.stringify(result,null,2));console.log('Saved event picker and bindings',result.revision);
