var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Gnd;
(function (Gnd) {
    var Collection = (function (_super) {
        __extends(Collection, _super);
        function Collection(model, parent, items) {
            var _this = this;
                _super.call(this);
            this._keepSynced = false;
            this._added = [];
            this._removed = [];
            this.sortOrder = 'asc';
            this.filterFn = null;
            this.count = 0;
            var self = this;
            this.updateFn = function (args) {
                if(self.sortByFn) {
                    var index = self['indexOf'](this);
                    self.items.splice(index, 1);
                    self.sortedAdd(this);
                }
                self.emit('updated:', this, args);
            };
            this.deleteFn = function (itemId) {
                _this.remove(itemId, false, Gnd.Util.noop);
            };
            this.items = items || [];
            this.initItems(this.items);
            this.model = model;
            this.parent = parent;
            this.on('sortByFn sortOrder', function (fn) {
                var oldItems = _this.items;
                if(_this.sortByFn) {
                    _this.items = _this['sortBy'](_this.sortByFn);
                }
                (_this.sortOrder == 'desc') && _this.items.reverse();
                _this.emit('sorted:', _this.items, oldItems);
            });
            if(parent) {
                if(parent.isPersisted()) {
                    this.listenToResync();
                } else {
                    parent.once('id', function () {
                        _this.listenToResync();
                    });
                }
            } else {
                this.listenToResync();
            }
        }
        Collection.prototype.destroy = function () {
            this._keepSynced && this.endSync();
            this.deinitItems(this.items);
            this.items = null;
            _super.prototype.destroy.call(this);
        };
        Collection.create = function create(model, parent, docs, cb) {
            var _this = this;
            return Gnd.overload({
                'Function Model Array': function (model, parent, models) {
                    var collection = new Collection(model, parent, models);
                    Gnd.Util.release(models);
                    if(parent && parent.isKeptSynced()) {
                        collection.keepSynced();
                    }
                    collection.count = models.length;
                    return collection;
                },
                'Function Model Array Function': function (model, parent, items, cb) {
                    model.createModels(items, function (err, models) {
                        if(err) {
                            cb(err);
                        } else {
                            cb(err, _this.create(model, parent, models));
                        }
                    });
                },
                'Function Array Function': function (model, items, cb) {
                    this.create(model, undefined, items, cb);
                },
                'Function Model Function': function (model, parent, cb) {
                    this.create(model, parent, [], cb);
                }
            }).apply(this, arguments);
        }
        Collection.getItemIds = function getItemIds(items) {
            return _.map(items, function (item) {
                return item.id();
            });
        }
        Collection.prototype.findById = function (id) {
            return this['find'](function (item) {
                return item.id() == id;
            });
        };
        Collection.prototype.save = function (cb) {
            var _this = this;
            var keyPath = this.getKeyPath();
            var itemsKeyPath = [];
            if(this._removed.length) {
                itemsKeyPath = _.initial(this._removed[0].getKeyPath());
            } else {
                if(this._added.length) {
                    itemsKeyPath = _.initial(this._added[0].getKeyPath());
                }
            }
            var itemIds = Collection.getItemIds(this._removed);
            Gnd.Model.storageQueue.remove(keyPath, itemsKeyPath, itemIds, function (err) {
                if(!err) {
                    _this._removed = [];
                    Gnd.Util.asyncForEach(_this.items, function (item, cb) {
                        item.save(cb);
                    }, function (err) {
                        if((!err) && (_this._added.length > 0)) {
                            itemIds = Collection.getItemIds(_this._added);
                            Gnd.Model.storageQueue.add(keyPath, itemsKeyPath, itemIds, function (err) {
                                if(!err) {
                                    _this._added = [];
                                }
                                cb(err);
                            });
                        } else {
                            cb(err);
                        }
                    });
                } else {
                    cb(err);
                }
            });
        };
        Collection.prototype.add = function (items, opts, cb) {
            var _this = this;
            if(_.isFunction(opts)) {
                cb = opts;
                opts = {
                };
            }
            Gnd.Util.asyncForEach(items, function (item, done) {
                _this.addItem(item, opts, function (err) {
                    !err && _this._keepSynced && !item._keepSynced && item.keepSynced();
                    done(err);
                });
            }, cb || Gnd.Util.noop);
        };
        Collection.prototype.getKeyPath = function () {
            if(this.parent) {
                return [
                    this.parent.bucket(), 
                    this.parent.id(), 
                    this.model.__bucket
                ];
            }
            return [
                this.model.__bucket
            ];
        };
        Collection.prototype.remove = function (itemIds, opts, cb) {
            var _this = this;
            var items = this.items, keyPath = this.getKeyPath();
            if(_.isFunction(opts)) {
                cb = opts;
                opts = {
                };
            }
            Gnd.Util.asyncForEach(itemIds, function (itemId, done) {
                var index, item, len = items.length;
                for(index = 0; index < len; index++) {
                    if(items[index].id() == itemId) {
                        item = items[index];
                        break;
                    }
                }
                if(item) {
                    items.splice(index, 1);
                    item.off('changed:', _this.updateFn);
                    item.off('deleted:', _this.deleteFn);
                    _this.set('count', items.length);
                    _this.emit('removed:', item, index);
                    item.release();
                    if(_this.isKeptSynced() && (!opts || !opts.nosync)) {
                        var itemKeyPath = _.initial(item.getKeyPath());
                        Gnd.Model.storageQueue.remove(keyPath, itemKeyPath, [
                            item.id()
                        ], done);
                        return;
                    } else {
                        _this._removed.push(itemId);
                    }
                }
                done();
            }, cb);
        };
        Collection.prototype.keepSynced = function () {
            this.startSync();
            this['map'](function (item) {
                item.keepSynced();
            });
        };
        Collection.prototype.isKeptSynced = function () {
            return this._keepSynced;
        };
        Collection.prototype.toggleSortOrder = function () {
            this['set']('sortOrder', this.sortOrder == 'asc' ? 'desc' : 'asc');
        };
        Collection.prototype.setFormatters = function (formatters) {
            this._formatters = formatters;
            this['each'](function (item) {
                item.format(formatters);
            });
        };
        Collection.prototype.filtered = function (result) {
            if(this.filterFn) {
                result(null, this.filter(this.filterFn));
            } else {
                result(null, this.items);
            }
        };
        Collection.prototype.isFiltered = function (item) {
            return this.filterFn ? this.filterFn(item) : true;
        };
        Collection.prototype.reverse = function () {
            this.items.reverse();
            return this;
        };
        Collection.prototype.addPersistedItem = function (item, cb) {
            var keyPath = this.getKeyPath();
            var itemKeyPath = _.initial(item.getKeyPath());
            Gnd.Model.storageQueue.add(keyPath, itemKeyPath, [
                item.id()
            ], cb);
        };
        Collection.prototype.addItem = function (item, opts, cb) {
            var _this = this;
            if(this.findById(item.id())) {
                return cb();
            }
            if(this.sortByFn) {
                this.sortedAdd(item);
            } else {
                this.items.push(item);
            }
            this.initItems(item);
            this.set('count', this.items.length);
            this.emit('added:', item);
            if(this.isKeptSynced()) {
                if(!opts || (opts.nosync !== true)) {
                    if(item.isPersisted()) {
                        this.addPersistedItem(item, cb);
                    } else {
                        item.save(function (err) {
                            if(!err) {
                                _this.addPersistedItem(item, Gnd.Util.noop);
                            }
                            cb(err);
                        });
                    }
                } else {
                    cb();
                }
            } else {
                this._added.push(item);
                cb();
            }
        };
        Collection.prototype.sortedAdd = function (item) {
            (this.sortOrder == 'desc') && this.items.reverse();
            var i = this['sortedIndex'](item, this.sortByFn);
            this.items.splice(i, 0, item);
            (this.sortOrder == 'desc') && this.items.reverse();
            return i;
        };
        Collection.prototype.startSync = function () {
            var _this = this;
            this._keepSynced = true;
            if(this.parent && Gnd.Model.syncManager) {
                if(this.parent.isPersisted()) {
                    Gnd.Model.syncManager.startSync(this);
                } else {
                    this.parent.on('id', function () {
                        Gnd.Model.syncManager.startSync(_this);
                    });
                }
            }
            this.on('add:', function (itemsKeyPath, itemIds) {
                Gnd.Util.asyncForEach(itemIds, function (itemId, done) {
                    if(!_this.findById(itemId)) {
                        _this.model.findById(itemsKeyPath.concat(itemId), true, {
                        }, function (err, item) {
                            if(item) {
                                _this.addItem(item, {
                                    nosync: true
                                }, done);
                            }
                        });
                    }
                }, Gnd.Util.noop);
            });
            this.on('remove:', function (itemsKeyPath, itemId) {
                _this.remove(itemId, true, Gnd.Util.noop);
            });
        };
        Collection.prototype.resync = function (items) {
            var _this = this;
            var itemsToRemove = [], itemsToAdd = items.slice(0);
            this['each'](function (item) {
                var id = item.id(), shouldRemove = true;
                for(var i = 0; i < items.length; i++) {
                    if(id == items[i]._id) {
                        item.set(items[i], {
                            nosync: true
                        });
                        shouldRemove = false;
                        break;
                    }
                }
                shouldRemove && itemsToRemove.push(id);
            });
            this.remove(itemsToRemove, {
                nosync: true
            }, function (err) {
                if(!err) {
                    (_this.model).createModels(itemsToAdd, function (err, models) {
                        if(!err) {
                            _this.add(models, {
                                nosync: true
                            }, function (err) {
                                _this.emit('resynced:');
                            });
                        }
                    });
                }
            });
        };
        Collection.prototype.listenToResync = function () {
            var _this = this;
            var key = Gnd.Storage.Queue.makeKey(this.getKeyPath());
            this.resyncFn = function (items) {
                _this.resync(items);
            };
            Gnd.Model.storageQueue && Gnd.Model.storageQueue.on('resync:' + key, this.resyncFn);
        };
        Collection.prototype.endSync = function () {
            Gnd.Model.syncManager && Gnd.Model.syncManager.endSync(this);
            this._keepSynced = false;
        };
        Collection.prototype.initItems = function (items) {
            items = _.isArray(items) ? items : [
                items
            ];
            for(var i = 0, len = items.length; i < len; i++) {
                var item = items[i];
                item.retain();
                item.on('changed:', this.updateFn);
                item.on('deleted:', this.deleteFn);
            }
        };
        Collection.prototype.deinitItems = function (items) {
            var key = Gnd.Storage.Queue.makeKey(this.getKeyPath());
            Gnd.Model.storageQueue && Gnd.Model.storageQueue.off('resync:' + key, this.resyncFn);
            for(var i = 0, len = items.length; i < len; i++) {
                var item = items[i];
                item.off('changed:', this.updateFn);
                item.off('deleted:', this.deleteFn);
                item.release();
            }
        };
        return Collection;
    })(Gnd.Base);
    Gnd.Collection = Collection;    
    var methods = [
        'forEach', 
        'each', 
        'map', 
        'reduce', 
        'reduceRight', 
        'find', 
        'detect', 
        'pluck', 
        'filter', 
        'select', 
        'reject', 
        'every', 
        'all', 
        'some', 
        'any', 
        'include', 
        'contains', 
        'invoke', 
        'max', 
        'min', 
        'sortBy', 
        'sortedIndex', 
        'toArray', 
        'size', 
        'first', 
        'rest', 
        'last', 
        'without', 
        'indexOf', 
        'lastIndexOf', 
        'isEmpty', 
        'groupBy'
    ];
    _.each(methods, function (method) {
        Collection.prototype[method] = function () {
            return _[method].apply(_, [
                this.items
            ].concat(_.toArray(arguments)));
        };
    });
})(Gnd || (Gnd = {}));
