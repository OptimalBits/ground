/**
  Ground Web Framework (c) 2011-2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Synchronization
  
  This class handles automatic synchronization of objects between
  the server and the clients. 
  
  Any object fullfilling the ISynchronizable interface can be added to
  this class to get automatic synchronization support.
  
  The Manager keeps a data structure with all the instantiated
  models and their IDs.
*/

/// <reference path="../base.ts" />
/// <reference path="../storage/socket.ts" />

module Gnd.Sync {

/**
  An abstract class representing a synchronizable object.
*/
export interface ISynchronizable extends ISettable
{
  isKeptSynced:() => bool;
  getKeyPath:() => string[];
  emit:(event: string, ...params: any[]) => void;
};

export class Manager extends Base {
  private socket;
  private docs: { 
    [key: string]: ISynchronizable[];
  } = {};
  private cleanUpFn: ()=>void;
  
  constructor(socket)
  {
    super();
    
    this.socket = socket;
        
    var connectFn = () => {
      var socket = this.socket;
      
      // Call re-sync for all models in this manager...
      _.each(this.docs, (docs: Sync.ISynchronizable[], id?: string) => {
        var doc = docs[0];
        
        // TODO: send also the current __rev, if newer in server, 
        // get the latest doc.
        Gnd.Util.safeEmit(socket, 'sync', doc.getKeyPath()).then(() => {
          console.log('Syncing %s', doc.getKeyPath().join('.'))
        });
        
        // OBSOLETE? if done according to new 'sync'
        Gnd.Util.safeEmit(socket, 'resync', doc.getKeyPath()).then((newdoc) => {
          for(var i=0, len=docs.length; i<len; i++){
            docs[i].set(newdoc, {nosync: true});
          }
        });
      });
    }
    
    //
    // Socket Listeners
    //
    var updateFn = (keyPath, args) => {
      console.log("Received update", keyPath, args);
      var key = keyPathToKey(keyPath);
      
      _.each(this.docs[key], function(doc: Base){
        doc.set(args, {nosync: true});
      });
    };
  
    socket.on('update:', updateFn);
    
    var deleteFn = keyPath => {
      console.log("Received delete", keyPath);
      var key = keyPathToKey(keyPath);
      _.each(this.docs[key], function(doc){
        doc.emit('deleted:', doc); // rename event to 'delete:' ?
      });
    };
    
    socket.on('delete:', deleteFn);
    
    var addFn = (keyPath, itemsKeyPath, itemIds) => {
      console.log("Received add", keyPath, itemsKeyPath, itemIds);
      var key = keyPathToKey(keyPath);
      notifyObservers(this.docs[key], 'add:', itemsKeyPath, itemIds);
    }
     
    socket.on('add:', addFn);
    
    var removeFn = (keyPath, itemsKeyPath, itemIds) => {
      console.log("Received remove", keyPath, itemsKeyPath, itemIds);
      var key = keyPathToKey(keyPath);
      notifyObservers(this.docs[key], 'remove:', itemsKeyPath, itemIds);
    }
    
    socket.on('remove:', removeFn);

    var insertBeforeFn = (keyPath, id, itemKeyPath, refId) => {
      console.log("Received insert", keyPath, id, itemKeyPath, refId);
      var key = keyPathToKey(keyPath);
      notifyObservers(this.docs[key], 'insertBefore:', id, itemKeyPath, refId);
    }
    
    socket.on('insertBefore:', insertBeforeFn);

    var deleteItemFn = (keyPath, id) => {
      console.log("Received deleteItem", keyPath, id);
      var key = keyPathToKey(keyPath);
      notifyObservers(this.docs[key], 'deleteItem:', id);
    }
    
    socket.on('deleteItem:', deleteItemFn);
    
    socket.once('connect', connectFn);
    socket.on('reconnect', connectFn);
    
    this.cleanUpFn = () => {
      var off = _.bind(socket.removeListener, socket);
      
      // Remove connection listeners
      off('connect', connectFn);
      off('reconnect', connectFn);
      
      // Remove event listeners.
      off('update:', updateFn);
      off('delete:', deleteFn);
      off('add:', addFn);
      off('remove:', removeFn);
      off('insertBefore', insertBeforeFn);
      off('deleteItem', deleteItemFn);
    } 
  }
  
  destroy()
  {
    this.cleanUpFn();
    super.destroy();
  }
  
  /**
    Starts synchronization for a given model.
  */
  startSync(doc: Sync.ISynchronizable)
  {
    var 
      key = docKey(doc),
      socket = this.socket;
    
    if(!this.docs[key]){
      this.docs[key] = [doc];
      
      Gnd.Util.safeEmit(this.socket, 'sync', doc.getKeyPath()).then(() => {
        console.log('Start synching:'+doc.getKeyPath());
      });
    }else{
      this.docs[key].push(doc);
    }
    // Should'nt we keep all the instance of a model up-to-date?
  }
  
  /**
    Ends synchronization for a given model.
  */
  endSync(doc: Sync.ISynchronizable)
  {
    if (!doc.isKeptSynced()) return;

    var 
      key = docKey(doc),
      socket = this.socket,
      docs = this.docs[key];
    
    if(docs){
      docs = _.reject(docs, function(item){return item === doc;});
      if(docs.length===0){
        console.log('Stop synching:'+key);
        Gnd.Util.safeEmit(this.socket, 'unsync', doc.getKeyPath()).then(() => {
          console.log('Stop synching:'+doc.getKeyPath());
        });
        delete this.docs[key];
      }else{
        this.docs[key] = docs;
      }
    }
  }  
}

function notifyObservers(...args:any[]){
  var args = Array.prototype.slice.call(arguments, 0);
  var observers = _.first(args);
  if(observers){
    for(var i=0; i<observers.length; i++){
      observers[i].emit.apply(observers[i], _.rest(args));
    }
  }
}

function keyPathToKey(keyPath: string[]){
  return keyPath.join(':');
}

function docKey(doc: ISynchronizable){
  return keyPathToKey(doc.getKeyPath());
}

}

