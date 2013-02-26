/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Socket.io server backend.
*/

/// <reference path="../server.ts" />
/// <reference path="../third/socket.io.d.ts" />

function scb(cb){
  return function(){
    if(arguments[0]){
      arguments[0] = arguments[0].message;
    }
    cb && cb.apply(null, arguments);
  }
}

module Gnd {
export class SocketBackend {
  constructor(socketManager: any, server: Server){
    
    socketManager.on('connection', function(socket){
    
      socket.on('create', function(keyPath: string[], doc: {}, cb: (err: string, key?: string) => void){
        server.storage.create(keyPath, doc, scb(cb));
      });
    
      socket.on('put', function(keyPath: string[], doc: {}, cb: (err?: string) => void){
        server.storage.put(keyPath, doc, scb(cb));
      });
    
      socket.on('get', function(keyPath: string[], cb: (err?: string, doc?: {}) => void){
        server.storage.fetch(keyPath, scb(cb));
      });
    
      socket.on('del', function(keyPath: string[], cb: (err?: string) => void){
        server.storage.del(keyPath, scb(cb));
      });
    
      // Collections / Sets
      socket.on('add', function(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: string) => void){
        console.log(arguments);
        server.storage.add(keyPath, itemsKeyPath, itemIds, {}, scb(cb));
      });
    
      socket.on('remove', function(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: string) => void){
        server.storage.remove(keyPath, itemsKeyPath, itemIds, {}, scb(cb));
      });

      socket.on('find', function(keyPath: string[], query: {}, options: {}, cb: (err: string, result: {}[]) => void){
        server.storage.find(keyPath, query, options, scb(cb));
      })
    
      // Sequences
      socket.on('all', function(keyPath: string[], query: {}, opts: {}, cb: (err: string, result: {}[]) => void){
        server.storage.all(keyPath, query, opts, scb(cb));
      });
      socket.on('next', function(keyPath: string[], id: string, opts, cb: (err: string, doc?:IDoc) => void){
        server.storage.next(keyPath, id, opts, scb(cb));
      });
      socket.on('deleteItem', function(keyPath: string[], id: string, opts, cb: (err: string) => void){
        server.storage.deleteItem(keyPath, id, opts, scb(cb));
      });
      socket.on('insertBefore', function(keyPath: string[], id: string, itemKeyPath: string[], opts, cb: (err?: string, id?: string) => void){
        server.storage.insertBefore(keyPath, id, itemKeyPath, opts, scb(cb));
      });
    });
  }
}

}
