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

export class SyncHub {
  private pubClient;
  
  constructor(pubClient, subClient, sockets, sio)
  {    
    this.pubClient = pubClient;
    
    if(sockets){
      if(!sio){
        sio = sockets;
      }
    
      sio.on('connection', (socket) => {
        console.log("Socket %s connected in the Sync Module", socket.id);
        socket.on('sync', function(keyPath){
          var id = keyPath.join(':');
          if(this.check){
            if (this.check(socket.id, keyPath)){
              socket.join(id);
            }
          }else{
            console.log("Socket %s started synchronization for id:%s",socket.id, keyPath);
            socket.join(id);
          }
        });
    
        socket.on('unsync', function(keyPath){
          var id = keyPath.join(':');
          console.log("Socket %s stopped synchronization for id:%s", socket.id, id);
          socket.leave(id);
        });
      });

      subClient.subscribe('delete:');
      subClient.subscribe('update:');
      subClient.on('message', (channel, msg) => {
        var args = JSON.parse(msg);
        var id = args.keyPath.join(':');
                
        switch(channel) 
        {
          case 'update:':
            sio.in(id).emit('update:'+id, args.doc);
           break;
        
          case 'delete:': 
            sio.in(id).emit('delete:'+id, args.keyPath);
           break;
        }
      });
  
      subClient.psubscribe('add:*')
      subClient.psubscribe('remove:*');
      subClient.psubscribe('update:*');

      subClient.on('pmessage', (pattern, channel, msg) => {
        var comps = channel.split(':'), 
            cmd = comps[0],
            objId = comps[1],
            bucket = comps[2];

        msg = JSON.parse(msg);
    
        if(pattern === 'update:*'){
          sio.in(objId).emit(cmd+':'+objId, msg);
        }else{
          sio.in(objId).emit(cmd+':'+objId+':'+bucket, msg);
        }
        // TODO: Implement "except" to avoid the sender to receive the message it sent
        // Note that this has the implication that if you have several instances of one
        // model or connection in the same browser, they will not be notificated, so
        // some kind of intra model notification will be needed (Model Factory?)
      });
    }
  }

  update(keyPath: string[], doc:{}){
    var args = {keyPath:keyPath, doc: doc};
    this.pubClient.publish('update:', JSON.stringify(args));
  }

  delete(keyPath){
    var args = {keyPath:keyPath};
    this.pubClient.publish('delete:', JSON.stringify(args));
  }

  add(keyPath: string[], itemsKeyPath: string[], itemIds: string[]){
    var args = {keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds: itemIds};
    this.pubClient.publish('add:', JSON.stringify(args));
  }

  remove(keyPath: string[], itemsKeyPath: string[], itemIds: string[]){
    var args = {keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds: itemIds};
    this.pubClient.publish('remove:', JSON.stringify(args));
  }
  
  insert(keyPath, index, obj){
    
  }
  
  extract(keyPath, index){
    
  }
}

