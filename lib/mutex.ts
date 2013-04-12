/**
  Ground Web Framework (c) 2013 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  Mutex class.
  
  Simple Mutex class used to protect code sections from parallel execution.
*/
module Gnd {
  
export interface Handler
{
  (done: ()=>void) : void;
}

export class Mutex
{
  private queue: Handler[] = [];
  
  enter(handler: Handler)
  {
    this.queue.push(handler);
    if(this.queue.length === 1){
      this.exec(handler);
    }
  }
  
  private exec(handler: Handler)
  {
    handler.call(this, ()=>{
      this.queue.shift();
      var next = this.queue[0];
      if(next) this.exec(next);
    });
  }
}

}

