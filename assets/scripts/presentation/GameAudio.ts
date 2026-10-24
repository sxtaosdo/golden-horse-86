import { AudioClip, AudioSource, Node } from 'cc';
import { DEFAULT_SETTINGS, PlayerSettings } from '../session/PlayerSettings';

/** All ordinary effects are owned so pause/mute/destroy also cancel pending native play. */
export class GameAudio {
 private readonly sources=new Map<string,AudioSource>();private readonly clips=new Map<string,AudioClip>();private disposed=false;private played:Record<string,number>={};
 constructor(host:Node){for(const name of ['bet','cancel','start','win','finish','error','gallop']){const source=host.addComponent(AudioSource);source.playOnAwake=false;this.sources.set(name,source);}}
 setClip(name:string,clip:AudioClip):void{if(!this.disposed)this.clips.set(name,clip);}
 play(name:string,settings:Readonly<PlayerSettings>=DEFAULT_SETTINGS):void{
  const source=this.sources.get(name),clip=this.clips.get(name);if(this.disposed||!source||!clip||settings.muted||settings.master*settings.effects===0)return;
  source.volume=.5*settings.master*settings.effects;source.clip=clip;source.play();this.played[name]=(this.played[name]??0)+1;
 }
 apply(settings:Readonly<PlayerSettings>):void{if(this.disposed)return;for(const source of this.sources.values())source.volume=settings.muted?0:.5*settings.master*settings.effects;if(settings.muted||settings.master*settings.effects===0)this.stop();}
 stop():void{for(const source of this.sources.values()){source.stop();source.clip=null;}}
 get observation():Record<string,unknown>{return {played:{...this.played},sources:this.sources.size};}
 dispose():void{if(this.disposed)return;this.disposed=true;this.stop();for(const source of this.sources.values())source.destroy();this.clips.clear();}
}
