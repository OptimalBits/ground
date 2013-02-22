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
