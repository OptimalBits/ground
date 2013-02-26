var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Gnd;
(function (Gnd) {
    (function (Storage) {
        var Queue = (function (_super) {
            __extends(Queue, _super);
            function Queue(local, remote) {
                        _super.call(this);
                this.createList = {
                };
                this.currentTransfer = null;
                this.remoteStorage = null;
                this.localStorage = local;
                this.remoteStorage = remote;
                this.queue = [];
                this.q = [];
                this.useRemote = !!this.remoteStorage;
                this.syncFn = _.bind(this.synchronize, this);
            }
            Queue.makeKey = function makeKey(keyPath) {
                return keyPath.join(':');
            }
            Queue.itemEquals = function itemEquals(item1, item2) {
                return (!item1 && !item2) || (item1 && item2 && (item1.doc._id === item2.doc._id || item1.doc._cid === item2.doc._cid));
            }
            Queue.prototype.init = function (cb) {
                var _this = this;
                this.getQueuedCmds(function (err, queue) {
                    if(!err) {
                        _this.queue = queue || [];
                    }
                    cb(err);
                });
            };
            Queue.prototype.fetch = function (keyPath, cb) {
                var _this = this;
                this.localStorage.fetch(keyPath, function (err, doc) {
                    if(doc) {
                        doc['_id'] = _.last(keyPath);
                        cb(err, doc);
                    }
                    if(!_this.useRemote) {
                        cb(err);
                    } else {
                        _this.remoteStorage.fetch(keyPath, function (err, docRemote) {
                            if(!err) {
                                docRemote['_persisted'] = true;
                                _this.localStorage.put(keyPath, docRemote, function (err) {
                                    if(err) {
                                        var collectionKeyPath = _.initial(keyPath);
                                        docRemote['_cid'] = docRemote['_id'];
                                        _this.localStorage.create(collectionKeyPath, docRemote, function () {
                                        });
                                    }
                                });
                                _this.emit('resync:' + Queue.makeKey(keyPath), docRemote);
                            }
                            !doc && cb(err, docRemote);
                        });
                    }
                });
            };
            Queue.prototype.updateLocalSequence = function (keyPath, opts, remoteSeq, cb) {
                var storage = this.localStorage;
                opts = _.extend({
                    snapshot: false
                }, opts);
                storage.all(keyPath, {
                }, opts, function (err, localSeq) {
                    console.log('update local sequence');
                    console.log(localSeq);
                    console.log(remoteSeq);
                    var remoteIds = _.map(remoteSeq, function (item) {
                        return item.doc._id;
                    }).sort();
                    var remainingItems = [];
                    Gnd.Util.asyncForEach(localSeq, function (item, done) {
                        if(item.doc.__op === 'insync' && -1 === _.indexOf(remoteIds, item.doc._id, true)) {
                            storage.deleteItem(keyPath, item.id, {
                                insync: true
                            }, function (err) {
                                console.log('deleted');
                                done(err);
                            });
                        } else {
                            remainingItems.push(item);
                            done();
                        }
                    }, function (err) {
                        var newItems = [];
                        var i = 0;
                        var j = 0;
                        var localItem, remoteItem;
                        while(i < remainingItems.length) {
                            localItem = remainingItems[i];
                            if(localItem.doc.__op === 'insync') {
                                remoteItem = remoteSeq[j];
                                if(localItem.doc._id === remoteItem.doc._id) {
                                    i++;
                                } else {
                                    newItems.push({
                                        id: localItem.id,
                                        keyPath: remoteItem.keyPath
                                    });
                                }
                                j++;
                            } else {
                                i++;
                            }
                        }
                        while(j < remoteSeq.length) {
                            remoteItem = remoteSeq[j];
                            newItems.push({
                                id: null,
                                keyPath: remoteItem.keyPath
                            });
                            j++;
                        }
                        Gnd.Util.asyncForEach(newItems, function (item, done) {
                            storage.insertBefore(keyPath, item.id, item.keyPath, {
                                insync: true
                            }, function (err) {
                                console.log('insertBefore');
                                done(err);
                            });
                        }, function (err) {
                            cb(err);
                        });
                    });
                });
            };
            Queue.prototype.updateLocalCollection = function (keyPath, query, options, newItems, cb) {
                var storage = this.localStorage, itemKeyPath = [
_.last(keyPath)                ];
                options = _.extend({
                    snapshot: false
                }, options);
                storage.find(keyPath, query, options, function (err, oldItems) {
                    if(!err) {
                        var itemsToRemove = [], itemsToAdd = [];
                        function findItem(items, itemToFind) {
                            return _.find(items, function (item) {
                                return (item._cid === itemToFind._cid || item._cid === itemToFind._id);
                            });
                        }
                        _.each(oldItems, function (oldItem) {
                            if(oldItem.__op === 'insync' && !findItem(newItems, oldItem)) {
                                itemsToRemove.push(oldItem._cid, oldItem._id);
                            }
                        });
                        _.each(newItems, function (newItem) {
                            !findItem(oldItems, newItem) && itemsToAdd.push(newItem._id);
                        });
                        storage.remove(keyPath, itemKeyPath, itemsToRemove, {
                            insync: true
                        }, function (err) {
                            if(!err) {
                                Gnd.Util.asyncForEach(newItems, function (doc, done) {
                                    var elemKeyPath = itemKeyPath.concat(doc._id);
                                    doc._persisted = true;
                                    storage.put(elemKeyPath, doc, function (err) {
                                        if(err) {
                                            doc._cid = doc._id;
                                            storage.create(itemKeyPath, doc, function (err) {
                                                done(err);
                                            });
                                        } else {
                                            done();
                                        }
                                    });
                                }, function (err) {
                                    if(!err) {
                                        storage.add(keyPath, itemKeyPath, itemsToAdd, {
                                            insync: true
                                        }, cb);
                                    } else {
                                        cb(err);
                                    }
                                });
                            } else {
                                cb(err);
                            }
                        });
                    } else {
                        storage.add(keyPath, itemKeyPath, _.pluck(newItems, '_id'), {
                            insync: true
                        }, cb);
                    }
                });
            };
            Queue.prototype.find = function (keyPath, query, options, cb) {
                var _this = this;
                var localOpts = _.extend({
                    snapshot: true
                }, options);
                this.localStorage.find(keyPath, query, localOpts, function (err, result) {
                    if(result) {
                        cb(err, result);
                    }
                    if(!_this.useRemote) {
                        cb(err);
                    } else {
                        console.log('xxx find');
                        console.log(keyPath);
                        _this.remoteStorage.find(keyPath, query, options, function (err, remote) {
                            if(!err) {
                                _this.updateLocalCollection(keyPath, query, options, remote, function (err) {
                                    if(result) {
                                        _this.localStorage.find(keyPath, query, localOpts, function (err, items) {
                                            !err && _this.emit('resync:' + Queue.makeKey(keyPath), items);
                                        });
                                    }
                                });
                            }
                            !result && cb(err, remote);
                        });
                    }
                });
            };
            Queue.prototype.create = function (keyPath, args, cb) {
                var _this = this;
                console.log('---create');
                this.localStorage.create(keyPath, args, function (err, cid) {
                    if(!err) {
                        args['_cid'] = args['_cid'] || cid;
                        _this.addCmd({
                            cmd: 'create',
                            keyPath: keyPath,
                            args: args
                        }, function (err) {
                            console.log('---added cmd');
                            cb(err, cid);
                        });
                    } else {
                        cb(err);
                    }
                });
            };
            Queue.prototype.put = function (keyPath, args, cb) {
                var _this = this;
                this.localStorage.put(keyPath, args, function (err) {
                    if(!err) {
                        _this.addCmd({
                            cmd: 'update',
                            keyPath: keyPath,
                            args: args
                        }, cb);
                    } else {
                        cb(err);
                    }
                });
            };
            Queue.prototype.del = function (keyPath, cb) {
                var _this = this;
                this.localStorage.del(keyPath, function (err) {
                    if(!err) {
                        _this.addCmd({
                            cmd: 'delete',
                            keyPath: keyPath
                        }, cb);
                    } else {
                        cb(err);
                    }
                });
            };
            Queue.prototype.add = function (keyPath, itemsKeyPath, itemIds, cb) {
                var _this = this;
                this.localStorage.add(keyPath, itemsKeyPath, itemIds, {
                }, function (err) {
                    if(!err) {
                        _this.addCmd({
                            cmd: 'add',
                            keyPath: keyPath,
                            itemsKeyPath: itemsKeyPath,
                            itemIds: itemIds
                        }, cb);
                    } else {
                        cb(err);
                    }
                });
            };
            Queue.prototype.remove = function (keyPath, itemsKeyPath, itemIds, cb) {
                var _this = this;
                this.localStorage.remove(keyPath, itemsKeyPath, itemIds, {
                }, function (err) {
                    if(!err) {
                        _this.addCmd({
                            cmd: 'remove',
                            keyPath: keyPath,
                            itemsKeyPath: itemsKeyPath,
                            itemIds: itemIds
                        }, cb);
                    } else {
                        cb(err);
                    }
                });
            };
            Queue.prototype.insert = function (keyPath, index, doc, cb) {
            };
            Queue.prototype.extract = function (keyPath, index, cb) {
            };
            Queue.prototype.all = function (keyPath, query, opts, cb) {
                var _this = this;
                var localOpts = _.extend({
                    snapshot: true
                }, {
                });
                this.localStorage.all(keyPath, query, opts, function (err, result) {
                    if(result) {
                        cb(err, result);
                    }
                    if(!_this.useRemote) {
                        cb(err);
                    } else {
                        console.log('xxx all');
                        console.log(keyPath);
                        _this.remoteStorage.all(keyPath, query, opts, function (err, remote) {
                            if(!err) {
                                _this.updateLocalSequence(keyPath, {
                                }, remote, function (err) {
                                    if(result) {
                                        _this.localStorage.all(keyPath, {
                                        }, localOpts, function (err, items) {
                                            !err && _this.emit('resync:' + Queue.makeKey(keyPath), items);
                                        });
                                    }
                                });
                            }
                            !result && cb(err, remote);
                        });
                    }
                });
            };
            Queue.prototype.next = function (keyPath, id, opts, cb) {
                var _this = this;
                this.localStorage.next(keyPath, id, opts, function (err, item) {
                    console.log('------1');
                    if(item) {
                        cb(err, item);
                    } else {
                        if(!_this.useRemote) {
                            cb(err);
                        }
                        _this.remoteStorage.next(keyPath, id, opts, function (err, itemRemote) {
                            console.log('-----2');
                            if(itemRemote) {
                            } else {
                                cb(err, itemRemote);
                            }
                        });
                    }
                });
            };
            Queue.prototype.prev = function (keyPath, refItemKeyPath, opts, cb) {
            };
            Queue.prototype.deleteItem = function (keyPath, id, opts, cb) {
                var _this = this;
                this.localStorage.deleteItem(keyPath, id, opts, function (err) {
                    if(!err) {
                        _this.addCmd({
                            cmd: 'deleteItem',
                            keyPath: keyPath,
                            id: id
                        }, cb);
                    } else {
                        cb(err);
                    }
                });
            };
            Queue.prototype.insertBefore = function (keyPath, id, itemKeyPath, opts, cb) {
                var _this = this;
                this.localStorage.insertBefore(keyPath, id, itemKeyPath, opts, function (err, cid) {
                    if(!err) {
                        _this.addCmd({
                            cmd: 'insertBefore',
                            keyPath: keyPath,
                            id: id,
                            itemKeyPath: itemKeyPath,
                            cid: cid
                        }, function (err) {
                            cb(err, cid);
                        });
                    } else {
                        cb(err);
                    }
                });
            };
            Queue.prototype.synchronize = function () {
                var _this = this;
                var done = _.bind(this.success, this);
                if(!this.currentTransfer) {
                    if(this.queue.length) {
                        console.log('QQQQQQQ');
                        console.log(this.queue[0]);
                        var obj = this.currentTransfer = this.queue[0], localStorage = this.localStorage, remoteStorage = this.remoteStorage, keyPath = obj.keyPath, itemsKeyPath = obj.itemsKeyPath, itemIds = obj.itemIds, args = obj.args;
                        switch(obj.cmd) {
                            case 'create': {
                                (function (cid, args) {
                                    remoteStorage.create(keyPath, args, function (err, sid) {
                                        var localKeyPath = keyPath.concat(cid);
                                        if(err) {
                                            console.log('---err');
                                            done(err);
                                        } else {
                                            localStorage.put(localKeyPath, {
                                                _persisted: true,
                                                _id: sid
                                            }, function (err) {
                                                var newKeyPath = _.initial(localKeyPath);
                                                newKeyPath.push(sid);
                                                localStorage.link(newKeyPath, localKeyPath, function (err) {
                                                    console.log('---created');
                                                    _this.emit('created:' + cid, sid);
                                                    _this.updateQueueIds(cid, sid);
                                                    done();
                                                });
                                            });
                                        }
                                    });
                                })(args['_cid'], args);
                                break;

                            }
                            case 'update': {
                                remoteStorage.put(keyPath, args, done);
                                break;

                            }
                            case 'delete': {
                                remoteStorage.del(keyPath, done);
                                break;

                            }
                            case 'add': {
                                remoteStorage.add(keyPath, itemsKeyPath, itemIds, {
                                }, done);
                                break;

                            }
                            case 'remove': {
                                console.log('rm');
                                console.log(itemIds);
                                remoteStorage.remove(keyPath, itemsKeyPath, itemIds, {
                                }, done);
                                break;

                            }
                            case 'insertBefore': {
                                var id = obj.id;
                                var itemKeyPath = obj.itemKeyPath;
                                var cid = obj.cid;
                                remoteStorage.insertBefore(keyPath, id, itemKeyPath, {
                                }, function (err, sid) {
                                    if(err) {
                                        console.log('---err');
                                        done(err);
                                    } else {
                                        localStorage.set(keyPath, cid, sid, function (err) {
                                            console.log('inserted item. cid:' + cid + ', sid:' + sid);
                                            _this.emit('inserted:' + cid, sid);
                                            _this.updateQueueIds(cid, sid);
                                            done(err, sid);
                                        });
                                    }
                                });
                                break;

                            }
                            case 'deleteItem': {
                                console.log('synd del');
                                var id = obj.id;
                                remoteStorage.deleteItem(keyPath, id, {
                                }, done);
                                break;

                            }
                            case 'syncTask': {
                                obj.fn(done);
                                break;

                            }
                        }
                    } else {
                        console.log('synced');
                        this.emit('synced:', this);
                    }
                } else {
                    console.log('busy with ', this.currentTransfer);
                }
            };
            Queue.prototype.isEmpty = function () {
                return !this.queue.length;
            };
            Queue.prototype.clear = function (cb) {
                console.log('---clear');
                if(this.currentTransfer) {
                    this.once('synced:', cb || Gnd.Util.noop);
                } else {
                    cb && cb();
                }
            };
            Queue.prototype.enqueueCmd = function (cmd, cb) {
                console.log('enq');
                this.q.push(cmd);
                cb();
            };
            Queue.prototype.dequeueCmd = function (cb) {
                console.log('deq');
                cb(null, this.q.shift());
            };
            Queue.prototype.getQueuedCmds = function (cb) {
                cb(null, this.q);
            };
            Queue.prototype.clearCmdQueue = function (cb) {
                this.q = [];
                cb(null);
            };
            Queue.prototype.fireOnEmptyQueue = function (fn) {
                if(this.q.length > 0) {
                    this.addCmd({
                        cmd: 'syncTask',
                        fn: fn
                    }, function (err) {
                        console.log(err);
                    });
                    this.once('synced:', fn);
                } else {
                    fn(Gnd.Util.noop);
                }
            };
            Queue.prototype.addCmd = function (cmd, cb) {
                var _this = this;
                if(this.useRemote) {
                    this.enqueueCmd(cmd, function (err) {
                        if(!err) {
                            _this.queue.push(cmd);
                            _this.synchronize();
                        }
                        cb(err);
                    });
                } else {
                    cb();
                }
            };
            Queue.prototype.success = function (err) {
                var cmd = this.queue[0];
                this.currentTransfer = null;
                var storage = this.localStorage;
                if(!err) {
                    var syncFn = _.bind(this.synchronize, this);
                    this.queue.shift();
                    this.dequeueCmd(function (err) {
                        var opts = {
                            insync: true
                        };
                        switch(cmd.cmd) {
                            case 'add': {
                                storage.remove(cmd.keyPath, cmd.itemsKeyPath, cmd.oldItemIds || [], opts, function (err) {
                                    storage.add(cmd.keyPath, cmd.itemsKeyPath, cmd.itemIds, opts, function (err) {
                                        Gnd.Util.nextTick(syncFn);
                                    });
                                });
                                break;

                            }
                            case 'remove': {
                                storage.remove(cmd.keyPath, cmd.itemsKeyPath, cmd.oldItemIds || [], opts, function (err) {
                                    storage.remove(cmd.keyPath, cmd.itemsKeyPath, cmd.itemIds, opts, function (err) {
                                        Gnd.Util.nextTick(syncFn);
                                    });
                                });
                                break;

                            }
                            case 'insertBefore': {
                                storage.set(cmd.keyPath, cmd.id, null, function (err) {
                                    Gnd.Util.nextTick(syncFn);
                                });
                                break;

                            }
                            case 'deleteItem': {
                                console.log('succ del');
                                storage.set(cmd.keyPath, cmd.id, null, function (err) {
                                    Gnd.Util.nextTick(syncFn);
                                });
                                break;

                            }
                            default: {
                                Gnd.Util.nextTick(syncFn);

                            }
                        }
                    });
                } else {
                }
            };
            Queue.prototype.updateQueueIds = function (oldId, newId) {
                console.log('uids');
                console.log(oldId);
                console.log(newId);
                console.log(this.queue);
                _.each(this.queue, function (cmd) {
                    cmd.keyPath && updateIds(cmd.keyPath, oldId, newId);
                    cmd.itemsKeyPath && updateIds(cmd.itemsKeyPath, oldId, newId);
                    cmd.itemKeyPath && updateIds(cmd.itemKeyPath, oldId, newId);
                    if(cmd.id && cmd.id === oldId) {
                        cmd.id = newId;
                    }
                    if(cmd.itemIds) {
                        cmd.oldItemIds = updateIds(cmd.itemIds, oldId, newId);
                    }
                });
            };
            return Queue;
        })(Gnd.Base);
        Storage.Queue = Queue;        
        function updateIds(keyPath, oldId, newId) {
            var updatedKeys = [];
            for(var i = 0; i < keyPath.length; i++) {
                if(keyPath[i] == oldId) {
                    keyPath[i] = newId;
                    updatedKeys.push(oldId);
                }
            }
            return updatedKeys;
        }
    })(Gnd.Storage || (Gnd.Storage = {}));
    var Storage = Gnd.Storage;
})(Gnd || (Gnd = {}));
