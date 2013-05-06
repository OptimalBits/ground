/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Promise Module. Minimal promise implementation.
*/
/// <reference path="util.ts" />
/// <reference path="base.ts" />


module Gnd {

function isPromise(promise){
  return (promise instanceof Object) && (promise.then instanceof Function);
}

// TODO: Use local event queue to guarantee that all callbacks are called 
// in the same turn in the proper order.
//export class Promise<T> {

export class Promise extends Base
{
  fulfilledFns : any[] = [];
  rejectedFns: any[] = [];
  value : any;
  reason: Error;
  isFulfilled : bool;
  
  static map(elements: any[], fn: (item)=>Promise): Promise
  {
    elements = _.isArray(elements) ? elements : [elements];
    
    var
      len = elements.length,
      counter = len,
      promise = new Promise(),
      results = []; results.length = len;
    
    if(!len){
      promise.resolve(results);
    }
    
    for(var i=0; i<len; i++){
      fn(elements[i]).then((result)=>{
        results[i] = result;
        counter--;
        if(counter === 0){
          promise.resolve(results);
        }
      }, (err) => {
        promise.reject(err);
      });
    }
  
    return promise;
  }
  
  static resolved(): Promise
  {
    return new Promise(true);
  }
  
  static rejected(err: Error): Promise
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

/*  
  // Declaration using generics (typescript >= 0.9.0)
  then(onFulfilled: (value: T) => void, onRejected?: (reason: Error) => void): Promise
  then<U>(onFulfilled: (value: T) => Promise<U>, onRejected?: (reason: Error) => void): Promise<U>
  then<U>(onFulfilled: (value: T) => U, onRejected?: (reason: Error) => void): Promise<U>
  */
  then(onFulfilled: (value: any) => void, onRejected?: (reason: Error) => void): Promise;
  then(onFulfilled: (value: any) => Promise, onRejected?: (reason: Error) => void): Promise;
  then(onFulfilled: (value: any) => any, onRejected?: (reason: Error) => void): Promise
  {
    var promise = new Promise();
    
    var wrapper = (fn, reject?: bool) => {
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
            }, (err) =>{
              promise.reject(err);
            });
          }else{
            promise.resolve(result);
          }
        }catch(err){
          promise.reject(err);
          console.log(err.stack);
        }
      }
    }
    
    if(!_.isUndefined(this.value)){
      this.fire(wrapper(onFulfilled), this.value);
    }else if(!_.isUndefined(this.reason)){
      this.fire(wrapper(onRejected, true), this.reason);
    }else{   
      this.fulfilledFns.push(wrapper(onFulfilled));
      this.rejectedFns.push(wrapper(onRejected, true));
    }
    
    return promise;
  }
  
  fail(onRejected?: (reason: Error) => any)
  {
    return this.then(null, onRejected || Util.noop);
  }
  
  resolveOrReject(err?: Error, value?: any)
  {
    if(err) this.reject(err);
    else this.resolve(value);
  }
  
  //resolve(value?: T): Promise<T>
  resolve(value?: any): Promise
  {
    if(this.isFulfilled) return;
    this.abort();
    
    this.value = value || null;
    this.fireCallbacks(this.fulfilledFns, value);
    return this;
  }
  
  //reject(reason: Error): Promise<T>  
  reject(reason: Error): Promise
  {
    if(this.isFulfilled) return;
    this.abort();
    
    this.reason = reason || null;
    this.fireCallbacks(this.rejectedFns, reason);
    return this;
  }
  
  abort(){
    this.isFulfilled = true;
  }
  
  private fireNext(cb, value){
    var stack = (new Error())['stack'];
     
    Util.nextTick(() => {
      cb.call(this, value);
    });
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

}

