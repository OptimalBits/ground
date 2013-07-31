/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  Using Module. 
  
  This module exports a global "using" object that is used through the framework
  for configurables. For example it can be used to configure which template
  engine to use, or which storage modules.

*/

/// <reference path="storage/storage.ts" />
/// <reference path="storage/local.ts" />
/// <reference path="storage/store/memory-storage.ts" />
/// <reference path="storage/queue.ts" />
/// <reference path="sync/sync.ts" />

module Gnd
{
  var window = typeof window === 'undefined' ? {} : window;
  
  var defaults = {
    template: function(str: string): (args: any) => string
    {
      return _.template(str);
    },
    localStorage: null,
    remoteStorage: null,
    storageQueue: null,
    memStorage: (new Storage.Local(new Storage.Store.MemoryStore())),
    historyApi: !!(window.history && window.history.pushState)
  }
  
  export class Using extends Base
  {
    public historyApi: bool;
    public template: (str: string) => (args: any) => string;
    public localStorage: Storage.IStorage;
    public remoteStorage: Storage.IStorage;
    public memStorage: Storage.IStorage;
    public storageQueue: Storage.Queue;
    public localQueue: Storage.Queue;
    
    public syncManager: Sync.Manager;
    
    constructor(){
      super();
      
      _.each(defaults, (value, key?) => {
        this[key] = value;
      });
    }
    
    destroy(){
      Util.release(this.storageQueue, this.syncManager);
      super.destroy();
    }
  };
  
  export var using = new Using();
  
  export var use = {
    template: function(templFn: (str: string) => (args: any) => string){
      using.template = templFn;
    },
    storage: {
      local: function(storage: Storage.IStorage){
        using.localStorage = storage;
        using.storageQueue = new Storage.Queue(storage, using.remoteStorage);
      },
      remote: function(storage: Storage.IStorage){
        using.remoteStorage = storage;
        if(using.localStorage){
          using.storageQueue = new Gnd.Storage.Queue(using.localQueue, storage);
        }
      },
      mem: function(storage: Storage.IStorage){
        using.memStorage = storage;
      }
    },
    storageQueue: function(localStorage: Storage.IStorage,
                           remoteStorage: Storage.IStorage){
      using.storageQueue = new Storage.Queue(localStorage, remoteStorage);
    },
    historyApi: function(use: bool){
      using.historyApi = use;
    },
    syncManager: function(socket){
      Util.release(using.syncManager);
      using.syncManager = new Sync.Manager(socket);
    }
  }
}
