/**
  Ground Web Framework (c) 2013 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  Util Module. Include utility functions used in several parts of
  the framework.
*/

module Gnd {
  
  var prependTimestamp = (args) => args.splice(0, 0, '['+ +new Date()+']');
  
  /**
    @for Gnd
    @method log
    @param args* {Any}
  */ 
  export function log(...args: any[]){
    if(Gnd['debugMode']){
      prependTimestamp(args);
      console.log.apply(console, args);
    }
  }

/**
    @for Gnd
    @method log
    @param args* {Any}
  */ 
  export function logerr(...args: any[]){
    if(Gnd['debugMode']){
      prependTimestamp(args);
      console.error.apply(console, args);
    }
  }

}
