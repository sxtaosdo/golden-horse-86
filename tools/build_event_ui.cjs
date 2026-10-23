// Incremental, project-bound Creator authoring. Does not rewrite the existing UI.
const {call,temp}=require('./mobile_scene_mcp.cjs'),fs=require('fs'),path=require('path');
const white='9e515fff-f075-4332-ac40-862745b9f862@f9941',colors=[],labels=[];
const rgba=hex=>({r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16),a:255});
const node=(name,w,h,x=0,y=0,children=[])=>({name,size:{width:w,height:h},position:{x,y},children});
function text(name,string,w,h,x,y,size){labels.push([name,size]);return {...node(name,w,h,x,y),type:'label',label:{string,fontSize:size,color:rgba('#ffe192')}};}
function box(name,w,h,x,y,color,children=[]){colors.push([name,color]);return {...node(name,w,h,x,y,children),type:'sprite',sprite:{spriteFrameUuid:white,sizeMode:'CUSTOM'}};}
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
