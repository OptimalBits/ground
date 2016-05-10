/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Query Module. Query support for models and containers.
*/

module Gnd.Storage.Query
{
  export var match = (cond: {}, doc: any) =>
    _.all<any>(cond, (value: any, key, list) =>
      doc[key] === cond[key]);
}
