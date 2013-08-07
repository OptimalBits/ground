/**
  Ground Web Framework (c) 2012-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage Queue
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
      (item1 && item2 && (item1.doc._id === item2.doc._id || item1.doc._cid === item2.doc._cid));
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
  exec(): Promise
  {
    var promise = new Promise();
    if(!this.currentTransfer && this.queue.length === 0){
      return promise.resolve();
    } 
    this.once('synced:', ()=>{
      promise.resolve();
    });
    this.syncFn();
    return promise;
  }
  
  /**
    Fetches a document from the storages. It will try first with the local
    storage, and after that the remote one.
  
    @param keyPath {KeyPath} key path pointing to the document to fetch.
  */
  fetch(keyPath: string[]): Promise<any>
  {
    var promise = new Promise();
    
    var fetchRemote = ()=>{
      return this.remoteStorage.fetch(keyPath).then((docRemote) => {
        return this.localStorage.put(keyPath, docRemote, {}).then(() => {
          return docRemote;
        });
      });
    }
    
    this.localStorage.fetch(keyPath).then((doc)=>{
      var remotePromise = this.useRemote ? fetchRemote() : new Promise(doc);
      
      doc['_id'] = _.last(keyPath);
      promise.resolve([doc, remotePromise]);
    }, (err) => {
      if(!this.useRemote) return promise.reject(err);

      fetchRemote().then((docRemote)=>{
        promise.resolve([docRemote, new Promise(docRemote)]);
      }).fail((err)=>{
        promise.reject(err);
      });
    });
    return promise;
  }

  private execCmds(keyPath: string[], commands: MergeCommand[]): Promise<void[]>
  {
    var opts = {insync: true};
    return Gnd.Promise.map(commands, (cmd: MergeCommand) => {
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
          return new Promise(Error('Invalid command: '+cmd));
      }
    });
  }
  
  private updateLocalSequence(keyPath: string[], opts: {}, remoteSeq: IDoc[]): Promise
  {
    opts = _.extend({snapshot: false}, opts);

    return this.localStorage.all(keyPath, {}, opts).then((localSeq: IDoc[]) => {
      var commands = Sequence.merge(remoteSeq, localSeq, Queue.mergeFns);
      return this.execCmds(keyPath, commands);
    });
  }
  
  // CHALLENGE: This method must be ATOMIC, and this only holds if using
  // a synchronouse local store.
  private updateLocalCollection(keyPath: string[], 
                                query: IStorageQuery, 
                                options: {},
                                newItems: any[]): Promise // Promise<{}[]>
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
        return _.find(items, function(item){
            return (item._cid === itemToFind._cid || 
                    item._id === itemToFind._id);
        });
      }
        
      // Gather item ids to be removed from localStorage 
      _.each(oldItems, (oldItem) => {
        if(Query.match(query.cond || {}, oldItem)){
          if(oldItem.__op === 'insync' && !findItem(newItems, oldItem)){
            itemsToRemove.push(oldItem._cid, oldItem._id);
          }else if(oldItem.__op !== 'rm'){
            result.push(oldItem);
          }
        }
      });
        
      // Gather item ids to be added to localStorage      
      _.each(newItems, (newItem) => {
        if(!findItem(oldItems, newItem)){
          itemsToAdd.push(newItem._id);
          result.push(newItem);
        }
      });
      
      return storage.remove(keyPath, itemKeyPath, itemsToRemove, {insync:true}).then(() =>
        // TODO: Do we really need to update all items here?
        Promise.map(newItems, (doc) => {
          var elemKeyPath = itemKeyPath.concat(doc._id);
          doc._cid = doc._id; // ??
          return storage.put(elemKeyPath, doc, {});
        })
        .then(() => storage.add(keyPath, itemKeyPath, itemsToAdd, {insync: true}))
        .then(() => result)
        
      ).fail(); // catch this failure to avoid propagation.
    
    // We cannot get the local items, so lets write all we got from remote
    }).fail(() => 
      storage.add(keyPath, itemKeyPath, _.pluck(newItems, '_id'), {insync: true})
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
    return this.localStorage.put(keyPath, args, opts).then<void>(()=>{
      this.addCmd({cmd:'update', keyPath: keyPath, args: args}, opts);
    });
  }
  
  del(keyPath: string[], opts: {}): Promise<void>
  {
    return this.localStorage.del(keyPath, opts).then(()=>{
      this.addCmd({cmd:'delete', keyPath: keyPath}, opts);
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
  
  find(keyPath: string[], query: IStorageQuery, opts: {noremote?:boolean}): Promise<any[]>
  {
    var promise = new Promise();
    var remotePromise = new Promise();
    var useRemote = this.useRemote && !opts.noremote;
    
    var localOpts = _.extend({snapshot:true}, opts);
    
    var findRemote = () => this.remoteStorage.find(keyPath, query, opts)
      .then((remote) => this.updateLocalCollection(keyPath, query, opts, remote));
    
    this.localStorage.find(keyPath, query, localOpts).then((items)=>{
      promise.resolve([items, remotePromise]);
      
      if(useRemote){
        findRemote()
          .then((itemsRemote) => remotePromise.resolve(itemsRemote))
          .fail((err) => remotePromise.reject(err));
      }else{
        remotePromise.resolve(items)
      }
    }, (err) => {
      if(!useRemote) return promise.reject(err);

      findRemote().then((itemsRemote)=>{
        remotePromise.resolve(itemsRemote);
        promise.resolve([itemsRemote, remotePromise]);
      }).fail((err)=>{
        promise.reject(err);
      });
    });
    return promise;
  }
  
  all(keyPath: string[], query: {}, opts: {}): Promise<any[]>
  {
    var promise = new Promise();
    var remotePromise = new Promise();
    
    var localOpts = _.extend({snapshot:true}, opts);
    
    var allRemote = () => this.remoteStorage.all(keyPath, query, opts)
      .then((remote) => this.updateLocalSequence(keyPath, opts, remote))
      .then(()=> this.localStorage.all(keyPath, {}, localOpts));
  
    this.localStorage.all(keyPath, query, localOpts).then((result: any) => {
      promise.resolve([result, remotePromise]);
      
      if(this.useRemote){
        allRemote()
          .then((itemsRemote) => remotePromise.resolve(itemsRemote))
          .fail((err) => remotePromise.reject(err));
      }
    }, (err) => {
      if(!this.useRemote) return promise.reject(err);

      allRemote().then((itemsRemote)=>{
        remotePromise.resolve(itemsRemote);
        promise.resolve([itemsRemote, remotePromise]);
      }).fail((err) => promise.reject(err));
    });
    return promise;
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
              remoteStorage.create(keyPath, args, {}).then((sid) => {
                var localKeyPath = keyPath.concat(cid);
                
                return localStorage.put(localKeyPath, {_id: sid}, {}).then(() => {
                  var newKeyPath = _.initial(localKeyPath);
                  newKeyPath.push(sid);
                  
                  return localStorage.link(newKeyPath, localKeyPath).then(() => {
                    var subQ = <any>(this.remoteStorage);
                    if(this.autosync || !subQ.once){
                      this.emit('created:'+cid, sid);
                    }else{
                      subQ.once('created:'+sid, (sid)=>{
                        this.emit('created:'+cid, sid);
                      });
                    }
                    this.updateQueueIds(cid, sid);
                  });
                });
              }).then(done, done)
            })(args['_cid']);
            
            break;
          case 'update':
            remoteStorage.put(keyPath, args, {}).then(done, done);
            break;
          case 'delete':
            remoteStorage.del(keyPath, {}).then(done, done);
            break;
          case 'add':
            remoteStorage.add(keyPath, itemsKeyPath, itemIds, {}).then(done, done);
            break;
          case 'remove':
            remoteStorage.remove(keyPath, itemsKeyPath, _.unique(itemIds), {}).then(done, done);
            break;
          case 'insertBefore':
            var id = obj.id;
            var itemKeyPath = obj.itemKeyPath;
            var cid = obj.cid;
            remoteStorage.insertBefore(keyPath, id, itemKeyPath, {}).then((res)=>{
              var sid = res.id, refId = res.refId;
              return localStorage.ack(keyPath, cid, sid, {op: 'ib'}).then(()=>{
                var subQ = <any>(this.remoteStorage);
                if(this.autosync || !subQ.once){
                  this.emit('inserted:'+cid, sid, refId);
                }else{
                  subQ.once('inserted:'+sid, (newSid, refId) => {
                    localStorage.ack(keyPath, sid, newSid, {op: 'ib'}).then(() => {
                      this.emit('inserted:'+cid, newSid, refId);
                    });
                  });
                }
                this.updateQueueIds(cid, sid);
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
      console.log('busy with ', this.currentTransfer);
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
      //
      // Note: since we cannot have an atomic operation for updating the server and the
      // execution queue, the same command could be executed 2 or more times in 
      // some hazardous scenarios (if the browser crashes after updating the server
      // and before the local storage). revisions should fix this problem.
      // PROPOSAL. have a queue model in the server with a rev number.
      //
      var cmd = this.dequeueCmd();
      if(!cmd) return;
      
      console.log("Completed queue command", cmd);
      
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
        return Promise.resolved();
      })().ensure(() => syncFn());
      
    }else{
      console.log("Queue error:"+ err, this.queue[0]);
      
      // HACK
      if(err.message == 'Invalid ObjectId'){
        err.message = ''+ServerError.INVALID_ID;
      }
      
      var errCode;
      if(err.message == 'Invalid ObjectId'){
        errCode = ServerError.INVALID_ID;
      }else{
        errCode = parseInt(err.message);
      }
      
      switch(errCode){
        case ServerError.INVALID_ID:
        case ServerError.INVALID_SESSION:
        case ServerError.DOCUMENT_NOT_FOUND:
        case ServerError.MODEL_NOT_FOUND:
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

  private updateQueueIds(oldId, newId)
  { 
    _.each(this.queue, (cmd: Command) => {
      cmd.keyPath && updateIds(cmd.keyPath, oldId, newId);
      cmd.itemsKeyPath && updateIds(cmd.itemsKeyPath, oldId, newId);
      cmd.itemKeyPath && updateIds(cmd.itemKeyPath, oldId, newId);
      if(cmd.id && cmd.id === oldId) cmd.id = newId;
      if(cmd.itemIds){
        cmd.oldItemIds = updateIds(cmd.itemIds, oldId, newId);
      }
    });
    
    //
    // Serialize after updating Ids
    //
    this.saveQueue()
  }
}

function updateIds(keyPath: string[], oldId: string, newId: string): string[]
{
  var updatedKeys = [];
  for(var i=0; i<keyPath.length; i++){
    if(keyPath[i] == oldId){
      keyPath[i] = newId;
      updatedKeys.push(oldId);
    }
  }
  return updatedKeys;
}

}
