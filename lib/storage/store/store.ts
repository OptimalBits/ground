/**
  Ground Web Framework (c) 2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Store interface
*/

module Gnd.Storage.Store {
  /**
    Interface for implementing client side stores.
  
    @class Storage.Store.IStore
  */
  export interface IStore {
    /**
      Gets a document.
      
      @method get
      @param key {String} key for the document to retrieve.
      @return {Any} document at the given key or undefined if none.
    */
    get(key: string): any;
    
    /**
      Puts a document overwriting any previous document at the same key.
      
      @method put
      @param key {String} key for the document to store.
    */
    put(key: string, doc: any): void;
    
    /**
      Deletes a document.
      
      @method del
      @param key {String} key for the document to delete
    */
    del(key: string): void;
    
    /**
      Gets all the key in the store.
      
      @method allKeys
      @return {Array} array of string with all the keys in the store.
    */
    allKeys(): string[];
  }
}
