/**
  Ground Web Framework (c) 2011-2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Model Class
  
  This class represents a Model in a MVC architecture.
  The model supports persistent storage, offline and
  automatic client<->server synchronization.
*/

/// <reference path="../third/underscore.browser.d.ts" />

import Base = module('./base');
import Util = module('./util');
import Overload = module('./overload');
import Storage = module('./storage');
import Sync = module('./sync/sync');

enum ModelState {
  INITIAL,
  CREATING,
  CREATED
}

export class Model extends Base.Base {
  static  __bucket: string;
  private __bucket: string;
  
  private __rev: number = 0;
  
  private _persisted: bool = false;
  private _dirty: bool = true;
  
  private _keepSynced: bool = false;
  
  private _cid: string;
  private _id: string;
  
  private _state: ModelState = ModelState.INITIAL;
  
  static syncManager: Sync.Manager;
  static storageQueue: Storage.Queue;
  
  constructor(args: {}, bucket: string){
    super();
        
    _.extend(this, args);
    
    this._cid = this._id || this._cid || Util.uuid();
    this.__bucket = bucket;
    
    this.on('changed:', () => {
      this._dirty = true;
    });
  }
  
  static extend(bucket: string){
    var self = this;
    function __(args, _bucket) {
      self.call(this, args, bucket || _bucket);
    }; 
    
    __.prototype = this.prototype;
    __.prototype._super = this;

    // Copy Models static methods
    _.extend(__, {
      __bucket: bucket,
      extend: this.extend,
      create: this.create,
      findById: this.findById,
      fromJSON: this.fromJSON,
      fromArgs: this.fromArgs
    });
    
    return __;
  }

  //static create(args: {}, cb: (err: Error, instance?: Model) => void): void;
  static create(args: {}, keepSynced: bool, cb: (err: Error, instance?: Model) => void): void
  {
    Overload.overload({
      'Object Boolean Function': function(args, keepSynced, cb){
        this.fromJSON(args, (err, instance) => {
          if(instance){
            keepSynced && instance.keepSynced();
            instance.init(() => {
              cb(null, instance);
            })
          }else{
            cb(err);
          }
        })
      },
      'Object Function': function(args, cb){
        this.create(args, false, cb);
      }
    }).apply(this, arguments);
  }
  
  static findById(id: string, keepSynced?: bool, args?: {}, cb?: (err: Error, instance?: Model) => void): Model
  {
    return Overload.overload({
      'String Boolean Object Function': function(id, keepSynced, args, cb){
        Model.storageQueue.getDoc([this.__bucket, id], (err?, doc?: {}) => {
          if(doc){
            _.extend(doc, args);
            this.create(doc, keepSynced, cb);
          }else{
            cb(err);
          }
        });
        return this;
      },
      'String Function': function(id, cb){
        return this.findById(id, false, {}, cb);
      },
      'String Boolean Function': function(id, keepSynced, cb){
        return this.findById(id, keepSynced, {}, cb);
      },
      'String Object Function': function(id, args, cb){
        return this.findById(id, false,args, cb);
      }  
    }).apply(this, arguments);
  }
  
  static fromJSON(args, cb){
    cb(null, new this(args));
  }
  
  static fromArgs(args, cb){
    this.fromJson(args, cb);
  }
  
  destroy(): void
  {
    Model.syncManager && Model.syncManager.endSync(this);
    super.destroy();
  }
  
  id(id?: string): string 
  {
    if(id){
      this._cid = this._id = id;
      this._persisted = true;
    }
    return this._id || this._cid;
  }
  
  isPersisted(){
    return this._persisted || this._id;
  }
  
  init(fn){
    fn(this)
  }
  
  save(cb?: (err: Error) => void){
    if(this._dirty){
      this.update(this.toArgs(), cb);
    }
  }
  
  /*
      Updates a model (in its storage) with the given args.

      update(args)
  
      TODO: This method needs to be throtled so that it does not call the
      server too often. Therefore it should queue the calls and merge the
      arguments (could be implemented at Storage Queue).
  */
  update(args: {}, cb?: (err: Error) => void)
  {
    var 
      bucket = this.__bucket,
      id = this.id();
      
    cb = cb || (err: Error)=>{};
    
    if(this._state != ModelState.INITIAL){
      Model.storageQueue.updateCmd([bucket, id], args, cb);
    }else{
      this._state = ModelState.CREATING;
      Model.storageQueue.once('created:'+id, (id) => {
        this.id(id);
        this._persisted && Model.syncManager.startSync(this);
      });
      Model.storageQueue.createCmd([bucket], args, cb);
    }
  }
  
  //
  // TODO: Should delete and update be static functions instead? since
  // we can have several instances of the same model...
  //
  delete(cb?: (err: Error) => void)
  {
    cb = cb || (err: Error)=>{};
    
    Model.storageQueue.deleteCmd([this.__bucket, this.id()], (err: Error)=>{
      Model.syncManager && Model.syncManager.endSync(this);
      this.emit('deleted:', this.id());
      cb(err);
    });
  }
    
  keepSynced()
  {
    if(this._keepSynced) return;
  
    this._keepSynced = true;
  
    if (this.isPersisted()){
      Model.syncManager && Model.syncManager.startSync(self);
    }
  
    this.on('changed:', (doc, options) => {
      if(!options || ((options.sync != 'false') && !_.isEqual(doc, options.doc))){
        //
        // TODO: Use async debounce to avoid faster updates than we manage to process.
        // (we will maybe also need to merge all queued incoming data).
        //
        this.update(doc);
      }
    });
  }
  
  toArgs(){
    var args = {_persisted:this._persisted, _cid:this._cid};
    
    for(var key in this){
      if(!_.isUndefined(this[key])  &&  
         !_.isNull(this[key])       &&
         !_.isFunction(this[key])   &&
         (key[0] !== '_')) {
        
        if(_.isFunction(this[key].toArgs)){
          args[key] = this[key].toArgs();
        }else if(!_.isObject(this[key])){
          args[key] = this[key]
        }
      }
    }
    return args
  }
}
