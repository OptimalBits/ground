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
  private updateFn: (model: Model, args) => void;
  private deleteFn: (model: Model) => void;
  
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
      this.remove(itemId, false, Util.noop);
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

  init(docs: {}[])
  {
    var promise = new Promise();
    this.resync(docs, ()=>{
      promise.resolve(this);
    });
    return promise;
  }
  
  static public create(model: IModel, 
                       collectionName: string, 
                       parent: Model, 
                       docs: {}[]): Promise
  {
    var collection = new Collection(model, collectionName, parent);
    return collection.init(docs);
  }
  
  findById(id)
  {
    return this['find']((item) => {
      return item.id() == id
    });
  }
  
  add(items: Model[], opts?, cb?: (err)=>void): void
  {
    if(_.isFunction(opts)){
      cb = opts;
      opts = {};
    }
    Util.asyncForEach(items, (item, done) => {
      this.addItem(item, opts, (err) => {
        !err && this._keepSynced && !item.keepSynced && item.keepSynced();
        done(err);
      });
    }, cb || Util.noop);
  }

  remove(itemIds, opts, cb){
    var 
      items = this.items,
      keyPath = this.getKeyPath();
    
    if(_.isFunction(opts)){
      cb = opts;
      opts = {};
    }
    
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
        
        this.set('count', items.length);
        this.emit('removed:', item, index);
        
        if(!opts || !opts.nosync){
          var itemKeyPath = _.initial(item.getKeyPath());
          this.storageQueue.remove(keyPath, itemKeyPath, [item.id(), item.cid()], done);
          return;
        }
        
        item.release();
      }
      done();
    }, cb);
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
  
  private addPersistedItem(item: Model, cb:(err?: Error) => void): void
  {
    var keyPath = this.getKeyPath();
    var itemKeyPath = _.initial(item.getKeyPath());
    
    this.storageQueue.add(keyPath, itemKeyPath, [item.id()], cb);
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
    
    this.set('count', this.items.length);
    this.emit('added:', item);
    
    if(!opts || (opts.nosync !== true)){
      if(item.isPersisted()){
        this.addPersistedItem(item, cb);
      }else{
        item.save((err) => {
          if(!err){
            this.addPersistedItem(item, Util.noop);
          }
          cb(err);
        });
      }
    }else{
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
    super.startSync();
    
    this.on('add:', (itemsKeyPath, itemIds) => {
      Util.asyncForEach(itemIds, (itemId: string, done) => {
        if(!this.findById(itemId)){
          this.model.findById(itemsKeyPath.concat(itemId), true, {}, (err: Error, item?: Model): void => {
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
  }
  
  private createModels(docs, done){
    var models = [];
    
    Util.asyncForEach(docs, (args, fn) => {
      (<any>this.model).create(args, function(err, instance?: Model){
        instance && models.push(instance);
        fn(err);
      });
    }, (err) => {
      done(err, models);
    });
  }
  
  private resync(items: any[], finished?: ()=>void)
  {
    this.resyncMutex.enter((done)=>{
      var 
        itemsToRemove = [],
        itemsToAdd = []; //items.slice(0); // copy items array
      
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
    
      this.remove(itemsToRemove, {nosync: true}, (err) => {
        if(!err){
          //TODO: Is there a better way?
          this.createModels(_.unique(itemsToAdd), (err, models) => {
            if(!err){
              this.add(models, {nosync: true}, (err) => {
                this.emit('resynced:');
                done(); // Done with this mutex.
                finished && finished();
              });
            }
          });
        }
      });
    });
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
