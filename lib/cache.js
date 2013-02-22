var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ls = localStorage;
var Index = (function () {
    function Index() {
        this.tail = {
            prev: 0,
            next: 0,
            key: ''
        };
        this.index = [
            this.tail
        ];
        this.first = this.last = 0;
        this.unusedKeys = [];
    }
    Index.prototype.newIdx = function () {
        if(this.unusedKeys.length > 0) {
            return this.unusedKeys.pop();
        } else {
            return this.index.length;
        }
    };
    Index.prototype.addKey = function (key) {
        var elem = {
            prev: this.last,
            next: this.first,
            key: key
        };
        var idx = this.newIdx();
        this.index[idx] = elem;
        var firstElem = this.index[this.first];
        var lastElem = this.index[this.last];
        firstElem.prev = idx;
        lastElem.next = idx;
        this.first = idx;
        return idx;
    };
    Index.prototype.touch = function (idx) {
        var key = this.remove(idx);
        return this.addKey(key);
    };
    Index.prototype.remove = function (idx) {
        if(idx === 0) {
            return null;
        }
        var elem = this.index[idx];
        var nextElem = this.index[elem.next];
        var prevElem = this.index[elem.prev];
        nextElem.prev = elem.prev;
        prevElem.next = elem.next;
        if(idx === this.first) {
            this.first = elem.next;
        } else {
            if(idx === this.last) {
                this.last = elem.prev;
            }
        }
        this.unusedKeys.push(idx);
        return elem.key;
    };
    Index.prototype.getLast = function () {
        if(this.first === this.last) {
            return null;
        } else {
            return this.index[this.tail.prev].key;
        }
    };
    return Index;
})();
var Gnd;
(function (Gnd) {
    var Cache = (function (_super) {
        __extends(Cache, _super);
        function Cache(maxSize) {
            if (typeof maxSize === "undefined") { maxSize = 5 * 1024 * 1024; }
                _super.call(this);
            this.size = 0;
            this.length = 0;
            this.maxSize = maxSize;
            this.populate();
        }
        Cache.prototype.each = function (cb) {
            var result;
            for(var key in this.map) {
                result = cb(key);
                if(result) {
                    return result;
                }
            }
        };
        Cache.prototype.getKeys = function () {
            return _.keys(this.map);
        };
        Cache.prototype.serialize = function (time, value) {
            return time + '|' + value;
        };
        Cache.prototype.deserialize = function (str) {
            var i;
            if(_.isString(str)) {
                i = str.indexOf('|');
                if(i > -1) {
                    return {
                        time: +str.slice(0, i),
                        value: str.slice(i + 1)
                    };
                }
            }
            return {
                time: -1,
                value: undefined
            };
        };
        Cache.prototype.getItem = function (key) {
            var old = this.map[key], tVal, value;
            if(old) {
                tVal = this.deserialize(ls[key]);
                value = tVal.value;
                value && this.setItem(key, value);
            }
            return value;
        };
        Cache.prototype.setItem = function (key, value) {
            var time = Date.now();
            var old = this.map[key];
            value = String(value);
            var requested = value.length;
            var idx;
            if(old) {
                requested -= old.size;
            }
            if(this.makeRoom(requested)) {
                this.size += requested;
                ls[key] = this.serialize(time, value);
                if(old) {
                    idx = old.idx;
                    this.index.touch(idx);
                } else {
                    this.length++;
                    idx = this.index.addKey(key);
                }
                this.map[key] = {
                    size: value.length,
                    idx: idx
                };
            }
        };
        Cache.prototype.removeItem = function (key) {
            var item = this.map[key];
            if(item) {
                this.remove(key);
                this.size -= item.size;
                delete this.map[key];
                this.length--;
                this.index.remove(item.idx);
            }
        };
        Cache.prototype.clear = function () {
            for(var key in this.map) {
                this.removeItem(key);
            }
            this.length = 0;
            this.size = 0;
        };
        Cache.prototype.setMaxSize = function (size) {
            this.maxSize = size;
        };
        Cache.prototype.remove = function (key) {
            delete ls[key];
        };
        Cache.prototype.populate = function () {
            var that = this;
            var i, len, key, tVal, size, list = [];
            this.size = 0;
            this.map = {
            };
            this.index = new Index();
            for(i = 0 , len = ls.length; i < len; i++) {
                key = ls.key(i);
                tVal = this.deserialize(ls[key]);
                if(tVal.value) {
                    size = tVal.value.length;
                    list.push({
                        time: tVal.time,
                        key: key
                    });
                    this.map[key] = {
                        size: size
                    };
                    this.size += size;
                }
            }
            var sorted = _.sortBy(list, function (item) {
                return item.time;
            });
            _.each(sorted, function (elem) {
                var idx = that.index.addKey(elem.key);
                that.map[elem.key].idx = idx;
            });
            this.length = _.size(this.map);
        };
        Cache.prototype.makeRoom = function (size) {
            var target = this.maxSize - size;
            var last;
            if(this.size > target) {
                if(target < 0) {
                    return false;
                } else {
                    last = this.index.getLast();
                    while(this.size > target) {
                        if(last === null) {
                            return false;
                        }
                        this.removeItem(last);
                        last = this.index.getLast();
                    }
                }
            }
            return true;
        };
        return Cache;
    })(Gnd.Base);
    Gnd.Cache = Cache;    
})(Gnd || (Gnd = {}));
