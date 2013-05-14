/**
  Ground Web Framework (c) 2013 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  Mutex class.
  
  Simple Mutex class used to protect code sections from parallel execution.
*/

/// <reference path="promise" />


module Gnd {
  
export interface Handler
{
  () : void;
  promise?: Promise;
  wait?: Promise;
}

export class Mutex
{
  private queue: Handler[] = [];
  
  enter(handler: Handler): Promise
  {
    handler.promise = new Promise();
    handler.wait = handler.promise.then(handler);
    
    this.queue.push(handler);
    if(this.queue.length === 1){
      this.exec(handler);
    }
    return handler.wait;
  }
  
  private exec(handler)
  {    
    handler.promise.resolve();
    handler.wait.then(() => {
      this.queue.shift();
      var next = this.queue[0];
      if(next) this.exec(next);
    })
  }
}

}

