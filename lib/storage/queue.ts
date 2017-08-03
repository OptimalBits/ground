/**
  Ground Web Framework (c) 2012-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage Queue.
*/

/// <reference path="storage.ts" />
/// <reference path="query.ts" />
/// <reference path="../error.ts" />
/// <reference path="../promise.ts" />
/// <reference path="../container/sequence.ts" />

/**
  @module Gnd
  @submodule Storage
*/
module Gnd.Storage {
"use strict";

  var QUEUE_STORAGE_KEY = 'meta@taskQueue'

  //
  // The Queue needs a local storage (based on HTML5 local storage, IndexedDB, WebSQL, etc)
  // and a remote Storage.
  //

  export interface Command {
    cmd: string;
    keyPath?: string[];
    id?: string;
    cid?: string;
    itemKeyPath?: string[];
    itemsKeyPath?: string[];
    args?: {};
    itemIds?: string[];
    oldItemIds?: string[];
    fn?: (cb:()=>void)=>void; //for sync tasks
  }

  /**
    The storage queue is in reality a Transaction Log.

    With this in mind we need to implement it as such. Every cmd needs a
    unique ID. The transaction log needs a server counterpart so that processed
    IDs can be used to detect duplicated commands.

  */

/**
  Storage Queue

  This class allows offline support for the classes that need to
  save data in a remote storage. The Queue will save first all
  data in a local storage, and synchronize with the remote
  storage as soon as it is available. It also caches all content that is
  accessed via its methods.

  The queue also provides methods to read data from the storages. This methods
  take care of accessing first the cached versions if any, and then tries the
  remote ones (and cache accordingly).

  This is an internal class used by the framework and should never be used
  otherwise.

  @class Storage.Queue
  @extends Base
  @uses Storage.IStorage
  @constructor
  @param local {Storage.IStorage} storage instance to use as local storage.
  @param [remote] {Storage.IStorage} storage instance to use as server storage.
  @param [autosync=true] {Boolean} specify if auto synchronization should be enabled.
*/
export class Queue extends Base implements IStorage
{
  static mergeFns = {
    id: function(item){
      return item.id;
    },
    keyPath: function(item){
      return item.keyPath;
    },
    doc: function(item){
      return item.doc;
    },
    inSync: function(item){
      return item.doc.__op === 'insync' || item.doc.__op === 'rm';
    }
  };

  private savedQueue: {};
  private queue: Command[];
  private createList = {};
  private syncFn: ()=>void;
  private currentTransfer = null;
  private localStorage: IStorage;
  private remoteStorage: IStorage = null;
  private useRemote: boolean;
  private autosync: boolean;

  public static makeKey(keyPath: string[])
  {
    return keyPath.join(':');
  }

  private static itemEquals(item1, item2){
    return (!item1 && !item2) ||
      (item1 && item2 && (item1.doc._cid === item2.doc._cid));
  }

  constructor(local: IStorage, remote?: IStorage, autosync?: boolean)
  {
    super();

    this.localStorage = local;
    this.remoteStorage = remote;
    this.queue = [];

    this.useRemote = !!this.remoteStorage;
    this.syncFn = <()=>void>_.bind(this.synchronize, this);
    this.autosync = typeof autosync === 'undefined' ? true : autosync;
  }

  /**
    Initializes the queue. This method should be called after creating a queue
    to load the serialized queue.

    @method init
    @param cb {Function} callback called after initializing the queue.
  */
  init(cb:(err?: Error) => void)
  {
    this.loadQueue();
    cb();
  }

  /**
    Explicitly executes the queue. This method will start executing commands
    in the queue until the whole queue is processed. If the queue has been
    created with *autosync=true* then this method should not be called.

    @method exec
    @return {Promise} promise resolved after executing all the commands.
  */
  exec(): Promise<void>
  {
    return new Promise<void>((resolve, reject) => {
      if(!this.currentTransfer && this.queue.length === 0){
        return resolve(void 0);
      }
      this.once('synced:', ()=>{
        resolve(void 0);
      });
      this.syncFn();
    });
  }

  /**
    Fetches a document from the storages. It will try first with the local
    storage, and after that the remote one.

    @param keyPath {KeyPath} key path pointing to the document to fetch.
  */
  fetch(keyPath: string[]): Promise<any>
  {
    return this.localStorage.fetch(keyPath).then((doc)=>{
      var id = _.last(keyPath);
      var remotePromise = this.useRemote && doc._persisted ?
        this.fetchRemote(keyPath) : Promise.resolved(doc);

        return [doc, remotePromise];
    }, (err) => {
      if(!this.useRemote) throw err;

      return this.fetchRemote(keyPath).then((docRemote)=>{
        return [docRemote, Promise.resolved(docRemote)];
      });
    });
  }

  fetchLocal(keyPath: string[]): Promise<any>
  {
    return this.localStorage.fetch(keyPath);
  }

  fetchRemote(keyPath: string[]): Promise<any>
  {
    return this.remoteStorage.fetch(keyPath).then((docRemote) => {
      return this.localStorage.put(keyPath, docRemote, {}).then(() => {
        return docRemote;
      });
    }).timeout(5000);
  }

  private execCmds(keyPath: string[], commands: MergeCommand[]): Promise<void[]>
  {
    var opts = {insync: true};
    return Gnd.Promise.map<any>(commands, (cmd: MergeCommand) => {
      switch(cmd.cmd) {
        case 'insertBefore':
          return this.localStorage.put(cmd.keyPath, cmd.doc, opts).then(() => {
            this.localStorage.insertBefore(keyPath, cmd.refId, cmd.keyPath,
              Util.extendClone({ id:cmd.newId }, opts));
          });
        case 'removeItem':
          return this.localStorage.deleteItem(keyPath, cmd.id, opts);

        case 'update':
          return this.localStorage.put(cmd.keyPath, cmd.doc, opts);
        default:
          return Promise.rejected(Error('Invalid command: '+cmd));
      }
    });
  }

  private updateLocalSequence(keyPath: string[], opts: {}, remoteSeq: IDoc[]): Promise<any>
  {
    opts = _.extend({snapshot: false}, opts);

    return this.localStorage.all(keyPath, {}, opts).then((localSeq: IDoc[]) => {
      var commands = Sequence.merge(remoteSeq, localSeq, Queue.mergeFns);
      return this.execCmds(keyPath, commands);
    });
  }

  //
  // This method must be atomic, it can be achieved using the Mutex, since
  // the queue is a singleton.
  // TODO: We need to fix "itemKeypath" since now it is always taken the
  // last keypath component, which is not correct if the model has defined
  // the collection in a different property name different from the
  // item's collection.
  //
  private updateLocalCollection(keyPath: string[],
                                query: IStorageQuery,
                                options: {},
                                newItems: any[]): Promise<any> // Promise<{}[]>
  {
    var
      storage = this.localStorage,
      itemKeyPath = [_.last(keyPath)],
      result = [];

    query = query || {};

    newItems = newItems || [];
    options = _.extend({snapshot: false}, options);

    return storage.find(keyPath, query, options).then((oldItems) => {
      var itemsToRemove = [], itemsToAdd = [];

      function findItem(items, itemToFind){
        return _.find(items, function(item: ListItem){
            return (item._cid === itemToFind._cid);
        });
      }

      //
      // Gather item ids to be removed/updated from localStorage
      //
      _.each(oldItems, (oldItem) => {
        if(Query.match(query.cond || {}, oldItem)){
          var newItem = findItem(newItems, oldItem);
          if(oldItem.__op === 'insync' && !newItem){
            itemsToRemove.push(oldItem._cid);
          }else if(oldItem.__op !== 'rm'){
            result.push(newItem);
          }
        }
      });

      //
      // Gather item ids to be added to localStorage
      //
      _.each(newItems, (newItem) => {
        if(!findItem(oldItems, newItem)){
          itemsToAdd.push(newItem._cid);
          result.push(newItem);
        }
      });

      return storage.remove(keyPath, itemKeyPath, itemsToRemove, {insync:true}).then(() =>
        // TODO: Do we really need to update all items here?
        Promise.map(newItems, (doc) => {
          var elemKeyPath = itemKeyPath.concat(doc._cid);
          return storage.put(elemKeyPath, doc, {});
        })
        .then(() => storage.add(keyPath, itemKeyPath, itemsToAdd, {insync: true}))
        .then(() => result)

      ).fail(); // catch this failure to avoid propagation.

    // We cannot get the local items, so lets write all we got from remote
    }).fail(() =>
      storage.add(keyPath, itemKeyPath, _.pluck(newItems, '_cid'), {insync: true})
      .then(() => newItems));
  }

  // Put all local storage operations in a task queue, so that they are
  // guaranteed to be executed in a deterministic order
  create(keyPath: string[], args:{}, opts: {}): Promise<string>
  {
    return this.localStorage.create(keyPath, args, opts).then((cid)=>{
      args['_cid'] = args['_cid'] || cid;
      this.addCmd({cmd:'create', keyPath: keyPath, args: args}, opts);
      return cid;
    });
  }

  put(keyPath: string[], args:{}, opts: {}): Promise<void>
  {
    return this.putLocal(keyPath, args, opts).then<void>(()=>{
      this.addCmd({cmd:'update', keyPath: keyPath, args: args}, opts);
    });
  }

  putLocal(keyPath: string[], args:{}, opts: {}): Promise<void>
  {
    return this.localStorage.put(keyPath, args, opts);
  }

  del(keyPath: string[], opts: {}): Promise<void>
  {
    return this.localStorage.del(keyPath, opts).then(()=>{
      //if(!Model.isClientId(_.last(keyPath))){
        // We need to check if we need to delete server side as well.
        this.addCmd({cmd:'delete', keyPath: keyPath}, opts);
      //}
    });
  }

  add(keyPath: string[], itemsKeyPath: string[], itemIds: string[], opts: {}): Promise<void>
  {
    return this.localStorage.add(keyPath, itemsKeyPath, itemIds, {}).then(() => {
      this.addCmd({cmd:'add', keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds:itemIds}, opts);
    });
  }

  // itemIds: {[index: string]: boolean}
  remove(keyPath: string[], itemsKeyPath: string[], itemIds: any, opts: {}): Promise<void>
  {
    var localItemsIds = [];
    var remoteItemIds = [];

    for(var id in itemIds){
      if(itemIds[id]){
        remoteItemIds.push(id);
      }
      localItemsIds.push(id);
    }

    return this.localStorage.remove(keyPath, itemsKeyPath, localItemsIds, {}).then(() => {
      this.addCmd({
        cmd:'remove', keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds:remoteItemIds
      }, opts);
    });
  }

  removeLocal(keyPath: string[], itemsKeyPath: string[], itemIds: any, opts: {}): Promise<void>{
    var localItemsIds = [];
    for(var id in itemIds){
      localItemsIds.push(id);
    }
    return this.localStorage.remove(keyPath, itemsKeyPath, itemIds, {});
  }


  findRemote(keyPath: string[], query: IStorageQuery, opts: {noremote?:boolean})
  {
    return this.remoteStorage.find(keyPath, query, opts).then(
      (items) => this.updateLocalCollection(keyPath, query, opts, items)
    );
  }

  find(keyPath: string[], query: IStorageQuery, opts: {noremote?:boolean}): Promise<any[]>
  {
    return new Promise((resolve, reject) => {
      var remoteDeferred = Promise.defer();
      var useRemote = this.useRemote && !opts.noremote;

      var localOpts = _.extend({snapshot:true}, opts);

      this.localStorage.find(keyPath, query, localOpts).then((items)=>{
        resolve([items, remoteDeferred.promise]);

        if(useRemote){
          this.findRemote(keyPath, query, opts)
            .then((itemsRemote) => remoteDeferred.resolve(itemsRemote))
            .fail((err) => remoteDeferred.reject(err));
        }else{
          remoteDeferred.resolve(items)
        }
      }, (err) => {
        if(!useRemote) return reject(err);

        this.findRemote(keyPath, query, opts).then((itemsRemote)=>{
          remoteDeferred.resolve(itemsRemote);
          resolve([itemsRemote, remoteDeferred.promise]);
        }).fail((err)=>{
          reject(err);
        });
      });
    });
  }

  // This function is very similar to the find function, and it should be
  // possible to refactor it.
  all(keyPath: string[], query?: {}, opts?: {noremote?:boolean}): Promise<any[]>
  {
    query = query || {};
    opts = opts || {};
    return new Promise((resolve, reject) => {
      var remoteDeferred = Promise.defer();
      var useRemote = this.useRemote && !opts.noremote;

      var localOpts = _.extend({snapshot:true}, opts);

      this.localStorage.all(keyPath, query, localOpts).then((result: any) => {
        resolve([result, remoteDeferred.promise]);

        if(useRemote){
          this.allRemote(keyPath, query, opts)
            .then((itemsRemote) => remoteDeferred.resolve(itemsRemote))
            .fail((err) => remoteDeferred.reject(err));
        }else{
          remoteDeferred.resolve(result);
        }
      }, (err) => {
        if(!useRemote) return reject(err);

        this.allRemote(keyPath, query, opts).then((itemsRemote)=>{
          remoteDeferred.resolve(itemsRemote);
          resolve([itemsRemote, remoteDeferred.promise]);
        }).fail((err) => {
          reject(err);
        });
      });
    });
  }

  allRemote(keyPath: string[], query: {noremote?:boolean}, opts: {})
  {
    var localOpts = _.extend({snapshot:true}, opts);

    return this.remoteStorage.all(keyPath, query, opts)
      .then((remote) => this.updateLocalSequence(keyPath, opts, remote))
      .then(()=> this.localStorage.all(keyPath, {}, localOpts));
  }

  deleteItem(keyPath: string[], id: string, opts: {}): Promise<void>
  {
    return this.localStorage.deleteItem(keyPath, id, opts).then(() =>
      this.addCmd({cmd:'deleteItem', keyPath: keyPath, id: id}, opts)
    );
  }

  insertBefore(keyPath: string[], id: string, itemKeyPath: string[], opts: {}): Promise<{id: string; refId: string;}>
  {
    return this.localStorage.insertBefore(keyPath, id, itemKeyPath, opts).then((res) => {
      this.addCmd({cmd:'insertBefore',
                  keyPath: keyPath,
                  id: id,
                  itemKeyPath: itemKeyPath,
                  cid: res.id}, opts);
      //return res.id; // wrong?
      return res;
    });
  }

  /**
  TODO: Rename to commit, since what this does is commit operations
  */
  synchronize()
  {
    var done = <(err?, sid?)=>void>_.bind(this.completed, this);

    if (!this.currentTransfer){
      if (this.queue.length){
        var
          obj = this.currentTransfer = this.queue[0],
          localStorage = this.localStorage,
          remoteStorage = this.remoteStorage,
          keyPath = obj.keyPath,
          itemsKeyPath = obj.itemsKeyPath,
          itemIds = obj.itemIds,
          args = obj.args;

        //
        // FIXME: Persistent errors will  block the queue forever.(we need a watchdog).
        //

        switch (obj.cmd){
          case 'create':
            ((cid) => {
              // should this be done serverside instead, by the backend?
              args = _.extend(args, {_persisted: true});
              remoteStorage.create(keyPath, args, {}).then(() => {
                localStorage.put(keyPath, {_persisted: true}, {});
                // Instead of a global event it should be better to use the
                // model depot.
                this.emit('created:'+cid, cid);
              }).then(done, done)
            })(args['_cid']);

            break;
          case 'update':
            remoteStorage.put(keyPath, args, {}).then(done, done);
            break;
          case 'delete':
            remoteStorage.del(keyPath, {}).then(() => done(), (err) => done());
            break;
          case 'add':
            remoteStorage.add(keyPath, itemsKeyPath, itemIds, {}).then(() => done(), done);
            break;
          case 'remove':
            remoteStorage.remove(keyPath, itemsKeyPath, _.unique(itemIds), {}).then(done, done);
            break;
          case 'insertBefore':
            var id = obj.id;
            var itemKeyPath = obj.itemKeyPath;
            var cid = obj.cid;
            remoteStorage.insertBefore(keyPath, id, itemKeyPath, {cid: cid}).then((res)=>{
              return localStorage.ack(keyPath, cid, cid, {op: 'ib'}).then(()=>{
                this.emit('inserted:'+cid, cid, res.refId);
              });
            }).then(done, done);
            break;
          case 'deleteItem':
            remoteStorage.deleteItem(keyPath, obj.id, {}).then(done, done);
            break;
          case 'syncTask':
            obj.fn(done);
            break;
        }
      } else {
        // this.emit('synced:', this);
        var subQ = <any>(this.remoteStorage);
        if(this.autosync || !subQ.once){
          this.emit('synced:', this);
        }else{
          subQ.once('synced:', ()=>{
            this.emit('synced:', this);
          });
        }
      }
    } else{
      Gnd.log('busy with ', this.currentTransfer);
    }
  }

  /**
    Waits until all commands have been executed.

    @method waitUntilSynced
    @param cb {Function} Callback called after executing all commands or called
    directly if there are no commands left in the queue.
  */
  public waitUntilSynced(cb:()=>void)
  {
    if(this.queue.length > 0){
      this.once('synced:', cb);
    }else{
      cb();
    }
  }

  /**
    Checks if the queue is empty.

    @method isEmpty
    @return {Boolean} true if empty, false otherwise.
  */
  public isEmpty(){
    return !this.queue.length;
  }

  private loadQueue()
  {
    this.queue = JSON.parse(localStorage[QUEUE_STORAGE_KEY] || '[]');
  }

  private saveQueue()
  {
    localStorage[QUEUE_STORAGE_KEY] = JSON.stringify(this.queue);
  }

  private enqueueCmd(cmd: Command)
  {
    this.queue.push(cmd);
    this.autosync && this.saveQueue();
  }
  private dequeueCmd(): Command
  {
    var cmd = this.queue.shift();
    this.autosync && this.saveQueue();
    return cmd;
  }
  private fireOnEmptyQueue(fn: (cb)=>void)
  {
    if(this.queue.length > 0){
      this.once('synced:', fn);
      this.addCmd({cmd:'syncTask', fn: fn}, {});
    }else{
      fn(Util.noop);
    }
  }

  private addCmd(cmd: Command, opts: {noremote?: boolean;})
  {
    if(this.useRemote && !opts.noremote){
      this.enqueueCmd(cmd);
      this.autosync && this.synchronize();
    }
  }

  private completed(err?: Error)
  {
    var storage = this.localStorage;
    var syncFn = () => Util.nextTick(() => this.synchronize());

    if(!err){ // || (err.status >= 400 && err.status < 500)){
      var cmd = this.dequeueCmd();
      if(!cmd) return;

      Gnd.log("Completed queue command", cmd);

      var opts = {insync: true};

      ((): Promise<void> => {
        switch(cmd.cmd){
          case 'add':
            return storage.remove(cmd.keyPath, cmd.itemsKeyPath, cmd.oldItemIds || [], opts)
              .then<void>(() => storage.add(cmd.keyPath,
                                            cmd.itemsKeyPath,
                                            cmd.itemIds,
                                            opts));
          case 'remove':
            var itemsToRemove = (cmd.oldItemIds || []).concat(cmd.itemIds || []);
            return storage.remove(cmd.keyPath, cmd.itemsKeyPath, itemsToRemove, opts);
          case 'deleteItem':
            return storage.ack(cmd.keyPath, null, cmd.id, {op: 'rm'});
        }
        return Promise.resolved(void 0);
      })().ensure(() => syncFn());

    }else{
      var errCode = ServerError[err.message];

      Gnd.log("Queue error:", err, errCode, this.queue[0]);

      switch(errCode){
        case ServerError.INVALID_ID:
        case ServerError.INVALID_SESSION:
        case ServerError.DOCUMENT_NOT_FOUND:
        case ServerError.MODEL_NOT_FOUND:
        case ServerError.MISSING_RIGHTS:
          // Discard command
          this.dequeueCmd();
          this.emit('error:', err);
          syncFn();
          break;
        default:
        // Shouldn't we try to synchronize again after x seconds?
      }
    }

    this.currentTransfer = null;
  }
}
}
