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

  function updateIds(keyPath: string[], oldId: string, newId: string)
  {
    for(var i=0; i<keyPath.length; i++){
      if(keyPath[i] == oldId){
        keyPath[i] = newId;
      }
    }
  }
  
/**
  Storage Queue
  
  This class allows offline support for the classes that need to
  save data in a remote storage. The Queue will save first all
  data in a local storage, and synchronize with the remote
  storage as soon as it is available.
*/
export class Queue extends Base
{
  private savedQueue: {};
  private queue: Command[];
  private createList = {};
  private syncFn: ()=>void;
  private currentTransfer = null;
  private localStorage: IStorage;
  private remoteStorage: IStorage = null;
  private useRemote: bool;

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
  
  getDoc(keyPath: string[], cb)
  {
    this.localStorage.get(keyPath, (err?, doc?) => {
      if(doc){            
        doc['_id'] = _.last(keyPath);
        cb(err, doc);
      }
      this.useRemote &&
      this.remoteStorage.get(keyPath, (err?, serverDoc?) => {
        if(!err){
          serverDoc['_persisted'] = true;
          this.emit('resync:'+Queue.makeKey(keyPath), serverDoc);
          this.localStorage.put(keyPath, serverDoc, ()=>{});
        }
        !doc && cb(err, serverDoc);
      });
    });
  }
  
  find(keyPath: string[], query: {}, options: {}, cb: (err: Error, result: any[]) => void): void
  {
    this.localStorage.find(keyPath, query, options, (err?, result?) => {
      if(result && result.length > 0){
        cb(err, result);
      }
    
      this.useRemote && 
      this.remoteStorage.find(keyPath, query, options, (err?, serverResult?) => {
        function noop() {};
        var itemKeyPath = [_.last(keyPath)];
        var keys = [];
        
        if(!err){
          this.emit('resync:'+Queue.makeKey(keyPath), serverResult);
          // TODO: We need to update the local cache with this data from the server

          // Add the elements in the collection to local cache
          for(var i=0; i<serverResult.length; i++) {
            var doc = serverResult[i];
            var id = doc._id;
            doc._cid = id;
            doc._persisted = true;
            // var elemKeyPath = itemKeyPath.concat(id);
            // this.localStorage.put(elemKeyPath, doc, noop);
            this.localStorage.create(itemKeyPath, doc, noop);
            keys.push(id);
          }

          // Add the collection keys to the keyPath
          this.localStorage.add(keyPath, itemKeyPath, keys, noop); 
        }
        if(!result || result.length === 0) cb(err, serverResult);
      });
    });
  }
    
  createCmd(keyPath: string[], args:{}, cb)
  {
    this.localStorage.create(keyPath, args, (err, cid?) => {
      if(!err){
        args['cid'] = cid;
        this.add({cmd:'create', keyPath: keyPath, args: args}, cb);
      }else{
        cb(err);
      }
    });
  }
  
  updateCmd(keyPath: string[], args:{}, cb)
  {
    //OPTIMIZATION?: MERGE UPDATES FOR A GIVEN ID TOGETHER INTO ONE UPDATE.
    this.localStorage.put(keyPath, args, (err?) => {
      if(!err){
        this.add({cmd:'update', keyPath: keyPath, args: args}, cb);
      }else{
        cb(err);
      }
    });
  }
  
  deleteCmd(keyPath: string[], cb)
  {
    this.localStorage.del(keyPath, (err?) => {
      if(!err){
        this.add({cmd:'delete', keyPath: keyPath}, cb);
      }else{
        cb(err);
      }
    });
  }
  
  addCmd(keyPath: string[], itemsKeyPath: string[], itemIds: string[], cb)
  {
    this.localStorage.add(keyPath, itemsKeyPath, itemIds, (err) => {
      if(!err){
        this.add({
          cmd:'add', keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds:itemIds
        }, cb);
      }else{
        cb(err);
      }
    });
  }
  
  removeCmd(keyPath: string[], itemsKeyPath: string[], itemIds: string[], cb)
  {
    this.localStorage.remove(keyPath, itemsKeyPath, itemIds, (err) => {
      if(!err){
        this.add({
          cmd:'remove', keyPath: keyPath, itemsKeyPath: itemsKeyPath, itemIds:itemIds
        }, cb);
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
                      this.updateQueueIds(cid, sid); // needed?
                      this.emit('created:'+cid, sid);
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
            remoteStorage.add(keyPath, itemsKeyPath, itemIds, done);
            break;
          case 'remove':
            remoteStorage.remove(keyPath, itemsKeyPath, itemIds, done);
            break;
        }
      } else {        
        this.emit('synced:', this);
      }
    } else{
      console.log('busy with ', this.currentTransfer);
    }
  }
  
  private add(cmd: Command, cb:(err?: Error)=>void)
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
    
    if(!err){ // || (err.status >= 400 && err.status < 500)){
      this.queue.shift();
      
      //
      // Note: since we cannot have an atomic operation for updating the server and the
      // execution queue, the same command could be executed 2 or more times in 
      // some hazardous scenarios (if the browser crashes after updating the server
      // and before the local storage). revisions should fix this problem.
      //
      this.localStorage.extract(['meta', 'storageQueue'], 0, (err)=>{
        Util.nextTick(_.bind(this.synchronize, this));
      });
    }
  }
  
  private updateQueueIds(oldId, newId)
  { 
    _.each(this.queue, (cmd: Command) => {
      updateIds(cmd.keyPath, oldId, newId);
      cmd.itemsKeyPath && updateIds(cmd.itemsKeyPath, oldId, newId);
      cmd.itemIds && updateIds(cmd.itemIds, oldId, newId);
    });
    
    // TODO: Serialize after updating Ids
  }
  
  private static makeKey(keyPath: string[])
  {
    return keyPath.join(':');
  }
}

}
