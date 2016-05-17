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

/*
declare module 'mongoose' {
  export interface Schema {
    constructor(def: {});
    //static ObjectId : any;
  }
  export function model (name: string, schema: Schema) : any;
}
*/

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
    parent?: () => string;
    // gnd?: { add: (id: string, name: string, itemIds: string[], cb: (err: Error, ids: string[])=>void)=>void};
    add?: any;
  }

  export interface IMongooseModel extends GndModel {
    new (doc: {}): any;
    update(query: {}, args: {}, cb: (err: Error, num: any) => void);
    update(query: {}, args: {}): Promise<Number>;

    findOneAndUpdate(conditions?: {}, update?: {}, cb?: (err: Error, doc: {}) => void);
    findOneAndUpdate(conditions?: {}, update?: {}, options?: {}, cb?: (err: Error, doc: {}) => void);
    findByIdAndUpdate(id: string, update?: {}, cb?: (err: Error, doc: {}) => void);
    findById(id: string, cb: (err: Error, doc?: any) => void): any;
    findOne(conditions: {}, fields?: {}, options?: {}, cb?: (err: Error, docs?: any) => void): any;
    find(conditions: {}, fields?: {}, options?: {}, cb?: (err: Error, docs?: any[]) => void): any;
    findById(id: string, fields?: string): any;
    findById(id: string): any;
    remove(query: {}): Promise<void>;
  }

  interface FoundModel {
    Model: IMongooseModel;
    id: string;
  }

  export interface IModels {
    [indexer: string]: IModel;
  }

  export interface IMongooseModels {
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

    constructor(mongoose, models: IModels, legacy?: IMongooseModels) {
      this.ListContainer = mongoose.model('ListContainer', new mongoose.Schema({
        _cid: { type: String, index: true },
        type: { type: String, enum: ['_begin', '_end', '_rip'], index: true },
        modelId: String,
        next: { type: String, index: true }  //{ type: mongoose.Schema.ObjectId, ref: 'ListContainer' }
      }));

      this.mongoose = mongoose;
      this.compileModels(models, mongoose, legacy);
    }

    addModel(name: string, model: IModel) {
      var nameMapping = this.nameMapping = this.nameMapping || {};
      nameMapping[model.__bucket] = name;

      this.compileModel(name, model, this.mongoose, nameMapping);
    }

    private compileModel(name: string, model: IModel, mongoose, nameMapping) {
      var schema = model.schema();
      var bucket = model.__bucket;

      if (bucket) {
        var translated = this.translateSchema(mongoose, nameMapping, schema);
        // Disable key versioning (hack from mongoose not recommended to use)
        translated.__v = { type: Number, select: false };
        var mongooseSchema =
          new mongoose.Schema(translated, { strict: false, versionKey: false });
        // new mongoose.Schema(translated); // strict false is just temporary...

        var extra = model['__mongoose'];

        if (extra) {

          if (extra.methods) {
            mongooseSchema.methods = mongooseSchema.methods || {};
            _.extend(mongooseSchema.methods, extra.methods);
          }

          if (extra.statics) {
            mongooseSchema.statics = mongooseSchema.statics || {};
            _.extend(mongooseSchema.statics, extra.statics);
          }

          if (extra.pre) {
            _.each(extra.pre, function (fn, method) {
              mongooseSchema.pre(method, fn);
            })
          }
          if (extra.post) {
            _.each(extra.post, function (fn, method) {
              mongooseSchema.post(method, fn);
            })
          }
        }

        this.models[bucket] =
          mongoose.model(name, mongooseSchema, bucket);

        if (extra) {
          this.models[bucket]['extra'] = extra;
        }

        if (model['filter']) {
          this.models[bucket]['filter'] = model['filter'];
        }

        if (model['hooks']) {
          this.models[bucket]['gnd-hooks'] = model['hooks'];
        }

        this.models[bucket]['gnd-schema'] = schema;
      }
    }

    /**
      Compiles Gnd models into Mongoose Models.
    */
    private compileModels(models: IModels, mongoose, legacy?) {
      var nameMapping = this.nameMapping = this.nameMapping || {};
      for (var name in models) {
        var model = models[name];
        nameMapping[model.__bucket] = name;
      }
      for (var bucket in legacy) {
        nameMapping[bucket] = legacy[bucket].modelName;
      }

      for (var name in models) {
        this.compileModel(name, models[name], mongoose, nameMapping);
      }

      legacy && _.extend(this.models, legacy);
    }

    private translateDefinition(mongoose, mapping, definition) {
      var res;

      if (definition.type) {
        res = _.clone(definition);
      } else {
        res = { type: definition };
      }

      if (res.type.__schema) {
        return this.translateSchema(mongoose, mapping, res.type.__schema);
      }

      if (res.type instanceof Array && res.type.length) {
        return [this.translateDefinition(mongoose, mapping, res.type[0])];
      }

      if (_.isPlainObject(res.type)) {
        return this.translateSchema(mongoose, mapping, new Schema(res.type));
      }

      switch (res.type) {
        case Gnd.Schema.ObjectId:
          res.type = String;
          break;
        case Gnd.Schema.Mongo.ObjectId:
          res.type = mongoose.Schema.Types.ObjectId;
          break;
        case Gnd.Schema.Abstract:
          break;
        case Gnd.Sequence:
        case Gnd.Collection:
          if (!mapping[res.ref.model.__bucket]) {
            throw new Error("Model bucket " + res.ref.model.__bucket + " does not have a valid mapping name");
          } else {
            res = {
              type: [{ type: String, ref: mapping[res.ref.bucket] }],
              select: false
            };
          }
          break;
      }
      return res;
    }

    private translateSchema(mongoose, mapping, schema: Schema): any {
      // Translate ObjectId, Sequences and Collections since they have special
      // syntax.
      return schema.map((key, value) => {
        if (key != '_id') {
          var res;
          if (value instanceof Schema) {
            return this.translateSchema(mongoose, mapping, value);
          }

          return this.translateDefinition(mongoose, mapping, value.definition);
        }
      });
    }

    create(keyPath: string[], doc: any): Promise<string> {
      if (!doc._cid) {
        doc._cid = Util.uuid();
      }
      return this.getModel(keyPath).then<string>((found) => {
        return new Promise<string>((resolve, reject) => {
          if (found.Model['filter']) {
            found.Model['filter'](doc, (err, doc) => {
              if (!err) {
                create(doc);
              }
            });
          } else {
            create(doc);
          }

          function create(doc) {
            var instance = new found.Model(doc);
            instance.save(function (err, doc) {
              if (!err) {
                doc.__rev = 0;
                resolve(doc._cid);
              } else {
                reject(err);
              }
            });
          }
        });
      });
    }

    put(keyPath: string[], doc: any): Promise<void> {
      return this.getModel(keyPath).then<void>(function (found) {
        return new Promise<void>((resolve, reject) => {
          if (found.Model['filter']) {
            found.Model['filter'](doc, (err, doc) => {
              if (err) {
                reject(err);
              } else {
                update(doc);
              }
            });
          } else {
            update(doc);
          }
          function update(doc) {
            found.Model.findOneAndUpdate({ _cid: _.last(keyPath) }, doc).lean().exec((err, oldDoc) => {
              if (err) {
                reject(err);
              } else {
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
    fetch(keyPath: string[], fields?: string): Promise<any> {
      fields = fields || '-__v';
      return this.getModel(keyPath).then((found) => {
        return found.Model.findOne({ _cid: _.last(keyPath) })
          .select(fields)
          .lean()
          .exec().then((doc) => {
            if (doc) {
              var hooks = found.Model['gnd-hooks'];
              if (hooks && hooks.fetch) {
                return hooks.fetch(this, doc);
              } else {
                return doc;
              }
            } else {
              throw {
                code: ServerError.DOCUMENT_NOT_FOUND,
                msg: 'Document not found ' + keyPath
              };
            }
          }).then((doc) => {
            if (hasFetchPost(found.Model)) {
              return fetchPost(found.Model, doc);
            } else {
              return doc;
            }
          });
      });
    }

    del(keyPath: string[]): Promise<void> {
      return this.getModel(keyPath).then<void>((found) => {
        var extra = found.Model['extra'];
        if (extra && extra.pre && extra.pre.remove) {
          // Slower remove needed to apply middleware
          found.Model.findOne({ _cid: _.last(keyPath) }).then(function (doc) {
            if (doc) {
              return doc.remove();
            }
          });
        } else {
          // Faster remove
          return found.Model.remove({ _cid: _.last(keyPath) });
        }
      });
    }

    add(keyPath: string[], itemsKeyPath: string[], itemIds: string[], opts: any): Promise<void> {
      return this.getModel(keyPath).then<void>((found) => {
        var id = keyPath[keyPath.length - 2];
        // TODO: instead of using keyPath, use the model schema type for this property
        // to determine the setName
        var setName = _.last(keyPath);
        if (found.Model.add) {
          return new Promise<void>((resolve, reject) => {
            return found.Model.add(id, setName, itemIds, (err, ids) => {
              if (!err) {
                // Use FindAndModify to get added items
                // sync.add(id, setName, ids);
                resolve();
              } else {
                reject(err);
              }
            });
          });
        } else {
          var update = { $addToSet: {} };
          update.$addToSet[setName] = { $each: itemIds };
          // Use FindAndModify to get added items
          // sync.add(id, setName, ids);
          return found.Model.update({ _cid: id }, update);
        }
      });
    }

    remove(keyPath: string[], itemsKeyPath: string[], itemIds: string[], opts: any): Promise<void> {
      if (itemIds.length === 0) return Promise.resolved<void>(); //nothing to do

      return this.getModel(keyPath).then<void>((found) => {
        var id = keyPath[keyPath.length - 2];
        var setName = _.last(keyPath);
        var update = { $pullAll: {} };
        update.$pullAll[setName] = itemIds;
        return found.Model.update({ _cid: id }, update);
        // TODO: Use FindAndModify to get the removed items as well
      });
    }

    find(keyPath: string[], query: Storage.IStorageQuery, opts?: {}): Promise<any[]> {
      var Model;
      return this.getModel(keyPath).then<any[]>((found) => {
        Model = found.Model;
        if (keyPath.length === 1) {
          return this.findAll(Model, query);
        } else {
          var id = keyPath[keyPath.length - 2];
          var setName = _.last(keyPath);
          return this.findById(Model, id, setName, query);
        }
      }).then<any[]>((docs: any[]) => {
        if (hasFetchPost(Model)) {
          return Promise.all<any>(_.map(docs, (doc) => fetchPost(Model, doc)));
        } else {
          return Promise.resolved(docs);
        }
      });
    }

    private findAll(Model: IMongooseModel, query: Storage.IStorageQuery): Promise<any[]> {
      query = query || {};
      return Model.find(query.cond, query.fields, query.opts).exec();
    }

    private findById(Model: IMongooseModel,
      id: string,
      setName: string,
      query: Storage.IStorageQuery): Promise<any[]> {
      query = query || {};

      return Model
        .findOne({ _cid: id })
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

          if (model) {
            if (doc && doc[setName]) {
              return this.populate(model, query, doc[setName]);
            } else {
              return Promise.resolved([]);
            }
          } else {
            throw {
              code: ServerError.MODEL_NOT_FOUND,
              msg: 'Collection model ' + setName + ' not found'
            }
          }
        });
    }

    private populate(Model: IMongooseModel, query: Storage.IStorageQuery, arr): Promise<any[]> {
      return Model
        .find(query.cond, query.fields, query.opts)
        .select('-v__')
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
    private findContainer(doc, parentId, name, id): Promise<any> {
      if (!id) {
        return this.findEndPoints(doc, parentId, name).then((res: any) => {
          return res ? res.begin : res;
        });
      } else {
        return this.ListContainer.find({ _cid: id }).lean().exec().then((docs) => {
          if (docs.length !== 1) {
            throw {
              code: ServerError.MISSING_SEQUENCE_CONTAINER,
              msg: 'container ' + id + ' not found'
            };
          }
          return docs[0];
        });
      }
    }

    private findEndPoints(doc, parentId, name): Promise<any> {
      if (!doc) {
        return Promise.rejected({
          code: ServerError.MISSING_SEQUENCE_ENDPOINTS,
          msg: 'could not find end points, parent: ' + parentId + 'seq: ' + name
        });
      } else if (doc[name] && doc[name].length > 0) {
        return this.ListContainer.find()
          .lean()
          .where('_cid').in(doc[name])
          .or([{ type: '_begin' }, { type: '_end' }])
          .exec()
          .then((docs) => {
            if (docs.length < 2) {
              throw {
                code: ServerError.MISSING_SEQUENCE_ENDPOINTS,
                msg: 'could not find end points, parent: ' + parentId + 'seq: ' + name
              };
            }

            return {
              begin: _.find(docs, (doc) => {
                return doc['type'] === '_begin';
              }),
              end: _.find(docs, (doc) => {
                return doc['type'] === '_end';
              })
            };
         });
      } else {
        return Promise.resolved();
      }
    }

    private removeFromSeq(containerId: string): Promise<void> {
      return this.ListContainer.update({ _cid: containerId }, { $set: { type: '_rip' } });
    }

    private initSequence(ParentModel: IMongooseModel, parentId, name): Promise<any> {
      return ParentModel.findOne({ _cid: parentId }).lean().select(name).exec().then(doc => {
        if (doc && doc[name].length < 2) {
          var last = new this.ListContainer({
            _cid: Util.uuid(),
            type: '_end',
          });
          var first = new this.ListContainer({
            _cid: Util.uuid(),
            type: '_begin',
            next: last._cid
          });
          var delta = {};
          delta[name] = [first._cid, last._cid];

          return Gnd.Promise.all<string>([
            first.save(),
            last.save(),
            ParentModel.update({ _cid: parentId }, delta)
          ]).then(function () {
            return last._cid;
          });
        } else {
          return this.findEndPoints(doc, parentId, name).then((res: any) => {
            return res.end._cid;
          });
          /*
          return this.findEndPoints(ParentModel, parentId, name).then((res: any) =>{
            return res.end._cid;
          });
          */
        }
      });
    }

    // Returns the id of the new container
    private insertContainerBefore(ParentModel: IMongooseModel, parentId, name, nextId, itemKey, opts): Promise<void> {
      var newContainer = new this.ListContainer({
        _cid: opts.cid || Util.uuid(),
        next: nextId,
        modelId: itemKey
      });

      return newContainer.save().then(() => {
        return this.ListContainer.update({ next: nextId }, { next: newContainer._cid });
      }).then(() => {
        var delta = {};
        delta[name] = newContainer._cid;
        return ParentModel.update({ _cid: parentId }, { $push: delta });
      }).then(() => {
        return newContainer._cid;
      }).catch((err) => {
        // rollback
        return newContainer.remove().then(() => {
          throw {
            code: ServerError.ERROR_INSERTING_CONTAINER,
            msg: 'Error inserting container' + err
          }
        });
      });
    }

    all(keyPath: string[], query: {}, opts: {}): Promise<any[]> {
      var all = [];
      var traverse = (kp) => this.next(keyPath, kp, opts).then((next) => {
        if (next) {
          all.push(next);
          return traverse(next.id);
        }
      });

      return traverse(null).then(() => all);
    }

    private next(keyPath: string[], id: string, opts: {}): Promise<{ id: string; keyPath: string; doc: any; }> {
      return this.getModel(keyPath).then<any>((found) => {
        var ParentModel = found.Model;
        var parentId = keyPath[keyPath.length - 2];
        var seqName = _.last(keyPath);

        return ParentModel.findOne({ _cid: parentId }).lean().select(seqName).exec().then(doc => {
          return this.findContainer(doc, parentId, seqName, id).then((container: any) => {
            if (container) {
              return this.findContainer(doc, parentId, seqName, container.next).then((container: any) => {
                if (container.type === '_rip') { //tombstone
                  return this.next(keyPath, container._cid, opts);
                } else if (container.type !== '_end') {
                  var kp = parseKey(container.modelId);
                  return this.fetch(kp).then((doc) => {
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
      });
    }

    insertBefore(keyPath: string[], refId: string, itemKeyPath: string[], opts): Promise<{ id: string; refId: string; }> {
      return this.getModel(keyPath).then<any>((found) => {
        var ParentModel = found.Model;
        var parentId = keyPath[keyPath.length - 2];
        var seqName = _.last(keyPath);

        if (!itemKeyPath) {
          var seqSchemaType = found.Model['gnd-schema'].definition[seqName];
          if (!(seqSchemaType instanceof SequenceSchemaType)) {
            throw {
              code: ServerError.NOT_SEQUENCE_TYPE,
              msg: 'Not a sequence type ' + keyPath
            };
          }

          itemKeyPath = [seqSchemaType.definition.ref.bucket];
        }

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

    deleteItem(keyPath: string[], id: string, opts: {}): Promise<void> {
      return this.getModel(keyPath).then<void>((found) => {
        var ParentModel = found.Model;
        var modelId = keyPath[keyPath.length - 2];
        var seqName = _.last(keyPath);

        return this.findContainer({}, modelId, seqName, id).then((container: any) => {
          if (container && container.type !== '_rip') {
            return this.removeFromSeq(container._cid);
          }
        });
      });
    }

    entity(keyPath: string[]): Promise<Entity> {
      var entity: Entity;

      //
      // Keypaths can only be of length 1, 2 or 3
      // length 1 -> collection
      // length 2 -> model
      // length 3 -> collection / sequence / model
      //
      switch (keyPath.length) {
        case 1:
          entity = {
            type: Storage.EntityType.Collection,
            bucket: keyPath[0]
          };
          break;
        case 2:
          entity = {
            type: Storage.EntityType.Model,
            bucket: keyPath[0]
          };
          break;
        case 3:
          return this.getModel(keyPath).then(function (obj) {
            var type;
            var schemaType = obj.Model['gnd-schema'].getSchemaType(keyPath[2]);
            if (schemaType instanceof Gnd.CollectionSchemaType) {
              type = Storage.EntityType.Collection;
            } else if (schemaType instanceof Gnd.SequenceSchemaType) {
              type = Storage.EntityType.Sequence;
            } else if (schemaType instanceof Gnd.ModelSchemaType) {
              type = Storage.EntityType.Model;
            }

            return {
              type: type,
              bucket: schemaType.definition.ref.bucket
            }
          });
        default:
          entity = {
            type: Storage.EntityType.Invalid,
            bucket: null
          }
      }
      return Gnd.Promise.resolved(entity);
    }

    entityType(keyPath: string[]): Promise<EntityType> {
      var type;
      //
      // Keypaths can only be of length 1, 2 or 3
      // length 1 -> collection
      // length 2 -> model
      // length 3 -> collection / sequence / model
      switch (keyPath.length) {
        case 1:
          type = Storage.EntityType.Collection;
          break;
        case 2:
          type = Storage.EntityType.Model;
          break;
        case 3:
          // TODO: Check in model schema and figure out the datatype for this
          // keypath.
          return this.getModel(keyPath).then(function (obj) {
            var schemaType = obj.Model['gnd-schema'].getSchemaType(keyPath[2]);

            if (schemaType instanceof Gnd.CollectionSchemaType) {
              return Storage.EntityType.Collection;
            } else if (schemaType instanceof Gnd.SequenceSchemaType) {
              return Storage.EntityType.Sequence;
            } else if (schemaType instanceof Gnd.ModelSchemaType) {
              return Storage.EntityType.Model;
            }
          });
        default:
          type = Storage.EntityType.Invalid;
      }
      return Gnd.Promise.resolved(type);
    }

    private getModel(keyPath: string[]): Promise<any> {
      //
      // ex. /cars/1234/engines/3456/carburetors
      //
      return new Promise((resolve, reject) => {
        var last = keyPath.length - 1;
        var index = last - last & 1;
        var bucket = keyPath[index]; //TODO rename?

        if (bucket in this.models) {
          resolve({
            Model: this.models[bucket],
            id: this.models[keyPath[last]]
          });
        } else {
          reject({
            code: ServerError.MODEL_NOT_FOUND,
            msg: 'Model not found ' + keyPath
          });
        }
      });
    }
  }

  function hasFetchPost(Model) {
    var extra = Model['extra'];
    return extra && extra.post && extra.post.fetch;
  }

  function fetchPost(Model: IMongooseModel, doc): Promise<any> {
    var extra = Model['extra'];
    return extra.post.fetch(Model, doc);
  }

}
