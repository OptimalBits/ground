/**
  Ground Web Framework (c) 2012-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage Queue
*/

/// <reference path="../storage.ts" />

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
    this.syncFn = _.bind(this.synchronize, this);
    this.autosync = typeof autosync === 'undefined' ? true : autosync;
  }
  
  init(cb:(err?: Error) => void)
  {
    this.loadQueue();
    cb();
  }
  
  exec(cb: (err?: Error)=>void)
  {
    if(!this.currentTransfer && this.queue.length === 0) return cb();
    this.once('synced:', cb || Util.noop);
    this.syncFn();
  }
  
  fetch(keyPath: string[], cb)
  {
    this.localStorage.fetch(keyPath, (err?, doc?) => {
      if(doc){            
        doc['_id'] = _.last(keyPath);
        cb(err, doc);
      }
      if(this.useRemote){
        this.remoteStorage.fetch(keyPath, (err?, docRemote?) => {
          if(!err){
            docRemote['_persisted'] = true;
            this.localStorage.put(keyPath, docRemote, (err?) => {
              if(err) { //not in local cache
                var collectionKeyPath = _.initial(keyPath);
                docRemote['_cid'] = docRemote['_id'];
                this.localStorage.create(collectionKeyPath, docRemote, ()=>{});
              }
            });
            this.emit('resync:'+Queue.makeKey(keyPath), docRemote);
          }
          !doc && cb(err, docRemote);
        });
      }else if(!doc){
        cb(err);
      }
    });
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
            id: null,
            keyPath: remoteItem.keyPath,
            doc: remoteItem.doc
          });
          j++;
        }

        Util.asyncForEach(newItems, function(item, done){
          //TODO: make put upsert
          function upsert(item, cb){
            storage.put(_.initial(item.keyPath), item.doc, (err?) => {
              if(err) {
                //not in local cache
                item.doc._cid = item.doc._id;
                storage.create(_.initial(item.keyPath), item.doc, (err?)=>{
                  cb(err);
                });
              }else{
                cb();
              }
            });
          }
          upsert(item, (err)=>{
            storage.insertBefore(keyPath, item.id, item.keyPath, {insync:true}, (err?)=>{
              done(err);
            });
          });
        }, function(err){
          cb(err);
        });
      });
    });
  }
  
  private updateLocalCollection(keyPath: string[], 
                                query: {}, 
                                options: {},
                                newItems: any[], cb: (err?:Error) => void)
  {
    var 
      storage = this.localStorage,
      itemKeyPath = [_.last(keyPath)];
    
    options = _.extend({snapshot: false}, options);
    
    storage.find(keyPath, query, options, (err?:Error, oldItems?: {}[]) => {
      if(!err){
        var itemsToRemove = [], itemsToAdd = [];     
        
        function findItem(items, itemToFind){
          return _.find(items, function(item){
              return (item._cid === itemToFind._cid || 
                      item._cid === itemToFind._id);
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
        
        storage.remove(keyPath, itemKeyPath, itemsToRemove, {insync:true}, (err?) => {
          if(!err){
            Util.asyncForEach(newItems, (doc, done) => {
              var elemKeyPath = itemKeyPath.concat(doc._id);

              doc._persisted = true;

              // TODO: Probably not needed to update all newItems
              storage.put(elemKeyPath, doc, (err?) => {
                if(err) {
                  //not in local cache
                  doc._cid = doc._id;
                  storage.create(itemKeyPath, doc, (err?)=>{
                    done(err);
                  });
                }else{
                  done();
                }
              });
            }, (err) => {
              if(!err){
                // Add the new collection keys to the keyPath
                storage.add(keyPath, itemKeyPath, itemsToAdd, {insync: true}, cb);
              }else{
                cb(err);
              }
            }); 
          }else{
            cb(err);
          }
        });
      }else{
        storage.add(keyPath, itemKeyPath, _.pluck(newItems, '_id'), {insync: true}, cb);
      }
    });
  }
  
  find(keyPath: string[], query: {}, options: {}, cb: (err?: Error, result?: any[]) => void): void
  {
    var localOpts = _.extend({snapshot:true}, options);
    this.localStorage.find(keyPath, query, localOpts, (err?, result?) => {
      if(result){
        cb(err, result);
      }
      
      if(this.useRemote){
        this.remoteStorage.find(keyPath, query, options, (err?, remote?) => {
          if(!err){
            this.updateLocalCollection(keyPath, query, options, remote, (err?)=>{
              if(result){
                this.localStorage.find(keyPath, query, localOpts, (err?, items?) => {
                  !err && this.emit('resync:'+Queue.makeKey(keyPath), items);
                })
              }
            });
          }
          !result && cb(err, remote);
        });
      }else if(!result){
        cb(err);
      }
    });
  }
    
  create(keyPath: string[], args:{}, cb:(err?: Error, id?: string) => void)
  {
    this.localStorage.create(keyPath, args, (err, cid?) => {
      if(!err){
        args['_cid'] = args['_cid'] || cid;
        this.addCmd({cmd:'create', keyPath: keyPath, args: args});
        cb(err, cid);
      }else{
        cb(err);
      }
    });
  }
  
  put(keyPath: string[], args:{}, cb)
  {
    this.localStorage.put(keyPath, args, (err?) => {
      if(!err){
        this.addCmd({cmd:'update', keyPath: keyPath, args: args});
      }
      cb(err);
    });
  }
  
  del(keyPath: string[], cb)
  {
    this.localStorage.del(keyPath, (err?) => {
      if(!err){
        this.addCmd({cmd:'delete', keyPath: keyPath});
      }
      cb(err);
    });
  }
  
  add(keyPath: string[], itemsKeyPath: string[], itemIds: string[], cb)
  {
    this.localStorage.add(keyPath, itemsKeyPath, itemIds, {}, (err) => {
      if(!err){
        this.addCmd({cmd:'add', keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds:itemIds});
      }
      cb(err);
    });
  }
  
  remove(keyPath: string[], itemsKeyPath: string[], itemIds: string[], cb)
  {
    this.localStorage.remove(keyPath, itemsKeyPath, itemIds, {}, (err) => {
      if(!err){
        this.addCmd({
          cmd:'remove', keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds:itemIds
        });
      }
      cb(err);
    });
  }
  
  all(keyPath: string[], query: {}, opts: {}, cb: (err: Error, result?: any[]) => void) : void
  {
    var localOpts = _.extend({snapshot:true}, {});
    this.localStorage.all(keyPath, query, opts, (err?, result?) => {
      if(result){
        cb(err, result);
      }
      
      if(!this.useRemote){
        cb(err);
      }else{ 
        // TODO: what if keyPath is local (same for find())
        this.remoteStorage.all(keyPath, query, opts, (err?, remote?) => {
          if(!err){
            this.updateLocalSequence(keyPath, {}, remote, (err?)=>{
              if(result){
                this.localStorage.all(keyPath, {}, localOpts, (err?, items?) => {
                  var key = Queue.makeKey(keyPath);
                  var subQ = <any>(this.remoteStorage);
                  if(this.autosync || !subQ.once){
                    !err && this.emit('resync:'+key, items);
                  }else{
                    subQ.once('resync:'+key, (items)=>{
                      this.emit('resync:'+key, items);
                    });
                  }
                })
              }
            });
          }
          !result && cb(err, remote);
        });
      }
    });
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
    var done = _.bind(this.success, this);
    
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
            ((cid, args) => {
              remoteStorage.create(keyPath, args, (err?, sid?) => {

                var localKeyPath = keyPath.concat(cid);
                if(err){
                  done(err);
                }else{
                  localStorage.put(localKeyPath, {_persisted:true, _id: sid}, (err?: Error) => {
                    var newKeyPath = _.initial(localKeyPath);
                    newKeyPath.push(sid);
                    localStorage.link(newKeyPath, localKeyPath, (err?: Error) => {
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
                }
              });
            })(args['_cid'], args);
            
            break;
          case 'update':
            remoteStorage.put(keyPath, args, done);
            break;
          case 'delete':
            remoteStorage.del(keyPath, done);
            break;
          case 'add':
            remoteStorage.add(keyPath, itemsKeyPath, itemIds, {}, done);
            break;
          case 'remove':
            remoteStorage.remove(keyPath, itemsKeyPath, itemIds, {}, done);
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
  
  public isEmpty(){
    return !this.queue.length;
  }
  
  public clear(cb?: (err?: Error) => void)
  {
    // clearing the queue is a dangerous thing to do. Hence we wait until finished
      if(this.queue.length > 0){
        this.once('synced:', cb || Util.noop);
        this.synchronize();
      }else{
        cb && cb();
      }
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

  private success(err: Error)
  {
    this.currentTransfer = null;
    var storage = this.localStorage;
    var syncFn = this.syncFn;
    
    if(!err){ // || (err.status >= 400 && err.status < 500)){ 
      //
      // Note: since we cannot have an atomic operation for updating the server and the
      // execution queue, the same command could be executed 2 or more times in 
      // some hazardous scenarios (if the browser crashes after updating the server
      // and before the local storage). revisions should fix this problem.
      //
      var cmd = this.dequeueCmd();
      if(!cmd) return;
      
      var opts = {insync: true};
        
      switch(cmd.cmd){
        case 'add':
          storage.remove(cmd.keyPath, cmd.itemsKeyPath, cmd.oldItemIds || [], opts, (err?) =>{
            storage.add(cmd.keyPath, 
                        cmd.itemsKeyPath, 
                        cmd.itemIds,
                        opts, (err?) => {
              Util.nextTick(syncFn);
            });
          });
          break;
        case 'remove': 
          storage.remove(cmd.keyPath, cmd.itemsKeyPath, cmd.oldItemIds || [], opts, (err?) =>{
            storage.remove(cmd.keyPath, 
                           cmd.itemsKeyPath, 
                           cmd.itemIds,
                           opts, (err?) =>{
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
      // throw err; //TODO: handle
    }
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
    // TODO: Serialize after updating Ids
    //
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
