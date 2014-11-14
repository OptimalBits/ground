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

  // Study if we can deprecate args since they should always go via a resync call...
  getModel(ModelClass: IModel, args: {}, autosync: boolean, keyPath?: string[]): Promise<Model>
  {
    var model;
    var fetch: boolean = true;

    if(!keyPath){
      fetch = false;

      if(args['_cid']){
        keyPath = [ModelClass.__bucket, args['_cid']];
      }
    }

    model = Model.__useDepot && keyPath ? this.models[this.key(keyPath)] : null;

    if(!model){
      model = new ModelClass(_.extend({}, keyPath && {_cid: keyPath[1]}, args),
                             {fetch: fetch, autosync: autosync});
      this.setModel(model);
      !model._persisting && !model.isPersisted() && !fetch && autosync && model.save();
    }else{
      if(args['_id']){
        model._id = args['_id'];
      }
      autosync && model.autosync(true);
      model.retain();
    }
    return model;
  }

  key(keyPath: string[])
  {
    return keyPath.join('/');
  }

  setModel(model: Model)
  {
    var models = this.models;

    var keyPath = this.key([model.bucket(), model.id()]);

    models[keyPath] = model;
    
    model.once('destroy: deleted:', () => {
      delete models[keyPath];
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
  __strict: boolean;
  schema(): Schema;
  create(args: {}, keepSynced?: boolean): Model;
  fromJSON(args: {}, opts?: {}): Model;
  findById(keyPathOrId, keepSynced?: boolean, args?: {}, cb?: (err: Error, instance?: Model) => void);
  find(query: Storage.IStorageQuery): Collection;
  all(parent: Model, bucket?: string): Collection;
  all(parent?: Model, argsOrKeypath?, bucket?: string): Collection;
  seq(parent: Model, args: {}, bucket: string) : Sequence;
}

export interface ModelOpts
{
  fetch?: boolean;
  autosync?: boolean;
}

export interface ModelEvents
{
  on(evt: string, ...args: any[]);
  once(evt: string, ...args: any[]);
  emit(evt: string, ...args: any[]);
  
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
  
  /**
  * Fired when a model has been persisted on a server storage
  *
  * @event persisted:
  */
  once(evt: 'persisted:');
  on(evt: 'persisted:');
  emit(evt: 'persisted:');
}

/**
  Model Schema Type. This class can be used to define models as properties
  in schemas.
    
      var ChatSchema = new Schema({
        name: new ModelSchemaType(Name);
      });

  @class ModelSchemaType
  @extends SchemaType
  @constructor
  @param model {IModel} A model class defining the type of the model.
*/
export class ModelSchemaType extends SchemaType
{
  public static type: IModel = Model;
  private model: IModel;
  
  constructor(model: IModel)
  {
    super({type: model});
  }
    
  fromObject(args: {module?: string}, opts?)
  {
    if(args instanceof this.definition.type){
      return args;
    }else if(_.isString(args)){
      return this.definition.type.findById(args, opts && opts.autosync);
    }else if(args.module){
      return new ModelProxy(args, args.module);
    }
    return this.definition.type.create(args, opts && opts.autosync);
  }
  
  toObject(obj)
  {
    if(obj instanceof ModelProxy){
      return obj.model.toArgs();
    }else{
      //return super.toObject(obj);
      return obj.toArgs();
    }
  }
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
         _cid: String,
         _status: {type: String, enum: ['CREATED', 'COMMITING', 'COMMITED']},
       }
  
  @class Model
  @extends Promise
  @constructor
  @param args {Any}
  @param [bucket] {String}
  @param [opts] {ModelOpts}
 **/
export class Model extends Base implements Sync.ISynchronizable, ModelEvents
{
  static __useDepot: boolean = true;
  static __bucket: string;
  static __strict: boolean;

  static __schema: Schema =
    new Schema({
      _cid: String, 
      _status: {type: String, enum: ['CREATED', 'COMMITING', 'COMMITED']},

      // TO DEPRECATE:
      _persisting: Boolean,
      _persisted: Boolean,
    });

  static schema(){
    return this.__schema;
  }
  
  private _promise: Promise<Model>;
  
  private __bucket: string;
  private __schema: Schema;
  private __strict: boolean;

  private __rev: number = 0;

  public _persisting: boolean;
  private _persisted: boolean;

  // Dirty could be an array of modified fields
  // that way we can only synchronize whats needed. Furthermore,
  // when receiving a resync event we could check if there is a 
  // conflict or not.
  private _dirty: boolean = true;

  private _keepSynced: boolean = false;

  private _cid: string;

  private opts: ModelOpts;

  private _storageQueue: Storage.Queue;
  private lazys: Base[] = [];

  constructor(args: {}, opts?: ModelOpts);
  constructor(args: {}, bucket?: any, opts?: ModelOpts){
    super();
    
    args = args || {};
    if(!this.__strict){
      _.extend(this, args);
    }
    this.__schema = this.__schema || this['constructor'].__schema;
    _.extend(this, this.__schema.fromObject(args));
    
    this._cid = this._cid || Util.uuid();

    this.opts = (_.isString(bucket) ? opts : bucket) || {}
    this.__bucket = _.isString(bucket) ? bucket : null;

    this.on('changed:', () => this._dirty = true);

    this._storageQueue = 
      using.storageQueue || new Storage.Queue(using.memStorage);

    if(!this.isPersisted()){
      this._storageQueue.once('created:'+this.id(), () => {
        this.set('_persisted', true, {nosync: true});
      });
    }

    var keyPath = this.getKeyPath();
    if(this.opts.fetch){
      this._persisting = true;
      this.retain();

      // We need to manually create a promise so that
      // we can resolve to this (which also is a promise)
      this._promise = new Promise<Model>((resolve, reject) =>{
        using.storageQueue.fetchLocal(keyPath)
          .then((doc) => this.resync(doc), (err) => {})
          .then(() => this.resync())
          .ensure(() => {
            this.release();
            resolve(this);
          }).fail((err) => {});
      });
    }else{
      this._promise = Promise.resolved(this);
    }

    this._promise.uncancellable = true;

    this.opts.autosync && this.keepSynced();
    
    this.once('_persisted', (val) => val && this.emit('persisted:'));
  }
  
  resync(args?): Promise<any>
  {
    if(args){
      this.set(args, {nosync: true, nocache: true});
      return Promise.resolved();
    }else{
      // Fetch the model from the server.
      this.retain();

      var fetcher = using.storageQueue.fetchRemote(this.getKeyPath()).then((args)=>{
        if(args){
          return this.resync(args);
        }
      }).fail((err) => {});

      fetcher.ensure(()=>{
        this.release()
      });

      return fetcher;
    }
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
   // TODO: extensorFn?: (_super: Model) => any
  static extend(bucket: string, schema?: Schema)
  {
    var __super = this;
    
    function __(args, _bucket, opts) {
      var constructor = this.constructor;
      this.__schema = this.__schema || __['__schema'];
      this.__strict = this.__strict || __['__strict'];
      __super.call(this, args, bucket || _bucket, opts || _bucket);
      
      // Call constructor if different from Model constructor and Base
      if(constructor && (__super != constructor) && (constructor != Base)){
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
    // _.each(this, (property) => __[property] = this[property]);
      
    __['__schema'] = Schema.extend(this.__schema, schema);
    __['__bucket'] = bucket;
    __['__strict'] = !!schema;

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
  static create(args?: {}): Model;
  static create(autosync: boolean): Model;
  static create(args: {}, autosync: boolean): Model;
  static create(args?: {}, autosync?: boolean): Model
  {
    return overload({
      'Object Boolean': function(args, autosync){
        return modelDepot.getModel(this, args, autosync);
      },
      'Object': function(args){
        return this.create(args, false);
      },
      'Boolean': function(autosync){
        return this.create({}, autosync);
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
  static findById(keyPathOrId, autosync?: boolean, args?: {}): Model
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
  
  willChange(key, val){
    var schema = this.__schema.getSchemaType(key);
    return schema ? schema.fromObject(val) : val;
  }
  
  /**
    Checks if the model has the given id. 
    @method checkId
  */
  checkId(id: string): boolean
  {
    return this._cid === id;
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
    _.invoke(this.lazys, Base.release);
    super.destroy();
  }

  /**  
    @method init
    @deprecated
  */
  init(): Promise<Model>
  {
    return Promise.resolved(this);
  }
  
  /**
    Gets the model instance id. This method returns the persistent id if 
    available, otherwise just the client id.
    
    @method id
    @return {String} persistent or client id.
  */    
  id(): string 
  {
    return this._cid;
  }

  /**
    Gets a given property from the model. For some properties this function
    populates the property when getting it, allowing lazy properties in models.
  
    TODO: define GetOptions interface, we need it to perform queries
    when getting collections
    
    @method get
    @param key {String}
    @param args {Object}
    @param opts {GetOptions}
  */
  get(key?: string, args?:{}, opts?: {})
  {
   var value = super.get(key);
   if(_.isUndefined(value)){
      // Check if it is a lazy property and populate it if so.
      value = this.__schema.get(this, key, args, opts);
      if (!_.isUndefined(value)){
        this[key] = value;
        if(value instanceof Base){
          this.lazys.push(value); 
        }
      } 
   }
   return value;
  }

  /**
    Clears a given property from the model. This is mostly useful for lazy properties,
    since they get cached automatically, and in some ocassions we want to release them
    before the model itself gets destructed.
  */
  clear(key: string)
  {
    var value = this[key];
    if(value instanceof Base){
      Base.release(value);
    }
    delete this[key];
  }
  
  /**
    Resolves the promise when the given key is available with the keys
    value.
  */
  when(key: string): Promise<any>
  {
    var val = this.get(key);
    if(_.isUndefined(val)){
      return new Promise((resolve)=>{
        this.once(key, (val) => {
          resolve(val)
        });
      });
    }
    return val;
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
    Checks if this model instance is kept automatically synced with the 
    storages.
    
    @method isKeptSynced
    @return {Boolean}
    @deprecated Use isAutosync instead.
  */
  isKeptSynced(): boolean
  {
    return this._keepSynced;
  }
  
  /**
    Checks if this model instance is kept automatically synced with the 
    storages.
    
    @method isAutosync
    @return {Boolean}
  */
  isAutosync(): boolean
  {
    return this._keepSynced;
  }
  
  /**
    Checks if this model instance is persisted on a server storage.
    
    @method isPersisted
    @return {Boolean}
  */  
  isPersisted(): boolean
  {
    return this._persisted;
  }

  /**
    Waits until the model has been persisted on server storage.

    @method whenPersisted
    @return {Promise} resolved when the model is persisted.
    @example
    
    animal.whenPersisted().then(function(){
      // do something 
    });
  */
  whenPersisted(): Promise<void>
  {
    return new Promise<void>((resolve, reject) =>{
      if(this.isPersisted()){
        resolve();
      }else{
        this.once('persisted:', () => resolve());
      }
    });
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
    
    if(this.isPersisted() || this._persisting){
      // It may be the case that we are not yet persisted, if so, we should
      // wait until we get persisted before we try to update the storage
      // although we will never get the event anyways, and besides we should
      // update the localStorage in any case...
      // Hopefully a singleton Model will solve this problems...
      return this._storageQueue.put([bucket, id], args, {}).then((): void =>{
        // Obsolete?
        this.emit('updated:', this, args);
      });
    }else{
      args['_persisting'] = this._persisting = true;
      this._storageQueue.once('created:'+id, () => {
        this._persisted = true;
        this.emit('persisted:');
      });
      Util.merge(this, args);
      return this._storageQueue.create([bucket], args, {});
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

  // TODO: implement autosync(enable: boolean)
  /**
    Tells the model to enable autosync. After calling this method the instance
    will be kept automatically in sync with its server side counterpart.
  
    @method keepSynced
    @chainable
  */
  autosync(enable: boolean): boolean
  {
    if(enable) this.keepSynced();
    else{
      // TODO: Implement
    }
    return this.isAutosync();
  }
  
  /**
    Tells the model to enable autosync. After calling this method the instance
    will be kept automatically in sync with its server side counterpart.
  
    @method keepSynced
    @chainable
    @deprecated use autosync method instead
  */
  keepSynced(): Model
  {
    if(this._keepSynced) return this;

    this._keepSynced = true;

    using.syncManager && using.syncManager.observe(this);
    
    this.on('changed:', (doc: any, options: any) => {
      options = options || {};
      if(!options.nosync && !_.isEqual(doc, options.doc)){
        this.update(doc);
      }else if(!options.nocache){
        this._storageQueue.putLocal(this.getKeyPath(), doc, {});
      }
    });
    return this;
  }

  /**
    Returns a plain object with all the properties of the model according to
    its schema.
    
    @method toArgs
  */
  toArgs(): any
  {
    return _.extend(this.__strict ? {} : this._toArgs(this),
                    this.__schema.toObject(this));
  }
  
  private _toArgs(obj): any
  {
    var args = {};
    _.forIn(obj, (value, key) => {
      if(!_.isObject(value) && !_.isFunction(value) && key[0] != '_'){
        args[key] = value;
      };
    });
    return args
  }

  /**
    Gets a model collection that fullfills the query condition.

    @static
    @method find
    @param query {Storage.IStorageQuery} query to be satisfied by the returned
    collection.
    @return {Collection} Collection with the models that fulfill the query.
  */
  static find(query: Storage.IStorageQuery): Collection
  {
    var opts = {
      key: this.__bucket,
      query: query || {}
    }
    return Container.create<Collection>(Collection, this, opts);
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
  // static all(parent: Model, bucket?: string): Collection;
  static all(parent?: Model, argsOrKeypath?, bucket?: string): Collection
  {
    var allInstances = (parent: Model, keyPath: string[], args: {}) => {
      var opts = _.extend({key: _.last(keyPath)}, args);
      return Container.create(Collection, this, opts, parent);
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

  public all(model: IModel, args, bucket): Collection
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
  static seq(parent: Model): Sequence; //
  static seq(parent: Model, args: {}, bucket: string): Sequence; //
  static seq(parent: Model, bucket: string): Sequence; //
  static seq(parent?: Model, args?: {}, bucket?: string): Sequence //
  {
    var allInstances = (parent: Model, keyPath: string[], args: {}) => {
      var opts = _.extend({key: _.last(keyPath)}, args);
      return Container.create(Sequence, this, opts, parent);
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

  public seq(model: IModel, args, bucket): Sequence
  {
    return model.seq(this, args, bucket);
  }
  
  //
  // Promise Mixin
  //
  /**
  
    Then method waits for a promise to resolve or reject, and returns a new
    promise that resolves directly if the onFulfilled callback returns a value,
    or if the onFulfilled callback returns a promise then when 
    the returned promise resolves.
  
    @method then
    @param [onFulfilled] {Function}
    @param [onRejected] {Function}
    @return {Promise} A promise according to the rules specified 
  **/
  then<U>(onFulfilled: (value: Model) => U, onRejected?: (reason: Error) => void): Promise<U>;
  then<U>(onFulfilled: (value: Model) => Promise<U>, onRejected?: (reason: Error) => void): Promise<U>;
  then(onFulfilled: (value: Model) => void, onRejected?: (reason: Error) => void): Promise<void>;
  then(onFulfilled: (value: Model) => any, onRejected?: (reason: Error) => void): Promise<any>
  {
    return this._promise.then.apply(this._promise, arguments);
  }
  
  /**
    This method is syntactic sugar for then when only caring about a promise
    rejection.
    
    @method fail
    @param onRejected {Function}
  **/
  fail<U>(onRejected?: (reason: Error) => any): Promise<U>
  {
    return this._promise.fail.apply(this._promise, arguments);
  }
  
  /**
    Ensures that the callback is called when the promise resolves or rejects.
    
    @method ensure
    @param always {Function} callback to be executed always independetly if the 
    project was resolved or rejected.
  **/
  ensure(always: () => any)
  {
    return this._promise.ensure.apply(this._promise, arguments);
  }

  /**
    Cancels the promise (rejects with reason CancelError)
    
    @chainable
  **/
  cancel()
  {
    //
    // We made this a noop so that models are uncancelable
    //return this._promise.cancel.apply(this._promise, arguments);
  }
}

// Virtual properties.
// TODO: Add support for generating virtual properties.
Model.prototype.id['isVirtual'] = true;

// -- 
declare var curl;

/**
  This class proxies all the events that the underlying model emits, and
  resolves to the concrete instance of a Model.
  
  This class is used when declaring Abstract models in a Schema, i.e., when
  only the parent model is known when declaring the schema, and the concrete
  implementation is fetched from a remote storage at runtime.
  
  Note: this class should be strictly private and not exported.
  
  @class ModelProxy
*/
// Investigate if we can derive directly from Model instead of a Promise.
export class ModelProxy extends Promise<Model>
{
  model: Model;
  
  constructor(model: Model);
  constructor(modelOrArgs: any, classUrl?: string);
  constructor(modelOrArgs: any, classUrl?: string)
  {
    super((resolve, reject) =>{
    
      // Should only check for instanceof Model...
      if(modelOrArgs instanceof Base){
        this.model = modelOrArgs.retain();
        resolve(modelOrArgs);
        this['__schema'] = this.model['__schema'];
      }else{
        _.extend(this, modelOrArgs);
      
        curl([classUrl]).then(
          (modelClass: IModel) => {
            var fn = _.bind(_.omit, _, this);
            var args = fn.apply(this, _.functions(this));
            this.model = modelClass.create ? modelClass.create(args) : new modelClass(args);
            this['__schema'] = modelClass.schema();
            this.model.resync(args);
            this.model.on('*', () => {
              this.emit.apply(this, arguments);
            });
            resolve(this.model)
          },
          (err) => reject(err)
        );
      }
    
    });
    this.uncancellable = true;
  }

  cancel(){
    // Override Cancel with a noop since models should not be cancelable.
  }

  destroy(){
    Base.release(this.model);
    super.destroy();
  }
  
  get(keypath?: string, args?:{}, opts?: {})
  {
    return this.model ? this.model.get(keypath, args, opts) : super.get(keypath);
  }
  
  //set(doc: {}, opts?: {});
  set(keyOrObj, val?: any, opts?: {}): Base
  {
    this.model ? this.model.set(keyOrObj, val, opts) : 
    super.set(keyOrObj, val, opts);
    return this;
  }
}

}
