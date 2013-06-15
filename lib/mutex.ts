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

export function Mutex(){
  var queue = [];
  
  return function(handler){
    handler.promise = new Promise();
    handler.wait = handler.promise.then(handler);
    
    queue.push(handler);
    if(queue.length === 1){
      exec(handler);
    }
    return handler.wait;
  }
  
  function exec(handler){
    handler.promise.resolve();
    handler.wait.then(() => {
      queue.shift();
      var next = queue[0];
      if(next) exec(next);
    });
  }
}

}

