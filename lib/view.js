var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
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
