/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage Module. Include classes and interfaces for the storage subsystem.
*/

import Base = module('./base');

/**
  Storage Interface. Any storage fullfilling this interface can be used by
  Ground.
*/
interface Storage {
  modelStorage : ModelStorage;
  setStorage? : SetStorage;
  seqStorage? : SeqStorage;
}

//
// Basic Storage for Models (Follows CRUD semantics)
//
interface ModelStorage {
  create(keyPath: string[], doc: any, cb: (err: Error, key: string) => void) : void;)
  put(keyPath: string[], doc: any, cb: (err: Error) => void) : void;
  get(keyPath: string[], cb: (err: Error, doc: any) => void) : void;
  del(keyPath: string[], cb:(err:Error) => void) : void; 
}

//
//  Set (Collection) Storage (Follows CRDT Semantics)
//
interface SetStorage {
  add(keyPath: string[], itemIds:string[], cb: (err: Error) => void) : void;
  remove(keyPath: string[], itemIds:string[], cb: (err: Error) => void) : void;
  query(keyPath: string[], query: {}, options?: {}, cb: (err: Error, result: any[]) => void) : void;
}

//
//  Seq (Collection) Storage (Follows CRDT Semantics)
//
interface SeqStorage {
  append(keyPath: string[], itemKeys:string[]);
  remove(keyPath: string[], itemKeys:string[]);
  move((keyPath: string[], oldPos: number, newPos: number);
}

//
// The Queue needs a local storage (based on HTML5 local storage, IndexedDB, WebSQL, etc)
// and a remote Storage.
//
export class Queue extends Base {
  private savedQueue: {};
  private queue: {}[];
  private createList = {};
  private syncFn: ()=>void;
  private currentTransfer = null;

  constructor(storage: Storage){
    super();
  
    var savedQueue = ls.storageQueue;
    
    this.queue = (savedQueue && JSON.parse(savedQueue)) || [];
    this.syncFn = _.bind(self.synchronize, self);
  }
  
  init(socket){
    socket.removeListener('connect', this.syncFn);
    socket.on('connect', this.syncFn);
  }
  
  queue(queue: any[]){
    this.queue = queue;
  }
  
  add(obj){
    //OPTIMIZATION?: MERGE UPDATES FOR A GIVEN ID TOGETHER INTO ONE UPDATE.
    this.queue.push(obj);
    ls.storageQueue = JSON.stringify(this.queue);
  }
  createCmd(transport, bucket, id, args){
    this.add({cmd: 'create', bucket: bucket, id: id, args: args, transport: transport});
  },
  updateCmd(transport, bucket, id, args){
    this.add({cmd:'update', bucket:bucket, id:id, args:args, transport:transport});
  },
  deleteCmd(transport, bucket, id){
    this.add({cmd:'delete', transport:transport, bucket:bucket, id:id});
  },
  addCmd(transport, bucket, id, collection, items){
    this.add({bucket:bucket, id:id, cmd:'add', transport:transport, collection:collection, items:items});
  },
  removeCmd(transport, bucket, id, collection, items){
    this.add({bucket:bucket, id:id, cmd:'remove', transport:transport, collection:collection, items:items});
  },
  updateIds(oldId, newId){
    _.each(this.queue, function(obj){
      if (obj.id == oldId){
        obj.id = newId;
      } 
      if (obj.items && obj.items == oldId){
        obj.items = newId;
      }
    });
    ls.storageQueue = JSON.stringify(this.queue);
  },
  success(err: Error) {
    this.currentTransfer = null;
    if(!err || (err.status >= 400 && err.status < 500)){
      this.queue.shift();
      
      // Note: since we cannot have an atomic operation for updating the server and the
      // execution queue, the same command could be executed 2 or more times.
      ls.storageQueue = JSON.stringify(this.queue);
      nextTick(_.bind(this.synchronize, this));
    }
  },
  synchronize(){
    var done = _.bind(self.success, self);
    
    if (!this.currentTransfer){
      if (this.queue.length){
        var obj = this.currentTransfer = this.queue[0],
          store = ServerStorage[obj.transport];
        
        ((cmd, bucket, id, items, collection, args) => {
          // FIXME: Persistent errors will  block the queue forever.(we need a watchdog).
          switch (cmd){
            case 'add':
              store._add(bucket, id, collection, items, done);
              break;
            case 'remove':
              store._remove(bucket, id, collection, items, done);
              break;
            case 'update':
              store.update(bucket, id, args, done);
              break;
            case 'create':
              store._create(bucket, args, function(err, sid){
                if (err){
                  done(err);
                } else {
                  args.cid = sid;
                  Storage.create(bucket, args, function(){
                    Storage.moved(bucket, id, sid);
                    this.updateIds(id, sid);
                    done();
                  });
                }
              });
              break;
            case 'delete':
              store.remove(bucket, id, done);
              break;
          }
        })(obj.cmd, obj.bucket, obj.id, obj.items, obj.collection, obj.args);
        
      } else {
        ginger.emit('inSync:', this);
        this.emit('synced:', this);
      }
    } else{
      console.log('busy with ', this.currentTransfer);
    }
  }
}

