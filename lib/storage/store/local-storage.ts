/**
  Ground Web Framework (c) 2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Store implementation using HTML5 LocalStorage
*/

/// <reference path="store.ts" />
/// <reference path="../../cache.ts" />

/**
  @module Storage
  @submodule Store
*/
module Gnd.Storage.Store {
  /**
    IStore implementation using HTML5 LocalStorage API.
    
    Note: This store is in fact a cache, when it reaches 1Mb of stored data
    it will start removing keys according to a LRU policy.
  
    @class Storage.Store.LocalStore
    @extends Storage.Store.IStore
  */
  export class LocalStore implements IStore {
    // TODO: Expose the hardcoded cache size to the user somehow...
    private localCache = new Cache(1024*1024); // 1Mb
    get(key: string): any {
      var doc = this.localCache.getItem(key);
      if(doc){
        return JSON.parse(doc);
      }
      return null;
    }
    put(key: string, doc: any): void {
      this.localCache.setItem(key, JSON.stringify(doc));
    }
    del(key: string): void {
      this.localCache.removeItem(key);
    }
    allKeys(): string[] {
      return this.localCache.getKeys();
    }
  }
}
