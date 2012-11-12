/**
  Local Storage Cache.
  
  This Object spawns a cache mechanism on top of the Local Storage.
  
  It acts as a middle layer between the local storage and the user.
  Every key written includes a timestamp that is later used for 
  the LRU replacement policy.
  
  The API mimics local storage API so that it is as interchangeble
  as possible, the main differences is that instead of key() it 
  provides each() for faster iteration, and there are no getters
  and setters using [] syntax, it just provides getItem and setItem.
  
  Impl. Notes:
  The Cache keeps a map object for quick translation of given
  key to special key+timestamp in the local storage.
  This cache is converted to an array and sorted when room
  is needed. This conversion is a candidate for optimization.
*/

/// <reference path="../third/underscore.browser.d.ts" />

import Base = module('./base');

// TODO: factorize storage into a generic storage interface.
var ls = localStorage;

export class Cache extends Base.Base {
  private maxSize : number;
  private size : number = 0;
  private map : {};
  private length : number = 0;
  
  constructor(maxSize? : number = 5*1024*1024){ 
    super();
    this.populate();
  }
  /**
    Iterate thru the cached keys.
  */
  each(cb){
    var result;
    for(var key in this.map){
      result = cb(key);
      if(result) return result;
    }
  }
  
  getItem(key){
    var old = this.map[key], value;
    if(old){
      value = ls[this.key(key, old.time)];
      value && this.setItem(key, value); // Touch to update timestamp.
    }
    return value;
  }
  
  setItem(key, value){
    var time = Date.now(), old = this.map[key], requested = value.length;
    
    if(old){
      requested -= old.size;
    }
    if(this.makeRoom(requested)){
      this.size += requested;
    
      ls[this.key(key, time)] = value;

      if(old){
        // Avoid remove the set item
        if(old.time != time){ 
          this.remove(key, old.time);
        }
      }else{
        this.length++;
      }
      this.map[key] = {time:time, size:value.length};
    }
  }
  
  removeItem(key){
    var item = this.map[key];
    if(item){
      this.remove(key, item.time);
      this.size -= item.size;
      delete this.map[key];
      this.length--;
    }
  }
  
  clear(){
    for(var key in this.map){
      this.removeItem(key);
    }
    this.length = 0;
    this.size = 0;
  }
  
  setMaxSize(size){
    this.maxSize = size;
  }
  
  private key(key, timestamp){
    return key+'|'+timestamp;
  }
  
  private remove(key, timestamp){
    var key = this.key(key,timestamp);
    delete ls[key];
  }
  
  private populate(){
    var i, len, key, s, k, size;
    this.size = 0;
    this.map = {};
    for (i=0, len=ls.length;i<len;i++){
      key = ls.key(i);
      if (key.indexOf('|') != -1){
        size = ls[key].length;
        s = key.split('|');
        // avoid possible duplicated keys due to previous error
        k = s[0];
        if(!this.map[k] || this.map[k].time > s[1]){
          this.map[k] = {time : s[1], size : size}
        }
        this.size += size;
      }
    }
    this.length = _.size(this.map);
  }
  
  //
  // Remove items until required size is available
  //
  private makeRoom(size){
    var target = this.maxSize - size;
    if(this.size > target){
      if(target<0){
        return false;
      }else{
        // TODO: We need to optimize this.(move to populate and keep sorted in order).
        var list = _.map(this.map, function(item, key){return {time:item.time, key:key}});
        var sorted = _.sortBy(list, function(item){return item.time;});
        var index = sorted.length-1;
    
        while ((this.size > target) && (index >= 0)){
          this.removeItem(sorted[index--].key);
        }
      }
    }
    return true;
  }
}
