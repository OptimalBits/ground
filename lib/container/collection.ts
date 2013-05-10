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
/// <reference path="container.ts" />
/// <reference path="../base.ts" />
/// <reference path="../model.ts" />
/// <reference path="../overload.ts" />
/// <reference path="../mutex.ts" />

module Gnd {
  
  /**
    Collection.find()
    Animal.find(zoo, 'birds', {type: 'bird'})
  */

export class Collection extends Container
{
  // Even handlers
  public updateFn: (model: Model, args) => void;
  public deleteFn: (model: Model) => void;
  
  // Mutex
  private resyncMutex: Mutex = new Mutex();
  
  // Links
  private linkAddFn: (item: Model) => void;
  private linkRemoveFn: (item: Model) => void;
  private linkUpdateFn: (item: Model, fields?: string[]) => void;
  private linkTarget: Collection;
  
  public sortByFn: () => number; //public sortByFn: string;
  public sortOrder: string = 'asc';
  
  constructor(model: IModel, collectionName?: string, parent?: Model, items?: Model[])
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
    
    this.deleteFn = (model)=>{
      this.remove(model.id(), false);
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
    
    var keyPath = this.getKeyPath();
    if(keyPath && !this.opts.nosync){
      this.retain();
      using.storageQueue.find(keyPath, {}, {}).then((result) => {
        this.resync(result[0]);
        result[1]
          .then((items) => this.resync(items))
          .fail(() => this.resolve(this))
          .then(() => this.resolve(this))
          .then(() => this.release());
      });
    }else{
      this.resolve(this);
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

    return Promise.map(itemIds, (itemId) => {
      var item = this.findById(itemId);
  
      if(item){
        items.splice(_.indexOf(items, item), 1);
        
        item.off('changed:', this.updateFn);
        item.off('deleted:', this.deleteFn);
        
        this.set('count', items.length);
        this.emit('removed:', item);
        
        opts = Util.extendClone(this.opts, opts);
        
        if((!opts || !opts.nosync) && keyPath){
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
    if(this.linkTarget){
      this.unlink();
    }
    
    this.linkAddFn = (item: Model)=>{
      fn('added:', item);
    };
    this.linkRemoveFn = (item)=>{
      fn('removed:', item);
    };
    this.linkUpdateFn = (item, fields?)=>{
      fn('updated:', item, fields);
    }
    
    // TODO: Add a proxy in EventEmitter class.
    this.linkTarget = target;
    
    target
      .on('added:', this.linkAddFn)
      .on('removed:', this.linkRemoveFn)
      .on('updated:', this.linkUpdateFn);

    target['each'](this.linkAddFn);
  }
  
  unlink()
  {
    if(this.linkTarget){
      this.linkTarget.off('added:', this.linkAddFn);
      this.linkTarget.off('removed:', this.linkRemoveFn);
      this.linkTarget.off('updated:', this.linkUpdateFn);
    }
    
    this.linkAddFn = this.linkRemoveFn = this.linkUpdateFn = null;
  }
  
  private addPersistedItem(item: Model): Promise
  {
    var keyPath = this.getKeyPath();
    if(keyPath){
      var itemKeyPath = _.initial(item.getKeyPath());
    
      return this.storageQueue.add(keyPath, itemKeyPath, [item.id()])
    }else{
      return Promise.resolved();
    }
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
    
    opts = Util.extendClone(this.opts, opts);
    
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
            promise.resolve();
            done();
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
