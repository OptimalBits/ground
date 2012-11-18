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

/*
  GndServer gndServer = new GndServer(new MongoStorage(...));
*/
export class Server {
  public storage: Storage.IStorage;

  constructor(persistentStorage: Storage.IStorage) 
  {
    this.storage = new ProxyStorage(persistentStorage, null);
  }
}

class ProxyStorage implements Storage.IStorage {
  private storage: Storage.IStorage;
  private sync:any;
  
  constructor(storage: Storage.IStorage, sync){
    this.storage = storage;
    this.sync = sync;
  }

  create(keyPath: string[], doc: any, cb: (err: Error, key?: string) => void): void
  {
    this.storage.create(keyPath, doc, cb);
  }

  put(keyPath: string[], doc: any, cb: (err?: Error) => void): void
  {
    this.storage.put(keyPath, doc, (err?: Error) => {
      if(!err){
        this.sync && this.sync.update(keyPath, doc); // Notifies all clients about the update.
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
        this.sync && this.sync.delete(keyPath);
      }
      cb(err);
    })
  }

  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: Error) => void): void
  {
    this.storage.add(keyPath, itemsKeyPath, itemIds, (err?: Error) => {
      if(!err){
        this.sync && this.sync.add(keyPath, itemsKeyPath, itemIds);
      }
      cb(err);
    })
  }

  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: Error) => void): void
  {
    this.storage.remove(keyPath, itemsKeyPath, itemIds, (err?: Error) => {
      if(!err){
        this.sync && this.sync.remove(keyPath, itemsKeyPath, itemIds);
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
        this.sync && self.sync.insert(keyPath, index, doc);
      }
      cb(err);
    })
  }

  extract(keyPath: string[], index:number, cb: (err: Error, doc?: {}) => void)
  {
    var self = this;
    this.storage.extract(keyPath, index, function(err: Error, doc?: {}){
      if(!err){
        this.sync && self.sync.extract(keyPath, index);
      }
      cb(err, doc);
    })
  }

  all(keyPath: string[], cb: (err: Error, result: any[]) => void) : void
  {
    this.storage.all(keyPath, cb);
  }
}

