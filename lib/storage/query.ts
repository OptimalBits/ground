/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Query Module. Query support for models and containers.
*/

/// <reference path="../../third/underscore.d.ts" />

module Gnd.Storage.Query
{
  export var match = (cond, doc: any) => _.all<any>(cond, (value: any, key: string) => 
    doc[key] === cond[key]); 
}
