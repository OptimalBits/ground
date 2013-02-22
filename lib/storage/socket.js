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
            Socket.prototype.insert = function (keyPath, index, doc, cb) {
                Gnd.Util.safeEmit(this.socket, 'insert', keyPath, index, doc, cb);
            };
            Socket.prototype.extract = function (keyPath, index, cb) {
                Gnd.Util.safeEmit(this.socket, 'extract', keyPath, index, cb);
            };
            Socket.prototype.all = function (keyPath, cb) {
                Gnd.Util.safeEmit(this.socket, 'all', keyPath, cb);
            };
            Socket.prototype.first = function (keyPath, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'first', keyPath, opts, cb);
            };
            Socket.prototype.last = function (keyPath, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'last', keyPath, opts, cb);
            };
            Socket.prototype.next = function (keyPath, refItemKeyPath, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'prev', keyPath, refItemKeyPath, opts, cb);
            };
            Socket.prototype.prev = function (keyPath, refItemKeyPath, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'prev', keyPath, refItemKeyPath, opts, cb);
            };
            Socket.prototype.pop = function (keyPath, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'pop', keyPath, opts, cb);
            };
            Socket.prototype.shift = function (keyPath, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'shift', keyPath, opts, cb);
            };
            Socket.prototype.deleteItem = function (keyPath, itemKeyPath, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'deleteItem', keyPath, opts, cb);
            };
            Socket.prototype.push = function (keyPath, itemKeyPath, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'push', keyPath, itemKeyPath, opts, cb);
            };
            Socket.prototype.unshift = function (keyPath, itemKeyPath, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'unshift', keyPath, itemKeyPath, opts, cb);
            };
            Socket.prototype.insertBefore = function (keyPath, refItemKeyPath, itemKeyPath, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'insertBefore', keyPath, refItemKeyPath, itemKeyPath, opts, cb);
            };
            Socket.prototype.insertAfter = function (keyPath, refItemKeyPath, itemKeyPath, opts, cb) {
                Gnd.Util.safeEmit(this.socket, 'insertAfter', keyPath, refItemKeyPath, itemKeyPath, opts, cb);
            };
            return Socket;
        })();
        Storage.Socket = Socket;        
    })(Gnd.Storage || (Gnd.Storage = {}));
    var Storage = Gnd.Storage;
})(Gnd || (Gnd = {}));
