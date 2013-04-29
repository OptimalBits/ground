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
  private connectFn: ()=>void;
  
  constructor(socket)
  {
    super();
    
    this.socket = socket;
        
    this.connectFn = () => {
      var socket = this.socket;
      
      // Call re-sync for all models in this manager...
      _.each(this.docs, (docs: Sync.ISynchronizable[], id?: string) => {
        var doc = docs[0];
        
        // TODO: send also the current __rev, if newer in server, 
        // get the latest doc.
        Gnd.Util.safeEmit(socket, 'sync', doc.getKeyPath()).then(() => {
            console.log('Syncing %s', doc.getKeyPath());
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
    socket.on('update:', (keyPath, args) => {
      var key = keyPathToKey(keyPath);
      
      _.each(this.docs[key], function(doc: Base){
        doc.set(args, {nosync: true});
      });
    });
      
    socket.on('delete:', (keyPath) => {
      var key = keyPathToKey(keyPath);
      _.each(this.docs[key], function(doc){
        // doc.emit('deleted:', keyPath); // rename event to 'delete:' ?
        doc.emit('deleted:', doc); // rename event to 'delete:' ?
      });
    });
        
    socket.on('add:', (keyPath, itemsKeyPath, itemIds) => {
      var key = keyPathToKey(keyPath);
      notifyObservers(this.docs[key], 'add:', itemsKeyPath, itemIds);
    });
    
    socket.on('remove:', (keyPath, itemsKeyPath, itemIds) => {
      var key = keyPathToKey(keyPath);
      notifyObservers(this.docs[key], 'remove:', itemsKeyPath, itemIds);
    });

    socket.on('insertBefore:', (keyPath, id, itemKeyPath, refId) => {
      var key = keyPathToKey(keyPath);
      notifyObservers(this.docs[key], 'insertBefore:', id, itemKeyPath, refId);
    });

    socket.on('deleteItem:', (keyPath, id) => {
      var key = keyPathToKey(keyPath);
      notifyObservers(this.docs[key], 'deleteItem:', id);
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

