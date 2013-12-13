/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Promise Module. Minimal promise implementation.
*/
/// <reference path="base.ts" />

module Gnd {
"use strict";

function isPromise(promise){
  return (promise instanceof Object) && (promise.then instanceof Function);
}

// TODO: Use local event queue to guarantee that all callbacks are called 
// in the same turn in the proper order.
//export class Promise<T> {

var CancelError = Error('Operation Cancelled');

/**
  Promise implementation of http://dom.spec.whatwg.org/#promises

  @class Promise
  @extends Base
  @constructor
  @param [value] {Any}
 **/
export class Promise<T> extends Base
{
  fulfilledFns : any[] = [];
  rejectedFns: any[] = [];
  _value : any;
  reason: Error;
  isFulfilled : boolean;
  
  
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
      counter = len,
      promise = new Promise<U[]>(),
      results = []; results.length = len;
    
    if(!len){
      promise.resolve(results);
    }
    
    for(var i=0; i<len; i++){
      ((index) => {
        fn(elements[index]).then((result) => {
          results[index] = result;
          counter--;
          if(counter === 0){
            promise.resolve(results);
          }
        }, (err) => promise.reject(err));
      })(i);
    }
  
    return promise;
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
    var promise = new Promise<void>();
    var timeout = setTimeout(()=>promise.resolve(), ms);
    promise.fail(()=>clearTimeout(timeout));
    return promise;
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
  
  /**
    Creates an already resolved promise
    
    @method resolved
    @static
    @param value {Any} Value to use as resolved value.
    @return {Promise} A resolved promise.
  **/
  static resolved<U>(value?: U): Promise<U>
  {
    return (new Promise()).resolve(value);
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
    return new Promise(err);
  }
  
  constructor(value?: any)
  {
    super();
    
    if(value instanceof Error){
      this.reject(value);
    }else if(value){
      this.resolve(value);
    }
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
    var promise = new Promise();
    
    var wrapper = (fn, reject?: boolean) => {
      if(!(fn instanceof Function)){
        fn = (value) => {
          if(reject) throw(value); 
          return value
        };
      }
      return (value) => {
        try{
          var result = fn(value);
          if(isPromise(result)){
            result.then((val) => { 
              promise.resolve(val);
            }, (err) => {
              promise.reject(err);
            });
          }else{
            promise.resolve(result);
          }
        }catch(err){
          promise.reject(err);
          if(err !== CancelError){
            console.log(err.stack);
          }
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
    
    return promise;
  }
  
  /**
    This method is syntactic sugar for then when only caring about a promise
    rejection.
    
    @method fail
    @param onRejected {Function}
  **/
  fail<U>(onRejected?: (reason: Error) => any): Promise<U>
  {
    return this.then(null, onRejected || ()=>{});
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
  
  /**
    Resolves the promise with the given value.
  
    @method resolve
    @param value {Any} value to resolve this promise with.
    @chainable
  */
  resolve(value?: T): Promise<T>
  {
    if(this.isFulfilled) return;
    this.isFulfilled = true;
    
    this._value = value || null;
    this.fireCallbacks(this.fulfilledFns, value);
    return this;
  }

  /**
    Resolves the promise with the given value.

    @method reject
    @param reason {Error} value to resolve this promise with.
    @chainable
  */
  reject(reason: Error): Promise<T>
  {
    if(this.isFulfilled) return;
    this.isFulfilled = true;
    
    this.reason = reason || null;
    this.fireCallbacks(this.rejectedFns, reason);
    return this;
  }
  
  /**
    Cancels the promise (rejects with reason CancelError)
    
    @chainable
  **/
  cancel()
  {
    return this.reject(CancelError);
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
  }
}

Promise.prototype['otherwise'] = Promise.prototype.fail;

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

