/**
  Ginger Server Component (c) 2012 Optimal Bits Sweden AB

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
*/

var Sync = require('./sync'),    
    redis = require('redis'),
    util = require('util'),
    _ = require('underscore');

exports = module.exports = function(models, redisPort, redisAddress, sockets, sio){
  var pubClient = redis.createClient(redisPort, redisAddress),
      subClient = redis.createClient(redisPort, redisAddress);
      
  var sync = this.sync = new Sync(pubClient, subClient, sockets, sio);

  function getModel(bucket, cb){
    if(bucket in models){
      return models[bucket];
    } else {
      cb(new Error('Invalid bucket %s', bucket));
      return null;
    }
  }
  
  if(!sio){
    sio = sockets;
  }

  sio.on('connection', function(socket){
    console.log('Connection to:'+socket);
  
    socket.on('create', function(bucket, args, cb){
      var Model = getModel(bucket, cb);
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
  
    socket.on('update', function(bucket, id, args, cb){
      console.log("Update bucket:%s with id:%s and args "+util.inspect(args), 
      bucket, id);
    
      var Model = getModel(bucket, cb);
      if(Model){
        Model.update({_id:id}, args, function(err){
          if(!err){
            sync.update(id, args);
          }
          cb(err);
        });
      }
    });

    socket.on('read', function(bucket, id, cb){
      var Model = getModel(bucket, cb);
      if(Model){
        console.log(Model);
        Model.findById(id).exclude(Model.exclude).run(cb);
      }
    });
  
    socket.on('delete', function(id, cb){
    
    });
  
    socket.on('find', function(bucket, id, collection, query, cb){
      var Model = getModel(bucket, cb);
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
    });
  
    socket.on('add', function(bucket, id, collection, itemIds, cb){
      itemIds = Array.isArray(itemIds)? itemIds:[itemIds];

      if(itemIds.length > 0){
        var Model = getModel(bucket, cb);
        if(Model){
          Model.findById(id, function(err, doc){
            if(err) cb(err);
            else{
              var current = _.map(doc[collection], function(item){ return String(item)}),
                added = _.difference(itemIds, current);
              if(added.length>0){
                doc[collection] = _.union(added, current);
                doc.save(function(err){
                  if(!err){
                    sync.add(id, collection, added);
                  }
                  cb(err);
                });
              }else{
                cb(null);
              }
            }
          });
        }
      }else{
        cb();
      }
    });

    socket.on('remove', function(bucket, id, collection, itemIds, cb){
      itemIds = Array.isArray(itemIds)? itemIds:[itemIds];
      if(itemIds.length > 0){
        var Model = getModel(bucket, cb);
        if(Model){
          Model.findById(id, function(err, doc){
            if(err) cb(err);
            else{
              var current = _.map(doc[collection], function(item){ return String(item)}),
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
      }else{
        cb();
      }  
    });
  });
}
