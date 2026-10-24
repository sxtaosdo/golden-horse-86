import { AudioClip, AudioSource, Node, resources } from 'cc';
import { PreRaceCue, PreRaceState } from './PreRacePresentation';

/** Optional atmosphere audio. A failed extra clip cannot close the gameplay loading gate. */
export class PreRaceAudio {
 private readonly loop:AudioSource;private readonly effects=new Map<PreRaceCue,AudioSource>();private readonly clips=new Map<string,AudioClip>();
 private disposed=false;private unlocked=false;private playing=false;private starts=0;private played:Record<string,number>={};readonly warnings:string[]=[];
 constructor(host:Node){
  this.loop=host.addComponent(AudioSource);this.loop.loop=true;this.loop.playOnAwake=false;
  for(const name of ['countdown','broadcast','latch','hoof'] as const){const source=host.addComponent(AudioSource);source.playOnAwake=false;this.effects.set(name,source);}
 }
 async load():Promise<void>{await Promise.all(['ambience','countdown','broadcast','latch','hoof'].map(name=>new Promise<void>(resolve=>{
  resources.load('audio/'+name+'-r09',AudioClip,(error,clip)=>{if(!this.disposed){if(error)this.warnings.push(name+': '+error.message);else{this.clips.set(name,clip);const source=this.effects.get(name as PreRaceCue);if(source)source.clip=clip;}}resolve();});
 })));}
 unlock():void{this.unlocked=true;}
 update(state:PreRaceState,cues:readonly PreRaceCue[]):void{
  if(this.disposed||!this.unlocked)return;
  const active=state.phase==='betting'||state.phase==='preparing',clip=this.clips.get('ambience');
  if(active&&clip){
   this.loop.volume=(state.eventId==='station'?.055:state.eventId==='regional'?.075:.095)*(state.phase==='preparing'&&state.preparationRemaining<=1?.25:1);
   if(!this.playing){this.loop.clip=clip;this.loop.play();this.playing=true;this.starts++;}
  }else if(this.playing){this.loop.stop();this.playing=false;}
  for(const cue of cues){const source=this.effects.get(cue);if(this.clips.has(cue)&&source){source.volume=cue==='hoof'?.16:.32;source.play();this.played[cue]=(this.played[cue]??0)+1;}}
 }
 get observation():Record<string,unknown>{return {loaded:this.clips.size,unlocked:this.unlocked,looping:this.playing,loopVolume:this.loop.volume,loopStarts:this.starts,played:{...this.played},warnings:[...this.warnings]};}
 dispose():void{if(this.disposed)return;this.disposed=true;for(const source of [this.loop,...this.effects.values()]){source.stop();source.clip=null;source.destroy();}this.playing=false;this.clips.clear();}
}
