import { RaceModel } from '../scripts/RaceModel';
import { trackSection } from '../scripts/TrackVisual';

/** Preview-only observations and commands. Never changes time, odds or results. */
export class GoldenHorseTestBridge {
  private recorder:MediaRecorder|null=null;
  private recordingChunks:Blob[]=[];
  private recordingBase64='';
  private trackedRound=0;
  private previousPositions:Array<{x:number;y:number}>=[];
  private previousPhase='betting';
  private readonly crossings:number[]=[];
  private backgroundMismatches=0;
  private settlementJump=0;
  private resultDrift=0;
  private worldChanges=0;
  private initialWorld='';
  private previousCamera:{x:number;y:number}|null=null;
  private maxCameraStep=0;
  private clippedFinishers=0;
  constructor(private readonly model:RaceModel,private readonly observe:()=>Record<string,unknown>,private readonly canAct:()=>boolean=()=>true){
    (window as Window & {__COCOS_GAME_TEST__?:GoldenHorseTestBridge}).__COCOS_GAME_TEST__=this;
  }
  isReady():boolean{return this.observe().ready===true;}
  getState():Record<string,unknown>{
    return {...this.observe(),phase:this.model.phase,round:this.model.round,
      credits:this.model.credits,totalStake:this.model.totalStake,
      result:this.model.lastResult?JSON.parse(JSON.stringify(this.model.lastResult)) as unknown:null,
      historyLength:this.model.history.length,
      metrics:{finishCount:this.crossings.length,visibleOrder:[...this.crossings],
        backgroundMismatches:this.backgroundMismatches,settlementJump:this.settlementJump,resultDrift:this.resultDrift,
        worldChanges:this.worldChanges,maxCameraStep:this.maxCameraStep,clippedFinishers:this.clippedFinishers},
      progress:[...this.model.progress]};
  }
  /** Observe the rendered nodes after each real engine frame; never drives the simulation. */
  sampleFrame():void{
    if(this.trackedRound!==this.model.round){
      this.trackedRound=this.model.round;this.crossings.length=0;this.backgroundMismatches=0;
      this.settlementJump=0;this.resultDrift=0;this.previousPositions=[];this.previousPhase='betting';
      this.worldChanges=0;this.initialWorld='';this.previousCamera=null;this.maxCameraStep=0;this.clippedFinishers=0;
    }
    const observation=this.observe();
    const positions=observation.horsePositions as Array<{x:number;y:number}>;
    const world=String(observation.worldId);
    if(!this.initialWorld)this.initialWorld=world;
    if(world!==this.initialWorld)this.worldChanges++;
    const camera=observation.camera as {x:number;y:number};
    if(this.previousCamera&&this.model.phase!=='betting')this.maxCameraStep=Math.max(this.maxCameraStep,
      Math.hypot(camera.x-this.previousCamera.x,camera.y-this.previousCamera.y));
    this.previousCamera={...camera};
    for(let i=0;i<positions.length;i++){
      if(this.model.phase==='racing'){
        // A continuous world can show horses on both sides of a segment join; no backdrop swap exists.
        const nose=positions[i].x-Number(observation.horseNoseOffset);
        const before=this.previousPositions[i];
        if(before&&before.x-Number(observation.horseNoseOffset)>Number(observation.finishWorldX)
          &&nose<=Number(observation.finishWorldX)&&!this.crossings.includes(i+1)
          &&trackSection(this.model.progress[i])==='finish'){
          this.crossings.push(i+1);
          const points=observation.screenHorsePositions as Array<{x:number;y:number}>,r=observation.raceViewport as {width:number;height:number};
          const zoom=Number(observation.raceScale),height=r.height*750/r.width,point=points[i];
          if(point.x-100*zoom<0||point.x+100*zoom>750||point.y-150*zoom<90||point.y>height)this.clippedFinishers++;
        }
      }
      const previous=this.previousPositions[i];
      if(previous&&this.model.phase==='result'){
        const distance=Math.hypot(positions[i].x-previous.x,positions[i].y-previous.y);
        if(this.previousPhase==='racing')this.settlementJump=Math.max(this.settlementJump,distance);
        else this.resultDrift=Math.max(this.resultDrift,distance);
      }
    }
    this.previousPositions=positions;this.previousPhase=this.model.phase;
  }
  testBet(key:string,amount:number):boolean{
    return this.isReady()&&this.canAct()&&this.model.placeBet(key,amount);
  }
  testStart():boolean{return this.isReady()&&this.canAct()&&this.model.startRace();}
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
  testRecordingChunk(offset:number):{data:string;next:number;total:number}{
    if(!Number.isInteger(offset)||offset<0||offset>this.recordingBase64.length)throw new Error('Invalid recording offset');
    const next=Math.min(offset+1000000,this.recordingBase64.length);
    return {data:this.recordingBase64.slice(offset,next),next,total:this.recordingBase64.length};
  }
  dispose():void{
    if(this.recorder?.state==='recording')this.recorder.stop();
    this.recorder?.stream.getTracks().forEach(track=>track.stop());
    const target=window as Window & {__COCOS_GAME_TEST__?:GoldenHorseTestBridge};
    if(target.__COCOS_GAME_TEST__===this)delete target.__COCOS_GAME_TEST__;
  }
}
