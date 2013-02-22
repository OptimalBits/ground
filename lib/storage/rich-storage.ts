
/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage Module. Include classes and interfaces for the storage subsystem.
*/

/// <reference path="../storage.ts" />

module Gnd {
export class RichStorage implements IStorage {
  private storage: IStorage;
  constructor(storage: IStorage){
    this.storage = storage;
  }
  
  create(keyPath: string[], doc: {}, cb: (err: Error, key?: string) => void)
  {
    this.storage.create(keyPath, doc, cb);
  }
  put(keyPath: string[], doc: {}, cb: (err?: Error) => void)
  {
    this.storage.put(keyPath, doc, cb);
  }
  fetch(keyPath: string[], cb: (err?: Error, doc?: {}) => void)
  {
    this.storage.fetch(keyPath, cb);
  }
  del(keyPath: string[], cb: (err?: Error) => void)
  {
    this.storage.del(keyPath, cb);
  }
  link(keyPath: string[], targetKeyPath: string[], cb: (err?: Error) => void)
  {
    this.storage.link(keyPath, targetKeyPath, cb);
  }
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void)
  {
    this.storage.add(keyPath, itemsKeyPath, itemIds, opts, cb);
  }
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void)
  {
    this.storage.remove(keyPath, itemsKeyPath, itemIds, opts, cb);
  }
  find(keyPath: string[], query: {}, opts: {}, cb: (err: Error, result: any[]) => void)
  {
    this.storage.find(keyPath, query, opts, cb)
  }
  all(keyPath: string[], query: {}, opts: {}, cb: (err: Error, result: any[]) => void) 
  {
    this.storage.all(keyPath, query, opts, cb)
  }

  first(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  {
    this.storage.first(keyPath, opts, cb)
  }
  last(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  {
    this.storage.last(keyPath, opts, cb)
  }
  // next(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  next(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, keyPath?:string[]) => void)
  {
    this.storage.next(keyPath, refItemKeyPath, opts, cb)
  }
  prev(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  {
    this.storage.prev(keyPath, refItemKeyPath, opts, cb)
  }
  pop(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  {
    throw Error('not implemented');
  }
  shift(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  {
    throw Error('not implemented');
  }
  deleteItem(keyPath: string[], itemKeyPath: string[], opts: {}, cb: (err?: Error) => void)
  {
    this.storage.deleteItem(keyPath, itemKeyPath, opts, cb);
  }
  push(keyPath: string[], itemKeyPath: string[], opts:{}, cb: (err?: Error) => void)
  {
    throw Error('not implemented');
  }
  unshift(keyPath: string[], itemKeyPath: string[], opts:{}, cb: (err?: Error) => void)
  {
    throw Error('not implemented');
  }
  insertBefore(keyPath: string[], refItemKeyPath: string[], itemKeyPath: string[], opts: {}, cb: (err?: Error) => void)
  {
    this.storage.insertBefore(keyPath, refItemKeyPath, itemKeyPath, opts, cb);
  }
  insertAfter(keyPath: string[], refItemKeyPath: string[], itemKeyPath: string[], opts: {}, cb: (err?: Error) => void)
  {
    throw Error('not implemented');
  }
}

}
