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

/// <reference path="container.ts" />
/// <reference path="../using.ts" />
/// <reference path="../base.ts" />
/// <reference path="../model.ts" />
/// <reference path="../overload.ts" />
/// <reference path="../mutex.ts" />

module Gnd {

export interface ISeqModel {
  model: Model;
  id: string;
};

export class Sequence extends Container
{ 
  static mergeFns = {
    id: function(item){
      return item.id;
    },
    keyPath: function(item){
      return item.keyPath;
    },
    doc: function(item){
      return item.doc;
    },
    inSync: function(item){
      return item.insync;
    }
  };

  public updateFn: (args: any) => void;
  public deleteFn: (model: Model) => void;
    
  // Mutex
  private resyncMutex: Mutex = new Mutex();
  
  constructor(model: IModel, opts?: ContainerOptions, parent?: Model, items?: ISeqModel[])
  {
    super(model, opts, parent, items);
    
    this.initItems(this.getItems());

    this.updateFn = (args)=>{
      this.emit('updated:', this, args);
    };

    this.deleteFn = (model)=>{
      for(var i = this.items.length-1; i >= 0; i--){
        if(this.items[i].model.id() === model.id()){
          this.remove(i);
        }
      }
    };
    
    if(parent && parent.isKeptSynced()){
      this.keepSynced()
    }
    
    var keyPath = this.getKeyPath();
    if(keyPath && !this.opts.nosync){
      this.retain();
      using.storageQueue.all(keyPath, {}, {}).then((result) => {
        this.resync(result[0]);
        result[1].then((items) => this.resync(items))
          .then(() => this.resolve(this))
          .fail(() => this.resolve(this))
          .then(() => this.release());
      });
    }else{
      this.resolve(this);
    }
  }

  private deleteItem(id: string, opts): Promise
  {
    var idx = -1;
    _.each(this.items, (item, i?)=>{
      if(item.id === id){
        idx = i;
      }
    });

    if(idx === -1) return new Promise(this); //already deleted
    return this.remove(idx, opts);
  }

  private insertBefore(refId: string, item: Model, opts?): Promise
  {
    return this.insertItemBefore(refId, item, null, opts);
  }
  
  private insertItemBefore(refId: string, item: Model, id: string, opts): Promise
  {
    var promise = new Gnd.Promise();
    
    var seqItem = {
      model: item,
      id: id,
      insync: !!id
    };
    
    var done = (id)=>{
      seqItem.id = id || seqItem.id;
      this.storageQueue.once('inserted:'+seqItem.id, (sid)=>{
        seqItem.id = sid;
        seqItem.insync = true;
      });
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
    
    if(index === -1){
      return promise.reject(Error('Tried to insert duplicate container'));
    }
    
    this.items.splice(index, 0, seqItem);

    this.initItems(seqItem.model);
    
    this.set('count', this.items.length);
    this.emit('inserted:', item, index);
    
    opts = Util.extendClone(this.opts, opts);
    
    if(!opts || (opts.nosync !== true)){
      if(item.isPersisted()){
        this._keepSynced && item.keepSynced();
        return this.insertPersistedItemBefore(refId, item).then(done);
      }else{
        return item.save().then(()=>{
          this._keepSynced && item.keepSynced();
          return this.insertPersistedItemBefore(refId, item).then(done);
        });
      }
    }else{
      this._keepSynced && item.keepSynced();
      return promise.resolve();
    }
  }

  private insertPersistedItemBefore(id: string, item: Model): Promise // <string>
  {
    var keyPath = this.getKeyPath();
    var itemKeyPath = item.getKeyPath();
    return this.storageQueue.insertBefore(keyPath, id, itemKeyPath, {});
  }

  push(item: Model, opts?): Promise
  {
    return this.insertBefore(null, item, opts);
  }

  unshift(item: Model, opts?): Promise
  {
    var firstId = this.items.length > 0 ? _.first(this.items).id : null;
    return this.insertBefore(firstId, item, opts);
  }

  insert(idx: number, item: Model, opts?): Promise
  {
    var seqItem = this.items[idx];
    var id = seqItem ? seqItem.id : null;
    return this.insertBefore(id, item, opts);
  }

  remove(idx: number, opts?): Promise
  {
    var promise = new Promise();

    var item = this.items[idx];

    if(!item){
      return promise.reject(Error('index out of bounds'));
    } 
    this.items.splice(idx, 1);
    
    // Why can't we use deinitItems here?
    item.model.off('changed:', this.updateFn);
    item.model.off('deleted:', this.deleteFn);
    
    this.set('count', this.items.length);
    this.emit('removed:', item.model, idx);
    item.model.release();
    
    opts = Util.extendClone(this.opts, opts);
    
    if(!opts || !opts.nosync){
      return this.storageQueue.deleteItem(this.getKeyPath(), item.id, opts);
    }
    return promise.resolve();
  }
  
  move(startIdx: number, endIdx: number, opts?): Promise
  {
    var srcItem = this.items[startIdx];

    if(srcItem){
      endIdx = startIdx < endIdx ? endIdx + 1 : endIdx;
  
      var targetId = endIdx < this.items.length ? this.items[endIdx].id : null;
      srcItem.model.retain();
      return this.remove(startIdx).then(()=>{
        return this.insertBefore(targetId, srcItem.model, opts);
      });
    }
    return new Promise(new Error("Invalid indexes:"+startIdx+", "+endIdx));
  }
  
  public getItems(): Model[]
  {
    return _.pluck(this.items, 'model');
  }
  
  public startSync()
  {
    super.startSync();
    
    this.on('insertBefore:', (id, itemKeyPath, refId)=>{
      this.model.findById(itemKeyPath, true, {}).then((item)=>{
        this.insertItemBefore(refId, item, id, {nosync: true});
      });
    });

    this.on('deleteItem:', (id) => {
      this.deleteItem(id, {nosync: true});
    });
  }

  private execCmds(commands: Util.MergeCommand[]): Promise
  {
    var opts = {nosync: true};
    return Gnd.Promise.map(commands, (cmd) => {
      switch(cmd.cmd) {
        case 'insertBefore':
          return this.model.create(cmd.doc, false).then((instance) =>
            this.insertItemBefore(cmd.refId, instance, cmd.newId, opts)
          );
          break;
        case 'removeItem':
          return this.deleteItem(cmd.id, opts);
          break;
        default:
          throw new Error('Invalid command: '+cmd);
      }
    });
  }
  
  public resync(remoteItems: any[]): Promise
  {
    var promise = new Promise();
    this.resyncMutex.enter((done)=>{
      var commands = Gnd.Util.mergeSequences(remoteItems, this.items, Sequence.mergeFns);
      this.execCmds(commands).then(()=>{
        this.emit('resynced:');
        done();
        promise.resolve();
      });
    });
    return promise;
  }
}

//
// Underscore methods that we want to implement on the Sequence
//
var methods = 
  ['each', 'map', 'reduce', 'reduceRight', 'find', 'detect', 'pluck',
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
