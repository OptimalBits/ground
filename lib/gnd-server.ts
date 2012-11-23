/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Ground Server. Acts as a controller for Storage implementations and
  the synchronization module.
*/

/// <reference path="../third/underscore.browser.d.ts" />

import Storage = module('./storage');
import Sync = module('./sync/sync-backend');

/*
  GndServer gndServer = new GndServer(new MongoStorage(...));
*/
export class Server {
  public storage: Storage.IStorage;

  constructor(persistentStorage: Storage.IStorage, syncHub: Sync.SyncHub) 
  {
    this.storage = new ProxyStorage(persistentStorage, syncHub);
  }
}

class ProxyStorage implements Storage.IStorage {
  private storage: Storage.IStorage;
  private syncHub: Sync.SyncHub;
  
  constructor(storage: Storage.IStorage, sync: Sync.SyncHub){
    this.storage = storage;
    this.syncHub = sync;
  }

  create(keyPath: string[], doc: any, cb: (err: Error, key?: string) => void): void
  {
    this.storage.create(keyPath, doc, cb);
  }

  put(keyPath: string[], doc: any, cb: (err?: Error) => void): void
  {
    this.storage.put(keyPath, doc, (err?: Error) => {
      if(!err){
        this.syncHub && this.syncHub.update(keyPath, doc);
      }
      cb(err);
    });
  }

  get(keyPath: string[], cb: (err?: Error, doc?: any) => void): void
  {
    this.storage.get(keyPath, cb);
  }

  del(keyPath: string[], cb: (err?: Error) => void): void
  {
    this.storage.del(keyPath, (err?: Error) => {
      if(!err){
        this.syncHub && this.syncHub.delete(keyPath);
      }
      cb(err);
    })
  }

  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: Error) => void): void
  {
    this.storage.add(keyPath, itemsKeyPath, itemIds, (err?: Error) => {
      if(!err){
        this.syncHub && this.syncHub.add(keyPath, itemsKeyPath, itemIds);
      }
      cb(err);
    })
  }

  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: Error) => void): void
  {
    this.storage.remove(keyPath, itemsKeyPath, itemIds, (err?: Error) => {
      if(!err){
        this.syncHub && this.syncHub.remove(keyPath, itemsKeyPath, itemIds);
      }
      cb(err);
    })
  }

  find(keyPath: string[], query: {}, options: {}, cb: (err: Error, result: any[]) => void): void
  {
    this.storage.find(keyPath, query, options, cb);
  }

  insert(keyPath: string[], index:number, doc:{}, cb: (err: Error) => void)
  {
    var self = this;
    this.storage.insert(keyPath, index, doc, function(err?: Error){
      if(!err){
        this.syncHub && self.syncHub.insert(keyPath, index, doc);
      }
      cb(err);
    })
  }

  extract(keyPath: string[], index:number, cb: (err: Error, doc?: {}) => void)
  {
    var self = this;
    this.storage.extract(keyPath, index, function(err: Error, doc?: {}){
      if(!err){
        this.syncHub && self.syncHub.extract(keyPath, index);
      }
      cb(err, doc);
    })
  }

  all(keyPath: string[], cb: (err: Error, result: any[]) => void) : void
  {
    this.storage.all(keyPath, cb);
  }
}

