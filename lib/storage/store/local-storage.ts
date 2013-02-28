/**
  Ground Web Framework (c) 2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Store implementation using HTML5 LocalStorage
*/

/// <reference path="store.ts" />
/// <reference path="../../cache.ts" />

module Gnd.Storage.Store {
  export class LocalStore implements IStore {
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
