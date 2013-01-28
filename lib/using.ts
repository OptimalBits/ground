/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  Util Module. Include utility functions used in several parts of
  the framework.
*/

/// <reference path="../third/underscore.browser.d.ts" />
/// <reference path="dom.ts" />
/// <reference path="overload.ts" />

module Gnd
{
  var defaults = {
    template: function(str: string): (args) => string
    {
      return _.template(str);
    },
  
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
  
  export function use(param: string, value: any)
  {
    switch(param){
      case 'template':
        using.template = value;
        break;
      /*
      case 'socket':
        using.socket = value;
        break;
      case 'storage':
        using.storage = new Storage.Queue();
        break;
        */
    }
  }
}
