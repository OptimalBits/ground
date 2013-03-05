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

export interface IDoc {
  id: string;
  doc: any;
  keyPath?: string[];
}

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
  all(keyPath: string[], query: {}, opts: {}, cb: (err: Error, result: IDoc[]) => void) : void;
  next(keyPath: string[], id: string, opts: {}, cb: (err: Error, doc?:IDoc) => void);
  deleteItem(keyPath: string[], id: string, opts: {}, cb: (err?: Error) => void);
  insertBefore(keyPath: string[], id: string, itemKeyPath: string[], opts: {}, cb: (err: Error, id?: string, refId?: string) => void);
  meta?(keyPath: string[], id: string, sid: string, cb: (err?: Error) => void);
}

}
