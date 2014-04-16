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
  
var MAX_MUTEX_LENGTH = 100;
  
export interface Handler
{
  () : any;
  defer?: Deferred<any>;
  wait?: Promise<any>;
}

/**
  A Mutex creates a protected section that can only be entered one at a time 
  by the executing thread. 
  
  Even if Javascript is single threaded, it should be possible
  that the same thread enters more than once in the same code block if there are
  asynchronous operations in it.
  
  Mutex returns a function that can be used to define a closure where only one
  execution context can be active at a given time. The closure must return a
  Promise in order to tell the mutex that the asynchronous operation is completed,
  allowing the next queued execution context to enter the closure.

  @for Gnd
  @method Mutex

  @return {() => Promise}
  
  @example
      var mutex = Mutex();
  
      // serialPost will only allow calling post to the server one at a time.
      function serialPost(url: string, obj){
        mutex(function(){
          return Gnd.Ajax.post(url, obj);
        });
      }
**/
export function Mutex(){
  var queue = [];

  return function(handler: Handler){
    handler.defer = Promise.defer();
    handler.wait = handler.defer.promise.then(handler);

    if(queue.length >= MAX_MUTEX_LENGTH){
      handler.defer.reject(Error("Mutex grew too large: "+queue.length));
    }else{
      queue.push(handler);
      if(queue.length === 1){
        exec(handler);
      }
    }

    return handler.wait;
  }

  function exec(handler){
    handler.defer.resolve();
    handler.wait.ensure(() => {
      queue.shift();
      var next = queue[0];
      if(next) exec(next);
    });
  }
}

}
