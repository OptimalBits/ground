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

module Gnd
{
  var defaults = {
    template: function(str: string): (args: any) => string
    {
      return _.template(str);
    },
    localStorage: null,
    remoteStorage: null
  }
  
  function Using() {

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
      },
      remote: function(storage: IStorage){
        using.remoteStorage = storage;
      }
    }
  }
}
