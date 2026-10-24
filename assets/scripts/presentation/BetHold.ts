/** One pointer owns repeated input. Releasing a different touch cannot stop it. */
export class BetHold {
 private index=-1;private pointer=-1;private elapsed=0;private next=.4;private amount=1;private repeated=false;
 begin(index:number,amount:number,pointer:number):void{this.index=index;this.amount=amount;this.pointer=pointer;this.elapsed=0;this.next=.4;this.repeated=false;}
 matches(index:number,pointer:number):boolean{return this.index===index&&this.pointer===pointer;}
 end(pointer:number):void{if(this.pointer===pointer)this.cancel();}
 release(pointer:number):{cell:number;delta:number}|null{
  if(this.index<0||this.pointer!==pointer)return null;
  const tap=this.repeated?null:{cell:this.index,delta:this.amount};this.cancel();return tap;
 }
 cancel():void{this.index=-1;this.pointer=-1;this.elapsed=0;this.next=.4;}
 update(dt:number):number{
  if(this.index<0||!Number.isFinite(dt)||dt<=0)return 0;
  this.elapsed+=Math.min(.1,dt);let repeats=0;while(this.elapsed+1e-9>=this.next){repeats++;this.next+=.12;}if(repeats)this.repeated=true;return repeats;
 }
 get cell():number{return this.index;}
 get delta():number{return this.amount;}
 get observation():Record<string,number>{return {cell:this.index,elapsed:this.elapsed,amount:this.amount};}
}
