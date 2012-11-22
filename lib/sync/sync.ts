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

/// <reference path="../third/underscore.browser.d.ts" />

import Base = module('./base');
import Socket = module('../storage/socket');


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

export class Manager extends Base.Base {
  private socket;
  private objs: {}; // objs: {id: ISynchonizable[]} [];
  private connectFn: ()=>void;
  
  constructor(socket)
  {
    super();
    
    this.objs = {}; // {id:[model, ...]}
    
    this.connectFn = () => {
      var socket = this.socket;
      
      // Call re-sync for all models in this manager...
      _.each(this.objs, (models, id) => {
        var model = models[0];
        
        // we need to re-sync here since we have a new socket sid. (TODO: integrate in resync).
        socket.emit('sync', id);
        
        Socket.safeEmit(socket, 'resync', model._bucket, id, (err, doc) => {
          if(!err){
            doc && (delete doc.cid); // Hack needed since cid is almost always outdated in server.
            for(var i=0, len=models.length; i<len; i++){
              models[i].set(doc, {sync:'false'});
              models[i].id(id);
            }
            // TODO: we should update locally...
            // model.local().update(doc);
          } else {
            console.log('Error resyncing %s@%s, %s', model.__bucket, id, err)
          }
        });
      });
    }
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
      id = model.id(), 
      socket = this.socket;
    
    if(!this.objs[id]){
      this.objs[id] = [model];
      
      socket.emit('sync', id);
      console.log('Start synching:'+id);
      
      socket.on('update:'+id, (doc) => {
        _.each(this.objs[id], function(model){
          model.set(doc, {sync:false, doc:doc});
          //model.local().update(doc);
        });
      });
      socket.on('delete:'+id, function(){
        _.each(this.objs[id], function(model){
          model.local().remove();
          model.emit('deleted:', id);
        });
      });
    }else{
      this.objs[id].push(model);
    }
  }
  
  /**
    Ends synchronization for a given model.
  */
  endSync(model)
  {
    if (!model._keepSynced) return;
    
    var 
      socket = this.socket, 
      id = model.id(),
      models = this.objs[id];
    
    if(models){
      models = _.reject(models, function(item){return item === model;});
      if(models.length===0){
        console.log('Stop synching:'+id);
        socket.emit('unsync', id);
        socket.removeAllListeners('update:'+id);
        socket.removeAllListeners('delete:'+id);
        delete this.objs[id];
      }else{
        this.objs[id] = models;
      }
    }
  }
}

