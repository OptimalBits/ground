var Gnd;
(function (Gnd) {
    (function (Sync) {
        var SyncHub = (function () {
            function SyncHub(pubClient, subClient, sockets, sio) {
                this.pubClient = pubClient;
                if(sockets) {
                    if(!sio) {
                        sio = sockets;
                    }
                    sio.on('connection', function (socket) {
                        console.log("Socket %s connected in the Sync Module", socket.id);
                        socket.on('sync', function (keyPath, cb) {
                            console.log("SYNC:" + keyPath);
                            console.log(keyPath);
                            if(!Array.isArray(keyPath)) {
                                cb && cb(new TypeError("keyPath must be a string[]"));
                            } else {
                                var id = keyPath.join(':');
                                console.log("ID:" + id);
                                if(this.check) {
                                    if(this.check(socket.id, keyPath)) {
                                        socket.join(id);
                                    }
                                } else {
                                    console.log("Socket %s started synchronization for id:%s", socket.id, keyPath);
                                    socket.join(id);
                                }
                                cb();
                            }
                        });
                        socket.on('unsync', function (keyPath, cb) {
                            console.log("UNSYNC:" + keyPath);
                            var id = keyPath.join(':');
                            console.log("Socket %s stopped synchronization for id:%s", socket.id, id);
                            socket.leave(id);
                            cb();
                        });
                    });
                    subClient.subscribe('update:');
                    subClient.subscribe('delete:');
                    subClient.subscribe('add:');
                    subClient.subscribe('remove:');
                    subClient.subscribe('push:');
                    subClient.on('message', function (channel, msg) {
                        var args = JSON.parse(msg);
                        var id = args.keyPath.join(':');
                        console.log("MESSAGE:" + channel);
                        console.log(msg);
                        console.log("ID:" + id);
                        switch(channel) {
                            case 'update:': {
                                sio.in(id).emit('update:', args.keyPath, args.doc);
                                break;

                            }
                            case 'delete:': {
                                sio.in(id).emit('delete:', args.keyPath);
                                break;

                            }
                            case 'add:': {
                                console.log("Emitting ADD:" + id);
                                sio.in(id).emit('add:', args.keyPath, args.itemsKeyPath, args.itemIds);
                                break;

                            }
                            case 'remove:': {
                                sio.in(id).emit('remove:', args.keyPath, args.itemsKeyPath, args.itemIds);
                                break;

                            }
                            case 'push:': {
                                console.log("Emitting PUSH:" + id);
                                sio.in(id).emit('push:', args.keyPath, args.itemKeyPath);
                                break;

                            }
                        }
                    });
                }
            }
            SyncHub.prototype.update = function (keyPath, doc) {
                var args = {
                    keyPath: keyPath,
                    doc: doc
                };
                this.pubClient.publish('update:', JSON.stringify(args));
            };
            SyncHub.prototype.delete = function (keyPath) {
                var args = {
                    keyPath: keyPath
                };
                this.pubClient.publish('delete:', JSON.stringify(args));
            };
            SyncHub.prototype.add = function (keyPath, itemsKeyPath, itemIds) {
                var args = {
                    keyPath: keyPath,
                    itemsKeyPath: itemsKeyPath,
                    itemIds: itemIds
                };
                this.pubClient.publish('add:', JSON.stringify(args));
            };
            SyncHub.prototype.remove = function (keyPath, itemsKeyPath, itemIds) {
                var args = {
                    keyPath: keyPath,
                    itemsKeyPath: itemsKeyPath,
                    itemIds: itemIds
                };
                this.pubClient.publish('remove:', JSON.stringify(args));
            };
            SyncHub.prototype.insert = function (keyPath, index, obj) {
            };
            SyncHub.prototype.extract = function (keyPath, index) {
            };
            SyncHub.prototype.push = function (keyPath, itemKeyPath) {
                var args = {
                    keyPath: keyPath,
                    itemKeyPath: itemKeyPath
                };
                console.log('push-synchub');
                console.log(args);
                this.pubClient.publish('push:', JSON.stringify(args));
            };
            SyncHub.prototype.unshift = function (keyPath, itemKeyPath) {
                var args = {
                    keyPath: keyPath,
                    itemKeyPath: itemKeyPath
                };
                console.log('unshift-synchub');
                console.log(args);
                this.pubClient.publish('unshift:', JSON.stringify(args));
            };
            SyncHub.prototype.insertBefore = function (keyPath, refItemKeyPath, itemKeyPath) {
                var args = {
                    keyPath: keyPath,
                    refItemKeyPath: itemKeyPath,
                    itemKeyPath: itemKeyPath
                };
                console.log('insertBefore-synchub');
                console.log(args);
                this.pubClient.publish('insertBefore:', JSON.stringify(args));
            };
            SyncHub.prototype.insertAfter = function (keyPath, refItemKeyPath, itemKeyPath) {
                var args = {
                    keyPath: keyPath,
                    refItemKeyPath: itemKeyPath,
                    itemKeyPath: itemKeyPath
                };
                console.log('insertAfter-synchub');
                console.log(args);
                this.pubClient.publish('insertAfter:', JSON.stringify(args));
            };
            return SyncHub;
        })();
        Sync.SyncHub = SyncHub;        
    })(Gnd.Sync || (Gnd.Sync = {}));
    var Sync = Gnd.Sync;
})(Gnd || (Gnd = {}));
