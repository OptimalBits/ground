var Gnd;
(function (Gnd) {
    var Server = (function () {
        function Server(persistentStorage, syncHub) {
            this.storage = new ProxyStorage(persistentStorage, syncHub);
        }
        return Server;
    })();
    Gnd.Server = Server;    
    var ProxyStorage = (function () {
        function ProxyStorage(storage, sync) {
            this.storage = storage;
            this.syncHub = sync;
        }
        ProxyStorage.prototype.create = function (keyPath, doc, cb) {
            this.storage.create(keyPath, doc, cb);
        };
        ProxyStorage.prototype.put = function (keyPath, doc, cb) {
            var _this = this;
            this.storage.put(keyPath, doc, function (err) {
                if(!err) {
                    _this.syncHub && _this.syncHub.update(keyPath, doc);
                }
                cb(err);
            });
        };
        ProxyStorage.prototype.fetch = function (keyPath, cb) {
            this.storage.fetch(keyPath, cb);
        };
        ProxyStorage.prototype.del = function (keyPath, cb) {
            var _this = this;
            this.storage.del(keyPath, function (err) {
                if(!err) {
                    _this.syncHub && _this.syncHub.delete(keyPath);
                }
                cb(err);
            });
        };
        ProxyStorage.prototype.add = function (keyPath, itemsKeyPath, itemIds, opts, cb) {
            var _this = this;
            this.storage.add(keyPath, itemsKeyPath, itemIds, opts, function (err) {
                if(!err) {
                    _this.syncHub && _this.syncHub.add(keyPath, itemsKeyPath, itemIds);
                }
                cb(err);
            });
        };
        ProxyStorage.prototype.remove = function (keyPath, itemsKeyPath, itemIds, opts, cb) {
            var _this = this;
            this.storage.remove(keyPath, itemsKeyPath, itemIds, opts, function (err) {
                if(!err) {
                    _this.syncHub && _this.syncHub.remove(keyPath, itemsKeyPath, itemIds);
                }
                cb(err);
            });
        };
        ProxyStorage.prototype.find = function (keyPath, query, options, cb) {
            this.storage.find(keyPath, query, options, cb);
        };
        ProxyStorage.prototype.insert = function (keyPath, index, doc, cb) {
            var self = this;
            this.storage.insert(keyPath, index, doc, function (err) {
                if(!err) {
                    this.syncHub && self.syncHub.insert(keyPath, index, doc);
                }
                cb(err);
            });
        };
        ProxyStorage.prototype.extract = function (keyPath, index, cb) {
            var self = this;
            this.storage.extract(keyPath, index, function (err, doc) {
                if(!err) {
                    this.syncHub && self.syncHub.extract(keyPath, index);
                }
                cb(err, doc);
            });
        };
        ProxyStorage.prototype.all = function (keyPath, cb) {
            this.storage.all(keyPath, cb);
        };
        ProxyStorage.prototype.first = function (keyPath, opts, cb) {
            this.storage.first(keyPath, opts, cb);
        };
        ProxyStorage.prototype.last = function (keyPath, opts, cb) {
            this.storage.last(keyPath, opts, cb);
        };
        ProxyStorage.prototype.next = function (keyPath, refItemKeyPath, opts, cb) {
            this.storage.next(keyPath, refItemKeyPath, opts, cb);
        };
        ProxyStorage.prototype.prev = function (keyPath, refItemKeyPath, opts, cb) {
            this.storage.prev(keyPath, refItemKeyPath, opts, cb);
        };
        ProxyStorage.prototype.pop = function (keyPath, opts, cb) {
            this.storage.pop(keyPath, opts, cb);
        };
        ProxyStorage.prototype.shift = function (keyPath, opts, cb) {
            this.storage.shift(keyPath, opts, cb);
        };
        ProxyStorage.prototype.deleteItem = function (keyPath, itemKeyPath, opts, cb) {
        };
        ProxyStorage.prototype.push = function (keyPath, itemKeyPath, opts, cb) {
            var _this = this;
            this.storage.push(keyPath, itemKeyPath, opts, function (err) {
                if(!err) {
                    _this.syncHub && _this.syncHub.push(keyPath, itemKeyPath);
                }
                cb(err);
            });
        };
        ProxyStorage.prototype.unshift = function (keyPath, itemKeyPath, opts, cb) {
            var _this = this;
            this.storage.unshift(keyPath, itemKeyPath, opts, function (err) {
                if(!err) {
                    _this.syncHub && _this.syncHub.unshift(keyPath, itemKeyPath);
                }
                cb(err);
            });
        };
        ProxyStorage.prototype.insertBefore = function (keyPath, refItemKeyPath, itemKeyPath, opts, cb) {
            var _this = this;
            this.storage.insertBefore(keyPath, refItemKeyPath, itemKeyPath, opts, function (err) {
                if(!err) {
                    _this.syncHub && _this.syncHub.insertBefore(keyPath, itemKeyPath);
                }
                cb(err);
            });
        };
        ProxyStorage.prototype.insertAfter = function (keyPath, refItemKeyPath, itemKeyPath, opts, cb) {
            var _this = this;
            this.storage.insertAfter(keyPath, refItemKeyPath, itemKeyPath, opts, function (err) {
                if(!err) {
                    _this.syncHub && _this.syncHub.insertAfter(keyPath, itemKeyPath);
                }
                cb(err);
            });
        };
        return ProxyStorage;
    })();    
})(Gnd || (Gnd = {}));
