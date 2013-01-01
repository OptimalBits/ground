/**
  Ground Web Framework (c) 2011-2012 Optimal Bits Sweden AB
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

module Gnd {

export class Collection extends Base implements Sync.ISynchronizable
{
  public items: Model[];
  
  private _keepSynced: bool = false;
  private _added: Model[] = [];
  private _removed: Model[] = [];
  private _formatters: any[];
  
  private updateFn: (model: Model, args) => void;
  private deleteFn: (model: Model) => void;
  
  public model: IModel;
  public parent: Model;
  public sortByFn: () => number; //public sortByFn: string;
  public sortOrder: string = 'asc';
  public filterFn: (item: Model) => bool = null;
  
  // Prototypes for underscore imported methods.
  public filter: (iterator: (item: any)=>bool) => Model[];
  
  constructor(model: IModel, parent: Model, items?: Model[])
  {
    super();
    
    var self = this;
    this.updateFn = function(args){
      if(self.sortByFn){
        var index = self['indexOf'](this);
        self.items.splice(index, 1);
        self.sortedAdd(this);
      }
      self.emit('updated:', this, args);
    };
  
    this.deleteFn = (itemId) => {
      this.remove(itemId, false, Util.noop);
    };
  
    this.items = items || [];
    this.initItems(this.items);

    this.model = model;
    this.parent = parent;
    
    this.on('sortByFn sortOrder', (fn) => {
      var oldItems = this.items;
      if(this.sortByFn){
        this.items = this['sortBy'](this.sortByFn)
      }
      (this.sortOrder == 'desc') && this.items.reverse();
      this.emit('sorted:', this.items, oldItems);
    });
  }
  
  destroy(){
    this._keepSynced && this.endSync();
    this.deinitItems(this.items);
    this.items = null;
    super.destroy();
  }
  
  static public create(model: IModel, parent: Model, docs: {}[], cb)
  {
    var _items = [];
    
    function createModels(docs, done){
      Util.asyncForEach(docs, function(args, fn){
        model.create(args, false, function(err, instance?: Model){
          if(instance){
            _items.push(instance);
          }
          fn(err);
        });
      }, done);
    }
    
    function createCollection(model, parent, items){
      var collection = new Collection(model, parent, items);
      Util.release(items);
        
      if(parent && parent.isKeptSynced()){
        collection.keepSynced()
      }
      return collection;
    }
    
    overload({
      'Function Model Array Function': function(model, parent, items, cb){
        createModels(items, (err) => {
          if(err){
            cb(err, null)
          }else{
            cb(err, createCollection(model, parent, _items));
          }
        });
      },
      'Function Array Function': function(model, items, cb){
        createModels(items, (err) => {
          if(err){
            cb(err, null)
          }else{
            cb(err, createCollection(model, undefined, _items));
          }
        })
      },
      'Function Model Function': function(model, parent, cb){
        this.create(model, parent, [], cb);
      }
    }).apply(this, arguments);
  }
  
  static private getItemIds(items: Model[])
  {
    return _.map(items, function(item){return item.id()});
  }
  
  findById(id)
  {
    return this['find']((item) => {
      return item.id() == id
    });
  }
  
  save(cb?: (err: Error) => void): void
  {
    var keyPath = [this.parent.bucket(), this.parent.id(), this.model.__bucket];
    var itemsKeyPath = [];
    
    if(this._removed.length){
      itemsKeyPath = _.initial(this._removed[0].getKeyPath());
    }else if(this._added.length){
      itemsKeyPath = _.initial(this._added[0].getKeyPath());
    }
    
    var itemIds = Collection.getItemIds(this._removed);
    Model.storageQueue.removeCmd(keyPath, itemsKeyPath, itemIds, (err?: Error) => {
      if(!err){
        this._removed = []
        Util.asyncForEach(this.items, (item, cb) => {
          item.save(cb);
        }, (err) => {
          if((!err)&&(this._added.length > 0)){
            itemIds = Collection.getItemIds(this._added);
            
            Model.storageQueue.addCmd(keyPath, itemsKeyPath, itemIds, (err?: Error) => {
              if(!err){
                this._added = [];
              }
              cb(err);
            });
          }else{
            cb(err);
          }
        });
      }else{
        cb(err);
      }
    })
  }
  
  add(items: Model[], opts, cb: (err)=>void): void
  {
    if(_.isFunction(opts)){
      cb = opts;
      opts = {};
    }
    Util.asyncForEach(items, (item, done) => {
      this.addItem(item, opts, (err) => {
        !err && this._keepSynced && !item._keepSynced && item.keepSynced();
        done(err);
      });
    }, cb);
  }
  
  getKeyPath(): string[]
  {
    return [this.parent.bucket(), this.parent.id(), this.model.__bucket];
  }

  remove(itemIds, opts, cb){
    var 
      item, 
      items, 
      len, 
      keyPath = this.getKeyPath();
    
    if(_.isFunction(opts)){
      cb = opts;
      opts = {};
    }
    
    //items = _.isArray(itemIds) && itemIds.length > 1 ? _.clone(items) : items; 
    items = this.items;
    
    Util.asyncForEach(itemIds, (itemId, done) => {
      var index, item, len = items.length;
      for(index=0; index<len; index++){
        if(items[index].id() == itemId){
          item = items[index];
          break;
        }
      }
  
      if(item){
        items.splice(index, 1);
        
        item.off('changed:', this.updateFn);
        item.off('deleted:', this.deleteFn);
        
        if(this._keepSynced && (!opts || !opts.nosync)){
          var itemKeyPath = _.initial(item.getKeyPath());
          Model.storageQueue.removeCmd(keyPath, itemKeyPath, [item.id()], done);
        }else{
          this._removed.push(itemId);
          done();
        }
        this.emit('removed:', item, index);
        item.release();
      }else{
        done();
      }
    }, cb);
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
  
  toggleSortOrder(){
    this['set']('sortOrder', this.sortOrder == 'asc' ? 'desc' : 'asc');
  }
  
  setFormatters(formatters){
    this._formatters = formatters;
    this['each'](function(item){
      item.format(formatters);
    });
  }
  
  filtered(result: (err: Error, models?: Model[])=>void)
  {
    if(this.filterFn){
      result(null, this.filter(this.filterFn));
    }else{
      result(null, this.items);
    }
  }
  
  isFiltered(item: Model): bool
  {
    return this.filterFn ? this.filterFn(item) : true;
  } 
  
  /*
  filtered(optionalItem){
    var items = this.items;
    if(this.filterFn && this.filterData){
      var data = this.filterData || '';
      
      if(optionalItem){
        return this.filterFn(optionalItem, data, this.filterFields);
      }else{
        var filtered = [], item;
        for(var i=0, len=items.length;i<len;i++){
          item = items[i];
          if(this.filterFn(items[i], data, this.filterFields || _.keys(item))){
            filtered.push(items[i]);
          }
        }
        return filtered;
      }
    }else{
      return optionalItem || items;
    }
  }
  */
  
  // DEPRECATED.
  reverse()
  {
    this.items.reverse();
    return this;
  }
  
  private persistAddItem(item: Model, cb:(err?: Error) => void): void
  {
    var keyPath = this.getKeyPath();
    var itemKeyPath = _.initial(item.getKeyPath());
    
    Model.storageQueue.addCmd(keyPath, itemKeyPath, [item.id()], cb);
  }

  private addItem(item, opts, cb)
  {
    if(this.findById(item.id())) return cb();
    
    if(this.sortByFn){
      this.sortedAdd(item);
    }else {
      this.items.push(item);
    }

    this.initItems(item);
    
    this.emit('added:', item);
    
    if(this.isKeptSynced()){
      if(!opts || (opts.nosync !== true)){
        if(item.isPersisted()){
          this.persistAddItem(item, cb);
        }else{
          item.save((err) => {
            if(!err){
              this.persistAddItem(item, cb);
            }else{
              cb();
            }
          });
        }
      }else{
        cb();
      }
    }else{
      this._added.push(item);
      cb();
    }
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
    
  private startSync()
  {
    this._keepSynced = true;
    
    Model.syncManager && Model.syncManager.startSync(this);
    
    this.on('add:', (itemsKeyPath, itemIds) => {
      Util.asyncForEach(itemIds, (itemId: string, done) => {
        if(!this.findById(itemId)){
          Model.findById([itemsKeyPath, itemId], true, {}, (err: Error, item?: Model): void => {
            if(item){
              this.addItem(item, {nosync: true}, done);
            }
          });
        }
      }, Util.noop);
    });
      
    this.on('remove:', (itemsKeyPath, itemId) => {
      this.remove(itemId, true, Util.noop);
    });
    
    if(Model.storageQueue){
      Model.storageQueue.on('resync:'+this.getKeyPath().join(':'), (items) => {
        // We have to remove old items, and add new.
      })
    }
  }
  
  private endSync()
  {
    Model.syncManager && Model.syncManager.endSync(this);
    this._keepSynced = false;
  }
  
  private initItems(items)
  {  
    items = _.isArray(items)? items:[items];
    for (var i=0,len=items.length; i<len;i++){
      var item = items[i];
      item.retain();
      item.on('changed:', this.updateFn);
      item.on('deleted:', this.deleteFn);
    }
  }
  
  private deinitItems(items)
  {
    for (var i=0,len=items.length; i<len;i++){
      var item = items[i];
      item.off('changed:', this.updateFn);
      item.off('deleted:', this.deleteFn);
      item.release();
    }
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