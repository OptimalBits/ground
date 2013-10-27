/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage implementation using Ajax
*/

/// <reference path="storage.ts" />
/// <reference path="../dom.ts" />
/// <reference path="../util.ts" />

/**
  @module Gnd
  @submodule Storage
*/
module Gnd.Storage {
  /**
    Implementation of the IStorage interface using Ajax.
  
    This class is used internally by the framework to communicate with its
    server side counterpart {{#crossLink "AjaxBackend"}}{{/crossLink}}
  
    @class Storage.Ajax
    @uses Storage.IStorage
    @constructor
    @param root {String} A url pointing to the root of the storage.
  */
export class Ajax implements IStorage {
  private root: string;
  
  constructor(root){
    this.root = root;
  }
  
  private url(keyPath: string[]){
    return this.root + '/' + keyPath.join('/');
  }
  
  private post(keyPath, args){
    return Gnd.Ajax.post(this.url(keyPath), args);
  }
    
  create(keyPath: string[], doc: any): Promise<string>
  {
    return this.post(keyPath, {cmd: 'create', doc: doc});
  }
  
  put(keyPath: string[], doc: any): Promise<void>
  {
    return this.post(keyPath, {cmd:'put', doc: doc});
  }
  
  fetch(keyPath: string[]): Promise<any>
  {
    return this.post(keyPath, {cmd:'fetch'});
  }
  
  del(keyPath: string[]): Promise<void>
  {
    return this.post(keyPath, {cmd:'del'});
  }
  
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}): Promise<void>
  {
    return this.post(keyPath, {
      cmd: "add", 
      itemIds: itemIds,
      itemsKeyPath: itemsKeyPath,
      opts: opts
    });
  }

  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}): Promise<void>
  {
    return this.post(keyPath, {
      itemsKeyPath: itemsKeyPath, 
      itemIds: itemIds, 
      opts: opts
    });
  }
  
  find(keyPath: string[], query: {}, options: {}): Promise<any[]>
  {
    return this.post(keyPath, {
      cmd: "find",
      query: query, 
      opts: options
    });
  }
  
  all(keyPath: string[], query: {}, opts: {}): Promise<any[]>
  {
    return this.post(keyPath, {
      cmd: "all",
      query: query, 
      opts: opts
    });
  }
  
  deleteItem(keyPath: string[], id: string, opts: {}): Promise<void>
  {
    return this.post(keyPath, {
      cmd: 'deleteItem',
      id: id, 
      opts: opts
    });
  }

  insertBefore(keyPath: string[], id: string, itemKeyPath: string[], opts): Promise<{id: string; refId: string;}>
  {
    return this.post(keyPath, {
      cmd: "insertBefore", 
      id: id,
      itemKeyPath: itemKeyPath, 
      opts: opts
    });
  }
}
}
