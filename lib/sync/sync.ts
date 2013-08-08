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
      _.each(proxy.docs, (docs: Sync.ISynchronizable[], id?: string) => {
        var doc = docs[0];

        Gnd.Storage.Socket.safeEmit(socket, 'observe', doc.getKeyPath()).then(() => {
          log('Observe', doc.getKeyPath().join('/'))
        });
        
        // TODO: We need to also resync in case the server has new data
      });
    }
    
    //
    // Socket Listeners
    //
    var updateFn = (keyPath, args) => {
      log("Received update", keyPath, args);
      var key = keyPathToKey(keyPath);
      
      _.each(proxy.docs[key], function(doc: Base){
        doc.set(args, {nosync: true});
      });
    };
    socket.on('update:', updateFn);
    
    var deleteFn = keyPath => {
      log("Received delete", keyPath);
      var key = keyPathToKey(keyPath);
      _.each(proxy.docs[key], function(doc){
        doc.emit('deleted:', doc); // rename event to 'delete:' ?
      });
    };
    
    socket.on('delete:', deleteFn);
    var addFn = (keyPath, itemsKeyPath, itemIds) => {
      log("Received add", arguments);
      proxy.notify(keyPath, 'add:', itemsKeyPath, itemIds);
    }
    socket.on('add:', addFn);
    
    var removeFn = (keyPath, itemsKeyPath, itemIds) => {
      log("Received remove", arguments);
      proxy.notify(keyPath, 'remove:', itemsKeyPath, itemIds);
    }
    socket.on('remove:', removeFn);

    var insertBeforeFn = (keyPath, id, itemKeyPath, refId) => {
      log("Received insert", arguments);
      proxy.notify(keyPath, 'insertBefore:', id, itemKeyPath, refId);
    }
    socket.on('insertBefore:', insertBeforeFn);

    var deleteItemFn = (keyPath, id) => {
      log("Received deleteItem", arguments);
      proxy.notify(keyPath, 'deleteItem:', id);
    }
    socket.on('deleteItem:', deleteItemFn);
    
    socket.on('ready', connectFn);
    
    this.cleanUpFn = () => {
      var off = _.bind(socket.removeListener, socket);
      
      // Remove connection listeners
      off('ready', connectFn);
      
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
    Starts observing a given document. When a document is being observed,
    the server will start sending it updates when something related to the document
    has been updated.
    
    @method observe
    @param doc {Sync.ISynchronizable} a document that implements the 
    ISynchronizable interface.
  */
  observe(doc: Sync.ISynchronizable)
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
  unobserve(doc: Sync.ISynchronizable)
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
