/**
  Ground Web Framework (c) 2011-2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Sequence Class
  
  This class represents a ordered collection of models.
  The sequence supports persistent storage, offline and
  automatic client<->server synchronization.
  
  Events:
  
*/
/// <reference path="base.ts" />
/// <reference path="model.ts" />
/// <reference path="overload.ts" />

module Gnd {

export interface ISeqModel {
  model: Model;
  id: string;
};

export class Sequence extends Base implements Sync.ISynchronizable
{
  private items: ISeqModel[];
  
  private _keepSynced: bool = false;
  // private _added: Model[] = [];
  private _insertedBefore: ISeqModel[] = [];
  private _removed: ISeqModel[] = [];
  
  private updateFn: (model: Model, args) => void;
  private deleteFn: (id: string) => void;
  private resyncFn: (items: any[]) => void;
  
  public model: IModel;
  public parent: Model;
  public sortByFn: () => number; //public sortByFn: string;
  public sortOrder: string = 'asc';
  public filterFn: (item: Model) => bool = null;
  public count: number = 0;
  
  // Prototypes for underscore imported methods.
  public filter: (iterator: (item: any)=>bool) => Model[];
  
  constructor(model: IModel, parent?: Model, items?: Model[])
  {
    super();
    
    var self = this;
    this.updateFn = function(args){
      self.emit('updated:', this, args);
      console.log('seq update');
      console.log(args);
    };
  
    this.deleteFn = (id) => {
      console.log('seq delete');
      console.log(id);
      for(var i = this.items.length-1; i >= 0; i--){
        if(this.items[i].model.id() === id){
          this.remove(i, Util.noop);
        }
      }
    };
  
    this.items = items || [];
    this.initItems(this.items);

    this.model = model;
    this.parent = parent;
    
    if(parent){
      if(parent.isPersisted()){
        this.listenToResync();
      }else{
        parent.once('id', ()=> {
          this.listenToResync()
        });
      }
    }else{
      this.listenToResync();
    }
  }
  
  destroy(){
    this._keepSynced && this.endSync();
    this.deinitItems(this.items);
    this.items = null;
    super.destroy();
  }
  
  static public create(model: IModel, parent: Model, items: IDoc[]): Sequence;
  static public create(model: IModel, parent: Model, items: IDoc[], cb: (err?: Error, sequence?: Sequence) => void);
  static public create(model: IModel, items: IDoc[], cb: (err?: Error, sequence?: Sequence) => void);

  static public create(model?: IModel, parent?: Model, docs?: IDoc[], cb?): any
  {
    return overload({
      'Function Model Array': function(model, parent, models){
        var sequence = new Sequence(model, parent, models);
        Util.release(_.pluck(models, 'model'));
        if(parent && parent.isKeptSynced()){
          sequence.keepSynced()
        }
        sequence.count = models.length;
        return sequence;
      },
      'Function Model Array Function': function(model, parent, items, cb){
        model.createSequenceModels(items, (err?: Error, models?: IDoc[])=>{
          if(err){
            cb(err)
          }else{
            cb(err, this.create(model, parent, models));
          }
        });
      },
      'Function Array Function': function(model, items, cb){
        this.create(model, undefined, items, cb);
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
  
  
  save(cb: (err?: Error) => void): void
  {
    var keyPath = this.getKeyPath();
    var itemsKeyPath = [];
    
    //TODO: keep track of insert- and remove operations an replay them on save
  }

  push(item: Model, opts?, cb?: (err)=>void): void
  {
    this.insertBefore(null, item, opts, cb);
  }

  unshift(item: Model, opts?, cb?: (err)=>void): void
  {
    var firstId = this.items.length>0 ? _.first(this.items).id : null;
    this.insertBefore(firstId, item, opts, cb);
  }

  insert(idx: number, item: Model, opts?, cb?: (err)=>void): void
  {
    var seqItem = this.items[idx];
    var id = seqItem ? seqItem.id : null;
    this.insertBefore(id, item, opts, cb);
  }

  remove(idx: number, opts?, cb?: (err?)=>void): void
  {
    if(_.isFunction(opts)){
      cb = opts;
      opts = {};
    }
    var item = this.items[idx];

    if(!item) return cb(Error('index out of bounds'));
    this.items.splice(idx, 1);
    
    item.model.off('changed:', this.updateFn);
    item.model.off('deleted:', this.deleteFn);
    
    this.set('count', this.items.length);
    this.emit('removed:', item.model, idx);
    item.model.release();
    
    if(this.isKeptSynced() && (!opts || !opts.nosync)){
      Model.storageQueue.deleteItem(this.getKeyPath(), item.id, opts, cb);
    }else{
      this._removed.push(item);
      cb();
    }
  }

  private insertItemBefore(id: string, item: Model, opts, cb)
  {
    var seqItem = {
      model: item,
      id: 'pending'
    };
    function done(err, id?){
      seqItem.id = id || seqItem.id;
      console.log('done');
      cb(err);
    }

    var index = this.items.length;
    _.each(this.items, (item, i)=>{
      if(item.id === id) index = i;
    });
    this.items.splice(index, 0, seqItem);

    this.initItems([seqItem]);
    
    this.set('count', this.items.length);
    this.emit('insertedBefore:', item); //TODO: we probably need more args
    
    if(this.isKeptSynced()){
      if(!opts || (opts.nosync !== true)){
        if(item.isPersisted()){
          this.insertPersistedItemBefore(id, item, done);
        }else{
          item.save((err) => {
            if(err) return cb(err);
            this.insertPersistedItemBefore(id, item, done);
          });
        }
      }else{
        cb();
      }
    }else{
      this._insertedBefore.push(seqItem); //TODO: We probably need more items
      cb();
    }
  }

  private insertBefore(id: string, item: Model, opts?, cb?: (err)=>void): void
  {
    if(_.isFunction(opts)){
      cb = opts;
      opts = {};
    }
    cb = cb || Util.noop;

    this.insertItemBefore(id, item, opts, (err) => {
      !err && this._keepSynced && !item.isKeptSynced() && item.keepSynced();
      cb(null);
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
  
    _.map(this.items,(item) => {
      item.model.keepSynced();
    });
  }
  
  isKeptSynced(): bool
  {
    return this._keepSynced;
  }
  
  private insertPersistedItemBefore(id: string, item: Model, cb:(err: Error, id?: string) => void): void
  {
    var keyPath = this.getKeyPath();
    var itemKeyPath = item.getKeyPath();
    Model.storageQueue.insertBefore(keyPath, id, itemKeyPath, {}, cb);
  }

  private startSync()
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
    

    this.on('remove:', (itemsKeyPath, itemId) => {
        //TODO: fix
        throw Error('no implementation yet');
      // this.remove(itemId, true, Util.noop);
    });

  }
  
  private resync(newItems: any[]){
    console.log('resync seq');
    console.log(newItems);
    console.log(this.items);
    var oldItems = this.items;
    var newIds = _.pluck(newItems, 'id').sort();
    var remainingItems = [];
    Util.asyncForEach(oldItems, function(item, done){
      if(item.id !== 'pending' && -1 === _.indexOf(newIds, item.id, true)){
      //TODO: delete
          console.log('deleted');
          done();
      }else{
        remainingItems.push(item);
        done();
      }
    }, function(err){
      // insert new items
    console.log('remaining');
    console.log(remainingItems);

      var itemsToInsert = [];
      var i=0;
      var j=0;
      var oldItem, newItem;
      while(i<remainingItems.length){
        oldItem = remainingItems[i];
        if(oldItem.id !== 'pending'){
          newItem = newItems[j];
          if(newItem.id === oldItem.id){
            i++;
          }else{
            itemsToInsert.push({
              id: oldItem.id,
              newItem: newItem.doc
            });
          }
          j++;
        }else{
          i++;
        }
      }
      while(j<newItems.length){
        newItem = newItems[j];
        itemsToInsert.push({
          id: null,
          newItem: newItem.doc
        });
        j++;
      }

      Util.asyncForEach(itemsToInsert, (item, done)=>{
        console.log('insertBefore');
        (<any>this.model).create(item.newItem, (err, instance?: Model)=>{
          if(instance){
            console.log('created model');
            this.insertBefore(item.id, instance, {nosync: true}, (err)=>{
              done(err);
            });
          }else{
            done(err);
          }
        });
      }, (err)=>{
        this.emit('resynced:');
      });
    });
  // });
    
  }
  
  private listenToResync(){
    var key = Storage.Queue.makeKey(this.getKeyPath());
    this.resyncFn = (items) => {
      this.resync(items);
    }
    Model.storageQueue &&
    Model.storageQueue.on('resync:'+key, this.resyncFn);
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
      item.model.retain();
      item.model.on('changed:', this.updateFn);
      item.model.on('deleted:', this.deleteFn);
    }
  }
  
  private deinitItems(items)
  {
    var key = Storage.Queue.makeKey(this.getKeyPath());
    Model.storageQueue &&
    Model.storageQueue.off('resync:'+key, this.resyncFn);
    for (var i=0,len=items.length; i<len;i++){
      var item = items[i];
      item.model.off('changed:', this.updateFn);
      //TODO: nodelete
      item.model.off('deleted:', this.deleteFn);
      item.model.release();
    }
  }
}

//
// Underscore methods that we want to implement on the Collection.
//
var methods = 
  ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find', 'detect', 'pluck',
    'filter', 'select', 'reject', 'every', 'all', 'some', 'any', 'include',
    'contains', 'invoke', 'max', 'min', 'toArray', 'size',
    'first', 'rest', 'last', 'without', 'indexOf', 'lastIndexOf', 'isEmpty']

// Mix in each Underscore method as a proxy to `Sequence#items`.
// The pluck is a candidate for optimization
_.each(methods, function(method) {
  Sequence.prototype[method] = function() {
    return _[method].apply(_, [_.pluck(this.items, 'model')].concat(_.toArray(arguments)))
  }
});

}
