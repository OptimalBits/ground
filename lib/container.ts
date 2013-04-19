/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Container Class
  
  This class is the base for container classes.
  
*/
/// <reference path="using.ts" />

/// <reference path="base.ts" />
/// <reference path="model.ts" />
/// <reference path="overload.ts" />
/// <reference path="storage/local.ts" />
/// <reference path="storage/store/memory-storage.ts" />

module Gnd 
{
  export interface IContainer
  {
    new (model: IModel, containerName: string, parent?: Model, items?: any[]): Container;
  }
  
  export class Container extends Base implements Sync.ISynchronizable
  {
    public storageQueue: Storage.Queue;
  
    // Event Handlers
    private updateFn: (model: Model, args) => void;
    private deleteFn: (model: Model) => void;
    
    public resyncFn: (items: any[]) => void;
    
    //
    public filterFn: (item: Model) => bool = null;

    // Prototypes for underscore imported methods.
    public filter: (iterator: (item: any)=>bool) => Model[];
    
    // --
    
    public _keepSynced: bool = false;
    
    // Abstract
    public resync(items: any[]): Promise 
    {
      return new Promise(true);
    };
  
    public model: IModel;
    public parent: Model;
    public count: number = 0;
    
    private containerName: string;
    
    // Protected
    public items: any[];
    
    static private getItemIds(items: Model[])
    {
      return _.map(items, function(item){return item.id()});
    }
    
    static public create(ContainerClass: IContainer,
                         model: IModel, 
                         collectionName: string, 
                         parent: Model, 
                         docs: {}[]): Promise
    {
      var container = new ContainerClass(model, collectionName, parent);
      return container.init(docs);
    }
    
    constructor(model: IModel, containerName: string, parent?: Model, items?: any[])
    {
      super();

      this.containerName = containerName;
      
      this.storageQueue = 
        new Gnd.Storage.Queue(using.memStorage, using.storageQueue, false);
    
      this.items = items || [];
      
      this.model = model;
      this.parent = parent;
    
      this.resyncFn = (items) => {
        this.resync(items);
      }
    }
    
    destroy(){
      Util.nextTick(()=>{
        this.items = null;
      });
      
      var key = Storage.Queue.makeKey(this.getKeyPath());
      this.storageQueue.off('resync:'+key, this.resyncFn);
      
      this._keepSynced && this.endSync();
      this.deinitItems(this.getItems());
      super.destroy();
    }
    
    init(docs: {}[]): Promise
    {
      return this.resync(docs).then(()=>{return this});
    }
    
    save(): Promise
    {
      return this.storageQueue.exec();
    }
    
    getKeyPath(): string[]
    {
      if(this.parent) return [this.parent.bucket(), this.parent.id(), this.containerName];
      return [this.model.__bucket];
    }
    
    keepSynced(): void
    {  
      this.startSync();
  
      this['map']((item) => {
        item.keepSynced()
      });
    }
  
    isKeptSynced(): bool
    {
      return this._keepSynced;
    }
    
    filtered(result: (err: Error, models?: Model[])=>void)
    {
      if(this.filterFn){
        result(null, this.filter(this.filterFn));
      }else{
        result(null, this.getItems());
      }
    }
  
    isFiltered(item: Model): bool
    {
      return this.filterFn ? this.filterFn(item) : true;
    } 
    
    // protected
    public startSync()
    {
      this._keepSynced = true;
    
      if(this.parent && using.syncManager){
        if(this.parent.isPersisted()){
          using.syncManager.startSync(this);
        }else{
          this.parent.on('id', () => {
            using.syncManager.startSync(this);
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
      using.syncManager && using.syncManager.endSync(this);
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

