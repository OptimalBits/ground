/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Socket.io server backend.
*/

/// <reference path="../server.ts" />
/// <reference path="../../third/socket.io.d.ts" />

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
      
      // TODO: Use socket.io authentication mechanism to guarantee there is a session?
      
      server.sessionManager.getSession(socket.handshake.headers.cookie, (err?, session?) => {    
        
        if (!session) return;
        
        socket.on('create', function(keyPath: string[], doc: {}, cb: (err: string, key?: string) => void){
          server.create(session.userId, keyPath, doc, scb(cb));
        });
    
        socket.on('put', function(keyPath: string[], doc: {}, cb: (err?: string) => void){
          server.put(clientId, session.userId, keyPath, doc, scb(cb));
        });
    
        socket.on('get', function(keyPath: string[], cb: (err?: string, doc?: {}) => void){
          server.fetch(session.userId, keyPath, scb(cb));
        });
    
        socket.on('del', function(keyPath: string[], cb: (err?: string) => void){
          server.del(clientId, session.userId, keyPath, scb(cb));
        });
    
        // Collections / Sets
        socket.on('add', function(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: string) => void){
          server.add(clientId, session.userId, keyPath, itemsKeyPath, itemIds, {}, scb(cb));
        });
    
        socket.on('remove', function(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: string) => void){
          server.remove(clientId, session.userId, keyPath, itemsKeyPath, itemIds, {}, scb(cb));
        });

        socket.on('find', function(keyPath: string[], query: {}, options: {}, cb: (err: string, result: {}[]) => void){
          server.find(session.userId, keyPath, query, options, scb(cb));
        });
        
        // Sequences
        socket.on('all', function(keyPath: string[], query: {}, opts: {}, cb: (err: string, result: {}[]) => void){
          server.all(session.userId, keyPath, query, opts, scb(cb));
        });
        socket.on('next', function(keyPath: string[], id: string, opts, cb: (err: string, doc?:IDoc) => void){
          server.next(session.userId, keyPath, id, opts, scb(cb));
        });
        socket.on('deleteItem', function(keyPath: string[], id: string, opts, cb: (err: string) => void){
          server.deleteItem(clientId, session.userId, keyPath, id, opts, scb(cb));
        });
        socket.on('insertBefore', function(keyPath: string[], id: string, itemKeyPath: string[], opts, cb: (err?: string, id?: string, refId?: string) => void){
          server.insertBefore(clientId, session.userId, keyPath, id, itemKeyPath, opts, scb(cb));
        });
      });
    });
  }
}

}
