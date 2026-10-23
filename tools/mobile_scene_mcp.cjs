// All editor mutations go through the project-bound Cocos-MCP CLI.
const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..'),workspace=path.resolve(root,'../..'),cli=path.join(workspace,'P8000/cocos-mcp/mcp/dist/companion/creator-ai.js');
const temp=path.join(root,'.test/mcp');fs.mkdirSync(temp,{recursive:true});
function call(tool,args){const file=path.join(temp,'request.json');fs.writeFileSync(file,JSON.stringify(args));const r=spawnSync(process.execPath,[cli,'tool','call',tool,'--project','9d8a0041f7873b81','--input-file',file,'--json'],{cwd:workspace,encoding:'utf8',maxBuffer:20e6});if(r.status!==0)throw Error(r.stdout+r.stderr);const out=JSON.parse(r.stdout);if(out.status!=='PASSED')throw Error(JSON.stringify(out));return out.data;}
if(process.argv[2]==='import'){
 const names=JSON.parse(fs.readFileSync(path.join(root,'art/final/gameplay/r02/manifest.json'))).horses.map(h=>h.name+'.png').concat(['scenery.png','ground.png']);
 for(const name of names){if(fs.existsSync(path.join(root,'assets/resources/race',name)))continue;call('asset_import',{sourcePath:path.join(root,'art/final/gameplay/r02',name),destinationUrl:'db://assets/resources/race/'+name});console.log('Imported',name);}
 fs.copyFileSync(path.join(root,'art/final/gameplay/r02/manifest.json'),path.join(root,'assets/resources/race/manifest.json'));
 call('asset_refresh',{url:'db://assets/resources/race'});
 if(!fs.existsSync(path.join(root,'assets/resources/race/ui-white.png')))console.log(JSON.stringify(call('asset_import',{sourcePath:path.join(root,'art/final/common/ui-white.png'),destinationUrl:'db://assets/resources/race/ui-white.png'})));
}
module.exports={call,root,temp};
