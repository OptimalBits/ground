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

/// <reference path="../third/underscore.browser.d.ts" />
/// <reference path="storage.ts" />
/// <reference path="storage/local.ts" />
/// <reference path="storage/store/memory-storage.ts" />
/// <reference path="storage/queue.ts" />

module Gnd
{
  var defaults = {
    template: function(str: string): (args: any) => string
    {
      return _.template(str);
    },
    localStorage: null,
    remoteStorage: null,
    storageQueue: null,
    memStorage: (new Storage.Local(new Storage.Store.MemoryStore())),
  }
  
  export function Using() {

    if (Using.prototype._instance) {
      return Using.prototype._instance;
    }
    Using.prototype._instance = this;

    _.each(defaults, (value, key) => {
      this[key] = value;
    });
  };
  
  export var using = new Using();
  
  export var use = {
    template: function(templFn: (str: string) => (args: any) => string){
      using.template = templFn;
    },
    storage: {
      local: function(storage: IStorage){
        using.localStorage = storage;
        using.storageQueue = new Gnd.Storage.Queue(storage, using.remoteStorage);
      },
      remote: function(storage: IStorage){
        using.remoteStorage = storage;
        if(using.localStorage){
          using.storageQueue = new Gnd.Storage.Queue(using.localQueue, storage);
        }
      }
    },
    storageQueue: function(localStorage: IStorage, remoteStorage: IStorage){
      using.storageQueue = new Gnd.Storage.Queue(localStorage, remoteStorage);
    }
  }
}
