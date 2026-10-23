const {call,root}=require('./mobile_scene_mcp.cjs'),fs=require('fs'),path=require('path');
const file=path.join(root,'assets/resources/race/manifest.json'),manifest=JSON.parse(fs.readFileSync(file));
for(const view of ['side','diagonal','front']){const original='h01-'+view,name=original+'-r02';if(!fs.existsSync(path.join(root,'assets/resources/race',name+'.png')))call('asset_import',{sourcePath:path.join(root,'art/final/gameplay/r02',original+'.png'),destinationUrl:'db://assets/resources/race/'+name+'.png'});manifest.horses.find(s=>s.horse===1&&s.view===view).name=name;}
fs.writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');call('asset_refresh',{url:'db://assets/resources/race/manifest.json'});console.log('White horse imported with fresh Creator cache identities');
