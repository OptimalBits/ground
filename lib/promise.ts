/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Promise Module. Minimal promise implementation.
*/
/// <reference path="base.ts" />
/// <reference path="log.ts" />

module Gnd {
"use strict";

export function isPromise(promise){
  return (promise instanceof Object) && (promise.then instanceof Function);
}

// TODO: Use local event queue to guarantee that all callbacks are called 
// in the same turn in the proper order.
//export class Promise<T> {

export var CancellationError = Error('Promise Cancelled');
CancellationError.name = "Cancel";

export interface Deferred<T>
{
  resolve: (val?: any) => void;
  reject: (err: Error) => void;
  promise: Promise<T>;
}

enum PromiseState {Pending = 0, Fulfilled = 1, Rejected = 2};

/**
  Promise implementation of http://dom.spec.whatwg.org/#promises

  @class Promise
  @extends Base
  @constructor
  @param [value] {Any}
 **/
export class Promise<T> extends Base
{
  private state: PromiseState = PromiseState.Pending;
  private fulfilledFns : any[] = [];
  private rejectedFns: any[] = [];
  private _value : any;

  uncancellable: Boolean = false;

  reason: Error;

  onCancelled: () => void;
  
  static defer<U>()
  {
    var deferred: Deferred<U> = {};
    
    var resolver = (resolve, reject) => {
      deferred.resolve = resolve;
      deferred.reject = reject;
    }
    
    deferred.promise = new Gnd.Promise<U>(resolver);
    return deferred;
  }

  /**
    Maps every element of the array using an asynchronous function that returns
    a Promise.
    
    @method map
    @static
    @param elements {Array}
    @param iter {Function}
    @return {Promise} A promise that resolves when all elements have been mapped.
  **/
  static map<U>(elements: any[], fn: (item: any)=>Promise<U>): Promise<U[]>
  {
    elements = _.isArray(elements) ? elements : [elements];
    
    var
      len = elements.length,
      promises = [];
        
    for(var i=0; i<len; i++){
      promises.push(fn(elements[i]))
    }

    return Promise.all(promises);;
  }
  
  static all<U>(promises: Promise<U>[])
  {
    var 
      len = promises.length,
      results = [];

    if(!len) return Promise.resolved<U[]>(results);

    return new Promise<U>((resolve, reject) => {
      var counter = len;
      
      results.length = len;
      for(var i=0; i<len; i++){
        ((index) => {
          promises[index].then((result) => {
            results[index] = result;
            counter--;
            if(counter === 0){
              resolve(results);
            }
          }, reject);
        })(i);
      }
    }, () => {
      _.invoke(promises, 'cancel');
    });
  }
  
  static race<U>(promises: Promise<U>[])
  {
    var cancelAll = () => {
      _.invoke(promises, 'cancel');
    }
    
    return new Promise<U>((resolve, reject) => {
      _.each(promises, (promise) => {
        promise.then(resolve, reject).ensure(cancelAll);
      });
    }, cancelAll);
  }
  
  /**
    Returns a Promise that resolves after the given amount of milliseconds have
    passed.
    
    static delay(ms: number): Promise
    
    @method delay
    @static
    @param ms {Number}
    @return {Promise} A promise that resolves after the given milliseconds.
  **/
  static delay(ms: number): Promise<void>
  {
    var timeout;
    return new Promise<void>((resolve, reject) => {
      timeout = setTimeout(()=>resolve(), ms);
    }, () => {
      clearTimeout(timeout);
    });
  }
  
  /**
    Wraps a function that returns a promise into a debounced function.

    @method debounce
    @static
    @param task {Function} a function that returns a Promise
  */
  static debounce<U>(task: (...args:any[])=>Promise<U>): (...args:any[])=>void
  {
    var delayed, executing;
  
    var execute = () => {
      executing = delayed();
      delayed = null;
      executing.ensure(() => {
        executing = null;
        delayed && execute();
      });
    }
    
    return function(...args:any[]){
      delayed = () => task.apply(this, args);
      !executing && execute();
    }
  }

  /**
    Waits for a promise to be resolved, if it does not resolve in the given
    time it will call *start* and when the promise is finally resolved it will
    call *end*. 
  
    This function is useful to display waiting widgets for operations
    that take more than a certain amount of time to complete.

    @method delayed
    @static
    @param task {Promise}
    @param start {Function}
    @param end {Function}
    @param delay {Number} 
    @return {Promise} a promise resolved when the task is resolved.
  */
  static delayed<T>(task: Promise<T>,
                    start: ()=>void,
                    end: ()=>void,
                    delay: number): Promise<void>
  {
    var waiting;

    var timer = setTimeout(() => {
      waiting = true;
      start();
    }, delay);
  
    return task.then((value: T) => {
      clearTimeout(timer);
      waiting && end();
    });
  }

  static timeout<T>(promise: Promise<T>, ms: Number)
  {
    var timer = setTimeout(() => {
      promise.cancel("TimeoutError");
    }, ms);

    return promise.ensure(()=>clearTimeout(timer));
  }

  /**
    Creates an already resolved promise
    
    @method resolved
    @static
    @param value {Any} Value to use as resolved value.
    @return {Promise} A resolved promise.
  **/
  static resolved<U>(value?: U): Promise<U>
  {
    return new Promise((resolve)=>resolve(value));
  }
  
  /**
    Creates an already rejected promise
    
    @method rejected
    @static
    @param err {Error} Reason for the rejection.
    @return {Promise} A rejected promise.
  **/
  static rejected<U>(err: Error): Promise<U>
  {
    return new Promise((resolve, reject) => reject(err));
  }
  
  constructor(
    resolver?: (resolve: (val?: any) => void, reject: (err: Error) => void) => void,
    onCancelled?: () => void)
  {
    super();

    if(resolver){
      try{
        resolver(
          _.bind(this.resolve, this),
          (err: Error) => {
            if(err !== CancellationError){
              // Why do we need to call nextTick here??
              Util.nextTick(()=>{this.reject(err)});
            }else{
              this.reject(err);
            }
          });
      }catch(err){
        this.reject(err);
      }
    }
    this.onCancelled = onCancelled;
  }
  
  /**
  
    Then method waits for a promise to resolve or reject, and returns a new
    promise that resolves directly if the onFulfilled callback returns a value,
    or if the onFulfilled callback returns a promise then when 
    the returned promise resolves.
  
    @method then
    @param [onFulfilled] {Function}
    @param [onRejected] {Function}
    @return {Promise} A promise according to the rules specified 
  **/
  then<U>(onFulfilled: (value: T) => U, onRejected?: (reason: Error) => void): Promise<U>;
  then<U>(onFulfilled: (value: T) => Promise<U>, onRejected?: (reason: Error) => void): Promise<U>;
  then(onFulfilled: (value: T) => void, onRejected?: (reason: Error) => void): Promise<void>;
  then(onFulfilled: (value: T) => any, onRejected?: (reason: Error) => void): Promise<any>
  {
    var children;
    return new Promise((resolve, reject) => {
      var wrapper = (fn, shouldReject?: boolean) => {
        
        fn = _.isFunction(fn) ? fn : (value) => {
          if(shouldReject) throw(value);
          return value;
        };
        
        return (value) => {
          try{
            var child = fn(value);
            if(isPromise(child)){
              !children && (children = []);
              children.push(child);
              child.then(resolve, reject);
            }else{
              resolve(child);
            }
          }catch(err){
            reject(err);
          }
        }
      }

      if(!_.isUndefined(this._value)){
        this.fire(wrapper(onFulfilled), this._value);
      }else if(!_.isUndefined(this.reason)){
        this.fire(wrapper(onRejected, true), this.reason);
      }else{   
        this.fulfilledFns.push(wrapper(onFulfilled));
        this.rejectedFns.push(wrapper(onRejected, true));
      }
    }, () => {
      _.invoke(children, 'cancel');
      this.cancel();
    });
  }
  
  /**
    This method is syntactic sugar for then when only caring about a promise
    rejection.
    
    @method fail
    @param onRejected {Function}
  **/
  fail<U>(onRejected?: (reason: Error) => any): Promise<U>
  {
    var noop = ()=>{};
    return this.then(null, onRejected || noop);
  }
  
  /**
    Ensures that the callback is called when the promise resolves or rejects.
    
    @method ensure
    @param always {Function} callback to be executed always independetly if the 
    project was resolved or rejected.
  **/
  ensure(always: () => any)
  {
    var alwaysOnSuccess = (result) => {
      // don't pass result through, *and ignore* the return value
      // of alwaysCleanup.  Instead, return original result to propagate it.
      always();
      return result;
    }

    var alwaysOnFailure = (err) => {
      // don't pass result through, *and ignore* the result
      // of alwaysCleanup.  Instead, rethrow error to propagate the failure.
      always();
      throw err;
    }
    
    return this.then(alwaysOnSuccess, alwaysOnFailure);
  }

  isRejected()
  {
    return this.state === PromiseState.Rejected;
  }
  
  /**
    Resolves the promise with the given value.
  
    @method resolve
    @param value {Any} value to resolve this promise with.
  */
  private resolve(value?: T): void
  {    
    if(this.state > 0) return;
    this.state = PromiseState.Fulfilled;
    
    this._value = value || null;
    this.fireCallbacks(this.fulfilledFns, value);
  }

  /**
    Resolves the promise with the given value.

    @method reject
    @param reason {Error} value to resolve this promise with.
  */
  private reject(reason: Error): void
  {
    if(this.uncancellable && reason === CancellationError) return;

    if(this.state > 0) return;
    this.state = PromiseState.Rejected;

    this.reason = reason || null;
    if(this.rejectedFns.length){
      this.fireCallbacks(this.rejectedFns, reason);
    }else if(reason !== CancellationError){
      //
      // We log out unhandled errors
      //
      logerr("Unhandled", reason ? reason['stack'] || reason : "unspecified");
    }
  }
  
  /**
    Cancels a promise. 
    
    A canceled promise will be rejected with CancellationError
    
    @method cancel
  */
  cancel(reason?: string)
  {
    if(this.state == PromiseState.Pending && this.onCancelled){
      try{
        this.onCancelled();
      }catch(err){
        this.reject(err);
      }
    }
    this.reject(CancellationError);
  }

  timeout(ms: Number){
    return Promise.timeout(this, ms);
  }
  
  /**
    Forks the promise returning one that if cancelled will not 
    cancel the original promise.
  */
  fork() {
    return new Promise(resolve => resolve(this), Util.noop);
  }
  
  private fireNext(cb, value){
    var stack = (new Error())['stack'];
     
    Util.enqueue(() => cb.call(this, value));
  }
  
  private fire(cb, value){
    return cb.call(this, value);
  }
  
  private fireCallbacks(callbacks, value){
    var len = callbacks.length;
    for(var i=0;i<len;i++){
      this.fire(callbacks[i], value);
    }
    // Nullify callback arrays to help avoiding memory leaks
    this.rejectedFns = null;
    this.fulfilledFns = null;
  }
}

Promise.prototype['otherwise'] = Promise.prototype.fail;
Promise.prototype['catch'] = Promise.prototype.fail;

/*
export class PromiseQueue {
  private promises : Promise[];
  
  constructor(...promises:Promise[]){
    this.promises = promises;
  }
  
  abort(){
    _.invoke(this.promises, 'abort');
  }
  
  then(cb:()=>void){
    Gnd.Util.asyncForEachSeries(this.promises, function(promise, done){
      promise && promise.then(done);
    }, cb)
  }
}
*/

}

