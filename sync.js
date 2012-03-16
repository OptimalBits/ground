/**
  Server Synchronization module for GingerJS Models.

  Requires NodeJS >= 0.6.10
  
  Uses Redis PubSub in order to provide scalability, any number of socket.io 
  servers can be deployed, as long as they have access to a common redis server,
  the synchronization will work transparently between them.
  

  TODO:
    - Circular updates fix.
    - Lock Mechanism.

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

var sync = function(pubClient, subClient, sio, sockets){
  var self = this;
    
  this.pubClient = pubClient;
    
  if(sio){
    if(!sockets){
      sockets = sio.sockets;
    }
    
    sockets.on('connection', function(socket){
      console.log("Socket %s connected in the Sync Module", socket.id);
      socket.on('sync', function(id){
        if(self.check){
          if (check(socket.id, id)){
            socket.join(id);
          }
        }else{
          console.log("Socket %s started synchronization for id:%s",socket.id, id);
          socket.join(String(id));
        }
      });
    
      socket.on('unsync', function(id){
        console.log("Socket %s stopped synchronization for id:%s", socket.id, id);
        socket.leave(id);
      });
    });

    subClient.subscribe('delete:');

    subClient.on('message', function(channel, msg){
      sockets.in(msg._id).emit(channel+msg._id, msg);
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
        sockets.in(objId).json.emit(cmd+':'+objId, msg);
      }else{
        sockets.in(objId).emit(cmd+':'+objId+':'+bucket, msg);
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

