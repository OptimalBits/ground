var Gnd;
(function (Gnd) {
                function $(selectorOrElement, context) {
        var context = context || document, query = new Query(), el, push = function (elements) {
for(i = 0; i < elements.length; i++) {
                query[i] = elements[i];
            }
            query.length = elements.length;
        };
        if(_.isString(selectorOrElement)) {
            var selector = selectorOrElement;
            switch(selector[0]) {
                case '#': {
                    var id = selector.slice(1);
                    el = context.getElementById(id);
                    if(el && el.parentNode) {
                        if(el.id === id) {
                            push([
                                el
                            ]);
                        }
                    }
                    break;

                }
                case '.': {
                    var className = selector.slice(1);
                    push(context.getElementsByClassName(className));
                    break;

                }
                case '<': {
                    push([
                        makeElement(selector)
                    ]);
                    break;

                }
                default: {
                    push(context.getElementsByTagName(selector));

                }
            }
        } else {
            push([
                selectorOrElement
            ]);
        }
        return query;
    }
    Gnd.$ = $;
    var Query = (function () {
        function Query() { }
        Query.prototype.on = function (eventNames, handler) {
            var _this = this;
            _.each(eventNames.split(' '), function (eventName) {
                _.each(_this, function (el) {
                    if(el.addEventListener) {
                        el.addEventListener(eventName, handler);
                    } else {
                        if(el['attachEvent']) {
                            el['attachEvent']("on" + eventName, handler);
                        }
                    }
                });
            });
            return this;
        };
        Query.prototype.off = function (eventNames, handler) {
            var _this = this;
            _.each(eventNames.split(' '), function (eventName) {
                _.each(_this, function (el) {
                    if(el.removeEventListener) {
                        el.removeEventListener(eventName, handler);
                    } else {
                        if(el['detachEvent']) {
                            el['detachEvent']("on" + eventName, handler);
                        }
                    }
                });
            });
            return this;
        };
        Query.prototype.trigger = function (eventNames) {
            var _this = this;
            _.each(eventNames.split(' '), function (eventName) {
                _.each(_this, function (element) {
                    if(document.createEventObject) {
                        var evt = document.createEventObject();
                        element.fireEvent('on' + eventName, evt);
                    } else {
                        var msEvent = document.createEvent("HTMLEvents");
                        msEvent.initEvent(eventName, true, true);
                        !element.dispatchEvent(msEvent);
                    }
                });
            });
            return this;
        };
        Query.prototype.attr = function (attr, value) {
            if(value) {
                _.each(this, function (el) {
                    setAttr(el, attr, value);
                });
                return this;
            } else {
                return getAttr(this[0], attr);
            }
        };
        Query.prototype.css = function (styles) {
            _.each(this, function (el) {
                _.extend(el.style, styles);
            });
        };
        Query.prototype.show = function () {
            _.each(this, function (el) {
                show(el);
            });
            return this;
        };
        Query.prototype.hide = function () {
            _.each(this, function (el) {
                hide(el);
            });
            return this;
        };
        Query.prototype.text = function (html) {
            var el = this[0];
            if(el.textContent) {
                if(!html) {
                    return el.textContent;
                }
                _.each(this, function (el) {
                    el.textContent = html;
                });
            } else {
                if(!html) {
                    return el.innerText;
                }
                _.each(this, function (el) {
                    el.innerText = html;
                });
            }
        };
        Query.prototype.html = function (html) {
            if(_.isUndefined(html)) {
                return this[0].innerHTML;
            }
            _.each(this, function (el) {
                el.innerHTML = html;
            });
        };
        return Query;
    })();
    Gnd.Query = Query;    
    function isElement(object) {
        return object && object.nodeType === Node.ELEMENT_NODE;
    }
    Gnd.isElement = isElement;
    function makeElement(html) {
        var child, container = document.createElement("div"), fragment = document.createDocumentFragment();
        container.innerHTML = html;
        while(child = container.firstChild) {
            fragment.appendChild(child);
        }
        return fragment;
    }
    Gnd.makeElement = makeElement;
    function setAttr(el, attr, value) {
        if(Object.prototype.hasOwnProperty.call(el, attr)) {
            el[attr] = value;
        }
        if(value) {
            el.setAttribute(attr, value);
        } else {
            el.removeAttribute(attr);
        }
    }
    Gnd.setAttr = setAttr;
    function getAttr(el, attr) {
        if(Object.prototype.hasOwnProperty.call(el, attr)) {
            return el[attr];
        } else {
            var val = el.getAttribute(attr);
            switch(val) {
                case 'true': {
                    return true;

                }
                case null:
                case 'false': {
                    return false;

                }
                default: {
                    return val;

                }
            }
        }
    }
    Gnd.getAttr = getAttr;
    function show(el) {
        el['style'].display = getAttr(el, 'data-display') || 'block';
    }
    Gnd.show = show;
    function hide(el) {
        var oldDisplay = el['style'].display;
        (oldDisplay != 'none') && setAttr(el, 'data-display', oldDisplay);
        el['style'].display = 'none';
    }
    Gnd.hide = hide;
    function serialize(obj) {
        var str = [];
        for(var p in obj) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
        }
        return str.join("&");
    }
    Gnd.serialize = serialize;
    var Gnd;
    (function (Gnd) {
        (function (Ajax) {
            function get(url, obj, cb) {
                base('GET', url, obj, cb);
            }
            Ajax.get = get;
            function put(url, obj, cb) {
                base('PUT', url, obj, cb);
            }
            Ajax.put = put;
            function post(url, obj, cb) {
                base('POST', url, obj, cb);
            }
            Ajax.post = post;
            function del(url, obj, cb) {
                base('DELETE', url, obj, cb);
            }
            Ajax.del = del;
            function getXhr() {
                for(var i = 0; i < 4; i++) {
                    try  {
                        return i ? new ActiveXObject([
                            , 
                            "Msxml2", 
                            "Msxml3", 
                            "Microsoft"
                        ][i] + ".XMLHTTP") : new XMLHttpRequest();
                    } catch (e) {
                    }
                }
            }
            function base(method, url, obj, cb) {
                var xhr = getXhr();
                xhr.onreadystatechange = function () {
                    if(xhr.readyState === 4) {
                        xhr.onreadystatechange = null;
                        if(xhr.status >= 200 && xhr.status < 300) {
                            var res;
                            try  {
                                res = JSON.parse(xhr.responseText || {
                                });
                            } catch (e) {
                            }
                            ; ;
                            cb(null, res);
                        } else {
                            cb(new Error("Ajax Error: " + xhr.responseText));
                        }
                    } else {
                    }
                };
                xhr.open(method, url);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(obj));
            }
        })(Gnd.Ajax || (Gnd.Ajax = {}));
        var Ajax = Gnd.Ajax;
    })(Gnd || (Gnd = {}));
})(Gnd || (Gnd = {}));
