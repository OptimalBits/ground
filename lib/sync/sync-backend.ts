/**
  Ground Web Framework (c) 2011-2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Synchronization Backend
  
  Uses Redis PubSub in order to provide scalability, any number of socket.io 
  servers can be deployed, as long as they have access to a common redis server,
  the synchronization will work transparently between them.
  
  The Manager keeps a data structure with all the instantiated
  models and their IDs.
*/

/// <reference path="../log.ts" />
/// <reference path="../../third/underscore.d.ts" />

module Gnd.Sync {
export class Hub {
  private pubClient;
  
  constructor(pubClient, subClient?, sockets?, sio?)
  {    
    this.pubClient = pubClient;
    
    if(sockets){
      if(!sio){
        sio = sockets;
      }

      sio.on('connection', (socket) => {
        log("Socket %s connected in the Sync Module", socket.id);
        
        socket.on('observe', function(keyPath: string[], cb:(err?: Error) => void){
          
          log("Request to start observing:", keyPath);
          
          if(!Array.isArray(keyPath)){
            cb && cb(new TypeError("keyPath must be a string[]"));
          }else{
            var id = keyPath.join(':');
            
            if(this.check){
              if (this.check(socket.id, keyPath)){
                socket.join(id);
              }
            }else{
              log("Socket %s started synchronization for id:%s", socket.id, keyPath);
              socket.join(id);
            }
            cb();
          }
        });
    
        socket.on('unobserve', function(keyPath: string[], cb:(err?: Error) => void){
          var id = keyPath.join(':');
          socket.leave(id);
          log("Socket %s stopped synchronization for id:%s", socket.id, id);
          cb();
        });
      });

      subClient.subscribe('update:');
      subClient.subscribe('delete:');
      subClient.subscribe('add:');
      subClient.subscribe('remove:');
      subClient.subscribe('insertBefore:');
      subClient.subscribe('deleteItem:');
      
      subClient.on('message', (channel, msg) => {
        var args = JSON.parse(msg);
        
        if(!_.isArray(args.keyPath)){
          log("Error: keyPath must be an array:", args.keyPath);
          return;
        }
        var id = args.keyPath.join(':');
        var clientId = args.clientId;
                
        //var room = sio.in(id).except(args.clientId);
        log("About to emit: ", channel, args);
        switch(channel)
        {
          case 'update:':
            sio.in(id).except(clientId).emit('update:', args.keyPath, args.doc);
            break;
          case 'delete:': 
            sio.in(id).except(clientId).emit('delete:', args.keyPath);
            break;
          case 'add:':
            sio.in(id).except(clientId).emit('add:', args.keyPath, args.itemsKeyPath, args.itemIds);
            break;
          case 'remove:':
            sio.in(id).except(clientId).emit('remove:', args.keyPath, args.itemsKeyPath, args.itemIds);
            break;
          case 'insertBefore:':
            sio.in(id).except(clientId).emit('insertBefore:', args.keyPath, args.id, args.itemKeyPath, args.refId);
            break;
          case 'deleteItem:':
            sio.in(id).except(clientId).emit('deleteItem:', args.keyPath, args.id);
            break;
        }
      });
    }
  }

  update(clientId: string, keyPath: string[], doc:{}){
    var args = {keyPath:keyPath, doc: doc, clientId: clientId};
    this.pubClient.publish('update:', JSON.stringify(args));
  }

  delete(clientId: string, keyPath){
    var args = {keyPath:keyPath, clientId: clientId};
    this.pubClient.publish('delete:', JSON.stringify(args));
  }

  add(clientId: string, keyPath: string[], itemsKeyPath: string[], itemIds: string[]){
    var args = {keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds: itemIds, clientId: clientId};
    this.pubClient.publish('add:', JSON.stringify(args));
  }

  remove(clientId: string, keyPath: string[], itemsKeyPath: string[], itemIds: string[]){
    var args = {keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds: itemIds, clientId: clientId};
    this.pubClient.publish('remove:', JSON.stringify(args));
  }
  
  insertBefore(clientId: string, keyPath: string[], id: string, itemKeyPath: string[], refId: string)
  {
    var args = {keyPath: keyPath, id: id, itemKeyPath: itemKeyPath, refId: refId, clientId: clientId};
    log('insertBefore-synchub', args);
    this.pubClient.publish('insertBefore:', JSON.stringify(args));
  }

  deleteItem(clientId: string, keyPath: string[], id: string)
  {
    var args = {keyPath: keyPath, id: id, clientId: clientId};
    log('deleteItem-synchub', args);
    this.pubClient.publish('deleteItem:', JSON.stringify(args));
  }
}

}
