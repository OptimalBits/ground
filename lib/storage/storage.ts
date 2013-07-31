/**
  Ground Web Framework (c) 2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage Module. Include classes and interfaces for the storage subsystem.
*/

/// <reference path="../base.ts" />
/// <reference path="../util.ts" />

/**
  @module Gnd
  @submodule Storage
*/
module Gnd.Storage {
/*
export enum ErrorCode {
  OK                      = 0,
  TEMPORARILY_UNAVAILABLE = 1,
  UNRECOVARABLE_ERROR     = 2,
  REMOTE_ERROR            = 3,
}

export class StorageError {
  code: ErrorCode = 0;
  msg: string = "Success";
}

TODO: Study if Error is the best return value for errors, or if a
error code will be better, to help classify into different types of 
errors, for example, temporal errors (may trigger a retry) versus
persistent errors (should not retry).
*/


/**
  A key path is just an array of strings specifying a location in a storage.
  Normally key paths are built alternating buckets with documents ids.
  
  Example:
  
      ['zoo', '12345123', 'animals', '52343']
  
  @class KeyPath
*/

/**
  Storage Interface. Any storage fullfilling this interface can be used by
  Ground. 
  
  The basic storage interface follows CRUD semantics.
  
  @class Storage.IStorage
  @uses Storage.ISetStorage
  @uses Storage.ISeqStorage
  @static
*/
export interface IStorage extends ISetStorage, ISeqStorage {

  /**
    Creates a new document in the given key path in the storage. The key path
    should point to a bucket.
  
    @method create
    @param keyPath {KeyPath} A keypath pointing to the place where to create
    the document.
    @param doc {Object} Plain object to be stored.
    @param opts {Object} Options object that is specific for every storage.
    @return {Promise} returns a promise that resolves to a string with the
    document's id on the storage.
  */
  create(keyPath: string[], doc: {}, opts: {}): Promise<string>;
  
  /**
    Modifies a document that resides in the given key path.
    
    @method put
    @param keyPath {KeyPath} A keypath pointing to document to modify.
    @param doc {Object} Plain object with the properties to be modified.
    @param opts {Object} Options object that is specific for every storage.
    @return {Promise} returns a promise that resolves to void.
  */
  put(keyPath: string[], doc: {}, opts: {}): Promise<void>;
  
  /**
    Fetches (gets) a document from the storage at the given key path.
  
    @method fetch
    @param keyPath {KeyPath} A keypath pointing to document to fetch.
    @return {Promise} returns a promise that resolves to the fetched document.
  */
  fetch(keyPath: string[]): Promise<any>;
  
  /**
    Deletes a document from the storare at the given key path.
    
    @method del
    @param keyPath {KeyPath} A keypath pointing to document to delete.
    @return {Promise} returns a promise that resolves to void.
  */
  del(keyPath: string[], opts: {}): Promise<void>;
  
  /**
    Links a document. 
    
    This method creates a link by specifying a new key path 
    that can be used to access the same original document.
  
    This is an optional method only required in local storage implementations. 
    It is used to link persisted documents to client documents, specifically when
    a document's key path created locally could already be used, so when the
    document gets persisted server side and receives a new id, we cannot just
    delete the old key path, instead we create a link.
    
    @method link
    @param newKeyPath {KeyPath} A new key path.
    @param targetKeyPath {KeyPath} The key path pointing to the document to be
    linked.
    @optional
  */
  link?(newKeyPath: string[], targetKeyPath: string[]): Promise<void>;
}

//
//  Set / Collection Storage (unordered)
//

/**
  This interface represents a query to the storage. Its syntax is very similar
  to the one defined by MongoDB and Mongoose.

  @class Storage.IStorageQuery
*/
export interface IStorageQuery {
  
  /**
    List of space separated fields. Leave undefined for retrieving all fields.
  
    @property fields
    @optional
    @type String
    @default undefined
  */
  fields?: String;
  
  /**
    Condition that all found documents need to pass to be part of the resulting
    set.
  
    The syntax for the condition is based on MongoDB syntax.
    
    TODO: Document Gnd condition syntax in detail.
    
    @property cond
    @optional
    @type {Object}
  */
  cond?: {};
  
  /**
    Options that affect the query result.
    
    * limit: number Limits the result to max number of documents.
    * skip: number Skip given number of entries.
    * sort: string 'asc' Ascending order, 'desc' Descendig order.
    
    @property opts
    @optional
    @type {Object}
  */
  opts?: {};
}

/**
  Defines the interface for Set / Unordered documents, used in Gnd by 
  Collections.

  @class Storage.ISetStorage
*/
export interface ISetStorage {
  /**
    Adds documents to the given collection. The documents are specifyed by 
    documents ids, as the one returned by the create method in IStorage.
  
    @method add
    @param keyPath {KeyPath} key path pointing to the bucket holding the collection.
    @param itemsKeyPath {KeyPath} key path pointing to the bucket holding the 
    documents that are going to be added.
    @param itemIds {Array} Array of strings containing the ids of the documents
    to add to the collection.
    @return {Promise} promise resolving to void when the operation is completed.
  */
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}): Promise<void>
  
  /**
    Removes documents from the given collection.
  
    @method remove
    @param keyPath {KeyPath} key path pointing to the bucket holding the collection.
    @param itemsKeyPath {KeyPath} key path pointing to the bucket holding the 
    documents that are going to be removed.
    @param itemIds {Array} Array of strings containing the ids of the documents
    to remove from the collection.
    @return {Promise} promise resolving to void when the operation is completed.
  */
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}): Promise<void>
  
  /**
    Finds documents matching the given query.
  
    @method find
    @param keyPath {KeyPath} key path pointing to the bucket holding the collection.
    @param query {IStorageQuery} object specifying the query to be performed.
  */
  find(keyPath: string[], query: IStorageQuery, opts: {}): Promise<any[]>
}

//
//  Sequence Storage (ordered)
//

export interface IDoc {
  id: string;
  doc: any;
  keyPath?: string[];
}

/**
  Defines the interface for ordered documents, used in Gnd by Sequences.

  @class Storage.ISeqStorage
*/
export interface ISeqStorage {
  
  /**
    Gets all the documents for the given sequence.
    
    @method all
    @param keyPath {KeyPath} key path pointing to the bucket where the sequence
    is located.
    @param query {Object} NOT USED YET
    @param opts {Object} NOT USED YET
  */
  all(keyPath: string[], query: {}, opts: {}): Promise<any[]>;
  
  /**
    Deletes an item in the sequence.
  
    @method deleteItem
    @param keyPath {KeyPath} key path pointing to the bucket where the sequence
    is located.
    @param id {String} id of the item to be deleted.
    @param opts {Object} NOT USED YET
  */
  deleteItem(keyPath: string[], id: string, opts: {}): Promise<void>
  
  /**
    Inserts a document before the given document.
  
    @method insertBefore
    @param keyPath {KeyPath} key path pointing to the bucket where the sequence
    is located.
    @param refId {String} reference id representing the insertion point in the sequence.
    @param itemKeyPath {KeyPath} key path where the item to be inserted is located.
  */
  insertBefore(keyPath: string[], refId: string, itemKeyPath: string[], opts: {}): Promise<{id: string; refId: string;}>
  
  /**
    This method is called internally by the storage to acknowledge that an item
    has been inserted. This method is only required when implementing local 
    storages.
    
    TODO: Add more documentation about this...

    @method ack
    @optional
    @param keyPath {KeyPath}
  */
  ack?(keyPath: string[], id: string, sid: string, opts: {}): Promise<void>;
}

}
