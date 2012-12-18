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

module Gnd {
  
import _ = module('underscore');

declare module "underscore" {
  export function last (array : any[], n? : number) : any;
  export function isEqual (object : any, other : any) : bool;
  export function initial (array : any[], n? : number) : any[];
}
  
export interface GndModel {
  parent?: ()=>string;
 // gnd?: { add: (id: string, name: string, itemIds: string[], cb: (err: Error, ids: string[])=>void)=>void}; 
 add?: any;
}

export interface IMongooseModel extends GndModel {
  new (doc: {}): any;
  update(query:{}, args:{}, cb:(err: Error)=>void);
  findOneAndUpdate(conditions?:{}, update?:{}, cb?: (err: Error, doc:{}) => void);
  findOneAndUpdate(conditions?:{}, update?:{}, options?:{}, cb?: (err: Error, doc:{}) => void);
  findByIdAndUpdate(id: string, update?:{}, cb?: (err: Error, doc:{}) => void);
  findById(id:string, cb:(err: Error, doc?: any)=>void):any;
  findById(id: string): any;
  remove(query:{}, cb:(err: Error)=>void);
}

export class MongooseStorage implements IStorage {
  private models : any;
  private sync: any;
  
  constructor(models, sync){
    this.models = models;
    this.sync = sync;
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
  
  get(keyPath: string[], cb: (err: Error, doc?: any) => void): void
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
  
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err?: Error) => void): void
  {
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
            Model.add(id, setName, itemIds, function(err, ids){
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

  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], cb: (err: Error) => void): void
  {
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
    this.getModel(_.initial(keyPath, 2), function(Model){
      var setName = _.last(keyPath);
      var id = keyPath[keyPath.length-2];
      
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
    }, cb);
  }
  
  insert(keyPath: string[], index:number, doc:{}, cb: (err: Error) => void)
  {
    this.getSequence(keyPath, (err, seqDoc?, seq?) => {
      if(!err){
        if(index >= 0){
          seq.splice(index, 0, doc);
        }else{
          seq.push(doc);
        }
        seqDoc.save(cb);
      }else{
        cb(err)
      }
    })
  }
  
  extract(keyPath: string[], index:number, cb: (err: Error, doc?: {}) => void)
  {
    this.getSequence(keyPath, (err, seqDoc?, seq?) => {
      if(!err){
        var docs = seq.splice(index, 1);
        console.log(docs)
        seqDoc.save(function(err){
          cb(err, docs[0]);
        });
      }else{
        cb(err)
      }
    });
  }
  all(keyPath: string[], cb: (err: Error, result?: any[]) => void) : void
  {
    this.getSequence(keyPath, (err, seqDoc?, seq?) => {
      if(!err){
        cb(err, seq);
      }else{
        cb(err);
      }
    });
  }
  
  private getModel(keyPath: string[], cb: (Model: IMongooseModel, id?: string) => void, errCb: (err: Error) => void): void
  {
    //
    // ex. /cars/1234/engines/3456/carburetors
    //
    var last = keyPath.length - 1;
    var index = last - last & 1;
    var collection = keyPath[index];
    
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