/**
  Ground Server Component (c) 2012 Optimal Bits Sweden AB

  This componet provides a generic server for ginger models and collections.
  It uses socket.io for communication, Redis for pubSub and MongoDB for 
  database and persistence. Mongoose is also used for defining and accessing
  models.
  
  This server component is scalable, an unlimited number of instances of 
  this server can be started on demand if needed.
  
  API:
  
  The api is specified in the following format: 
    srcEvent:(inputParams):(outputParams) -> dstEvent:(params)
  
  Create a new document in the database:
  'create' : (bucket, args) : (err, objectId)
  
  Updates an existing document in the database:
  'update' : (bucket, id, args) : (err) -> 'update:id':(args)
  
  Reads an existing document from the database:
  'read'   : (bucket, id) : (err, doc)
  
  Find documents in the database:
  'find' : (bucket, id, query) : (err, res)
  
    query is an object with the following fields:
      collection - which collection to use for the query.
      fields - which fields to return.
      cond - Conditions to fullfill (this must to be specified)
      options - such as skip and limit (for enabling pagination, etc).
  
  Adds existing documents to a collection
  'add' : (bucket, id, collection, itemIds) : (err) -> 'add:id:collection', (itemIds)
  
  Remove existing documents from a collection
  'remove' : (bucket, id, collection, itemIds) : (err) -> 'remove:id:collection', (itemIds)
  
  Deletes an existing document from the database:
  'remove' : (bucket, id) : (err) -> 'delete:id's
  
  Integration Notes:
  
  Collections are represented as an array of Ids. This array of Ids can be part of some other 
  model in a field 1), or it can be a ids of standalone documents 2). In this case, membership of
  the collection is represented by having a field of the kind "parentId", where the item belongs
  to.
  
  Arrays of embedded documents cannot be used for representing collections.
  
  A Model that includes a collection as in type 1 only needs to name the field with the collection
  name. If the model uses type 2 collection, then a static method with the with the parent field
  for the model part of the collection is necessary:
  
  Animal.static('parent', function(){ return 'zooId' });
  
  TODO: We need a more robust parameter check to avoid unexpected crashes.
  
*/

var Sync = require('./sync'),    
    redis = require('redis'),
    util = require('util'),
    _ = require('underscore');
    
var Server = function(models, redisPort, redisAddress, sockets, sio){
  var pubClient = redis.createClient(redisPort, redisAddress),
      subClient = redis.createClient(redisPort, redisAddress),
      self = this;
  
  self.models = models;
  
  var sync = self.sync = new Sync(pubClient, subClient, sockets, sio);
  
  if(!sio){
    sio = sockets;
  }

  sio.on('connection', function(socket){
    console.log('Connection to:'+socket);
    console.log('////////////////////////////////////////////////');

    socket.on('create', function(bucket, args, cb){
      var Model = self._getModel(bucket, cb);
      if(Model){
        var instance = new models[bucket](args);
        instance.save(function(err){
          if(err){
            cb(err);
          }else{
            cb(null, instance._id);
          }
        });
      }
    });
  
    socket.on('resync', function(bucket, id, cb){
      console.log('helo');
      self.read(bucket, id, cb);
    });

    socket.on('update', function(bucket, id, args, cb){
      console.log("Update bucket:%s with id:%s and args %s",
        bucket, 
        id,
        util.inspect(args));
      self.update(bucket, id, args, cb);
    });
    
    socket.on('embedded:update', function(parent, parentId, bucket, id, args, cb){
      console.log("Update embedded doc in parent:%s, id:%s bucket:%s with id:%s and args %s",
        parent,
        parentId,
        bucket,
        id);
      self.embeddedUpdate(parent, parentId, bucket, id, args, cb);
    });

    socket.on('read', function(){self.read.apply(self, Array.prototype.slice.call(arguments))});
  
    socket.on('delete', function(id, cb){
      // TODO: Implement (deletes a model).
    });
  
    socket.on('find', function(){self.find.apply(self, Array.prototype.slice.call(arguments))});
    //
    // Add items to a collection.
    //
    socket.on('add', function(bucket, id, collection, itemIds, cb){
      itemIds = Array.isArray(itemIds)? itemIds:[itemIds];
     
      if(itemIds.length > 0){
        var Collection = self.models[collection];
        if(Collection && Collection.parent){
          var doc = {};
          doc[Collection.parent()] = id;
          Collection.update({ _id : { $in : itemIds }}, doc, function(err){
            if(!err){
              // TODO: Only notify for really added items
              sync.add(id, collection, itemIds);
            }
            cb(err);
          });
        }else{
          var Model = self._getModel(bucket, cb);
          if(Model){
            if(Model.gnd && Model.gnd.add){
              Model.gnd.add(id, collection, itemIds, function(err, ids){
                if(!err){
                  sync.add(id, collection, itemIds);
                }
                cb(err, ids);
              });
            }else{
              var setdef = {}, items = itemIds;
            
              setdef[collection] = {$each:items}
              Model.update({_id:id}, { $addToSet: setdef}, function(err){
                if(!err){
                  // We should only notify for new added objects and not existing ones.
                  sync.add(id, collection, items);
                }
                cb(err);
              });
            }
          }
        }
      }
    });
    
    socket.on('remove', function(bucket, id, collection, itemIds, cb){ 
      var Model;
      switch(arguments.length){
        case 3:
          cb = collection;
          console.log(cb);
          Model = self._getModel(bucket, cb);
          if(Model){
            // TODO: Use findAndModify to avoid sending delete msg for already deleted documents.
            Model.remove({_id:id}, function(err){
              if(!err){
                sync.delete(id);
              }
              cb && cb(err);
            });
          }
          break;    
        case 5:
          itemIds = Array.isArray(itemIds) ? itemIds:[itemIds];
          if(itemIds.length > 0){
            Model = self._getModel(bucket, cb);
            if(Model){
              if(Model.gnd && Model.gnd.remove){
                Model.gnd.remove(id, collection, itemIds, function(err){
                  if(!err){
                    // We should only notify for really removed objects.
                    sync.remove(id, collection, itemIds);
                  }
                  cb(err);
                });
              }else{
                Model.findById(id, function(err, doc){
                  if(err){
                    cb(err);
                  }else{
                    var current = _.map(doc[collection], function(item){return String(item)}),
                      removed = _.intersection(current, itemIds);
                    if(removed.length>0){
                      doc[collection] = _.without(current, removed);
                      doc.save(function(err){
                        if(!err){
                          sync.remove(id, collection, removed);
                        }
                        cb(err);
                      });
                    }else{
                      cb(null);
                    }
                  }
                })
              }
            }
          }else{
            cb();
          }
        }   
    });
  });
}

function shouldUpdate(keys, args, doc){
  //  if(!doc.__rev || (doc.__rev == args.__rev)){
  for(var i=0, len=keys.length;i<len;i++){
    var key = keys[i];
    if(_.isEqual(args[key], doc[key]) == false){
      return true;
    }
  }
  return false;
}

// 
/*
  TODO: Use revisions TO AVOID infinite loops
  When updating, a revision is sent together with the updated args.
  If the revision is different than the one in storage and the field 
  to change is really necessary to change, then a conflict
  is generated, the client will get a "conflict" message back with the
  full object as it is in the database.
  Oherwise the client will get the new effective revision number.
*/
Server.prototype.update = function(bucket, id, args, cb){
  var self = this;
  var Model = self._getModel(bucket, cb);
  if(Model){  
    //console.log(args);
    var keys = _.keys(args);
    Model.findById(id, keys, function(err, doc){
      if(!err && doc && shouldUpdate(keys, args, doc)){
        var query = {_id:id};
        /*
          if(doc.__rev){
            query.__rev = args.__rev;
          }
        */
        Model.update(query, {$set:args, $inc:{'__rev':1}}, function(err){
          if(!err){
            self.sync.update(id, args);
          }
          cb(err);
        }); 
      }else{
        cb(err);
      }
    });
  }
}

Server.prototype.embeddedUpdate = function(parent, parentId, bucket, id, args, cb){
  var self = this;
  var Model = self._getModel(parent, cb);
  if(Model){  
    Model.findById(parentId, function(err, doc){
      var edocs = doc[bucket];
      if(edocs){
        var edoc = edocs.id(id);
        if(shouldUpdate(_.keys(args), args, edoc)){
          _.extend(edoc, args);
          doc.save(function(err){
            if(!err){
              self.sync.update(id, args);
            }
            cb(err);
          });
        }          
      }else{
        cb(new Error('Invalid bucket '+bucket))
      }
    });
  }
}

Server.prototype.find = function(bucket, id, collection, query, cb){
  var self = this;
  var Model = self._getModel(bucket, cb);
  if(Model){
    if(collection){
      if(Model.get){
        Model.get(id, collection, query, cb);
      }else{
        query = query?query:{};
        Model
          .findById(id)
          .populate(collection, query.fields, query.cond, query.options)
          .run(function(err, doc){
            if(err){
              cb(err);
            }else{
              cb(null, doc[collection]);
            }
          });
      }
    }else{
      Model.find(function(err, docs){
        cb(err, docs);
      });
    }
  }
}

Server.prototype.read = function(bucket, id, cb){
  self = this;
  var Model = self._getModel(bucket, cb);
  if(Model){
    console.log('trololol', bucket, id);
    Model.findById(id).exclude(Model.exclude).run(cb);
  }
};

Server.prototype._getModel = function(bucket, cb){
  var models = this.models;
  if(bucket in models){
    return models[bucket];
  } else {
    var err = new Error('Invalid bucket '+ util.inspect(bucket));
    console.log(err.stack);
    cb && cb('Invalid bucket '+ bucket);
    return null;
  }
}

exports = module.exports = Server;


