/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Container Class
  
  This class is the base for container classes.
  
*/
/// <reference path="../using.ts" />

/// <reference path="../base.ts" />
/// <reference path="../model.ts" />
/// <reference path="../overload.ts" />
/// <reference path="../storage/local.ts" />
/// <reference path="../storage/store/memory-storage.ts" />

module Gnd 
{
  export interface IContainer
  {
    new (model: IModel, opts?: ContainerOptions, parent?: Model, items?: any[]): Container;
  }
  
  export interface ContainerOptions
  {
    key?: string;
    nosync?: bool;
    query?: IStorageQuery;
  }
  
  /**
   The {{#crossLink "CONTAINER"}}{{/crossLink}} class is used as base class for
   model containers. For example Collection and Sequence are subclasses of
   Container.
   
   The container class also provides the preferred factory method for instantiating 
   Collections and Sequences.
 
    @class Container
    @extends Promise
    @constructor
    @param model {IModel}
    @param [opts] {ContainerOptions}
    @param [parent] {Model}
    @param [items] {Model[]}
   **/
  export class Container extends Promise<Container> implements Sync.ISynchronizable
  {
    public storageQueue: Storage.Queue;
  
    // Event Handlers
    public updateFn: (model: Model, args) => void;
    
    public deleteFn: (model: Model) => void;
    
    public resyncFn: (items: any[]) => void;
    
    /**
      Filtering function to be used for this Container.
      This function defines the filtering function to be used by this container.
  
      @property filterFn
      @type Function
      @default undefined
    **/
    public filterFn: (item: Model) => bool = null;

    // Prototypes for underscore imported methods.
    public filter: (iterator: (item: any)=>bool) => Model[];
    
    // --
    
    public _keepSynced: bool = false;
    
    // Abstract
    public resync(items: any[]): Promise 
    {
      return new Promise(true);
    }
  
    public model: IModel;
    public parent: Model;
    public count: number = 0;
    
    // Protected
    public items: any[];
    public opts: ContainerOptions;
    
    private static getItemIds(items: Model[])
    {
      return _.map(items, (item) => item.id());
    }
    
    /**
      Factory method for container subclasses.
      
      @method create
      @static
      @param ContainerClass {IContainer} Container subclass
      @param model {IModel} Model class
      @param [opts] {ContainerOptions}
      @param [parent] {Model}
      @param [items] {Any[]}
    */
    public static create(ContainerClass: IContainer,
                         model: IModel, 
                         opts?: ContainerOptions,
                         parent?: Model, 
                         items?: any[]): Container
    {
      return new ContainerClass(model, opts, parent, items);
    }
    
    constructor(model: IModel, opts?: ContainerOptions, parent?: Model, items?: any[])
    {
      super();
      
      this.opts = opts = opts || {};
      
      opts.key = opts.key || (model && model.__bucket);
      
      this.storageQueue = 
        new Gnd.Storage.Queue(using.memStorage, using.storageQueue, false);

      this.items = items ? _.clone(items) : [];
      
      this.model = model;
      this.parent = parent;

      this.resyncFn = (items) => this.resync(items);
    }
    
    destroy()
    {
      Util.nextTick(() => this.items = null);
      
      var keyPath = this.getKeyPath();
      if(keyPath){
        var key = Storage.Queue.makeKey(keyPath);
        this.storageQueue.off('resync:'+key, this.resyncFn);
      }
      
      this._keepSynced && this.endSync();
      this.deinitItems(this.getItems());
      super.destroy();
    }
    
    init(docs: {}[]): Promise
    {
      return this.resync(docs).then(() => this);
    }
    
    /**
      Saves this container to the storages manually.
      
      @method save
      @return {Promise}
    */
    save(): Promise
    {
      return this.storageQueue.exec();
    }
    
    /**
      Gets the keypath for this container.
      
      @method getKeyPath
      @returns {String[]}
    */
    getKeyPath(): string[]
    {
      if(this.opts.key){
        if(this.parent) return [this.parent.bucket(), this.parent.id(), this.opts.key];
        return [this.opts.key];
      }
    }

    /**
    
      Enables autosync for this container, meaning that the container will
      be kept synchronized with its server side counterpart.
    
      @method keepSynced
    */
    keepSynced(): void
    {  
      this.startSync();
  
      this['map']((item) => {
        item.keepSynced()
      });
    }
  
    /**
      Checks if this container is kept automatically synced with the 
      storages.
    
      @method isKeptSynced
      @return {Boolean}
      @deprecated
    */
    isKeptSynced(): bool
    {
      return this._keepSynced;
    }
    
    /**
      Checks if this container is kept automatically synced with the 
      storages.
    
      @method isAutosync
      @return {Boolean}
    */
    isAutosync(): bool
    {
      return this._keepSynced;
    }
    
    /**
      @method filtered
      @deprecated
    */
    filtered(result: (err: Error, models?: Model[])=>void)
    {
      if(this.filterFn){
        result(null, this.filter(this.filterFn));
      }else{
        result(null, this.getItems());
      }
    }
  
    /**
      Checks if this container if filtered by some filter function.
    
      @method isFiltered
      @return {Boolean}
    */
    isFiltered(item: Model): bool
    {
      return this.filterFn ? this.filterFn(item) : true;
    } 
    
    // protected
    public startSync()
    {
      this._keepSynced = true;
    
      // TODO: Add support for auto-sync for collections without parents.
      if(this.parent && using.syncManager){
        if(this.parent.isPersisted()){
          using.syncManager.observe(this);
        }else{
          this.parent.on('id', () => {
            using.syncManager.observe(this);
          });
        }
      }
    
      this.storageQueue.exec().then(()=>{
        this.storageQueue = using.storageQueue;
      });
    }
    
    // protected
    public endSync()
    {
      using.syncManager && using.syncManager.unobserve(this);
      this._keepSynced = false;
    }
    
    public getItems(): Model[]
    {
      return this.items;
    }
    
    public initItems(item: Model);
    public initItems(items: Model[]);
    public initItems(items)
    {
      items = _.isArray(items)? items:[items];
      for (var i=0,len=items.length; i<len;i++){
        var item = items[i];
        item.retain();
        item.on('changed:', this.updateFn);
        item.on('deleted:', this.deleteFn);
      }
    }
  
    public deinitItems(item: Model);
    public deinitItems(items: Model[]);
    public deinitItems(items)
    {      
      for (var i=0,len=items.length; i<len;i++){
        var item = items[i];
        item.off('changed:', this.updateFn);
        item.off('deleted:', this.deleteFn);
        item.release();
      }
    }    
  }
}

