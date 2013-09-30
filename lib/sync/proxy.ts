/**
  Ground Web Framework (c) 2011-2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Synchronization Proxy
  
  This handles provide observability to objects that have a server counterpart.
  Server objects will emit events that this class will route to the proper
  objects.
  
  This class should be used as a singleton, where the socket client backend
  will use it to notify events to the proper objects.
  
  This class handles automatic synchronization of objects between
  the server and the clients. 
  
  Any object fullfilling the ISynchronizable interface can be added to
  this class to get automatic synchronization support.
  
  The Manager keeps a data structure with all the instantiated
  models and their IDs.
*/

/// <reference path="../base.ts" />
/// <reference path="../promise.ts" />

/**
  @module Gnd
  @submodule Sync
*/
module Gnd.Sync {
 
  /**
    An interface representing a synchronizable object.
    
    @class Sync.ISynchronizable
  */
  export interface ISynchronizable extends ISettable
  {
    /**
      Checks if the instance has autosync enabled.
    
      @method isKeptSynced
      @return {Boolean} true if autosync enabled, false otherwise.
    */
    isKeptSynced:() => boolean;
    
    /**
      Gets the key path for this document.
    
      @method getKeyPath
      @return {KeyPath} 
    */
    getKeyPath:() => string[];
    
    /**
      Emits events.
      
      @method emit
    */
    emit:(event: string, ...params: any[]) => void;
    
    /**
      Resyncs the object with server data. The mechanism used to resync an
      object is implemented specifically for every type of object.
      
      @method resync
      @param data data to resync the object, if left undefined, the method
      should fetch the data by itself.
    */
    resync(data?: any): Promise<any>;
  };
  
  /**
  
  
    @class Sync.IProxy
    
  */
  export interface IProxy
  {
    docs: {
      [key: string]: ISynchronizable[];
    };
    observe(doc: Sync.ISynchronizable): boolean;
    unobserve(doc: Sync.ISynchronizable): boolean;
    notify(keyPath: string[], ...args:any[]);
  }
  
  /**
  
  
    @class Sync.Proxy
    @extends Base
    @uses IProxy
  */
  class Proxy extends Base implements IProxy
  {
    public docs: {
      [key: string]: ISynchronizable[];
    } = {};
    
    /**
      Starts observing an ISynchronizable object.
      Returns true when it is the first time an object is being observed.
      (note that several instances of the same object can be observed at a given
       time)
       
       @method observe
       @param doc {Sync.ISynchronizable} doc to start observation.
       @return {Boolean} true if it is the first time an object is being observed.
    */
    observe(doc: Sync.ISynchronizable): boolean
    {
      var key = docKey(doc);
    
      if(!this.docs[key]){
        this.docs[key] = [doc];
        return true;
      } else {
        this.docs[key].push(doc);
      }
    }
    
    /**
      Stops observing the given doc.
      Returns true if no other instances of the given doc are being observed.
      
      @method unobserve
      @param doc {Sync.ISynchronizable} doc to stop observation.
      @return {Boolean} true if no more instances of the given doc are being observed.
    */
    unobserve(doc: ISynchronizable): boolean
    {
      if (!doc.isKeptSynced()) return; // why this?

      var 
        key = docKey(doc),
        docs = this.docs[key];
    
      if(docs){
        docs = _.reject<ISynchronizable>(docs, (item) => item === doc);
      
        if(docs.length===0){
          delete this.docs[key];
          return true;          
        }else{
          this.docs[key] = docs;
        }
      }
    }
    
    /**
      Notifies a changed to a given document.
      
      example:
      
          proxy.notify([displays, '123123213'], 'update:', args);
      
      @method notify
      @param keyPath {KeyPath} key path pointing to the document to be notified.
      @param args* {Any} any number of arguments to be passed to the observer.
    */
    
    notify(keyPath: string[], ...args:any[])
    {
      var key = keyPathToKey(keyPath);
      var observers = this.docs[key];
      if(observers){
        for(var i=0; i<observers.length; i++){
          observers[i].emit.apply(observers[i], args);
        }
      }
    }
  }
  
  function docKey(doc: ISynchronizable){
    return keyPathToKey(doc.getKeyPath());
  }
  
  export function keyPathToKey(keyPath: string[]): string
  {
    return keyPath.join(':');
  }
  
  var _proxy;
  export function getProxy(): IProxy
  {
    return _proxy ? _proxy : _proxy = new Proxy();
  }
}


