var Gnd;
(function (Gnd) {
    (function (Storage) {
        var localCache = new Gnd.Cache(1024 * 1024);
        function _get(key) {
            var doc = localCache.getItem(key);
            if(doc) {
                return JSON.parse(doc);
            }
            return null;
        }
        function contextualizeIds(keyPath, itemIds) {
            var baseItemPath = makeKey(keyPath);
            return _.map(itemIds, function (id) {
                return makeKey([
                    baseItemPath, 
                    id
                ]);
            });
        }
        function _put(key, doc) {
            localCache.setItem(key, JSON.stringify(doc));
        }
        function makeKey(keyPath) {
            return keyPath.join('@');
        }
        function parseKey(key) {
            return key.split('@');
        }
        function isLink(doc) {
            return _.isString(doc);
        }
        function isCollectionLink(doc) {
            return doc[0] === '/' && doc[doc.length - 1] === '/';
        }
        function createCollectionLink(collection) {
            var link = '/^' + collection + '@[^@]+$/';
            _put(collection, link);
        }
        var InvalidKeyError = new Error('Invalid Key');
        function traverseLinks(key, fn) {
            var value = _get(key);
            if(value) {
                fn && fn(key);
                if(isLink(value)) {
                    if(isCollectionLink(value)) {
                        var regex = new RegExp(value.slice(1, value.length - 1));
                        var allKeys = localCache.getKeys();
                        var keys = _.filter(allKeys, function (key) {
                            if(key.match(regex)) {
                                var value = _get(key);
                                return !isLink(value);
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
                        return traverseLinks(value);
                    }
                } else {
                    return {
                        key: key,
                        value: value
                    };
                }
            }
        }
        var Local = (function () {
            function Local() { }
            Local.prototype.create = function (keyPath, doc, cb) {
                if(!doc._cid) {
                    doc._cid = Gnd.Util.uuid();
                }
                _put(makeKey(keyPath.concat(doc._cid)), doc);
                cb(null, doc._cid);
            };
            Local.prototype.fetch = function (keyPath, cb) {
                var keyValue = traverseLinks(makeKey(keyPath));
                if(keyValue) {
                    cb(null, keyValue.value);
                } else {
                    cb(InvalidKeyError);
                }
            };
            Local.prototype.put = function (keyPath, doc, cb) {
                var key = makeKey(keyPath), keyValue = traverseLinks(makeKey(keyPath));
                if(keyValue) {
                    _.extend(keyValue.value, doc);
                    _put(keyValue.key, keyValue.value);
                    cb();
                } else {
                    cb(InvalidKeyError);
                }
            };
            Local.prototype.del = function (keyPath, cb) {
                traverseLinks(makeKey(keyPath), function (key) {
                    localCache.removeItem(makeKey(keyPath));
                });
                cb();
            };
            Local.prototype.link = function (newKeyPath, oldKeyPath, cb) {
                var oldKey = makeKey(oldKeyPath);
                var newKey = makeKey(newKeyPath);
                var keys = localCache.getKeys();
                for(var i = 0; i < keys.length; i++) {
                    if(keys[i].substring(0, oldKey.length) === oldKey) {
                        var link = keys[i].replace(oldKey, newKey);
                        _put(link, keys[i]);
                    }
                }
                cb();
            };
            Local.prototype.add = function (keyPath, itemsKeyPath, itemIds, opts, cb) {
                var key = makeKey(keyPath), itemIdsKeys = contextualizeIds(itemsKeyPath, itemIds), keyValue = traverseLinks(key), oldItemIdsKeys = keyValue ? keyValue.value || {
                } : {
                }, newIdKeys = {
                };
                if(keyPath.length === 1 && itemsKeyPath.length === 1) {
                    createCollectionLink(keyPath[0]);
                    return cb();
                }
                key = keyValue ? keyValue.key : key;
                _.each(itemIdsKeys, function (id) {
                    newIdKeys[id] = opts.insync ? 'insync' : 'add';
                });
                _put(key, _.extend(oldItemIdsKeys, newIdKeys));
                cb();
            };
            Local.prototype.remove = function (keyPath, itemsKeyPath, itemIds, opts, cb) {
                var key = makeKey(keyPath), itemIdsKeys = contextualizeIds(itemsKeyPath, itemIds), keyValue = traverseLinks(key);
                if(itemIds.length === 0) {
                    return cb();
                }
                if(keyValue) {
                    var keysToDelete = keyValue.value;
                    _.each(itemIdsKeys, function (id) {
                        traverseLinks(id, function (itemKey) {
                            if(opts.insync) {
                                delete keysToDelete[id];
                            } else {
                                keysToDelete[id] = 'rm';
                            }
                        });
                    });
                    _put(keyValue.key, keysToDelete);
                    cb();
                } else {
                    cb(InvalidKeyError);
                }
            };
            Local.prototype.find = function (keyPath, query, opts, cb) {
                this.fetch(keyPath, function (err, collection) {
                    var result = {
                    };
                    var sequence = [];
                    if(_.isArray(collection)) {
                        _.each(collection, function (elem) {
                            var key = elem.key;
                            var op = elem.sync;
                            if(op !== 'rm' || !opts.snapshot) {
                                var keyValue = traverseLinks(key);
                                if(keyValue) {
                                    var item = keyValue.value;
                                    if(!opts.snapshot) {
                                        item.__op = op;
                                    }
                                    sequence.push(item);
                                }
                            }
                        });
                        return cb(null, sequence);
                    } else {
                        if(collection) {
                            _.each(_.keys(collection), function (key) {
                                var op = collection[key];
                                if(op !== 'rm' || !opts.snapshot) {
                                    var keyValue = traverseLinks(key);
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
                    }
                });
            };
            Local.prototype.insert = function (keyPath, index, doc, cb) {
                var key = makeKey(keyPath);
                var oldItems = _get(key) || [];
                if(index == -1) {
                    oldItems.push(doc);
                } else {
                    oldItems.splice(index, 0, doc);
                }
                _put(key, oldItems);
                cb(null);
            };
            Local.prototype.extract = function (keyPath, index, cb) {
                var key = makeKey(keyPath);
                var oldItems = _get(key) || [];
                var extracted = oldItems.splice(index, 1) || [];
                _put(key, oldItems);
                cb(null, extracted[0]);
            };
            Local.prototype.all = function (keyPath, query, opts, cb) {
                this.fetch(keyPath, function (err, collection) {
                    var result = {
                    };
                    var sequence = [];
                    if(_.isArray(collection)) {
                        _.each(collection, function (elem) {
                            var key = elem.key;
                            var op = elem.sync;
                            if(op !== 'rm' || !opts.snapshot) {
                                var keyValue = traverseLinks(key);
                                if(keyValue) {
                                    var item = keyValue.value;
                                    if(!opts.snapshot) {
                                        item.__op = op;
                                    }
                                    sequence.push(item);
                                }
                            }
                        });
                        return cb(null, sequence);
                    }
                });
            };
            Local.prototype.initSequence = function (seq) {
                if(seq.length < 2) {
                    seq[0] = {
                        key: '##@first',
                        prev: -1,
                        next: 1
                    };
                    seq[1] = {
                        key: '##@last',
                        prev: 0,
                        next: -1
                    };
                }
            };
            Local.prototype.first = function (keyPath, opts, cb) {
                this.next(keyPath, [
                    '##', 
                    'first'
                ], opts, cb);
            };
            Local.prototype.last = function (keyPath, opts, cb) {
                this.prev(keyPath, [
                    '##', 
                    'last'
                ], opts, cb);
            };
            Local.prototype.next = function (keyPath, refItemKeyPath, opts, cb) {
                var key = makeKey(keyPath);
                var refItemKey = makeKey(refItemKeyPath);
                var keyValue = traverseLinks(key);
                var itemKeys = keyValue ? keyValue.value || [] : [];
                key = keyValue ? keyValue.key : key;
                var refItem = _.find(itemKeys, function (item) {
                    return item.key === refItemKey;
                });
                if(!refItem) {
                    return cb(Error('reference item not found'));
                }
                var item = itemKeys[refItem.next];
                if(item.next < 0) {
                    return cb(null);
                }
                this.fetch(parseKey(item.key), cb);
            };
            Local.prototype.prev = function (keyPath, refItemKeyPath, opts, cb) {
                var key = makeKey(keyPath);
                var refItemKey = makeKey(refItemKeyPath);
                var keyValue = traverseLinks(key);
                var itemKeys = keyValue ? keyValue.value || [] : [];
                key = keyValue ? keyValue.key : key;
                var refItem = _.find(itemKeys, function (item) {
                    return item.key === refItemKey;
                });
                if(!refItem) {
                    return cb(Error('reference item not found'));
                }
                var item = itemKeys[refItem.prev];
                if(item.prev < 0) {
                    return cb(null);
                }
                this.fetch(parseKey(item.key), cb);
            };
            Local.prototype.pop = function (keyPath, opts, cb) {
                var _this = this;
                var key = makeKey(keyPath);
                var keyValue = traverseLinks(key);
                var itemKeys = keyValue ? keyValue.value || [] : [];
                var refItem = _.find(itemKeys, function (item) {
                    return item.key === makeKey([
                        '##', 
                        'last'
                    ]);
                });
                var item = itemKeys[refItem.prev];
                if(item.key === makeKey([
                    '##', 
                    'first'
                ])) {
                    return cb(Error('No last item to pop'));
                }
                var itemKey = parseKey(item.key);
                this.deleteItem(keyPath, itemKey, opts, function (err) {
                    if(err) {
                        return cb(err);
                    }
                    _this.fetch(itemKey, cb);
                });
            };
            Local.prototype.shift = function (keyPath, opts, cb) {
                var _this = this;
                var key = makeKey(keyPath);
                var keyValue = traverseLinks(key);
                var itemKeys = keyValue ? keyValue.value || [] : [];
                var refItem = _.find(itemKeys, function (item) {
                    return item.key === makeKey([
                        '##', 
                        'first'
                    ]);
                });
                var item = itemKeys[refItem.next];
                if(item.key === makeKey([
                    '##', 
                    'last'
                ])) {
                    return cb(Error('No last item to pop'));
                }
                var itemKey = parseKey(item.key);
                this.deleteItem(keyPath, itemKey, opts, function (err) {
                    if(err) {
                        return cb(err);
                    }
                    _this.fetch(itemKey, cb);
                });
            };
            Local.prototype.deleteItem = function (keyPath, itemKeyPath, opts, cb) {
                var key = makeKey(keyPath);
                var itemKey = makeKey(itemKeyPath);
                var keyValue = traverseLinks(key);
                var itemKeys = keyValue ? keyValue.value || [] : [];
                key = keyValue ? keyValue.key : key;
                var item = _.find(itemKeys, function (item) {
                    return item.key === itemKey;
                });
                item.sync = 'rm';
                itemKeys[item.prev].next = item.next;
                itemKeys[item.next].prev = item.prev;
                _put(key, itemKeys);
                cb();
            };
            Local.prototype.push = function (keyPath, itemKeyPath, opts, cb) {
                this.insertBefore(keyPath, [
                    '##', 
                    'last'
                ], itemKeyPath, opts, cb);
            };
            Local.prototype.unshift = function (keyPath, itemKeyPath, opts, cb) {
                this.insertAfter(keyPath, [
                    '##', 
                    'first'
                ], itemKeyPath, opts, cb);
            };
            Local.prototype.insertBefore = function (keyPath, refItemKeyPath, itemKeyPath, opts, cb) {
                var refItemKey;
                if(refItemKeyPath) {
                    refItemKey = traverseLinks(makeKey(refItemKeyPath)).key;
                } else {
                    refItemKey = makeKey([
                        '##', 
                        'last'
                    ]);
                }
                var key = makeKey(keyPath);
                var itemKey = makeKey(itemKeyPath);
                var keyValue = traverseLinks(key);
                var itemKeys = keyValue ? keyValue.value || [] : [];
                key = keyValue ? keyValue.key : key;
                this.initSequence(itemKeys);
                var refItem = _.find(itemKeys, function (item) {
                    return item.key === refItemKey;
                });
                if(!refItem) {
                    return cb(Error('reference item not found'));
                }
                var prevItem = itemKeys[refItem.prev];
                var newItem = {
                    key: itemKey,
                    sync: opts.insync ? 'insync' : 'ib',
                    prev: refItem.prev,
                    next: prevItem.next
                };
                itemKeys.push(newItem);
                prevItem.next = refItem.prev = itemKeys.length - 1;
                _put(key, itemKeys);
                cb();
            };
            Local.prototype.insertAfter = function (keyPath, refItemKeyPath, itemKeyPath, opts, cb) {
                var key = makeKey(keyPath);
                var refItemKey = makeKey(refItemKeyPath);
                var itemKey = makeKey(itemKeyPath);
                var keyValue = traverseLinks(key);
                var itemKeys = keyValue ? keyValue.value || [] : [];
                key = keyValue ? keyValue.key : key;
                this.initSequence(itemKeys);
                var refItem = _.find(itemKeys, function (item) {
                    return item.key === refItemKey;
                });
                if(!refItem) {
                    return cb(Error('reference item not found'));
                }
                var nextItem = itemKeys[refItem.next];
                var newItem = {
                    key: itemKey,
                    sync: opts.insync ? 'insync' : 'ib',
                    prev: nextItem.prev,
                    next: refItem.next
                };
                itemKeys.push(newItem);
                refItem.next = nextItem.prev = itemKeys.length - 1;
                _put(key, itemKeys);
                cb();
            };
            return Local;
        })();
        Storage.Local = Local;        
    })(Gnd.Storage || (Gnd.Storage = {}));
    var Storage = Gnd.Storage;
})(Gnd || (Gnd = {}));
