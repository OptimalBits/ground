/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  Task Module. Include classes for Task management including Promises.
*/

/// <reference path="../third/underscore.browser.d.ts" />

// we can not import due to a bug in tsc.
// import _ = module("underscore");

import Util = module("./util");

export interface TaskCallback {
  () : void;
}


export interface Task {
  (cb? : TaskCallback) : void;
}

export class TaskQueue {
  private tasks : any[] = [];
  private endPromise : Promise = new Promise();
  private isExecuting : bool;
  private isEnded : bool;
  private isCancelled : bool;
  
  // 
  // Appends one or several tasks to the queue. The tasks are executed in order. A task is just a
  // function with an optional callback. 
  //
  // Note that this call accepts also null or undefined values as inputs, 
  // they will just be ignored.
  //
  append(...tasks:Task[]) : TaskQueue {
    if(this.isEnded){
      throw new Error("TaskQueue already ended");
    }
    this.tasks.push.apply(this.tasks, _.compact(tasks));
    this.executeTasks();
    return this;
  }
  
  //
  //  Cancels the execution of the task queue.
  //
  cancel() : void {
    this.isCancelled = true;
  }
  
  //
  //  Ends this task queue. This function just mark this queue as ended,
  //  trying to append more tasks after it will raise an exception.
  //
  end() : TaskQueue {
    this.isEnded = true;
    if(!this.isExecuting){
      this.endPromise.resolve();
    }
    return this;
  }
  
  //
  // Waits for this task queue to finalize processing
  //
  wait(cb : () => void) {
    this.endPromise.then(cb);
  }
  
  private executeTasks() : void {
    if(this.tasks.length>0 && !this.isCancelled && !this.isExecuting){
      this.isExecuting = true;
      
      var fn = this.tasks.splice(0,1)[0];
      fn( () => {
        this.isExecuting = false;
        this.executeTasks();
      });
    }else if(this.isEnded || this.isCancelled){
      this.endPromise.resolve(this.isCancelled);
    }
  }
}

export class Promise {
  callbacks : any[] = [];
  resolved : any[];
  isAborted : bool;
  
  then(cb){
    if(this.resolved){
      this.fire(cb);
    }else{
      this.callbacks.push(cb);
    }
  }
  
  resolve(...args:any[]){
    if(this.isAborted) return;
    this.resolved = args;
    this.fireCallbacks(); 
  }
  
  abort(){
    this.isAborted = true;
  }
  
  private fire(cb){
    cb.apply(this, this.resolved);
  }
  
  private fireCallbacks(){
    var len = this.callbacks.length;
    if(len>0){
      for(var i=0;i<len;i++){
        this.fire(this.callbacks[i]);
      }
    }
  }
}

export class PromiseQueue {
  private promises : Promise[];
  
  constructor(...promises:Promise[]){
    this.promises = promises;
  }
  
  abort(){
    _.invoke(this.promises, 'abort');
  }
  
  then(cb:()=>void){
    Util.asyncForEachSeries(this.promises, function(promise, done){
      promise && promise.then(done);
    }, cb)
  }
}


