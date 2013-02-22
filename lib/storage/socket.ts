/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage implementation using socket.io
*/

/// <reference path="../storage.ts" />
/// <reference path="../util.ts" />

module Gnd.Storage {

export class Socket implements IStorage {
  private socket : any;
  
  constructor(socket){
    this.socket = socket;
  }
  
  create(keyPath: string[], doc: any, cb: (err: Error, key: string) => void): void
  {
    Gnd.Util.safeEmit(this.socket, 'create', keyPath, doc, cb);
  }
  
  put(keyPath: string[], doc: any, cb: (err?: Error) => void): void
  {
    delete doc['_id'];
    Gnd.Util.safeEmit(this.socket, 'put', keyPath, doc, cb);
  }
  
  fetch(keyPath: string[], cb: (err?: Error, doc?: any) => void): void
  {
    Gnd.Util.safeEmit(this.socket, 'get', keyPath, cb);
  }
  
  del(keyPath: string[], cb: (err?: Error) => void): void
  {
    Gnd.Util.safeEmit(this.socket, 'del', keyPath, cb);
  }
  
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void): void
  {
    Gnd.Util.safeEmit(this.socket, 'add', keyPath, itemsKeyPath, itemIds, cb);
  }

  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void): void
  {
    Gnd.Util.safeEmit(this.socket, 'remove', keyPath, itemsKeyPath, itemIds, cb);
  }
  
  find(keyPath: string[], query: {}, options: {}, cb: (err: Error, result: any[]) => void): void
  {
    Gnd.Util.safeEmit(this.socket, 'find', keyPath, query, options, cb);
  }
  
  // insert(keyPath: string[], index:number, doc:{}, cb: (err: Error) => void)
  // {
  //   Gnd.Util.safeEmit(this.socket, 'insert', keyPath, index, doc, cb);
  // }
  // 
  // extract(keyPath: string[], index:number, cb: (err: Error) => void)
  // {
  //   Gnd.Util.safeEmit(this.socket, 'extract', keyPath, index, cb);
  // }
  
  all(keyPath: string[], query: {}, opts: {}, cb: (err: Error, result: any[]) => void) : void
  {
    Gnd.Util.safeEmit(this.socket, 'all', keyPath, query, opts, cb);
  }
  
  first(keyPath: string[], opts: {}, cb: (err: Error, keyPath: string[]) => void)
  {
    Gnd.Util.safeEmit(this.socket, 'first', keyPath, opts, cb);
  }
  last(keyPath: string[], opts: {}, cb: (err: Error, keyPath: string[]) => void)
  {
    Gnd.Util.safeEmit(this.socket, 'last', keyPath, opts, cb);
  }
  // next(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err?: Error, doc?:{}) => void)
  next(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, keyPath: string[]) => void)
  {
    Gnd.Util.safeEmit(this.socket, 'next', keyPath, refItemKeyPath, opts, cb);
  }
  prev(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, keyPath?: string[]) => void)
  {
    Gnd.Util.safeEmit(this.socket, 'prev', keyPath, refItemKeyPath, opts, cb);
  }
  // pop(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  // {
  //   Gnd.Util.safeEmit(this.socket, 'pop', keyPath, opts, cb);
  // }
  // shift(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  // {
  //   Gnd.Util.safeEmit(this.socket, 'shift', keyPath, opts, cb);
  // }
  deleteItem(keyPath: string[], itemKeyPath: string[], opts: {}, cb: (err?: Error) => void)
  {
    Gnd.Util.safeEmit(this.socket, 'deleteItem', keyPath, itemKeyPath, opts, cb);
  }
  // push(keyPath: string[], itemKeyPath: string[], opts, cb: (err?: Error) => void)
  // {
  //   Gnd.Util.safeEmit(this.socket, 'push', keyPath, itemKeyPath, opts, cb);
  // }
  // unshift(keyPath: string[], itemKeyPath: string[], opts, cb: (err?: Error) => void)
  // {
  //   Gnd.Util.safeEmit(this.socket, 'unshift', keyPath, itemKeyPath, opts, cb);
  // }
  insertBefore(keyPath: string[], refItemKeyPath: string[], itemKeyPath: string[], opts, cb: (err?: Error) => void)
  {
    Gnd.Util.safeEmit(this.socket, 'insertBefore', keyPath, refItemKeyPath, itemKeyPath, opts, cb);
  }
  // insertAfter(keyPath: string[], refItemKeyPath: string[], itemKeyPath: string[], opts, cb: (err?: Error) => void)
  // {
  //   Gnd.Util.safeEmit(this.socket, 'insertAfter', keyPath, refItemKeyPath, itemKeyPath, opts, cb);
  // }

}
}
