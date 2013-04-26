/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Ground Server. Acts as a controller for Storage implementations and
  the synchronization module.
*/

/// <reference path="storage/storage.ts" />
/// <reference path="sync/sync-backend.ts" />
/// <reference path="session/rightsmanager.ts" />
/// <reference path="session/sessionmanager.ts" />

/*
  GndServer gndServer = new GndServer(new MongoStorage(...));
*/

// TODO: Improve error handling after ACL rights setting.
module Gnd {

export class Server {
  public storage: IStorage;
  
  private syncHub: Sync.Hub;
  private rm: RightsManager;
  public sessionManager: SessionManager;

  constructor(persistentStorage: IStorage, 
              sessionManager?: SessionManager,
              syncHub?: Sync.Hub,
              rightsManager?: RightsManager)
  {
    this.storage = persistentStorage;
    this.sessionManager = sessionManager;
    this.syncHub = syncHub;
    this.rm = rightsManager || new RightsManager();
  }
  
  create(userId: string, keyPath: string[], doc: any, cb:(err: Error, key?: string) => void)
  {
    this.rm.checkRights(userId, keyPath, Rights.CREATE, (err?, allowed?) => {
      if(allowed){
        this.storage.create(keyPath, doc, (err, id?) => {
          if(err) return cb(err);
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

  //
  // Collection
  //
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
  
  //
  // Sequences
  //
  all(userId: string, keyPath: string[], query: {}, opts: {}, cb: (err?: Error, result?: IDoc[]) => void) : void
  {
    this.rm.checkRights(userId, keyPath, Rights.GET, (err?, allowed?) => {
      if(allowed){
        this.storage.all(keyPath, query, opts, cb);
      }else{
        cb(err);
      }
    });
  }
  
  next(userId: string, keyPath: string[], id: string, opts: {}, cb: (err: Error, doc?:IDoc) => void)
  {
    this.rm.checkRights(userId, keyPath, Rights.GET, (err?, allowed?) => {
      if(allowed){
        this.storage.next(keyPath, id, opts, cb);
      }else{
        cb(err);
      }
    });
  }

  deleteItem(clientId: string, userId: string, keyPath: string[], id: string, opts: {}, cb: (err?: Error) => void)
  {
    this.rm.checkRights(userId, keyPath, Rights.DEL, (err?, allowed?) => {
      if(allowed){
        this.storage.deleteItem(keyPath, id, opts, (err?: Error) => {
          if(!err){
            this.syncHub && this.syncHub.deleteItem(clientId, keyPath, id);
          }
          cb(err);
        });
      }else{
        cb(err);
      }
    });
  }

  insertBefore(clientId: string, userId: string, keyPath: string[], id: string, itemKeyPath: string[], opts, cb: (err: Error, id?: string, refId?: string) => void)
  {
    this.rm.checkRights(userId, keyPath, Rights.PUT, (err?, allowed?) => {
      if(allowed){
        this.storage.insertBefore(keyPath, id, itemKeyPath, opts, (err: Error, id?: string, refId?: string) => {
          if(!err){
            this.syncHub && this.syncHub.insertBefore(clientId, keyPath, id, itemKeyPath, refId);
          }
          cb(err, id);
        });
      }else{
        cb(err);
      }
    });
  }  
}

}
