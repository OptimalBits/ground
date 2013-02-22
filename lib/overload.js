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
