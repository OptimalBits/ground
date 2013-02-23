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
  
  Collections are usually expressed in plurar, where id expresses a specific 
  element in the collection.

*/
/// <reference path="../storage.ts" />

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
import mongoose = module('mongoose');
 
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
  private sync: any;
  private listContainer: any;
  
  constructor(models, sync){
    this.models = models;
    this.sync = sync;
    this.listContainer = mongoose.model('ListContainer', new mongoose.Schema({
      type: {type: String},
      prev: { type: mongoose.Schema.ObjectId, ref: 'ListContainer' },
      next: { type: mongoose.Schema.ObjectId, ref: 'ListContainer' },
      // keyPath: [{ type: String}],
      modelId: { type: String}
    }));
  }
  
  create(keyPath: string[], doc: any, cb: (err: Error, key?: string) => void): void
  {
    this.getModel(keyPath, function(Model){
      var instance = new Model(doc);
      instance.save(function(err, doc){
        doc.__rev = 0;
        cb(err, doc._id);
      });
    }, cb);
  }
  
  put(keyPath: string[], doc: any, cb: (err?: Error) => void): void
  {
    this.getModel(keyPath, function(Model){
//      Model.findByIdAndUpdate(_.last(keyPath), {$set: doc, $inc: doc.__rev}, (err, oldDoc) => {
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
          cb(err || new Error("Document not found"));
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
    console.log('---add--------');
    console.log(keyPath);
    if(_.isFunction(opts)) cb = opts;
    this.getModel(itemsKeyPath, (Set) => {

    console.log(itemsKeyPath);
      if(Set && Set.parent){
        var doc = {};
        console.log(Set.parent());
        doc[Set.parent()] = keyPath[keyPath.length-2];
        Set.update({ _id : { $in : itemIds }}, doc, function(err){
          if(!err){
            // TODO: Only notify for really added items
            // this.sync.add(id, collection, itemIds);
          }

          cb(err);
        });
      }else{
        console.log(':::::');
        console.log(keyPath);
        this.getModel(keyPath, (Model) => {
          var id = keyPath[keyPath.length-2];
    console.log(Model.add);
    console.log(keyPath);
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
          console.log(33);
            cb(new Error("No parent or add function available"));
          }
        }, cb);
      }
    }, cb);
  }

  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: {}, cb: (err: Error) => void): void;
  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: any, cb: any): void
  {
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
  
  private findContainerOfModel(Model: IMongooseModel, id, name, modelId, cb:(err: Error, container?)=>void){
    console.log(modelId);
    switch(modelId) {
      case '##@_begin':
        this.findEndPoints(Model, id, name, (err, begin?, end?)=>{
          cb(err, begin);
        });
        break;
      case '##@_end':
        this.findEndPoints(Model, id, name, (err, begin?, end?)=>{
          cb(err, end);
        });
        break;
      default:
    Model.findById(id).exec((err, doc) => {
      this.listContainer.find()
        .where('_id').in(doc[name])
        .where('modelId').equals(modelId)
        .exec((err, docs)=>{
          if(docs.length !== 1) return cb(Error('no unique container found for model')); 
          cb(err, docs[0]);
        });
    });
    }
  }
  private findContainer(Model: IMongooseModel, id, name, containerId, cb:(err: Error, container?)=>void){
        Model.findById(id).exec((err, doc) => {
          this.listContainer.find()
            .where('_id').equals(containerId)
            .exec((err, docs)=>{
              if(docs.length !== 1) return cb(Error('container '+containerId+' not found')); 
              cb(err, docs[0]);
            });
        });
  }

  private findEndPoints(Model: IMongooseModel, id, name, cb:(err: Error, begin?, end?)=>void){
    console.log('ep');
    console.log(id);
    Model.findById(id).exec((err, doc) => {
      if(err) return cb(err);
      this.listContainer.find()
        .where('_id').in(doc[name])
        .or([{type:'_begin'}, {type:'_end'}])
        .exec((err, docs)=>{
          console.log(docs);
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
    //TODO: Atomify
    Model.findById(id).exec((err, doc) => {
      console.log('---init sequence---');
      console.log(doc);
      console.log(err);
      if(doc[name].length < 2){
        console.log('creating first and last');
        var first = new this.listContainer({
          type: '_begin'
        });
        first.save((err, first)=>{
          var last = new this.listContainer({
            type: '_end',
            prev: first._id
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

  // private insertContainerBefore(Model:IMongooseModel, id, name, refContainerId, itemKeyPath, opts, cb: (err?:Error)=>void)
  private insertContainerBefore(Model:IMongooseModel, id, name, refContainerId, itemKey, opts, cb: (err?:Error)=>void)
  {
    //TODO: Atomify
    this.listContainer.findById(refContainerId)
      .exec((err, doc)=>{
        var prevId = doc.prev;
        var newContainer = new this.listContainer({
          prev: prevId,
          next: refContainerId,
          // keyPath: itemKeyPath,
          // modelId: _.last(itemKeyPath)
          modelId: itemKey
        });
        newContainer.save((err, newContainer)=>{
          //TODO: parallellize
          this.listContainer.update({_id: prevId}, {next: newContainer._id}, (err)=>{
            this.listContainer.update({_id: refContainerId}, {prev: newContainer._id}, (err)=>{
              var delta = {};
              delta[name] = newContainer._id;
              Model.update(
                {_id: id},
                { $push: delta },
                (err)=>{
                  cb(err);
                }
              );
            });
          });
        });
      });
  }

  // private insertContainerAfter(Model:IMongooseModel, id, name, refContainerId, itemKeyPath, opts, cb: (err?:Error)=>void)
  // {
  //   //TODO: Atomify
  //   this.listContainer.findById(refContainerId)
  //     .exec((err, doc)=>{
  //       var nextId = doc.next;
  //       var newContainer = new this.listContainer({
  //         prev: refContainerId,
  //         next: nextId,
  //         keyPath: itemKeyPath,
  //         modelId: _.last(itemKeyPath)
  //       });
  //       newContainer.save((err, newContainer)=>{
  //         //TODO: parallellize
  //         this.listContainer.update({_id: refContainerId}, {next: newContainer._id}, (err)=>{
  //           this.listContainer.update({_id: nextId}, {prev: newContainer._id}, (err)=>{
  //             var delta = {};
  //             delta[name] = newContainer._id;
  //             Model.update(
  //               {_id: id},
  //               { $push: delta },
  //               (err)=>{
  //                 cb(err);
  //               }
  //             );
  //           });
  //         });
  //       });
  //     });
  // }

  // insert(keyPath: string[], index:number, doc:{}, cb: (err: Error) => void)
  // {
  //   this.getSequence(keyPath, (err, seqDoc?, seq?) => {
  //     if(!err){
  //       if(index >= 0){
  //         seq.splice(index, 0, doc);
  //       }else{
  //         seq.push(doc);
  //       }
  //       seqDoc.save(cb);
  //     }else{
  //       cb(err)
  //     }
  //   })
  // }
  // 
  // extract(keyPath: string[], index:number, cb: (err: Error, doc?: {}) => void)
  // {
  //   this.getSequence(keyPath, (err, seqDoc?, seq?) => {
  //     if(!err){
  //       var docs = seq.splice(index, 1);
  //       console.log(docs)
  //       seqDoc.save(function(err){
  //         cb(err, docs[0]);
  //       });
  //     }else{
  //       cb(err)
  //     }
  //   });
  // }
  all(keyPath: string[], query: {}, opts: {}, cb: (err: Error, result?: any[]) => void) : void
  {
    //TODO: refactor (performance)
    var all = [];
    console.log('--a--l--l--');
    var traverse = (item)=>{
      console.log('item');
      console.log(item);
      this.next(keyPath, item, opts, (err, next?)=>{
        if(!next) return cb(null, all);
        all.push(next);
        traverse(next.keyPath);
      });
    };
      
    this.first(keyPath, opts, (err, first?)=>{
      console.log('first');
      console.log(first);
      if(!first) return cb(null, all);
      all.push(first);
      traverse(first.keyPath);
    });
    // this.getSequence(keyPath, (err, seqDoc?, seq?) => {
    //   if(!err){
    //     cb(err, seq);
    //   }else{
    //     cb(err);
    //   }
    // });
  }

  first(keyPath: string[], opts: {}, cb: (err: Error, doc?:IDoc) => void)
  {
    this.next(keyPath, ['##', '_begin'], opts, cb);
  }
  last(keyPath: string[], opts: {}, cb: (err: Error, doc?:IDoc) => void)
  {
    this.prev(keyPath, ['##', '_end'], opts, cb);
  }
  // next(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  next(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, doc?:IDoc) => void)
  {
    this.getModel(keyPath, (Model) => {
      var id = keyPath[keyPath.length-2];
      var seqName = _.last(keyPath);

      this.findContainerOfModel(Model, id, seqName, makeKey(refItemKeyPath), (err, container?)=>{
        if(err) return cb(err);

        this.findContainer(Model, id, seqName, container.next, (err, container?)=>{
        //TODO:Err handling
          if(container.type === '_rip'){
            this.next(keyPath, parseKey(container.modelId), opts, cb);
          }else if(container.type === '_end'){
            cb(Error('No next item found'));
          }else{
            var kp = parseKey(container.modelId);
            this.fetch(kp, (err, doc?)=>{
              if(err) return cb(err);
              cb(null, {
                keyPath: kp,
                doc: doc
              });
            });
          }
        });
      });
    }, cb);
  }
  prev(keyPath: string[], refItemKeyPath: string[], opts: {}, cb: (err: Error, doc?:IDoc) => void)
  {
    this.getModel(keyPath, (Model) => {
      var id = keyPath[keyPath.length-2];
      var seqName = _.last(keyPath);

      this.findContainerOfModel(Model, id, seqName, makeKey(refItemKeyPath), (err, container?)=>{
        if(err) return cb(err);

        this.findContainer(Model, id, seqName, container.prev, (err, container?)=>{
        //TODO:Err handling
          if(container.type === '_rip'){
            this.prev(keyPath, parseKey(container.modelId), opts, cb);
          }else if(container.type === '_begin'){
            cb(Error('No previous item found'));
          }else{
            var kp = parseKey(container.modelId);
            this.fetch(kp, (err, doc?)=>{
              if(err) return cb(err);
              cb(null, {
                keyPath: kp,
                doc: doc
              });
            });
          }
        });
      });
    }, cb);
  }
  // pop(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  // {
  //   this.last(keyPath, opts, (err, doc?)=>{
  //     if(err) return cb(err);
  //     this.deleteItem(keyPath, [doc._id], opts, (err?)=>{
  //       cb(err, doc);
  //     });
  //   });
  // }

  // shift(keyPath: string[], opts: {}, cb: (err: Error, doc?:{}) => void)
  // {
  //   this.first(keyPath, opts, (err, doc?)=>{
  //     if(err) return cb(err);
  //     this.deleteItem(keyPath, [doc._id], opts, (err?)=>{
  //       cb(err, doc);
  //     });
  //   });
  // }

  // push(keyPath: string[], itemKeyPath: string[], opts, cb: (err?: Error) => void)
  // {
  //   this.insertBefore(keyPath, ['##', '_end'], itemKeyPath, opts, cb);
  // }

  // unshift(keyPath: string[], itemKeyPath: string[], opts, cb: (err?: Error) => void)
  // {
  //   this.insertAfter(keyPath, ['##', '_begin'], itemKeyPath, opts, cb);
  // }

  insertBefore(keyPath: string[], refItemKeyPath: string[], itemKeyPath: string[], opts, cb: (err?: Error) => void)
  {
    if(!refItemKeyPath) refItemKeyPath = ['##', '_end'];
    if(_.isFunction(opts)) cb = opts;

    this.getModel(keyPath, (Model) => {
      var id = keyPath[keyPath.length-2];
      var seqName = _.last(keyPath);
      this.initSequence(Model, id, seqName, (err, first?, last?) => {
        var refContainer = this.findContainerOfModel(Model, id, seqName, makeKey(refItemKeyPath), (err, refContainer)=>{
          console.log('---asd-f-asd-f');
          console.log(refContainer);
          if(err) return cb(err);
          this.insertContainerBefore(Model, id, seqName, refContainer._id, makeKey(itemKeyPath), opts, cb);
        });
      });
    }, cb);
  }

  // insertAfter(keyPath: string[], refItemKeyPath: string[], itemKeyPath: string[], opts, cb: (err?: Error) => void)
  // {
  //   if(_.isFunction(opts)) cb = opts;

  //   this.getModel(keyPath, (Model) => {
  //     var id = keyPath[keyPath.length-2];
  //     var seqName = _.last(keyPath);
  //     this.initSequence(Model, id, seqName, (err, first, last) => {
  //       var refContainer = this.findContainerOfModel(Model, id, seqName, _.last(refItemKeyPath), (err, refContainer)=>{
  //         if(err) return cb(err);
  //         this.insertContainerAfter(Model, id, seqName, refContainer._id, itemKeyPath, opts, cb);
  //       });
  //     });
  //   }, cb);
  // }

  deleteItem(keyPath: string[], itemKeyPath: string[], opts: {}, cb: (err?: Error) => void)
  {
    this.getModel(keyPath, (Model) => {
      var id = keyPath[keyPath.length-2];
      var seqName = _.last(keyPath);

      this.findContainerOfModel(Model, id, seqName, makeKey(itemKeyPath), (err, container?)=>{
        if(err) return cb(err);
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
      errCb(new Error("Model not found"));
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
          console.log('-----get sq----');
          console.log(seqDoc);
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
