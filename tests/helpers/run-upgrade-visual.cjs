const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'../..'),cli=path.resolve(root,'../../P8000/cocos-mcp/mcp/dist/companion/creator-ai.js'),evidence=path.join(root,'tests/evidence/upgrade-visual');fs.mkdirSync(evidence,{recursive:true});
for(const width of [390,360,430]){
 const base=JSON.parse(fs.readFileSync(path.join(root,'tests/gate-depth-'+width+'.json'))),steps=JSON.parse(JSON.stringify(base.steps.slice(0,38)).replace('gate-depth-r08-v1','upgrade-r10-v3'));
 steps[4].expect.turnFrames=96;
 const bet=width===360?[40,375]:width===390?[45,550]:[50,611],start=width===360?[310,614]:width===390?[338,817]:[370,902];
 steps.push({type:'screenshot',label:'upgrade-visual-'+width+'-wide'},{type:'pointer',action:'touch_tap',x:bet[0],y:bet[1]},{type:'pointer',action:'touch_tap',x:start[0],y:start[1]},{type:'wait_for_state',expect:{phase:'racing'},timeoutMs:6000},{type:'wait',durationMs:9300});
 if(width===390)steps.push({type:'api',call:'testStartRecording'});
 for(let i=0;i<17;i++){steps.push({type:'get_state',required:true});if([2,5,8,11,14].includes(i))steps.push({type:'screenshot',label:'upgrade-visual-'+width+'-turn'+i});steps.push({type:'wait',durationMs:400});}
 if(width===390)steps.push({type:'api',call:'testStopRecording'},{type:'api',call:'testRecordingData'});
 steps.push({type:'wait_for_state',expect:{phase:'result'},timeoutMs:18000},{type:'get_state',required:true},{type:'screenshot',label:'upgrade-visual-'+width+'-result'},{type:'wait',durationMs:6200},{type:'pointer',action:'touch_tap',x:start[0],y:start[1]},{type:'wait_for_state',expect:{phase:'betting',round:2},timeoutMs:5000},{type:'get_state',required:true});
 if(steps.length>120)throw Error('Step bound');const label='upgrade-visual-'+width,input=path.join(root,'tests/'+label+'.json'),output=path.join(root,'tests/'+label+'-result.json');fs.writeFileSync(input,JSON.stringify({viewport:base.viewport,steps},null,2));
 const run=spawnSync(process.execPath,[cli,'playtest','run','--project','9d8a0041f7873b81','--input-file',input,'--json'],{cwd:root,encoding:'utf8',maxBuffer:32e6});fs.writeFileSync(output,run.stdout);const j=JSON.parse(run.stdout);if(j.status!=='PASSED')throw Error(JSON.stringify(j.error));
 for(const s of j.data.steps)if(s.screenshot)fs.copyFileSync(s.screenshot.path,path.join(evidence,s.step.label+'.png'));
 if(width===390){const bytes=j.data.steps.find(x=>x.step.call==='testRecordingData').state;fs.writeFileSync(path.join(evidence,'upgrade-visual-turn.webm'),Buffer.from(bytes,'base64'));}
 const states=j.data.steps.filter(x=>x.state?.revision).map(x=>x.state),directions=[...new Set(states.flatMap(x=>x.horseVisuals.map(h=>h.direction)))].sort(),result=states.findLast(x=>x.phase==='result');console.log(JSON.stringify({width,steps:steps.length,directions,metrics:result.metrics,diagnostics:j.data.diagnostics}));
}
