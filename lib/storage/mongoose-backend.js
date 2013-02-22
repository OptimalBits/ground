var Gnd;
(function (Gnd) {
    var mongoose = require('mongoose')
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
                keyPath: [
                    {
                        type: String
                    }
                ],
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
            console.log('-----------');
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
        MongooseStorage.prototype.findContainer = function (Model, id, name, modelId, cb) {
            var _this = this;
            switch(modelId) {
                case '_begin': {
                    this.findEndPoints(Model, id, name, function (err, begin, end) {
                        cb(err, begin);
                    });
                    break;

                }
                case '_end': {
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
        MongooseStorage.prototype.findEndPoints = function (Model, id, name, cb) {
            var _this = this;
            Model.findById(id).exec(function (err, doc) {
                _this.listContainer.find().where('_id').in(doc[name]).or([
                    {
                        type: '_begin'
                    }, 
                    {
                        type: '_end'
                    }
                ]).exec(function (err, docs) {
                    cb(err, _.find(docs, function (doc) {
                        return doc.type === '_begin';
                    }), _.find(docs, function (doc) {
                        return doc.type === '_end';
                    }));
                });
            });
        };
        MongooseStorage.prototype.initSequence = function (Model, id, name, cb) {
            var _this = this;
            Model.findById(id).exec(function (err, doc) {
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
        MongooseStorage.prototype.insertContainerBefore = function (Model, id, name, refContainerId, itemKeyPath, opts, cb) {
            var _this = this;
            this.listContainer.findById(refContainerId).exec(function (err, doc) {
                var prevId = doc.prev;
                var newContainer = new _this.listContainer({
                    prev: prevId,
                    next: refContainerId,
                    keyPath: itemKeyPath,
                    modelId: _.last(itemKeyPath)
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
        MongooseStorage.prototype.insertContainerAfter = function (Model, id, name, refContainerId, itemKeyPath, opts, cb) {
            var _this = this;
            this.listContainer.findById(refContainerId).exec(function (err, doc) {
                var nextId = doc.next;
                var newContainer = new _this.listContainer({
                    prev: refContainerId,
                    next: nextId,
                    keyPath: itemKeyPath,
                    modelId: _.last(itemKeyPath)
                });
                newContainer.save(function (err, newContainer) {
                    _this.listContainer.update({
                        _id: refContainerId
                    }, {
                        next: newContainer._id
                    }, function (err) {
                        _this.listContainer.update({
                            _id: nextId
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
        MongooseStorage.prototype.insert = function (keyPath, index, doc, cb) {
            this.getSequence(keyPath, function (err, seqDoc, seq) {
                if(!err) {
                    if(index >= 0) {
                        seq.splice(index, 0, doc);
                    } else {
                        seq.push(doc);
                    }
                    seqDoc.save(cb);
                } else {
                    cb(err);
                }
            });
        };
        MongooseStorage.prototype.extract = function (keyPath, index, cb) {
            this.getSequence(keyPath, function (err, seqDoc, seq) {
                if(!err) {
                    var docs = seq.splice(index, 1);
                    console.log(docs);
                    seqDoc.save(function (err) {
                        cb(err, docs[0]);
                    });
                } else {
                    cb(err);
                }
            });
        };
        MongooseStorage.prototype.all = function (keyPath, cb) {
            this.getSequence(keyPath, function (err, seqDoc, seq) {
                if(!err) {
                    cb(err, seq);
                } else {
                    cb(err);
                }
            });
        };
        MongooseStorage.prototype.first = function (keyPath, opts, cb) {
            this.next(keyPath, [
                '##', 
                '_begin'
            ], opts, cb);
        };
        MongooseStorage.prototype.last = function (keyPath, opts, cb) {
            this.prev(keyPath, [
                '##', 
                '_end'
            ], opts, cb);
        };
        MongooseStorage.prototype.next = function (keyPath, refItemKeyPath, opts, cb) {
            var _this = this;
            this.getModel(keyPath, function (Model) {
                var id = keyPath[keyPath.length - 2];
                var seqName = _.last(keyPath);
                _this.findContainer(Model, id, seqName, _.last(refItemKeyPath), function (err, container) {
                    if(err) {
                        return cb(err);
                    }
                    _this.listContainer.findById(container.next).exec(function (err, nextContainer) {
                        _this.fetch(nextContainer.keyPath, cb);
                    });
                });
            }, cb);
        };
        MongooseStorage.prototype.prev = function (keyPath, refItemKeyPath, opts, cb) {
            var _this = this;
            this.getModel(keyPath, function (Model) {
                var id = keyPath[keyPath.length - 2];
                var seqName = _.last(keyPath);
                _this.findContainer(Model, id, seqName, _.last(refItemKeyPath), function (err, container) {
                    if(err) {
                        return cb(err);
                    }
                    _this.listContainer.findById(container.prev).exec(function (err, nextContainer) {
                        _this.fetch(nextContainer.keyPath, cb);
                    });
                });
            }, cb);
        };
        MongooseStorage.prototype.pop = function (keyPath, opts, cb) {
        };
        MongooseStorage.prototype.shift = function (keyPath, opts, cb) {
        };
        MongooseStorage.prototype.push = function (keyPath, itemKeyPath, opts, cb) {
            this.insertBefore(keyPath, [
                '##', 
                '_end'
            ], itemKeyPath, opts, cb);
        };
        MongooseStorage.prototype.unshift = function (keyPath, itemKeyPath, opts, cb) {
            this.insertAfter(keyPath, [
                '##', 
                '_begin'
            ], itemKeyPath, opts, cb);
        };
        MongooseStorage.prototype.insertBefore = function (keyPath, refItemKeyPath, itemKeyPath, opts, cb) {
            var _this = this;
            if(_.isFunction(opts)) {
                cb = opts;
            }
            this.getModel(keyPath, function (Model) {
                var id = keyPath[keyPath.length - 2];
                var seqName = _.last(keyPath);
                _this.initSequence(Model, id, seqName, function (err, first, last) {
                    var refContainer = _this.findContainer(Model, id, seqName, _.last(refItemKeyPath), function (err, refContainer) {
                        _this.insertContainerBefore(Model, id, seqName, refContainer._id, itemKeyPath, opts, cb);
                    });
                });
            }, cb);
        };
        MongooseStorage.prototype.insertAfter = function (keyPath, refItemKeyPath, itemKeyPath, opts, cb) {
            var _this = this;
            if(_.isFunction(opts)) {
                cb = opts;
            }
            this.getModel(keyPath, function (Model) {
                var id = keyPath[keyPath.length - 2];
                var seqName = _.last(keyPath);
                _this.initSequence(Model, id, seqName, function (err, first, last) {
                    var refContainer = _this.findContainer(Model, id, seqName, _.last(refItemKeyPath), function (err, refContainer) {
                        _this.insertContainerAfter(Model, id, seqName, refContainer._id, itemKeyPath, opts, cb);
                    });
                });
            }, cb);
        };
        MongooseStorage.prototype.deleteItem = function (keyPath, itemKeyPath, opts, cb) {
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
