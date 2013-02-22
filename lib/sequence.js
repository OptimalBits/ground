var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Gnd;
(function (Gnd) {
    var Sequence = (function (_super) {
        __extends(Sequence, _super);
        function Sequence(model, parent, items) {
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
                throw Error('deleteFn not implemented');
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
        Sequence.prototype.destroy = function () {
            this._keepSynced && this.endSync();
            this.deinitItems(this.items);
            this.items = null;
            _super.prototype.destroy.call(this);
        };
        Sequence.create = function create(model, parent, docs, cb) {
            var _this = this;
            return Gnd.overload({
                'Function Model Array': function (model, parent, models) {
                    var sequence = new Sequence(model, parent, models);
                    Gnd.Util.release(models);
                    if(parent && parent.isKeptSynced()) {
                        sequence.keepSynced();
                    }
                    sequence.count = models.length;
                    return sequence;
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
        Sequence.getItemIds = function getItemIds(items) {
            return _.map(items, function (item) {
                return item.id();
            });
        }
        Sequence.prototype.findById = function (id) {
            return this['find'](function (item) {
                return item.id() == id;
            });
        };
        Sequence.prototype.save = function (cb) {
        };
        Sequence.prototype.first = function () {
            return _.first(this.items);
        };
        Sequence.prototype.push = function (item, opts, cb) {
            var _this = this;
            if(_.isFunction(opts)) {
                cb = opts;
                opts = {
                };
            }
            cb = cb || Gnd.Util.noop;
            this.pushItem(item, opts, function (err) {
                !err && _this._keepSynced && !item.isKeptSynced() && item.keepSynced();
                cb(null);
            });
        };
        Sequence.prototype.getKeyPath = function () {
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
        Sequence.prototype.keepSynced = function () {
            this.startSync();
            this['map'](function (item) {
                item.keepSynced();
            });
        };
        Sequence.prototype.isKeptSynced = function () {
            return this._keepSynced;
        };
        Sequence.prototype.filtered = function (result) {
            if(this.filterFn) {
                result(null, this.filter(this.filterFn));
            } else {
                result(null, this.items);
            }
        };
        Sequence.prototype.isFiltered = function (item) {
            return this.filterFn ? this.filterFn(item) : true;
        };
        Sequence.prototype.pushPersistedItem = function (item, cb) {
            var keyPath = this.getKeyPath();
            var itemKeyPath = item.getKeyPath();
            Gnd.Model.storageQueue.push(keyPath, itemKeyPath, {
            }, cb);
        };
        Sequence.prototype.pushItem = function (item, opts, cb) {
            var _this = this;
            this.items.push(item);
            this.initItems(item);
            this.set('count', this.items.length);
            this.emit('pushed:', item);
            if(this.isKeptSynced()) {
                if(!opts || (opts.nosync !== true)) {
                    if(item.isPersisted()) {
                        this.pushPersistedItem(item, cb);
                    } else {
                        item.save(function (err) {
                            if(!err) {
                                _this.pushPersistedItem(item, Gnd.Util.noop);
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
        Sequence.prototype.sortedAdd = function (item) {
            (this.sortOrder == 'desc') && this.items.reverse();
            var i = this['sortedIndex'](item, this.sortByFn);
            this.items.splice(i, 0, item);
            (this.sortOrder == 'desc') && this.items.reverse();
            return i;
        };
        Sequence.prototype.startSync = function () {
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
            this.on('remove:', function (itemsKeyPath, itemId) {
                throw Error('remove on seq not possible');
            });
            this.on('push:', function (itemsKeyPath, itemId) {
                console.log('--push');
                console.log(itemId);
                if(!_this.findById(itemId)) {
                    _this.model.findById(itemsKeyPath.concat(itemId), true, {
                    }, function (err, item) {
                        if(item) {
                            _this.pushItem(item, {
                                nosync: true
                            }, Gnd.Util.noop);
                        }
                    });
                }
            });
        };
        Sequence.prototype.addPersistedItem = function (item, cb) {
            var keyPath = this.getKeyPath();
            var itemKeyPath = _.initial(item.getKeyPath());
            Gnd.Model.storageQueue.add(keyPath, itemKeyPath, [
                item.id()
            ], cb);
        };
        Sequence.prototype.addItem = function (item, opts, cb) {
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
        Sequence.prototype.add = function (items, opts, cb) {
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
        Sequence.prototype.remove = function (itemIds, opts, cb) {
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
        Sequence.prototype.resync = function (items) {
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
        Sequence.prototype.listenToResync = function () {
            var _this = this;
            var key = Gnd.Storage.Queue.makeKey(this.getKeyPath());
            this.resyncFn = function (items) {
                _this.resync(items);
            };
            Gnd.Model.storageQueue && Gnd.Model.storageQueue.on('resync:' + key, this.resyncFn);
        };
        Sequence.prototype.endSync = function () {
            Gnd.Model.syncManager && Gnd.Model.syncManager.endSync(this);
            this._keepSynced = false;
        };
        Sequence.prototype.initItems = function (items) {
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
        Sequence.prototype.deinitItems = function (items) {
            var key = Gnd.Storage.Queue.makeKey(this.getKeyPath());
            Gnd.Model.storageQueue && Gnd.Model.storageQueue.off('resync:' + key, this.resyncFn);
            for(var i = 0, len = items.length; i < len; i++) {
                var item = items[i];
                item.off('changed:', this.updateFn);
                item.off('deleted:', this.deleteFn);
                item.release();
            }
        };
        return Sequence;
    })(Gnd.Base);
    Gnd.Sequence = Sequence;    
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
        Sequence.prototype[method] = function () {
            return _[method].apply(_, [
                this.items
            ].concat(_.toArray(arguments)));
        };
    });
})(Gnd || (Gnd = {}));
