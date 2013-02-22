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
