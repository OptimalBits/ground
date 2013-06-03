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
/// <reference path="../log.ts" />
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
          .ensure(() => {
            this.resolve(this);
            this.release();
          });
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
    var promise;
    var seqItem = {
      model: item,
      id: id,
      insync: !(_.isNull(id) || _.isUndefined(id))
    };
    
    opts = Util.extendClone(this.opts, opts);
    if(id) opts.id = id;
    
    var done = (id)=>{
      seqItem.id = id || seqItem.id;
      this.storageQueue.once('inserted:'+seqItem.id, (sid)=>{
        seqItem.id = sid;
        seqItem.insync = true;
      });
    }

    var found;
    for(var i=this.items.length-1; i>=0; i--) {
      if(this.items[i].id === id){
        found = this.items[i];
        break;
      }
    }
    // var found = _.find(this.items, function(item){ return item.id === id; });
    if(found){
      var next = this.items[i+1];
      if((!refId && !next) || refId === next.id){
        return Promise.resolved(); //already at the right place
      }else{
        return Promise.rejected(Error('Tried to insert duplicate container'));
      }
    }
    

    var index;
    if(refId){
      index = -1;
      _.each(this.items, (item, i?)=>{
        if(item.id === refId){
          index = i;
        }
      });
      if(index === -1){
        //refId not found perform a resync
        log('REFID not found. Resyncing');
        return this.triggerResync();
      }
    }else{
      //push last
      index = this.items.length;
    }

    //Handle the case when we insert an item from the server that have a pending item on this position
    while(opts.noremote && index > 0 && !this.items[index-1].insync){
      index--;
      refId = this.items[index].id;
    }

    this.items.splice(index, 0, seqItem);
    this.initItems(seqItem.model);
    this.set('count', this.items.length);
    
    if(!opts || !opts.nosync){
      if(item.isPersisted() || !item._initial){
        this._keepSynced && item.keepSynced();
        promise = this.insertPersistedItemBefore(refId, item, opts).then(done);
      }else{
        promise = item.save().then(()=>{
          this._keepSynced && item.keepSynced();
          return this.insertPersistedItemBefore(refId, item, opts).then(done);
        });
      }
    }else{
      this._keepSynced && item.keepSynced();
      promise = Promise.resolved();
    }

    this.emit('inserted:', item, index);
    return promise;
  }

  private insertPersistedItemBefore(id: string, item: Model, opts: {}): Promise // <string>
  {
    var keyPath = this.getKeyPath();
    var itemKeyPath = item.getKeyPath();
    return this.storageQueue.insertBefore(keyPath, id, itemKeyPath, opts);
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
    var promise;

    var item = this.items[idx];

    if(!item){
      return Promise.rejected(Error('index out of bounds'));
    } 
    this.items.splice(idx, 1);
    
    // Why can't we use deinitItems here?
    item.model.off('changed:', this.updateFn);
    item.model.off('deleted:', this.deleteFn);
    
    this.set('count', this.items.length);
    item.model.release();
    
    opts = Util.extendClone(this.opts, opts);
    
    if(!opts || !opts.nosync){
      promise = this.storageQueue.deleteItem(this.getKeyPath(), item.id, opts);
    }else{
      promise = Promise.resolved();
    }

    this.emit('removed:', item.model, idx);
    return promise;
  }
  
  move(startIdx: number, endIdx: number, opts?): Promise
  {
    var srcItem = this.items[startIdx];

    if(srcItem){
      endIdx = startIdx <= endIdx ? endIdx + 1 : endIdx;
  
      if(0 <= endIdx && endIdx <= this.items.length){
        var targetId = endIdx < this.items.length ? this.items[endIdx].id : null;

        srcItem.model.retain();
        return this.remove(startIdx).then(()=>{
          return this.insertBefore(targetId, srcItem.model, opts);
        });
      }
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
        this.insertItemBefore(refId, item, id, {noremote: true});
      });
    });

    this.on('deleteItem:', (id) => {
      this.deleteItem(id, {noremote: true});
    });
  }

  private execCmds(commands: MergeCommand[]): Promise
  {
    var opts = {nosync: true};
    return Gnd.Promise.map(commands, (cmd) => {
      switch(cmd.cmd) {
        case 'insertBefore':
          return this.model.create(cmd.doc, true).then((instance) =>
            this.insertItemBefore(cmd.refId, instance, cmd.newId, opts));
          break;
        case 'removeItem':
          return this.deleteItem(cmd.id, opts);
          break;
        default:
          throw Error('Invalid command:'+cmd);
      }
    });
  }
  
  private triggerResync(): Promise
  {
    var keyPath = this.getKeyPath();
    return this.storageQueue.all(keyPath, {}, {}).then((result) =>
      result[1].then((items) => this.resync(items))
    );
  }

  public resync(remoteItems: any[]): Promise
  {
    return this.resyncMutex.enter(() => {
      var commands = Sequence.merge(remoteItems, this.items, Sequence.mergeFns);
      return this.execCmds(commands).then(() => {
        this.emit('resynced:')
      });
    });
  }

  static merge(source: any[], target: any[], fns: MergeFunctions): MergeCommand[]
  {
    var insertCommands: MergeCommand[] = [];
    var removeCommands: MergeCommand[] = [];
    var remainingItems = [];

    var sourceIds = _.map(source, function(item){
      return fns.id(item); //TODO: Change to id
    }).sort();

    //Determine which items to delete
    _.each(target, function(targetItem){
      if(fns.inSync(targetItem) && -1 === _.indexOf(sourceIds, fns.id(targetItem), true)){
        removeCommands.push({
          cmd: 'removeItem',
          id: fns.id(targetItem)
        });
      }else{
        remainingItems.push(targetItem);
      }
    });

    var i=0;
    var j=0;
    var targetItem, sourceItem;

    // insert new items on the right place
    while(i<remainingItems.length && j<source.length){
      targetItem = remainingItems[i];
      if(fns.inSync(targetItem)){
        sourceItem = source[j];
        if(fns.id(targetItem) === fns.id(sourceItem)){
          i++;
        }else{
          insertCommands.push({
            cmd: 'insertBefore',
            refId: fns.id(targetItem),
            newId: fns.id(sourceItem),
            keyPath: fns.keyPath(sourceItem), //TODO: not always needed
            doc: fns.doc(sourceItem)
          });
        }
        j++;
      }else{
        i++;
      }
    }

    //append remaining new items
    while(j<source.length){
      sourceItem = source[j];
      insertCommands.push({
        cmd: 'insertBefore',
        refId: null,
        newId: fns.id(sourceItem),
        keyPath: fns.keyPath(sourceItem), //TODO: see above
        doc: fns.doc(sourceItem)
      });
      j++;
    }

    //remove remaining old items
    while(i<remainingItems.length){
      targetItem = remainingItems[i];
      if(fns.inSync(targetItem)){
        removeCommands.push({
          cmd: 'removeItem',
          id: fns.id(targetItem)
        });
      }
      i++;
    }

    // Adapt insert commands if pointing at deleted item
    _.each(insertCommands, function(insertCmd){
      var found = _.find(removeCommands, function(removeCmd){
        return removeCmd.id === insertCmd.refId;
      });
      if(found){
        insertCmd.refId = null;
      }
    });


    // return the sequence of commands that transforms the target sequence according
    // to the source
    // it is important that the removecommands come before the insertcommands
    return removeCommands.concat(insertCommands);
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

export interface MergeFunctions {
  id: (item: {}) => string;
  keyPath: (item: {}) => string;
  doc: (item: {}) => {};
  inSync: (item: {}) => bool;
}

export interface MergeCommand {
  cmd: string;
  id?: string;
  refId?: string;
  newId?: string;
  keyPath?: string;
  doc?: {};
}

}
