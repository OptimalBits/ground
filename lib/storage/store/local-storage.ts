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
    @constructor
    
    @param [useSession=false] Specifies if session storage should be used instead of defaul local storage.
    @param [maxSize=1024*1024] Max size to be used in the storage in bytes.
    When the storage gets filled it works as a LRU cache removing old entries. 
  */
  export class LocalStore implements IStore {
    // TODO: Expose the hardcoded cache size to the user somehow...
    private localCache;
    
  
    constructor(useSession?: boolean, maxSize?: number){
      useSession = _.isUndefined(useSession) ? false : useSession;
      this.localCache = new Cache(useSession, maxSize || 1024*1024); // 1Mb
    }
    
    get(key: string): any {
      var doc = this.localCache.getItem(key);
      if(doc){
        try{
          return JSON.parse(doc);
        }catch(e){
          console.log('localCache inconsistency encountered: '+key);
          return null;
        }
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
