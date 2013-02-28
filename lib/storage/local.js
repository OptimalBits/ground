var Gnd;
(function (Gnd) {
    (function (Storage) {
        var InvalidKeyError = new Error('Invalid Key');
        var Local = (function () {
            function Local(store) {
                this.store = store;
            }
            Local.prototype.contextualizeIds = function (keyPath, itemIds) {
                var _this = this;
                var baseItemPath = this.makeKey(keyPath);
                return _.map(itemIds, function (id) {
                    return _this.makeKey([
                        baseItemPath, 
                        id
                    ]);
                });
            };
            Local.prototype.makeKey = function (keyPath) {
                return keyPath.join('@');
            };
            Local.prototype.parseKey = function (key) {
                return key.split('@');
            };
            Local.prototype.isLink = function (doc) {
                return _.isString(doc);
            };
            Local.prototype.isCollectionLink = function (doc) {
                return doc[0] === '/' && doc[doc.length - 1] === '/';
            };
            Local.prototype.createCollectionLink = function (collection) {
                var link = '/^' + collection + '@[^@]+$/';
                this.store.put(collection, link);
            };
            Local.prototype.traverseLinks = function (key, fn) {
                var _this = this;
                var value = this.store.get(key);
                if(value) {
                    fn && fn(key);
                    if(this.isLink(value)) {
                        if(this.isCollectionLink(value)) {
                            var regex = new RegExp(value.slice(1, value.length - 1));
                            var allKeys = this.store.allKeys();
                            var keys = _.filter(allKeys, function (key) {
                                if(key.match(regex)) {
                                    var value = _get(key);
                                    return !_this.isLink(value);
                                }
                                return false;
                            });
                            return {
                                key: key,
                                value: _.reduce(keys, function (memo, key) {
                                    memo[key] = 'insync';
                                    return memo;
                                }, {
                                })
                            };
                        } else {
                            return this.traverseLinks(value);
                        }
                    } else {
                        return {
                            key: key,
                            value: value
                        };
                    }
                }
            };
            Local.prototype.create = function (keyPath, doc, cb) {
                if(!doc._cid) {
                    doc._cid = Gnd.Util.uuid();
                }
                this.store.put(this.makeKey(keyPath.concat(doc._cid)), doc);
                cb(null, doc._cid);
            };
            Local.prototype.fetch = function (keyPath, cb) {
                var keyValue = this.traverseLinks(this.makeKey(keyPath));
                if(keyValue) {
                    cb(null, keyValue.value);
                } else {
                    cb(InvalidKeyError);
                }
            };
            Local.prototype.put = function (keyPath, doc, cb) {
                var key = this.makeKey(keyPath), keyValue = this.traverseLinks(this.makeKey(keyPath));
                if(keyValue) {
                    _.extend(keyValue.value, doc);
                    this.store.put(keyValue.key, keyValue.value);
                    cb();
                } else {
                    cb(InvalidKeyError);
                }
            };
            Local.prototype.del = function (keyPath, cb) {
                var _this = this;
                this.traverseLinks(this.makeKey(keyPath), function (key) {
                    _this.store.del(_this.makeKey(keyPath));
                });
                cb();
            };
            Local.prototype.link = function (newKeyPath, oldKeyPath, cb) {
                var oldKey = this.makeKey(oldKeyPath);
                var newKey = this.makeKey(newKeyPath);
                var keys = this.store.allKeys();
                for(var i = 0; i < keys.length; i++) {
                    if(keys[i].substring(0, oldKey.length) === oldKey) {
                        var link = keys[i].replace(oldKey, newKey);
                        this.store.put(link, keys[i]);
                    }
                }
                cb();
            };
            Local.prototype.add = function (keyPath, itemsKeyPath, itemIds, opts, cb) {
                var key = this.makeKey(keyPath), itemIdsKeys = this.contextualizeIds(itemsKeyPath, itemIds), keyValue = this.traverseLinks(key), oldItemIdsKeys = keyValue ? keyValue.value || {
                } : {
                }, newIdKeys = {
                };
                if(keyPath.length === 1 && itemsKeyPath.length === 1) {
                    this.createCollectionLink(keyPath[0]);
                    return cb();
                }
                key = keyValue ? keyValue.key : key;
                _.each(itemIdsKeys, function (id) {
                    newIdKeys[id] = opts.insync ? 'insync' : 'add';
                });
                this.store.put(key, _.extend(oldItemIdsKeys, newIdKeys));
                cb();
            };
            Local.prototype.remove = function (keyPath, itemsKeyPath, itemIds, opts, cb) {
                var _this = this;
                var key = this.makeKey(keyPath), itemIdsKeys = this.contextualizeIds(itemsKeyPath, itemIds), keyValue = this.traverseLinks(key);
                if(itemIds.length === 0) {
                    return cb();
                }
                if(keyValue) {
                    var keysToDelete = keyValue.value;
                    _.each(itemIdsKeys, function (id) {
                        _this.traverseLinks(id, function (itemKey) {
                            if(opts.insync) {
                                delete keysToDelete[id];
                            } else {
                                keysToDelete[id] = 'rm';
                            }
                        });
                    });
                    this.store.put(keyValue.key, keysToDelete);
                    cb();
                } else {
                    cb(InvalidKeyError);
                }
            };
            Local.prototype.find = function (keyPath, query, opts, cb) {
                var _this = this;
                this.fetch(keyPath, function (err, collection) {
                    var result = {
                    };
                    var sequence = [];
                    if(collection) {
                        _.each(_.keys(collection), function (key) {
                            var op = collection[key];
                            if(op !== 'rm' || !opts.snapshot) {
                                var keyValue = _this.traverseLinks(key);
                                if(keyValue) {
                                    var item = keyValue.value, id = item._cid;
                                    if(!(result[id]) || op === 'insync') {
                                        if(!opts.snapshot) {
                                            item.__op = op;
                                        }
                                        result[id] = item;
                                    }
                                }
                            }
                        });
                    }
                    return cb(null, _.values(result));
                });
            };
            Local.prototype.all = function (keyPath, query, opts, cb) {
                var _this = this;
                var all = [];
                var traverse = function (kp) {
                    _this.next(keyPath, kp, opts, function (err, next) {
                        if(!next) {
                            return cb(null, all);
                        }
                        all.push(next);
                        traverse(next.id);
                    });
                };
                traverse(null);
            };
            Local.prototype.initSequence = function (seq) {
                if(seq.length < 2) {
                    seq[0] = {
                        _id: '##@_begin',
                        prev: -1,
                        next: 1
                    };
                    seq[1] = {
                        _id: '##@_end',
                        prev: 0,
                        next: -1
                    };
                }
            };
            Local.prototype.next = function (keyPath, id, opts, cb) {
                var options = _.defaults(opts, {
                    snapshot: true
                });
                var key = this.makeKey(keyPath);
                var keyValue = this.traverseLinks(key);
                var itemKeys = keyValue ? keyValue.value || [] : [];
                key = keyValue ? keyValue.key : key;
                if(itemKeys.length === 0 && !id) {
                    return cb(null, null);
                }
                id = id || '##@_begin';
                var refItem = _.find(itemKeys, function (item) {
                    return item._id === id || item._cid === id;
                });
                if(refItem) {
                    var item = itemKeys[refItem.next];
                    if(item.next < 0) {
                        return cb(null);
                    }
                    var itemKeyPath = this.parseKey(item.key);
                    var op = item.sync;
                    if(op !== 'rm' || !options.snapshot) {
                        var itemKeyValue = this.traverseLinks(item.key);
                        if(itemKeyValue) {
                            var doc = itemKeyValue.value;
                            if(!options.snapshot) {
                                doc.__op = op;
                            }
                            var iDoc = {
                                id: item._id || item._cid,
                                doc: doc
                            };
                            cb(null, iDoc);
                        }
                    } else {
                        this.next(keyPath, item._id || item._cid, opts, cb);
                    }
                } else {
                    return cb(Error('reference item not found'));
                }
            };
            Local.prototype.deleteItem = function (keyPath, id, opts, cb) {
                var key = this.makeKey(keyPath);
                var keyValue = this.traverseLinks(key);
                var itemKeys = keyValue ? keyValue.value || [] : [];
                key = keyValue ? keyValue.key : key;
                var item = _.find(itemKeys, function (item) {
                    return item._id === id || item._cid === id;
                });
                if(!item || item.sync === 'rm') {
                    return cb(Error('Tried to delete a non-existent item'));
                }
                if(opts.insync) {
                    itemKeys[itemKeys[item.prev].next] = 'deleted';
                    itemKeys[item.prev].next = item.next;
                    itemKeys[item.next].prev = item.prev;
                } else {
                    item.sync = 'rm';
                }
                this.store.put(key, itemKeys);
                cb();
            };
            Local.prototype.insertBefore = function (keyPath, id, itemKeyPath, opts, cb) {
                console.log('insert before');
                console.log(itemKeyPath);
                id = id || '##@_end';
                var key = this.makeKey(keyPath);
                var itemKey = this.makeKey(itemKeyPath);
                var keyValue = this.traverseLinks(key);
                var itemKeys = keyValue ? keyValue.value || [] : [];
                key = keyValue ? keyValue.key : key;
                this.initSequence(itemKeys);
                var refItem = _.find(itemKeys, function (item) {
                    return item._id === id || item._cid === id;
                });
                if(!refItem) {
                    return cb(Error('reference item not found'));
                }
                var prevItem = itemKeys[refItem.prev];
                var newItem = {
                    _cid: Gnd.Util.uuid(),
                    key: itemKey,
                    sync: opts.insync ? 'insync' : 'ib',
                    prev: refItem.prev,
                    next: prevItem.next
                };
                itemKeys.push(newItem);
                prevItem.next = refItem.prev = itemKeys.length - 1;
                this.store.put(key, itemKeys);
                cb(null, newItem._cid);
            };
            Local.prototype.set = function (keyPath, id, sid, cb) {
                var key = this.makeKey(keyPath);
                var keyValue = this.traverseLinks(key);
                var itemKeys = keyValue ? keyValue.value || [] : [];
                key = keyValue ? keyValue.key : key;
                var item = _.find(itemKeys, function (item) {
                    return item._id === id || item._cid === id;
                });
                if(!item) {
                    return cb(Error('Tried to set a non-existent item'));
                }
                if(sid) {
                    item._id = sid;
                }
                switch(item.sync) {
                    case 'rm': {
                        itemKeys[itemKeys[item.prev].next] = 'deleted';
                        itemKeys[item.prev].next = item.next;
                        itemKeys[item.next].prev = item.prev;
                        break;

                    }
                    case 'ib': {
                        item.sync = 'insync';
                        break;

                    }
                }
                this.store.put(key, itemKeys);
                cb();
            };
            return Local;
        })();
        Storage.Local = Local;        
    })(Gnd.Storage || (Gnd.Storage = {}));
    var Storage = Gnd.Storage;
})(Gnd || (Gnd = {}));
