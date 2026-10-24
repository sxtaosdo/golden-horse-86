// Owner-requested rollback: restore individual baseline properties through Creator only.
const fs=require('fs'),cp=require('child_process'),{call}=require('./mobile_scene_mcp.cjs');
const baseline=JSON.parse(cp.execFileSync('git',['show','c44592f:assets/GoldenHorseGame.scene'],{encoding:'utf8',maxBuffer:6e6}));
const ref=name=>({$type:'NodeReference',semanticKey:'name:'+name}),label=name=>({$type:'ComponentReference',node:'name:'+name,type:'cc.Label'});
const ops=[];
for(const name of ['ResultText','ResultOdds','Credits','Message','Legend','EventButton']){
 const n=baseline.find(n=>n.__type__==='cc.Node'&&n._name===name);
 ops.push({op:'setProperty',target:'name:'+name,component:'cc.Node',property:'position',value:{$type:'Vec3',x:n._lpos.x,y:n._lpos.y,z:n._lpos.z}});
 for(const r of n._components){const c=baseline[r.__id__];
  if(c.__type__==='cc.UITransform')ops.push({op:'upsertComponent',target:'name:'+name,type:'cc.UITransform',properties:{contentSize:{$type:'Size',width:c._contentSize.width,height:c._contentSize.height}}});
  if(c.__type__==='cc.Label')ops.push({op:'upsertComponent',target:'name:'+name,type:'cc.Label',properties:{fontSize:c._fontSize,lineHeight:c._lineHeight,string:name==='Legend'?'黄色倍率 · 红色押分':c._string}});
 }
}
ops.push({op:'setProperty',target:'name:RepeatBets',component:'cc.Node',property:'position',value:{$type:'Vec3',x:-144,y:-188,z:0}},
 {op:'upsertComponent',target:'name:RepeatBetsText',type:'cc.Label',properties:{string:'更多\n本地已保存'}},
 {op:'upsertComponent',target:'name:HistoryText',type:'cc.UITransform',properties:{contentSize:{$type:'Size',width:570,height:230}}},
 {op:'setProperty',target:'name:HistoryText',component:'cc.Node',property:'position',value:{$type:'Vec3',x:0,y:20,z:0}},
 {op:'upsertComponent',target:'name:HistoryPanel',type:'cc.BlockInputEvents',properties:{}});
for(const name of ['StakeUnit','SettingsButton','HelpButton','HistoryPanel','UtilityPanel'])ops.push({op:'setProperty',target:'name:'+name,component:'cc.Node',property:'active',value:false});
const snap=call('scene_get_tree',{}),has=(nodes,name)=>nodes.some(n=>n.name===name||has(n.children??[],name));
if(!has(snap.roots,'HistoryControls')){
 const white='9e515fff-f075-4332-ac40-862745b9f862@f9941';
 call('ui_build_tree',{parent:{name:'HistoryPanel'},expectedRevision:snap.revision,verify:true,save:true,tree:{name:'HistoryControls',size:{width:610,height:420},children:Array.from({length:4},(_,i)=>({name:'HistoryAction'+i,type:'sprite',position:{x:-225+i*150,y:-155},size:{width:140,height:94},sprite:{spriteFrameUuid:white,sizeMode:'CUSTOM'},children:[{name:'HistoryActionText'+i,type:'label',size:{width:136,height:88},label:{string:'查看',fontSize:23,color:{r:255,g:229,b:160,a:255}}}]}))}});
}
for(let i=0;i<4;i++)ops.push({op:'setProperty',target:'name:HistoryAction'+i,component:'cc.Sprite',property:'color',value:{$type:'Color',r:32,g:49,b:55,a:255}},{op:'upsertComponent',target:'name:HistoryActionText'+i,type:'cc.Label',properties:{horizontalAlign:1,verticalAlign:1,fontFamily:'Arial',fontSize:23,lineHeight:26,overflow:2}});
ops.push({op:'upsertComponent',target:'GoldenHorseGame',type:'GoldenHorseGame',properties:{historyHeading:label('HistoryHeading'),historyButtons:[0,1,2,3].map(i=>ref('HistoryAction'+i)),historyButtonLabels:[0,1,2,3].map(i=>label('HistoryActionText'+i)),archiveStatus:label('RepeatBetsText')}});
const out=call('scene_apply_patch',{expectedRevision:call('scene_get_tree',{}).revision,operations:ops,verify:true,save:true});
call('scene_open',{url:'db://assets/GoldenHorseGame.scene'});
fs.writeFileSync('tests/restore-scope-scene.json',JSON.stringify({baseline:'c44592f',revision:out.after?.revision,restored:['ResultText','ResultOdds','Credits','Message','Legend (approved red wording)','EventButton'],history:'Original 610x420 RaceHost window, paged receipt data',entry:'Existing empty cell, More; original layout retained'},null,2));
console.log('Saved and reopened baseline layout',out.after?.revision);
