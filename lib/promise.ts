/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Promise Module. Minimal promise implementation.
*/
/// <reference path="util.ts" />

module Gnd {

function isPromise(promise){
  return (promise instanceof Object) && (promise.then instanceof Function);
}

// TODO: Use local event queue to guarantee that all callbacks are called 
// in the same turn in the proper order.
export class Promise {
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
  
  constructor(value?: any)
  {
    if(value instanceof Error){
      this.reject(value);
    }else if(value){
      this.resolve(value);
    }
  }
  
  then(onFulfilled: any, onRejected?: any);
  then(onFulfilled: (value: any) => any, onRejected?: (reason: Error) => any){
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
  
  error(onRejected: (reason: Error) => any)
  {
    return this.then(null, onRejected);
  }
  
  resolveOrReject(err?: Error, value?: any)
  {
    if(err) this.reject(err);
    else this.resolve(value);
  }
  
  resolve(value?:any): Promise
  {
    if(this.isFulfilled) return;
    this.abort();
    
    this.value = value || null;
    this.fireCallbacks(this.fulfilledFns, value);
    return this;
  }
  
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

