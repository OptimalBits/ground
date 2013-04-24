/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Model Class
  
  This class represents a Model in a MVC architecture.
  The model supports persistent storage, offline operation 
  and automatic client<->server synchronization.
  
  Events:
  
  'updated:', emitted when the model has been updated.
  'resynced:', emitted when the model has been resynced.
  'deleted:', emitted when a model has been deleted.
*/

/// <reference path="base.ts" />
/// <reference path="promise.ts" />
/// <reference path="collection.ts" />
/// <reference path="sequence.ts" />
/// <reference path="overload.ts" />
/// <reference path="storage/queue.ts" />
/// <reference path="sync/sync.ts" />
/// <reference path="using.ts" />

module Gnd {

/**
  ModelDepot

  Singleton class that keeps all the instanced models. This is fundamental
  for the synchronization mechanism to work properly 
  so that only one instance of every model exists at a given time.
*/
class ModelDepot
{
  private models = {};

  getModel(ModelClass: IModel, args: {}, keepSynced: bool, keyPath?: string[]): Promise
  {
    var create = (args) => {
      return ModelClass.fromJSON(args).then((instance) => {
        keepSynced && instance.keepSynced();
        return instance.init().then(()=>{
          return instance.autorelease();
        });
      });
    }
    
    var fetch: bool = true;
    if(!keyPath){
      fetch = false;
      keyPath = [ModelClass.__bucket, args['_cid'] || args['_id']];
    }
    
    var key = this.key(keyPath);
    var promise = this.models[key];
    if(!promise){
      if(fetch){
        promise = using.storageQueue.fetch(keyPath).then((result) => {
          return create(result[0]).then((instance) => {
            instance.set(args);
            result[1].then(function(doc){
              instance.set(doc, {nosync: true});
            });
            return instance;
          });
        });
      }else{
        promise = create(args);
      }
      this.setPromise(keyPath, promise);
    }

    // Note. The promise returned will only retaing the model once, so be
    // careful with this...
    promise.then((model) => {
      model.retain();
    });
    
    return promise;
  }
  
  getPromise(keyPath: string[]){
    return this.models[this.key(keyPath)];
  }
  
  key(keyPath: string[])
  {
    return keyPath.join('/');
  }
  
  setModel(model: Model, promise?: Promise)
  { 
    var models = this.models;
    
    promise = promise || new Promise(model);
  
    var remoteKeyPath;
    var localKeyPath = this.key([model.bucket(), model.cid()]);
    
    models[localKeyPath] = promise;
    
    var setRemote = () => {
      remoteKeyPath = this.key(model.getKeyPath());
      models[remoteKeyPath] = promise;
    }
    
    if(!model.isPersisted()) {
      model.once('id',setRemote);
    }else{
      setRemote();
    }
    
    model.once('destroy: deleted:', () => {
      delete models[localKeyPath];
      remoteKeyPath && delete models[remoteKeyPath];
    });

    return promise;
  }
  
  setPromise(keyPath: string[], promise: Promise)
  {
    var key = this.key(keyPath);
    var models = this.models;
    models[key] = promise;
    
    promise.then((model) => {
      this.setModel(model, promise);
    }, (err) => {
      delete models[key];
    });
  }
}

//
// global singleton.
//
var modelDepot = new ModelDepot();

export interface IModel 
{
  new (args: {}, bucket: string): Model;
  __bucket: string;
  create(args: {}, keepSynced?: bool): Promise;
  fromJSON(args: {}): Promise;
  findById(keyPathOrId, keepSynced?: bool, args?: {}, cb?: (err: Error, instance?: Model) => void);
  all(parent: Model, args: {}, bucket: string) : Promise;
  seq(parent: Model, args: {}, bucket: string) : Promise;
}

export class Model extends Base implements Sync.ISynchronizable
{
  static  __bucket: string;
  private __bucket: string;
  
  private __rev: number = 0;
  
  private _persisted: bool = false;

  // Dirty could be an array of modified fields
  // that way we can only synchronize whats needed. Furthermore,
  // when receiving a resync event we could check if there is a 
  // conflict or not.
  private _dirty: bool = true;
  
  private _keepSynced: bool = false;
  
  private _cid: string;
  private _id: string;
  
  private _storageQueue: Storage.Queue;
  
  public _initial: bool = true;
    
  constructor(args: {}, bucket: string){
    super();
        
    _.extend(this, args);
    
    this._cid = this._id || this._cid || Util.uuid();
    this.__bucket = bucket;
    
    this.on('changed:', () => {
      this._dirty = true;
    });
    
    this._storageQueue = 
      using.storageQueue || new Storage.Queue(using.memStorage);
    
    if(this.isPersisted()){
        this._initial = false;
    }else{
      this._storageQueue.once('created:'+this.id(), (id) => {
        this.id(id);
      });
    }
  }
  
  /**
   *
   *  Subclasses the Model class
   *
   *  @param {String} bucket A string representing a placeholder in the 
   *  storage where to save the model.
   *  @return {IModel} A Model Subclass.
   *
   */
  static extend(bucket: string)
  {
    var _this = this;
    function __(args, _bucket) {
      var constructor = this.constructor;
      _this.call(this, args, bucket || _bucket);
      
      // Call constructor if different from Model constructor.
      if(constructor && (_this != constructor)){
        constructor.call(this, args);
      }
    }; 
    
    Util.inherits(__, this);
    
    // Copy Models static methods
    _.extend(__, {
      __bucket: bucket,
      extend: this.extend,
      create: this.create,
      findById: this.findById,
      all: this.all,
      seq: this.seq,
      fromJSON: this.fromJSON,
      fromArgs: this.fromArgs
    });
    
    return __;
  }

  // TODO: Create must first try to find the model in the depot,
  // and "merge" the args argument with the model properties from the depot.
  // if not available it instantiate it and save it in the depot.  
  static create(args: {}): Promise;
  static create(args: {}, keepSynced: bool): Promise;
  static create(args: {}, keepSynced?: bool): Promise
  {
    return overload({
      'Object Boolean': function(args, keepSynced){
        return modelDepot.getModel(this, args, keepSynced);
      },
      'Object': function(args, cb){
        return this.create(args, false);
      },
    }).apply(this, arguments);
  }
  
  static findById(keyPathOrId, keepSynced?: bool, args?: {}): Promise
  {
    return overload({
      'Array Boolean Object': function(keyPath, keepSynced, args){
        return modelDepot.getModel(this, args, keepSynced, keyPath);
      },
      'String Boolean Object': function(id, keepSynced, args){
        return this.findById([this.__bucket, id], keepSynced, args);
      },
      'String Boolean': function(id, keepSynced){
        return this.findById(id, keepSynced, {});
      },
      'String Object': function(id, args){
        return this.findById(id, false, args);
      },
      'String': function(id){
        return this.findById(id, false, {});
      }, 
    }).apply(this, arguments);
  }
  
  /**
    Removes a model from the storage.
  */
  static removeById(keypathOrId): Promise
  {
    var promise = new Promise();
    var keyPath = _.isArray(keypathOrId) ? keypathOrId : [this.__bucket, keypathOrId];
    using.storageQueue.del(keyPath, (err)=>{
      promise.resolveOrReject(err);
    });
    return promise;
  }
  
  static fromJSON(args): Promise
  {
    return new Promise(new this(args));
  }
  
  static fromArgs(args): Promise
  {
    return this.fromJSON(args);
  }
  
  destroy(): void
  {
    using.syncManager && using.syncManager.endSync(this);
    super.destroy();
  }
  
  init(): Promise
  {
    return new Promise(this);
  }
  
  id(id?: string): string 
  {
    if(id){
      this._id = id;
      this._persisted = true;
      this.emit('id', id);
    }
    return this._id || this._cid;
  }
  
  cid(): string
  {
    return this._cid;
  }
  
  getName(): string
  {
    return "Model";
  }
  
  getKeyPath(): string[]
  {
    return [this.__bucket, this.id()];
  }
  
  getLocalKeyPath(): string[]
  {
    return [this.__bucket, this.cid()];
  }
  
  isKeptSynced(): bool
  {
    return this._keepSynced;
  }
  
  isPersisted(): bool
  {
    return this._persisted;// || (this._state >= ModelState.CREATED);
  }
  
  bucket(): string
  {
    return this.__bucket;
  }
  
  save(): Promise
  {
    return this.update(this.toArgs());
  }
  
  //
  // TODO: Should update be a static method instead? since
  // we can have several instances of the same model it feels more correct.
  //
  /*
      Updates a model (in its storage) with the given args.

      update(args)
  */
  update(args: {}): Promise
  {
    var
      bucket = this.__bucket,
      id = this.id(),
      promise = new Gnd.Promise();
    
    if(!this._dirty){
      return promise.resolve();
    } 
    
    if(this._initial){
      args['_initial'] = this._initial = false;
      this._storageQueue.once('created:'+id, (id) => {
        this.id(id);
      });
      this._storageQueue.create([bucket], args, (err?, id?) => {
        promise.resolveOrReject(err);
      });
    }else{
      // It may be the case that we are not yet persisted, if so, we should
      // wait until we get persisted before we try to update the storage
      // although we will never get the event anyways, and besides we should
      // update the localStorage in any case...
      // Hopefully a singleton Model will solve this problems...
      this._storageQueue.put([bucket, id], args, (err)=>{
        if(!err){
          this.emit('updated:', this, args);
        }
        promise.resolveOrReject(err);
      });
    }
    return promise;
  }

  remove(): Promise
  {
    return Model.removeById(this.getKeyPath()).then(()=> {
      using.syncManager && using.syncManager.endSync(this);
      this.emit('deleted:', this.getKeyPath());
    });
  }
    
  keepSynced()
  {
    if(this._keepSynced) return;
  
    this._keepSynced = true;
    
    var startSync = () => {
      using.syncManager && using.syncManager.startSync(this);
    }
  
    if (this.isPersisted()){
      startSync();
    }else{
      this.once('id', startSync);
    }
    
    this.on('changed:', (doc, options) => {
      if(!options || ((!options.nosync) && !_.isEqual(doc, options.doc))){
        this.update(doc);
      }
    });
  }
  
  toArgs(){
    var args = {
      _persisted:this._persisted, 
      _cid:this._cid
    };
    
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
  
  /**
    Creates a collection filled with models according to the given parameters.
  */
  static all(parent: Model, argsOrKeypath?, bucket?: string): Promise
  {
    var allInstances = (parent, keyPath, args) => {
      return using.storageQueue.find(keyPath, {}, {}).then((result)=>{
        _.each(result[0], function(doc){_.extend(doc, args)});
        return Container.create(Collection, this, _.last(keyPath), parent, result[0]).then((container)=>{
          result[1].then((docs) =>{
            _.each(docs, function(doc){_.extend(doc, args)});
            container.resync(docs)
          });
          return container;
        });
      });
    };
    return overload({
      'Model Array Object': function(parent, keyPath, args){
        return allInstances(parent, keyPath, args);
      },
      'Model Object String': function(parent, args, bucket){
        var keyPath = parent.getKeyPath();
        keyPath.push(bucket);
        return allInstances(parent, keyPath, args);
      },
      'Model': function(parent){
        return this.all(parent, {}, this.__bucket);
      },
      '': function(parent){
        return allInstances(null, [this.__bucket], {});
      }
    }).apply(this, arguments);
  }

  public all(model: IModel, args, bucket): Promise
  {
    return model.all(this, args, bucket);
  }

  /**
    Returns the sequence determined by a parent model and
    the given model class.
  */
  static seq(parent: Model): Promise;
  static seq(parent: Model, args: {}, bucket: string): Promise;
  static seq(parent: Model, bucket: string): Promise;
  static seq(parent?: Model, args?: {}, bucket?: string): Promise
  {
    var allInstances = (parent, keyPath, args) => {
      return using.storageQueue.all(keyPath, {}, {}).then((result)=>{        
        return Container.create(Sequence, this, _.last(keyPath), parent, result[0]).then((seq)=>{
          result[1].then((items)=>{
            seq.resync(items);
          });
          return seq;
        });
      });
    }
    return overload({
      'Model Array Object': function(parent, keyPath, args){
        return allInstances(parent, keyPath, args);
      },
      'Model Object String': function(parent, args, bucket){
        var keyPath = parent.getKeyPath();
        keyPath.push(bucket);
        return allInstances(parent, keyPath, args);
      },
      'Model String': function(parent, bucket){
        return this.seq(parent, {}, bucket);
      },
      'Model': function(parent){
        return this.seq(parent, {}, this.__bucket);
      }
    }).apply(this, arguments);
  }

  public seq(model: IModel, args, bucket): Promise
  {
    return model.seq(this, args, bucket);
  }
}

}
