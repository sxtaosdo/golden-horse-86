const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..'),workspace=path.resolve(root,'../..'),cli=path.join(workspace,'P8000/cocos-mcp/mcp/dist/companion/creator-ai.js'),evidence=path.join(root,'tests/evidence/pre-race');
const coverage=[],clips=new Set();
for(const width of [390,360,430]){
 const base=JSON.parse(fs.readFileSync(path.join(root,'tests/gate-depth-'+width+'.json'))),seen=new Set();
 for(let attempt=1;attempt<=12&&seen.size<3;attempt++){
  let steps=JSON.parse(JSON.stringify(base.steps.slice(0,38)).replace('gate-depth-r08-v1','pre-race-r09-v1'));
  steps[4].expect.preRaceFrames=66;steps[4].expect.preAudio={loaded:5};
  const label='pre-race-'+width+'-case'+attempt;
  steps.push({type:'screenshot',label:label+'-wide'});
  const record=width===390&&clips.size<3;if(record)steps.push({type:'api',call:'testStartRecording'});
  if(width===360&&attempt===1)for(let i=0;i<12;i++)steps.push({type:'wait',durationMs:500},{type:'get_state',required:true});
  const bet=width===360?[40,375]:width===390?[45,550]:[50,611],start=width===360?[310,614]:width===390?[338,817]:[370,902];
  steps.push({type:'pointer',action:'touch_tap',x:bet[0],y:bet[1]},{type:'wait',durationMs:100},{type:'get_state',required:true},{type:'pointer',action:'touch_tap',x:start[0],y:start[1]},{type:'wait_for_state',expect:{phase:'preparing'},timeoutMs:5000});
  for(const ms of [200,750,850,350])steps.push({type:'wait',durationMs:ms},{type:'get_state',required:true});
  steps.push({type:'screenshot',label:label+'-near'},{type:'wait_for_state',expect:{phase:'racing'},timeoutMs:5000},{type:'wait',durationMs:400},{type:'get_state',required:true},{type:'screenshot',label:label+'-open'});
  if(record)steps.push({type:'api',call:'testStopRecording'},{type:'api',call:'testRecordingData'});
  if(width!==390&&attempt===1)steps.push({type:'wait_for_state',expect:{phase:'result'},timeoutMs:30000},{type:'get_state',required:true},{type:'wait',durationMs:6200},{type:'pointer',action:'touch_tap',x:start[0],y:start[1]},{type:'wait_for_state',expect:{phase:'betting',round:2},timeoutMs:5000},{type:'wait',durationMs:100},{type:'get_state',required:true});
  if(steps.length>120)throw Error('Step limit');
  const input='tests/'+label+'.json',output='tests/'+label+'-result.json';fs.writeFileSync(path.join(root,input),JSON.stringify({viewport:base.viewport,steps},null,2)+'\n');
  const run=spawnSync(process.execPath,[cli,'playtest','run','--project','9d8a0041f7873b81','--input-file',path.join(root,input),'--json'],{cwd:root,encoding:'utf8',maxBuffer:32e6});fs.writeFileSync(path.join(root,output),run.stdout);
  const report=JSON.parse(run.stdout);if(report.status!=='PASSED')throw Error(output+' '+JSON.stringify(report.error).slice(0,800));
  const data=report.data,states=data.steps.filter(x=>x.step.type==='get_state').map(x=>x.state),shot=states.find(s=>s.phase==='preparing').preRace.shot;seen.add(shot);
  for(const item of data.steps)if(item.screenshot)fs.copyFileSync(item.screenshot.path,path.join(evidence,item.step.label+'.png'));
  if(record){const b64=data.steps.find(x=>x.step.call==='testRecordingData').state;const bytes=Buffer.from(b64,'base64');fs.writeFileSync(path.join(evidence,'pre-race-shot'+shot+'.webm'),bytes);clips.add(shot);}
  coverage.push({width,attempt,shot,report:output,steps:steps.length,diagnostics:data.diagnostics,recorded:record});fs.writeFileSync(path.join(root,'tests/pre-race-matrix-summary.json'),JSON.stringify({cases:coverage,clips:[...clips]},null,2)+'\n');
  console.log(width+' case '+attempt+' shot '+shot+' PASSED; covered '+[...seen].sort().join('/'));
 }
 if(seen.size!==3)throw Error('Natural random coverage incomplete at '+width);
}
