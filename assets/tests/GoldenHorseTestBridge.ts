import { RaceModel } from '../scripts/RaceModel';

/** Preview-only observations and commands. Never changes time, odds or results. */
export class GoldenHorseTestBridge {
  private recorder:MediaRecorder|null=null;
  private recordingChunks:Blob[]=[];
  private recordingBase64='';
  constructor(private readonly model:RaceModel,private readonly observe:()=>Record<string,unknown>){
    (window as Window & {__COCOS_GAME_TEST__?:GoldenHorseTestBridge}).__COCOS_GAME_TEST__=this;
  }
  isReady():boolean{return this.observe().ready===true;}
  getState():Record<string,unknown>{
    return {...this.observe(),phase:this.model.phase,round:this.model.round,
      credits:this.model.credits,totalStake:this.model.totalStake,
      result:this.model.lastResult?JSON.parse(JSON.stringify(this.model.lastResult)) as unknown:null,
      historyLength:this.model.history.length,
      progress:[...this.model.progress]};
  }
  testBet(key:string,amount:number):boolean{
    return this.isReady()&&this.model.placeBet(key,amount);
  }
  testStart():boolean{return this.isReady()&&this.model.startRace();}
  testStartRecording():boolean{
    const canvas=document.querySelector('canvas');
    if(!canvas || this.recorder?.state==='recording')return false;
    this.recordingChunks=[];this.recordingBase64='';
    const stream=canvas.captureStream(30);
    this.recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:1800000});
    this.recorder.ondataavailable=(event:BlobEvent)=>{if(event.data.size)this.recordingChunks.push(event.data);};
    this.recorder.start(1000);return true;
  }
  async testStopRecording():Promise<{bytes:number;silent:boolean}>{
    const recorder=this.recorder;
    if(!recorder || recorder.state!=='recording')throw new Error('Recording has not started');
    await new Promise<void>(resolve=>{recorder.onstop=()=>resolve();recorder.stop();});
    recorder.stream.getTracks().forEach(track=>track.stop());
    const bytes=new Uint8Array(await new Blob(this.recordingChunks,{type:'video/webm'}).arrayBuffer());
    const segments:string[]=[];
    for(let offset=0;offset<bytes.length;offset+=32768)
      segments.push(String.fromCharCode(...bytes.subarray(offset,offset+32768)));
    this.recordingBase64=btoa(segments.join(''));return {bytes:bytes.length,silent:true};
  }
  testRecordingData():string{return this.recordingBase64;}
  dispose():void{
    if(this.recorder?.state==='recording')this.recorder.stop();
    this.recorder?.stream.getTracks().forEach(track=>track.stop());
    const target=window as Window & {__COCOS_GAME_TEST__?:GoldenHorseTestBridge};
    if(target.__COCOS_GAME_TEST__===this)delete target.__COCOS_GAME_TEST__;
  }
}
