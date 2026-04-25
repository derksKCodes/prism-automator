
export {}
import {IEventManager} from "./types.ts"


interface CusClass{
  ec:IEventManager;
}

declare global {
  interface Window {
    __cypher:CusClass;
    onModalDetected:Function
  }
}


