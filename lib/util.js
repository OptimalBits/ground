var Gnd;
(function (Gnd) {
    (function (Util) {
        function noop() {
        }
        Util.noop = noop;
        ; ;
        function assert(cond, msg) {
            if(!cond) {
                console.log('Assert failed:%s', msg);
            }
        }
        Util.assert = assert;
        ; ;
        function uuid(a, b) {
            for(b = a = ''; a++ < 36; b += a * 51 & 52 ? (a ^ 15 ? 8 ^ Math.random() * (a ^ 20 ? 16 : 4) : 4).toString(16) : '-') {
                ; ;
            }
            return b;
        }
        Util.uuid = uuid;
        ; ;
        function refresh() {
            window.location.replace('');
        }
        Util.refresh = refresh;
        ; ;
        function retain(objs) {
            var items = _.isArray(objs) ? objs : arguments;
            _.each(items, function (obj) {
                obj && obj.retain();
            });
        }
        Util.retain = retain;
        ; ;
        function release(objs) {
            var items = _.isArray(objs) ? objs : arguments;
            _.each(items, function (obj) {
                obj && obj.release();
            });
        }
        Util.release = release;
        ; ;
        function nextTick(fn) {
            setTimeout(fn, 0);
        }
        Util.nextTick = nextTick;
        ; ;
        function trim() {
            return this.replace(/^\s+|\s+$/g, '');
        }
        Util.trim = trim;
        ; ;
        function asyncDebounce(fn) {
            var delayedFunc = null, executing = null;
            return function debounced() {
                var context = this, args = arguments, nargs = args.length, cb = args[nargs - 1], delayed = function () {
executing = fn;fn.apply(context, args);                };
                args[nargs - 1] = function () {
                    cb.apply(context, arguments);
                    executing = null;
                    if(delayedFunc) {
                        var f = delayedFunc;
                        delayedFunc = null;
                        f();
                    }
                };
                if(executing) {
                    delayedFunc = delayed;
                } else {
                    delayed();
                }
            }
        }
        Util.asyncDebounce = asyncDebounce;
        ; ;
        function waitTrigger(func, start, end, delay) {
            return function waiter() {
                var obj = this, waiting = false, timer = null, args = Array.prototype.slice.call(arguments), nargs = args.length, callback = args[nargs - 1];
                args[nargs - 1] = function () {
                    clearTimeout(timer);
                    if(waiting) {
                        end();
                    }
                    callback.apply(obj, arguments);
                };
                timer = setTimeout(function () {
                    waiting = true;
                    start();
                }, delay);
                func.apply(this, args);
            }
        }
        Util.waitTrigger = waitTrigger;
        ; ;
        function searchFilter(obj, search, fields) {
            if(search) {
                var result = false;
                search = search.toLowerCase();
                for(var i = 0, len = fields.length; i < len; i++) {
                    if(String(obj[fields[i]]).toLowerCase().indexOf(search) != -1) {
                        result = true;
                    }
                }
                return result;
            } else {
                return true;
            }
        }
        Util.searchFilter = searchFilter;
        ; ;
        function asyncForEach(array, fn, cb) {
            var completed = 0;
            function iter(item, len) {
                fn(item, function (err) {
                    if(err) {
                        cb && cb(err);
                        cb = noop;
                    } else {
                        completed++;
                        if(completed === len) {
                            cb && cb(null);
                        }
                    }
                });
            }
            if(_.isArray(array)) {
                if(array.length === 0) {
                    cb && cb(null);
                } else {
                    for(var i = 0, len = array.length; i < len; i++) {
                        iter(array[i], len);
                    }
                }
            } else {
                iter(array, 1);
            }
        }
        Util.asyncForEach = asyncForEach;
        ; ;
        function asyncForEachSeries(arr, fn, cb) {
            cb = cb || noop;
            if(!arr.length) {
                return cb();
            }
            var completed = 0;
            function iterate() {
                fn(arr[completed], function (err) {
                    if(err) {
                        cb(err);
                        cb = noop;
                    } else {
                        completed++;
                        if(completed < arr.length) {
                            iterate();
                        } else {
                            cb();
                        }
                    }
                });
            }
            ; ;
            iterate();
        }
        Util.asyncForEachSeries = asyncForEachSeries;
        function extend(parent, subclass) {
            var methods;
            var d = function Derived() {
                parent.apply(this, arguments);
            };
            if(subclass) {
                methods = subclass(parent.prototype);
                d = methods.constructor;
            }
            function __() {
                this.constructor = d;
            }
            __.prototype = parent.prototype;
            d.prototype = new __();
            _.extend(d.prototype, methods);
            return d;
        }
        Util.extend = extend;
        function safeEmit(socket) {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                args[_i] = arguments[_i + 1];
            }
            var cb = _.last(args);
            function errorFn() {
                cb(new Error('Socket disconnected'));
            }
            ; ;
            function proxyCb(err, res) {
                socket.removeListener('disconnect', errorFn);
                if(err) {
                    err = new Error(err);
                }
                cb(err, res);
            }
            ; ;
            args[args.length - 1] = proxyCb;
            if(socket.socket.connected) {
                socket.once('disconnect', errorFn);
                socket.emit.apply(socket, args);
            } else {
                errorFn();
            }
        }
        Util.safeEmit = safeEmit;
        function waitForImages(el, cb) {
            var $images = Gnd.$('img', el), counter = $images.length;
            if(counter > 0) {
                var loadEvent = function (evt) {
                    $images.off('load', loadEvent);
                    counter--;
                    if(counter === 0) {
                        cb();
                    }
                };
                $images.on('load', loadEvent);
            } else {
                cb();
            }
        }
        Util.waitForImages = waitForImages;
        function fetchTemplate(templateUrl, cssUrl, done) {
            var items = [];
            templateUrl && items.push('text!' + templateUrl);
            cssUrl && items.push('css!' + cssUrl);
            done = done || Util.noop;
            try  {
                curl(items, function (templ) {
                    done(null, templ);
                });
            } catch (e) {
                done(e);
            }
        }
        Util.fetchTemplate = fetchTemplate;
    })(Gnd.Util || (Gnd.Util = {}));
    var Util = Gnd.Util;
})(Gnd || (Gnd = {}));
