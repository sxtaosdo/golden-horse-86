#!/usr/bin/env node
/** Make a single file://-compatible browser script from the actual TS model. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
let ts;try{ts=require('typescript');}catch{
  const cp=require('node:child_process');
  const globalRoot=cp.execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim();
  ts=require(path.join(globalRoot,'typescript'));
}
let source=fs.readFileSync(path.join(root,'assets/scripts/TrackVisual.ts'),'utf8')+'\n'+fs.readFileSync(path.join(root,'assets/scripts/RaceModel.ts'),'utf8');
source=source.replace(/^export /gm,'');
// TrackVisual is concatenated above, so resolve this exact local dependency in the standalone build.
source=source.replace(/^import \{ RaceChoreography, RacePace \} from '\.\/TrackVisual';\r?\n/gm,'');
// Event types are erased; removing their import also keeps the concatenation a plain script.
source=source.replace(/^import \{ RaceEventId, RaceEventRules, RaceEventTier \} from '\.\/events\/RaceEventCatalog';\r?\n/gm,'');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText;
const renderer=fs.readFileSync(path.join(root,'preview-web/renderer.js'),'utf8');
fs.writeFileSync(path.join(root,'preview-web/game.js'),`/* AUTO-GENERATED: node tools/build_preview.cjs */\n(()=>{\n${compiled}\n${renderer}\n})();\n`);
console.log('built: preview-web/game.js using RaceModel.ts + TrackVisual.ts');
