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

/// <reference path="using.ts" />
/// <reference path="base.ts" />
/// <reference path="overload.ts" />
/// <reference path="promise.ts" />
/// <reference path="container/collection.ts" />
/// <reference path="container/sequence.ts" />
/// <reference path="storage/queue.ts" />
/// <reference path="sync/sync.ts" />

/// <reference path="models/schema.ts" />

module Gnd {

/**
  SingletonFactory

  Singleton class that keeps all the instanced models. This is fundamental
  for the synchronization mechanism to work properly 
  so that only one instance of every model exists at a given time.
*/
// class SingeltonFactory // A factory that keeps a singleton for every kind of
// instance based on a given key.
class ModelDepot
{
  private models = {};

  getModel(ModelClass: IModel, args: {}, autosync: bool, keyPath?: string[]): Promise
  {
    var model;
    var fetch: bool = true;

    if(!keyPath){
      fetch = false;

      if(args['_cid'] || args['_id']){
        keyPath = [ModelClass.__bucket, args['_cid'] || args['_id']];
      }
    }

    model = Model.__useDepot && keyPath ? this.models[this.key(keyPath)] : null;

    if(!model){
      var extArgs = keyPath ? _.extend({_cid: keyPath[1]}, args) : args;
      model = ModelClass.fromJSON(extArgs, {fetch: fetch, autosync: autosync});
      this.setModel(model);
    }

    return model.retain();
  }

  key(keyPath: string[])
  {
    return keyPath.join('/');
  }

  setModel(model: Model)
  {
    var models = this.models;

    var remoteKeyPath;
    var localKeyPath = this.key([model.bucket(), model.cid()]);

    models[localKeyPath] = model;

    var setRemote = () => {
      remoteKeyPath = this.key(model.getKeyPath());
      models[remoteKeyPath] = model;
    }

    if(model.isPersisted()) {
      setRemote();
    }else{
      model.once('id', setRemote);
    }

    model.once('destroy: deleted:', () => {
      delete models[localKeyPath];
      remoteKeyPath && delete models[remoteKeyPath];
    });
  }
}

//
// global singleton.
//
var modelDepot = new ModelDepot();

export interface IModel 
{
  new (args: {}, opts?: {}): Model;
  new (args: {}, bucket?: string, opts?: {}): Model;
  __bucket: string;
  schema(): Schema;
  create(args: {}, keepSynced?: bool): Promise;
  fromJSON(args: {}, opts?: {}): Model;
  findById(keyPathOrId, keepSynced?: bool, args?: {}, cb?: (err: Error, instance?: Model) => void);
  find(query: IStorageQuery): Promise;
  all(parent?: Model, args?: {}, bucket?: string) : Promise;
  seq(parent: Model, args: {}, bucket: string) : Promise;
}

export interface ModelOpts
{
  fetch?: bool;
  autosync?: bool;
  ready?: Promise;
}

export class Model extends Promise implements Sync.ISynchronizable
{
  static __useDepot: bool = true;
  static __bucket: string;
  static __schema: Schema =
    new Schema({_cid: String, _id: Schema.ObjectId, _persisted: Boolean});
    
  static schema(){
    return this.__schema;
  }
  
  private __bucket: string;
  private __schema: Schema;

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

  private opts: ModelOpts;

  private _storageQueue: Storage.Queue;

  public _initial: bool = true;

  constructor(args: {}, opts?: ModelOpts);
  constructor(args: {}, bucket?: any, opts?: ModelOpts){
    super();
    
    _.extend(this, args);
    _.defaults(this, this.__schema.toObject(this)); // TODO: opts.strict -> extend instead of defaults.

    this._cid = this._id || this._cid || Util.uuid();

    this.opts = (_.isString(bucket) ? opts : bucket) || {}
    this.__bucket = _.isString(bucket) ? bucket : null;

    this.on('changed:', () => this._dirty = true);

    this._storageQueue = 
      using.storageQueue || new Storage.Queue(using.memStorage);

    if(this.isPersisted()){
      this._initial = false;
    }else{
      this._storageQueue.once('created:'+this.id(), (id) => this.id(id));
    }
    
    var ready = this.opts.ready || this;
    if(this.opts.ready){
      ready.then(()=> this.resolve(this), (err)=> this.reject(err));
    }

    var keyPath = this.getKeyPath();
    if(keyPath && this.opts.fetch){
      this._initial = false;
      this.retain();
      using.storageQueue.fetch(keyPath).then((result) => {
        this.set(result[0], {nosync: true});// not sure if nosync should be true or not here...
        result[1]
          .then((doc) => {
            this.set(doc, {nosync: true});
          })
          .ensure(() => {
            this.resolve(this);
            this.release();
          });
      }).fail((err) => this.reject(err)).ensure(() => this.release());
    }else{
      this.resolve(this);
    }

    this.opts.autosync && this.keepSynced();
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
  static extend(bucket: string, schema: Schema)
  {
    var _this = this;
    
    function __(args, _bucket, opts) {
      var constructor = this.constructor;
      this.__schema = __['__schema'];
      _this.call(this, args, bucket || _bucket, opts || _bucket);
      
      // Call constructor if different from Model constructor.
      if(constructor && (_this != constructor)){
        constructor.call(this, args);
      }
    }; 

    Util.inherits(__, this);

    // Copy Models static methods
    var statics = 
      ['schema',
       'extend',
       'create',
       'findById',
       'find',
       'all',
       'seq',
       'fromJSON',
       'fromArgs'];

    _.each(statics, (method) => __[method] = this[method]);
      
    _.extend(__, {
      __schema: Schema.extend(this.__schema, schema),
      __bucket: bucket,
    });

    return __;
  }

  // TODO: Create must first try to find the model in the depot,
  // and "merge" the args argument with the model properties from the depot.
  // if not available instantiate it and save it in the depot.  
  static create(args?: {}): Promise;
  static create(args: {}, keepSynced: bool): Promise;
  static create(args?: {}, keepSynced?: bool): Promise
  {
    return overload({
      'Object Boolean': function(args, keepSynced){
        return modelDepot.getModel(this, args, keepSynced);
      },
      'Object': function(args){
        return this.create(args, false);
      },
      '': function(){
        return this.create({});
      }
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
    var keyPath = _.isArray(keypathOrId) ? keypathOrId : [this.__bucket, keypathOrId];
    return using.storageQueue.del(keyPath, {});
  }

  static fromJSON(args, opts?): Model
  {
    return new this(args, opts);
  }

  static fromArgs(args, opts?): Model
  {
    return this.fromJSON(args, opts);
  }

  destroy(): void
  {
    using.syncManager && using.syncManager.unobserve(this);
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
      this.emit('_persisted', true);
      this.emit('id', id); // DEPRECATED!
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
    return this._persisted;
  }

  bucket(): string
  {
    return this.__bucket;
  }

  save(): Promise
  {
    return this.update(this.toArgs());
  }

  /*
      Updates a model (in its storage) with the given args.

      update(args)
      
      TODO: 
      Only store the models properties according to the
      Schema.
  */
  update(args: {}): Promise
  {
    var
      bucket = this.__bucket,
      id = this.id();
      
    if(!this._dirty) return new Gnd.Promise(true);

    if(this._initial){
      args['_initial'] = this._initial = false;
      this._storageQueue.once('created:'+id, (id) => {
        this.id(id);
      });
      Util.merge(this, args);
      return this._storageQueue.create([bucket], args, {});
    }else{
      // It may be the case that we are not yet persisted, if so, we should
      // wait until we get persisted before we try to update the storage
      // although we will never get the event anyways, and besides we should
      // update the localStorage in any case...
      // Hopefully a singleton Model will solve this problems...
      return this._storageQueue.put([bucket, id], args, {}).then(()=>{
        this.emit('updated:', this, args);
      });
    }
  }

  remove(): Promise
  {
    return Model.removeById(this.getKeyPath()).then(()=> {
      using.syncManager && using.syncManager.unobserve(this);
      this.emit('deleted:', this);
    });
  }

  // autosync(enable: bool)
  keepSynced()
  {
    if(this._keepSynced) return;

    this._keepSynced = true;

    var startSync = () => {
      if(this.isPersisted()){
        using.syncManager && using.syncManager.observe(this);
        this.off('_persisted', startSync);
      }
    }

    if (this.isPersisted()){
      startSync();
    }else{
      this.on('_persisted', startSync);
    }

    this.on('changed:', (doc, options) => {
      if(!options || ((!options.nosync) && !_.isEqual(doc, options.doc))){
        this.update(doc);
      }
    });
  }

  toArgs(){
    return this.__schema.toObject(this);
  }

  static find(query: IStorageQuery): Promise
  {
    var opts = {
      key: this.__bucket, 
      query: query
    }
    return Container.create(Collection, this, opts);
  }

  /**
    Creates a collection filled with models according to the given parameters.
  */
  static all(parent: Model, bucket?: string): Promise;
  static all(parent?: Model, argsOrKeypath?, bucket?: string): Promise
  {
    var allInstances = (parent, keyPath, args) =>
      Container.create(Collection, this, {key: _.last(keyPath)}, parent);
 
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
      'Model String': function(parent, bucket){
        return this.all(parent, {}, bucket);
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
    var allInstances = (parent, keyPath, args) =>
      Container.create(Sequence, this, {key:_.last(keyPath)}, parent);

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

// Virtual properties.
// TODO: Add support for generating virtual properties.
Model.prototype.id['isVirtual'] = true;

}
