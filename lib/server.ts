/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Ground Server. Acts as a controller for Storage implementations and
  the synchronization module.
*/

/// <reference path="log.ts" />
/// <reference path="error.ts" />
/// <reference path="storage/storage.ts" />
/// <reference path="sync/sync-backend.ts" />
/// <reference path="session/rightsmanager.ts" />
/// <reference path="session/sessionmanager.ts" />

/*
  GndServer gndServer = new GndServer(new MongoStorage(...));
*/

// TODO: Improve error handling after ACL rights setting.
module Gnd {

  const MissingRightsError = {
    code: ServerError.MISSING_RIGHTS,
    msg: "Missing rights for the requested operation"
  };

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
      rightsManager?: RightsManager) {
      this.storage = persistentStorage;
      this.sessionManager = sessionManager;
      this.syncHub = syncHub;
      this.rm = rightsManager || new RightsManager();
    }

    create(userId: string, keyPath: string[], doc: any, opts: {}): Promise<any> {
      var docs = _.isArray(doc) ? doc : [doc];

      return Promise.map(docs, (doc) => {
        return this.rm.checkRights(userId, keyPath, Rights.CREATE, doc);
      })
        .then(_.every)
        .then((allowed) => {
          if (allowed) {
            return Promise.map(docs, (doc) => {
              _.extend(doc, { _persisted: true });
              return this.storage.create(keyPath, doc, opts).then((id) => {
                var newKeyPath = id ? keyPath.concat([id]) : keyPath;
                return this.rm.create(userId, newKeyPath, doc).then(() => {
                  return id;
                }, (err) => {
                  // TODO: rollback doc creation.
                });
              });
            }).then((ids) => {
              return ids.length > 1 ? ids : ids[0];
            });
          } else {
            throw MissingRightsError;
          }
        });
    }

    put(clientId: string, userId: string, keyPath: string[], doc: any, opts: {}): Promise<any> {
      return this.rm.checkRights(userId, keyPath, Rights.PUT, doc).then((allowed) => {
        if (allowed) {
          return this.storage.put(keyPath, doc, opts).then(() => {
            this.syncHub && this.syncHub.update(clientId, keyPath, doc);
          });
        } else {
          throw MissingRightsError;
        }
      });
    }

    fetch(userId: string, keyPath: string[], fields?: string): Promise<any> {
      return this.rm.checkRights(userId, keyPath, Rights.GET, fields).then((allowed) => {
        if (allowed) {
          return this.storage.fetch(keyPath, fields);
        } else {
          throw MissingRightsError;
        }
      });
    }

    del(clientId: string, userId: string, keyPath: string[], opts: {}): Promise<any> {
      return this.rm.checkRights(userId, keyPath, Rights.DEL).then((allowed) => {
        if (allowed) {
          return this.rm.del(userId, keyPath).then(() => {
            return this.storage.del(keyPath, opts).then(() => {
              this.syncHub && this.syncHub.delete(clientId, keyPath);
            });
          });
        } else {
          throw MissingRightsError;
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
      itemIds: any, // string || string[]
      opts: {}): Promise<any> {
      itemIds = _.isArray(itemIds) ? itemIds : [itemIds];
      return this.rm.checkRights(userId, keyPath, Rights.PUT).then((allowed) => {
        if (allowed) {
          return this.rm.add(userId, keyPath, itemsKeyPath, itemIds).then(() => {
            return this.storage.add(keyPath, itemsKeyPath, itemIds, opts).then(() => {
              this.syncHub && this.syncHub.add(clientId, keyPath, itemsKeyPath, itemIds);
              return itemIds;
            });
          });
        } else {
          throw MissingRightsError;
        }
      });
    }

    remove(clientId: string,
      userId: string,
      keyPath: string[],
      itemsKeyPath: string[],
      itemIds: string[],
      opts: {}): Promise<any> {
      return this.rm.checkRights(userId, keyPath, Rights.DEL).then((allowed) => {
        if (allowed) {
          return this.rm.remove(userId, keyPath, itemsKeyPath, itemIds).then(() =>
            this.storage.remove(keyPath, itemsKeyPath, itemIds, opts).then(() => {
              this.syncHub && this.syncHub.remove(clientId, keyPath, itemsKeyPath, itemIds);
            })
          );
        } else {
          throw MissingRightsError;
        }
      });
    }

    find(userId: string, keyPath: string[], query: {}, opts: {}): Promise<any[]> {
      return this.rm.checkRights(userId, keyPath, Rights.GET).then<any[]>((allowed?) => {
        if (allowed) {
          return this.storage.find(keyPath, query, opts);
        } else {
          throw MissingRightsError;
        }
      });
    }

    //
    // Sequences
    //
    all(userId: string, keyPath: string[], query: {}, opts: {}): Promise<any[]> {
      return this.rm.checkRights(userId, keyPath, Rights.GET).then<any[]>((allowed?) => {
        if (allowed) {
          return this.storage.all(keyPath, query, opts);
        } else {
          throw MissingRightsError;
        }
      });
    }

    deleteItem(clientId: string, userId: string, keyPath: string[], id: string, opts: {}): Promise<any> {
      return this.rm.checkRights(userId, keyPath, Rights.DEL).then((allowed?) => {
        if (allowed) {
          return this.storage.deleteItem(keyPath, id, opts).then(() => {
            this.syncHub && this.syncHub.deleteItem(clientId, keyPath, id);
          });
        } else {
          throw MissingRightsError;
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
        if (allowed) {
          return this.storage.insertBefore(keyPath, id, itemKeyPath, opts).then((res) => {
            this.syncHub && this.syncHub.insertBefore(clientId, keyPath, res.id, itemKeyPath, res.refId);
            return res;
          });
        } else {
          throw MissingRightsError;
        }
      });
    }
  }
}
