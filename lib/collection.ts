/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Collection Class
  
  This class represents a unordered collection of models.
  The collection supports persistent storage, offline and
  automatic client<->server synchronization.
  
  Events:
*/
/// <reference path="base.ts" />
/// <reference path="model.ts" />
/// <reference path="overload.ts" />
/// <reference path="container.ts" />
/// <reference path="mutex.ts" />

module Gnd {

export class Collection extends Container
{
  // Even handlers
  public updateFn: (model: Model, args) => void;
  public deleteFn: (model: Model) => void;
  
  // Mutex
  private resyncMutex: Mutex = new Mutex();
  
  // Links
  private linkFn: (evt: string, item: Model, fields?: string[]) => void;
  private linkTarget: Collection;

  public sortByFn: () => number; //public sortByFn: string;
  public sortOrder: string = 'asc';
  
  constructor(model: IModel, collectionName: string, parent?: Model, items?: Model[])
  {
    super(model, collectionName, parent, items);
    
    var _this = this;
    this.updateFn = function(args){
      if(_this.sortByFn){
        var index = _this['indexOf'](this);
        _this.items.splice(index, 1);
        _this.sortedAdd(<Model>this);
      }
      _this.emit('updated:', this, args);
    };
    
    this.deleteFn = (itemId)=>{
      this.remove(itemId, false);
    };

    this.on('sortByFn sortOrder', (fn) => {
      var oldItems = this.items;
      if(this.sortByFn){
        this.items = this['sortBy'](this.sortByFn)
      }
      (this.sortOrder == 'desc') && this.items.reverse();
      this.emit('sorted:', this.items, oldItems);
    });
    
    this.initItems(this.items);
    
    if(parent && parent.isKeptSynced()){
      this.keepSynced()
    }
  }
  
  destroy(){
    this.unlink();
    super.destroy();
  }
  
  findById(id)
  {
    return this['find']((item) => {
      return item.id() == id
    });
  }
  
  add(items: Model[], opts?): Promise
  {
    opts = opts || {};

    return Promise.map(items, (item)=>{
      return this.addItem(item, opts).then(()=>{
        this._keepSynced && !item._keepSynced && item.keepSynced();
      });
    });
  }

  remove(itemIds, opts): Promise
  {
    var 
      items = this.items,
      keyPath = this.getKeyPath();
    
    opts = opts || {};
    
    return Promise.map(itemIds, (itemId) => {
      var item = this.findById(itemId);
  
      if(item){
        items.splice(_.indexOf(items, item), 1);
        
        item.off('changed:', this.updateFn);
        item.off('deleted:', this.deleteFn);
        
        this.set('count', items.length);
        this.emit('removed:', item);
        
        if(!opts || !opts.nosync){
          var itemKeyPath = _.initial(item.getKeyPath());
          return this.storageQueue.remove(keyPath, itemKeyPath, [item.id(), item.cid()]);
        }
        
        item.release();
      }
      return new Promise(true);
    });
  }
  
  toggleSortOrder(){
    this['set']('sortOrder', this.sortOrder == 'asc' ? 'desc' : 'asc');
  }
  
  /*
    link
    
    Links the collection to target one, listening to added, removed and
    updated event. Besides that, when link is called the first time, it
    generated added events for all the items in the target collection.
    
    Note: a collection can only link to one target collection, although
    many collections can link to the same target.
  */
  link(target: Collection, 
       fn: (evt: string, item: Model, fields?: string[]) => void)
  {
    if(this.linkFn){
      this.unlink();
    }
    
    this.linkFn = fn;
    this.linkTarget = target;
    target
      .on('added:', (item)=>{
        fn('added:', item);
      })
      .on('removed:', (item)=>{
        fn('removed:', item);
      })
      .on('updated:', (item, fields)=>{
        fn('added:', item, fields);
      });
    target['each']((item)=>{
      fn('added:', item);
    });
  }
  
  unlink()
  {
    var fn = this.linkFn;
    if(fn){
      this.linkTarget.off('added:', fn).off('removed:', fn).off('updated:', fn);
      this.linkFn = null;
    }
  }
  
  private addPersistedItem(item: Model): Promise
  {
    var promise = new Promise();
    var keyPath = this.getKeyPath();
    var itemKeyPath = _.initial(item.getKeyPath());
    
    this.storageQueue.add(keyPath, itemKeyPath, [item.id()], (err)=>{
      promise.resolveOrReject(err);
    });
    return promise;
  }

  private addItem(item: Model, opts): Promise
  {
    if(this.findById(item.id())) return new Promise().resolve();
    
    if(this.sortByFn){
      this.sortedAdd(item);
    }else {
      this.items.push(item);
    }

    this.initItems(item);
    
    this.set('count', this.items.length);
    this.emit('added:', item);
    
    if(!opts || (opts.nosync !== true)){
      if(item.isPersisted()){
        return this.addPersistedItem(item);
      }else{
        return item.save().then(()=>{
          return this.addPersistedItem(item);
        });
      }
    }
    return new Promise(true);
  }
  
  // This function feel a bit hacky
  private sortedAdd(item: Model): number
  {    
    (this.sortOrder == 'desc') && this.items.reverse();
    var i = this['sortedIndex'](item, this.sortByFn);
    this.items.splice(i, 0, item);
    (this.sortOrder == 'desc') && this.items.reverse();
    return i;
  }
    
  public startSync()
  {
    super.startSync();
    
    this.on('add:', (itemsKeyPath, itemIds) => {
      Promise.map(itemIds, (itemId: string)=>{
        if(!this.findById(itemId)){
          return this.model.findById(itemsKeyPath.concat(itemId), true, {}).then((item)=>{
            return this.addItem(item, {nosync: true});
          });
        }
        return new Promise(true);
      });
    });

    this.on('remove:', (itemsKeyPath, itemId) => {
      this.remove(itemId, true);
    });
  }
  
  public resync(items: any[]): Promise
  {
    var promise = new Promise();
    this.resyncMutex.enter((done)=>{
      var 
        itemsToRemove = [],
        itemsToAdd = [];
      
      this['each'](function(item){
        var id = item.id(), shouldRemove = true;
        for(var i=0; i<items.length; i++){
          if(id == items[i]._id){
            item.set(items[i], {nosync: true});
            shouldRemove = false;
            break;
          }
        }
        shouldRemove && itemsToRemove.push(id);
      });
    
      _.each(items, (item) => {
        if(!this.findById(item._id)) itemsToAdd.push(item);
      })
    
      this.remove(itemsToRemove, {nosync: true}).then(() => {
        Promise.map(_.unique(itemsToAdd), (args) => {
          return (<any>this.model).create(args);
        }).then((models)=>{
          this.add(models, {nosync: true}).then(()=> {
            this.emit('resynced:');
            done();
            promise.resolve();
          });
        });
      });
    });
    return promise;
  }
}

//
// Underscore methods that we want to implement on the Collection.
//
var methods = 
  ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find', 'detect', 'pluck',
    'filter', 'select', 'reject', 'every', 'all', 'some', 'any', 'include',
    'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex', 'toArray', 'size',
    'first', 'rest', 'last', 'without', 'indexOf', 'lastIndexOf', 'isEmpty', 'groupBy']

// Mix in each Underscore method as a proxy to `Collection#items`.
_.each(methods, function(method) {
  Collection.prototype[method] = function() {
    return _[method].apply(_, [this.items].concat(_.toArray(arguments)))
  }
});

}
