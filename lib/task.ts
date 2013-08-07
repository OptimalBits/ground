/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  Task Module. Include classes for Task management including Promises.
*/

/// <reference path="util.ts" />
/// <reference path="promise.ts" />

module Gnd {
export interface TaskCallback {
  () : void;
}

export interface Task {
  (done? : TaskCallback) : void;
}


/**
  Task Queue. This class can handle the serial execution of asynchronous tasks

  @class TaskQueue
  @constructor
*/
export class TaskQueue {
  private tasks: any[] = [];
  private endPromise: Promise<void> = new Promise();
  private isExecuting: boolean;
  private isEnded: boolean;
  private isCancelled: boolean;
  
  /**
     Appends one or several tasks to the queue. The tasks are executed in order. A task is just a
     function with an optional callback. 
  
     Note that this call accepts also null or undefined values as inputs, 
     they will just be ignored.
  
     @method append
     @param tasks* {Task}
     @chainable
  */
  append(...tasks:Task[]) : TaskQueue
  {
    if(this.isEnded){
      throw new Error("TaskQueue already ended");
    }
    this.tasks.push.apply(this.tasks, _.compact(tasks));
    this.executeTasks();
    return this;
  }
  
  /**
     Cancels the execution of the task queue.
     
     @method cancel
  */
  cancel() : void
  {
    this.isCancelled = true;
  }
  
  /**
    Ends this task queue. This function just mark this queue as ended,
    trying to append more tasks after it will raise an exception.
  
    @method end
    @chainable
  **/
  end() : TaskQueue
  {
    this.isEnded = true;
    if(!this.isExecuting){
      this.endPromise.resolve();
    }
    return this;
  }
  
  /**
    Waits for this task queue to finalize processing
  
    @method wait
    @param cb {Function} Callback called after waiting the queue to finalize.
  */
  wait(cb : () => void)
  {
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
      this.endPromise.resolve();
    }
  }
}

}
