/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Model Class

  This class represents a Model in a MVC architecture.
  The model supports persistent storage, offline operation 
  and automatic client<->server synchronization.
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

  // Deprecate args since they should always go via a resync call...
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
      //var extArgs = keyPath ? _.extend({_cid: keyPath[1]}, args) : args;
      //model = ModelClass.fromJSON(extArgs, {fetch: fetch, autosync: autosync});
      model = new ModelClass(keyPath && {_cid: keyPath[1]}, 
                             {fetch: fetch, autosync: autosync});
      model.resync(args);
      this.setModel(model);
      model.autorelease();
    }else{
      autosync && model.keepSynced();
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
  create(args: {}, keepSynced?: bool): Promise<Model>;
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
  ready?: Promise<void>;
}

export interface ModelEvents
{
  on(evt: string, ...args: any[]);
  /**
  * Fired when a model property changes.
  *
  * @event updated:
  * @param model {Model}
  * @param args {any}
  * @deprecated
  */
  on(evt: 'updated:', model: Model, args:any); // Obsolete?
  
  /**
  * Fired when a model has been removed from the storage.
  *
  * @event deleted:
  * @param model {Model}
  */
  on(evt: 'deleted:', model: Model);
}

/**
  The {{#crossLink "Model"}}{{/crossLink}} class is used to represent data
  based on a predefined {{#crossLink "Schema"}}{{/crossLink}}. The Model can be
  automatically synchronized with a server storage, as well as cached locally, 
  and provides property validation.
 
  Models are subclasses of Promise. This is because the data in a Model is
  filled lazily when retrieven from the storage. This allows us to start using
  the model before all its data has been populated from the server. The promise
  resolves after the best possible data (cached or server side) has populated
  the model, effectivelly given the posibility to wait until the model has 
  received all its data.
 
  The base Schema for models (the schema that all Models inherit):
  
       Base model schema:
       {
         _id: ObjectId,
         _cid: String,
         persisted: bool,
       }
       
  @class Model
  @extends Promise
  @constructor
  @param args {Any}
  @param [bucket] {String}
  @param [opts] {ModelOpts}
 **/
export class Model extends Promise<Model> implements Sync.ISynchronizable, ModelEvents
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

  private _persisted: bool;

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
    
    args = args || {};
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
    
    var ready = new Promise();
    if(this.opts.ready){
      this.opts.ready.then(() => 
        ready.then(() => this.resolve(this), (err)=> this.reject(err)));
    }else{
      ready.then(() => this.resolve(this), (err)=> this.reject(err));
    }

    var keyPath = this.getKeyPath();
    if(keyPath && this.opts.fetch){
      this._initial = false;
      this.retain();
      using.storageQueue.fetch(keyPath).then((result) => {
        this.resync(result[0]);// not sure if nosync should be true or not here...
        result[1]
          .then((doc) => this.resync(doc))
          .ensure(() => {
            ready.resolve(this);
            this.release();
          });
      }, (err) => {
        ready.reject(err).ensure(() => this.release());
      });
    }else{
      if(this._id) this._initial = true;
      ready.resolve(this);
    }

    this.opts.autosync && this.keepSynced();
  }
  
  resync(args): void
  {
    // this.schema.populate(args) // populates instances from schema definition
    this.set(args, {nosync: true});
    if(args._id) this._initial = false;
  }

  /**
   *
   *  Subclasses the Model class. Use this method to subclass a Model. This method
   *  takes care of automatic schema subclassing and inheritance of some important
   *  static methods from the Model class.
   *
   *  @method extend
   *  @static
   *  @param {String} bucket A string representing a placeholder in the 
   *  storage where to save the model.
   *  @param {Schema} schema Schema that defines the data of this model.
   *  @return {IModel} A Model Subclass.
   *
   *  @example
     var AnimalSchema = new Schema({
       legs: Number,
       name: String
     });
     
     var Animal = model.extend('animals', AnimalSchema);
     
     var tiger = Animal.create({name: 'tiger', legs: 4});
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
  
  /**
   *
   *  Instantiates a Model. Models are never instantiated using new. The reason
   *  for this is that every instance must be unique for one model, in fact forcing
   *  the singleton pattern for model instances. 
   *
   *  @method create
   *  @static
   *  @param {Any} [args] Optional arguments to fill the model properties with.
   *  @param {Boolean} [autosync=false] Set to true to keep the model automatically synchronized with the storage.
   *  @return {Model} A Model instance.
   *
   *  @example     
     
     var tiger = Animal.create({_id: '1234', name: 'tiger', legs: 4});
   */
  static create(args?: {}): Promise<Model>;
  static create(args: {}, autosync: bool): Promise<Model>;
  static create(args?: {}, autosync?: bool): Promise<Model>
  {
    return overload({
      'Object Boolean': function(args, keepSynced){
        return modelDepot.getModel(this, args, autosync);
      },
      'Object': function(args){
        return this.create(args, false);
      },
      '': function(){
        return this.create({});
      }
    }).apply(this, arguments);
  }

  /**
   *
   *  Finds a Model by its Id. 
   *
   *  @method findById
   *  @static
   *  @param {String||[]} [keyPathOrId] keypath or id of the model to find.
   *  @param {Boolean} [autosync=false] Set to true to keep the model automatically synchronized with the storage.
   *  @param {Any} [args] Optional arguments to set to the found model instance.
   *  @return {Model} A Model instance.
   *
   *  @example     
     
     var tiger = Animal.findById(['animals', '1234']);
     
     var tiger = Animal.findById('1234');
   */
  static findById(keyPathOrId, autosync?: bool, args?: {}): Model
  {
    return overload({
      'Array Boolean Object': function(keyPath, autosync, args){
        return modelDepot.getModel(this, args, autosync, keyPath);
      },
      'String Boolean Object': function(id, autosync, args){
        return this.findById([this.__bucket, id], autosync, args);
      },
      'String Boolean': function(id, autosync){
        return this.findById(id, autosync, {});
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
   *
   *  Removes a model from the storage.
   *
   *  @method removeById
   *  @static
   *  @param {String||[]} [keyPathOrId] keypath or id of the model to find.
   *  @return {Promise} A promise that is resolved when the model instance has
   *  been removed.
   *
   *  @example     
     
     Animal.removeById(['animals', '1234']).then(function(){
       // tiger removed
     }, function(err){
       console.log(err);
     });
   */
  static removeById(keypathOrId): Promise<void>
  {
    var keyPath = _.isArray(keypathOrId) ? keypathOrId : [this.__bucket, keypathOrId];
    return using.storageQueue.del(keyPath, {});
  }

  /**
    @method fromJSON
    @deprecated
  */
  static fromJSON(args, opts?): Model
  {
    return new this(args, opts);
  }

  /**
    @method fromArgs
    @deprecated
  */
  static fromArgs(args, opts?): Model
  {
    return this.fromJSON(args, opts);
  }

  /**
    Destroys the model. This memory is called automatically by the memory 
    management system and should never be called directly.

    @method destroy
    @protected
  */
  destroy(): void
  {
    using.syncManager && using.syncManager.unobserve(this);
    super.destroy();
  }

  /**  
    @method init
    @deprecated
  */
  init(): Promise
  {
    return new Promise(this);
  }

  /**
    Sets the model instance persistend id. This method is called internally
    by the framework and should never be used by the user. Server side ids are
    generated by the server when a model instance is persisted in the storage.
    
    @method id
    @param id {String} an global unique id string.
  */
  id(id: string);
  
  /**
    Gets the model instance id. This method returns the persistent id if 
    available, otherwise just the client id.
    
    @method id
    @return {String} persistent or client id.
  */
  id(): string;
    
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

  /**
    Gets the client id. The client id is a unique id that is always assigned to
    a model client side. 
    
    @method cid
    @return {String} client id.
  */
  cid(): string
  {
    return this._cid;
  }
  
  // TODO: define GetOptions interface, we need it to perform queries
  // when getting collections
  get(key?: string, args?:{}, opts?: {})
  {
   var value = super.get(key);
   if(!_.isUndefined(value)){
     return value;
   }else{
     // Check if it is a lazy property and populate it if so.
     return this.__schema.get(this, key, args, opts);
   }
  } 

  /**
    Gets the name of this Model.
    
    @method getName
    @return {String} The model name.
  */
  getName(): string
  {
    return "Model";
  }

  /**
    Gets the keypath for this model instance. Note that if the instance has not
    yet been persisted, this function returns the same keypath as 
    
    @method getKeyPath
    @return {Array} keypath for this instance.
  */
  getKeyPath(): string[]
  {
    return [this.__bucket, this.id()];
  }

  /**
    Gets the local keypath for this model instance. Note that if the instance has not
    yet been persisted, this function returns the same keypath as 
    
    @method getLocalKeyPath
    @return {Array} keypath for this instance.
  */
  getLocalKeyPath(): string[]
  {
    return [this.__bucket, this.cid()];
  }

  /**
    Checks if this model instance is kept automatically synced with the 
    storages.
    
    @method isKeptSynced
    @return {Boolean}
    @deprecated Use isAutosync instead.
  */
  isKeptSynced(): bool
  {
    return this._keepSynced;
  }
  
  /**
    Checks if this model instance is kept automatically synced with the 
    storages.
    
    @method isAutosync
    @return {Boolean}
  */
  isAutosync(): bool
  {
    return this._keepSynced;
  }
  
  /**
    Checks if this model instance is persisted on a server storage.
    
    @method isPersisted
    @return {Boolean}
  */  
  isPersisted(): bool
  {
    return this._persisted;
  }

  /**
    Gets the bucket where this model is being store.
    
    @method bucket
    @return {String}
  */
  bucket(): string
  {
    return this.__bucket;
  }

  /**
    Triggers a manual update operation with the current model instance state.
  
    @method save
    @return {Promise<void>} Promise resolved when the operation is completed.
  */
  save(): Promise<void>
  {
    return this.update(this.toArgs());
  }

  /**
      Updates a model (in its storage) with the given args.

      @method update
      @return {Promise<void>} Promise resolved when the operation is completed.
      
      TODO: make private
  */
  update(args: {}): Promise<any>
  {
    var
      bucket = this.__bucket,
      id = this.id();
      
    if(!this._dirty) return Gnd.Promise.resolved();

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
      return this._storageQueue.put([bucket, id], args, {}).then((): void =>{
        // Obsolete?
        this.emit('updated:', this, args);
      });
    }
  }
  
  /**
    Removes this instance from the storage. The instance will still be kept in
    memory, and it is the users duty to release it.
  
    @method remove
    @return {Promise<void>}
  */
  remove(): Promise<void>
  {
    return Model.removeById(this.getKeyPath()).then(()=> {
      using.syncManager && using.syncManager.unobserve(this);
      this.emit('deleted:', this);
    });
  }

  // TODO: implement autosync(enable: bool)
  
  /**
    Tells the model to enable autosync. After calling this method the instance
    will be kept automatically in sync with its server side counterpart.
  
    @method keepSynced
  */
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

  /**
    Returns a plain object with all the properties of the model according to
    its schema.
    
    @method toArgs
  */
  toArgs(): any
  {
    return this.__schema.toObject(this);
  }

  /**
    Gets a model collection that fullfills the query condition.

    @static
    @return {Collection} Collection with the models that fulfill the query.
  */
  static find(query: IStorageQuery): Promise<Collection>
  {
    var opts = {
      key: this.__bucket,
      query: query
    }
    return Container.create(Collection, this, opts);
  }

  /**
    Creates a collection filled with models according to the given parameters.
    
    @method all
    @static
    @param {Model} parent
    @param {Mixed} [args]
    @param {String} [bucket]
    
    @return {Collection} collection with all the models
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
    Creates a sequence filled with models according to the given parameters.
    
    @method seq
    @static
    @param {Model} parent
    @param {Mixed} [args]
    @param {String} [bucket]
    @return {Sequence} sequence with all the models.
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
