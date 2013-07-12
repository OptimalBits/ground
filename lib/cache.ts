/**
  Local Storage Cache.
  
  This Object spawns a cache mechanism on top of the Local Storage.
  
  It acts as a middle layer between the local storage and the user.
  Every value written includes a timestamp that is later used for 
  the LRU replacement policy.
  
  The API mimics local storage API so that it is as interchangeble
  as possible, the main differences is that instead of key() it 
  provides each() for faster iteration, and there are no getters
  and setters using [] syntax, it just provides getItem and setItem.
  
  Impl. Notes:
  The Cache keeps a map object for quick translation of given
  key to special key+timestamp in the local storage.
  Additionally an index is used to keep track of the order of the
  elements in the cache
*/

/// <reference path="base.ts" />

interface IndexElem {
  next: number;
  prev: number;
  key: string;
}

class Index {
  private index : IndexElem[];
  private tail : IndexElem;
  private first : number;
  private last : number;

  private unusedKeys : number[];

  constructor(){ 
    this.tail = {
      prev: 0,
      next: 0,
      key: ''
    };
    this.index = [this.tail];
    this.first = this.last = 0;
    this.unusedKeys = [];
  }

  // get an unused index for new elements
  private newIdx() {
    if (this.unusedKeys.length > 0) {
      return this.unusedKeys.pop();
    } else {
      return this.index.length;
    }
  }
    
  // Insert key first in the index
  addKey(key: string) : number {
    var elem = {
      prev : this.last, // circular
      next : this.first,
      key : key
    };

    var idx = this.newIdx();
    this.index[idx] = elem;

    var firstElem = this.index[this.first];
    var lastElem = this.index[this.last];

    firstElem.prev = idx;
    lastElem.next = idx; // circular

    this.first = idx;
    return idx;
  }

  // Touch an element and put it first in the index
  touch(idx: number) : number {
    var key = this.remove(idx);
    return this.addKey(key);
  }

  // Remove element idx from the index
  remove(idx: number) : string {
    // don't allow removal of tail
    if (idx === 0) return null;

    var elem = this.index[idx];
    var nextElem = this.index[elem.next];
    var prevElem = this.index[elem.prev];

    // remove elem from list
    nextElem.prev = elem.prev;
    prevElem.next = elem.next;

    // handle edge cases
    if (idx === this.first) {
      this.first = elem.next;
    } else if (idx === this.last) {
      this.last = elem.prev;
    }

    // mark the index as unused
    this.unusedKeys.push(idx);

    return elem.key;
  }

  // Get the last element in the index
  getLast() : string {
    if (this.first === this.last) {
      return null;
    } else {
      // return last element (element before tail)
      return this.index[this.tail.prev].key;
    }
  }
}

module Gnd {

export class Cache extends Base {
  private maxSize : number;
  private size : number = 0;
  private map : {};
  private index : Index;
  private length : number = 0;
  
  constructor(maxSize?: number){ 
    super();
    this.maxSize = maxSize || 5*1024*1024;
    this.populate();
  }
  /**
    Iterate through the cached keys.
  */
  each(cb){
    var result;
    for(var key in this.map){
      result = cb(key);
      if(result) return result;
    }
  }
  
  getKeys(): string[]{
    return _.keys(this.map);
  }

  private serialize(time, value): string {
    return time + '|' + value;
  }

  private deserialize(str:string): {time:number; value:string;} {
    var i;
    if(_.isString(str)) {
      i = str.indexOf('|'); // first occurrence
      if(i > -1) {
        return {
          time: +str.slice(0,i),
          value: str.slice(i+1)
        };
      }
    }
    return {
      time: -1,
      value: undefined
    };
  }
  
  getItem(key){
    var old = this.map[key], tVal, value;
    if(old){
      tVal = this.deserialize(localStorage[key]);
      value = tVal.value;
      value && this.setItem(key, value); // Touch to update timestamp.
    }
    return value;
  }
  
  setItem(key, value){
    var time = Date.now();
    var old = this.map[key];
    value = String(value);
    var requested = value.length;
    var idx;
    
    if(old){
      requested -= old.size;
    }
    if(this.makeRoom(requested)){
      this.size += requested;
    
      localStorage[key] = this.serialize(time, value);

      if(old){
        idx = old.idx;
        this.index.touch(idx);
      }else{
        this.length++;
        idx = this.index.addKey(key);
      }
      this.map[key] = {
        size: value.length,
        idx: idx
      };
    }
  }
  
  removeItem(key){
    var item = this.map[key];
    if (item){
      this.remove(key);
      this.size -= item.size;
      delete this.map[key];
      this.length--;

      this.index.remove(item.idx);
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
  
  private remove(key){
    delete localStorage[key];
  }
  
  private populate(){
    var ls = localStorage;
    var that = this;
    var i, len, key, tVal, size, list = [];
    this.size = 0;
    this.map = {};
    this.index = new Index();
    for (i=0, len=ls.length;i<len;i++){
      key = ls.key(i);
      tVal = this.deserialize(ls[key]);
      if(tVal.value) {
        size = tVal.value.length;
        list.push({
          time: tVal.time,
          key: key
        });  

        this.map[key] = {
          size: size
        };
        this.size += size;
      }
    }

    // sort keys by timestamp (old->new)
    var sorted = _.sortBy(list, function(item){
      return item.time;
    });
    // add keys to index
    _.each(sorted, function(elem) {
      var idx = that.index.addKey(elem.key);
      that.map[elem.key].idx = idx;
    });

    this.length = _.size(this.map);
  }
  
  //
  // Remove items until required size is available
  //
  private makeRoom(size){
    var target = this.maxSize - size;
    var last;
    if(this.size > target){
      if(target < 0){
        return false;
      }else{
        last = this.index.getLast();
        while (this.size > target) {
          if (last === null) return false;
          this.removeItem(last);
          last = this.index.getLast();
        }
      }
    }
    return true;
  }
}

} // Module Gnd
