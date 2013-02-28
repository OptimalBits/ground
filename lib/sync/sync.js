var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Gnd;
(function (Gnd) {
    (function (Sync) {
        ; ;
        var Manager = (function (_super) {
            __extends(Manager, _super);
            function Manager(socket) {
                var _this = this;
                        _super.call(this);
                this.docs = {
                };
                this.socket = socket;
                this.connectFn = function () {
                    var socket = _this.socket;
                    _.each(_this.docs, function (docs, id) {
                        var doc = docs[0];
                        Gnd.Util.safeEmit(socket, 'sync', doc.getKeyPath(), function (err) {
                            if(err) {
                                console.log('Error syncing %s, %s', doc.getKeyPath(), err);
                            } else {
                                console.log('Syncing %s', doc.getKeyPath());
                            }
                        });
                        Gnd.Util.safeEmit(socket, 'resync', doc.getKeyPath(), function (err, doc) {
                            if(!err) {
                                for(var i = 0, len = docs.length; i < len; i++) {
                                    docs[i].set(doc, {
                                        nosync: true
                                    });
                                }
                            } else {
                                console.log('Error resyncing %s, %s', doc.getKeyPath(), err);
                            }
                        });
                    });
                };
                socket.on('update:', function (keyPath, args) {
                    var key = keyPathToKey(keyPath);
                    _.each(_this.docs[key], function (doc) {
                        doc.set(args, {
                            nosync: true
                        });
                    });
                });
                socket.on('delete:', function (keyPath) {
                    var key = keyPathToKey(keyPath);
                    _.each(_this.docs[key], function (doc) {
                        doc.emit('deleted:', keyPath);
                    });
                });
                socket.on('add:', function (keyPath, itemsKeyPath, itemIds) {
                    var key = keyPathToKey(keyPath);
                    notifyObservers(_this.docs[key], 'add:', itemsKeyPath, itemIds);
                });
                socket.on('remove:', function (keyPath, itemsKeyPath, itemIds) {
                    var key = keyPathToKey(keyPath);
                    notifyObservers(_this.docs[key], 'remove:', itemsKeyPath, itemIds);
                });
                socket.on('insertBefore:', function (keyPath, id, itemKeyPath) {
                    var key = keyPathToKey(keyPath);
                    notifyObservers(_this.docs[key], 'insertBefore:', id, itemKeyPath);
                });
                socket.on('deleteItem:', function (keyPath, id) {
                    var key = keyPathToKey(keyPath);
                    notifyObservers(_this.docs[key], 'deleteItem:', id, null);
                });
            }
            Manager.prototype.init = function () {
                this.socket.on('connect', this.connectFn);
            };
            Manager.prototype.deinit = function () {
                var socket = this.socket;
                if(socket) {
                    socket.removeListener('connect', this.connectFn);
                    socket.removeListener('reconnect', this.connectFn);
                }
            };
            Manager.prototype.startSync = function (doc) {
                var key = docKey(doc), socket = this.socket;
                if(!this.docs[key]) {
                    this.docs[key] = [
                        doc
                    ];
                    Gnd.Util.safeEmit(this.socket, 'sync', doc.getKeyPath(), function (err) {
                        console.log('Start synching:' + doc.getKeyPath());
                    });
                } else {
                    this.docs[key].push(doc);
                }
            };
            Manager.prototype.endSync = function (doc) {
                if(!doc.isKeptSynced()) {
                    return;
                }
                var key = docKey(doc), socket = this.socket, docs = this.docs[key];
                if(docs) {
                    docs = _.reject(docs, function (item) {
                        return item === doc;
                    });
                    if(docs.length === 0) {
                        console.log('Stop synching:' + key);
                        Gnd.Util.safeEmit(this.socket, 'unsync', doc.getKeyPath(), function (err) {
                            console.log('Stop synching:' + doc.getKeyPath());
                        });
                        delete this.docs[key];
                    } else {
                        this.docs[key] = docs;
                    }
                }
            };
            return Manager;
        })(Gnd.Base);
        Sync.Manager = Manager;        
        function notifyObservers(observers, message, itemsKeyPath, itemIds) {
            if(observers) {
                for(var i = 0; i < observers.length; i++) {
                    observers[i].emit(message, itemsKeyPath, itemIds);
                }
            }
        }
        function keyPathToKey(keyPath) {
            return keyPath.join(':');
        }
        function docKey(doc) {
            return keyPathToKey(doc.getKeyPath());
        }
    })(Gnd.Sync || (Gnd.Sync = {}));
    var Sync = Gnd.Sync;
})(Gnd || (Gnd = {}));
