/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage implementation using socket.io
*/

/// <reference path="../third/underscore.browser.d.ts" />

import Storage = module('../storage');

/**
  A safe emit wrapper for socket.io that handles connection errors.
*/
function safeEmit(socket, ...args:any[]): void
{
  var cb = _.last(args);
   
  function errorFn(){
    cb(new Error('Socket disconnected'));
  };
  function proxyCb(err, res){
    socket.removeListener('disconnect', errorFn);
    if(err){
      err = new Error(err);
    }
    cb(err,res);
  };
  
  args[args.length-1] = proxyCb;

 if(socket.socket.connected){
    socket.once('disconnect', errorFn);
    socket.emit.apply(socket, args);
 }else{
    errorFn();
 }
}

export class Socket implements Storage.IStorage {
  private socket : any;
  
  constructor(socket){
    this.socket = socket;
  }
  
  create(keyPath: string[], doc: any, cb: (err: Error, key: string) => void): void
  {
    safeEmit(this.socket, 'create', keyPath, doc, cb);
  }
  
  put(keyPath: string[], doc: any, cb: (err?: Error) => void): void
  {
    safeEmit(this.socket, 'put', keyPath, doc, cb);
  }
  
  get(keyPath: string[], cb: (err?: Error, doc?: any) => void): void
  {
    safeEmit(this.socket, 'get', keyPath, cb);
  }
  
  del(keyPath: string[], cb: (err?: Error) => void): void
  {
    safeEmit(this.socket, 'del', keyPath, cb);
  }
  
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: Error) => void): void
  {
    safeEmit(this.socket, 'add', keyPath, itemsKeyPath, itemIds, cb);
  }

  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: Error) => void): void
  {
    safeEmit(this.socket, 'remove', keyPath, itemsKeyPath, itemIds, cb);
  }
  
  find(keyPath: string[], query: {}, options: {}, cb: (err: Error, result: any[]) => void): void
  {
    safeEmit(this.socket, 'find', keyPath, query, options, cb);
  }
  
  insert(keyPath: string[], index:number, doc:{}, cb: (err: Error) => void)
  {
    safeEmit(this.socket, 'insert', keyPath, index, doc, cb);
  }
  
  extract(keyPath: string[], index:number, cb: (err: Error) => void)
  {
    safeEmit(this.socket, 'extract', keyPath, index, cb);
  }
  
  all(keyPath: string[], cb: (err: Error, result: any[]) => void) : void
  {
    safeEmit(this.socket, 'all', keyPath, cb);
  }
}




