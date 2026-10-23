const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const report=JSON.parse(fs.readFileSync(path.join(root,'.test/mobile-probe-result.json'))),state=report.data.steps.filter(s=>s.state).at(-1).state;
const tap=r=>({type:'pointer',action:'touch_tap',x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}),start=()=>tap(state.buttons.find(b=>b.name==='Start')),wait=durationMs=>({type:'wait',durationMs}),until=(expect,timeoutMs=30000)=>({type:'wait_for_state',expect,timeoutMs}),shot=label=>({type:'screenshot',label}),check=expect=>({type:'assert_state',expect});
const responsive=[{type:'ui',action:'click',target:'#view-select:visible, body:not(:has(#view-select:visible))'},{type:'ui',action:'click',target:'li[data-device=WebpageFullScreen]:visible, body:not(:has(li[data-device=WebpageFullScreen]:visible))'}];
const steps=[wait(2500),...responsive,{type:'wait_ready'},until({revision:'mobile-r02-144-crisp-v1',horseFrames:144,raceViewport:{x:0,width:390}}),{type:'api',call:'testStartRecording'}];
for(let round=1;round<=3;round++){
 steps.push(...state.touchTargets.map(tap),check({phase:'betting',round,totalStake:15}),shot('final-'+round+'-betting'),start(),until({phase:'racing',bettingPageVisible:true}),tap(state.touchTargets[0]),check({totalStake:15}),wait(1600),shot('final-'+round+'-straight'),until({section:'right-bend'},18000),wait(1500),shot('final-'+round+'-diagonal'),wait(1200),shot('final-'+round+'-front'),wait(2200),shot('final-'+round+'-turn-exit'),until({section:'finish'},12000),wait(1800),shot('final-'+round+'-final-straight'),until({phase:'result'},18000),{type:'get_state',required:true},shot('final-'+round+'-result'),wait(6500),{type:'get_state',required:true},shot('final-'+round+'-runout'));
 if(round<3)steps.push(start(),until({phase:'betting',round:round+1,totalStake:0,result:null}));
}
steps.push({type:'api',call:'testStopRecording'});
const finalSteps=steps.filter(s=>!(s.type==='screenshot'&&/^final-[23]-(diagonal|turn-exit|final-straight|betting)$/.test(s.label)));
if(finalSteps.length>120)throw Error('MCP step limit '+finalSteps.length);
fs.writeFileSync(path.join(root,'tests/mobile-three-rounds.json'),JSON.stringify({viewport:{width:390,height:844},steps:finalSteps},null,2));
fs.writeFileSync(path.join(root,'tests/mobile-export-recording.json'),JSON.stringify({viewport:{width:390,height:844},pageState:'keep',steps:[{type:'api',call:'testRecordingData'}]},null,2));
console.log('Final recording scenario',finalSteps.length,'steps');
