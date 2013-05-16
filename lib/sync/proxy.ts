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
  
  export interface IProxy
  {
    docs: {
      [key: string]: ISynchronizable[];
    };
    observe(doc: Sync.ISynchronizable): bool;
    unobserve(doc: Sync.ISynchronizable): bool;
    notify(keyPath: string[], ...args:any[]);
  }
  
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
    */
    observe(doc: Sync.ISynchronizable): bool
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
    */
    unobserve(doc: Sync.ISynchronizable): bool
    {
      if (!doc.isKeptSynced()) return; // why this?

      var 
        key = docKey(doc),
        docs = this.docs[key];
    
      if(docs){
        docs = _.reject(docs, (item) => item === doc);
      
        if(docs.length===0){
          delete this.docs[key];
          return true;          
        }else{
          this.docs[key] = docs;
        }
      }
    }
    
    // notify([displays, '123123213'], 'update:', args);
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
    if(_proxy){
      return _proxy;
    }else{
      return _proxy = new Proxy();
    }
  }
}


