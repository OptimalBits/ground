/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage implementation using socket.io
*/

/// <reference path="storage.ts" />
/// <reference path="../util.ts" />

module Gnd.Storage {

export class Socket implements IStorage {
  private socket : any;
  
  constructor(socket){
    this.socket = socket;
  }
  
  create(keyPath: string[], doc: any): Promise
  {
    return Gnd.Util.safeEmit(this.socket, 'create', keyPath, doc);
  }
  
  put(keyPath: string[], doc: any): Promise
  {
    delete doc['_id'];
    return Gnd.Util.safeEmit(this.socket, 'put', keyPath, doc);
  }
  
  fetch(keyPath: string[]): Promise
  {
    return Gnd.Util.safeEmit(this.socket, 'get', keyPath);
  }
  
  del(keyPath: string[]): Promise
  {
    return Gnd.Util.safeEmit(this.socket, 'del', keyPath);
  }
  
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void): void
  {
    Gnd.Util.safeEmit(this.socket, 'add', keyPath, itemsKeyPath, itemIds).then(cb, cb);
  }

  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void): void
  {
    Gnd.Util.safeEmit(this.socket, 'remove', keyPath, itemsKeyPath, itemIds)
      .then(cb, cb);
  }
  
  find(keyPath: string[], query: {}, options: {}, cb: (err?: Error, result?: any[]) => void): void
  {
    Gnd.Util.safeEmit(this.socket, 'find', keyPath, query, options)
      .then((result)=>{cb(null, result)}).fail(cb);
  }
  
  all(keyPath: string[], query: {}, opts: {}, cb: (err?: Error, result?: IDoc[]) => void) : void
  {
    Gnd.Util.safeEmit(this.socket, 'all', keyPath, query, opts)
      .then((result)=>{cb(null, result)}).fail(cb);
  }
  
  next(keyPath: string[], id: string, opts: {}, cb: (err: Error, doc?:IDoc) => void)
  {
    Gnd.Util.safeEmit(this.socket, 'next', keyPath, id, opts)
      .then((result)=>{cb(null, result)}).fail(cb);
  }

  deleteItem(keyPath: string[], id: string, opts: {}, cb: (err?: Error) => void)
  {
    Gnd.Util.safeEmit(this.socket, 'deleteItem', keyPath, id, opts).then(cb, cb);
  }

  insertBefore(keyPath: string[], id: string, itemKeyPath: string[], opts, cb: (err: Error, id?: string, refId?: string) => void)
  {
    // BROKEN DUE TO safeEmit not being able to send more than one parameter right now
    // Hack (in case of several args, embedd in an array)
    Gnd.Util.safeEmit(this.socket, 'insertBefore', keyPath, id, itemKeyPath, opts)
      .then((result)=>{cb(null, result)}).fail(cb);
  }
}
}
