const {call,root}=require('./mobile_scene_mcp.cjs'),fs=require('fs'),path=require('path');
const file=path.join(root,'tests/actual-mobile-r02-three-rounds.webm'),out=fs.openSync(file,'w');let offset=0,total=1;
try{while(offset<total){const r=call('playtest_run',{viewport:{width:390,height:844},pageState:'keep',steps:[{type:'api',call:'testRecordingChunk',args:[offset]}]}),chunk=r.steps[0].state;
 if(typeof chunk.data!=='string'||chunk.next<=offset||chunk.total<chunk.next)throw Error('Invalid recording chunk');
 fs.writeSync(out,Buffer.from(chunk.data,'base64'));offset=chunk.next;total=chunk.total;console.log('Export',offset,'/',total);
}}finally{fs.closeSync(out);}
console.log('Real captured video saved:',fs.statSync(file).size,'bytes');
