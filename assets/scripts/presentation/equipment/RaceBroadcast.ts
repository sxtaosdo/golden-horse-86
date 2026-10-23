import { Camera, Color, Node, RenderTexture, Sprite, SpriteFrame, UITransform } from 'cc';
import { RACE_WORLD_LAYER } from './RaceLayers';

/** A second view of the same render scene; never owns or advances gameplay. */
export class RaceBroadcast {
 private readonly cameraNode:Node;
 private readonly camera:Camera;
 private readonly texture:RenderTexture;
 private readonly frame:SpriteFrame;
 private elapsed=1;
 private disposed=false;
 private samples=0;
 constructor(private readonly host:Node,private readonly display:Sprite){
  this.texture=new RenderTexture();this.texture.initialize({width:512,height:288});
  this.frame=new SpriteFrame();this.frame.texture=this.texture;display.spriteFrame=this.frame;
  this.cameraNode=new Node('RaceBroadcastCamera');this.cameraNode.parent=host.scene;
  this.camera=this.cameraNode.addComponent(Camera);this.camera.projection=Camera.ProjectionType.ORTHO;
  this.camera.visibility=RACE_WORLD_LAYER;this.camera.priority=0;
  this.camera.near=.1;this.camera.far=2000;this.camera.clearFlags=Camera.ClearFlag.SOLID_COLOR;
  this.camera.clearColor=new Color(5,12,16,255);this.camera.targetTexture=this.texture;
  this.camera.enabled=false;
 }
 update(dt:number,active:boolean):void{
  if(this.disposed)return;
  this.elapsed+=dt;this.camera.enabled=false;
  if(!active||this.elapsed<1/15)return;
  this.elapsed%=1/15;
  const size=this.host.getComponent(UITransform)!;
  // Crop a 16:9 band around the race viewport centre. Fitting the entire tall
  // mobile viewport would shrink the horses into a narrow strip on the screen.
  this.camera.orthoHeight=size.width/(2*(512/288));
  const p=this.host.worldPosition;this.cameraNode.setWorldPosition(p.x,p.y,1000);
  this.camera.enabled=true;this.samples++;
 }
 get sampleCount():number{return this.samples;}
 dispose():void{
  if(this.disposed)return;this.disposed=true;this.camera.enabled=false;
  this.display.spriteFrame=null;this.camera.targetTexture=null;this.cameraNode.destroy();
  this.frame.destroy();this.texture.destroy();
 }
}
