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
                var self = this, components, i, len, prevLen;
                _.extend(self, decomposeUrl(url));
                components = self.components;
                len = components.length;
                prevLen = prevNodes.length;
                this.url = url;
                this.prevNodes = prevNodes;
                for(i = 0; i < len; i++) {
                    var prev = prevNodes[i], prevNext = prevNodes[i + 1];
                    if(prev && (prev.component === components[i]) && (prevLen < len || prev.selector != prevNext.selector || i < len - 1)) {
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
                this.level = level + 1;
                if(arguments.length == 7) {
                    fn && fn.call(this, pool, args);
                } else {
                    fn && fn.call(this, args);
                    isLastRoute = pool;
                }
                this.isNotFound = (index >= this.index) && !isLastRoute;
                if(!this.isNotFound && index > this.startIndex) {
                    enqueueNode(this.queue, node);
                }
                if(this.isNotFound || isLastRoute) {
                    this.queue.end();
                }
            };
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
            Request.prototype.notFound = function (fn) {
                this.notFoundFn = fn;
            };
            Request.prototype.node = function () {
                return this.nodes[this.index <= 0 ? 0 : (this.index - 1)];
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
