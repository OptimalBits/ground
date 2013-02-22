var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var Gnd;
(function (Gnd) {
    var dataBindingReqExp = /^data-/;
    var ViewModel = (function (_super) {
        __extends(ViewModel, _super);
        function ViewModel(el, context, formatters, binders) {
                _super.call(this);
            this.contexts = [];
            this.boundBinders = [];
            this.formatters = {
            };
            this.formatters = formatters || this.formatters;
            this.binders = {
                bind: TwoWayBinder,
                each: EachBinder,
                show: ShowBinder,
                'class': ClassBinder,
                event: EventBinder
            };
            _.extend(this.binders, binders);
            this.pushContext(context);
            this.boundBinders = this.bindNode(el);
        }
        ViewModel.prototype.destroy = function () {
            this.unbind();
            _super.prototype.destroy.call(this);
        };
        ViewModel.prototype.unbind = function (bindings) {
            _.each(bindings || this.boundBinders, function (binder) {
                binder.unbind();
            });
            !bindings && (this.boundBinders = []);
        };
        ViewModel.prototype.resolveContext = function (keyPath) {
            var root = keyPath[0], context;
            for(var i = this.contexts.length - 1; i >= 0; i--) {
                context = this.contexts[i][root];
                if(context) {
                    return this.resolveKeypath(context, _.rest(keyPath));
                }
            }
        };
        ViewModel.prototype.pushContext = function (context) {
            this.contexts.push(context);
        };
        ViewModel.prototype.popContext = function () {
            this.contexts.pop();
        };
        ViewModel.prototype.bindNode = function (node) {
            var binders = [];
            if(node.attributes) {
                var attributes = node.attributes;
                for(var j = 0; j < attributes.length; j++) {
                    if(dataBindingReqExp.test(attributes[j].name)) {
                        var type = attributes[j].name.replace(dataBindingReqExp, '');
                        var value = attributes[j].value;
                        if(this.binders[type]) {
                            var binder = new this.binders[type]();
                            binder.bind(node, value, this);
                            binders.push(binder);
                        }
                    }
                }
            }
            if(node.hasChildNodes()) {
                var children = _.toArray(node.childNodes);
                for(var i = 0; i < children.length; i++) {
                    if(Gnd.isElement(children[i])) {
                        binders.push.apply(binders, this.bindNode(children[i]));
                    }
                }
            }
            return binders;
        };
        ViewModel.prototype.resolveKeypath = function (obj, keyPath) {
            for(var i = 0; i < keyPath.length; i++) {
                obj = obj[keyPath[i]];
                if(!obj) {
                    return null;
                }
            }
            return obj;
        };
        return ViewModel;
    })(Gnd.Base);
    Gnd.ViewModel = ViewModel;    
    var TwoWayBinder = (function () {
        function TwoWayBinder() {
            this.bindings = [];
            this.attrBindings = {
            };
            this.attrFormatters = {
            };
        }
        TwoWayBinder.re = /((\s*(\w+)\s*\:\s*((\w+\.*)+)\s*(\|\s*(\w+)\s*)?);?)/gi;
        TwoWayBinder.prototype.parse = function (value, formatters) {
            var match, formatter;
            while(match = TwoWayBinder.re.exec(value)) {
                var attr = match[3];
                this.attrBindings[attr] = makeKeypathArray(match[4]);
                formatter = formatters[match[7]];
                if(formatter) {
                    this.attrFormatters[attr] = formatter;
                }
            }
        };
        TwoWayBinder.prototype.createBinding = function (attr, el, viewModel) {
            var attrBinding = this.attrBindings[attr], attrFormatter = this.attrFormatters[attr], obj = viewModel.resolveContext(_.initial(attrBinding));
            if(obj instanceof Gnd.Base) {
                var keypath = _.rest(attrBinding).join('.'), modelListener, elemListener = null;
                var format = function () {
                    return attrFormatter ? attrFormatter(obj.get(keypath)) : obj.get(keypath);
                };
                if(attr === 'text') {
                    setText(el, format());
                    modelListener = function () {
                        setText(el, format());
                    };
                } else {
                    Gnd.setAttr(el, attr, format());
                    modelListener = function () {
                        Gnd.setAttr(el, attr, format());
                    };
                    elemListener = function (value) {
                        obj.set(keypath, Gnd.getAttr(el, attr));
                    };
                }
                obj.retain();
                obj.on(keypath, modelListener);
                Gnd.$(el).on('change', elemListener);
                this.bindings.push([
                    obj, 
                    keypath, 
                    modelListener, 
                    elemListener
                ]);
            } else {
                console.log("Warning: not found a valid model: " + attrBinding[0]);
            }
        };
        TwoWayBinder.prototype.bind = function (el, value, viewModel) {
            this.parse(value, viewModel.formatters);
            this.el = el;
            for(var attr in this.attrBindings) {
                this.createBinding(attr, el, viewModel);
            }
        };
        TwoWayBinder.prototype.unbind = function () {
            var _this = this;
            _.each(this.bindings, function (item) {
                item[0].off(item[1], item[2]);
                item[0].release();
                item[3] && Gnd.$(_this.el).off('change', item[3]);
            });
        };
        return TwoWayBinder;
    })();    
    var EachBinder = (function () {
        function EachBinder() {
            this.items = [];
            this.mappings = {
            };
        }
        EachBinder.prototype.bind = function (el, value, viewModel) {
            var _this = this;
            var arr = value.trim().split(':');
            if(arr.length !== 2) {
                console.log("Warning: syntax error in data-each:" + value);
                return;
            }
            var mappings = this.mappings, nextSibling = el.nextSibling, keyPath = makeKeypathArray(arr[0]), collection = viewModel.resolveContext(keyPath), itemContextName = arr[1].trim();
            var parent = this.parent = el.parentNode;
            this.viewModel = viewModel;
            if(collection instanceof Gnd.Collection) {
                this.collection = collection;
                parent.removeChild(el);
                el.removeAttribute('data-each');
                el.removeAttribute('id');
                var addNode = function (item, nextSibling) {
                    var itemNode = el.cloneNode(true), id = item.id(), modelListener = function (newId) {
if(!(newId in mappings)) {
delete mappings[id];mappings[newId] = itemNode;Gnd.setAttr(itemNode, 'data-item', newId);                        }                    };
                    item.retain();
                    Gnd.setAttr(itemNode, 'data-item', id);
                    mappings[id] = itemNode;
                    if(nextSibling) {
                        parent.insertBefore(itemNode, nextSibling);
                    } else {
                        parent.appendChild(itemNode);
                    }
                    var context = {
                    };
                    context[itemContextName] = item;
                    viewModel.pushContext(context);
                    itemNode['gnd-bindings'] = viewModel.bindNode(itemNode);
                    viewModel.popContext();
                    item.on('id', modelListener);
                    itemNode['gnd-obj'] = item;
                    itemNode['gnd-listener'] = modelListener;
                };
                var addNodes = function () {
                    collection.filtered(function (err, models) {
                        _.each(models, function (item) {
                            addNode(item, nextSibling);
                        });
                    });
                };
                var refresh = function () {
                    _this.removeNodes();
                    addNodes();
                };
                refresh();
                this.addedListener = function (item) {
                    if(collection.isFiltered(item)) {
                        addNode(item, nextSibling);
                    }
                };
                this.removedListener = function (item) {
                    if(mappings[item.id()]) {
                        _this.removeNode(item.id());
                    }
                };
                this.updatedListener = refresh;
                collection.on('added:', this.addedListener).on('removed:', this.removedListener).on('filterFn sorted: updated:', this.updatedListener);
            } else {
                console.log("Warning: not found a valid collection: " + arr[0]);
            }
        };
        EachBinder.prototype.unbind = function () {
            this.collection.off('added:', this.addedListener);
            this.collection.off('removed:', this.removedListener);
            this.collection.off('filterFn sorted: updated:', this.updatedListener);
            this.removeNodes();
        };
        EachBinder.prototype.removeNode = function (id) {
            var node = this.mappings[id], item = node['gnd-obj'];
            this.viewModel.unbind(node['gnd-bindings']);
            item.off('id', node['gnd-listener']);
            item.release();
            this.parent.removeChild(node);
            delete this.mappings[id];
        };
        EachBinder.prototype.removeNodes = function () {
            for(var id in this.mappings) {
                this.removeNode(id);
            }
        };
        return EachBinder;
    })();    
    var ShowBinder = (function () {
        function ShowBinder() {
            this.bindings = [];
        }
        ShowBinder.prototype.bind = function (el, value, viewModel) {
            var _value = value.replace('!', ''), negate = _value === value ? false : true, keypath = makeKeypathArray(_value), model = viewModel.resolveContext(_.initial(keypath));
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
setVisibility(visible);                };
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
    var ClassBinder = (function () {
        function ClassBinder() {
            this.bindings = [];
        }
        ClassBinder.prototype.bind = function (el, value, viewModel) {
            var _this = this;
            var classMappings = {
            }, classSets = value.split(';'), classNames = el['className'] === '' ? [] : el['className'].split(' '), usedClassNameSets = {
            };
            var processMapping = function (keypath) {
                var _keypath = keypath.replace('!', ''), negate = _keypath === keypath ? false : true, keypathArray = makeKeypathArray(_keypath), model = viewModel.resolveContext(_.initial(keypathArray));
                if(model instanceof Gnd.Base) {
                    model.retain();
                    var key = _.rest(keypathArray).join('.'), addClasses = negate ? !model.get(key) : model.get(key), modelListener;
                    if(addClasses) {
                        usedClassNameSets[keypath] = keypath;
                    }
                    modelListener = function (value) {
                        if(negate ? !value : value) {
                            usedClassNameSets[keypath] = keypath;
                        } else {
                            delete usedClassNameSets[keypath];
                        }
                        updateClassNames();
                    };
                    model.on(key, modelListener);
                    _this.bindings.push([
                        model, 
                        key, 
                        modelListener
                    ]);
                } else {
                    console.log("Warning: not found a valid model: " + value);
                }
            };
            function updateClassNames() {
                var newClassNames = classNames;
                for(var key in usedClassNameSets) {
                    newClassNames = _.union(newClassNames, classMappings[key]);
                }
                el['className'] = newClassNames.join(' ');
            }
            for(var i = 0; i < classSets.length; i++) {
                var keyVal = classSets[i].split(':');
                if(keyVal.length === 2) {
                    var classes = keyVal[0].trim().split(' '), keypath = keyVal[1].trim();
                    classMappings[keypath] = [];
                    for(var j = 0; j < classes.length; j++) {
                        classMappings[keypath].push(classes[j].trim());
                    }
                    for(var keypath in classMappings) {
                        processMapping(keypath);
                    }
                    updateClassNames();
                } else {
                    console.log("Warning: Syntax error in " + classSets[i]);
                }
            }
        };
        ClassBinder.prototype.unbind = function () {
            _.each(this.bindings, function (item) {
                item[0].off(item[1], item[2]);
                item[0].release();
            });
        };
        return ClassBinder;
    })();    
    var EventBinder = (function () {
        function EventBinder() {
            this.bindings = [];
        }
        EventBinder.re = /((\s*(\w+)\s*\:\s*((\w+\.*)+)\s*);?)/gi;
        EventBinder.prototype.parse = function (value) {
            var eventBindings = {
            }, match;
            while(match = TwoWayBinder.re.exec(value)) {
                eventBindings[match[3]] = makeKeypathArray(match[4]);
            }
            return eventBindings;
        };
        EventBinder.prototype.bind = function (el, value, viewModel) {
            var _this = this;
            var eventBindings = this.parse(value);
            this.el = el;
            var addEvent = function (eventName) {
                var keypath = eventBindings[eventName], obj = viewModel.resolveContext(_.initial(keypath));
                if(obj instanceof Gnd.Base) {
                    var eventKeypath = _.rest(keypath).join('.'), handler = obj.get(eventKeypath);
                    obj.retain();
                    if(_.isFunction(handler)) {
                        var elementListener = function (evt) {
                            handler.call(obj, el, evt);
                        };
                        Gnd.$(el).on(eventName, elementListener);
                        _this.bindings.push([
                            obj, 
                            eventName, 
                            elementListener
                        ]);
                    } else {
                        console.log("Warning: the given handler is not a function: " + keypath);
                    }
                } else {
                    console.log("Warning: not found an object instance of Gnd.Base: " + keypath[0]);
                }
            };
            for(var eventName in eventBindings) {
                addEvent(eventName);
            }
        };
        EventBinder.prototype.unbind = function () {
            var _this = this;
            _.each(this.bindings, function (item) {
                item[0].release();
                Gnd.$(_this.el).off(item[1], item[2]);
            });
        };
        return EventBinder;
    })();    
    if(!String.prototype.trim) {
        String.prototype.trim = Gnd.Util.trim;
    }
    function setText(el, value) {
        if(Gnd.isElement(value)) {
            el.parentNode.replaceChild(value, el);
        } else {
            Gnd.$(el).html(value);
        }
    }
    function makeKeypathArray(keypath) {
        var arr = keypath.trim().split('.');
        for(var i = 0; i < arr.length; i++) {
            arr[i] = arr[i].trim();
        }
        return arr;
    }
})(Gnd || (Gnd = {}));
