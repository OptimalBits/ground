/**
  Ground Web Framework (c) 2011-2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Synchronization
  
  This class represents a Model in a MVC architecture.
  The model supports persistent storage, offline and
  automatic client<->server synchronization.
  
  The Manager keeps a data structure with all the instantiated
  models and their IDs.
*/

/// <reference path="../../third/underscore.browser.d.ts" />

import Base = module('../base');

//import Socket = module('../storage/socket');
// import is not working so we copy/paste safeEmit here...
function safeEmit(socket, ...args:any[]): void
{
  var cb = _.last(args);
   
  function errorFn(){
    cb(new Error('Socket disconnected'));
  };
  function proxyCb(err, res){
    socket.removeListener('disconnect', errorFn);
    if(err){
      err = new Error(err);
    }
    cb(err,res);
  };
  
  args[args.length-1] = proxyCb;

 if(socket.socket.connected){
    socket.once('disconnect', errorFn);
    socket.emit.apply(socket, args);
 }else{
    errorFn();
 }
}
var Socket = {safeEmit : safeEmit};

/**
  An abstract class representing a synchronizable object.
*/
/*
interface ISynchronizable
{
  //
  //  KeepSynced - Enables/Disables synchronization.
  //
  keepSynced: bool,
  shouldSync: bool,
  update: noop,
};
*/

function getKeyPath(model){
  return [model.__bucket, model.id()];
}

function keyPathToKey(keyPath: string[]){
  return keyPath.join(':');
}

function modelKey(model){
  return keyPathToKey(getKeyPath(model));
}

export class Manager extends Base.Base {
  private socket;
  private objs: {}; // objs: {id: ISynchonizable[]} [];
  private connectFn: ()=>void;
  
  constructor(socket)
  {
    super();
    
    this.socket = socket;
    this.objs = {}; // {id:[model, ...]}
    
    this.connectFn = () => {
      var socket = this.socket;
      
      // Call re-sync for all models in this manager...
      _.each(this.objs, (models, id) => {
        var model = models[0];
        
        // TODO: send also the current __rev, if newer in server, 
        // get the latest doc.
        Socket.safeEmit(socket, 'sync', getKeyPath(model), function(err){
          if(err){
            console.log('Error syncing %s, %s', getKeyPath(model), err);
          }else{
            console.log('Syncing %s', getKeyPath(model));
          }
        });
        
        // OBSOLETE if done according to new 'sync'
        Socket.safeEmit(socket, 'resync', getKeyPath(model), (err, doc) => {
          if(!err){
            doc && (delete doc.cid); // Hack needed since cid is almost always outdated in server.
            for(var i=0, len=models.length; i<len; i++){
              models[i].set(doc, {sync:'false'});
              models[i].id(id);
            }
            // TODO: we should update locally...
            // model.local().update(doc);
          } else {
            console.log('Error resyncing %s, %s', getKeyPath(model), err)
          }
        });
      });
    }
    
    socket.on('update:', (keyPath, doc) => {
      var key = keyPathToKey(keyPath);
      
      _.each(this.objs[key], function(model){
        model.set(doc, {sync:false, doc:doc});
      });
    });
      
    socket.on('delete:', (keyPath) => {
      var key = keyPathToKey(keyPath);
      _.each(this.objs[key], function(model){
        //model.local().remove();
        model.emit('deleted:', keyPath);
      });
    });
  }
  
  init()
  {
    this.socket.on('connect', this.connectFn);
   // socket.on('reconnect', this._connectFn);
  }
  
  deinit()
  {
    var socket = this.socket;
    if(socket){
      socket.removeListener('connect', this.connectFn);
      socket.removeListener('reconnect', this.connectFn);
    }
  }
  
  /**
    Starts synchronization for a given model.
  */
  startSync(model)
  {
    var 
      key = modelKey(model),
      socket = this.socket;
    
    if(!this.objs[key]){
      this.objs[key] = [model];
      
      Socket.safeEmit(this.socket, 'sync', getKeyPath(model), function(err){
        console.log('Start synching:'+getKeyPath(model));
      });
    }else{
      this.objs[key].push(model);
    }
    // Should'nt we keep all the instance of a model up-to-date?
  }
  
  /**
    Ends synchronization for a given model.
  */
  endSync(model)
  {
    if (!model._keepSynced) return;

    var 
      key = modelKey(model),
      socket = this.socket,
      models = this.objs[key];
    
    if(models){
      models = _.reject(models, function(item){return item === model;});
      if(models.length===0){
        console.log('Stop synching:'+key);
        Socket.safeEmit(this.socket, 'unsync', getKeyPath(model), function(err){
          console.log('Stop synching:'+getKeyPath(model));
        });
        delete this.objs[key];
      }else{
        this.objs[key] = models;
      }
    }
  }  
}

