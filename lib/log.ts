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
  
  export function log(...args: any[]){
    prependTimestamp(args);
    Gnd['debug'] && console.log.apply(console, args);
  }

}
