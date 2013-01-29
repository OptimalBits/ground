/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Ground Server. Acts as a controller for Storage implementations and
  the synchronization module.
*/

/// <reference path="./storage.ts" />
/// <reference path="./sync/sync-backend.ts" />

/*
  GndServer gndServer = new GndServer(new MongoStorage(...));
*/

module Gnd {

export class Server {
  public storage: IStorage;

  constructor(persistentStorage: IStorage, syncHub: Sync.SyncHub) 
  {
    this.storage = new ProxyStorage(persistentStorage, syncHub);
  }
}

class ProxyStorage implements IStorage {
  private storage: IStorage;
  private syncHub: Sync.SyncHub;
  
  constructor(storage: IStorage, sync: Sync.SyncHub){
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

  fetch(keyPath: string[], cb: (err?: Error, doc?: any) => void): void
  {
    this.storage.fetch(keyPath, cb);
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

  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void): void
  {
    this.storage.add(keyPath, itemsKeyPath, itemIds, opts, (err?: Error) => {
      if(!err){
        this.syncHub && this.syncHub.add(keyPath, itemsKeyPath, itemIds);
      }
      cb(err);
    })
  }

  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void): void
  {
    this.storage.remove(keyPath, itemsKeyPath, itemIds, opts, (err?: Error) => {
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

}
