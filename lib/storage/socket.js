var Gnd;
(function (Gnd) {
    (function (Storage) {
        var Socket = (function () {
            function Socket(socket) {
                this.socket = socket;
            }
            Socket.prototype.create = function (keyPath, doc, cb) {
                Gnd.Util.safeEmit(this.socket, 'create', keyPath, doc, cb);
            };
            Socket.prototype.put = function (keyPath, doc, cb) {
                delete doc['_id'];
                Gnd.Util.safeEmit(this.socket, 'put', keyPath, doc, cb);
            };
            Socket.prototype.fetch = function (keyPath, cb) {
                Gnd.Util.safeEmit(this.socket, 'get', keyPath, cb);
            };
            Socket.prototype.del = function (keyPath, cb) {
                Gnd.Util.safeEmit(this.socket, 'del', keyPath, cb);
            };
            Socket.prototype.add = function (keyPath, itemsKeyPath, itemIds, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'add', keyPath, itemsKeyPath, itemIds, cb);
            };
            Socket.prototype.remove = function (keyPath, itemsKeyPath, itemIds, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'remove', keyPath, itemsKeyPath, itemIds, cb);
            };
            Socket.prototype.find = function (keyPath, query, options, cb) {
                Gnd.Util.safeEmit(this.socket, 'find', keyPath, query, options, cb);
            };
            Socket.prototype.all = function (keyPath, query, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'all', keyPath, query, opts, cb);
            };
            Socket.prototype.next = function (keyPath, id, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'next', keyPath, id, opts, cb);
            };
            Socket.prototype.deleteItem = function (keyPath, id, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'deleteItem', keyPath, id, opts, cb);
            };
            Socket.prototype.insertBefore = function (keyPath, id, itemKeyPath, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'insertBefore', keyPath, id, itemKeyPath, opts, cb);
            };
            return Socket;
        })();
        Storage.Socket = Socket;        
    })(Gnd.Storage || (Gnd.Storage = {}));
    var Storage = Gnd.Storage;
})(Gnd || (Gnd = {}));
