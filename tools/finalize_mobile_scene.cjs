const {call,root,temp}=require('./mobile_scene_mcp.cjs'),fs=require('fs'),path=require('path');
const snapshot=call('scene_get_tree',{}),ops=[];
function visit(n){for(const c of n.components??[])if(c.type==='cc.Label')ops.push({op:'setProperty',target:'uuid:'+n.uuid,component:'cc.Label',property:'lineHeight',value:Number(c.properties.fontSize)+2});for(const child of n.children??[])visit(child);}
snapshot.roots.forEach(visit);const result=call('scene_apply_patch',{expectedRevision:snapshot.revision,operations:ops,verify:true,save:true});
fs.writeFileSync(path.join(temp,'finalize-scene.json'),JSON.stringify({revision:result.revision,labelCount:ops.length}));console.log('Saved',ops.length,'label line heights');
