var Gnd;
(function (Gnd) {
                function $(selectorOrElement, context) {
        var context = context || document, query = new Query(), el, push = function (elements) {
for(i = 0; i < elements.length; i++) {
                query[i] = elements[i];
            }
            query.length = elements.length;
        };
        if(_.isString(selectorOrElement)) {
            var selector = selectorOrElement;
            switch(selector[0]) {
                case '#': {
                    var id = selector.slice(1);
                    el = context.getElementById(id);
                    if(el && el.parentNode) {
                        if(el.id === id) {
                            push([
                                el
                            ]);
                        }
                    }
                    break;

                }
                case '.': {
                    var className = selector.slice(1);
                    push(context.getElementsByClassName(className));
                    break;

                }
                case '<': {
                    push([
                        makeElement(selector)
                    ]);
                    break;

                }
                default: {
                    push(context.getElementsByTagName(selector));

                }
            }
        } else {
            push([
                selectorOrElement
            ]);
        }
        return query;
    }
    Gnd.$ = $;
    var Query = (function () {
        function Query() { }
        Query.prototype.on = function (eventNames, handler) {
            var _this = this;
            _.each(eventNames.split(' '), function (eventName) {
                _.each(_this, function (el) {
                    if(el.addEventListener) {
                        el.addEventListener(eventName, handler);
                    } else {
                        if(el['attachEvent']) {
                            el['attachEvent']("on" + eventName, handler);
                        }
                    }
                });
            });
            return this;
        };
        Query.prototype.off = function (eventNames, handler) {
            var _this = this;
            _.each(eventNames.split(' '), function (eventName) {
                _.each(_this, function (el) {
                    if(el.removeEventListener) {
                        el.removeEventListener(eventName, handler);
                    } else {
                        if(el['detachEvent']) {
                            el['detachEvent']("on" + eventName, handler);
                        }
                    }
                });
            });
            return this;
        };
        Query.prototype.trigger = function (eventNames) {
            var _this = this;
            _.each(eventNames.split(' '), function (eventName) {
                _.each(_this, function (element) {
                    if(document.createEventObject) {
                        var evt = document.createEventObject();
                        element.fireEvent('on' + eventName, evt);
                    } else {
                        var msEvent = document.createEvent("HTMLEvents");
                        msEvent.initEvent(eventName, true, true);
                        !element.dispatchEvent(msEvent);
                    }
                });
            });
            return this;
        };
        Query.prototype.attr = function (attr, value) {
            if(value) {
                _.each(this, function (el) {
                    setAttr(el, attr, value);
                });
                return this;
            } else {
                return getAttr(this[0], attr);
            }
        };
        Query.prototype.css = function (styles) {
            _.each(this, function (el) {
                _.extend(el.style, styles);
            });
        };
        Query.prototype.show = function () {
            _.each(this, function (el) {
                show(el);
            });
            return this;
        };
        Query.prototype.hide = function () {
            _.each(this, function (el) {
                hide(el);
            });
            return this;
        };
        Query.prototype.text = function (html) {
            var el = this[0];
            if(el.textContent) {
                if(!html) {
                    return el.textContent;
                }
                _.each(this, function (el) {
                    el.textContent = html;
                });
            } else {
                if(!html) {
                    return el.innerText;
                }
                _.each(this, function (el) {
                    el.innerText = html;
                });
            }
        };
        Query.prototype.html = function (html) {
            if(_.isUndefined(html)) {
                return this[0].innerHTML;
            }
            _.each(this, function (el) {
                el.innerHTML = html;
            });
        };
        return Query;
    })();
    Gnd.Query = Query;    
    function isElement(object) {
        return object && object.nodeType === Node.ELEMENT_NODE;
    }
    Gnd.isElement = isElement;
    function makeElement(html) {
        var child, container = document.createElement("div"), fragment = document.createDocumentFragment();
        container.innerHTML = html;
        while(child = container.firstChild) {
            fragment.appendChild(child);
        }
        return fragment;
    }
    Gnd.makeElement = makeElement;
    function setAttr(el, attr, value) {
        if(Object.prototype.hasOwnProperty.call(el, attr)) {
            el[attr] = value;
        }
        if(value) {
            el.setAttribute(attr, value);
        } else {
            el.removeAttribute(attr);
        }
    }
    Gnd.setAttr = setAttr;
    function getAttr(el, attr) {
        if(Object.prototype.hasOwnProperty.call(el, attr)) {
            return el[attr];
        } else {
            var val = el.getAttribute(attr);
            switch(val) {
                case 'true': {
                    return true;

                }
                case null:
                case 'false': {
                    return false;

                }
                default: {
                    return val;

                }
            }
        }
    }
    Gnd.getAttr = getAttr;
    function show(el) {
        el['style'].display = getAttr(el, 'data-display') || 'block';
    }
    Gnd.show = show;
    function hide(el) {
        var oldDisplay = el['style'].display;
        (oldDisplay != 'none') && setAttr(el, 'data-display', oldDisplay);
        el['style'].display = 'none';
    }
    Gnd.hide = hide;
    function serialize(obj) {
        var str = [];
        for(var p in obj) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
        return str.join("&");
    }
    Gnd.serialize = serialize;
    var Gnd;
    (function (Gnd) {
        (function (Ajax) {
            function get(url, obj, cb) {
                base('GET', url, obj, cb);
            }
            Ajax.get = get;
            function put(url, obj, cb) {
                base('PUT', url, obj, cb);
            }
            Ajax.put = put;
            function post(url, obj, cb) {
                base('POST', url, obj, cb);
            }
            Ajax.post = post;
            function del(url, obj, cb) {
                base('DELETE', url, obj, cb);
            }
            Ajax.del = del;
            function getXhr() {
                for(var i = 0; i < 4; i++) {
                    try  {
                        return i ? new ActiveXObject([
                            , 
                            "Msxml2", 
                            "Msxml3", 
                            "Microsoft"
                        ][i] + ".XMLHTTP") : new XMLHttpRequest();
                    } catch (e) {
                    }
                }
            }
            function base(method, url, obj, cb) {
                var xhr = getXhr();
                xhr.onreadystatechange = function () {
                    if(xhr.readyState === 4) {
                        xhr.onreadystatechange = null;
                        if(xhr.status >= 200 && xhr.status < 300) {
                            var res;
                            try  {
                                res = JSON.parse(xhr.responseText || {
                                });
                            } catch (e) {
                            }
                            ; ;
                            cb(null, res);
                        } else {
                            cb(new Error("Ajax Error: " + xhr.responseText));
                        }
                    } else {
                    }
                };
                xhr.open(method, url);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(obj));
            }
        })(Gnd.Ajax || (Gnd.Ajax = {}));
        var Ajax = Gnd.Ajax;
    })(Gnd || (Gnd = {}));
})(Gnd || (Gnd = {}));
var Gnd;
(function (Gnd) {
    function overload(map) {
        return function () {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            var key = '';
            if(args.length) {
                if(!_.isUndefined(args[0])) {
                    key += type(args[0]);
                }
                for(var i = 1; i < args.length; i++) {
                    if(!_.isUndefined(args[i])) {
                        key += ' ' + type(args[i]);
                    }
                }
            }
            if(map[key]) {
                return map[key].apply(this, args);
            } else {
                throw new Error("Not matched function signature: " + key);
            }
        }
    }
    Gnd.overload = overload;
    function type(obj) {
        var typeStr;
        if(obj && obj.getName) {
            return obj.getName();
        } else {
            typeStr = Object.prototype.toString.call(obj);
            return typeStr.slice(8, typeStr.length - 1);
        }
    }
})(Gnd || (Gnd = {}));
var Gnd;
(function (Gnd) {
    var defaults = {
        template: function (str) {
            return _.template(str);
        }
    };
    function Using() {
        var _this = this;
        if(Using.prototype._instance) {
            return Using.prototype._instance;
        }
        Using.prototype._instance = this;
        _.each(defaults, function (value, key) {
            _this[key] = value;
        });
    }
    ; ;
    Gnd.using = new Using();
    function use(param, value) {
        switch(param) {
            case 'template': {
                Gnd.using.template = value;
                break;

            }
        }
    }
    Gnd.use = use;
})(Gnd || (Gnd = {}));
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
var Gnd;
(function (Gnd) {
    var TaskQueue = (function () {
        function TaskQueue() {
            this.tasks = [];
            this.endPromise = new Promise();
        }
        TaskQueue.prototype.append = function () {
            var tasks = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                tasks[_i] = arguments[_i + 0];
            }
            if(this.isEnded) {
                throw new Error("TaskQueue already ended");
            }
            this.tasks.push.apply(this.tasks, _.compact(tasks));
            this.executeTasks();
            return this;
        };
        TaskQueue.prototype.cancel = function () {
            this.isCancelled = true;
        };
        TaskQueue.prototype.end = function () {
            this.isEnded = true;
            if(!this.isExecuting) {
                this.endPromise.resolve();
            }
            return this;
        };
        TaskQueue.prototype.wait = function (cb) {
            this.endPromise.then(cb);
        };
        TaskQueue.prototype.executeTasks = function () {
            var _this = this;
            if(this.tasks.length > 0 && !this.isCancelled && !this.isExecuting) {
                this.isExecuting = true;
                var fn = this.tasks.splice(0, 1)[0];
                fn(function () {
                    _this.isExecuting = false;
                    _this.executeTasks();
                });
            } else {
                if(this.isEnded || this.isCancelled) {
                    this.endPromise.resolve(this.isCancelled);
                }
            }
        };
        return TaskQueue;
    })();
    Gnd.TaskQueue = TaskQueue;    
    var Promise = (function () {
        function Promise() {
            this.callbacks = [];
        }
        Promise.prototype.then = function (cb) {
            if(this.resolved) {
                this.fire(cb);
            } else {
                this.callbacks.push(cb);
            }
        };
        Promise.prototype.resolve = function () {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            if(this.isAborted) {
                return;
            }
            this.resolved = args;
            this.fireCallbacks();
        };
        Promise.prototype.abort = function () {
            this.isAborted = true;
        };
        Promise.prototype.fire = function (cb) {
            cb.apply(this, this.resolved);
        };
        Promise.prototype.fireCallbacks = function () {
            var len = this.callbacks.length;
            if(len > 0) {
                for(var i = 0; i < len; i++) {
                    this.fire(this.callbacks[i]);
                }
            }
        };
        return Promise;
    })();
    Gnd.Promise = Promise;    
    var PromiseQueue = (function () {
        function PromiseQueue() {
            var promises = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                promises[_i] = arguments[_i + 0];
            }
            this.promises = promises;
        }
        PromiseQueue.prototype.abort = function () {
            _.invoke(this.promises, 'abort');
        };
        PromiseQueue.prototype.then = function (cb) {
            Gnd.Util.asyncForEachSeries(this.promises, function (promise, done) {
                promise && promise.then(done);
            }, cb);
        };
        return PromiseQueue;
    })();
    Gnd.PromiseQueue = PromiseQueue;    
})(Gnd || (Gnd = {}));
var Gnd;
(function (Gnd) {
    var EventEmitter = (function () {
        function EventEmitter() { }
        EventEmitter.prototype.getListeners = function () {
            this._listeners = this._listeners || {
            };
            return this._listeners;
        };
        EventEmitter.prototype.getNamespaces = function () {
            this._namespaces = this._namespaces || {
            };
            return this._namespaces;
        };
        EventEmitter.prototype.on = function (eventNames, listener) {
            var events = eventNames.split(' '), listeners = this.getListeners();
            for(var i = 0, len = events.length; i < len; i++) {
                var eventAndNamespace = events[i].split('/'), event, namespace;
                if(eventAndNamespace.length > 1) {
                    namespace = eventAndNamespace[0];
                    event = eventAndNamespace[1];
                } else {
                    namespace = null;
                    event = eventAndNamespace[0];
                }
                if(listeners[event]) {
                    listeners[event].push(listener);
                } else {
                    listeners[event] = [
                        listener
                    ];
                }
                if(namespace) {
                    var namespaces = this.getNamespaces();
                    namespaces[namespace] = namespaces[namespace] || {
                    };
                    if(namespaces[namespace][event]) {
                        namespaces[namespace][event].push(listener);
                    } else {
                        namespaces[namespace][event] = [
                            listener
                        ];
                    }
                }
                this.emit('newListener', event, listener);
            }
            return this;
        };
        EventEmitter.prototype.emit = function (eventName) {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 1); _i++) {
                args[_i] = arguments[_i + 1];
            }
            var listeners = this.getListeners();
            if(listeners['*']) {
                this._fire(listeners['*'], arguments);
            }
            if(listeners[eventName]) {
                this._fire(listeners[eventName], args);
            }
            return this;
        };
        EventEmitter.prototype.off = function (eventNames, listener) {
            if(listener) {
                var events = eventNames.split(' ');
                for(var i = 0, len = events.length; i < len; i++) {
                    if(this._removeListener(events[i], listener)) {
                        break;
                    }
                }
            } else {
                this.removeAllListeners(eventNames);
            }
            return this;
        };
        EventEmitter.prototype.listeners = function (eventName) {
            var listeners = this.getListeners();
            return listeners[eventName] = listeners[eventName] || [];
        };
        EventEmitter.prototype.once = function (eventName, listener) {
            var self = this;
            function wrapper() {
                self.off(eventName, wrapper);
                listener.apply(this, arguments);
            }
            return self.on(eventName, wrapper);
        };
        EventEmitter.prototype.removeAllListeners = function (eventNames) {
            var listeners = this._listeners;
            if(listeners) {
                if(eventNames) {
                    var events = eventNames.split(' ');
                    for(var i = 0, len = events.length; i < len; i++) {
                        this._removeNamespacedEvent(events[i], listeners);
                    }
                } else {
                    delete this._listeners;
                }
            }
            return this;
        };
        EventEmitter.prototype.namespace = function (namespace) {
            var self = this;
            var namespaced = {
                self: self,
                namespace: namespace,
                on: function (event, listener) {
                    this.self.on(this.namespace + '/' + event, listener);
                    return namespaced;
                },
                off: function (event) {
                    var eventName = this.namespace + '/';
                    event && (eventName += event);
                    this.self.off(eventName);
                    return namespaced;
                }
            };
            return namespaced;
        };
        EventEmitter.prototype._fire = function (eventListeners, args) {
            var listeners = [], i, len = eventListeners.length;
            for(i = 0; i < len; i++) {
                listeners[i] = eventListeners[i];
            }
            for(i = 0; i < len; i++) {
                listeners[i].apply(this, args);
            }
        };
        EventEmitter.prototype._removeListener = function (event, listener) {
            var listeners = this._listeners, index;
            if(listeners && listeners[event]) {
                index = _.indexOf(listeners[event], listener);
                if(index !== -1) {
                    listeners[event].splice(index, 1);
                    return true;
                }
            }
            return false;
        };
        EventEmitter.prototype._removeNamespacedEvent = function (event, listeners) {
            var self = this, namespaces = self._namespaces, eventAndNamespace = event.split('/');
            if(eventAndNamespace.length === 1) {
                event = eventAndNamespace[0];
                listeners && delete listeners[event];
                namespaces && delete namespaces[event];
            } else {
                if(namespaces) {
                    var namespace = eventAndNamespace[0];
                    event = eventAndNamespace[1];
                    if(namespaces[namespace]) {
                        var _listeners;
                        if(event === '') {
                            var events = namespaces[namespace];
                            _.each(events, function (listeners, event) {
                                for(var i = 0, len = listeners.length; i < len; i++) {
                                    self._removeListener(event, listeners[i]);
                                }
                            });
                        } else {
                            _listeners = _.union(_listeners, namespaces[namespace][event]);
                            if(_listeners) {
                                for(var i = 0, len = listeners.length; i < len; i++) {
                                    this._removeListener(event, _listeners[i]);
                                }
                            }
                        }
                    }
                }
            }
        };
        return EventEmitter;
    })();
    Gnd.EventEmitter = EventEmitter;    
    EventEmitter.prototype.addListener = EventEmitter.prototype.on;
    EventEmitter.prototype.addObserver = EventEmitter.prototype.on;
    EventEmitter.prototype.removeListener = EventEmitter.prototype.off;
    EventEmitter.prototype.removeObserver = EventEmitter.prototype.off;
})(Gnd || (Gnd = {}));
var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Gnd;
(function (Gnd) {
    var UndoManager = (function (_super) {
        __extends(UndoManager, _super);
        function UndoManager() {
            _super.apply(this, arguments);

            this.undones = [];
            this.actions = [];
            this.undoFn = null;
            this.group = null;
        }
        UndoManager.prototype.beginUndo = function (undoFn, name) {
            this.undoFn = undoFn;
            this.name = name;
        };
        UndoManager.prototype.endUndo = function (doFn, fn) {
            this.action(doFn, this.undoFn, fn, this.name);
            this.undoFn = null;
        };
        UndoManager.prototype.action = function (doFn, undoFn, fn, name) {
            this.undones.length = 0;
            name = _.isString(fn) ? fn : name;
            var action = {
                'do': doFn,
                undo: undoFn,
                fn: fn,
                name: name
            };
            if(this.group) {
                this.actions.push(action);
            } else {
                this.group.push(action);
            }
            doFn(fn);
        };
        UndoManager.prototype.beginGroup = function (name) {
            this.group = {
                name: name,
                actions: []
            };
        };
        UndoManager.prototype.endGroup = function () {
            ; ;
            ((function (group) {
                this.action(function () {
                    for(var i = 0, len = group.length; i < len; i++) {
                        group[i].action['do'](group[i].action.fn);
                    }
                }, function () {
                    for(var i = 0, len = group.length; i < len; i++) {
                        group[i].action.undo(group[i].action.fn);
                    }
                }, function () {
                }, group.name);
            })(this.group));
            this.group = null;
        };
        UndoManager.prototype.canUndo = function () {
            return this.actions.length > 0;
        };
        UndoManager.prototype.canRedo = function () {
            return this.undones.length > 0;
        };
        UndoManager.prototype.undo = function () {
            var action = this.actions.pop();
            if(action) {
                action.undo(action.fn);
                var name = action.name || '';
                this.emit('undo', name);
                this.undones.push(action);
            }
        };
        UndoManager.prototype.redo = function () {
            var action = this.undones.pop();
            if(action) {
                action['do'](action.fn);
                var name = action.name || '';
                this.emit('redo', name);
                this.actions.push(action);
            }
        };
        return UndoManager;
    })(Gnd.EventEmitter);
    Gnd.UndoManager = UndoManager;    
})(Gnd || (Gnd = {}));
var Gnd;
(function (Gnd) {
    var Base = (function (_super) {
        __extends(Base, _super);
        function Base() {
                _super.call(this);
            this._refCounter = 1;
            this._bindings = {
            };
            this._undoMgr = new Gnd.UndoManager();
            if(!(this instanceof Base)) {
                return new Base();
            }
        }
        Base.prototype._set = function (keypath, val, options) {
            var path = keypath.split('.'), obj = this, len = path.length - 1, key = path[len];
            for(var i = 0; i < len; i++) {
                var t = this[path[i]];
                if(!t) {
                    obj = this[path[i]] = new Base();
                } else {
                    obj = t;
                }
            }
            if((_.isEqual(obj[key], val) === false) || (options && options.force)) {
                var oldval = obj[key], val = this.willChange ? this.willChange(key, val) : val;
                obj[key] = val;
                this.emit(keypath, val, oldval, options);
                return true;
            } else {
                return false;
            }
        };
        Base.prototype.set = function (keyOrObj, val, options) {
            var changed = false, obj, self = this;
            if(typeof keyOrObj == 'object') {
                options = val;
                obj = keyOrObj;
                _.each(obj, function (val, key) {
                    changed = self._set(key, val, options) ? true : changed;
                });
            } else {
                changed = self._set(keyOrObj, val, options);
            }
            if(changed) {
                if(!obj) {
                    obj = {
                    };
                    obj[keyOrObj] = val;
                }
                self.emit('changed:', obj, options);
            }
            return this;
        };
        Base.prototype.willChange = function (key, val) {
            return val;
        };
        Base.prototype.get = function (key) {
            var path = key.split('.'), result;
            result = this[path[0]];
            for(var i = 1, len = path.length; i < len; i++) {
                if(!_.isObject(result)) {
                    break;
                }
                result = result[path[i]];
            }
            return result;
        };
        Base.prototype.bind = function (key, object, objectKey) {
            var dstKey = objectKey || key;
            this.unbind(key);
            var dstListener = _.bind(object.set, object, dstKey);
            this.on(key, dstListener);
            var srcListener = _.bind(this.set, this, key);
            object.on(dstKey, srcListener);
            this._bindings[key] = [
                dstListener, 
                object, 
                dstKey, 
                srcListener
            ];
            this.set(key, object[dstKey]);
            return this;
        };
        Base.prototype.unbind = function (key) {
            var bindings = this._bindings;
            if((bindings != null) && (bindings[key])) {
                var binding = bindings[key];
                this.removeListener(key, binding[0]);
                binding[1].removeListener(binding[2], binding[3]);
                delete bindings[key];
            }
        };
        Base.prototype.beginUndoSet = function (key) {
            var base = this;
            ((function (value) {
                this.undoMgr.beginUndo(function () {
                    base.set(key, value);
                }, name);
            })(this[key]));
        };
        Base.prototype.endUndoSet = function (key) {
            var base = this;
            ((function (value) {
                this.undoMgr.endUndo(function () {
                    base.set(key, value);
                });
            })(this[key]));
        };
        Base.prototype.undoSet = function (key, value, fn) {
            this.beginUndoSet(key);
            this.set(key, value);
            this.endUndoSet(key);
        };
        Base.prototype.destroy = function () {
            this.emit('destroy:');
            this._destroyed = true;
            this._destroyedTrace = "";
            this.off();
        };
        Base.prototype.retain = function () {
            if(this._destroyed) {
                throw new Error("Cannot retain destroyed object");
            }
            this._refCounter++;
            return this;
        };
        Base.prototype.release = function () {
            this._refCounter--;
            if(this._refCounter === 0) {
                this.destroy();
            } else {
                if(this._refCounter < 0) {
                    var msg;
                    if(this._destroyed) {
                        msg = "Object has already been released";
                        if(this._destroyedTrace) {
                            msg += '\n' + this._destroyedTrace;
                        }
                        throw new Error(msg);
                    } else {
                        msg = "Invalid reference count!";
                    }
                    throw new Error(msg);
                }
            }
            return this;
        };
        Base.prototype.autorelease = function () {
            var _this = this;
            Gnd.Util.nextTick(function () {
                _this.release();
            });
            return this;
        };
        Base.prototype.isDestroyed = function () {
            return this._refCounter === 0;
        };
        return Base;
    })(Gnd.EventEmitter);
    Gnd.Base = Base;    
})(Gnd || (Gnd = {}));
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
var Gnd;
(function (Gnd) {
    (function (Storage) {
        var Queue = (function (_super) {
            __extends(Queue, _super);
            function Queue(local, remote) {
                        _super.call(this);
                this.createList = {
                };
                this.currentTransfer = null;
                this.remoteStorage = null;
                this.localStorage = local;
                this.remoteStorage = remote;
                this.queue = [];
                this.useRemote = !!this.remoteStorage;
                this.syncFn = _.bind(this.synchronize, this);
            }
            Queue.makeKey = function makeKey(keyPath) {
                return keyPath.join(':');
            }
            Queue.prototype.init = function (cb) {
                var _this = this;
                this.localStorage.all([
                    'meta', 
                    'storageQueue'
                ], function (err, queue) {
                    if(!err) {
                        _this.queue = queue || [];
                    }
                    cb(err);
                });
            };
            Queue.prototype.fetch = function (keyPath, cb) {
                var _this = this;
                this.localStorage.fetch(keyPath, function (err, doc) {
                    if(doc) {
                        doc['_id'] = _.last(keyPath);
                        cb(err, doc);
                    }
                    if(!_this.useRemote) {
                        cb(err);
                    } else {
                        _this.remoteStorage.fetch(keyPath, function (err, docRemote) {
                            if(!err) {
                                docRemote['_persisted'] = true;
                                _this.localStorage.put(keyPath, docRemote, function (err) {
                                    if(err) {
                                        var collectionKeyPath = _.initial(keyPath);
                                        docRemote['_cid'] = docRemote['_id'];
                                        _this.localStorage.create(collectionKeyPath, docRemote, function () {
                                        });
                                    }
                                });
                                _this.emit('resync:' + Queue.makeKey(keyPath), docRemote);
                            }
                            !doc && cb(err, docRemote);
                        });
                    }
                });
            };
            Queue.prototype.updateLocalCollection = function (keyPath, query, options, newItems, cb) {
                var storage = this.localStorage, itemKeyPath = [
_.last(keyPath)                ];
                options = _.extend({
                    snapshot: false
                }, options);
                storage.find(keyPath, query, options, function (err, oldItems) {
                    if(!err) {
                        var itemsToRemove = [], itemsToAdd = [];
                        function findItem(items, itemToFind) {
                            return _.find(items, function (item) {
                                return (item._cid === itemToFind._cid || item._cid === itemToFind._id);
                            });
                        }
                        _.each(oldItems, function (oldItem) {
                            if(oldItem.__op === 'insync' && !findItem(newItems, oldItem)) {
                                itemsToRemove.push(oldItem._cid, oldItem._id);
                            }
                        });
                        _.each(newItems, function (newItem) {
                            !findItem(oldItems, newItem) && itemsToAdd.push(newItem._id);
                        });
                        storage.remove(keyPath, itemKeyPath, itemsToRemove, {
                            insync: true
                        }, function (err) {
                            if(!err) {
                                Gnd.Util.asyncForEach(newItems, function (doc, done) {
                                    var elemKeyPath = itemKeyPath.concat(doc._id);
                                    doc._persisted = true;
                                    storage.put(elemKeyPath, doc, function (err) {
                                        if(err) {
                                            doc._cid = doc._id;
                                            storage.create(itemKeyPath, doc, function (err) {
                                                done(err);
                                            });
                                        } else {
                                            done();
                                        }
                                    });
                                }, function (err) {
                                    if(!err) {
                                        storage.add(keyPath, itemKeyPath, itemsToAdd, {
                                            insync: true
                                        }, cb);
                                    } else {
                                        cb(err);
                                    }
                                });
                            } else {
                                cb(err);
                            }
                        });
                    } else {
                        storage.add(keyPath, itemKeyPath, _.pluck(newItems, '_id'), {
                            insync: true
                        }, cb);
                    }
                });
            };
            Queue.prototype.find = function (keyPath, query, options, cb) {
                var _this = this;
                var localOpts = _.extend({
                    snapshot: true
                }, options);
                this.localStorage.find(keyPath, query, localOpts, function (err, result) {
                    if(result) {
                        cb(err, result);
                    }
                    if(!_this.useRemote) {
                        cb(err);
                    } else {
                        _this.remoteStorage.find(keyPath, query, options, function (err, remote) {
                            if(!err) {
                                _this.updateLocalCollection(keyPath, query, options, remote, function (err) {
                                    if(result) {
                                        _this.localStorage.find(keyPath, query, localOpts, function (err, items) {
                                            !err && _this.emit('resync:' + Queue.makeKey(keyPath), items);
                                        });
                                    }
                                });
                            }
                            !result && cb(err, remote);
                        });
                    }
                });
            };
            Queue.prototype.create = function (keyPath, args, cb) {
                var _this = this;
                this.localStorage.create(keyPath, args, function (err, cid) {
                    if(!err) {
                        args['_cid'] = args['_cid'] || cid;
                        _this.addCmd({
                            cmd: 'create',
                            keyPath: keyPath,
                            args: args
                        }, function (err) {
                            cb(err, cid);
                        });
                    } else {
                        cb(err);
                    }
                });
            };
            Queue.prototype.put = function (keyPath, args, cb) {
                var _this = this;
                this.localStorage.put(keyPath, args, function (err) {
                    if(!err) {
                        _this.addCmd({
                            cmd: 'update',
                            keyPath: keyPath,
                            args: args
                        }, cb);
                    } else {
                        cb(err);
                    }
                });
            };
            Queue.prototype.del = function (keyPath, cb) {
                var _this = this;
                this.localStorage.del(keyPath, function (err) {
                    if(!err) {
                        _this.addCmd({
                            cmd: 'delete',
                            keyPath: keyPath
                        }, cb);
                    } else {
                        cb(err);
                    }
                });
            };
            Queue.prototype.add = function (keyPath, itemsKeyPath, itemIds, cb) {
                var _this = this;
                this.localStorage.add(keyPath, itemsKeyPath, itemIds, {
                }, function (err) {
                    if(!err) {
                        _this.addCmd({
                            cmd: 'add',
                            keyPath: keyPath,
                            itemsKeyPath: itemsKeyPath,
                            itemIds: itemIds
                        }, cb);
                    } else {
                        cb(err);
                    }
                });
            };
            Queue.prototype.remove = function (keyPath, itemsKeyPath, itemIds, cb) {
                var _this = this;
                this.localStorage.remove(keyPath, itemsKeyPath, itemIds, {
                }, function (err) {
                    if(!err) {
                        _this.addCmd({
                            cmd: 'remove',
                            keyPath: keyPath,
                            itemsKeyPath: itemsKeyPath,
                            itemIds: itemIds
                        }, cb);
                    } else {
                        cb(err);
                    }
                });
            };
            Queue.prototype.insert = function (keyPath, index, doc, cb) {
            };
            Queue.prototype.extract = function (keyPath, index, cb) {
            };
            Queue.prototype.all = function (keyPath, cb) {
            };
            Queue.prototype.synchronize = function () {
                var _this = this;
                var done = _.bind(this.success, this);
                if(!this.currentTransfer) {
                    if(this.queue.length) {
                        var obj = this.currentTransfer = this.queue[0], localStorage = this.localStorage, remoteStorage = this.remoteStorage, keyPath = obj.keyPath, itemsKeyPath = obj.itemsKeyPath, itemIds = obj.itemIds, args = obj.args;
                        switch(obj.cmd) {
                            case 'create': {
                                (function (cid, args) {
                                    remoteStorage.create(keyPath, args, function (err, sid) {
                                        var localKeyPath = keyPath.concat(cid);
                                        if(err) {
                                            done(err);
                                        } else {
                                            localStorage.put(localKeyPath, {
                                                _persisted: true,
                                                _id: sid
                                            }, function (err) {
                                                var newKeyPath = _.initial(localKeyPath);
                                                newKeyPath.push(sid);
                                                localStorage.link(newKeyPath, localKeyPath, function (err) {
                                                    _this.emit('created:' + cid, sid);
                                                    _this.updateQueueIds(cid, sid);
                                                    done();
                                                });
                                            });
                                        }
                                    });
                                })(args['_cid'], args);
                                break;

                            }
                            case 'update': {
                                remoteStorage.put(keyPath, args, done);
                                break;

                            }
                            case 'delete': {
                                remoteStorage.del(keyPath, done);
                                break;

                            }
                            case 'add': {
                                remoteStorage.add(keyPath, itemsKeyPath, itemIds, {
                                }, done);
                                break;

                            }
                            case 'remove': {
                                remoteStorage.remove(keyPath, itemsKeyPath, itemIds, {
                                }, done);
                                break;

                            }
                        }
                    } else {
                        this.emit('synced:', this);
                    }
                } else {
                    console.log('busy with ', this.currentTransfer);
                }
            };
            Queue.prototype.isEmpty = function () {
                return !this.queue.length;
            };
            Queue.prototype.clear = function (cb) {
                this.queue = [];
                this.localStorage.del([
                    'meta', 
                    'storageQueue'
                ], cb || Gnd.Util.noop);
            };
            Queue.prototype.addCmd = function (cmd, cb) {
                var _this = this;
                if(this.useRemote) {
                    this.localStorage.insert([
                        'meta', 
                        'storageQueue'
                    ], -1, cmd, function (err) {
                        if(!err) {
                            _this.queue.push(cmd);
                            _this.synchronize();
                        }
                        cb(err);
                    });
                } else {
                    cb();
                }
            };
            Queue.prototype.success = function (err) {
                this.currentTransfer = null;
                var storage = this.localStorage;
                if(!err) {
                    var cmd = this.queue.shift(), syncFn = _.bind(this.synchronize, this);
                    storage.extract([
                        'meta', 
                        'storageQueue'
                    ], 0, function (err) {
                        var opts = {
                            insync: true
                        };
                        switch(cmd.cmd) {
                            case 'add': {
                                storage.remove(cmd.keyPath, cmd.itemsKeyPath, cmd.oldItemIds || [], opts, function (err) {
                                    storage.add(cmd.keyPath, cmd.itemsKeyPath, cmd.itemIds, opts, function (err) {
                                        Gnd.Util.nextTick(syncFn);
                                    });
                                });
                                break;

                            }
                            case 'remove': {
                                storage.remove(cmd.keyPath, cmd.itemsKeyPath, cmd.oldItemIds || [], opts, function (err) {
                                    storage.remove(cmd.keyPath, cmd.itemsKeyPath, cmd.itemIds, opts, function (err) {
                                        Gnd.Util.nextTick(syncFn);
                                    });
                                });
                                break;

                            }
                            default: {
                                Gnd.Util.nextTick(syncFn);

                            }
                        }
                    });
                }
            };
            Queue.prototype.updateQueueIds = function (oldId, newId) {
                _.each(this.queue, function (cmd) {
                    updateIds(cmd.keyPath, oldId, newId);
                    cmd.itemsKeyPath && updateIds(cmd.itemsKeyPath, oldId, newId);
                    if(cmd.itemIds) {
                        cmd.oldItemIds = updateIds(cmd.itemIds, oldId, newId);
                    }
                });
            };
            return Queue;
        })(Gnd.Base);
        Storage.Queue = Queue;        
        function updateIds(keyPath, oldId, newId) {
            var updatedKeys = [];
            for(var i = 0; i < keyPath.length; i++) {
                if(keyPath[i] == oldId) {
                    keyPath[i] = newId;
                    updatedKeys.push(oldId);
                }
            }
            return updatedKeys;
        }
    })(Gnd.Storage || (Gnd.Storage = {}));
    var Storage = Gnd.Storage;
})(Gnd || (Gnd = {}));
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
                    cb(null, _.values(result));
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
            Local.prototype.all = function (keyPath, cb) {
                var key = makeKey(keyPath);
                cb(null, _get(key) || []);
            };
            return Local;
        })();
        Storage.Local = Local;        
    })(Gnd.Storage || (Gnd.Storage = {}));
    var Storage = Gnd.Storage;
})(Gnd || (Gnd = {}));
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
            return Socket;
        })();
        Storage.Socket = Socket;        
    })(Gnd.Storage || (Gnd.Storage = {}));
    var Storage = Gnd.Storage;
})(Gnd || (Gnd = {}));
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
var Gnd;
(function (Gnd) {
    var Model = (function (_super) {
        __extends(Model, _super);
        function Model(args, bucket) {
            var _this = this;
                _super.call(this);
            this.__rev = 0;
            this._persisted = false;
            this._dirty = true;
            this._keepSynced = false;
            this._initial = true;
            _.extend(this, args);
            this._cid = this._id || this._cid || Gnd.Util.uuid();
            this.__bucket = bucket;
            this.on('changed:', function () {
                _this._dirty = true;
            });
            var listenToResync = function () {
                Model.storageQueue.on('resync:' + Gnd.Storage.Queue.makeKey(_this.getKeyPath()), function (doc) {
                    _this.set(doc, {
                        nosync: true
                    });
                    _this.emit('resynced:');
                });
            };
            if(Model.storageQueue) {
                if(this.isPersisted()) {
                    listenToResync();
                } else {
                    this.once('id', listenToResync);
                }
            }
        }
        Model.__bucket = "";
        Model.syncManager = null;
        Model.storageQueue = null;
        Model.extend = function extend(bucket) {
            var _this = this;
            function __(args, _bucket) {
                _this.call(this, args, bucket || _bucket);
            }
            ; ;
            __.prototype = this.prototype;
            __.prototype._super = this;
            _.extend(__, {
                __bucket: bucket,
                extend: this.extend,
                create: this.create,
                findById: this.findById,
                all: this.all,
                allModels: this.allModels,
                createModels: this.createModels,
                fromJSON: this.fromJSON,
                fromArgs: this.fromArgs
            });
            return __;
        }
        Model.create = function create(args, keepSynced, cb) {
            Gnd.overload({
                'Object Boolean Function': function (args, keepSynced, cb) {
                    this.fromJSON(args, function (err, instance) {
                        if(instance) {
                            keepSynced && instance.keepSynced();
                            if(!instance.isPersisted()) {
                                var id = instance.id();
                                Model.storageQueue.once('created:' + id, function (id) {
                                    instance.id(id);
                                });
                            }
                            instance.init(function () {
                                cb(null, instance);
                            });
                        } else {
                            cb(err);
                        }
                    });
                },
                'Object Function': function (args, cb) {
                    this.create(args, false, cb);
                }
            }).apply(this, arguments);
        }
        Model.findById = function findById(keyPathOrId, keepSynced, args, cb) {
            var _this = this;
            return Gnd.overload({
                'Array Boolean Object Function': function (keyPath, keepSynced, args, cb) {
                    Model.storageQueue.fetch(keyPath, function (err, doc) {
                        if(doc) {
                            _.extend(doc, args);
                            _this.create(doc, keepSynced, cb);
                        } else {
                            cb(err);
                        }
                    });
                    return this;
                },
                'String Boolean Object Function': function (id, keepSynced, args, cb) {
                    return this.findById([
                        this.__bucket, 
                        id
                    ], keepSynced, args, cb);
                },
                'String Function': function (id, cb) {
                    return this.findById(id, false, {
                    }, cb);
                },
                'String Boolean Function': function (id, keepSynced, cb) {
                    return this.findById(id, keepSynced, {
                    }, cb);
                },
                'String Object Function': function (id, args, cb) {
                    return this.findById(id, false, args, cb);
                }
            }).apply(this, arguments);
        }
        Model.removeById = function removeById(keypathOrId, cb) {
            var keypath = _.isArray(keypathOrId) ? keypathOrId : [
                this.__bucket, 
                keypathOrId
            ];
            Model.storageQueue.del(keypath, function (err) {
                cb(err);
            });
        }
        Model.fromJSON = function fromJSON(args, cb) {
            cb(null, new this(args));
        }
        Model.fromArgs = function fromArgs(args, cb) {
            this.fromJson(args, cb);
        }
        Model.prototype.destroy = function () {
            Model.syncManager && Model.syncManager.endSync(this);
            _super.prototype.destroy.call(this);
        };
        Model.prototype.init = function (fn) {
            fn(this);
        };
        Model.prototype.id = function (id) {
            if(id) {
                this._id = id;
                this._persisted = true;
                this.emit('id', id);
            }
            return this._id || this._cid;
        };
        Model.prototype.getName = function () {
            return "Model";
        };
        Model.prototype.getKeyPath = function () {
            return [
                this.__bucket, 
                this.id()
            ];
        };
        Model.prototype.isKeptSynced = function () {
            return this._keepSynced;
        };
        Model.prototype.isPersisted = function () {
            return this._persisted;
        };
        Model.prototype.bucket = function () {
            return this.__bucket;
        };
        Model.prototype.save = function (cb) {
            if(this._dirty) {
                this.update(this.toArgs(), cb);
            }
        };
        Model.prototype.update = function (args, cb) {
            var _this = this;
            var bucket = this.__bucket, id = this.id();
            cb = cb || function (err) {
            };
            if(this._initial) {
                args['_initial'] = this._initial = false;
                Model.storageQueue.once('created:' + id, function (id) {
                    _this.id(id);
                });
                Model.storageQueue.create([
                    bucket
                ], args, function (err, id) {
                    cb(err);
                });
            } else {
                Model.storageQueue.put([
                    bucket, 
                    id
                ], args, function (err) {
                    if(!err) {
                        _this.emit('updated:', _this, args);
                    }
                    cb(err);
                });
            }
        };
        Model.prototype.remove = function (cb) {
            var _this = this;
            cb = cb || function (err) {
            };
            Model.removeById(this.getKeyPath(), function (err) {
                Model.syncManager && Model.syncManager.endSync(_this);
                _this.emit('deleted:', _this.id());
                cb(err);
            });
        };
        Model.prototype.keepSynced = function () {
            var _this = this;
            if(this._keepSynced) {
                return;
            }
            this._keepSynced = true;
            var startSync = function () {
                Model.syncManager && Model.syncManager.startSync(_this);
            };
            if(this.isPersisted()) {
                startSync();
            } else {
                this.once('id', startSync);
            }
            this.on('changed:', function (doc, options) {
                if(!options || ((!options.nosync) && !_.isEqual(doc, options.doc))) {
                    _this.update(doc);
                }
            });
        };
        Model.prototype.toArgs = function () {
            var args = {
                _persisted: this._persisted,
                _cid: this._cid
            };
            for(var key in this) {
                if(!_.isUndefined(this[key]) && !_.isNull(this[key]) && !_.isFunction(this[key]) && (key[0] !== '_')) {
                    if(_.isFunction(this[key].toArgs)) {
                        args[key] = this[key].toArgs();
                    } else {
                        if(!_.isObject(this[key])) {
                            args[key] = this[key];
                        }
                    }
                }
            }
            return args;
        };
        Model.createModels = function createModels(docs, done) {
            var _this = this;
            var models = [];
            Gnd.Util.asyncForEach(docs, function (args, fn) {
                _this.create(args, function (err, instance) {
                    if(instance) {
                        models.push(instance);
                    }
                    fn(err);
                });
            }, function (err) {
                done(err, models);
            });
        }
        Model.allModels = function allModels(cb) {
            var _this = this;
            Model.storageQueue.find([
                this.__bucket
            ], {
            }, {
            }, function (err, docs) {
                if(docs) {
                    _this.createModels(docs, cb);
                } else {
                    cb(err);
                }
            });
        }
        Model.all = function all(parent, args, bucket, cb) {
            var _this = this;
            function allInstances(parent, keyPath, args, cb) {
                Model.storageQueue.find(keyPath, {
                }, {
                }, function (err, docs) {
                    if(docs) {
                        _.each(docs, function (doc) {
                            _.extend(doc, args);
                        });
                        Gnd.Collection.create(_this, parent, docs, cb);
                    } else {
                        cb(err);
                    }
                });
            }
            Gnd.overload({
                'Model Array Object Function': function (parent, keyPath, args, cb) {
                    allInstances(parent, keyPath, args, cb);
                },
                'Model Object String Function': function (parent, args, bucket, cb) {
                    var keyPath = parent.getKeyPath();
                    keyPath.push(bucket);
                    allInstances(parent, keyPath, args, cb);
                },
                'Model Function': function (parent, cb) {
                    var keyPath = parent.getKeyPath();
                    keyPath.push(this.__bucket);
                    allInstances(parent, keyPath, {
                    }, cb);
                }
            }).apply(this, arguments);
        }
        Model.prototype.all = function (model, args, bucket, cb) {
            model.all(this, args, bucket, cb);
        };
        return Model;
    })(Gnd.Base);
    Gnd.Model = Model;    
})(Gnd || (Gnd = {}));
var Gnd;
(function (Gnd) {
    var Collection = (function (_super) {
        __extends(Collection, _super);
        function Collection(model, parent, items) {
            var _this = this;
                _super.call(this);
            this._keepSynced = false;
            this._added = [];
            this._removed = [];
            this.sortOrder = 'asc';
            this.filterFn = null;
            this.count = 0;
            var self = this;
            this.updateFn = function (args) {
                if(self.sortByFn) {
                    var index = self['indexOf'](this);
                    self.items.splice(index, 1);
                    self.sortedAdd(this);
                }
                self.emit('updated:', this, args);
            };
            this.deleteFn = function (itemId) {
                _this.remove(itemId, false, Gnd.Util.noop);
            };
            this.items = items || [];
            this.initItems(this.items);
            this.model = model;
            this.parent = parent;
            this.on('sortByFn sortOrder', function (fn) {
                var oldItems = _this.items;
                if(_this.sortByFn) {
                    _this.items = _this['sortBy'](_this.sortByFn);
                }
                (_this.sortOrder == 'desc') && _this.items.reverse();
                _this.emit('sorted:', _this.items, oldItems);
            });
            if(parent) {
                if(parent.isPersisted()) {
                    this.listenToResync();
                } else {
                    parent.once('id', function () {
                        _this.listenToResync();
                    });
                }
            } else {
                this.listenToResync();
            }
        }
        Collection.prototype.destroy = function () {
            this._keepSynced && this.endSync();
            this.deinitItems(this.items);
            this.items = null;
            _super.prototype.destroy.call(this);
        };
        Collection.create = function create(model, parent, docs, cb) {
            var _this = this;
            return Gnd.overload({
                'Function Model Array': function (model, parent, models) {
                    var collection = new Collection(model, parent, models);
                    Gnd.Util.release(models);
                    if(parent && parent.isKeptSynced()) {
                        collection.keepSynced();
                    }
                    collection.count = models.length;
                    return collection;
                },
                'Function Model Array Function': function (model, parent, items, cb) {
                    model.createModels(items, function (err, models) {
                        if(err) {
                            cb(err);
                        } else {
                            cb(err, _this.create(model, parent, models));
                        }
                    });
                },
                'Function Array Function': function (model, items, cb) {
                    this.create(model, undefined, items, cb);
                },
                'Function Model Function': function (model, parent, cb) {
                    this.create(model, parent, [], cb);
                }
            }).apply(this, arguments);
        }
        Collection.getItemIds = function getItemIds(items) {
            return _.map(items, function (item) {
                return item.id();
            });
        }
        Collection.prototype.findById = function (id) {
            return this['find'](function (item) {
                return item.id() == id;
            });
        };
        Collection.prototype.save = function (cb) {
            var _this = this;
            var keyPath = this.getKeyPath();
            var itemsKeyPath = [];
            if(this._removed.length) {
                itemsKeyPath = _.initial(this._removed[0].getKeyPath());
            } else {
                if(this._added.length) {
                    itemsKeyPath = _.initial(this._added[0].getKeyPath());
                }
            }
            var itemIds = Collection.getItemIds(this._removed);
            Gnd.Model.storageQueue.remove(keyPath, itemsKeyPath, itemIds, function (err) {
                if(!err) {
                    _this._removed = [];
                    Gnd.Util.asyncForEach(_this.items, function (item, cb) {
                        item.save(cb);
                    }, function (err) {
                        if((!err) && (_this._added.length > 0)) {
                            itemIds = Collection.getItemIds(_this._added);
                            Gnd.Model.storageQueue.add(keyPath, itemsKeyPath, itemIds, function (err) {
                                if(!err) {
                                    _this._added = [];
                                }
                                cb(err);
                            });
                        } else {
                            cb(err);
                        }
                    });
                } else {
                    cb(err);
                }
            });
        };
        Collection.prototype.add = function (items, opts, cb) {
            var _this = this;
            if(_.isFunction(opts)) {
                cb = opts;
                opts = {
                };
            }
            Gnd.Util.asyncForEach(items, function (item, done) {
                _this.addItem(item, opts, function (err) {
                    !err && _this._keepSynced && !item._keepSynced && item.keepSynced();
                    done(err);
                });
            }, cb || Gnd.Util.noop);
        };
        Collection.prototype.getKeyPath = function () {
            if(this.parent) {
                return [
                    this.parent.bucket(), 
                    this.parent.id(), 
                    this.model.__bucket
                ];
            }
            return [
                this.model.__bucket
            ];
        };
        Collection.prototype.remove = function (itemIds, opts, cb) {
            var _this = this;
            var items = this.items, keyPath = this.getKeyPath();
            if(_.isFunction(opts)) {
                cb = opts;
                opts = {
                };
            }
            Gnd.Util.asyncForEach(itemIds, function (itemId, done) {
                var index, item, len = items.length;
                for(index = 0; index < len; index++) {
                    if(items[index].id() == itemId) {
                        item = items[index];
                        break;
                    }
                }
                if(item) {
                    items.splice(index, 1);
                    item.off('changed:', _this.updateFn);
                    item.off('deleted:', _this.deleteFn);
                    _this.set('count', items.length);
                    _this.emit('removed:', item, index);
                    item.release();
                    if(_this.isKeptSynced() && (!opts || !opts.nosync)) {
                        var itemKeyPath = _.initial(item.getKeyPath());
                        Gnd.Model.storageQueue.remove(keyPath, itemKeyPath, [
                            item.id()
                        ], done);
                        return;
                    } else {
                        _this._removed.push(itemId);
                    }
                }
                done();
            }, cb);
        };
        Collection.prototype.keepSynced = function () {
            this.startSync();
            this['map'](function (item) {
                item.keepSynced();
            });
        };
        Collection.prototype.isKeptSynced = function () {
            return this._keepSynced;
        };
        Collection.prototype.toggleSortOrder = function () {
            this['set']('sortOrder', this.sortOrder == 'asc' ? 'desc' : 'asc');
        };
        Collection.prototype.setFormatters = function (formatters) {
            this._formatters = formatters;
            this['each'](function (item) {
                item.format(formatters);
            });
        };
        Collection.prototype.filtered = function (result) {
            if(this.filterFn) {
                result(null, this.filter(this.filterFn));
            } else {
                result(null, this.items);
            }
        };
        Collection.prototype.isFiltered = function (item) {
            return this.filterFn ? this.filterFn(item) : true;
        };
        Collection.prototype.reverse = function () {
            this.items.reverse();
            return this;
        };
        Collection.prototype.addPersistedItem = function (item, cb) {
            var keyPath = this.getKeyPath();
            var itemKeyPath = _.initial(item.getKeyPath());
            Gnd.Model.storageQueue.add(keyPath, itemKeyPath, [
                item.id()
            ], cb);
        };
        Collection.prototype.addItem = function (item, opts, cb) {
            var _this = this;
            if(this.findById(item.id())) {
                return cb();
            }
            if(this.sortByFn) {
                this.sortedAdd(item);
            } else {
                this.items.push(item);
            }
            this.initItems(item);
            this.set('count', this.items.length);
            this.emit('added:', item);
            if(this.isKeptSynced()) {
                if(!opts || (opts.nosync !== true)) {
                    if(item.isPersisted()) {
                        this.addPersistedItem(item, cb);
                    } else {
                        item.save(function (err) {
                            if(!err) {
                                _this.addPersistedItem(item, Gnd.Util.noop);
                            }
                            cb(err);
                        });
                    }
                } else {
                    cb();
                }
            } else {
                this._added.push(item);
                cb();
            }
        };
        Collection.prototype.sortedAdd = function (item) {
            (this.sortOrder == 'desc') && this.items.reverse();
            var i = this['sortedIndex'](item, this.sortByFn);
            this.items.splice(i, 0, item);
            (this.sortOrder == 'desc') && this.items.reverse();
            return i;
        };
        Collection.prototype.startSync = function () {
            var _this = this;
            this._keepSynced = true;
            if(this.parent && Gnd.Model.syncManager) {
                if(this.parent.isPersisted()) {
                    Gnd.Model.syncManager.startSync(this);
                } else {
                    this.parent.on('id', function () {
                        Gnd.Model.syncManager.startSync(_this);
                    });
                }
            }
            this.on('add:', function (itemsKeyPath, itemIds) {
                Gnd.Util.asyncForEach(itemIds, function (itemId, done) {
                    if(!_this.findById(itemId)) {
                        _this.model.findById(itemsKeyPath.concat(itemId), true, {
                        }, function (err, item) {
                            if(item) {
                                _this.addItem(item, {
                                    nosync: true
                                }, done);
                            }
                        });
                    }
                }, Gnd.Util.noop);
            });
            this.on('remove:', function (itemsKeyPath, itemId) {
                _this.remove(itemId, true, Gnd.Util.noop);
            });
        };
        Collection.prototype.resync = function (items) {
            var _this = this;
            var itemsToRemove = [], itemsToAdd = items.slice(0);
            this['each'](function (item) {
                var id = item.id(), shouldRemove = true;
                for(var i = 0; i < items.length; i++) {
                    if(id == items[i]._id) {
                        item.set(items[i], {
                            nosync: true
                        });
                        shouldRemove = false;
                        break;
                    }
                }
                shouldRemove && itemsToRemove.push(id);
            });
            this.remove(itemsToRemove, {
                nosync: true
            }, function (err) {
                if(!err) {
                    (_this.model).createModels(itemsToAdd, function (err, models) {
                        if(!err) {
                            _this.add(models, {
                                nosync: true
                            }, function (err) {
                                _this.emit('resynced:');
                            });
                        }
                    });
                }
            });
        };
        Collection.prototype.listenToResync = function () {
            var _this = this;
            var key = Gnd.Storage.Queue.makeKey(this.getKeyPath());
            this.resyncFn = function (items) {
                _this.resync(items);
            };
            Gnd.Model.storageQueue && Gnd.Model.storageQueue.on('resync:' + key, this.resyncFn);
        };
        Collection.prototype.endSync = function () {
            Gnd.Model.syncManager && Gnd.Model.syncManager.endSync(this);
            this._keepSynced = false;
        };
        Collection.prototype.initItems = function (items) {
            items = _.isArray(items) ? items : [
                items
            ];
            for(var i = 0, len = items.length; i < len; i++) {
                var item = items[i];
                item.retain();
                item.on('changed:', this.updateFn);
                item.on('deleted:', this.deleteFn);
            }
        };
        Collection.prototype.deinitItems = function (items) {
            var key = Gnd.Storage.Queue.makeKey(this.getKeyPath());
            Gnd.Model.storageQueue && Gnd.Model.storageQueue.off('resync:' + key, this.resyncFn);
            for(var i = 0, len = items.length; i < len; i++) {
                var item = items[i];
                item.off('changed:', this.updateFn);
                item.off('deleted:', this.deleteFn);
                item.release();
            }
        };
        return Collection;
    })(Gnd.Base);
    Gnd.Collection = Collection;    
    var methods = [
        'forEach', 
        'each', 
        'map', 
        'reduce', 
        'reduceRight', 
        'find', 
        'detect', 
        'pluck', 
        'filter', 
        'select', 
        'reject', 
        'every', 
        'all', 
        'some', 
        'any', 
        'include', 
        'contains', 
        'invoke', 
        'max', 
        'min', 
        'sortBy', 
        'sortedIndex', 
        'toArray', 
        'size', 
        'first', 
        'rest', 
        'last', 
        'without', 
        'indexOf', 
        'lastIndexOf', 
        'isEmpty', 
        'groupBy'
    ];
    _.each(methods, function (method) {
        Collection.prototype[method] = function () {
            return _[method].apply(_, [
                this.items
            ].concat(_.toArray(arguments)));
        };
    });
})(Gnd || (Gnd = {}));
var Gnd;
(function (Gnd) {
    (function (Route) {
        ; ;
        var interval;
        function listen(root, cb) {
            if(_.isFunction(root)) {
                cb = root;
                root = '/';
            }
            var req, fn = function () {
url = location.hash.replace(/^#!?/, '');
                if(!req || (req.url !== url)) {
                    req && req.queue.cancel();
                    req = new Request(url, req && req.nodes || []);
                    var index = req.index;
                    cb(req);
                    if(index == req.index) {
                        req.isNotFound = true;
                        req.queue.end();
                    }
                    req.queue.wait(function (isCancelled) {
                        if(req.isNotFound) {
                            if(req.notFoundFn) {
                                req.index = 1;
                                req.initNode('body');
                                req.notFoundFn.call(req, req);
                                var queue = new Gnd.TaskQueue();
                                enqueueNode(queue, req.node());
                            } else {
                                console.log('Undefined route:' + location.hash);
                                return;
                            }
                        }
                    });
                }
            };
            if(location.hash === '') {
                if(root) {
                    location.hash = '!' + root;
                }
            } else {
                fn();
            }
            if('onhashchange' in window) {
                window.onhashchange = fn;
            } else {
                interval = setInterval(fn, 50);
            }
        }
        Route.listen = listen;
        function stop() {
            if(interval) {
                clearInterval(interval);
                interval = null;
            }
            if('onhashchange' in window) {
                window.onhashchange = null;
            }
        }
        Route.stop = stop;
        function redirect(url) {
            location.hash = url;
            if('onhashchange' in window) {
                Gnd.$(window).trigger('onhashchange');
            }
        }
        Route.redirect = redirect;
        var parseQuery = function (queryString) {
            if(queryString) {
                var keyValues = queryString.split('&'), i, len = keyValues.length;
                var obj = {
                };
                for(i = 0; i < len; i++) {
                    var keyValue = keyValues[i].split('=');
                    obj[decodeURIComponent(keyValue[0])] = keyValue[1] ? decodeURIComponent(keyValue[1]) : '';
                }
                return obj;
            } else {
                return {
                };
            }
        };
        function parseParams(expr, component, params) {
            if(expr.charAt(0) === ':') {
                params[expr.replace(':', '')] = component;
                return true;
            }
            return false;
        }
        var AutoreleasePool = (function () {
            function AutoreleasePool() {
                this.drained = false;
                this.pool = [];
            }
            AutoreleasePool.prototype.autorelease = function () {
                var pool = this.pool;
                _.each(arguments, function (obj) {
                    if(_.isArray(obj)) {
                        pool.push.apply(pool, obj);
                    } else {
                        pool.push(obj);
                    }
                });
                this.drained && this.drain();
            };
            AutoreleasePool.prototype.drain = function () {
                for(var i = 0, len = this.pool.length; i < len; i++) {
                    this.pool[i].release();
                }
                this.pool = [];
                this.drained = true;
            };
            return AutoreleasePool;
        })();        
        var wrap = Gnd.overload({
            'Function Array Function': function (fn, args, cb) {
                return function (done) {
                    var _args = _.clone(args);
                    _args.push(function () {
                        cb(done);
                        if(cb.length === 0) {
                            done();
                        }
                    });
                    fn.apply(null, _args);
                }
            },
            'Function Function': function (fn, cb) {
                return wrap(fn, [], cb);
            },
            'Function Array': function (fn, args) {
                return wrap(fn, args, Gnd.Util.noop);
            },
            'Function': function (fn) {
                return wrap(fn, []);
            }
        });
        var decomposeUrl = function (url) {
            var s = url.split('?'), components, len;
            components = s[0].split('/');
            len = components.length;
            if(_.last(components) === '' && len > 1) {
                components.splice(len - 1, 1);
            }
            return {
                components: components,
                query: parseQuery(s[1])
            };
        };
        function processMiddlewares(req, middlewares, cb) {
            Gnd.Util.asyncForEach(middlewares, function (fn, cb) {
                fn(req, cb);
            }, cb);
        }
        function exitNodes(queue, nodes, start) {
            for(var i = nodes.length - 1; i >= start; i--) {
                var node = nodes[i];
                node.el || queue.append(node.select);
                queue.append(node.exit || node.hide, node.drain, node.leave);
            }
        }
        function enqueueNode(queue, node) {
            queue.append(node.select, node.hide, node.before, node.load, node.render, node.enter || node.show, node.after);
        }
        var Request = (function () {
            function Request(url, prevNodes) {
                this.nodes = [];
                this.index = 0;
                this.level = 0;
                this.params = {
                };
                this.queue = new Gnd.TaskQueue();
                var self = this, components, i, len;
                _.extend(self, decomposeUrl(url));
                components = self.components;
                len = components.length;
                this.url = url;
                this.prevNodes = prevNodes;
                for(i = 0; i < len; i++) {
                    var prev = prevNodes[i];
                    if(prev && (prev.component === components[i])) {
                        self.nodes.push({
                            component: components[i],
                            autoreleasePool: prev.autoreleasePool
                        });
                    } else {
                        break;
                    }
                }
                self.startIndex = i;
                for(i = self.startIndex; i < len; i++) {
                    self.nodes.push({
                        component: components[i],
                        autoreleasePool: new AutoreleasePool()
                    });
                }
            }
            Request.prototype.currentSubPath = function () {
                var subPath = '';
                for(var i = 0, len = this.index; i < len; i++) {
                    subPath += this.components[i] + '/';
                }
                if(subPath.length > 0) {
                    subPath = subPath.substr(0, subPath.length - 1);
                }
                return subPath;
            };
            Request.prototype.consume = function (expr, level) {
                var index = this.index;
                if(expr) {
                    if((level != index) || (index >= this.components.length)) {
                        return false;
                    }
                    var comp = this.components[index];
                    if(!parseParams(expr, comp, this.params) && expr !== comp) {
                        return false;
                    }
                }
                this.index++;
                return true;
            };
            Request.prototype.initNode = function (selector, node) {
                var _this = this;
                (function (node) {
                    node.select = wrap(function (done) {
                        node.el = _this.el = Gnd.$(selector)[0];
                        done();
                    });
                    node.selector = selector;
                    node.hide = wrap(function (done) {
                        node.el && Gnd.hide(node.el);
                        done();
                    });
                    node.show = wrap(function (done) {
                        node.el && Gnd.show(node.el);
                        done();
                    });
                    node.drain = wrap(function (done) {
                        node.autoreleasePool.drain();
                        done();
                    });
                })(node || this.node());
            };
            Request.prototype.enterNode = function (fn, node, index, level, args, pool, isLastRoute) {
                var self = this;
                self.level = level + 1;
                if(arguments.length == 7) {
                    fn && fn.call(self, pool, args);
                } else {
                    fn && fn.call(self, args);
                    isLastRoute = pool;
                }
                self.isNotFound = (index >= self.index) && !isLastRoute;
                if(!self.isNotFound && index > self.startIndex) {
                    enqueueNode(self.queue, node);
                }
                if(self.isNotFound || isLastRoute) {
                    self.queue.end();
                }
            };
            Request.prototype.notFound = function (fn) {
                this.notFoundFn = fn;
            };
            Request.prototype.node = function () {
                return this.nodes[this.index <= 0 ? 0 : (this.index - 1)];
            };
            Request.prototype.createRouteTask = function (level, selector, args, middlewares, handler, cb) {
                var _this = this;
                return function (done) {
                    processMiddlewares(_this, middlewares, function (err) {
                        var node = _this.node(), pool = node.autoreleasePool, index = _this.index, isLastRoute = index === _this.components.length;
                        if(index == _this.startIndex) {
                            exitNodes(_this.queue, _this.prevNodes, _this.startIndex);
                        }
                        _this.initNode(selector, node);
                        if(cb) {
                            _this.enterNode(cb, node, index, level, {
                            }, pool, isLastRoute);
                            done();
                        } else {
                            curl([
                                handler
                            ], function (cb) {
                                this.enterNode(cb, node, index, level, args, pool, isLastRoute);
                                done();
                            });
                        }
                    });
                }
            };
            Request.prototype.get = function () {
                return Gnd.overload({
                    'String String Function': function (component, selector, handler) {
                        return this._get(component, selector, {
                        }, undefined, handler);
                    },
                    'String String Object String': function (component, selector, args, handler) {
                        return this._get(component, selector, args, handler);
                    },
                    'String Function': function (component, handler) {
                        return this._get(component, 'body', {
                        }, undefined, handler);
                    },
                    'Function': function (handler) {
                        return this._get('', 'body', {
                        }, undefined, handler);
                    }
                }).apply(this, arguments);
            };
            Request.prototype._get = function (component, selector, args, handler, cb) {
                if(this.wantsRedirect || !this.consume(component, this.level)) {
                    return this;
                }
                this.queue.append(this.createRouteTask(this.level, selector, args, [], handler, cb));
                return this;
            };
            Request.prototype.isLast = function () {
                return this.index >= this.components.length;
            };
            Request.prototype.nextComponent = function () {
                return this.components[this.index];
            };
            Request.prototype.redirect = function (url, params) {
                url = params ? url + '?' + Gnd.serialize(params) : url;
                this.queue.wait(function () {
                    redirect(url);
                });
                this.wantsRedirect = true;
            };
            Request.prototype.before = function (cb) {
                this.node().before = wrap(function (cb) {
                    cb();
                }, cb);
                return this;
            };
            Request.prototype.after = function (cb) {
                this.node().after = wrap(function (cb) {
                    cb();
                }, cb);
                return this;
            };
            Request.prototype.enter = function (fn) {
                var node = this.node();
                node.enter = wrap(function (done) {
                    node.el && fn(node.el, done);
                    (fn.length == 1) && done();
                });
                return this;
            };
            Request.prototype.exit = function (fn) {
                var node = this.node();
                node.exit = wrap(function (done) {
                    node.el && fn(node.el, done);
                    (fn.length == 1) && done();
                });
                return this;
            };
            Request.prototype.leave = function (cb) {
                this.node().leave = wrap(function (cb) {
                    cb();
                }, cb);
                return this;
            };
            Request.prototype.render = function (templateUrl, css, locals, cb) {
                return Gnd.overload({
                    "String String Object Function": function (templateUrl, css, locals, cb) {
                        var fn = _.bind(this._render, this);
                        this.node().render = wrap(fn, [
                            templateUrl, 
                            css, 
                            locals
                        ], cb);
                        return this;
                    },
                    "String String Function": function (templateUrl, css, cb) {
                        return this.render(templateUrl, css, {
                        }, cb);
                    },
                    "String String": function (templateUrl, css) {
                        return this.render(templateUrl, css, {
                        }, Gnd.Util.noop);
                    },
                    "String String Object": function (templateUrl, css, locals) {
                        return this.render(templateUrl, css, locals, Gnd.Util.noop);
                    },
                    "String Object": function (templateUrl, locals) {
                        return this.render(templateUrl, "", locals, Gnd.Util.noop);
                    },
                    "String Object Function": function (templateUrl, locals, cb) {
                        return this.render(templateUrl, "", locals, cb);
                    },
                    "String Function": function (templateUrl, cb) {
                        return this.render(templateUrl, "", {
                        }, cb);
                    },
                    "String": function (templateUrl) {
                        return this.render(templateUrl, Gnd.Util.noop);
                    }
                }).apply(this, arguments);
            };
            Request.prototype.load = function (urls, cb) {
                if(_.isFunction(urls)) {
                    cb = urls;
                    urls = null;
                }
                var fn = _.bind(this._load, this);
                this.node().load = wrap(fn, [
                    urls
                ], cb);
                return this;
            };
            Request.prototype._render = function (templateUrl, css, locals, cb) {
                var self = this;
                if(_.isObject(css)) {
                    cb = locals;
                    locals = css;
                    css = undefined;
                } else {
                    if(_.isFunction(css)) {
                        cb = css;
                        css = undefined;
                        locals = undefined;
                    } else {
                        if(_.isFunction(locals)) {
                            cb = locals;
                            locals = undefined;
                        }
                    }
                }
                cb = cb || Gnd.Util.noop;
                var items = [
                    'text!' + templateUrl
                ];
                css && items.push('css!' + css);
                curl(items, function (templ) {
                    applyTemplate(templ);
                });
                function applyTemplate(templ) {
                    var args;
                    if(_.isString(locals)) {
                        args[locals] = self.data;
                    } else {
                        if(_.isObject(locals) && !_.isEmpty(locals)) {
                            args = locals;
                        } else {
                            if(_.isObject(self.data)) {
                                args = self.data;
                            } else {
                                args = {
                                };
                            }
                        }
                    }
                    var html = Gnd.using.template(templ)(args);
                    if(self.el) {
                        self.el.innerHTML = html;
                        waitForImages(self.el, cb);
                    } else {
                        cb();
                    }
                }
                function waitForImages(el, cb) {
                    var $images = Gnd.$('img', el), counter = $images.length;
                    cb = _.once(cb);
                    var deferTimeout = _.debounce(cb, 1000);
                    if(counter > 0) {
                        deferTimeout();
                        var loadEvent = function (evt) {
                            deferTimeout();
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
            };
            Request.prototype._load = function (urls, cb) {
                var base = this.currentSubPath(), self = this, i, len;
                if(urls === null) {
                    urls = self.data;
                }
                if(!_.isArray(urls)) {
                    urls = [
                        urls
                    ];
                }
                var _urls = [];
                for(i = 0 , len = urls.length; i < len; i++) {
                    _urls.push('text!' + urls[i]);
                }
                curl(_urls, function () {
                    var args = arguments;
                    var objs = [];
                    for(i = 0 , len = args.length; i < len; i++) {
                        try  {
                            objs.push(JSON.parse(arguments[i]));
                        } catch (e) {
                            console.log("Error parsing data: " + e.name + "::" + e.message);
                        }
                    }
                    objs = objs.length === 1 ? objs[0] : objs;
                    self.data = objs;
                    cb && cb();
                });
            };
            return Request;
        })();        
    })(Gnd.Route || (Gnd.Route = {}));
    var Route = Gnd.Route;
})(Gnd || (Gnd = {}));
var Gnd;
(function (Gnd) {
    var View = (function (_super) {
        __extends(View, _super);
        function View(selector, parent, args) {
                _super.call(this);
            this.children = [];
            this.selector = selector;
            if(parent) {
                if(parent instanceof View) {
                    this.parent = parent;
                    parent.children.push(this);
                } else {
                    args = args || parent;
                }
            }
            _.extend(this, args);
            this.onShowing = this.onHidding = function (el, args, done) {
                done();
            };
        }
        View.prototype.init = function (done) {
            var _this = this;
            Gnd.Util.fetchTemplate(this.templateUrl, this.cssUrl, function (err, templ) {
                if(!err) {
                    _this.template = Gnd.using.template(_this.templateStr || templ);
                    Gnd.Util.asyncForEach(_this.children, function (subview, cb) {
                        _this.init(cb);
                    }, done);
                } else {
                    done(err);
                }
            });
        };
        View.prototype.render = function (context) {
            var html;
            if(this.template) {
                html = this.template(context);
            } else {
                html = this.html || '<div>';
            }
            this.fragment = Gnd.$(html)[0];
            if(!this.fragment) {
                throw (new Error('Invalid html:\n' + html));
            }
            var parentRoot = this.parent ? this.parent.root : null;
            var target = this.root = (this.selector && Gnd.$(this.selector, parentRoot)[0]) || document.body;
            if(this.style) {
                Gnd.$(target).css(this.style);
            }
            target.appendChild(this.fragment);
            _.each(this.children, function (subview) {
                subview.render(context);
            });
        };
        View.prototype.clean = function () {
            if(this.root) {
                Gnd.$(this.root).html('');
            }
        };
        View.prototype.disable = function (disable) {
            console.log(this + " does not implement disable");
        };
        View.prototype.hide = function (args, done) {
            var _this = this;
            this.root && this.onHidding(this.root, args, function () {
                Gnd.$(_this.root).hide();
                done();
            });
        };
        View.prototype.show = function (args, done) {
            var _this = this;
            this.root && this.onShowing(this.root, args, function () {
                Gnd.$(_this.root).show();
                done();
            });
        };
        View.prototype.destroy = function () {
            this.clean();
            _super.prototype.destroy.call(this);
        };
        return View;
    })(Gnd.Base);
    Gnd.View = View;    
})(Gnd || (Gnd = {}));
var Gnd;
(function (Gnd) {
    var dataBindingReqExp = /^data-/;
    var ViewModel = (function (_super) {
        __extends(ViewModel, _super);
        function ViewModel(el, context, formatters, binders) {
                _super.call(this);
            this.contexts = [];
            this.boundBinders = [];
            this.formatters = {
            };
            this.formatters = formatters || this.formatters;
            this.binders = {
                bind: TwoWayBinder,
                each: EachBinder,
                show: ShowBinder,
                'class': ClassBinder,
                event: EventBinder
            };
            _.extend(this.binders, binders);
            this.pushContext(context);
            this.boundBinders = this.bindNode(el);
        }
        ViewModel.prototype.destroy = function () {
            this.unbind();
            _super.prototype.destroy.call(this);
        };
        ViewModel.prototype.unbind = function (bindings) {
            _.each(bindings || this.boundBinders, function (binder) {
                binder.unbind();
            });
            !bindings && (this.boundBinders = []);
        };
        ViewModel.prototype.resolveContext = function (keyPath) {
            var root = keyPath[0], context;
            for(var i = this.contexts.length - 1; i >= 0; i--) {
                context = this.contexts[i][root];
                if(context) {
                    return this.resolveKeypath(context, _.rest(keyPath));
                }
            }
        };
        ViewModel.prototype.pushContext = function (context) {
            this.contexts.push(context);
        };
        ViewModel.prototype.popContext = function () {
            this.contexts.pop();
        };
        ViewModel.prototype.bindNode = function (node) {
            var binders = [];
            if(node.attributes) {
                var attributes = node.attributes;
                for(var j = 0; j < attributes.length; j++) {
                    if(dataBindingReqExp.test(attributes[j].name)) {
                        var type = attributes[j].name.replace(dataBindingReqExp, '');
                        var value = attributes[j].value;
                        if(this.binders[type]) {
                            var binder = new this.binders[type]();
                            binder.bind(node, value, this);
                            binders.push(binder);
                        }
                    }
                }
            }
            if(node.hasChildNodes()) {
                var children = _.toArray(node.childNodes);
                for(var i = 0; i < children.length; i++) {
                    if(Gnd.isElement(children[i])) {
                        binders.push.apply(binders, this.bindNode(children[i]));
                    }
                }
            }
            return binders;
        };
        ViewModel.prototype.resolveKeypath = function (obj, keyPath) {
            for(var i = 0; i < keyPath.length; i++) {
                obj = obj[keyPath[i]];
                if(!obj) {
                    return null;
                }
            }
            return obj;
        };
        return ViewModel;
    })(Gnd.Base);
    Gnd.ViewModel = ViewModel;    
    var TwoWayBinder = (function () {
        function TwoWayBinder() {
            this.bindings = [];
            this.attrBindings = {
            };
            this.attrFormatters = {
            };
        }
        TwoWayBinder.re = /((\s*(\w+)\s*\:\s*((\w+\.*)+)\s*(\|\s*(\w+)\s*)?);?)/gi;
        TwoWayBinder.prototype.parse = function (value, formatters) {
            var match, formatter;
            while(match = TwoWayBinder.re.exec(value)) {
                var attr = match[3];
                this.attrBindings[attr] = makeKeypathArray(match[4]);
                formatter = formatters[match[7]];
                if(formatter) {
                    this.attrFormatters[attr] = formatter;
                }
            }
        };
        TwoWayBinder.prototype.createBinding = function (attr, el, viewModel) {
            var attrBinding = this.attrBindings[attr], attrFormatter = this.attrFormatters[attr], obj = viewModel.resolveContext(_.initial(attrBinding));
            if(obj instanceof Gnd.Base) {
                var keypath = _.rest(attrBinding).join('.'), modelListener, elemListener = null;
                var format = function () {
                    return attrFormatter ? attrFormatter(obj.get(keypath)) : obj.get(keypath);
                };
                if(attr === 'text') {
                    setText(el, format());
                    modelListener = function () {
                        setText(el, format());
                    };
                } else {
                    Gnd.setAttr(el, attr, format());
                    modelListener = function () {
                        Gnd.setAttr(el, attr, format());
                    };
                    elemListener = function (value) {
                        obj.set(keypath, Gnd.getAttr(el, attr));
                    };
                }
                obj.retain();
                obj.on(keypath, modelListener);
                Gnd.$(el).on('change', elemListener);
                this.bindings.push([
                    obj, 
                    keypath, 
                    modelListener, 
                    elemListener
                ]);
            } else {
                console.log("Warning: not found a valid model: " + attrBinding[0]);
            }
        };
        TwoWayBinder.prototype.bind = function (el, value, viewModel) {
            this.parse(value, viewModel.formatters);
            this.el = el;
            for(var attr in this.attrBindings) {
                this.createBinding(attr, el, viewModel);
            }
        };
        TwoWayBinder.prototype.unbind = function () {
            var _this = this;
            _.each(this.bindings, function (item) {
                item[0].off(item[1], item[2]);
                item[0].release();
                item[3] && Gnd.$(_this.el).off('change', item[3]);
            });
        };
        return TwoWayBinder;
    })();    
    var EachBinder = (function () {
        function EachBinder() {
            this.items = [];
            this.mappings = {
            };
        }
        EachBinder.prototype.bind = function (el, value, viewModel) {
            var _this = this;
            var arr = value.trim().split(':');
            if(arr.length !== 2) {
                console.log("Warning: syntax error in data-each:" + value);
                return;
            }
            var mappings = this.mappings, nextSibling = el.nextSibling, keyPath = makeKeypathArray(arr[0]), collection = viewModel.resolveContext(keyPath), itemContextName = arr[1].trim();
            var parent = this.parent = el.parentNode;
            this.viewModel = viewModel;
            if(collection instanceof Gnd.Collection) {
                this.collection = collection;
                parent.removeChild(el);
                el.removeAttribute('data-each');
                el.removeAttribute('id');
                var addNode = function (item, nextSibling) {
                    var itemNode = el.cloneNode(true), id = item.id(), modelListener = function (newId) {
if(!(newId in mappings)) {
delete mappings[id];mappings[newId] = itemNode;Gnd.setAttr(itemNode, 'data-item', newId);                        }                    };
                    item.retain();
                    Gnd.setAttr(itemNode, 'data-item', id);
                    mappings[id] = itemNode;
                    if(nextSibling) {
                        parent.insertBefore(itemNode, nextSibling);
                    } else {
                        parent.appendChild(itemNode);
                    }
                    var context = {
                    };
                    context[itemContextName] = item;
                    viewModel.pushContext(context);
                    itemNode['gnd-bindings'] = viewModel.bindNode(itemNode);
                    viewModel.popContext();
                    item.on('id', modelListener);
                    itemNode['gnd-obj'] = item;
                    itemNode['gnd-listener'] = modelListener;
                };
                var addNodes = function () {
                    collection.filtered(function (err, models) {
                        _.each(models, function (item) {
                            addNode(item, nextSibling);
                        });
                    });
                };
                var refresh = function () {
                    _this.removeNodes();
                    addNodes();
                };
                refresh();
                this.addedListener = function (item) {
                    if(collection.isFiltered(item)) {
                        addNode(item, nextSibling);
                    }
                };
                this.removedListener = function (item) {
                    if(mappings[item.id()]) {
                        _this.removeNode(item.id());
                    }
                };
                this.updatedListener = refresh;
                collection.on('added:', this.addedListener).on('removed:', this.removedListener).on('filterFn sorted: updated:', this.updatedListener);
            } else {
                console.log("Warning: not found a valid collection: " + arr[0]);
            }
        };
        EachBinder.prototype.unbind = function () {
            this.collection.off('added:', this.addedListener);
            this.collection.off('removed:', this.removedListener);
            this.collection.off('filterFn sorted: updated:', this.updatedListener);
            this.removeNodes();
        };
        EachBinder.prototype.removeNode = function (id) {
            var node = this.mappings[id], item = node['gnd-obj'];
            this.viewModel.unbind(node['gnd-bindings']);
            item.off('id', node['gnd-listener']);
            item.release();
            this.parent.removeChild(node);
            delete this.mappings[id];
        };
        EachBinder.prototype.removeNodes = function () {
            for(var id in this.mappings) {
                this.removeNode(id);
            }
        };
        return EachBinder;
    })();    
    var ShowBinder = (function () {
        function ShowBinder() {
            this.bindings = [];
        }
        ShowBinder.prototype.bind = function (el, value, viewModel) {
            var _value = value.replace('!', ''), negate = _value === value ? false : true, keypath = makeKeypathArray(_value), model = viewModel.resolveContext(_.initial(keypath));
            if(model instanceof Gnd.Base) {
                model.retain();
                function setVisibility(visible) {
                    if(negate ? !visible : visible) {
                        Gnd.show(el);
                    } else {
                        Gnd.hide(el);
                    }
                }
                var key = _.rest(keypath).join('.'), modelListener = function (visible) {
setVisibility(visible);                };
                setVisibility(model.get(key));
                model.on(key, modelListener);
                this.bindings.push([
                    model, 
                    key, 
                    modelListener
                ]);
            } else {
                console.log("Warning: not found a valid model: " + value);
            }
        };
        ShowBinder.prototype.unbind = function () {
            _.each(this.bindings, function (item) {
                item[0].off(item[1], item[2]);
                item[0].release();
            });
        };
        return ShowBinder;
    })();    
    var ClassBinder = (function () {
        function ClassBinder() {
            this.bindings = [];
        }
        ClassBinder.prototype.bind = function (el, value, viewModel) {
            var _this = this;
            var classMappings = {
            }, classSets = value.split(';'), classNames = el['className'] === '' ? [] : el['className'].split(' '), usedClassNameSets = {
            };
            var processMapping = function (keypath) {
                var _keypath = keypath.replace('!', ''), negate = _keypath === keypath ? false : true, keypathArray = makeKeypathArray(_keypath), model = viewModel.resolveContext(_.initial(keypathArray));
                if(model instanceof Gnd.Base) {
                    model.retain();
                    var key = _.rest(keypathArray).join('.'), addClasses = negate ? !model.get(key) : model.get(key), modelListener;
                    if(addClasses) {
                        usedClassNameSets[keypath] = keypath;
                    }
                    modelListener = function (value) {
                        if(negate ? !value : value) {
                            usedClassNameSets[keypath] = keypath;
                        } else {
                            delete usedClassNameSets[keypath];
                        }
                        updateClassNames();
                    };
                    model.on(key, modelListener);
                    _this.bindings.push([
                        model, 
                        key, 
                        modelListener
                    ]);
                } else {
                    console.log("Warning: not found a valid model: " + value);
                }
            };
            function updateClassNames() {
                var newClassNames = classNames;
                for(var key in usedClassNameSets) {
                    newClassNames = _.union(newClassNames, classMappings[key]);
                }
                el['className'] = newClassNames.join(' ');
            }
            for(var i = 0; i < classSets.length; i++) {
                var keyVal = classSets[i].split(':');
                if(keyVal.length === 2) {
                    var classes = keyVal[0].trim().split(' '), keypath = keyVal[1].trim();
                    classMappings[keypath] = [];
                    for(var j = 0; j < classes.length; j++) {
                        classMappings[keypath].push(classes[j].trim());
                    }
                    for(var keypath in classMappings) {
                        processMapping(keypath);
                    }
                    updateClassNames();
                } else {
                    console.log("Warning: Syntax error in " + classSets[i]);
                }
            }
        };
        ClassBinder.prototype.unbind = function () {
            _.each(this.bindings, function (item) {
                item[0].off(item[1], item[2]);
                item[0].release();
            });
        };
        return ClassBinder;
    })();    
    var EventBinder = (function () {
        function EventBinder() {
            this.bindings = [];
        }
        EventBinder.re = /((\s*(\w+)\s*\:\s*((\w+\.*)+)\s*);?)/gi;
        EventBinder.prototype.parse = function (value) {
            var eventBindings = {
            }, match;
            while(match = TwoWayBinder.re.exec(value)) {
                eventBindings[match[3]] = makeKeypathArray(match[4]);
            }
            return eventBindings;
        };
        EventBinder.prototype.bind = function (el, value, viewModel) {
            var _this = this;
            var eventBindings = this.parse(value);
            this.el = el;
            var addEvent = function (eventName) {
                var keypath = eventBindings[eventName], obj = viewModel.resolveContext(_.initial(keypath));
                if(obj instanceof Gnd.Base) {
                    var eventKeypath = _.rest(keypath).join('.'), handler = obj.get(eventKeypath);
                    obj.retain();
                    if(_.isFunction(handler)) {
                        var elementListener = function (evt) {
                            handler.call(obj, el, evt);
                        };
                        Gnd.$(el).on(eventName, elementListener);
                        _this.bindings.push([
                            obj, 
                            eventName, 
                            elementListener
                        ]);
                    } else {
                        console.log("Warning: the given handler is not a function: " + keypath);
                    }
                } else {
                    console.log("Warning: not found an object instance of Gnd.Base: " + keypath[0]);
                }
            };
            for(var eventName in eventBindings) {
                addEvent(eventName);
            }
        };
        EventBinder.prototype.unbind = function () {
            var _this = this;
            _.each(this.bindings, function (item) {
                item[0].release();
                Gnd.$(_this.el).off(item[1], item[2]);
            });
        };
        return EventBinder;
    })();    
    if(!String.prototype.trim) {
        String.prototype.trim = Gnd.Util.trim;
    }
    function setText(el, value) {
        if(Gnd.isElement(value)) {
            el.parentNode.replaceChild(value, el);
        } else {
            Gnd.$(el).html(value);
        }
    }
    function makeKeypathArray(keypath) {
        var arr = keypath.trim().split('.');
        for(var i = 0; i < arr.length; i++) {
            arr[i] = arr[i].trim();
        }
        return arr;
    }
})(Gnd || (Gnd = {}));
((function (root, factory) {
    if(typeof exports === 'object') {
        root['module'].exports = factory();
    } else {
        if(typeof define === 'function' && define.amd) {
            define(factory);
        } else {
            root.returnExports = factory();
        }
    }
})(this, function () {
    return Gnd;
}));
//@ sourceMappingURL=gnd.js.map
