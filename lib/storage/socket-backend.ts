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
  constructor(socketManager: any, server: Gnd.Server){
    
    socketManager.on('connection', function(socket){
    
      socket.on('create', function(keyPath: string[], doc: {}, cb: (err: string, key?: string) => void){
        server.storage.create(keyPath, doc, scb(cb));
      });
    
      socket.on('put', function(keyPath: string[], doc: {}, cb: (err?: string) => void){
        server.storage.put(keyPath, doc, scb(cb));
      });
    
      socket.on('get', function(keyPath: string[], cb: (err?: string, doc?: {}) => void){
        server.storage.get(keyPath, scb(cb));
      });
    
      socket.on('del', function(keyPath: string[], cb: (err?: string) => void){
        server.storage.del(keyPath, scb(cb));
      });
    
      // Collections / Sets
      socket.on('add', function(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: string) => void){
        server.storage.add(keyPath, itemsKeyPath, itemIds, scb(cb));
      });
    
      socket.on('remove', function(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: string) => void){
        server.storage.remove(keyPath, itemsKeyPath, itemIds, scb(cb));
      });

      socket.on('find', function(keyPath: string[], query: {}, options: {}, cb: (err: string, result: {}[]) => void){
        server.storage.find(keyPath, query, options, scb(cb));
      })
    
      // Sequences
      socket.on('insert', function(keyPath: string[], index:number, doc:{}, cb: (err: string) => void){
        server.storage.insert(keyPath, index, doc, scb(cb));
      });
    
      socket.on('extract', function(keyPath: string[], index:number, cb: (err: string, doc?:{}) => void){
        server.storage.extract(keyPath, index, scb(cb));
      });
    
      socket.on('all', function(keyPath: string[], cb: (err: string, result: {}[]) => void){
        server.storage.all(keyPath, scb(cb));
      });
    });
  }
}

}
