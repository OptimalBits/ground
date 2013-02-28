/**
  Ground Web Framework (c) 2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Store interface
*/

module Gnd.Storage.Store {
  export interface IStore {
    get(key: string): any;
    put(key: string, doc: any): void;
    del(key: string): void;
    allKeys(): string[];
  }
}
