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
