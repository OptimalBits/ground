/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Sequence Class
  
  This class represents a ordered collection of models.
  The sequence supports persistent storage, offline and
  automatic client<->server synchronization.
  
  Events:

*/

/// <reference path="using.ts" />

/// <reference path="base.ts" />
/// <reference path="model.ts" />
/// <reference path="overload.ts" />
/// <reference path="container.ts" />

module Gnd {

export interface ISeqModel {
  model: Model;
  id: string;
};

export class Sequence extends Container
{ 
  private updateFn: (args: any) => void;
  private deleteFn: (kp: string[]) => void;
    
  constructor(model: IModel, seqName: string, parent?: Model, items?: ISeqModel[])
  {
    super(model, seqName, parent, items);
    
    this.initItems(this.getItems());

    this.updateFn = (args)=>{
      this.emit('updated:', this, args);
    };

    this.deleteFn = (kp)=>{
      for(var i = this.items.length-1; i >= 0; i--){
        if(this.items[i].model.id() === _.last(kp)){
          this.remove(i, {}, Util.noop);
        }
      }
    };
  };

  static public create(model: IModel, seqName: string, parent: Model, items: IDoc[]): Sequence;
  static public create(model: IModel, seqName: string, parent: Model, items: IDoc[], cb: (err?: Error, sequence?: Sequence) => void);
  static public create(model?: IModel, seqName?: string, parent?: Model, docs?: IDoc[], cb?): any
  {
    return overload({
      'Function String Model Array': function(model, seqName, parent, models){
        var sequence = new Sequence(model, seqName, parent, models);
        Util.release(_.pluck(models, 'model'));
        if(parent && parent.isKeptSynced()){
          sequence.keepSynced()
        }
        sequence.count = models.length;
        return sequence;
      },
      'Function String Model Array Function': function(model, seqName, parent, items, cb){
        model.createSequenceModels(items, (err?: Error, models?: IDoc[])=>{
          if(err){
            cb(err)
          }else{
            cb(err, this.create(model, seqName, parent, models));
          }
        });
      },
    }).apply(this, arguments);
  }
  
  private deleteItem(id: string, opts, cb)
  {
    var idx = -1;
    _.each(this.items, (item, i)=>{
      if(item.id === id){
        idx = i;
      }
    });

    if(idx === -1) return cb(); //already deleted
    this.remove(idx, opts, cb);
  }

  private insertBefore(id: string, item: Model, opts?, cb?: (err)=>void): void
  {
    if(_.isFunction(opts)){
      cb = opts;
      opts = {};
    }
    cb = cb || Util.noop;

    this.insertItemBefore(id, item, null, opts, (err) => {
      !err && this._keepSynced && !item.isKeptSynced() && item.keepSynced();
      cb(null);
    });
  }
  
  private insertItemBefore(refId: string, item: Model, id: string, opts, cb)
  {
    var seqItem = {
      model: item,
      id: id,
      pending: !id
    };
    var done = (err, id?)=>{
      seqItem.id = id || seqItem.id;
      this.storageQueue.once('inserted:'+seqItem.id, (sid)=>{
        seqItem.id = sid;
        seqItem.pending = false;
      });
      cb(err);
    }

    var index = this.items.length;
    for(var i=0; i<this.items.length; i++){
      if(id && this.items[i].id === id){ //no dupicate CONTAINERS
        index = -1;
        break;
      }else if(this.items[i].id === refId){
        index = i;
      }
    };
    if(index === -1) return cb(Error('Tried to insert duplicate container'));
    this.items.splice(index, 0, seqItem);

    this.initItems(seqItem.model);
    
    this.set('count', this.items.length);
    this.emit('inserted:', item, index);
    
    if(!opts || (opts.nosync !== true)){
      if(item.isPersisted()){
        this.insertPersistedItemBefore(refId, item, done);
      }else{
        item.save((err?) => {
          if(err) return cb(err);
          this.insertPersistedItemBefore(refId, item, done);
        });
      }
    }else{
      cb();
    }
  }

  private insertPersistedItemBefore(id: string, item: Model, cb:(err: Error, id?: string) => void): void
  {
    var keyPath = this.getKeyPath();
    var itemKeyPath = item.getKeyPath();
    this.storageQueue.insertBefore(keyPath, id, itemKeyPath, {}, cb);
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
    cb = cb || Util.noop;
    opts = opts || {};

    var item = this.items[idx];

    if(!item) return cb(Error('index out of bounds'));
    this.items.splice(idx, 1);
    
    // Why can't we use deinitItems here?
    item.model.off('changed:', this.updateFn);
    item.model.off('deleted:', this.deleteFn);
    
    this.set('count', this.items.length);
    this.emit('removed:', item.model, idx);
    item.model.release();
    
    if(!opts || !opts.nosync){
      this.storageQueue.deleteItem(this.getKeyPath(), item.id, opts, cb);
    }else{
      cb();
    }
  }
  
  public getItems(): Model[]
  {
    return _.pluck(this.items, 'model');
  }
  
  private startSync()
  {
    super.startSync();
    
    this.on('insertBefore:', (id, itemKeyPath, refId)=>{
      this.model.findById(itemKeyPath, true, {}, (err: Error, item?: Model): void => {
        if(item){
          this.insertItemBefore(refId, item, id, {nosync: true}, (err) => {
            !err && this._keepSynced && !item.isKeptSynced() && item.keepSynced();
          });
        }
      });
    });

    this.on('deleteItem:', (id) => {
      this.deleteItem(id, {nosync: true}, Util.noop);
    });
  }
  
  private resync(newItems: any[]){
    var oldItems = this.items;
    var newIds = _.pluck(newItems, 'id').sort();
    var remainingItems = [];
    Util.asyncForEach(oldItems, (item, done)=>{
      if(!item.pending && -1 === _.indexOf(newIds, item.id, true)){
        this.deleteItem(item.id, {nosync: true}, (err)=>{
          done(err);
        });
      }else{
        remainingItems.push(item);
        done();
      }
    }, (err) => {
      var itemsToInsert = [];
      var i=0;
      var j=0;
      var oldItem, newItem;
      while(i<remainingItems.length){
        oldItem = remainingItems[i];
        if(!oldItem.pending){
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
        (<any>this.model).create(item.newItem, (err, instance?: Model)=>{
          if(instance){
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
  }
}

//
// Underscore methods that we want to implement on the Sequence
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
