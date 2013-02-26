var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Gnd;
(function (Gnd) {
    ; ;
    var Sequence = (function (_super) {
        __extends(Sequence, _super);
        function Sequence(model, parent, items) {
            var _this = this;
                _super.call(this);
            this._keepSynced = false;
            this._insertedBefore = [];
            this._removed = [];
            this.sortOrder = 'asc';
            this.filterFn = null;
            this.count = 0;
            var self = this;
            this.updateFn = function (args) {
                self.emit('updated:', this, args);
                console.log('seq update');
                console.log(args);
            };
            this.deleteFn = function (idx) {
                _this.remove(idx, function (err) {
                });
                console.log('seq delete');
                console.log(idx);
            };
            this.items = items || [];
            this.initItems(this.items);
            this.model = model;
            this.parent = parent;
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
                    Gnd.Util.release(_.pluck(models, 'model'));
                    if(parent && parent.isKeptSynced()) {
                        sequence.keepSynced();
                    }
                    sequence.count = models.length;
                    return sequence;
                },
                'Function Model Array Function': function (model, parent, items, cb) {
                    model.createSequenceModels(items, function (err, models) {
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
        Sequence.prototype.save = function (cb) {
        };
        Sequence.prototype.push = function (item, opts, cb) {
            this.insertBefore(null, item, opts, cb);
        };
        Sequence.prototype.unshift = function (item, opts, cb) {
            var firstId = this.items.length > 0 ? _.first(this.items).id : null;
            this.insertBefore(firstId, item, opts, cb);
        };
        Sequence.prototype.remove = function (idx, opts, cb) {
            if(_.isFunction(opts)) {
                cb = opts;
                opts = {
                };
            }
            var item = this.items[idx];
            if(!item) {
                return cb(Error('index out of bounds'));
            }
            this.items.splice(idx, 1);
            item.model.off('changed:', this.updateFn);
            item.model.off('deleted:', this.deleteFn);
            this.set('count', this.items.length);
            this.emit('removed:', item.model, idx);
            item.model.release();
            if(this.isKeptSynced() && (!opts || !opts.nosync)) {
                Gnd.Model.storageQueue.deleteItem(this.getKeyPath(), item.id, opts, cb);
            } else {
                this._removed.push(item);
                cb();
            }
        };
        Sequence.prototype.insertItemBefore = function (id, item, opts, cb) {
            var _this = this;
            var seqItem = {
                model: item,
                id: 'pending'
            };
            function done(err, id) {
                seqItem.id = id || seqItem.id;
                console.log('done');
                cb(err);
            }
            var index = this.items.length;
            _.each(this.items, function (item, i) {
                if(item.id === id) {
                    index = i;
                }
            });
            this.items.splice(index, 0, seqItem);
            this.initItems([
                seqItem
            ]);
            this.set('count', this.items.length);
            this.emit('insertedBefore:', item);
            if(this.isKeptSynced()) {
                if(!opts || (opts.nosync !== true)) {
                    if(item.isPersisted()) {
                        this.insertPersistedItemBefore(id, item, done);
                    } else {
                        item.save(function (err) {
                            if(err) {
                                return cb(err);
                            }
                            _this.insertPersistedItemBefore(id, item, done);
                        });
                    }
                } else {
                    cb();
                }
            } else {
                this._insertedBefore.push(seqItem);
                cb();
            }
        };
        Sequence.prototype.insertBefore = function (id, item, opts, cb) {
            var _this = this;
            if(_.isFunction(opts)) {
                cb = opts;
                opts = {
                };
            }
            cb = cb || Gnd.Util.noop;
            this.insertItemBefore(id, item, opts, function (err) {
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
            _.map(this.items, function (item) {
                item.model.keepSynced();
            });
        };
        Sequence.prototype.isKeptSynced = function () {
            return this._keepSynced;
        };
        Sequence.prototype.getSeqIdOfModel = function (item, cb) {
            var refItemKeyPath = item ? item.getKeyPath() : null;
            Gnd.Model.storageQueue.all(this.getKeyPath(), {
            }, {
            }, function (err, items) {
            });
        };
        Sequence.prototype.insertPersistedItemBefore = function (id, item, cb) {
            var keyPath = this.getKeyPath();
            var itemKeyPath = item.getKeyPath();
            Gnd.Model.storageQueue.insertBefore(keyPath, id, itemKeyPath, {
            }, cb);
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
        };
        Sequence.prototype.resync = function (newItems) {
            var _this = this;
            console.log('resync seq');
            console.log(newItems);
            console.log(this.items);
            var oldItems = this.items;
            var newIds = _.pluck(newItems, 'id').sort();
            var remainingItems = [];
            Gnd.Util.asyncForEach(oldItems, function (item, done) {
                if(item.id !== 'pending' && -1 === _.indexOf(newIds, item.id, true)) {
                    console.log('deleted');
                    done();
                } else {
                    remainingItems.push(item);
                    done();
                }
            }, function (err) {
                console.log('remaining');
                console.log(remainingItems);
                var itemsToInsert = [];
                var i = 0;
                var j = 0;
                var oldItem, newItem;
                while(i < remainingItems.length) {
                    oldItem = remainingItems[i];
                    if(oldItem.id !== 'pending') {
                        newItem = newItems[j];
                        if(newItem.id === oldItem.id) {
                            i++;
                        } else {
                            itemsToInsert.push({
                                id: oldItem.id,
                                newItem: newItem.doc
                            });
                        }
                        j++;
                    } else {
                        i++;
                    }
                }
                while(j < newItems.length) {
                    newItem = newItems[j];
                    itemsToInsert.push({
                        id: null,
                        newItem: newItem.doc
                    });
                    j++;
                }
                Gnd.Util.asyncForEach(itemsToInsert, function (item, done) {
                    console.log('insertBefore');
                    (_this.model).create(item.newItem, function (err, instance) {
                        if(instance) {
                            console.log('created model');
                            _this.insertBefore(item.id, instance, {
                                nosync: true
                            }, function (err) {
                                done(err);
                            });
                        } else {
                            done(err);
                        }
                    });
                }, function (err) {
                    _this.emit('resynced:');
                });
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
                item.model.retain();
                item.model.on('changed:', this.updateFn);
                item.model.on('deleted:', this.deleteFn);
            }
        };
        Sequence.prototype.deinitItems = function (items) {
            var key = Gnd.Storage.Queue.makeKey(this.getKeyPath());
            Gnd.Model.storageQueue && Gnd.Model.storageQueue.off('resync:' + key, this.resyncFn);
            for(var i = 0, len = items.length; i < len; i++) {
                var item = items[i];
                item.model.off('changed:', this.updateFn);
                item.model.off('deleted:', this.deleteFn);
                item.model.release();
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
        'toArray', 
        'size', 
        'first', 
        'rest', 
        'last', 
        'without', 
        'indexOf', 
        'lastIndexOf', 
        'isEmpty'
    ];
    _.each(methods, function (method) {
        Sequence.prototype[method] = function () {
            return _[method].apply(_, [
                _.pluck(this.items, 'model')
            ].concat(_.toArray(arguments)));
        };
    });
})(Gnd || (Gnd = {}));
