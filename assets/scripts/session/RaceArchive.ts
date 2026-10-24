export interface StoragePort {getItem(key:string):string|null;setItem(key:string,value:string):void;}
export interface SessionLocks {request(name:string,options:{ifAvailable:true;mode:'exclusive'},callback:(lock:object|null)=>Promise<void>):Promise<unknown>;}
export type ArchiveMode='pending'|'persistent'|'temporary'|'busy';
export const ARCHIVE_KEY='neon-wasteland.golden-horse86.save.v1';

/** One writer and one atomic JSON value. No browser capability is assumed by the model. */
export class RaceArchive {
 private state:ArchiveMode='pending';private releaseLock:(()=>void)|null=null;private disposed=false;private acquiring:Promise<ArchiveMode>|null=null;private generation=0;
 lastError='';
 constructor(private readonly storage:StoragePort|null,private readonly locks?:SessionLocks){}
 get mode():ArchiveMode{return this.state;}
 acquire():Promise<ArchiveMode>{
  if(this.disposed||this.state==='temporary')return Promise.resolve('temporary');if(this.state==='persistent')return Promise.resolve(this.state);if(this.acquiring)return this.acquiring;
  if(!this.storage||!this.locks){this.state='temporary';return Promise.resolve(this.state);}
  const generation=this.generation;this.acquiring=new Promise<ArchiveMode>(resolve=>{
   void this.locks!.request(ARCHIVE_KEY,{ifAvailable:true,mode:'exclusive'},async lock=>{
    if(this.disposed||generation!==this.generation){resolve('temporary');return;}
    if(!lock){this.state='busy';resolve(this.state);return;}
    this.state='persistent';const held=new Promise<void>(done=>this.releaseLock=done);resolve(this.state);await held;
   }).catch(()=>{if(!this.disposed&&generation===this.generation)this.state='temporary';resolve('temporary');});
  }).finally(()=>this.acquiring=null);return this.acquiring;
 }
 read():unknown|null{
  if(this.state!=='persistent'||!this.storage)return null;
  try{const raw=this.storage.getItem(ARCHIVE_KEY);return raw===null?null:JSON.parse(raw) as unknown;}catch(error){this.lastError='无法读取本地存档';throw error;}
 }
 save(snapshot:unknown):boolean{
  if(this.state==='temporary')return true;if(this.state!=='persistent'||!this.storage||this.disposed)return false;
  try{this.storage.setItem(ARCHIVE_KEY,JSON.stringify(snapshot));this.lastError='';return true;}catch{this.lastError='存档写入失败，当前进度尚未保存';return false;}
 }
 backupUnreadable():boolean{
  if(this.state!=='persistent'||!this.storage)return false;
  try{const raw=this.storage.getItem(ARCHIVE_KEY);if(raw!==null)this.storage.setItem(ARCHIVE_KEY+'.unreadable',raw);return true;}catch{this.lastError='无法备份原存档，请使用临时模式';return false;}
 }
 useTemporary():void{this.generation++;this.state='temporary';this.releaseLock?.();this.releaseLock=null;}
 dispose():void{this.generation++;this.disposed=true;this.releaseLock?.();this.releaseLock=null;}
}
