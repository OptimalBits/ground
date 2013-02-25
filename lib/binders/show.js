/**
Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
MIT Licensed.
*/
/// <reference path="../viewmodel.ts" />
var Gnd;
(function (Gnd) {
    var ShowBinder = (function () {
        function ShowBinder() {
            this.bindings = [];
        }
        ShowBinder.prototype.bind = //
        // Syntax: data-show="[!]keypath"
        // Example: data-show="todo.isCompleted"
        //
        function (el, value, viewModel) {
            var _value = value.replace('!', ''), negate = _value === value ? false : true, keypath = Gnd.makeKeypathArray(_value), model = viewModel.resolveContext(_.initial(keypath));
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
                    setVisibility(visible);
                };
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
    Gnd.ShowBinder = ShowBinder;    
})(Gnd || (Gnd = {}));
