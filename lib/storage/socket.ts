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
  
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}): Promise
  {
    return Gnd.Util.safeEmit(this.socket, 'add', keyPath, itemsKeyPath, itemIds);
  }

  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}): Promise
  {
    return Gnd.Util.safeEmit(this.socket, 'remove', keyPath, itemsKeyPath, itemIds);
  }
  
  find(keyPath: string[], query: {}, options: {}): Promise
  {
    return Gnd.Util.safeEmit(this.socket, 'find', keyPath, query, options);
  }
  
  all(keyPath: string[], query: {}, opts: {}): Promise
  {
    return Gnd.Util.safeEmit(this.socket, 'all', keyPath, query, opts)
  }
  
  deleteItem(keyPath: string[], id: string, opts: {}): Promise
  {
    return Gnd.Util.safeEmit(this.socket, 'deleteItem', keyPath, id, opts);
  }

  insertBefore(keyPath: string[], id: string, itemKeyPath: string[], opts): Promise
  {
   return Gnd.Util.safeEmit(this.socket, 'insertBefore', keyPath, id, itemKeyPath, opts);
  }
}
}
