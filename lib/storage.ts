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
*/
export interface IStorage extends ISetStorage, ISeqStorage {
  //
  // Basic Storage for Models (Follows CRUD semantics)
  //
  
  create(keyPath: string[], doc: any, cb: (err: Error, key: string) => void): void;
  put(keyPath: string[], doc: any, cb: (err?: Error) => void): void;
  get(keyPath: string[], cb: (err?: Error, doc?: any) => void): void;
  del(keyPath: string[], cb: (err?: Error) => void): void;
  link(keyPath: string[], newKeyPath: string[], cb: (err?: Error) => void): void;
}

//
//  Set (Collection) Storage
//
interface ISetStorage {
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: Error) => void): void;
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: Error) => void): void;
  find(keyPath: string[], query: {}, options: {}, cb: (err: Error, result: any[]) => void): void;
}

//
//  Seq (Collection) Storage
//
interface ISeqStorage {
  insert(keyPath: string[], index:number, doc:{}, cb: (err: Error) => void);
  extract(keyPath: string[], index:number, cb: (err: Error) => void);
  all(keyPath: string[], cb: (err: Error, result: any[]) => void) : void;
}

//
// The Queue needs a local storage (based on HTML5 local storage, IndexedDB, WebSQL, etc)
// and a remote Storage.
//

interface Command {
  cmd: string;
  bucket: string;
  id: string;
  args?: {};
  items?: string[];
  collection?: string;
}

export class Queue extends Base.Base {
  private savedQueue: {};
  private queue: Command[];
  private createList = {};
  private syncFn: ()=>void;
  private currentTransfer = null;
  private srcStorage: IStorage;
  private dstStorage: IStorage;

  constructor(src: IStorage, dst: IStorage){
    super();
  
    this.srcStorage = src;
    this.dstStorage = dst;
        
    this.syncFn = _.bind(this.synchronize, self);
  }
  
  init(cb:(err?: Error) => void){
    this.srcStorage.all(['meta', 'storageQueue'], (err, queue) => {
      if(!err){
        this.queue = queue || [];
      }
    });
  }
  
  /*
  init(socket){
    socket.removeListener('connect', this.syncFn);
    socket.on('connect', this.syncFn);
  }
  */
  
  private add(cmd: Command, cb){
    this.srcStorage.insert(['meta', 'storageQueue'], -1, cmd, cb);
    this.queue.push(cmd);
  }
  
  createCmd(bucket: string, id: string, args:{}, cb){
    this.add({cmd: 'create', bucket: bucket, id: id, args: args}, cb);
  }
  
  updateCmd(bucket: string, id: string, args:{}, cb){
    //OPTIMIZATION?: MERGE UPDATES FOR A GIVEN ID TOGETHER INTO ONE UPDATE.
    this.add({cmd:'update', bucket:bucket, id:id, args:args}, cb);
  }
  
  deleteCmd(bucket: string, id: string, cb){
    this.add({cmd:'delete', bucket:bucket, id:id}, cb);
  }
  
  addCmd(bucket, id, collection, items, cb){
    this.add({bucket:bucket, id:id, cmd:'add', collection:collection, items:items}, cb);
  }
  
  removeCmd(bucket, id, collection, items, cb){
    this.add({bucket:bucket, id:id, cmd:'remove', collection:collection, items:items}, cb);
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
    
    // How to rename Ids from old Ids to new ones...
    // ls.storageQueue = JSON.stringify(this.queue);
  }
  
  success(err: Error) {
    this.currentTransfer = null;
    if(!err){ // || (err.status >= 400 && err.status < 500)){
      this.queue.shift();
      
      // Note: since we cannot have an atomic operation for updating the server and the
      // execution queue, the same command could be executed 2 or more times.
      this.srcStorage.extract(['meta', 'storageQueue'], 0, (err)=>{
        // pass
      });
      
      // ls.storageQueue = JSON.stringify(this.queue);
      Util.nextTick(_.bind(this.synchronize, this));
    }
  }
  
  synchronize(){
    var done = _.bind(this.success, this);
    
    if (!this.currentTransfer){
      if (this.queue.length){
        var obj = this.currentTransfer = this.queue[0],
          store = this.dstStorage;
        
        ((cmd, bucket, id, items, collection, args) => {
          // FIXME: Persistent errors will  block the queue forever.(we need a watchdog).
          switch (cmd){
            case 'add':
              store.add([bucket, id, collection], [collection], items, done);
              break;
            case 'remove':
              store.remove([bucket, id, collection], [collection], items, done);
              break;
            case 'update':
              store.put([bucket, id], args, done);
              break;
            case 'create':
              store.create([bucket], args, function(err, sid){
                if (err){
                  done(err);
                } else {
                  args.cid = sid;
                  
                  this.srcStorage.create(bucket, args, ()=>{
                    this.srcStorage.link([bucket, id], [sid], function(err?: Error){
                      this.updateIds(id, sid);
                      done();
                    })
                  })
                }
              });
              break;
            case 'delete':
              store.del([bucket, id], done);
              break;
          }
        })(obj.cmd, obj.bucket, obj.id, obj.items, obj.collection, obj.args);
        
      } else {
        //ginger.emit('inSync:', this);
        
        this.emit('synced:', this);
      }
    } else{
      console.log('busy with ', this.currentTransfer);
    }
  }
}

