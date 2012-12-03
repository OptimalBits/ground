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
/// <reference path="../third/underscore.browser.d.ts" />

import Base = module('./base');
import Model = module('./model');
import Util = module('./util');
import Storage = module('./storage');
import Overload = module('./overload');
import Sync = module('./sync/sync');

export class Collection extends Base.Base implements Sync.ISynchronizable
{
  public items: Model.Model[];
  
  private _keepSynced: bool = false;
  private _added: Model.Model [];
  private _removed: Model.Model [];
  private _formatters: any[];
  
  private updateFn: (model: Model.Model, args) => void;
  private deleteFn: (model: Model.Model) => void;
  
  public model: Model.IModel;
  public parent: Model.Model;
  public sortByFn;
  public sortOrder: string = 'asc';
  public filterFn: (obj: {}, search: string, fields: string []) => bool = Util.searchFilter;
  public filterFields: string[];
  public filterData: string;
  
  constructor(model: Model.IModel, parent: Model.Model, items?: Model.Model[])
  {
    super();
    
    this.updateFn = (model: Model.Model, args) => {
      if(this.sortByFn){
        var index = this['indexOf'](model);
        this.items.splice(index, 1);
        this.sortedAdd(model);
      }
      // Do we need to do this or the model class takes care of it?
      this.emit('updated:', model, args);
    };
  
    this.deleteFn = (itemId) => {
      this.remove(itemId, false, Util.noop);
    };
  
    this.items = items || [];
    this.items && this.initItems(items);

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
    Util.release(this.items);
    this.items = null;
    super.destroy();
  }
  
  static public create(model: Model.IModel, parent: Model.Model, docs: {}[], cb)
  {
    var items = [];
    
    function createModels(docs, done){
      Util.asyncForEach(docs, function(args, fn){
        model.create(args, false, function(err, instance?: Model.Model){
          if(instance){
            items.push(instance);
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
    
    Overload.overload({
      'Function Model Array Function': function(model, parent, items, cb){
        createModels(items, (err) => {
          if(err){
            cb(err, null)
          }else{
            cb(err, createCollection(model, parent, items));
          }
        });
      },
      'Function Array Function': function(model, items, cb){
        createModels(items, (err) => {
          if(err){
            cb(err, null)
          }else{
            cb(err, createCollection(model, undefined, items));
          }
        })
      },
      'Function Model Function': function(model, parent, cb){
        this.create(model, parent, [], cb);
      }
    }).apply(this, arguments);
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
    Model.Model.storageQueue.removeCmd(keyPath, keyPath, this._removed, (err?: Error) => {
      if(!err){
        this._removed = []
        Util.asyncForEach(this.items, function(item, cb){
          item.save(cb);
        }, (err) => {
          if((!err)&&(this._added.length > 0)){
            var items = _.filter(this._added, function(item){
              if(item.isPersisted()){
                return item; // THIS MUST BE WRONG
              }else{
                return item.id();
              }
            });
            
            Model.Model.storageQueue.addCmd(keyPath, keyPath, this._added, (err?: Error) => {
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
  
  add(items: Model.Model [], opts, cb)
  {
    Util.asyncForEach(items, (item, done) => {
      this.addItem(item, function(err){
        !err && this._keepSynced && !item._keepSynced && item.keepSynced();
        done(err);
      }, opts);
    }, cb);
  }

  private addItem(item, opts, cb){
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
        var storageAdd = (doc) => {
          var keyPath = this.getKeyPath();
          Model.Model.storageQueue.addCmd(keyPath, keyPath, [item.id()], cb);
        }

        if(item.isPersisted()){
          storageAdd(item.id());
        }else{
          // This is wrong, how do we add non persisted items to a collection?
          item.save(function(err){
            if(!err){
              storageAdd(item.id());
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
  private sortedAdd(item: Model.Model): number
  {    
    (this.sortOrder == 'desc') && this.items.reverse();
    var i = this['sortedIndex'](item, this.sortByFn);
    this.items.splice(i, 0, item);
    (this.sortOrder == 'desc') && this.items.reverse();
    return i;
  }
  
  public getKeyPath(): string[]
  {
    return [this.parent.bucket(), this.parent.id(), this.model.__bucket];
  }

  public remove(itemIds, nosync, cb){
      var 
        item, 
        items = this.items, 
        index, 
        len;
  
    var keyPath = this.getKeyPath();
    
    items = _.isArray(itemIds) && itemIds.length > 1 ? _.clone(items) : items; 
    len = items.length;
      
    Util.asyncForEach(itemIds, function(itemId, done){
      item = 0;
      for(index=0; index<len; index++){
        if(items[index].id() == itemId){
          item = items[index];
          break;
        }
      }
  
      if(item){
        item.off('changed:', this.updateFn);
        item.off('deleted:', this.deleteFn);
        
        this.items.splice(index, 1);
        
        if(item.isPersisted()){
          if(this._keepSynced && nosync !== true){
            Model.Model.storageQueue.removeCmd(keyPath, keyPath, [item.id()], done);
          }else{
            this._removed.push(itemId);
            done();
          }
        }else{
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
  
  private startSync()
  {
    this._keepSynced = true;
    
    Model.Model.syncManager && Model.Model.syncManager.startSync(this);
    
    this.on('add:', (items) => {
      Util.asyncForEach(items, (args: {}, done) => {
        if(!this.findById(args['_id'])){
          this.model.create(args, true, (err: Error, item?: Model.Model): void => {
            this.addItem(item, {nosync: true}, done);
          });
        }
      }, Util.noop);
    });
      
    this.on('add:', (itemId) => {
      this.remove(itemId, true, Util.noop);
    });
    
  }
  
  private endSync()
  {
    Model.Model.syncManager && Model.Model.syncManager.endSync(this);
    this._keepSynced = false;
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
  
  reverse()
  {
    this.items.reverse();
    return this;
  }
  
  private initItems(items)
  {
    var self = this;
  
    items = _.isArray(items)? items:[items];
    for (var i=0,len=items.length; i<len;i++){
      var item = items[i];
      item.retain();
      item.on('changed:', this.updateFn);
      item.on('deleted:', this.deleteFn);
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
