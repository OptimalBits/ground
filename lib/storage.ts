/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage Module. Include classes and interfaces for the storage subsystem.
*/

import Base = module('./base');
import Util = module('./util');

/**
  Storage Interface. Any storage fullfilling this interface can be used by
  Ground.
  
  TODO: Study if Error is the best return value for errors, or if a
  error code will be better, to help classify into different types of 
  errors, for example, temporal errors (may trigger a retry) versus
  persistent errors (should not retry).
*/
export interface IStorage extends ISetStorage, ISeqStorage {
  //
  // Basic Storage for Models (Follows CRUD semantics)
  //
  
  create(keyPath: string[], doc: {}, cb: (err: Error, key?: string) => void): void;
  put(keyPath: string[], doc: {}, cb: (err?: Error) => void): void;
  get(keyPath: string[], cb: (err?: Error, doc?: {}) => void): void;
  del(keyPath: string[], cb: (err?: Error) => void): void;
  link?(keyPath: string[], newKeyPath: string[], cb: (err?: Error) => void): void;
}

//
//  Set / Collection Storage (unordered)
//
export interface ISetStorage {
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: Error) => void): void;
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: Error) => void): void;
  find(keyPath: string[], query: {}, options: {}, cb: (err: Error, result: any[]) => void): void;
}

//
//  Sequence Storage (ordered)
//
export interface ISeqStorage {
  insert(keyPath: string[], index:number, doc:{}, cb: (err: Error) => void);
  extract(keyPath: string[], index:number, cb: (err: Error, doc?:{}) => void);
  all(keyPath: string[], cb: (err: Error, result: any[]) => void) : void;
}

//
// The Queue needs a local storage (based on HTML5 local storage, IndexedDB, WebSQL, etc)
// and a remote Storage.
//

interface Command {
  cmd: string;
  keyPath: string[];
  itemsKeyPath?: string[];
  args?: {};
  items?: string[];
}

/**
  Storage Queue
  
  This class allows offline support for the classes that need to
  save data in a remote storage. The Queue will save first all
  data in a local storage, and synchronize with the remote
  storage as soon as it is available.
*/
export class Queue extends Base.Base {
  private savedQueue: {};
  private queue: Command[];
  private createList = {};
  private syncFn: ()=>void;
  private currentTransfer = null;
  private localStorage: IStorage;
  private remoteStorage: IStorage;

  constructor(local: IStorage, remote: IStorage){
    super();
  
    this.localStorage = local;
    this.remoteStorage = remote;
        
    this.syncFn = _.bind(this.synchronize, self);
  }
  
  init(cb:(err?: Error) => void){
    this.localStorage.all(['meta', 'storageQueue'], (err, queue) => {
      if(!err){
        this.queue = queue || [];
      }
      cb(err);
    });
  }
  
  /* We need to have this listener somewhere...
  init(socket){
    socket.removeListener('connect', this.syncFn);
    socket.on('connect', this.syncFn);
  }
  */
  
  private add(cmd: Command, cb:(err: Error)=>void){
    this.localStorage.insert(['meta', 'storageQueue'], -1, cmd, cb);
    this.queue.push(cmd);
    this.synchronize();
  }
  
  createCmd(keyPath: string[], args:{}, cb){
    this.add({cmd: 'create', keyPath: keyPath, args: args}, cb);
  }
  
  updateCmd(keyPath: string[], args:{}, cb){
    //OPTIMIZATION?: MERGE UPDATES FOR A GIVEN ID TOGETHER INTO ONE UPDATE.
    this.add({cmd:'update', keyPath: keyPath, args:args}, cb);
  }
  
  getDoc(keyPath: string[], cb){
    // TODO: 
    // For fast performance we first get from local,
    // then we get from remote, if the __rev has changed
    // we update models and local cache.
    this.remoteStorage.get(keyPath, cb);
  }
  
  deleteCmd(keyPath: string[], cb){
    this.add({cmd:'delete', keyPath: keyPath}, cb);
  }
  
  addCmd(keyPath: string[], itemsKeyPath: string[], items, cb){
    this.add({
      cmd:'add', keyPath: keyPath, itemsKeyPath: itemsKeyPath, items:items
    }, cb);
  }
  
  removeCmd(keyPath: string[], itemsKeyPath: string[], items, cb){
    this.add({
      cmd:'remove', keyPath: keyPath, itemsKeyPath: itemsKeyPath, items:items
    }, cb);
  }
  
  updateIds(oldId, newId){
    _.each(this.queue, function(obj){
      if (obj.id == oldId){
        obj.id = newId;
      } 
      if (obj.items && obj.items == oldId){
        obj.items = newId;
      }
    });
    
    // TODO: Serialize after updating Ids
    // How to rename Ids from old Ids to new ones...
    // ls.storageQueue = JSON.stringify(this.queue);
  }
  
  success(err: Error) {
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
  
  synchronize(){
    var done = _.bind(this.success, this);
    
    if (!this.currentTransfer){
      if (this.queue.length){
        var 
          obj = this.currentTransfer = this.queue[0],
          localStorage = this.localStorage,
          remoteStorage = this.remoteStorage,
          keyPath = obj.keyPath,
          itemsKeyPath = obj.itemsKeyPath,
          items = obj.items,
          args = obj.args;

        //
        // FIXME: Persistent errors will  block the queue forever.(we need a watchdog).
        //
        
        switch (obj.cmd){
          case 'create':
            var _args = _.clone(args);
            localStorage.create(keyPath, _args, (err, cid?) => {
              if(!err){
                remoteStorage.create(keyPath, _args, function(err?, sid?){
                  if(err){
                    done(err);
                  }else{
                    localStorage.link([sid], keyPath, (err?: Error) => {
                      this.updateIds(cid, sid); // needed?
                      this.emit('created:'+cid, sid);
                      done();
                    });
                  }
                });
              }else{
                done(err);
              }
            });
            break;
          case 'update':
            remoteStorage.put(keyPath, args, done);
            break;
          case 'delete':
            remoteStorage.del(keyPath, done);
            break;
          case 'add':
            remoteStorage.add(keyPath, itemsKeyPath, items, done);
            break;
          case 'remove':
            remoteStorage.remove(keyPath, itemsKeyPath, items, done);
            break;
        }
      } else {        
        this.emit('synced:', this);
      }
    } else{
      console.log('busy with ', this.currentTransfer);
    }
  }
}

