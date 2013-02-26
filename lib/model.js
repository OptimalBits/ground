var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Gnd;
(function (Gnd) {
    var Model = (function (_super) {
        __extends(Model, _super);
        function Model(args, bucket) {
            var _this = this;
                _super.call(this);
            this.__rev = 0;
            this._persisted = false;
            this._dirty = true;
            this._keepSynced = false;
            this._initial = true;
            _.extend(this, args);
            this._cid = this._id || this._cid || Gnd.Util.uuid();
            this.__bucket = bucket;
            this.on('changed:', function () {
                _this._dirty = true;
            });
            var listenToResync = function () {
                Model.storageQueue.on('resync:' + Gnd.Storage.Queue.makeKey(_this.getKeyPath()), function (doc) {
                    _this.set(doc, {
                        nosync: true
                    });
                    _this.emit('resynced:');
                });
            };
            if(Model.storageQueue) {
                if(this.isPersisted()) {
                    listenToResync();
                } else {
                    this.once('id', listenToResync);
                }
            }
        }
        Model.__bucket = "";
        Model.syncManager = null;
        Model.storageQueue = null;
        Model.extend = function extend(bucket) {
            var _this = this;
            function __(args, _bucket) {
                _this.call(this, args, bucket || _bucket);
            }
            ; ;
            __.prototype = this.prototype;
            __.prototype._super = this;
            _.extend(__, {
                __bucket: bucket,
                extend: this.extend,
                create: this.create,
                findById: this.findById,
                all: this.all,
                seq: this.seq,
                allModels: this.allModels,
                createModels: this.createModels,
                createSequenceModels: this.createSequenceModels,
                fromJSON: this.fromJSON,
                fromArgs: this.fromArgs
            });
            return __;
        }
        Model.create = function create(args, keepSynced, cb) {
            Gnd.overload({
                'Object Boolean Function': function (args, keepSynced, cb) {
                    this.fromJSON(args, function (err, instance) {
                        if(instance) {
                            keepSynced && instance.keepSynced();
                            if(!instance.isPersisted()) {
                                var id = instance.id();
                                Model.storageQueue.once('created:' + id, function (id) {
                                    instance.id(id);
                                });
                            }
                            instance.init(function () {
                                cb(null, instance);
                            });
                        } else {
                            cb(err);
                        }
                    });
                },
                'Object Function': function (args, cb) {
                    this.create(args, false, cb);
                }
            }).apply(this, arguments);
        }
        Model.findById = function findById(keyPathOrId, keepSynced, args, cb) {
            var _this = this;
            return Gnd.overload({
                'Array Boolean Object Function': function (keyPath, keepSynced, args, cb) {
                    Model.storageQueue.fetch(keyPath, function (err, doc) {
                        if(doc) {
                            _.extend(doc, args);
                            _this.create(doc, keepSynced, cb);
                        } else {
                            cb(err);
                        }
                    });
                    return this;
                },
                'String Boolean Object Function': function (id, keepSynced, args, cb) {
                    return this.findById([
                        this.__bucket, 
                        id
                    ], keepSynced, args, cb);
                },
                'String Function': function (id, cb) {
                    return this.findById(id, false, {
                    }, cb);
                },
                'String Boolean Function': function (id, keepSynced, cb) {
                    return this.findById(id, keepSynced, {
                    }, cb);
                },
                'String Object Function': function (id, args, cb) {
                    return this.findById(id, false, args, cb);
                }
            }).apply(this, arguments);
        }
        Model.removeById = function removeById(keypathOrId, cb) {
            var keypath = _.isArray(keypathOrId) ? keypathOrId : [
                this.__bucket, 
                keypathOrId
            ];
            Model.storageQueue.del(keypath, function (err) {
                cb(err);
            });
        }
        Model.fromJSON = function fromJSON(args, cb) {
            cb(null, new this(args));
        }
        Model.fromArgs = function fromArgs(args, cb) {
            this.fromJson(args, cb);
        }
        Model.prototype.destroy = function () {
            Model.syncManager && Model.syncManager.endSync(this);
            _super.prototype.destroy.call(this);
        };
        Model.prototype.init = function (fn) {
            fn(this);
        };
        Model.prototype.id = function (id) {
            if(id) {
                this._id = id;
                this._persisted = true;
                this.emit('id', id);
            }
            return this._id || this._cid;
        };
        Model.prototype.getName = function () {
            return "Model";
        };
        Model.prototype.getKeyPath = function () {
            return [
                this.__bucket, 
                this.id()
            ];
        };
        Model.prototype.isKeptSynced = function () {
            return this._keepSynced;
        };
        Model.prototype.isPersisted = function () {
            return this._persisted;
        };
        Model.prototype.bucket = function () {
            return this.__bucket;
        };
        Model.prototype.save = function (cb) {
            if(this._dirty) {
                this.update(this.toArgs(), cb);
            }
        };
        Model.prototype.update = function (args, cb) {
            var _this = this;
            var bucket = this.__bucket, id = this.id();
            cb = cb || function (err) {
            };
            if(this._initial) {
                args['_initial'] = this._initial = false;
                Model.storageQueue.once('created:' + id, function (id) {
                    _this.id(id);
                });
                Model.storageQueue.create([
                    bucket
                ], args, function (err, id) {
                    cb(err);
                });
            } else {
                Model.storageQueue.put([
                    bucket, 
                    id
                ], args, function (err) {
                    if(!err) {
                        _this.emit('updated:', _this, args);
                    }
                    cb(err);
                });
            }
        };
        Model.prototype.remove = function (cb) {
            var _this = this;
            cb = cb || function (err) {
            };
            Model.removeById(this.getKeyPath(), function (err) {
                Model.syncManager && Model.syncManager.endSync(_this);
                _this.emit('deleted:', _this.id());
                cb(err);
            });
        };
        Model.prototype.keepSynced = function () {
            var _this = this;
            if(this._keepSynced) {
                return;
            }
            this._keepSynced = true;
            var startSync = function () {
                Model.syncManager && Model.syncManager.startSync(_this);
            };
            if(this.isPersisted()) {
                startSync();
            } else {
                this.once('id', startSync);
            }
            this.on('changed:', function (doc, options) {
                if(!options || ((!options.nosync) && !_.isEqual(doc, options.doc))) {
                    _this.update(doc);
                }
            });
        };
        Model.prototype.toArgs = function () {
            var args = {
                _persisted: this._persisted,
                _cid: this._cid
            };
            for(var key in this) {
                if(!_.isUndefined(this[key]) && !_.isNull(this[key]) && !_.isFunction(this[key]) && (key[0] !== '_')) {
                    if(_.isFunction(this[key].toArgs)) {
                        args[key] = this[key].toArgs();
                    } else {
                        if(!_.isObject(this[key])) {
                            args[key] = this[key];
                        }
                    }
                }
            }
            return args;
        };
        Model.createModels = function createModels(docs, done) {
            var _this = this;
            var models = [];
            Gnd.Util.asyncForEach(docs, function (args, fn) {
                _this.create(args, function (err, instance) {
                    if(instance) {
                        models.push(instance);
                    }
                    fn(err);
                });
            }, function (err) {
                done(err, models);
            });
        }
        Model.createSequenceModels = function createSequenceModels(items, done) {
            var _this = this;
            var models = [];
            Gnd.Util.asyncForEach(items, function (item, fn) {
                _this.create(item.doc, function (err, instance) {
                    if(instance) {
                        models.push({
                            model: instance,
                            id: item.id
                        });
                    }
                    fn(err);
                });
            }, function (err) {
                done(err, models);
            });
        }
        Model.allModels = function allModels(cb) {
            var _this = this;
            Model.storageQueue.find([
                this.__bucket
            ], {
            }, {
            }, function (err, docs) {
                if(docs) {
                    _this.createModels(docs, cb);
                } else {
                    cb(err);
                }
            });
        }
        Model.all = function all(parent, args, bucket, cb) {
            var _this = this;
            function allInstances(parent, keyPath, args, cb) {
                Model.storageQueue.find(keyPath, {
                }, {
                }, function (err, docs) {
                    if(docs) {
                        _.each(docs, function (doc) {
                            _.extend(doc, args);
                        });
                        Gnd.Collection.create(_this, parent, docs, cb);
                    } else {
                        cb(err);
                    }
                });
            }
            Gnd.overload({
                'Model Array Object Function': function (parent, keyPath, args, cb) {
                    allInstances(parent, keyPath, args, cb);
                },
                'Model Object String Function': function (parent, args, bucket, cb) {
                    var keyPath = parent.getKeyPath();
                    keyPath.push(bucket);
                    allInstances(parent, keyPath, args, cb);
                },
                'Model Function': function (parent, cb) {
                    var keyPath = parent.getKeyPath();
                    keyPath.push(this.__bucket);
                    allInstances(parent, keyPath, {
                    }, cb);
                }
            }).apply(this, arguments);
        }
        Model.prototype.all = function (model, args, bucket, cb) {
            model.all(this, args, bucket, cb);
        };
        Model.seq = function seq(parent, args, bucket, cb) {
            var _this = this;
            function allInstances(parent, keyPath, args, cb) {
                Model.storageQueue.all(keyPath, {
                }, {
                }, function (err, items) {
                    if(items) {
                        Gnd.Sequence.create(_this, parent, items, cb);
                    } else {
                        cb(err);
                    }
                });
            }
            Gnd.overload({
                'Model Array Object Function': function (parent, keyPath, args, cb) {
                    allInstances(parent, keyPath, args, cb);
                },
                'Model Object String Function': function (parent, args, bucket, cb) {
                    var keyPath = parent.getKeyPath();
                    keyPath.push(bucket);
                    allInstances(parent, keyPath, args, cb);
                },
                'Model Function': function (parent, cb) {
                    var keyPath = parent.getKeyPath();
                    keyPath.push(this.__bucket);
                    allInstances(parent, keyPath, {
                    }, cb);
                }
            }).apply(this, arguments);
        }
        Model.prototype.seq = function (model, args, bucket, cb) {
            model.seq(this, args, bucket, cb);
        };
        return Model;
    })(Gnd.Base);
    Gnd.Model = Model;    
})(Gnd || (Gnd = {}));
