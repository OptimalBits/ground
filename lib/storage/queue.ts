/**
  Ground Web Framework (c) 2012-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage Queue
*/

/// <reference path="../error.ts" />
/// <reference path="storage.ts" />
/// <reference path="../promise.ts" />

module Gnd.Storage {
  
  var QUEUE_STORAGE_KEY = 'meta@taskQueue'
  
  //
  // The Queue needs a local storage (based on HTML5 local storage, IndexedDB, WebSQL, etc)
  // and a remote Storage.
  //
  
  export interface Command {
    cmd: string;
    keyPath?: string[];
    // refItemKeyPath?: string[];
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
  storage as soon as it is available.
*/
export class Queue extends Base implements IStorage
{
  private savedQueue: {};
  private queue: Command[];
  private createList = {};
  private syncFn: ()=>void;
  private currentTransfer = null;
  private localStorage: IStorage;
  private remoteStorage: IStorage = null;
  private useRemote: bool;
  private autosync: bool;
  
  public static makeKey(keyPath: string[])
  {
    return keyPath.join(':');
  }

  private static itemEquals(item1, item2){
    return (!item1 && !item2) || 
      (item1 && item2 && (item1.doc._id === item2.doc._id || item1.doc._cid === item2.doc._cid));
  }

  constructor(local: IStorage, remote?: IStorage, autosync?: bool)
  {
    super();
  
    this.localStorage = local;
    this.remoteStorage = remote;
    this.queue = [];
    
    this.useRemote = !!this.remoteStorage;
    this.syncFn = <()=>void>_.bind(this.synchronize, this);
    this.autosync = typeof autosync === 'undefined' ? true : autosync;
  }
  
  init(cb:(err?: Error) => void)
  {
    this.loadQueue();
    cb();
  }
  
  exec()
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
  
  fetch(keyPath: string[]): Promise
  {
    var promise = new Promise();
    var remotePromise = new Promise();
    
    var fetchRemote = ()=>{
      return this.remoteStorage.fetch(keyPath).then((docRemote) => {
        docRemote['_persisted'] = true;
        return this.localStorage.put(keyPath, docRemote).then(() => {
          return docRemote;
        });
      });
    }
    
    this.localStorage.fetch(keyPath).then((doc)=>{
      doc['_id'] = _.last(keyPath);
      promise.resolve([doc, remotePromise]);
      
      if(this.useRemote){
        fetchRemote().then((docRemote)=>{
          remotePromise.resolve(docRemote);
        })
      }
    }, (err) => {
      if(!this.useRemote) return promise.reject(err);

      fetchRemote().then((docRemote)=>{
        remotePromise.resolve(docRemote);
        promise.resolve([docRemote, remotePromise]);
      }).fail((err)=>{
        promise.reject(err);
      });
    });
    return promise;
  }
  
  private updateLocalSequence(keyPath: string[], 
                                opts: {},
                                remoteSeq: IDoc[], cb: (err?:Error) => void)
  {
    var storage = this.localStorage;
    
    opts = _.extend({snapshot: false}, opts);

    storage.all(keyPath, {}, opts, (err?:Error, localSeq?: IDoc[]) => {
      var remoteIds = _.map(remoteSeq, function(item){
        return item.doc._id;
      }).sort();
      var remainingItems = [];
      Util.asyncForEach(localSeq, function(item, done){
        if(item.doc.__op === 'insync' && -1 === _.indexOf(remoteIds, item.doc._id, true)){
          storage.deleteItem(keyPath, item.id, {insync:true}, (err?)=>{
            done(err);
          });
        }else{
          remainingItems.push(item);
          done();
        }
      }, function(err){
        // insert new items
        var newItems = [];
        var i=0;
        var j=0;
        var localItem, remoteItem;
        while(i<remainingItems.length){
          localItem = remainingItems[i];
          if(localItem.doc.__op === 'insync'){
            remoteItem = remoteSeq[j];
            if(localItem.doc._id === remoteItem.doc._id){
              i++;
            }else{
              newItems.push({
                id: localItem.id,
                keyPath: remoteItem.keyPath,
                doc: remoteItem.doc
              });
            }
            j++;
          }else{
            i++;
          }
        }
        while(j<remoteSeq.length){
          remoteItem = remoteSeq[j];
          newItems.push({
            id: remoteItem.id,
            keyPath: remoteItem.keyPath,
            doc: remoteItem.doc
          });
          j++;
        }

        Util.asyncForEach(newItems, function(item, done){
          item.doc._cid = item.doc._id; // ??
          storage.put(_.initial(item.keyPath), item.doc).then(()=>{
            storage.insertBefore(keyPath, null, item.keyPath, {
              insync:true,
              id:item.id
            }, (err?)=>{
              done(err);
            });
          }).fail(cb);
        }, cb);
      });
    });
  }
  
  private updateLocalCollection(keyPath: string[], 
                                query: {}, 
                                options: {},
                                newItems: any[]): Promise // Promise<void>
  {
    var 
      storage = this.localStorage,
      itemKeyPath = [_.last(keyPath)];
    
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
      _.each(oldItems, function(oldItem){
        if(oldItem.__op === 'insync' && !findItem(newItems, oldItem)){
          itemsToRemove.push(oldItem._cid, oldItem._id);
        }
      });
        
      // Gather item ids to be added to localStorage      
      _.each(newItems, function(newItem){
        !findItem(oldItems, newItem) && itemsToAdd.push(newItem._id);
      });
        
      return storage.remove(keyPath, itemKeyPath, itemsToRemove, {insync:true}).then(() => {
        return Promise.map(newItems, (doc) => {
          var elemKeyPath = itemKeyPath.concat(doc._id);

          doc._persisted = true;

          // TODO: Probably not needed to update all newItems
          doc._cid = doc._id; // ??
          return storage.put(elemKeyPath, doc);
        }).then(() => {
          // Add the new collection keys to the keyPath
          return storage.add(keyPath, itemKeyPath, itemsToAdd, {insync: true});
        });
      }).fail(); // catch this failure to avoid propagation.
      
    }).fail((err)=>{
      return storage.add(keyPath, itemKeyPath, _.pluck(newItems, '_id'), {insync: true});
    });
  }
  
  find(keyPath: string[], query: {}, options: {}): Promise
  {
    var promise = new Promise();
    var remotePromise = new Promise();
    
    var localOpts = _.extend({snapshot:true}, options);
    
    var findRemote = ()=>{
      return this.remoteStorage.find(keyPath, query, options).then((remote) => {
        return this.updateLocalCollection(keyPath, query, options, remote);
      }).then(()=>{
        return this.localStorage.find(keyPath, query, localOpts);
      });
    }
    
    this.localStorage.find(keyPath, query, localOpts).then((result)=>{
      promise.resolve([result, remotePromise]);
      
      if(this.useRemote){
        findRemote().then((itemsRemote)=>{
          remotePromise.resolve(itemsRemote);
        });
      }
    }, (err) => {
      if(!this.useRemote) return promise.reject(err);

      findRemote().then((itemsRemote)=>{
        remotePromise.resolve(itemsRemote);
        promise.resolve([itemsRemote, remotePromise]);
      }).fail((err)=>{
        promise.reject(err);
      });
    });
    return promise;
  }
  
  /*
  find(keyPath: string[], query: {}, options: {}): Promise
  {
    var promise = new Promise();
    var remotePromise = new Promise();
    
    var localOpts = _.extend({snapshot:true}, options);
    this.localStorage.find(keyPath, query, localOpts, (err?, result?:any) => {
      if(result){
        promise.resolve([result, remotePromise]);
      }
      if(this.useRemote){
        this.remoteStorage.find(keyPath, query, options, (err?, remote?: any) => {
          if(!err){
            this.updateLocalCollection(keyPath, query, options, remote, (err?)=>{
              if(result){
                this.localStorage.find(keyPath, query, localOpts, (err?, items?) => {
                  remotePromise.resolveOrReject(err, items);
                });
              }
            });
          }
          !result && promise.resolveOrReject(err, [remote, remotePromise]);
        });
      }else if(!result){
        promise.reject(err);
      }
    });
    return promise;
  }
  */
    
  create(keyPath: string[], args:{}): Promise
  {
    // We need a mechanism to guarantee the order of element in the queue,
    // since create is asynchronous, it could happen that a put cmd
    // ends before the create command for a given model, creating 
    // storage problems...
    // On the other hand, first adding Cmd and then creating in storage
    // could result in remoteStorage completing before localStorage
    // with other hazzards as result...
    return this.localStorage.create(keyPath, args).then((cid)=>{
      args['_cid'] = args['_cid'] || cid;
      this.addCmd({cmd:'create', keyPath: keyPath, args: args});
      return cid;
    });
  }
  
  put(keyPath: string[], args:{}): Promise
  {
    return this.localStorage.put(keyPath, args).then(()=>{
      this.addCmd({cmd:'update', keyPath: keyPath, args: args});
    });
  }
  
  del(keyPath: string[]): Promise
  {
    return this.localStorage.del(keyPath).then(()=>{
      this.addCmd({cmd:'delete', keyPath: keyPath});
    });
  }
  
  add(keyPath: string[], itemsKeyPath: string[], itemIds: string[])
  {
    return this.localStorage.add(keyPath, itemsKeyPath, itemIds, {}).then(() => {
      this.addCmd({cmd:'add', keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds:itemIds});
    });
  }
  
  remove(keyPath: string[], itemsKeyPath: string[], itemIds: string[]): Promise
  {
    return this.localStorage.remove(keyPath, itemsKeyPath, itemIds, {}).then(() => {
      this.addCmd({
        cmd:'remove', keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds:itemIds
      });
    });
  }
  /*
  allRemote(keyPath: string[], query: {}, opts: {}): Promise
  {
    var promise = new Promise();
    // TODO: what if keyPath is local (same for find())
    this.remoteStorage.all(keyPath, query, opts, (err?, remote?: any) => {
      if(!err){
        this.updateLocalSequence(keyPath, {}, remote, (err?)=>{
          if(result){
            this.localStorage.all(keyPath, {}, localOpts, (err?, items?) => {
              promise.resolveOrReject(err, items);
            });
          }
        });
      }else{
        promise.reject(err);
      }
    });
    return promise;
  }
  
  all(keyPath: string[], query: {}, opts: {}): Promise
  {
    var promise = new Promise();
    var remotePromise;
    
    if(this.useRemote){
     remotePromise = allRemote(keyPath, query, opts).then((items)=>{
       if(promise.isFulfilled){
         return items;
        }else{
          promise.resolve([items]);
        }
      }, (err)=>{
        !promise.isFulfilled && promise.reject(err);
      });
    }
    var localOpts = _.extend({snapshot:true}, {});
    this.localStorage.all(keyPath, query, opts, (err?, result?: any) => {
      if(result){
        promise.resolve([result, remotePromise]);
      } else if(!remotePromise){
        promise.reject(err);
      }
    });

    return promise;
  }
  */
  all(keyPath: string[], query: {}, opts: {}): Promise
  {
    var promise = new Promise();
    var remotePromise = new Promise();
    
    var localOpts = _.extend({snapshot:true}, {});
    this.localStorage.all(keyPath, query, opts, (err?, result?: any) => {
      if(result){
        promise.resolve([result, remotePromise]);
      }      
      if(!this.useRemote && !result){
        promise.reject(err);
      }else{
        // TODO: what if keyPath is local (same for find())
        this.remoteStorage.all(keyPath, query, opts, (err?, remote?: any) => {
          if(!err){
            this.updateLocalSequence(keyPath, {}, remote, (err?)=>{
              if(result){
                this.localStorage.all(keyPath, {}, localOpts, (err?, items?) => {
                  remotePromise.resolveOrReject(err, items);
                });
              }
            });
          }
          !result && promise.resolveOrReject(err, [remote, remotePromise]);
        });
      }
    });
    return promise;
  }

  //TODO: do we need next
  next(keyPath: string[], id: string, opts: {}, cb: (err: Error, doc?:IDoc) => void)
  {
    this.localStorage.next(keyPath, id, opts, (err, item?) => {
      if(item){            
        cb(err, item);
      }else{
        if(!this.useRemote){
          cb(err);
        }
        this.remoteStorage.next(keyPath, id, opts, (err, itemRemote?) => {
          if(!itemRemote){
            cb(err, itemRemote);
          }
        });
      }
    });
  }
  deleteItem(keyPath: string[], id: string, opts: {}, cb: (err?: Error) => void)
  {
    this.localStorage.deleteItem(keyPath, id, opts, (err?) => {
      if(!err){
        this.addCmd({cmd:'deleteItem', keyPath: keyPath, id: id});
      }
      cb(err);
    });
  }
  insertBefore(keyPath: string[], id: string, itemKeyPath: string[], opts: {}, cb: (err: Error, id?: string, refId?: string) => void)
  {
    this.localStorage.insertBefore(keyPath, id, itemKeyPath, opts, (err: Error, cid?: string, refId?: string) => {
      if(!err){
        this.addCmd({cmd:'insertBefore', keyPath: keyPath, id: id, itemKeyPath: itemKeyPath, cid: cid});
        cb(err, cid);
      }else{
        cb(err);
      }
    });
  }
  
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
              remoteStorage.create(keyPath, args).then((sid) => {
                var localKeyPath = keyPath.concat(cid);
                
                localStorage.put(localKeyPath, {_persisted:true, _id: sid}).then(() => {
                  var newKeyPath = _.initial(localKeyPath);
                  newKeyPath.push(sid);
                  
                  localStorage.link(newKeyPath, localKeyPath).then(() => {
                    var subQ = <any>(this.remoteStorage);
                    if(this.autosync || !subQ.once){
                      this.emit('created:'+cid, sid);
                    }else{
                      subQ.once('created:'+sid, (sid)=>{
                        this.emit('created:'+cid, sid);
                      });
                    }
                    this.updateQueueIds(cid, sid);
                    done();
                  });
                });
              }).fail((err) =>{
                done(err || new Error("Create: no server id for keypath:"+keyPath));
              });
            })(args['_cid']);
            
            break;
          case 'update':
            remoteStorage.put(keyPath, args).then(done, done);
            break;
          case 'delete':
            remoteStorage.del(keyPath).then(done, done);
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
            remoteStorage.insertBefore(keyPath, id, itemKeyPath, {}, (err:Error, sid?: string, refId?: string)=>{
              if(err){
                done(err);
              }else{
                localStorage.meta(keyPath, cid, sid, (err?: Error) => {
                  var subQ = <any>(this.remoteStorage);
                  if(this.autosync || !subQ.once){
                    this.emit('inserted:'+cid, sid, refId);
                  }else{
                    subQ.once('inserted:'+sid, (newSid, refId)=>{
                      localStorage.meta(keyPath, sid, newSid, (err?: Error) => {
                        this.emit('inserted:'+cid, newSid, refId);
                      });
                    });
                  }
                  this.updateQueueIds(cid, sid);
                  done(err, sid);
                });
              }
            });
            break;
          case 'deleteItem':
            var id = obj.id;
            remoteStorage.deleteItem(keyPath, id, {}, done);
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
  
  public waitUntilSynced(cb:()=>void)
  {
    if(this.queue.length > 0){
      this.once('synced:', cb);
    }else{
      cb();
    }
  }
  
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
      this.addCmd({cmd:'syncTask', fn: fn});
    }else{
      fn(Util.noop);
    }
  }

  private addCmd(cmd: Command)
  {
    if(this.useRemote){
      this.enqueueCmd(cmd);
      this.autosync && this.synchronize();
    }
  }

  private completed(err?: Error)
  {
    var storage = this.localStorage;
    var syncFn = this.syncFn;
    
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
      
      var opts = {insync: true};
        
      switch(cmd.cmd){
        case 'add':
          storage.remove(cmd.keyPath, cmd.itemsKeyPath, cmd.oldItemIds || [], opts).then(() =>{
            storage.add(cmd.keyPath,
                        cmd.itemsKeyPath, 
                        cmd.itemIds,
                        opts).then(() => {
              Util.nextTick(syncFn);
            });
          });
          break;
        case 'remove': 
          storage.remove(cmd.keyPath, cmd.itemsKeyPath, cmd.oldItemIds || [], opts).then(() =>{
            storage.remove(cmd.keyPath, 
                           cmd.itemsKeyPath, 
                           cmd.itemIds,
                           opts).then(() => {
              Util.nextTick(syncFn);
            });
          });
          break;
        case 'insertBefore':
          storage.meta(cmd.keyPath, cmd.id, null, (err?) =>{
            Util.nextTick(syncFn);
          });
          break;
        case 'deleteItem':
          storage.meta(cmd.keyPath, cmd.id, null, (err?) =>{
            Util.nextTick(syncFn);
          });
          break;
        default:
          Util.nextTick(syncFn);
      }
    }else{
      console.log("Queue error:"+err);
      
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
          var cmd = this.dequeueCmd();
          this.emit('error:', err);
          Util.nextTick(syncFn);
          break;
        default:
        // Shouldn't we try to synchronize again?
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
