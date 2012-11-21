var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
}
define(["require", "exports", './event'], function(require, exports, __Event__) {
    var Event = __Event__;

    var Manager = (function (_super) {
        __extends(Manager, _super);
        function Manager() {
            _super.apply(this, arguments);

            this.undones = [];
            this.actions = [];
            this.undoFn = null;
            this.group = null;
        }
        Manager.prototype.beginUndo = function (undoFn, name) {
            this.undoFn = undoFn;
            this.name = name;
        };
        Manager.prototype.endUndo = function (doFn, fn) {
            this.action(doFn, this.undoFn, fn, this.name);
            this.undoFn = null;
        };
        Manager.prototype.action = function (doFn, undoFn, fn, name) {
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
        Manager.prototype.beginGroup = function (name) {
            this.group = {
                name: name,
                actions: []
            };
        };
        Manager.prototype.endGroup = function () {
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
        Manager.prototype.canUndo = function () {
            return this.actions.length > 0;
        };
        Manager.prototype.canRedo = function () {
            return this.undones.length > 0;
        };
        Manager.prototype.undo = function () {
            var action = this.actions.pop();
            if(action) {
                action.undo(action.fn);
                var name = action.name || '';
                this.emit('undo', name);
                this.undones.push(action);
            }
        };
        Manager.prototype.redo = function () {
            var action = this.undones.pop();
            if(action) {
                action['do'](action.fn);
                var name = action.name || '';
                this.emit('redo', name);
                this.actions.push(action);
            }
        };
        return Manager;
    })(Event.Emitter);
    exports.Manager = Manager;    
})

