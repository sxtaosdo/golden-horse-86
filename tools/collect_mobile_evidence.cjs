const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),{execFileSync}=require('child_process');
const root=path.resolve(__dirname,'..'),evidence=path.join(root,'tests/evidence/mobile-r02');fs.mkdirSync(evidence,{recursive:true});
const cases=[['mobile-three-rounds-result',390,844],['mobile-360-result',360,640],['mobile-430-result',430,932]],summary=[];
for(const [name,width,height] of cases){const full=JSON.parse(fs.readFileSync(path.join(root,'.test',name+'.json')));assert.equal(full.status,'PASSED',name);const report=full.data;
 for(const diagnostic of Object.values(report.diagnostics))assert.equal(diagnostic.count,0,name+' diagnostics');
 const states=report.steps.filter(s=>s.state?.revision).map(s=>s.state),results=new Map();
 for(const s of states){assert.equal(s.revision,'mobile-r02-144-crisp-v1');assert.equal(s.raceViewport.width,width);assert.equal(s.raceViewport.x,0);
  for(const r of [...s.touchTargets,...s.buttons]){assert.ok(r.width>=44&&r.height>=44,'44 CSS px targets');assert.ok(r.x>=-0.01&&r.y>=-0.01&&r.x+r.width<=width+.01&&r.y+r.height<=height+.01,'targets inside viewport');}
  if(s.phase==='result'){assert.deepEqual(s.metrics.visibleOrder,s.result.order);assert.equal(s.metrics.finishCount,6);assert.equal(s.metrics.worldChanges,0);assert.ok(s.metrics.settlementJump<20,'no finish teleport');
   const previous=results.get(s.round);if(previous)assert.equal(s.credits,previous.credits,'one payout during run-out');results.set(s.round,s);
  }
 }
 assert.equal(results.size,width===390?3:1);let credits=500;
 for(const s of results.values()){assert.equal(s.credits,credits-15+s.result.payout);credits=s.credits;assert.ok(s.screenHorsePositions.every(p=>p.x<-120||p.x>870),'all finishers leave viewport');}
 for(const s of report.steps)if(s.screenshot){const file=s.step.label+'.png';fs.copyFileSync(s.screenshot.path,path.join(evidence,file));s.screenshot.path='tests/evidence/mobile-r02/'+file;}
 fs.writeFileSync(path.join(root,'tests',name+'.json'),JSON.stringify(full,null,2)+'\n');
 summary.push({viewport:{width,height},rounds:results.size,minimumTouchHeight:Math.min(...states.flatMap(s=>[...s.touchTargets,...s.buttons].map(r=>r.height))),results:[...results.values()].map(s=>({round:s.round,credits:s.credits,result:s.result,metrics:s.metrics}))});
}
const files=['assets/GoldenHorseGame.scene','assets/GoldenHorseGame.scene.meta','settings/v2/packages/project.json',...fs.readdirSync(path.join(root,'assets/scripts')).filter(n=>/\.ts(\.meta)?$/.test(n)).map(n=>'assets/scripts/'+n),...fs.readdirSync(path.join(root,'assets/scripts/presentation')).filter(n=>/\.ts(\.meta)?$/.test(n)).map(n=>'assets/scripts/presentation/'+n),'assets/tests/GoldenHorseTestBridge.ts','assets/tests/GoldenHorseTestBridge.ts.meta','assets/resources/race.meta','assets/resources/race/manifest.json','assets/resources/race/manifest.json.meta'];
const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/resources/race/manifest.json')));
for(const name of manifest.horses.map(s=>s.name+'.png').concat(['scenery.png','ground.png','ui-white.png']))files.push('assets/resources/race/'+name,'assets/resources/race/'+name+'.meta');
const source={baseCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),files:files.sort().map(file=>({path:file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')}))};
fs.writeFileSync(path.join(root,'tests/mobile-r02-source-sha256.json'),JSON.stringify(source,null,2)+'\n');
fs.writeFileSync(path.join(root,'tests/mobile-r02-summary.json'),JSON.stringify({date:'2026-10-23',projectId:'9d8a0041f7873b81',creatorVersion:'3.8.8',sessionId:'379ab6d4-7ed1-4f88-b5a2-6c5dddfb0dff',previewUrl:'http://192.168.31.100:7457',summary},null,2)+'\n');
console.log(JSON.stringify(summary.map(s=>({viewport:s.viewport,rounds:s.rounds,minimumTouchHeight:s.minimumTouchHeight})),null,2));
