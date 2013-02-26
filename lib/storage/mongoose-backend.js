var Gnd;
(function (Gnd) {
    var mongoose = require('mongoose')
    function makeKey(keyPath) {
        return keyPath.join('@');
    }
    function parseKey(key) {
        return key.split('@');
    }
    var MongooseStorage = (function () {
        function MongooseStorage(models, sync) {
            this.models = models;
            this.sync = sync;
            this.listContainer = mongoose.model('ListContainer', new mongoose.Schema({
                type: {
                    type: String
                },
                prev: {
                    type: mongoose.Schema.ObjectId,
                    ref: 'ListContainer'
                },
                next: {
                    type: mongoose.Schema.ObjectId,
                    ref: 'ListContainer'
                },
                modelId: {
                    type: String
                }
            }));
        }
        MongooseStorage.prototype.create = function (keyPath, doc, cb) {
            this.getModel(keyPath, function (Model) {
                var instance = new Model(doc);
                instance.save(function (err, doc) {
                    doc.__rev = 0;
                    cb(err, doc._id);
                });
            }, cb);
        };
        MongooseStorage.prototype.put = function (keyPath, doc, cb) {
            this.getModel(keyPath, function (Model) {
                Model.findByIdAndUpdate(_.last(keyPath), doc, function (err, oldDoc) {
                    if(!err && !_.isEqual(doc, oldDoc)) {
                    }
                    cb(err);
                });
            }, cb);
        };
        MongooseStorage.prototype.fetch = function (keyPath, cb) {
            this.getModel(keyPath, function (Model) {
                Model.findById(_.last(keyPath), function (err, doc) {
                    if(doc) {
                        cb(err, doc);
                    } else {
                        cb(err || new Error("Document not found"));
                    }
                });
            }, cb);
        };
        MongooseStorage.prototype.del = function (keyPath, cb) {
            this.getModel(keyPath, function (Model) {
                Model.remove({
                    _id: _.last(keyPath)
                }, cb);
            }, cb);
        };
        MongooseStorage.prototype.add = function (keyPath, itemsKeyPath, itemIds, opts, cb) {
            var _this = this;
            console.log('---add--------');
            console.log(keyPath);
            if(_.isFunction(opts)) {
                cb = opts;
            }
            this.getModel(itemsKeyPath, function (Set) {
                console.log(itemsKeyPath);
                if(Set && Set.parent) {
                    var doc = {
                    };
                    console.log(Set.parent());
                    doc[Set.parent()] = keyPath[keyPath.length - 2];
                    Set.update({
                        _id: {
                            $in: itemIds
                        }
                    }, doc, function (err) {
                        if(!err) {
                        }
                        cb(err);
                    });
                } else {
                    console.log(':::::');
                    console.log(keyPath);
                    _this.getModel(keyPath, function (Model) {
                        var id = keyPath[keyPath.length - 2];
                        console.log(Model.add);
                        console.log(keyPath);
                        if(Model.add) {
                            var setName = _.last(keyPath);
                            Model.add(id, setName, itemIds, function (err, ids) {
                                if(!err) {
                                }
                                cb(err);
                            });
                        } else {
                            console.log(33);
                            cb(new Error("No parent or add function available"));
                        }
                    }, cb);
                }
            }, cb);
        };
        MongooseStorage.prototype.remove = function (keyPath, itemsKeyPath, itemIds, opts, cb) {
            var _this = this;
            if(itemIds.length === 0) {
                cb(null);
            }
            if(_.isFunction(opts)) {
                cb = opts;
            }
            this.getModel(itemsKeyPath, function (Set) {
                if(Set && Set.parent) {
                } else {
                    _this.getModel(keyPath, function (Model) {
                        var id = keyPath[keyPath.length - 2];
                        var setName = _.last(keyPath);
                        var update = {
                            $pullAll: {
                            }
                        };
                        update.$pullAll[setName] = itemIds;
                        Model.update({
                            _id: id
                        }, update, function (err) {
                            cb(err);
                        });
                    }, cb);
                }
            }, cb);
        };
        MongooseStorage.prototype.find = function (keyPath, query, options, cb) {
            var _this = this;
            this.getModel(keyPath, function (Model) {
                if(keyPath.length === 1) {
                    return _this.findAll(Model, cb);
                } else {
                    var id = keyPath[keyPath.length - 2];
                    var setName = _.last(keyPath);
                    return _this.findById(Model, id, setName, query, options, cb);
                }
            }, cb);
        };
        MongooseStorage.prototype.findAll = function (Model, cb) {
            Model.find({
            }).exec(function (err, doc) {
                if(err) {
                    cb(err);
                } else {
                    cb(null, doc);
                }
            });
        };
        MongooseStorage.prototype.findById = function (Model, id, setName, query, options, cb) {
            var query = query || {
                fields: null,
                cond: null,
                options: null
            };
            Model.findById(id).select(setName).populate(setName, query.fields, query.cond, query.options).exec(function (err, doc) {
                if(err) {
                    cb(err);
                } else {
                    cb(null, doc && doc[setName]);
                }
            });
        };
        MongooseStorage.prototype.findContainerOfModel = function (Model, id, name, modelId, cb) {
            var _this = this;
            console.log('fcom');
            console.log(modelId);
            switch(modelId) {
                case '##@_begin': {
                    this.findEndPoints(Model, id, name, function (err, begin, end) {
                        cb(err, begin);
                    });
                    break;

                }
                case '##@_end': {
                    this.findEndPoints(Model, id, name, function (err, begin, end) {
                        cb(err, end);
                    });
                    break;

                }
                default: {
                    Model.findById(id).exec(function (err, doc) {
                        _this.listContainer.find().where('_id').in(doc[name]).where('modelId').equals(modelId).exec(function (err, docs) {
                            if(docs.length !== 1) {
                                return cb(Error('no unique container found for model'));
                            }
                            cb(err, docs[0]);
                        });
                    });

                }
            }
        };
        MongooseStorage.prototype.findContainer = function (Model, id, name, containerId, cb) {
            var _this = this;
            if(!containerId) {
                this.findEndPoints(Model, id, name, function (err, begin, end) {
                    _this.findContainer(Model, id, name, begin.next, cb);
                });
            } else {
                this.listContainer.find().where('_id').equals(containerId).exec(function (err, docs) {
                    if(docs.length !== 1) {
                        return cb(Error('container ' + containerId + ' not found'));
                    }
                    cb(err, docs[0]);
                });
            }
        };
        MongooseStorage.prototype.findEndPoints = function (Model, id, name, cb) {
            var _this = this;
            console.log('ep');
            console.log(id);
            Model.findById(id).exec(function (err, doc) {
                if(err) {
                    return cb(err);
                }
                _this.listContainer.find().where('_id').in(doc[name]).or([
                    {
                        type: '_begin'
                    }, 
                    {
                        type: '_end'
                    }
                ]).exec(function (err, docs) {
                    console.log(docs);
                    if(docs.length < 2) {
                        return cb(Error('could not find end points'));
                    }
                    cb(err, _.find(docs, function (doc) {
                        return doc.type === '_begin';
                    }), _.find(docs, function (doc) {
                        return doc.type === '_end';
                    }));
                });
            });
        };
        MongooseStorage.prototype.removeFromSeq = function (containerId, cb) {
            this.listContainer.update({
                _id: containerId
            }, {
                $set: {
                    type: '_rip'
                }
            }, cb);
        };
        MongooseStorage.prototype.initSequence = function (Model, id, name, cb) {
            var _this = this;
            Model.findById(id).exec(function (err, doc) {
                console.log('---init sequence---');
                console.log(doc);
                console.log(err);
                if(doc[name].length < 2) {
                    console.log('creating first and last');
                    var first = new _this.listContainer({
                        type: '_begin'
                    });
                    first.save(function (err, first) {
                        var last = new _this.listContainer({
                            type: '_end',
                            prev: first._id
                        });
                        last.save(function (err, last) {
                            first.next = last._id;
                            first.save(function (err, first) {
                                Model.update({
                                    _id: id
                                }, {
                                    animals: [
                                        first._id, 
                                        last._id
                                    ]
                                }, function (err) {
                                    cb(null, first, last);
                                });
                            });
                        });
                    });
                } else {
                    _this.findEndPoints(Model, id, name, cb);
                }
            });
        };
        MongooseStorage.prototype.insertContainerBefore = function (Model, id, name, refContainerId, itemKey, opts, cb) {
            var _this = this;
            this.listContainer.findById(refContainerId).exec(function (err, doc) {
                var prevId = doc.prev;
                var newContainer = new _this.listContainer({
                    prev: prevId,
                    next: refContainerId,
                    modelId: itemKey
                });
                newContainer.save(function (err, newContainer) {
                    _this.listContainer.update({
                        _id: prevId
                    }, {
                        next: newContainer._id
                    }, function (err) {
                        _this.listContainer.update({
                            _id: refContainerId
                        }, {
                            prev: newContainer._id
                        }, function (err) {
                            var delta = {
                            };
                            delta[name] = newContainer._id;
                            Model.update({
                                _id: id
                            }, {
                                $push: delta
                            }, function (err) {
                                cb(err);
                            });
                        });
                    });
                });
            });
        };
        MongooseStorage.prototype.all = function (keyPath, query, opts, cb) {
            var _this = this;
            var all = [];
            console.log('--a--l--l--');
            var traverse = function (id) {
                _this.next(keyPath, id, opts, function (err, next) {
                    if(!next) {
                        return cb(null, all);
                    }
                    all.push(next);
                    traverse(next.id);
                });
            };
            traverse(null);
        };
        MongooseStorage.prototype.next = function (keyPath, containerId, opts, cb) {
            var _this = this;
            this.getModel(keyPath, function (Model) {
                var id = keyPath[keyPath.length - 2];
                var seqName = _.last(keyPath);
                _this.findContainer(Model, id, seqName, containerId, function (err, container) {
                    _this.findContainer(Model, id, seqName, container.next, function (err, container) {
                        console.log('cont');
                        console.log(container);
                        if(container.type === '_rip') {
                            _this.next(keyPath, container._id, opts, cb);
                        } else {
                            if(container.type === '_end') {
                                cb(null);
                            } else {
                                var kp = parseKey(container.modelId);
                                _this.fetch(kp, function (err, doc) {
                                    console.log('doc');
                                    console.log(doc);
                                    if(err) {
                                        return cb(err);
                                    }
                                    cb(null, {
                                        id: container._id,
                                        keyPath: kp,
                                        doc: doc
                                    });
                                });
                            }
                        }
                    });
                });
            }, cb);
        };
        MongooseStorage.prototype.insertBefore = function (keyPath, id, itemKeyPath, opts, cb) {
            var _this = this;
            if(_.isFunction(opts)) {
                cb = opts;
            }
            console.log('insert before');
            console.log(itemKeyPath);
            this.getModel(keyPath, function (Model) {
                var modelId = keyPath[keyPath.length - 2];
                var seqName = _.last(keyPath);
                _this.initSequence(Model, modelId, seqName, function (err, begin, end) {
                    if(!id) {
                        id = end._id;
                    }
                    _this.insertContainerBefore(Model, id, seqName, id, makeKey(itemKeyPath), opts, cb);
                });
            }, cb);
        };
        MongooseStorage.prototype.set = function (keyPath, itemKeyPath, cb) {
            cb(Error('operation not supported'));
        };
        MongooseStorage.prototype.deleteItem = function (keyPath, itemKeyPath, opts, cb) {
            var _this = this;
            console.log('delitem');
            console.log(itemKeyPath);
            this.getModel(keyPath, function (Model) {
                var id = keyPath[keyPath.length - 2];
                var seqName = _.last(keyPath);
                _this.findContainerOfModel(Model, id, seqName, makeKey(itemKeyPath), function (err, container) {
                    if(!container || container.type === '_rip') {
                        return cb(Error('Tried to delete a non-existent item'));
                    }
                    _this.removeFromSeq(container._id, cb);
                });
            }, cb);
        };
        MongooseStorage.prototype.getModel = function (keyPath, cb, errCb) {
            var last = keyPath.length - 1;
            var index = last - last & 1;
            var collection = keyPath[index];
            if(collection in this.models) {
                cb(this.models[collection], this.models[keyPath[last]]);
            } else {
                errCb(new Error("Model not found"));
            }
        };
        MongooseStorage.prototype.getSequence = function (keyPath, cb) {
            this.getModel(_.initial(keyPath, 2), function (Model) {
                var seqName = _.last(keyPath);
                var id = keyPath[keyPath.length - 2];
                Model.findById(id).select(seqName).exec(function (err, seqDoc) {
                    console.log('-----get sq----');
                    console.log(seqDoc);
                    if(!err) {
                        cb(err, seqDoc, seqDoc[seqName]);
                    } else {
                        cb(err);
                    }
                });
            }, cb);
        };
        return MongooseStorage;
    })();
    Gnd.MongooseStorage = MongooseStorage;    
})(Gnd || (Gnd = {}));
