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
/// <reference path="./rightsmanager.ts" />

/*
  GndServer gndServer = new GndServer(new MongoStorage(...));
*/

// TODO: Improve error handling after ACL rights setting.
module Gnd {

export class Server {
  public storage: IStorage;
  
  private syncHub: Sync.SyncHub;
  private rm: RightsManager;

  constructor(persistentStorage: IStorage, 
              syncHub?: Sync.SyncHub,
              rightsManager?: RightsManager)
  {
    this.storage = persistentStorage;
    this.syncHub = syncHub;
    this.rm = rightsManager || new RightsManager();
  }
  
  create(userId: string, keyPath: string[], doc: any, cb:(err: Error, key?: string) => void)
  {
    this.rm.checkRights(userId, keyPath, Rights.CREATE, (err?, allowed?) => {
      console.log("ALLOWED?"+allowed)
      if(allowed){
        this.storage.create(keyPath, doc, (err, id?) => {
          var newKeyPath = id ? keyPath.concat([id]) : keyPath;
          this.rm.create(userId, newKeyPath, doc, (err?) => {
            cb(err, id);
            // TODO: Remove document if error.
          });
        });
      }else{
        cb(err);
      }
    });
  }
  
  put(clientId: string, userId: string, keyPath: string[], doc: any, cb: (err?: Error) => void): void
  {
    this.rm.checkRights(userId, keyPath, Rights.PUT, (err?, allowed?) => {
      if(allowed){
        this.rm.put(userId, keyPath, doc, (err?) => {
          this.storage.put(keyPath, doc, (err?: Error) => {
            if(!err){
              this.syncHub && this.syncHub.update(clientId, keyPath, doc);
            }else{
              // TODO: remove rights
            }
            cb(err);
          });
        });
      } else {
        cb(err);
      }
    });
  }
  
  fetch(userId: string, keyPath: string[], cb: (err?: Error, doc?: any) => void): void
  {
    this.rm.checkRights(userId, keyPath, Rights.GET, (err?, allowed?) => {
      if(allowed){
        this.storage.fetch(keyPath, cb);
      }else{
        cb(err);
      }
    });
  }

  del(clientId: string, userId: string, keyPath: string[], cb: (err?: Error) => void): void
  {
    this.rm.checkRights(userId, keyPath, Rights.DEL, (err?, allowed?) => {
      if(allowed){
        this.rm.del(userId, keyPath, (err?) => {
          this.storage.del(keyPath, (err?: Error) => {
            if(!err){
              this.syncHub && this.syncHub.delete(clientId, keyPath);
            }
            cb(err);
          });
        });
      }else{
        cb(err);
      }
    });
  }

  add(clientId: string, userId: string, keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void): void
  {
    this.rm.checkRights(userId, keyPath, Rights.PUT, (err?, allowed?) => {
      if(allowed){
        this.rm.add(userId, keyPath, itemsKeyPath, itemIds, (err?) => {
          this.storage.add(keyPath, itemsKeyPath, itemIds, opts, (err?: Error) => {
            if(!err){
              this.syncHub && this.syncHub.add(clientId, keyPath, itemsKeyPath, itemIds);
            }
            cb(err);
          })
        });
      }else{
        cb(err);
      }
    });
  }

  remove(clientId: string, userId: string, keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void): void
  {
    this.rm.checkRights(userId, keyPath, Rights.DEL, (err?, allowed?) => {
      if(allowed){
        this.rm.remove(userId, keyPath, itemsKeyPath, itemIds, (err?) => {
          this.storage.remove(keyPath, itemsKeyPath, itemIds, opts, (err?: Error) => {
            if(!err){
              this.syncHub && this.syncHub.remove(clientId, keyPath, itemsKeyPath, itemIds);
            }
            cb(err);
          });
        });
      } else {
        cb(err);
      }
    });
  }

  find(userId: string, keyPath: string[], query: {}, options: {}, cb: (err: Error, result?: any[]) => void): void
  {
    this.rm.checkRights(userId, keyPath, Rights.GET, (err?, allowed?) => {
      if(allowed){
        this.storage.find(keyPath, query, options, cb);
      }else{
        cb(err);
      }
    });
  }
}

/*
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

  // put should return the old document, so that we can decide if we need
  // to notify for changes or not.
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
*/
}
