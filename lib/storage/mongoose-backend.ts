/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Storage implementation using MoongooseJS (MongoDB)
  
  A Note about keyPaths.
  
  Key Paths have the following form:
  /collection1/id1/collection2/id2...
  
  i.e., A collection name followed by an id. It can have 1 or more keys,
  so valid keyPaths are:
  /cars
  /cars/1234/engines/213/carburetors
  
  Collections are usually expressed in plural, where id expresses a specific 
  element in the collection.

*/
/// <reference path="../storage.ts" />
/// <reference path="../error.ts" />

declare module 'mongoose' {
  export class Schema {
    constructor(def: {});
    static ObjectId : any;
  };
  export function model (name: string, schema: Schema) : any;
}

declare module "underscore" {
  export function last (array : any[], n? : number) : any;
  export function find (array : any[], iterator: (elem:any)=>bool) : any;
  export function isEqual (object : any, other : any) : bool;
  export function isFunction (object : any) : bool;
  export function initial (array : any[], n? : number) : any[];
}

module Gnd {
 
function makeKey(keyPath: string[]): string {
  return keyPath.join('@');
}
function parseKey(key: string): string[] {
  return key.split('@');
}

export interface GndModel {
  parent?: ()=>string;
 // gnd?: { add: (id: string, name: string, itemIds: string[], cb: (err: Error, ids: string[])=>void)=>void}; 
 add?: any;
}

export interface IMongooseModel extends GndModel {
  new (doc: {}): any;
  update(query:{}, args:{}, cb:(err: Error, num: any)=>void);
  findOneAndUpdate(conditions?:{}, update?:{}, cb?: (err: Error, doc:{}) => void);
  findOneAndUpdate(conditions?:{}, update?:{}, options?:{}, cb?: (err: Error, doc:{}) => void);
  findByIdAndUpdate(id: string, update?:{}, cb?: (err: Error, doc:{}) => void);
  findById(id:string, cb:(err: Error, doc?: any)=>void):any;
  find(conditions:{}, fields?: {}, options?: {}, cb?: (err: Error, docs?: any)=>void): any;
  findById(id: string): any;
  remove(query:{}, cb:(err: Error)=>void);
}

export class MongooseStorage implements IStorage {
  private models : any;
  private listContainer: any;
  private transaction: any;
  
  constructor(models, mongoose){
    this.models = models;
    
    this.listContainer = mongoose.model('ListContainer', new mongoose.Schema({
      type: {type: String},
      next: { type: mongoose.Schema.ObjectId, ref: 'ListContainer' },
      pending: [{ type: mongoose.Schema.ObjectId, ref: 'Transaction' }],
      modelId: { type: String}
    }));

    this.transaction = mongoose.model('Transaction', new mongoose.Schema({
      type: {type: String},
      id: { type: mongoose.Schema.ObjectId },
      state: { type: String}
    }));
  }
  
  create(keyPath: string[], doc: any, cb: (err: Error, key?: string) => void): void
  {
    this.getModel(keyPath, function(Model){
      var instance = new Model(doc);
      instance.save(function(err, doc){  
        if(!err){
          doc.__rev = 0;
          cb(err, doc._id);
        }else{
          cb(err);
        }
      });
    }, cb);
  }
  
  put(keyPath: string[], doc: any, cb: (err?: Error) => void): void
  {
    this.getModel(keyPath, function(Model){
    // Model.findByIdAndUpdate(_.last(keyPath), {$set: doc, $inc: doc.__rev}, (err, oldDoc) => {
      Model.findByIdAndUpdate(_.last(keyPath), doc, (err, oldDoc) => {
        // Note: isEqual should only check the properties present in doc!
        if(!err && !_.isEqual(doc, oldDoc)){
          // if doc modified synchronize
          //this.sync && this.sync.update(keyPath, doc);
        }
        cb(err);
      });
    }, cb);
  }

  /*
    Cat
    .where('name', 'Sprinkls')
    .findOneAndUpdate({ name: 'Sprinkles' })
    .setOptions({ new: false })
    .exec(function (err, cat) {
      if (err) ..
      render('cat', cat);
      });
  */
  
  fetch(keyPath: string[], cb: (err: Error, doc?: any) => void): void
  {
   this.getModel(keyPath, function(Model){
      Model.findById(_.last(keyPath), (err, doc?) => {
        if(doc){
          cb(err, doc);
        }else{
          cb(err || new Error(''+ServerError.DOCUMENT_NOT_FOUND));
        }
      });
    }, cb);
  }
  
  del(keyPath: string[], cb: (err?: Error) => void): void
  {
    this.getModel(keyPath, function(Model){
      Model.remove({_id:_.last(keyPath)}, cb);
    }, cb);
  }
  
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts:{}, cb: (err?: Error) => void): void;
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts:any, cb: any): void
  {
    if(_.isFunction(opts)) cb = opts;
    this.getModel(itemsKeyPath, (Set) => {
      if(Set && Set.parent){
        var doc = {};
        doc[Set.parent()] = keyPath[keyPath.length-2];
        Set.update({ _id : { $in : itemIds }}, doc, function(err){
          if(!err){
            // TODO: Only notify for really added items
            // this.sync.add(id, collection, itemIds);
          }

          cb(err);
        });
      }else{
        this.getModel(keyPath, (Model) => {
          var id = keyPath[keyPath.length-2];
          if(Model.add){
            var setName = _.last(keyPath);
            Model.add(id, setName, itemIds, (err, ids)=>{
              if(!err){
                // Use FindAndModify to get added items
                //sync.add(id, setName, ids);
              }
              cb(err);
            });
          }else{
            cb(new Error("No parent or add function available"));
          }
        }, cb);
      }
    }, cb);
  }

  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void): void;
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: any, cb: any): void
  {
    if(itemIds.length === 0) cb(null); //nothing to do
    if(_.isFunction(opts)) cb = opts;
    this.getModel(itemsKeyPath, (Set) => {
      if(Set && Set.parent){
        
      }else{
        this.getModel(keyPath, (Model) => {
          var id = keyPath[keyPath.length-2];  
          var setName = _.last(keyPath);
          var update = {$pullAll: {}};
          update.$pullAll[setName] = itemIds;
          Model.update({_id:id}, update, function(err){
            // TODO: Use FindAndModify to get removed items
            cb(err);
          });
        }, cb);
      }
    }, cb);
    
  }
  
  find(keyPath: string[], query: {}, options: {}, cb: (err: Error, result?: any[]) => void): void
  {
    this.getModel(keyPath, (Model)=>{
      if(keyPath.length === 1){
        return this.findAll(Model, cb);
      }else{
        var id = keyPath[keyPath.length-2];
        var setName = _.last(keyPath);
        return this.findById(Model, id, setName, query, options, cb);
      }
    }, cb);
  }

  private findAll(Model: IMongooseModel, cb: (err: Error, result?: any[]) => void): void
  {
    Model
      .find({})
      .exec(function(err, doc){
        if(err){
          cb(err);
        }else{
          cb(null, doc);
        }
      });
  }

  private findById(Model: IMongooseModel, id: string, setName: string, query: {}, options: {}, cb: (err: Error, result?: any[]) => void): void
  {
    var query = query || {fields:null, cond:null, options:null};
    
    Model
      .findById(id)
      .select(setName)
      .populate(setName, query.fields, query.cond, query.options)
      .exec(function(err, doc){
        if(err){
          cb(err);
        }else{
          cb(null, doc && doc[setName]);
        }
      });
  }
  
  private findContainer(Model: IMongooseModel, modelId, name, id, cb:(err: Error, container?)=>void){
    if(!id){
      this.findEndPoints(Model, modelId, name, (err, begin?, end?)=>{
        cb(err, begin);
      });
    }else{
      this.listContainer.find()
        .where('_id').equals(id)
        .exec((err, docs)=>{
          if(err) return cb(err);
          if(docs.length !== 1) return cb(Error('container '+id+' not found')); 
          cb(null, docs[0]);
        });
    }
  }

  private findEndPoints(Model: IMongooseModel, modelId, name, cb:(err: Error, begin?, end?)=>void){
    Model.findById(modelId).exec((err, doc) => {
      if(err) return cb(err);
      this.listContainer.find()
        .where('_id').in(doc[name])
        .or([{type:'_begin'}, {type:'_end'}])
        .exec((err, docs)=>{
          if(docs.length < 2) return cb(Error('could not find end points'));
          cb(err,
            _.find(docs, (doc) => {
              return doc.type === '_begin';
            }),
            _.find(docs, (doc) => {
              return doc.type === '_end';
            })
          );
        });
    });
  }

  private removeFromSeq(containerId, cb:(err?: Error)=>void){
    this.listContainer.update(
      {_id: containerId},
      {
        $set: {type: '_rip'}
      },
      cb
    );
  }

  private initSequence(Model: IMongooseModel, id, name, cb:(err: Error, begin?, end?)=>void){
    Model.findById(id).exec((err, doc) => {
      if(err) return cb(err);
      if(doc[name].length < 2){
        var first = new this.listContainer({
          type: '_begin'
        });
        first.save((err, first)=>{
          var last = new this.listContainer({
            type: '_end',
          });
          last.save((err, last)=>{
            first.next = last._id;
            first.save((err, first)=>{
              Model.update(
                {_id: id},
                { animals: [first._id, last._id] },
                (err)=>{
                  cb(null, first, last);
                }
              );
            });
          });
        });
      }else{
        this.findEndPoints(Model, id, name, cb);
      }
    });
  }

  private insertContainerBefore(Model:IMongooseModel, modelId, name, id, itemKey, opts, cb: (err:Error, id?: string)=>void)
  {
    var newContainer = new this.listContainer({
      next: id,
      modelId: itemKey
    });
    newContainer.save((err, newContainer)=>{
      if(err) return cb(err);

      this.listContainer.update({next: id}, {next: newContainer._id}, (err)=>{
        if(err){
          // rollback
          newContainer.remove();
          return cb(err);
        }
        var delta = {};
        delta[name] = newContainer._id;
        Model.update(
          {_id: modelId},
          { $push: delta },
          (err)=>{
            cb(err, newContainer._id);
          }
        );
      });
    });
  }

  all(keyPath: string[], query: {}, opts: {}, cb: (err: Error, result?: any[]) => void) : void
  {
    var all = [];
    var traverse = (id)=>{
      this.next(keyPath, id, opts, (err, next?)=>{
        if(!next) return cb(null, all);
        all.push(next);
        traverse(next.id);
      });
    };
      
    traverse(null);
  }

  next(keyPath: string[], id: string, opts: {}, cb: (err: Error, doc?:IDoc) => void)
  {
    this.getModel(keyPath, (Model) => {
      var modelId = keyPath[keyPath.length-2];
      var seqName = _.last(keyPath);

      this.findContainer(Model, modelId, seqName, id, (err, container?)=>{
        if(!id && !container) return cb(null); //empty sequence
        this.findContainer(Model, modelId, seqName, container.next, (err, container?)=>{
        //TODO:Err handling
          if(container.type === '_rip'){ //tombstone
            this.next(keyPath, container._id, opts, cb);
          }else if(container.type === '_end'){
            cb(null); //no next item
          }else{
            var kp = parseKey(container.modelId);
            this.fetch(kp, (err, doc?)=>{
              if(err) return cb(err);
              cb(null, {
                id: container._id,
                keyPath: kp,
                doc: doc
              });
            });
          }
        });
      });
    }, cb);
  }

  insertBefore(keyPath: string[], id: string, itemKeyPath: string[], opts, cb: (err: Error, id?: string, refId?: string) => void)
  {
    if(_.isFunction(opts)) cb = opts;

    this.getModel(keyPath, (Model) => {
      var modelId = keyPath[keyPath.length-2];
      var seqName = _.last(keyPath);
      this.initSequence(Model, modelId, seqName, (err, begin?, end?) => {
        if(!id) id = end._id;
        this.insertContainerBefore(Model, modelId, seqName, id, makeKey(itemKeyPath), opts, (err, newId?)=>{
          cb(err, newId, id);
        });
      });
    }, cb);
  }

  deleteItem(keyPath: string[], id: string, opts: {}, cb: (err?: Error) => void)
  {
    this.getModel(keyPath, (Model) => {
      var modelId = keyPath[keyPath.length-2];
      var seqName = _.last(keyPath);

      this.findContainer(Model, modelId, seqName, id, (err, container?)=>{
        if(!container || container.type === '_rip') return cb(Error('Tried to delete a non-existent item'));
        this.removeFromSeq(container._id, cb);
      });
    }, cb);
  }

  
  private getModel(keyPath: string[], cb: (Model: IMongooseModel, id?: string) => void, errCb: (err: Error) => void): void
  {
    //
    // ex. /cars/1234/engines/3456/carburetors
    //
    var last = keyPath.length - 1;
    var index = last - last & 1;
    var collection = keyPath[index]; //TODO rename?
    
    if(collection in this.models){
      cb(this.models[collection], this.models[keyPath[last]]);
    }else{
      errCb(new Error(''+ServerError.MODEL_NOT_FOUND));
    }
  }
  
  private getSequence(keyPath: string[], cb: (err: Error, seqDoc?: any, seq?: any[]) => void): void
  {
     this.getModel(_.initial(keyPath, 2), function(Model){
      var seqName = _.last(keyPath);
      var id = keyPath[keyPath.length-2];
      Model
        .findById(id)
        .select(seqName)
        .exec(function(err, seqDoc){
          if(!err){
            cb(err, seqDoc, seqDoc[seqName]);
          }else{
            cb(err);
          }
        });
    }, cb);
  }
  
}

}
