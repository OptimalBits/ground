/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Promise Module. Minimal promise implementation.
*/
/// <reference path="util.ts" />

module Gnd {
  
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
    Gnd.Util.asyncForEachSeries(this.promises, function(promise, done){
      promise && promise.then(done);
    }, cb)
  }
}

}

