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

/// <reference path="proxy.ts" />
/// <reference path="../log.ts" />
/// <reference path="../base.ts" />
/// <reference path="../storage/socket.ts" />

/**
  @module Gnd
  @submodule Sync
*/
module Gnd.Sync
{
  /**
    This class takes care of keeping synchronized documents between clients
    and servers.
    
    This class is used internally by the framework.
  
    @class Sync.Manager
    @extends Base
    @constructor
    @param socket {Socket} a socket.io client instance.
  */
export class Manager extends Base {
  private socket;
 
  private cleanUpFn: ()=>void;
  
  constructor(socket)
  {
    super();
    
    this.socket = socket;
    
    var proxy = getProxy();
        
    var connectFn = () => {
      log("Connected to socket");
      var socket = this.socket;
      
      log(proxy.docs)
      
      // re-observe all models in this manager...
      _.each<ISynchronizable[]>(proxy.docs, (docs: ISynchronizable[], id: string) => {
        var doc = docs[0];

        Gnd.Storage.Socket.safeEmit(socket, 'observe', doc.getKeyPath()).then(() => {
          log('Observe', doc.getKeyPath().join('/'))
        });
        
        doc.resync();
      });
    }
    
    //
    // Socket Listeners
    //
    var updateFn = (keyPath, args) => {
      log("Received update", keyPath, args);
      var key = keyPathToKey(keyPath);
      
      _.each<ISynchronizable>(proxy.docs[key], function(doc: ISynchronizable){
        doc.set(args, {nosync: true});
      });
    };
    socket.on('update:', updateFn);
    
    var deleteFn = keyPath => {
      log("Received delete", keyPath);
      var key = keyPathToKey(keyPath);
      _.each<ISynchronizable>(proxy.docs[key], function(doc){
        doc.emit('deleted:', doc); // rename event to 'delete:' ?
      });
    };
    
    socket.on('delete:', deleteFn);
    var addFn = (keyPath, itemsKeyPath, itemIds) => {
      log("Received add", keyPath, itemsKeyPath, itemIds);
      proxy.notify(keyPath, 'add:', itemsKeyPath, itemIds);
    }
    socket.on('add:', addFn);
    
    var removeFn = (keyPath, itemsKeyPath, itemIds) => {
      log("Received remove", keyPath, itemsKeyPath, itemIds);
      proxy.notify(keyPath, 'remove:', itemsKeyPath, itemIds);
    }
    socket.on('remove:', removeFn);

    var insertBeforeFn = (keyPath, id, itemKeyPath, refId) => {
      log("Received insert", keyPath, id, itemKeyPath, refId);
      proxy.notify(keyPath, 'insertBefore:', id, itemKeyPath, refId);
    }
    socket.on('insertBefore:', insertBeforeFn);

    var deleteItemFn = (keyPath, id) => {
      log("Received deleteItem", keyPath, id);
      proxy.notify(keyPath, 'deleteItem:', id);
    }
    socket.on('deleteItem:', deleteItemFn);
    
    socket.on('ready', connectFn);
    
    this.cleanUpFn = () => {
      // Remove connection listeners
      socket.removeListener('ready', connectFn);
      
      // Remove event listeners.
      socket.removeListener('update:', updateFn);
      socket.removeListener('delete:', deleteFn);
      socket.removeListener('add:', addFn);
      socket.removeListener('remove:', removeFn);
      socket.removeListener('insertBefore', insertBeforeFn);
      socket.removeListener('deleteItem', deleteItemFn);
    }
  }
  
  destroy()
  {
    this.cleanUpFn();
    super.destroy();
  }
  
  /**
    Starts observing a given document. When a document is being observed,
    the server will start sending it updates when something related to the document
    has been updated.
    
    @method observe
    @param doc {Sync.ISynchronizable} a document that implements the 
    ISynchronizable interface.
  */
  observe(doc: ISynchronizable)
  {
    if(getProxy().observe(doc)){
      this.start(doc.getKeyPath());
    }
  }

  /**
    Stops observing a given document.
    
    @method unobserve
    @param doc {Sync.ISynchronizable} a document that implements the 
    ISynchronizable interface.
  */
  unobserve(doc: ISynchronizable)
  { 
    if(getProxy().unobserve(doc)){
      this.stop(doc.getKeyPath());
    }
  }
  
  private start(keyPath: string[])
  {
    Gnd.Storage.Socket.safeEmit(this.socket, 'observe', keyPath).then(() => {
      log('Started observing', keyPath);
    });
  }
  
  private stop(keyPath: string[])
  {
    Gnd.Storage.Socket.safeEmit(this.socket, 'unobserve', keyPath).then(() => {
      log('Stopped observing', keyPath);
    });
  }
}

}
