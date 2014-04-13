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
/// <reference path="storage.ts" />
/// <reference path="../model.ts" />
/// <reference path="../error.ts" />

declare module 'mongoose' {
  export interface Schema {
    constructor(def: {});
    //static ObjectId : any;
  }
  export function model (name: string, schema: Schema) : any;
}

declare module "underscore" {
  export function last (array : any[], n? : number) : any;
  export function find (array : any[], iterator: (elem:any)=>boolean) : any;
  export function isEqual (object : any, other : any) : boolean;
  export function isFunction (object : any) : boolean;
  export function initial (array : any[], n? : number) : any[];
}

/**
  @module Gnd
  @submodule Storage
*/
module Gnd.Storage {
 
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
  findOne(conditions:{}, fields?: {}, options?: {}, cb?: (err: Error, docs?: any)=>void): any;
  find(conditions:{}, fields?: {}, options?: {}, cb?: (err: Error, docs?: any[])=>void): any;
  findById(id:string, fields?:string):any;
  findById(id: string): any;
  remove(query:{}, cb:(err: Error)=>void);
}

interface FoundModel
{
  Model: IMongooseModel;
  id: string;
}

export interface IModels
{
  [indexer: string]: IModel;
}

export interface IMongooseModels
{
  [indexer: string]: IModel;
}

/**
  [MongooseJS](http://mongoosejs.com) implementation of IStorage.

  @class Storage.MongooseStorage
  @extends Storage.IStorage
  @constructor
  @param models {Any} Object mapping model buckets and models.
  @param mongoose {Mongoose} A valid mongoose instance.
*/
export class MongooseStorage implements Storage.IStorage {
  public models: any = {};
  private ListContainer: any;
  private transaction: any;
  private mongoose;
  private nameMapping;
  
  constructor(mongoose, models: IModels, legacy?: IMongooseModels)
  {
    this.ListContainer = mongoose.model('ListContainer', new mongoose.Schema({
      _cid: String,
      type: { type: String, enum: ['_begin', '_end', '_rip'] },
      modelId: String,
      next: String //{ type: mongoose.Schema.ObjectId, ref: 'ListContainer' }
    }));
    
    this.mongoose = mongoose;
    this.compileModels(models, mongoose, legacy);
  }
  
  addModel(name: string, model: IModel){
    var nameMapping = this.nameMapping = this.nameMapping || {};
    nameMapping[model.__bucket] = name;
    
    this.compileModel(name, model, this.mongoose, nameMapping);
  }
  
  private compileModel(name: string, model: IModel, mongoose, nameMapping){
    var schema = model.schema();
    var bucket = model.__bucket;
    
    if(bucket){
      var translated = this.translateSchema(mongoose, nameMapping, schema);
      var mongooseSchema =
          new mongoose.Schema(translated, {strict: false});
      // new mongoose.Schema(translated); // strict false is just temporary...

      var extra = model['__mongoose'];
      
      if(extra){
        
        if(extra.methods){
          mongooseSchema.methods = mongooseSchema.methods || {};
          _.extend(mongooseSchema.methods, extra.methods);
        }
        
        if(extra.statics){
          mongooseSchema.statics = mongooseSchema.statics || {};
          _.extend(mongooseSchema.statics, extra.statics);
        }
                  
        if(extra.pre){
          _.each(extra.pre, function(fn, method){
            mongooseSchema.pre(method, fn);
          })
        }
        if(extra.post){
          _.each(extra.post, function(fn, method){
            mongooseSchema.post(method, fn);
          })
        }
      }
      
      this.models[bucket] =
        mongoose.model(name, mongooseSchema, bucket);
        
      if(extra){
        this.models[bucket]['extra'] = extra;
      }
        
      if(model['filter']){
        this.models[bucket]['filter'] = model['filter'];
      }
      
      if(model['hooks']){
       this.models[bucket]['gnd-hooks'] = model['hooks'];
      }
      
      this.models[bucket]['gnd-schema'] = schema;
    }
  }

  /**
    Compiles Gnd models into Mongoose Models.
  */
  private compileModels(models: IModels, mongoose, legacy?)
  { 
    var nameMapping = this.nameMapping = this.nameMapping || {};
    for(var name in models){
      var model = models[name];
      nameMapping[model.__bucket] = name;
    }
    for(var bucket in legacy){
      nameMapping[bucket] = legacy[bucket].modelName;
    }

    for(var name in models){
      this.compileModel(name, models[name], mongoose, nameMapping);
    }
    
    legacy && _.extend(this.models, legacy);
  }

  private translateSchema(mongoose, mapping, schema: Schema): any
  {
    // Translate ObjectId, Sequences and Collections since they have special
    // syntax.
    return schema.map((key, value) => {
      if(key != '_id'){
        var res;
        if(value instanceof Schema){
          return this.translateSchema(mongoose, mapping, value);
        }
        if(value.definition.type){
          res = _.clone(value.definition);
        }else{
          res = {type: value.definition};
        }
        
        if(res.type.__schema){
          return this.translateSchema(mongoose, mapping, res.type.__schema);
        }
        
        switch(res.type){
          case Gnd.Schema.ObjectId:
            res.type = String;
            break;
          case Gnd.Schema.Abstract:
            break;
          case Gnd.Sequence:
          case Gnd.Collection:
            if(!mapping[res.ref.model.__bucket]){
              throw new Error("Model bucket " + res.ref.model.__bucket + " does not have a valid mapping name");
            }else{
              res = {type: [{type: String, ref: mapping[res.ref.bucket]}], 
                    select: false};
            }
            break;
        }
        return res;
      }
    });
  }
  
  create(keyPath: string[], doc: any): Promise<string>
  {
    if(!doc._cid){
      doc._cid = Util.uuid();
    }
    return this.getModel(keyPath).then<string>((found) => {
      return new Promise<string>((resolve, reject)=>{
        if(found.Model['filter']){
          found.Model['filter'](doc, (err, doc) =>{
            if(!err){
              create(doc);
            }
          });
        }else{
          create(doc);
        }
      
        function create(doc){
          var instance = new found.Model(doc);
          instance.save(function(err, doc){
            if(!err){
              doc.__rev = 0;
              resolve(doc._cid);
            }else{
              reject(err);
            }
          });
        }
      });
    });
  }
  
  put(keyPath: string[], doc: any): Promise<void>
  {
    return this.getModel(keyPath).then<void>(function(found){
      return new Promise<void>((resolve, reject) => {
        if(found.Model['filter']){
          found.Model['filter'](doc, (err, doc) =>{
            if(err){
              reject(err);
            }else{
              update(doc);
            }
          });
        }else{
          update(doc);
        }
        function update(doc){
          found.Model.findOneAndUpdate({_cid:_.last(keyPath)}, doc).lean().exec((err, oldDoc) => {
            if(err){
              reject(err);
            }else{
              // Note: isEqual should only check the properties present in doc!
              // if(!_.isEqual(doc, oldDoc)){
              // only if doc modified should we synchronize...
              //}
              resolve(oldDoc);
            }
          });
        }
      });
    });
  }

  /*
    Cat
    .where('name', 'Sprinkles')
    .findOneAndUpdate({ name: 'Sprinkles' })
    .setOptions({ new: false })
    .exec(function (err, cat) {
      if (err) ..
      render('cat', cat);
      });
  */
  fetch(keyPath: string[]): Promise<any>
  {
    return this.getModel(keyPath).then((found) => {
      return found.Model.findOne({_cid: _.last(keyPath)}).lean().exec().then((doc) => {
        if(doc){
          if(found.Model['gnd-hooks'] && found.Model['gnd-hooks'].fetch){
            return found.Model['gnd-hooks'].fetch(this, doc);
          }else{
            return doc;
          }
        }
        console.log("Document:", keyPath, "not Found!");
        //promise.reject(err || new Error(''+ServerError.DOCUMENT_NOT_FOUND))
        throw Error(''+ServerError.DOCUMENT_NOT_FOUND);
      });
    });
  }
  
  del(keyPath: string[]): Promise<void>
  {
    return this.getModel(keyPath).then<void>((found) => {
      return new Promise<void>((resolve, reject) =>{
        var extra = found.Model['extra'];
        if(extra && extra.pre && extra.pre.remove){
          // Slower remove needed to apply middleware
          found.Model.findOne({_cid:_.last(keyPath)}, (err?, doc?) => {
            if(!err && doc){
              doc.remove((err?)=>{
                if(err){
                  reject(err);
                }else{
                  resolve();
                }
              });
            }else{
              reject(err);
            }
          });
        }else{
          // Faster remove
          found.Model.remove({_cid:_.last(keyPath)}, (err?)=>{
            if(err){
              reject(err);
            }else{
              resolve();
            }
          });
        }
      });
    });
  }
  
  add(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts:any): Promise<void>
  {
    return this.getModel(keyPath).then<void>((found) => {
      return new Promise<void>((resolve, reject) => {
        var id = keyPath[keyPath.length-2];
        var setName = _.last(keyPath);
        if(found.Model.add){
          found.Model.add(id, setName, itemIds, (err, ids)=>{
            if(!err){
              // Use FindAndModify to get added items
              // sync.add(id, setName, ids);
              resolve();
            }else{
              reject(err);
            }
          });
        }else{
          var update = {$addToSet: {}};
          update.$addToSet[setName] = {$each:itemIds};
          found.Model.update({_cid:id}, update, (err) => {
            if(!err){
              // Use FindAndModify to get added items
              // sync.add(id, setName, ids);
              resolve();
            }else{
              reject(err);
            }
          });
        }
      });
    });
  }

  remove(keyPath: string[], itemsKeyPath: string[], itemIds:string[], opts: any): Promise<void>
  {
    if(itemIds.length === 0) return Promise.resolved<void>(); //nothing to do
    
    return this.getModel(keyPath).then<void>((found) => {
      return new Promise<void>((resolve, reject) => {
        var id = keyPath[keyPath.length-2];  
        var setName = _.last(keyPath);
        var update = {$pullAll: {}};
        update.$pullAll[setName] = itemIds;
        found.Model.update({_cid:id}, update, function(err){
          // TODO: Use FindAndModify to get removed items
          if(!err){
            resolve();
          }else{
            reject(err);
          }
        });
      });
    });
  }
  
  find(keyPath: string[], query: Storage.IStorageQuery, opts: {}): Promise<any[]>
  {
    return this.getModel(keyPath).then<any[]>((found)=>{
      if(keyPath.length === 1){
        return this.findAll(found.Model, query);
      }else{
        var id = keyPath[keyPath.length-2];
        var setName = _.last(keyPath);
        return this.findById(found.Model, id, setName, query, opts);
      }
    });
  }

  private findAll(Model: IMongooseModel, query: Storage.IStorageQuery): Promise<any[]>
  {
    query = query || {};
    return Model.find(query.cond, query.fields, query.opts).exec();
  }

  private findById(Model: IMongooseModel, 
                   id: string, 
                   setName: string,
                   query: Storage.IStorageQuery,
                   opts: {}): Promise<any[]>
  {
    query = query || {};

    return Model
      .findOne({_cid:id})
      .lean()
      .select(setName)
      .exec().then((doc) => {
        //
        // We check if the setName is a collection property, if so
        // we must retrieve the Model from the CollectionSchemaType
        //
        var schemaType = Model['gnd-schema'] ? 
          Model['gnd-schema'].getSchemaType(setName) : undefined;
        
        var model = schemaType instanceof CollectionSchemaType ?
          this.models[schemaType.definition.ref.model.__bucket] :
          this.models[setName];

        if(!schemaType){
          console.log(setName);
        }

        if(model){
          if(doc && doc[setName]){
            return this.populate(model, query, doc[setName]);
          }else{
            return [];
          }
        }else{
          throw Error("Collection model "+setName+" not found");
        }
    });
  }
  
  private populate(Model: IMongooseModel, query: Storage.IStorageQuery, arr): Promise<any>
  {
    return Model
      .find(query.cond, query.fields, query.opts)
      .lean()
      .where('_cid').in(arr)
      .exec();
  }
  
/*
  Sequences
  A sequence is represented as a linked list of listContainers. Every ListContainer has
  a reference to the next ListContainer and to the model instance it refers to. A
  ListContainer may also have a type attribute:
    _begin: dummy container before the first real item in the sequence
    _end: dummy container after the last real item in the sequence
    _rip: 'tombstone' element that has been deleted from the sequence
    
*/
  private findContainer(ParentModel: IMongooseModel, parentId, name, id): Promise<any>
  {
    if(!id){
      return this.findEndPoints(ParentModel, parentId, name).then((res: any) => {
        return res ? res.begin : res;
      });
    }else{
      return new Promise((resolve, reject) =>{
        this.ListContainer.find({_cid: id}).lean().exec((err, docs) => {
          if(err) return reject(err);
          if(docs.length !== 1) return reject(Error('container '+id+' not found'));
          return resolve(docs[0]);
        });
      });
    }
  }
  
  private findEndPoints(ParentModel: IMongooseModel, parentId, name): Promise<any>
  {
    return new Promise((resolve, reject) => {
      ParentModel.findOne({_cid: parentId}).lean().select(name).exec((err, doc) => {
        if(err) return reject(err);
        else if(!doc) return reject(Error('could not find end points'));
        else if(!doc[name] || doc[name].length === 0) resolve();
        else {
          this.ListContainer.find()
            .lean()
            .where('_cid').in(doc[name])
            .or([{type:'_begin'}, {type:'_end'}])
            .exec((err, docs)=>{
              if(err) return reject(err);
              if(docs.length < 2) return reject(Error('could not find end points'));
              resolve({
                begin: _.find(docs, (doc) => {
                  return doc.type === '_begin';
                }),
                end: _.find(docs, (doc) => {
                  return doc.type === '_end';
                })
              });
            });
        }
      });
    });
  }

  private removeFromSeq(containerId: string): Promise<void>
  {
    return new Promise<void>((resolve, reject) => {
      this.ListContainer.update(
        {_cid: containerId},
        {
          $set: {type: '_rip'}
        },
        (err) => {
          if(err){
            reject(err);
          }else{
            resolve();
          }
        }
      );
    });
  }
  
  private initSequence(ParentModel: IMongooseModel, parentId, name): Promise<any>
  {
    return new Promise((resolve, reject) => {
      ParentModel.findOne({_cid: parentId}).lean().select(name).exec((err, doc) => {
        if(err){
          reject(err);
        }else if(doc && doc[name].length < 2){
          var first = new this.ListContainer({
            _cid: Util.uuid(),
            type: '_begin'
          });
        
          //
          // This series of DB updates can imply difficult hazzards, we need
          // some kind of transaction support for this.
          //
          first.save((err, first)=>{
            if(err){
              reject(err);
            }else{
              var last = new this.ListContainer({
                _cid: Util.uuid(),
                type: '_end',
              });
            
              last.save((err, last)=>{
                if(err){
                  reject(err);
                }else{
                  first.next = last._cid;
                  first.save((err, first)=>{
                    if(err){
                      reject(err);
                    }else{
                      var delta = {};
                      delta[name] = [first._cid, last._cid];
                  
                      ParentModel.update({_cid: parentId}, delta, (err)=> {
                        if(err){
                          reject(err);
                        }else{
                          resolve(last._cid);
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }else{
          this.findEndPoints(ParentModel, parentId, name).then((res: any) =>{
            resolve(res.end._cid);
          }, (err) =>{
            reject(err);
          });
        }
      });
    });
  }
  
  // Returns the id of the new container
  private insertContainerBefore(ParentModel:IMongooseModel, parentId, name, nextId, itemKey, opts): Promise<void>
  {
    return new Promise<void>((resolve, reject) => {
      var newContainer = new this.ListContainer({
        _cid: opts.cid || Util.uuid(),
        next: nextId,
        modelId: itemKey
      });
    
      newContainer.save((err, newContainer)=>{
        if(err) return reject(err);
      
        this.ListContainer.update({next: nextId}, {next: newContainer._cid}, (err)=>{
          if(err){
            // rollback
            newContainer.remove();
            return reject(err);
          }
          var delta = {};
          delta[name] = newContainer._cid;
          ParentModel.update({_cid: parentId}, {$push: delta}, (err)=>{
            if(err) reject(err);
            else resolve(newContainer._cid);
          });
        });
      });
    });
  }

  all(keyPath: string[], query: {}, opts: {}): Promise<any[]>
  {  
    var all = [];
    var traverse = (kp) => this.next(keyPath, kp, opts).then((next) => {
      if(next){
        all.push(next);
        return traverse(next.id);
      }
    });
    
    return traverse(null).then(() => all);
  }

  private next(keyPath: string[], id: string, opts: {}): Promise<{id: string; keyPath: string; doc: any;}>
  {
    return this.getModel(keyPath).then<any>((found) => {
      var ParentModel = found.Model;
      var parentId = keyPath[keyPath.length-2];
      var seqName = _.last(keyPath);

      return this.findContainer(ParentModel, parentId, seqName, id).then((container: any)=>{
        if(container){
          return this.findContainer(ParentModel, parentId, seqName, container.next).then((container: any)=>{
            if(container.type === '_rip'){ //tombstone
              return this.next(keyPath, container._cid, opts);
            }else if(container.type !== '_end'){
              var kp = parseKey(container.modelId);
              return this.fetch(kp).then((doc)=>{
                return {
                  id: container._cid,
                  keyPath: kp,
                  doc: doc
                }
              })
            }
          });
        }
      });
    });
  }

  insertBefore(keyPath: string[], refId: string, itemKeyPath: string[], opts): Promise<{id: string; refId: string;}>
  {
    return this.getModel(keyPath).then<any>((found) => {
      var ParentModel = found.Model;
      var parentId = keyPath[keyPath.length-2];
      var seqName = _.last(keyPath);
        
      return this.initSequence(ParentModel, parentId, seqName).then((endPointId: string) => {
        refId = refId ? refId : endPointId;
        
        return this.insertContainerBefore(ParentModel,
                                          parentId,
                                          seqName,
                                          refId,
                                          makeKey(itemKeyPath), 
                                          opts).then((newId) => {
          return {
            id: newId,
            refId: refId === endPointId ? null : refId
          };
        });
      });
    });
  }

  deleteItem(keyPath: string[], id: string, opts: {}): Promise<void>
  {
    return this.getModel(keyPath).then<void>((found) => {
      var ParentModel = found.Model;
      var modelId = keyPath[keyPath.length-2];
      var seqName = _.last(keyPath);

      return this.findContainer(ParentModel, modelId, seqName, id).then((container: any)=>{
        if(container && container.type !== '_rip'){
          return this.removeFromSeq(container._cid);
        }
      });
    });
  }
  
  private getModel(keyPath: string[]): Promise<FoundModel>
  {
    //
    // ex. /cars/1234/engines/3456/carburetors
    //
    return new Promise((resolve, reject) => {
      var last = keyPath.length - 1;
      var index = last - last & 1;
      var bucket = keyPath[index]; //TODO rename?
    
      if(bucket in this.models){
        resolve({
          Model: this.models[bucket], 
          id: this.models[keyPath[last]]
        });
      }else{
        console.log("Model not found:", keyPath);
        reject(Error(''+ServerError.MODEL_NOT_FOUND));
      }
    });
  }

}

}
