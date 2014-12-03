/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  Task Module. Include classes for Task management including Promises.
  
  TODO: Reimplement using Promise's cancel functionality.
*/

/// <reference path="util.ts" />
/// <reference path="promise.ts" />

module Gnd {

export interface Task<T> {
  () : Promise<T>;
}


/**
  Task Queue. This class can handle the serial execution of asynchronous tasks

  @class TaskQueue
  @constructor
*/
export class TaskQueue<T> {
  private tasks: any[] = [];
  private endDefer: Deferred<T>;
  
  private isExecuting: boolean;
  private isEnded: boolean;
  private isCancelled: boolean;
  
  constructor(){
    this.endDefer = Promise.defer<T>();
  }
  
  /**
     Appends one or several tasks to the queue. The tasks are executed in order. A task is just a
     function with an optional callback. 
  
     Note that this call accepts also null or undefined values as inputs, 
     they will just be ignored.
  
     @method append
     @param tasks* {Task}
     @chainable
  */
  append(...tasks:Task<T>[]) : TaskQueue<T>
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
    this.endDefer.promise.cancel();
  }

  /**
    Ends this task queue. This function just mark this queue as ended,
    trying to append more tasks after it will raise an exception.
  
    @method end
    @chainable
  **/
  end(): TaskQueue<T>
  {
    this.isEnded = true;
    if(!this.isExecuting){
      this.endDefer.resolve();
    }
    return this;
  }
  
  /**
    Waits for this task queue to finalize processing
  
    @method wait
    @param cb {Function} Callback called after waiting the queue to finalize.
  */
  wait(): Promise<T>
  {
    return this.endDefer.promise
  }
  
  private executeTasks() : Promise<T>
  {
    if(this.tasks.length>0 && !this.isCancelled && !this.isExecuting){
      this.isExecuting = true;
      
      var result = this.tasks.splice(0, 1)[0]();
      
      result = isPromise(result) ? result : Promise.resolved(result);
      
      return result.then(() => {
        this.isExecuting = false;
        return this.executeTasks();
      });
    }else if(this.isEnded || this.isCancelled){
      this.endDefer.resolve();
      return this.wait();
    }
  }
}

}
