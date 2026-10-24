// Metadata crops only; retain the generated alpha and all original pixels.
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../../../..');
const frame=(x,y,w,h,footX,footY,i=0)=>({rect:{x:x+i%2*768,y:y+Math.floor(i/2)*512,width:w,height:h},anchor:{x:(footX-x)/w,y:(y+h-footY)/h}});
const group=(id,scale,parts)=>({id,resource:id+'-r11',sourceWidth:1536,sourceHeight:1024,scale,parts});
const flag=group('flag',.27,[{id:'pole',moving:false,frames:[frame(280,30,34,365,298,464)]},{id:'base',moving:false,frames:[frame(242,388,115,78,298,464)]},{id:'cloth',moving:true,frames:Array.from({length:4},(_,i)=>frame(310,82,345,132,298,464,i))}]);
const crowd=group('crowd',.3,[{id:'rail-and-feet',moving:false,frames:[frame(72,288,650,184,384,460)]},{id:'cheering',moving:true,frames:Array.from({length:4},(_,i)=>frame(72,60,650,228,384,460,i))}]);
const station=[{kind:'flag',x:780,y:45},{kind:'crowd',x:550,y:45}],regional=station.concat([{kind:'flag',x:620,y:650},{kind:'crowd',x:300,y:650}]),championship=regional.concat([{kind:'flag',x:1450,y:45},{kind:'crowd',x:1650,y:45}]);
const catalog={version:1,groups:[flag,crowd],tiers:{station,regional,championship}};
fs.writeFileSync(path.join(__dirname,'environment-art.json'),JSON.stringify(catalog,null,2)+'\n');
if(process.argv.includes('--runtime')){const dest=path.join(root,'assets/resources/race/environment');fs.mkdirSync(dest,{recursive:true});for(const g of catalog.groups)fs.copyFileSync(path.join(__dirname,'generated',g.resource+'.png'),path.join(dest,g.resource+'.png'));fs.copyFileSync(path.join(__dirname,'environment-art.json'),path.join(root,'assets/resources/race/environment-art.json'));}
console.log('Two original RGBA sheets; static feet/rail/pole separated from eight moving upper-body/cloth frames.');
