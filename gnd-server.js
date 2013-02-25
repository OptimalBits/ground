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
            SyncHub.prototype.deleteItem = function (keyPath, itemKeyPath) {
                var args = {
                    keyPath: keyPath,
                    itemKeyPath: itemKeyPath
                };
                console.log('deleteItem-synchub');
                console.log(args);
                this.pubClient.publish('deleteItem:', JSON.stringify(args));
            };
            return SyncHub;
        })();
        Sync.SyncHub = SyncHub;        
    })(Gnd.Sync || (Gnd.Sync = {}));
    var Sync = Gnd.Sync;
})(Gnd || (Gnd = {}));
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
        ProxyStorage.prototype.all = function (keyPath, query, opts, cb) {
            this.storage.all(keyPath, query, opts, cb);
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
        ProxyStorage.prototype.deleteItem = function (keyPath, itemKeyPath, opts, cb) {
            var _this = this;
            this.storage.deleteItem(keyPath, itemKeyPath, opts, function (err) {
                if(!err) {
                    _this.syncHub && _this.syncHub.deleteItem(keyPath, itemKeyPath);
                }
                cb(err);
            });
        };
        ProxyStorage.prototype.insertBefore = function (keyPath, refItemKeyPath, itemKeyPath, opts, cb) {
            var _this = this;
            this.storage.insertBefore(keyPath, refItemKeyPath, itemKeyPath, opts, function (err) {
                if(!err) {
                    _this.syncHub && _this.syncHub.insertBefore(keyPath, refItemKeyPath, itemKeyPath);
                }
                cb(err);
            });
        };
        return ProxyStorage;
    })();    
})(Gnd || (Gnd = {}));
function scb(cb) {
    return function () {
        if(arguments[0]) {
            arguments[0] = arguments[0].message;
        }
        cb && cb.apply(null, arguments);
    }
}
var Gnd;
(function (Gnd) {
    var SocketBackend = (function () {
        function SocketBackend(socketManager, server) {
            socketManager.on('connection', function (socket) {
                socket.on('create', function (keyPath, doc, cb) {
                    server.storage.create(keyPath, doc, scb(cb));
                });
                socket.on('put', function (keyPath, doc, cb) {
                    server.storage.put(keyPath, doc, scb(cb));
                });
                socket.on('get', function (keyPath, cb) {
                    server.storage.fetch(keyPath, scb(cb));
                });
                socket.on('del', function (keyPath, cb) {
                    server.storage.del(keyPath, scb(cb));
                });
                socket.on('add', function (keyPath, itemsKeyPath, itemIds, cb) {
                    console.log(arguments);
                    server.storage.add(keyPath, itemsKeyPath, itemIds, {
                    }, scb(cb));
                });
                socket.on('remove', function (keyPath, itemsKeyPath, itemIds, cb) {
                    server.storage.remove(keyPath, itemsKeyPath, itemIds, {
                    }, scb(cb));
                });
                socket.on('find', function (keyPath, query, options, cb) {
                    server.storage.find(keyPath, query, options, scb(cb));
                });
                socket.on('all', function (keyPath, query, opts, cb) {
                    server.storage.all(keyPath, query, opts, scb(cb));
                });
                socket.on('first', function (keyPath, opts, cb) {
                    server.storage.first(keyPath, opts, scb(cb));
                });
                socket.on('last', function (keyPath, opts, cb) {
                    server.storage.last(keyPath, opts, scb(cb));
                });
                socket.on('next', function (keyPath, refItemKeyPath, opts, cb) {
                    server.storage.next(keyPath, refItemKeyPath, opts, scb(cb));
                });
                socket.on('prev', function (keyPath, refItemKeyPath, opts, cb) {
                    server.storage.prev(keyPath, refItemKeyPath, opts, scb(cb));
                });
                socket.on('deleteItem', function (keyPath, itemKeyPath, opts, cb) {
                    server.storage.deleteItem(keyPath, itemKeyPath, opts, scb(cb));
                });
                socket.on('insertBefore', function (keyPath, refItemKeyPath, itemKeyPath, opts, cb) {
                    server.storage.insertBefore(keyPath, refItemKeyPath, itemKeyPath, opts, scb(cb));
                });
            });
        }
        return SocketBackend;
    })();
    Gnd.SocketBackend = SocketBackend;    
})(Gnd || (Gnd = {}));
var Gnd;
(function (Gnd) {
    var mongoose = require('mongoose')
    function makeKey(keyPath) {
        return keyPath.join('@');
    }
    function parseKey(key) {
        return key.split('@');
    }
    var MongooseStorage = (function () {
        function MongooseStorage(models, sync) {
            this.models = models;
            this.sync = sync;
            this.listContainer = mongoose.model('ListContainer', new mongoose.Schema({
                type: {
                    type: String
                },
                prev: {
                    type: mongoose.Schema.ObjectId,
                    ref: 'ListContainer'
                },
                next: {
                    type: mongoose.Schema.ObjectId,
                    ref: 'ListContainer'
                },
                modelId: {
                    type: String
                }
            }));
        }
        MongooseStorage.prototype.create = function (keyPath, doc, cb) {
            this.getModel(keyPath, function (Model) {
                var instance = new Model(doc);
                instance.save(function (err, doc) {
                    doc.__rev = 0;
                    cb(err, doc._id);
                });
            }, cb);
        };
        MongooseStorage.prototype.put = function (keyPath, doc, cb) {
            this.getModel(keyPath, function (Model) {
                Model.findByIdAndUpdate(_.last(keyPath), doc, function (err, oldDoc) {
                    if(!err && !_.isEqual(doc, oldDoc)) {
                    }
                    cb(err);
                });
            }, cb);
        };
        MongooseStorage.prototype.fetch = function (keyPath, cb) {
            this.getModel(keyPath, function (Model) {
                Model.findById(_.last(keyPath), function (err, doc) {
                    if(doc) {
                        cb(err, doc);
                    } else {
                        cb(err || new Error("Document not found"));
                    }
                });
            }, cb);
        };
        MongooseStorage.prototype.del = function (keyPath, cb) {
            this.getModel(keyPath, function (Model) {
                Model.remove({
                    _id: _.last(keyPath)
                }, cb);
            }, cb);
        };
        MongooseStorage.prototype.add = function (keyPath, itemsKeyPath, itemIds, opts, cb) {
            var _this = this;
            console.log('---add--------');
            console.log(keyPath);
            if(_.isFunction(opts)) {
                cb = opts;
            }
            this.getModel(itemsKeyPath, function (Set) {
                console.log(itemsKeyPath);
                if(Set && Set.parent) {
                    var doc = {
                    };
                    console.log(Set.parent());
                    doc[Set.parent()] = keyPath[keyPath.length - 2];
                    Set.update({
                        _id: {
                            $in: itemIds
                        }
                    }, doc, function (err) {
                        if(!err) {
                        }
                        cb(err);
                    });
                } else {
                    console.log(':::::');
                    console.log(keyPath);
                    _this.getModel(keyPath, function (Model) {
                        var id = keyPath[keyPath.length - 2];
                        console.log(Model.add);
                        console.log(keyPath);
                        if(Model.add) {
                            var setName = _.last(keyPath);
                            Model.add(id, setName, itemIds, function (err, ids) {
                                if(!err) {
                                }
                                cb(err);
                            });
                        } else {
                            console.log(33);
                            cb(new Error("No parent or add function available"));
                        }
                    }, cb);
                }
            }, cb);
        };
        MongooseStorage.prototype.remove = function (keyPath, itemsKeyPath, itemIds, opts, cb) {
            var _this = this;
            if(itemIds.length === 0) {
                cb(null);
            }
            if(_.isFunction(opts)) {
                cb = opts;
            }
            this.getModel(itemsKeyPath, function (Set) {
                if(Set && Set.parent) {
                } else {
                    _this.getModel(keyPath, function (Model) {
                        var id = keyPath[keyPath.length - 2];
                        var setName = _.last(keyPath);
                        var update = {
                            $pullAll: {
                            }
                        };
                        update.$pullAll[setName] = itemIds;
                        Model.update({
                            _id: id
                        }, update, function (err) {
                            cb(err);
                        });
                    }, cb);
                }
            }, cb);
        };
        MongooseStorage.prototype.find = function (keyPath, query, options, cb) {
            var _this = this;
            this.getModel(keyPath, function (Model) {
                if(keyPath.length === 1) {
                    return _this.findAll(Model, cb);
                } else {
                    var id = keyPath[keyPath.length - 2];
                    var setName = _.last(keyPath);
                    return _this.findById(Model, id, setName, query, options, cb);
                }
            }, cb);
        };
        MongooseStorage.prototype.findAll = function (Model, cb) {
            Model.find({
            }).exec(function (err, doc) {
                if(err) {
                    cb(err);
                } else {
                    cb(null, doc);
                }
            });
        };
        MongooseStorage.prototype.findById = function (Model, id, setName, query, options, cb) {
            var query = query || {
                fields: null,
                cond: null,
                options: null
            };
            Model.findById(id).select(setName).populate(setName, query.fields, query.cond, query.options).exec(function (err, doc) {
                if(err) {
                    cb(err);
                } else {
                    cb(null, doc && doc[setName]);
                }
            });
        };
        MongooseStorage.prototype.findContainerOfModel = function (Model, id, name, modelId, cb) {
            var _this = this;
            console.log('fcom');
            console.log(modelId);
            switch(modelId) {
                case '##@_begin': {
                    this.findEndPoints(Model, id, name, function (err, begin, end) {
                        cb(err, begin);
                    });
                    break;

                }
                case '##@_end': {
                    this.findEndPoints(Model, id, name, function (err, begin, end) {
                        cb(err, end);
                    });
                    break;

                }
                default: {
                    Model.findById(id).exec(function (err, doc) {
                        _this.listContainer.find().where('_id').in(doc[name]).where('modelId').equals(modelId).exec(function (err, docs) {
                            if(docs.length !== 1) {
                                return cb(Error('no unique container found for model'));
                            }
                            cb(err, docs[0]);
                        });
                    });

                }
            }
        };
        MongooseStorage.prototype.findContainer = function (Model, id, name, containerId, cb) {
            var _this = this;
            Model.findById(id).exec(function (err, doc) {
                _this.listContainer.find().where('_id').equals(containerId).exec(function (err, docs) {
                    if(docs.length !== 1) {
                        return cb(Error('container ' + containerId + ' not found'));
                    }
                    cb(err, docs[0]);
                });
            });
        };
        MongooseStorage.prototype.findEndPoints = function (Model, id, name, cb) {
            var _this = this;
            console.log('ep');
            console.log(id);
            Model.findById(id).exec(function (err, doc) {
                if(err) {
                    return cb(err);
                }
                _this.listContainer.find().where('_id').in(doc[name]).or([
                    {
                        type: '_begin'
                    }, 
                    {
                        type: '_end'
                    }
                ]).exec(function (err, docs) {
                    console.log(docs);
                    if(docs.length < 2) {
                        return cb(Error('could not find end points'));
                    }
                    cb(err, _.find(docs, function (doc) {
                        return doc.type === '_begin';
                    }), _.find(docs, function (doc) {
                        return doc.type === '_end';
                    }));
                });
            });
        };
        MongooseStorage.prototype.removeFromSeq = function (containerId, cb) {
            this.listContainer.update({
                _id: containerId
            }, {
                $set: {
                    type: '_rip'
                }
            }, cb);
        };
        MongooseStorage.prototype.initSequence = function (Model, id, name, cb) {
            var _this = this;
            Model.findById(id).exec(function (err, doc) {
                console.log('---init sequence---');
                console.log(doc);
                console.log(err);
                if(doc[name].length < 2) {
                    console.log('creating first and last');
                    var first = new _this.listContainer({
                        type: '_begin'
                    });
                    first.save(function (err, first) {
                        var last = new _this.listContainer({
                            type: '_end',
                            prev: first._id
                        });
                        last.save(function (err, last) {
                            first.next = last._id;
                            first.save(function (err, first) {
                                Model.update({
                                    _id: id
                                }, {
                                    animals: [
                                        first._id, 
                                        last._id
                                    ]
                                }, function (err) {
                                    cb(null, first, last);
                                });
                            });
                        });
                    });
                } else {
                    _this.findEndPoints(Model, id, name, cb);
                }
            });
        };
        MongooseStorage.prototype.insertContainerBefore = function (Model, id, name, refContainerId, itemKey, opts, cb) {
            var _this = this;
            this.listContainer.findById(refContainerId).exec(function (err, doc) {
                var prevId = doc.prev;
                var newContainer = new _this.listContainer({
                    prev: prevId,
                    next: refContainerId,
                    modelId: itemKey
                });
                newContainer.save(function (err, newContainer) {
                    _this.listContainer.update({
                        _id: prevId
                    }, {
                        next: newContainer._id
                    }, function (err) {
                        _this.listContainer.update({
                            _id: refContainerId
                        }, {
                            prev: newContainer._id
                        }, function (err) {
                            var delta = {
                            };
                            delta[name] = newContainer._id;
                            Model.update({
                                _id: id
                            }, {
                                $push: delta
                            }, function (err) {
                                cb(err);
                            });
                        });
                    });
                });
            });
        };
        MongooseStorage.prototype.all = function (keyPath, query, opts, cb) {
            var _this = this;
            var all = [];
            console.log('--a--l--l--');
            var traverse = function (item) {
                _this.next(keyPath, item, opts, function (err, next) {
                    if(!next) {
                        return cb(null, all);
                    }
                    all.push(next);
                    traverse(next.keyPath);
                });
            };
            traverse(null);
        };
        MongooseStorage.prototype.first = function (keyPath, opts, cb) {
            this.next(keyPath, [
                '##', 
                '_begin'
            ], opts, cb);
        };
        MongooseStorage.prototype.last = function (keyPath, opts, cb) {
            this.prev(keyPath, [
                '##', 
                '_end'
            ], opts, cb);
        };
        MongooseStorage.prototype.next = function (keyPath, refItemKeyPath, opts, cb) {
            var _this = this;
            var refItemKey = makeKey(refItemKeyPath || [
                '##', 
                '_begin'
            ]);
            console.log('next');
            console.log(refItemKey);
            this.getModel(keyPath, function (Model) {
                var id = keyPath[keyPath.length - 2];
                var seqName = _.last(keyPath);
                _this.findContainerOfModel(Model, id, seqName, refItemKey, function (err, container) {
                    console.log('refcont');
                    console.log(container);
                    if(err) {
                        if(refItemKeyPath) {
                            return cb(err);
                        } else {
                            return cb(null, null);
                        }
                    }
                    _this.findContainer(Model, id, seqName, container.next, function (err, container) {
                        console.log('cont');
                        console.log(container);
                        if(container.type === '_rip') {
                            _this.next(keyPath, parseKey(container.modelId), opts, cb);
                        } else {
                            if(container.type === '_end') {
                                cb(null);
                            } else {
                                var kp = parseKey(container.modelId);
                                _this.fetch(kp, function (err, doc) {
                                    console.log('doc');
                                    console.log(doc);
                                    if(err) {
                                        return cb(err);
                                    }
                                    cb(null, {
                                        keyPath: kp,
                                        doc: doc
                                    });
                                });
                            }
                        }
                    });
                });
            }, cb);
        };
        MongooseStorage.prototype.prev = function (keyPath, refItemKeyPath, opts, cb) {
            var _this = this;
            this.getModel(keyPath, function (Model) {
                var id = keyPath[keyPath.length - 2];
                var seqName = _.last(keyPath);
                _this.findContainerOfModel(Model, id, seqName, makeKey(refItemKeyPath), function (err, container) {
                    if(err) {
                        return cb(err);
                    }
                    _this.findContainer(Model, id, seqName, container.prev, function (err, container) {
                        if(container.type === '_rip') {
                            _this.prev(keyPath, parseKey(container.modelId), opts, cb);
                        } else {
                            if(container.type === '_begin') {
                                cb(Error('No previous item found'));
                            } else {
                                var kp = parseKey(container.modelId);
                                _this.fetch(kp, function (err, doc) {
                                    if(err) {
                                        return cb(err);
                                    }
                                    cb(null, {
                                        keyPath: kp,
                                        doc: doc
                                    });
                                });
                            }
                        }
                    });
                });
            }, cb);
        };
        MongooseStorage.prototype.insertBefore = function (keyPath, refItemKeyPath, itemKeyPath, opts, cb) {
            var _this = this;
            if(!refItemKeyPath) {
                refItemKeyPath = [
                    '##', 
                    '_end'
                ];
            }
            if(_.isFunction(opts)) {
                cb = opts;
            }
            console.log('insert before');
            console.log(refItemKeyPath);
            console.log(itemKeyPath);
            this.getModel(keyPath, function (Model) {
                var id = keyPath[keyPath.length - 2];
                var seqName = _.last(keyPath);
                _this.initSequence(Model, id, seqName, function (err, first, last) {
                    var refContainer = _this.findContainerOfModel(Model, id, seqName, makeKey(refItemKeyPath), function (err, refContainer) {
                        console.log('---asd-f-asd-f');
                        console.log(refContainer);
                        if(err) {
                            return cb(err);
                        }
                        _this.insertContainerBefore(Model, id, seqName, refContainer._id, makeKey(itemKeyPath), opts, cb);
                    });
                });
            }, cb);
        };
        MongooseStorage.prototype.set = function (keyPath, itemKeyPath, cb) {
            cb(Error('operation not supported'));
        };
        MongooseStorage.prototype.deleteItem = function (keyPath, itemKeyPath, opts, cb) {
            var _this = this;
            console.log('delitem');
            console.log(itemKeyPath);
            this.getModel(keyPath, function (Model) {
                var id = keyPath[keyPath.length - 2];
                var seqName = _.last(keyPath);
                _this.findContainerOfModel(Model, id, seqName, makeKey(itemKeyPath), function (err, container) {
                    if(!container || container.type === '_rip') {
                        return cb(Error('Tried to delete a non-existent item'));
                    }
                    _this.removeFromSeq(container._id, cb);
                });
            }, cb);
        };
        MongooseStorage.prototype.getModel = function (keyPath, cb, errCb) {
            var last = keyPath.length - 1;
            var index = last - last & 1;
            var collection = keyPath[index];
            if(collection in this.models) {
                cb(this.models[collection], this.models[keyPath[last]]);
            } else {
                errCb(new Error("Model not found"));
            }
        };
        MongooseStorage.prototype.getSequence = function (keyPath, cb) {
            this.getModel(_.initial(keyPath, 2), function (Model) {
                var seqName = _.last(keyPath);
                var id = keyPath[keyPath.length - 2];
                Model.findById(id).select(seqName).exec(function (err, seqDoc) {
                    console.log('-----get sq----');
                    console.log(seqDoc);
                    if(!err) {
                        cb(err, seqDoc, seqDoc[seqName]);
                    } else {
                        cb(err);
                    }
                });
            }, cb);
        };
        return MongooseStorage;
    })();
    Gnd.MongooseStorage = MongooseStorage;    
})(Gnd || (Gnd = {}));
var windowOrGlobal;
if(typeof window === 'undefined') {
    windowOrGlobal = global;
} else {
    windowOrGlobal = window;
}
((function (root, factory) {
    if(typeof exports === 'object') {
        for(var k in factory()) {
            exports[k] = factory()[k];
        }
    } else {
        if(typeof define === 'function' && define.amd) {
            define(factory);
        } else {
            root.returnExports = factory();
        }
    }
})(windowOrGlobal, function () {
    return Gnd;
}));
