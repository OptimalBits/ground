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

var sync = function(subClient, pubClient, sio, sockets){
  this.pubClient = pubClient;
  
  if(!sockets){
    sockets = sio.sockets;
  }
  
  sio.on('connection', function(socket){
    console.log("Connected in the Sync Module");
    socket.on('sync', function(id){
      if(check){
        if (check(socket.id, id)){
          socket.join(id);
        }
      }else{
        console.log("Socket started synchronization for id:"+id);
        socket.join(id);
      }
    });
    
    socket.on('unsync', function(id){
      socket.leave(id);
    });
  });

  
  subClient.subscribe('delete:');

  subClient.psubscribe('add:*')
  subClient.psubscribe('remove:*');
  subClient.psubscribe('update:*');

  subClient.on('message', function(channel, msg){
    sockets.in(msg._id).emit(channel+msg._id, msg);
  });

  subClient.on('pmessage', function(pattern, channel, msg){
    var comps = channel.split(':'), 
        cmd = comps[0],
        objId = comps[1],
        bucket = comps[2];
    
    if(pattern === 'update:*'){
      sockets.in(msg._id).emit(cmd+':'+objId, JSON.parse(msg));
    }else{
      sockets.in(objId).emit(cmd+':'+bucket, msg);
    }
  });
}

sync.prototype.update = function(id, doc){
  this.pubClient.publish('update:'+id, JSON.stringify(doc));
}

sync.prototype.delete = function(id){
  this.pubClient.publish('delete:', id);
}

sync.prototype.add = function(objId, bucket, id){
  this.pubClient.publish('add:'+objId+':'+bucket, id);
}

sync.prototype.remove = function(objId, bucket, id){
  this.pubClient.publish('remove:'+objId+':'+bucket, id);
}

exports = module.exports = sync; 

