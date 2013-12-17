/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage implementation using socket.io
*/

/// <reference path="storage.ts" />
/// <reference path="../util.ts" />

/**
  @module Gnd
  @submodule Storage
*/
module Gnd.Storage {
  /**
    Implementation of the IStorage interface using sockets (Socket.io).
  
    This class is used internally by the framework to communicate with its
    server side counterpart {{#crossLink "SocketBackend"}}{{/crossLink}}
  
    @class Storage.Socket
    @uses Storage.IStorage
    @constructor
    @param socket {Socket} A socket.io client instance.
  */
export class Socket implements IStorage {
  private socket : any;
  
  /**
    A safe emit wrapper for socket.io that handles connection errors as well
    as wait for connections and/or reconnections.
    
    @method safeEmit
    @static
  */
  static safeEmit<T>(socket, ...args:any[]): Promise<T>
  {
    var promise = new Promise<T>();
   
    function errorFn(){
      promise.reject(Error('Socket disconnected'));
    };
  
    function proxyCb(err, res){
      socket.removeListener('disconnect', errorFn);
      if(err){
        promise.reject(Error(err));
      }else{
        promise.resolve(res);
      }
    };
  
    args.push(proxyCb);
  
    function emit(){
      socket.once('disconnect', errorFn);
      socket.emit.apply(socket, args);
    }
  
    function delayedEmit(connectedEvent, failedEvent){
      var removeListeners = function(){
        socket.removeListener(connectedEvent, succeedFn);
        socket.removeListener(failedEvent, errorFn);
        socket.removeListener('error', errorFn);
      }
      
      var errorFn = function(){
        removeListeners();
        promise.reject(Error('Socket connection failed'));
      }
      var succeedFn = function(){
        removeListeners();
        emit();
      }
    
      socket.on(connectedEvent, succeedFn);
      socket.on(failedEvent, errorFn);
      socket.on('error', errorFn);
    }
  
    if(socket.socket.connected){
      emit()
    }else if(socket.socket.connecting){
      delayedEmit('connect', 'connect_failed');
    }else if(socket.socket.reconnecting){
      delayedEmit('reconnect', 'reconnect_failed');
    }else{
      errorFn();
    }
  
    return promise;
  }
  
  constructor(socket){
    this.socket = socket;
  }
  
  create(keyPath: string[], doc: any): Promise<string>
  {
    return Socket.safeEmit<string>(this.socket, 'create', keyPath, doc);
  }
  
  put(keyPath: string[], doc: any): Promise<void>
  {
    delete doc['_id'];
    return Socket.safeEmit(this.socket, 'put', keyPath, doc);
  }
  
  fetch(keyPath: string[]): Promise<any>
  {
    return Socket.safeEmit(this.socket, 'get', keyPath);
  }
  
  del(keyPath: string[]): Promise<void>
  {
    return Socket.safeEmit(this.socket, 'del', keyPath);
  }
  
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}): Promise<void>
  {
    return Socket.safeEmit<void>(this.socket, 'add', keyPath, itemsKeyPath, itemIds);
  }

  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}): Promise<void>
  {
    return Socket.safeEmit<void>(this.socket, 'remove', keyPath, itemsKeyPath, itemIds);
  }
  
  find(keyPath: string[], query: {}, options: {}): Promise<any[]>
  {
    return Socket.safeEmit<any[]>(this.socket, 'find', keyPath, query, options);
  }
  
  all(keyPath: string[], query: {}, opts: {}): Promise<any[]>
  {
    return Socket.safeEmit(this.socket, 'all', keyPath, query, opts)
  }
  
  deleteItem(keyPath: string[], id: string, opts: {}): Promise<void>
  {
    return Socket.safeEmit(this.socket, 'deleteItem', keyPath, id, opts);
  }

  insertBefore(keyPath: string[], id: string, itemKeyPath: string[], opts): Promise<{id: string; refId: string;}>
  {
   return Socket.safeEmit(this.socket, 'insertBefore', keyPath, id, itemKeyPath, opts);
  }
}
}
