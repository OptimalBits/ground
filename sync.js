/**
  Server Synchronization module for Ground Models and Collections.

  Requires NodeJS >= 0.6.10
  
  Uses Redis PubSub in order to provide scalability, any number of socket.io 
  servers can be deployed, as long as they have access to a common redis server,
  the synchronization will work transparently between them.
  
  (c) 2011-2012 OptimalBits with selected parts from the internet
  dual licensed as public domain or MIT.
*/

/**
  CRUD (Create-Update-Delete):
  ============================
  
  (update) PUT /displays/id {body}
  
  (delete) DELETE /display/id
    
  (add) PUT /playlists/playlistId/playlets/playletId
  
  (remove) DELETE /playlists/playlistId/playlets/playletId {id/body}
  
*/

var sync = function(pubClient, subClient, sockets, sio){
  var self = this;
    
  this.pubClient = pubClient;
    
  if(sockets){
    if(!sio){
      sio = sockets;
    }
    
    sio.on('connection', function(socket){
      console.log("Socket %s connected in the Sync Module", socket.id);
      socket.on('sync', function(id){
        if(self.check){
          if (self.check(socket.id, id)){
            socket.join(id);
          }
        }else{
          console.log("Socket %s started synchronization for id:%s",socket.id, id);
          socket.join(id);
        }
      });
    
      socket.on('unsync', function(id){
        console.log("Socket %s stopped synchronization for id:%s", socket.id, id);
        socket.leave(id);
      });
    });

    subClient.subscribe('delete:');
    subClient.on('message', function(channel, id){
      sio.in(id).emit(channel+id, id);
    });
  
    subClient.psubscribe('add:*')
    subClient.psubscribe('remove:*');
    subClient.psubscribe('update:*');

    subClient.on('pmessage', function(pattern, channel, msg){
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
      // TODO: Implement except to avoid the sender to receive the message it sent
      // Note that this has the implication that if you have several instances of one
      // model or connection in the same browser, they will not be notificated, so
      // some kind of intra model notification will be needed (Model Factory?)
    });
  }
}

sync.prototype.update = function(id, doc){
  this.pubClient.publish('update:'+id, JSON.stringify(doc));
}

sync.prototype.delete = function(id){
  this.pubClient.publish('delete:', id);
}

sync.prototype.add = function(objId, bucket, ids){
  this.pubClient.publish('add:'+objId+':'+bucket, JSON.stringify(ids));
}

sync.prototype.remove = function(objId, bucket, ids){
  this.pubClient.publish('remove:'+objId+':'+bucket, JSON.stringify(ids));
}

exports = module.exports = sync; 

