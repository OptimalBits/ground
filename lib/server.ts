/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Ground Server. Acts as a controller for Storage implementations and
  the synchronization module.
*/

/// <reference path="log.ts" />
/// <reference path="storage/storage.ts" />
/// <reference path="sync/sync-backend.ts" />
/// <reference path="session/rightsmanager.ts" />
/// <reference path="session/sessionmanager.ts" />

/*
  GndServer gndServer = new GndServer(new MongoStorage(...));
*/

// TODO: Improve error handling after ACL rights setting.
module Gnd {

  /**
    This is the main server class that glues all server components together.
    
    The server class itself is not used directly, it is instead plugged in a
    a server backend, for example {{#crossLink "SocketBackend"}}{{/crossLink}}.
    
    The backend is the class that actually talks to all the clients connected to
    the server, while it proxies its actions to the more general Server class.
    
    @class Server
    @constructor
    @param persistentStorage {Storage.IStorage} an instance of a persistent
      storage implementation.
    @param [sessionManager] {SessionManager} an instance of a session manager.
    @param [syncHub] {Sync.Hub} an instance of a synchronization hub.
    @param [rightsManager] {RightsManager} an instance of a rights manager.
  */
export class Server {
  public storage: Storage.IStorage;
  
  private syncHub: Sync.Hub;
  private rm: RightsManager;
  public sessionManager: SessionManager;

  constructor(persistentStorage: Storage.IStorage, 
              sessionManager?: SessionManager,
              syncHub?: Sync.Hub,
              rightsManager?: RightsManager)
  {
    this.storage = persistentStorage;
    this.sessionManager = sessionManager;
    this.syncHub = syncHub;
    this.rm = rightsManager || new RightsManager();
  }
  
  create(userId: string, keyPath: string[], doc: any, opts: {}): Promise<any>
  {
    return this.rm.checkRights(userId, keyPath, Rights.CREATE).then((allowed) => {
      if(allowed){
        return this.storage.create(keyPath, doc, opts).then((id) => {
          var newKeyPath = id ? keyPath.concat([id]) : keyPath;
          return this.rm.create(userId, newKeyPath, doc).then(()=>{
            return id;
          }).fail((err)=>{
            // TODO: remove doc
          });
        });
      }
    });
  }
  
  put(clientId: string, userId: string, keyPath: string[], doc: any, opts: {}): Promise<any>
  {
    return this.rm.checkRights(userId, keyPath, Rights.PUT).then((allowed) => {
      if(allowed){
        return this.rm.put(userId, keyPath, doc).then(() => {
          return this.storage.put(keyPath, doc, opts).then(()=>{
            this.syncHub && this.syncHub.update(clientId, keyPath, doc);
          }).fail((err)=>{
            // TODO: remove rights
            log("Error updating document:", keyPath, err)
          });
        });
      }
    });
  }
  
  fetch(userId: string, keyPath: string[]): Promise<any>
  {
    return this.rm.checkRights(userId, keyPath, Rights.GET).then((allowed) => {
      if(allowed){
        return this.storage.fetch(keyPath);
      }
    });
  }

  del(clientId: string, userId: string, keyPath: string[], opts: {}): Promise<any>
  {
    return this.rm.checkRights(userId, keyPath, Rights.DEL).then((allowed) => {
      if(allowed){
        return this.rm.del(userId, keyPath).then(() => {
          return this.storage.del(keyPath, opts).then(()=>{
            this.syncHub && this.syncHub.delete(clientId, keyPath);
          });
        });
      }
    });
  }

  //
  // Collection
  //
  add(clientId: string, 
      userId: string, 
      keyPath: string[], 
      itemsKeyPath: string[], 
      itemIds:string[], 
      opts: {}): Promise<any>
  {
    return this.rm.checkRights(userId, keyPath, Rights.PUT).then((allowed) => {
      if(allowed){
        return this.rm.add(userId, keyPath, itemsKeyPath, itemIds).then(() => {
          return this.storage.add(keyPath, itemsKeyPath, itemIds, opts).then(()=>{
            this.syncHub && this.syncHub.add(clientId, keyPath, itemsKeyPath, itemIds);
          });
        });
      }
    });
  }

  remove(clientId: string, 
         userId: string,
         keyPath: string[],
         itemsKeyPath: string[],
         itemIds:string[],
         opts: {}): Promise<any>
  {
    return this.rm.checkRights(userId, keyPath, Rights.DEL).then((allowed) => {
      if(allowed){
        return this.rm.remove(userId, keyPath, itemsKeyPath, itemIds).then(() =>
          this.storage.remove(keyPath, itemsKeyPath, itemIds, opts).then(() => {
            this.syncHub && this.syncHub.remove(clientId, keyPath, itemsKeyPath, itemIds);
          })
        );
      }
    });
  }

  find(userId: string, keyPath: string[], query: {}, opts: {}): Promise<any[]>
  {
    return this.rm.checkRights(userId, keyPath, Rights.GET).then<any[]>((allowed?) => {
      if(allowed){
        return this.storage.find(keyPath, query, opts);
      }
    });
  }
  
  //
  // Sequences
  //
  all(userId: string, keyPath: string[], query: {}, opts: {}) : Promise<any[]>
  {
    return this.rm.checkRights(userId, keyPath, Rights.GET).then<any[]>((allowed?) => {
      if(allowed){
        return this.storage.all(keyPath, query, opts);
      }
    });
  }
  
  deleteItem(clientId: string, userId: string, keyPath: string[], id: string, opts: {}): Promise<any>
  {
    return this.rm.checkRights(userId, keyPath, Rights.DEL).then((allowed?) => {
      if(allowed){
        return this.storage.deleteItem(keyPath, id, opts).then(() => {
          this.syncHub && this.syncHub.deleteItem(clientId, keyPath, id);
        });
      }
    });
  }

  insertBefore(clientId: string, 
               userId: string,
               keyPath: string[],
               id: string,
               itemKeyPath: string[], 
               opts): Promise<any> //<{id:string; refId?: string>}
  {
    return this.rm.checkRights(userId, keyPath, Rights.PUT).then((allowed) => {
      if(allowed){
        return this.storage.insertBefore(keyPath, id, itemKeyPath, opts).then((res)=>{
          this.syncHub && this.syncHub.insertBefore(clientId, keyPath, res.id, itemKeyPath, res.refId);
          return res;
        });
      }
    });
  }  
}

}
