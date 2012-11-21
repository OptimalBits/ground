var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
}
define(["require", "exports", "./event", "./undo"], function(require, exports, __Event__, __Undo__) {
    var Event = __Event__;

    var Undo = __Undo__;

    var Base = (function (_super) {
        __extends(Base, _super);
        function Base() {
                _super.call(this);
            this.refCounter = 1;
            this.bindings = {
            };
            this.undoMgr = new Undo.Manager();
            if(!(this instanceof Base)) {
                return new Base();
            }
        }
        Base.prototype._set = function (keypath, val, options) {
            var path = keypath.split('.');
            var obj;
            var len = path.length - 1;
            var key = path[len];

            for(var i = 0; i < len; i++) {
                var t = this[path[i]];
                if(!t) {
                    obj = this[path[i]] = {
                    };
                } else {
                    obj = t;
                }
            }
            if((_.isEqual(obj[key], val) == false) || (options && options.force)) {
                var oldval = obj[key];
                var val = this.willChange ? this.willChange(key, val) : val;

                obj[key] = val;
                this.emit(keypath, val, oldval, options);
                return true;
            } else {
                return false;
            }
        };
        Base.prototype.set = function (keyOrObj, val, options) {
            var changed = false;
            var obj;
            var self = this;

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
            var path = key.split('.');
            var result;

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
            this.bindings[key] = [
                dstListener, 
                object, 
                dstKey, 
                srcListener
            ];
            this.set(key, object[dstKey]);
            return this;
        };
        Base.prototype.unbind = function (key) {
            var bindings = this.bindings;
            if((bindings != null) && (bindings[key])) {
                var binding = bindings[key];
                this.removeListener(key, binding[0]);
                binding[1].removeListener(binding[2], binding[3]);
                delete bindings[key];
            }
        };
        Base.prototype.format = function (property, fn) {
            if(arguments.length == 1) {
                if(_.isObject(property)) {
                    if(!this.formatters) {
                        this.formatters = {
                        };
                    }
                    _.extend(this.formatters, property);
                } else {
                    if((this.formatters) && (property in this.formatters)) {
                        var val = this.get(property);
                        if(_.isFunction(val)) {
                            val = val.call(this);
                        }
                        return this.formatters[property].call(this, val);
                    } else {
                        return this.get(property);
                    }
                }
            } else {
                if(!this.formatters) {
                    this.formatters = {
                    };
                }
                this.formatters[property] = fn;
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
        Base.prototype.endUndoSet = function (key, fn) {
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
            this.endUndoSet(key, fn);
        };
        Base.prototype.destroy = function () {
            this.off();
        };
        Base.prototype.retain = function () {
            if(this.destroyed) {
                throw new Error("Cannot retain destroyed object");
            }
            this.refCounter++;
            return this;
        };
        Base.prototype.release = function () {
            this.refCounter--;
            if(this.refCounter === 0) {
                this.emit('destroy:');
                this.destroy();
                this.destroyed = true;
                this.destroyedTrace = "";
            } else {
                if(this.refCounter < 0) {
                    var msg;
                    if(this.destroyed) {
                        msg = "Object has already been released";
                        if(this.destroyedTrace) {
                            msg += '\n' + this.destroyedTrace;
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
        Base.prototype.isDestroyed = function () {
            return this.refCounter === 0;
        };
        return Base;
    })(Event.Emitter);
    exports.Base = Base;    
})

