/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
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
      var clientId = socket.id;
      
      var sessionId = 
        server.sessionManager.getSessionId(socket.handshake.headers.cookie);
      
      var userId = 'guest';

      socket.on('create', function(keyPath: string[], doc: {}, cb: (err: string, key?: string) => void){
        server.sessionManager.getSession(sessionId, function(err?: Error, session?){
          if(!err){
            server.create(session.userId, keyPath, doc, scb(cb));
          }else{
            cb(err.message);
          }
        });
      });
    
      socket.on('put', function(keyPath: string[], doc: {}, cb: (err?: string) => void){
        server.put(clientId, userId, keyPath, doc, scb(cb));
      });
    
      socket.on('get', function(keyPath: string[], cb: (err?: string, doc?: {}) => void){
        server.fetch(userId, keyPath, scb(cb));
      });
    
      socket.on('del', function(keyPath: string[], cb: (err?: string) => void){
        server.del(clientId, userId, keyPath, scb(cb));
      });
    
      // Collections / Sets
      socket.on('add', function(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: string) => void){
        server.add(clientId, userId, keyPath, itemsKeyPath, itemIds, {}, scb(cb));
      });
    
      socket.on('remove', function(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: string) => void){
        server.remove(clientId, userId, keyPath, itemsKeyPath, itemIds, {}, scb(cb));
      });

      socket.on('find', function(keyPath: string[], query: {}, options: {}, cb: (err: string, result: {}[]) => void){
        server.find(userId, keyPath, query, options, scb(cb));
      })
    
      // Sequences
      /*
      socket.on('insert', function(keyPath: string[], index:number, doc:{}, cb: (err: string) => void){
        server.insert(userId, keyPath, index, doc, scb(cb));
      });
    
      socket.on('extract', function(keyPath: string[], index:number, cb: (err: string, doc?:{}) => void){
        server.extract(keyPath, index, scb(cb));
      });
    
      socket.on('all', function(keyPath: string[], cb: (err: string, result: {}[]) => void){
        server.storage.all(keyPath, scb(cb));
      });
      */
    });
  }
}

}
