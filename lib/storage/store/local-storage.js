var Gnd;
(function (Gnd) {
    (function (Storage) {
        (function (Store) {
            Store.localCache = new Gnd.Cache(1024 * 1024);
            var LocalStore = (function () {
                function LocalStore() { }
                LocalStore.prototype.get = function (key) {
                    var doc = Store.localCache.getItem(key);
                    if(doc) {
                        return JSON.parse(doc);
                    }
                    return null;
                };
                LocalStore.prototype.put = function (key, doc) {
                    Store.localCache.setItem(key, JSON.stringify(doc));
                };
                LocalStore.prototype.del = function (key) {
                    Store.localCache.removeItem(key);
                };
                LocalStore.prototype.allKeys = function () {
                    return Store.localCache.getKeys();
                };
                return LocalStore;
            })();
            Store.LocalStore = LocalStore;            
        })(Storage.Store || (Storage.Store = {}));
        var Store = Storage.Store;
    })(Gnd.Storage || (Gnd.Storage = {}));
    var Storage = Gnd.Storage;
})(Gnd || (Gnd = {}));
