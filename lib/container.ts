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
  export class Container extends Base implements Sync.ISynchronizable
  {
    public storageQueue: Storage.Queue;
  
    // Event Handlers
    private updateFn: (model: Model, args) => void;
    private deleteFn: (model: Model) => void;
    
    public resyncFn: (items: any[]) => void;
    
    // --
    
    public _keepSynced: bool = false;
    
    // Abstract
    private resync(items: any[]){};
  
    public model: IModel;
    public parent: Model;
    public count: number = 0;
    
    // Protected
    public items: any[];
    
    static private getItemIds(items: Model[])
    {
      return _.map(items, function(item){return item.id()});
    }
    
    constructor(model: IModel, parent?: Model, items?: any[])
    {
      super();
      
      this.storageQueue = 
        new Gnd.Storage.Queue(using.memStorage, using.storageQueue, false);
    
      this.items = items || [];
      
      this.model = model;
      this.parent = parent;
    
      this.resyncFn = (items) => {
        this.resync(items);
      }
  
      if(parent){
        if(parent.isPersisted()){
          this.listenToResync(using.storageQueue, true);
        }else{
          parent.once('id', ()=> {
            this.listenToResync(using.storageQueue, true)
          });
        }
      }else{
        this.listenToResync(using.storageQueue, true);
      }
    }
    
    destroy(){
      Util.nextTick(()=>{
        this.items = null;
      });

      this._keepSynced && this.endSync();
      this.deinitItems(this.getItems());
      super.destroy();
    }
    
    save(cb?: ()=>void): void
    {
      this.storageQueue.exec(()=>{
        cb && cb();
      });
    }
    
    getKeyPath(): string[]
    {
      if(this.parent) return [this.parent.bucket(), this.parent.id(), this.model.__bucket];
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
    
    // protected
    public startSync()
    {
      this._keepSynced = true;
    
      if(this.parent && Model.syncManager){
        if(this.parent.isPersisted()){
          Model.syncManager.startSync(this);
        }else{
          this.parent.on('id', () => {
            Model.syncManager.startSync(this);
          });
        }
      }
    
      this.storageQueue.exec((err?)=>{
        this.storageQueue = using.storageQueue;
        this.listenToResync(using.storageQueue);
      });
    }
    
    // protected
    public endSync()
    {
      Model.syncManager && Model.syncManager.endSync(this);
      this._keepSynced = false;
    }
    
    public getItems(): Model[]
    {
      return this.items;
    }
    
    private listenToResync(queue: Storage.Queue, once?: bool){
      var key = Storage.Queue.makeKey(this.getKeyPath());
      queue[once ? 'once' : 'on']('resync:'+key, this.resyncFn);
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
      var key = Storage.Queue.makeKey(this.getKeyPath());
      this.storageQueue.off('resync:'+key, this.resyncFn);
      for (var i=0,len=items.length; i<len;i++){
        var item = items[i];
        item.off('changed:', this.updateFn);
        item.off('deleted:', this.deleteFn);
        item.release();
      }
    }    
  }
}

