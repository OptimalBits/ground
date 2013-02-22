/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage Module. Include classes and interfaces for the storage subsystem.
*/

/// <reference path="base.ts" />
/// <reference path="util.ts" />

module Gnd {
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
*/
/**
  Storage Interface. Any storage fullfilling this interface can be used by
  Ground.
  
  TODO: Study if Error is the best return value for errors, or if a
  error code will be better, to help classify into different types of 
  errors, for example, temporal errors (may trigger a retry) versus
  persistent errors (should not retry).
*/
export interface IStorage extends ISetStorage, ISeqStorage {
  //
  // Basic Storage for Models (Follows CRUD semantics)
  //
  
  create(keyPath: string[], doc: {}, cb: (err: Error, key?: string) => void): void;
  put(keyPath: string[], doc: {}, cb: (err?: Error) => void): void;
  fetch(keyPath: string[], cb: (err?: Error, doc?: {}) => void): void;
  del(keyPath: string[], cb: (err?: Error) => void): void;
  link?(keyPath: string[], targetKeyPath: string[], cb: (err?: Error) => void): void;
}

//
//  Set / Collection Storage (unordered)
//
export interface ISetStorage {
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void): void;
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void): void;
  find(keyPath: string[], query: {}, opts: {}, cb: (err: Error, result: any[]) => void): void;
}

//
//  Sequence Storage (ordered)
//
export interface ISeqStorage {
  // insert(keyPath: string[], index:number, doc:{}, cb: (err: Error) => void);
  // extract(keyPath: string[], index:number, cb: (err: Error, doc?:{}) => void);
  all(keyPath: string[], query: {}, opts: {}, cb: (err: Error, result: any[]) => void) : void;

  // new operations
  // first(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void);
  first(keyPath: string[], opts: {}, cb: (err: Error, keyPath:string[]) => void);
  // last(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void);
  last(keyPath: string[], opts: {}, cb: (err: Error, keyPath:string[]) => void);
  // next(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void);
  next(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, keyPath?:string[]) => void);
  // prev(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void);
  prev(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, keyPath?:string[]) => void);
  // pop(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void);
  // shift(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void);
  deleteItem(keyPath: string[], itemKeyPath: string[], opts: {}, cb: (err?: Error) => void);
  // push(keyPath: string[], itemKeyPath: string[], opts:{}, cb: (err?: Error) => void);
  // unshift(keyPath: string[], itemKeyPath: string[], opts:{}, cb: (err?: Error) => void);
  insertBefore(keyPath: string[], refItemKeyPath: string[], itemKeyPath: string[], opts: {}, cb: (err?: Error) => void);
  // insertAfter(keyPath: string[], refItemKeyPath: string[], itemKeyPath: string[], opts: {}, cb: (err?: Error) => void);
}

}
