/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Socket.io server backend.
*/

/// <reference path="../server.ts" />
/// <reference path="../error.ts" />
/// <reference path="../../third/socket.io.d.ts" />

// This functions picks the error message and pass it to socket.io callback ack
function scb(cb){
  return function(){
    if(arguments[0]){
      arguments[0] = arguments[0].message;
    }
    cb && cb.apply(null, arguments);
  }
}

function callback(promise, cb){
  promise.then((val)=>{
    console.log("CALLBACK:"+val);
    cb(null, val);
  }).fail((err)=>{
    cb(err.message)
  });
}
  



module Gnd {
export class SocketBackend {
  constructor(socketManager: any, server: Server){
    
    socketManager.on('connection', function(socket){
      var clientId = socket.id;
      
      // TODO: Use socket.io authentication mechanism to guarantee there is a session?
      
      server.sessionManager.getSession(socket.handshake.headers.cookie, (err?, session?) => {    
        
        socket.on('create', function(keyPath: string[], doc: {}, cb: (err: ServerError, key?: string) => void){
          console.log(clientId+"TRYING TO CREATE");
          console.log("SESSION:"+session);
          if(!session) return cb(ServerError.INVALID_SESSION);
          callback(server.create(session.userId, keyPath, doc), cb);
        });
    
        socket.on('put', function(keyPath: string[], doc: {}, cb: (err?: ServerError) => void){
          if(!session) return cb(ServerError.INVALID_SESSION);
          callback(server.put(clientId, session.userId, keyPath, doc), cb);
        });
    
        socket.on('get', function(keyPath: string[], cb: (err?: ServerError, doc?: {}) => void){
          if(!session) return cb(ServerError.INVALID_SESSION);
          callback(server.fetch(session.userId, keyPath), cb);
        });
    
        socket.on('del', function(keyPath: string[], cb: (err?: ServerError) => void){
          if(!session) return cb(ServerError.INVALID_SESSION);
          callback(server.del(clientId, session.userId, keyPath), cb);
        });
    
        // Collections / Sets
        socket.on('add', function(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: ServerError) => void){
          if(!session) return cb(ServerError.INVALID_SESSION);
          server.add(clientId, session.userId, keyPath, itemsKeyPath, itemIds, {}, scb(cb));
        });
    
        socket.on('remove', function(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: ServerError) => void){
          if(!session) return cb(ServerError.INVALID_SESSION);
          server.remove(clientId, session.userId, keyPath, itemsKeyPath, itemIds, {}, scb(cb));
        });

        socket.on('find', function(keyPath: string[], query: {}, opts: {}, cb: (err: ServerError, result?: {}[]) => void){
          if(!session) return cb(ServerError.INVALID_SESSION);
          server.find(session.userId, keyPath, query, opts, scb(cb));
        });
        
        // Sequences
        socket.on('all', function(keyPath: string[], query: {}, opts: {}, cb: (err: ServerError, result?: {}[]) => void){
          if(!session) return cb(ServerError.INVALID_SESSION);
          server.all(session.userId, keyPath, query, opts, scb(cb));
        });
        socket.on('next', function(keyPath: string[], id: string, opts, cb: (err: ServerError, doc?:IDoc) => void){
          if(!session) return cb(ServerError.INVALID_SESSION);
          server.next(session.userId, keyPath, id, opts, scb(cb));
        });
        socket.on('deleteItem', function(keyPath: string[], id: string, opts, cb: (err: ServerError) => void){
          if(!session) return cb(ServerError.INVALID_SESSION);
          server.deleteItem(clientId, session.userId, keyPath, id, opts, scb(cb));
        });
        socket.on('insertBefore', function(keyPath: string[], id: string, itemKeyPath: string[], opts, cb: (err?: ServerError, id?: string, refId?: string) => void){
          if(!session) return cb(ServerError.INVALID_SESSION);
          server.insertBefore(clientId, session.userId, keyPath, id, itemKeyPath, opts, scb(cb));
        });
      });
    });
  }
}

}
