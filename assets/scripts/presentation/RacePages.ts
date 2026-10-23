import { IState, StateMachine } from 'db://shidai3/runtime/stateMachine';
export interface RacePageContext {
  StateMachine:StateMachine<RacePageContext>;
  showLoading():void;
  showBetting():void;
  showRace():void;
}
export class LoadingPage implements IState<RacePageContext> {
  context!:RacePageContext;
  enter():void{this.context.showLoading();}
  exit():void{}
}
export class BettingPage implements IState<RacePageContext> {
  context!:RacePageContext;
  enter():void{this.context.showBetting();}
  exit():void{}
}
export class RacingPage implements IState<RacePageContext> {
  context!:RacePageContext;
  enter():void{this.context.showRace();}
  exit():void{}
}
