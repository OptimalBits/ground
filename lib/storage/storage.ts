/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage Module. Include classes and interfaces for the storage subsystem.
*/

/// <reference path="../base.ts" />
/// <reference path="../util.ts" />

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
  create(keyPath: string[], doc: {}): Promise; // Promise<string>
  put(keyPath: string[], doc: {}): Promise;
  fetch(keyPath: string[]): Promise;
  del(keyPath: string[]): Promise;
  link?(keyPath: string[], targetKeyPath: string[]): Promise;
}

//
//  Set / Collection Storage (unordered)
//
export interface ISetStorage {
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}): Promise; // Promise<void>
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}): Promise; //Promise<void>
  find(keyPath: string[], query: {}, opts: {}): Promise; // Promise<any[]>
}

//
//  Sequence Storage (ordered)
//

export interface IDoc {
  id: string;
  doc: any;
  keyPath?: string[];
}

export interface ISeqStorage {
  all(keyPath: string[], query: {}, opts: {}): Promise; //<Idoc[]>;
  next(keyPath: string[], id: string, opts: {}): Promise; // <IDoc>
  deleteItem(keyPath: string[], id: string, opts: {}): Promise; //
  insertBefore(keyPath: string[], id: string, itemKeyPath: string[], opts: {}): Promise; //<{id, refId}>
  meta?(keyPath: string[], id: string, sid: string): Promise;
}

}
