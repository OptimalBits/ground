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
  
  all(keyPath: string[], query: {}, opts: {}, cb: (err: Error, result: IDoc[]) => void) : void
  {
    Gnd.Util.safeEmit(this.socket, 'all', keyPath, query, opts, cb);
  }
  
  next(keyPath: string[], id: string, opts: {}, cb: (err: Error, doc?:IDoc) => void)
  {
    Gnd.Util.safeEmit(this.socket, 'next', keyPath, id, opts, cb);
  }

  deleteItem(keyPath: string[], id: string, opts: {}, cb: (err?: Error) => void)
  {
    Gnd.Util.safeEmit(this.socket, 'deleteItem', keyPath, id, opts, cb);
  }

  insertBefore(keyPath: string[], id: string, itemKeyPath: string[], opts, cb: (err: Error, id?: string) => void)
  {
    Gnd.Util.safeEmit(this.socket, 'insertBefore', keyPath, id, itemKeyPath, opts, cb);
  }
}
}
