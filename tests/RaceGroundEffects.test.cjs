const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
class Node{constructor(n){this.name=n;this.children=[];this.active=true;}set parent(n){this.owner=n;n.children.push(this);}setPosition(x,y){this.position={x,y};}addComponent(Type){const c=new Type;c.node=this;return c;}destroy(){this.destroyed=true;}}
class Graphics{clear(){}ellipse(){}fill(){}}
const cc={Node,Graphics,Color:class{constructor(r,g,b,a){Object.assign(this,{r,g,b,a});}},UITransform:class{}};
const exportsValue={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('assets/scripts/presentation/RaceGroundEffects.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports:exportsValue,require:n=>n==='cc'?cc:n==='../TrackVisual'?require('../.test/TrackVisual.js'):{RACE_WORLD_LAYER:2}});
const parent=new Node('world'),f=new exportsValue.RaceGroundEffects(parent);
f.update(.01,1,'betting',Array(6).fill(0),Array(6).fill(0));assert.equal(f.observation.active,0);
for(let k=1;k<=100;k++)f.update(.001,1,'racing',Array(6).fill(k*.002),Array(6).fill(k*.2));
assert.equal(f.observation.allocated,48);assert.equal(f.observation.active,48);assert.equal(parent.children.length,48);
const positions=JSON.stringify(parent.children.map(n=>n.position));f.update(0,1,'racing',Array(6).fill(.2),Array(6).fill(20));assert.equal(JSON.stringify(parent.children.map(n=>n.position)),positions);
for(let k=0;k<5;k++)f.update(.1,1,'result',Array(6).fill(1.2),Array(6).fill(20));assert.equal(f.observation.active,0);
f.update(.1,2,'betting',Array(6).fill(0),Array(6).fill(0));assert.equal(f.observation.active,0);
f.update(.1,2,'racing',Array(6).fill(.05),Array(6).fill(1));assert.ok(f.observation.active>0);
f.update(.1,2,'racing',Array(6).fill(.06),Array(6).fill(2),true);assert.equal(f.observation.active,0);
f.dispose();assert.ok(parent.children.every(n=>!n.active&&n.destroyed));assert.equal(f.observation.allocated,0);
console.log('RaceGroundEffects: hoof-triggered bounded 48-node dust, zero-dt freeze, expiry, round/reduced-motion reset and disposal passed.');
