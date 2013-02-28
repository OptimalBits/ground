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
  export class MemoryStore implements IStore {
    store = {};
    get(key: string): any {
      return this.store[key];
    }
    put(key: string, doc: any): void {
      this.store[key] = doc;
    }
    del(key: string): void {
      delete this.store[key];
    }
    allKeys(): string[] {
      return _.keys(this.store);
    }
  }
}
