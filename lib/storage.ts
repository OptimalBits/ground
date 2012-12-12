/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage Module. Include classes and interfaces for the storage subsystem.
*/

import Base = module('./base');
import Util = module('./util');

/*
export enum ErrorCode {
  OK                      = 0,
  TEMPORARILY_UNAVAILABLE = 1,
  UNRECOVARABLE_ERROR     = 2,
  REMOTE_ERROR            = 3,
}

export class StorageError {
  code: ErrorCode = 0;
  msg: string = "Success";
}
*/
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
  link?(keyPathLink: string[], keyPath: string[], cb: (err?: Error) => void): void;
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

function updateIds(keyPath: string[], oldId: string, newId: string)
{
  for(var i=0; i<keyPath.length; i++){
    if(keyPath[i] == oldId){
      keyPath[i] = newId;
    }
  }
}

interface Command {
  cmd: string;
  keyPath: string[];
  itemsKeyPath?: string[];
  args?: {};
  itemIds?: string[];
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
        
    this.syncFn = _.bind(this.synchronize, this);
  }
  
  init(cb:(err?: Error) => void){
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
  getDoc(keyPath: string[], cb){
    this.remoteStorage.get(keyPath, (err?, doc?) => {
      if(err){
        this.localStorage.get(keyPath, (err?, doc?) => {
          if(doc){            
            doc['_id'] = _.last(keyPath);
          }
          cb(err, doc);
        });
      }else{
        doc['_persisted'] = true;
        // Shoudlnt we need to cache here to local?
        cb(err, doc);
      }
    });
  }
  
  private static makeKey(keyPath: string[]){
    return keyPath.join(':');
  }
  
  find(keyPath: string[], query: {}, options: {}, cb: (err: Error, result: any[]) => void): void
  {
    this.localStorage.find(keyPath, query, options, cb);
    this.remoteStorage.find(keyPath, query, options, (err?, result?) => {
      if(!err){
        this.emit('resync:'+Queue.makeKey(keyPath), result);
      }
    });
  }
  
  /*
  find(keyPath: string[], query: {}, options: {}, cb: (err: Error, result: any[]) => void): void
  {
    this.remoteStorage.find(keyPath, query, options, (err?, doc?) => {
      if(err){
        this.localStorage.find(keyPath, query, options, cb);
      }else{
        cb(err, doc);
      }
    });
  }
  */
  private add(cmd: Command, cb:(err: Error)=>void){
    this.localStorage.insert(['meta', 'storageQueue'], -1, cmd, (err) => {
      if(!err){
        this.queue.push(cmd);
        this.synchronize();
      }
      cb(err);
    });
  }
  
  createCmd(keyPath: string[], args:{}, cb){
    this.localStorage.create(keyPath, args, (err, cid?) => {
      if(!err){
        args['cid'] = cid;
        this.add({cmd:'create', keyPath: keyPath, args: args}, cb);
      }else{
        cb(err);
      }
    });
  }
  
  updateCmd(keyPath: string[], args:{}, cb){
    //OPTIMIZATION?: MERGE UPDATES FOR A GIVEN ID TOGETHER INTO ONE UPDATE.
    this.localStorage.put(keyPath, args, (err?) => {
      if(!err){
        this.add({cmd:'update', keyPath: keyPath, args: args}, cb);
      }else{
        cb(err);
      }
    });
  }
  
  deleteCmd(keyPath: string[], cb){
    this.localStorage.del(keyPath, (err?) => {
      if(!err){
        this.add({cmd:'delete', keyPath: keyPath}, cb);
      }else{
        cb(err);
      }
    });
  }
  
  addCmd(keyPath: string[], itemsKeyPath: string[], itemIds: string[], cb){
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
  
  removeCmd(keyPath: string[], itemsKeyPath: string[], itemIds: string[], cb){
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
  
  private success(err: Error) {
    this.currentTransfer = null;
    // for now we treat errors as irreversible.
    //if(!err){ // || (err.status >= 400 && err.status < 500)){
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
    //}
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
          itemIds = obj.itemIds,
          args = obj.args;

        //
        // FIXME: Persistent errors will  block the queue forever.(we need a watchdog).
        //
        
        switch (obj.cmd){
          case 'create':
            (function(cid, args){
              remoteStorage.create(keyPath, args, function(err?, sid?){
                if(err){
                  done(err);
                }else{
                  localStorage.put(keyPath, {_persisted:true}, (err?: Error) => {
                    var newKeyPath = _.initial(keyPath);
                    newKeyPath.push(sid);
                      localStorage.link(newKeyPath, keyPath, (err?: Error) => {
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
  
  private updateQueueIds(oldId, newId){ 
    _.each(this.queue, (cmd: Command) => {
      updateIds(cmd.keyPath, oldId, newId);
      cmd.itemsKeyPath && updateIds(cmd.itemsKeyPath, oldId, newId);
      cmd.itemIds && updateIds(cmd.itemIds, oldId, newId);
    });
    
    // TODO: Serialize after updating Ids
  }
}

