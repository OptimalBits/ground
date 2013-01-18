/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage Queue
*/

/// <reference path="../storage.ts" />

module Gnd.Storage {
  
  //
  // The Queue needs a local storage (based on HTML5 local storage, IndexedDB, WebSQL, etc)
  // and a remote Storage.
  //
  
  interface Command {
    cmd: string;
    keyPath: string[];
    itemsKeyPath?: string[];
    args?: {};
    itemIds?: string[];
    oldItemIds?: string[];
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
  
  public static makeKey(keyPath: string[])
  {
    return keyPath.join(':');
  }

  constructor(local: IStorage, remote?: IStorage)
  {
    super();
  
    this.localStorage = local;
    this.remoteStorage = remote;
    this.queue = [];
    
    this.useRemote = !!this.remoteStorage;
    this.syncFn = _.bind(this.synchronize, this);
  }
  
  init(cb:(err?: Error) => void)
  {
    this.localStorage.all(['meta', 'storageQueue'], (err, queue) => {
      if(!err){
        this.queue = queue || [];
      }
      cb(err);
    });
  }
  
  /*
    We need to have this listener somewhere...
    init(socket){
      socket.removeListener('connect', this.syncFn);
      socket.on('connect', this.syncFn);
      }
  */
  
  fetch(keyPath: string[], cb)
  {
    this.localStorage.fetch(keyPath, (err?, doc?) => {
      if(doc){            
        doc['_id'] = _.last(keyPath);
        cb(err, doc);
      }
      if(!this.useRemote){
        cb(err);
      }else{
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
      }
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
      
      if(!this.useRemote){
        cb(err);
      }else{ 
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
      }
    });
  }
    
  create(keyPath: string[], args:{}, cb:(err?: Error, id?: string) => void)
  {
    this.localStorage.create(keyPath, args, (err, cid?) => {
      if(!err){
        args['_cid'] = args['_cid'] || cid;
        this.addCmd({cmd:'create', keyPath: keyPath, args: args}, (err?) => {
          cb(err, cid);
        });
      }else{
        cb(err);
      }
    });
  }
  
  put(keyPath: string[], args:{}, cb)
  {
    this.localStorage.put(keyPath, args, (err?) => {
      if(!err){
        this.addCmd({cmd:'update', keyPath: keyPath, args: args}, cb);
      }else{
        cb(err);
      }
    });
  }
  
  del(keyPath: string[], cb)
  {
    this.localStorage.del(keyPath, (err?) => {
      if(!err){
        this.addCmd({cmd:'delete', keyPath: keyPath}, cb);
      }else{
        cb(err);
      }
    });
  }
  
  add(keyPath: string[], itemsKeyPath: string[], itemIds: string[], cb)
  {
    this.localStorage.add(keyPath, itemsKeyPath, itemIds, {}, (err) => {
      if(!err){
        this.addCmd({
          cmd:'add', keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds:itemIds
        }, cb);
      }else{
        cb(err);
      }
    });
  }
  
  remove(keyPath: string[], itemsKeyPath: string[], itemIds: string[], cb)
  {
    this.localStorage.remove(keyPath, itemsKeyPath, itemIds, {}, (err) => {
      if(!err){
        this.addCmd({
          cmd:'remove', keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds:itemIds
        }, cb);
      }else{
        cb(err);
      }
    });
  }
  
  insert(keyPath: string[], index:number, doc:{}, cb: (err: Error) => void)
  {
    // TODO: Implement
  }
  
  extract(keyPath: string[], index:number, cb: (err: Error, doc?:{}) => void)
  {
    // TODO: Implement
  }
  
  all(keyPath: string[], cb: (err: Error, result: any[]) => void) : void
  {
    // TODO: Implement
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
            (function(cid, args){
              remoteStorage.create(keyPath, args, function(err?, sid?){
                var localKeyPath = keyPath.concat(cid);
                if(err){
                  done(err);
                }else{
                  localStorage.put(localKeyPath, {_persisted:true, _id: sid}, (err?: Error) => {
                    var newKeyPath = _.initial(localKeyPath);
                    newKeyPath.push(sid);
                    localStorage.link(newKeyPath, localKeyPath, (err?: Error) => {
                      this.emit('created:'+cid, sid);
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
        }
      } else {        
        this.emit('synced:', this);
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
    this.queue = [];
    this.localStorage.del(['meta', 'storageQueue'], cb || Util.noop);
  }
    
  private addCmd(cmd: Command, cb:(err?: Error)=>void)
  {
    if(this.useRemote){
      this.localStorage.insert(['meta', 'storageQueue'], -1, cmd, (err) => {
        if(!err){
          this.queue.push(cmd);
          this.synchronize();
        }
        cb(err);
      });
    }else{
      cb();
    }
  }
  
  private success(err: Error)
  {
    this.currentTransfer = null;
    var storage = this.localStorage;
    
    if(!err){ // || (err.status >= 400 && err.status < 500)){
      var 
        cmd = this.queue.shift(),
        syncFn = _.bind(this.synchronize, this);
      
      //
      // Note: since we cannot have an atomic operation for updating the server and the
      // execution queue, the same command could be executed 2 or more times in 
      // some hazardous scenarios (if the browser crashes after updating the server
      // and before the local storage). revisions should fix this problem.
      //
      storage.extract(['meta', 'storageQueue'], 0, (err)=>{
        var opts = {insync: true};
        
        // Update localStorage
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
          default:
            Util.nextTick(syncFn);
        }
      });
    }
  }

  private updateQueueIds(oldId, newId)
  { 
    _.each(this.queue, (cmd: Command) => {
      updateIds(cmd.keyPath, oldId, newId);
      cmd.itemsKeyPath && updateIds(cmd.itemsKeyPath, oldId, newId);
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
