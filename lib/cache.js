var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
}
define(["require", "exports", './base'], function(require, exports, __Base__) {
    var Base = __Base__;

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
        Cache.prototype.getItem = function (key) {
            var old = this.map[key];
            var value;

            if(old) {
                value = ls[this.key(key, old.time)];
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
                ls[this.key(key, time)] = value;
                if(old) {
                    if(old.time !== time) {
                        this.remove(key, old.time);
                    }
                    idx = old.idx;
                    this.index.touch(idx);
                } else {
                    this.length++;
                    idx = this.index.addKey(key);
                }
                this.map[key] = {
                    time: time,
                    size: value.length,
                    idx: idx
                };
            }
        };
        Cache.prototype.removeItem = function (key) {
            var item = this.map[key];
            if(item) {
                this.remove(key, item.time);
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
        Cache.prototype.key = function (key, timestamp) {
            return key + '|' + timestamp;
        };
        Cache.prototype.remove = function (key, timestamp) {
            var key = this.key(key, timestamp);
            delete ls[key];
        };
        Cache.prototype.populate = function () {
            var that = this;
            var i;
            var len;
            var key;
            var s;
            var k;
            var size;

            this.size = 0;
            this.map = {
            };
            this.index = new Index();
            for(i = 0 , len = ls.length; i < len; i++) {
                key = ls.key(i);
                if(key.indexOf('|') != -1) {
                    size = ls[key].length;
                    s = key.split('|');
                    k = s[0];
                    if(!this.map[k] || this.map[k].time < s[1]) {
                        this.map[k] = {
                            time: s[1],
                            size: size
                        };
                    }
                    this.size += size;
                }
            }
            var list = _.map(this.map, function (item, key) {
                return {
                    time: item.time,
                    key: key
                };
            });
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
    })(Base.Base);
    exports.Cache = Cache;    
})

