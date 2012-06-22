
define(['jquery', 'underscore', 'ginger'], function($,_, ginger){

var route = {};

var parseQuery = function(queryString){
  if(queryString){
    var keyValues = queryString.split('&'),
        i,
        len = keyValues.length;
  
    var obj = {}
  
    for(i=0;i<len;i++){
      var keyValue = keyValues[i].split('=');
      obj[decodeURIComponent(keyValue[0])] = keyValue[1] ? decodeURIComponent(keyValue[1]):'';
    }
    return obj;
  }else{
    return {};
  }
}

//
// Promise (Minimal promise implementation).
//
var Promise = function(){
  this.results = [];  
  this.callbacks = [];
  this.resolved = null;
};
Promise.prototype.then = function(cb){
  if(this.resolved === null){
    this.callbacks.push(cb);
  }else{
    cb(this.resolved);
  }
}
Promise.prototype.resolve = function(){
  this.resolved = arguments;
  this._fireCallbacks(); 
}
Promise.prototype._fireCallbacks = function(){
  var args = this.resolved;
  if(args!=null){
    var len = this.callbacks.length;
    if(len>0){
      for(var i=0;i<len;i++){
        this.callbacks[i](args);
      }
    }
  }
}
var AutoreleasePool = function(){
  this.pool = [];
}
AutoreleasePool.prototype.autorelease = function(){
  var pool = this.pool;
  _.each(arguments, function(obj){
    if(_.isArray(obj)){
      pool.apply(pool, obj);
    }else{
      pool.push(obj);
    }
  });
}
AutoreleasePool.prototype.drain = function(){
  for(var i=0, len=this.pool.length;i<len;i++){
    this.pool[i].release();
  }
  this.pool = [];
}


//
// Node Command wrapper.
// This wrapping allows us to chain asynchronous commands after each other.
//
var wrap = function(fn, args, cb){
  return function(ctx){
    if(_.isFunction(args)){
      cb = args;
      args = undefined;
    }
    var promise = new Promise();
    cb = _.isFunction(cb)?cb:undefined;
    (function(done, args, node){
      ctx.promise.then(function(err){
        // TODO HANDLE ERROR AND PROPAGATE!
        /*if(err){
          done(err);
        }else{*/
          args = args?args:[];
          args.push(function(){
            cb || done();
            cb && cb(done);
            cb && cb.length === 0 && done();
          });
          fn.apply(ctx, args);
        //}
      });
    })(_.bind(promise.resolve,promise), _.clone(args), this);
    ctx.promise = promise;
  }
}

//
// Request
//
var Request = function(url, prevNodes){
  var s = url.split('?'), components, last, i, len;
  
  components = s[0].split('/')
  if(components[0] === '#'){
    this.index = 1;
  }else{
    this.index = 0;
  }
  this.level = 0;

  if(components[last=components.length-1] === ''){
    components.splice(last, 1);
  }
  
  this.nodes = [];
  this.startIndex = 0;
  for (i=0, len=components.length;i<len;i++){
    var prev = prevNodes[i]; 
    if(prev && (prev.component === components[i])){
      this.nodes.push({
        component:components[i], 
        autoreleasePool:prev.autoreleasePool
      });
    }else{
      break;
    }
  }
  this.startIndex = i;
  for (i=this.startIndex, len=components.length;i<len;i++){
    this.nodes.push({component:components[i], autoreleasePool:new AutoreleasePool()});
  }
  
  this.url = url;
  this.query = parseQuery(s[1]);
  this.params = {};
  this.components = components;
  
  this.promise = new Promise();
  this.promise.resolve();
  
  this.nodePromise = new Promise();
  this.nodePromise.resolve();
  
  this.endPromise = new Promise();
}

/**
  use - Define plugins to be used for different tasks.
  
  use(kind, plugin)
  
  kind can be one of several:
    'template'
    
    Template plugin. A template plugin is a function with this signature:
    template({String}, {Object}), where string is the template, and object
    is an object with arguments to pass to the template.
*/
Request.prototype.use = function(kind, plugin){
  switch(kind){
    case 'template':
      this.template = plugin;
    break;
  }
}

/**
  get - Define a GET route.
  
  get([middleware, ...], cb:{Function})
  
  get(component:{String}, selector:{String}, [middleware, ...], cb:{Function})
  
  get(component:{String}, selector:{String}, [middleware, ...], handler:{String}, [args:{Object}])
  
  Handler is a AMD module that returns a function with the signature: function(req).

  Middleware is a function with signature: function(req, next)
  The middlewares can perform any operation it wants, asynchronous or not, and call next 
  when ready. If next can be called with false or an error in order to stop the execution of 
  this route.
*/

function parseGetArguments(args){
  var result = {middlewares:[], selector:'body'}, i = 0, len=args.length;
  
  if(_.isFunction(args[0])){
    result.middlewares = _.initial(args);
    result.cb = _.last(args);
  }else{
    result.component = args[0];
    result.selector = args[1];
    i = 2;
    if(_.isFunction(args[i])){
      while(_.isFunction(args[i])&&(i<len-1)){
        result.middlewares.push(args[i]);
        i++;
      }
    }
    if(i<len){
      if(_.isFunction(args[i])){
        result.cb = args[i];
      }else{
        result.handler = args[i];
      }
      i++;
      (i<len) && (result.args = args[i]);
    }
  }
  return result;
}
function processMiddlewares(req, middlewares, cb){
  ginger.asyncForEach(middlewares, function(fn, cb){
    fn(req, cb);
  },cb);  
}
Request.prototype.get = function(){
  var self = this, 
    a = parseGetArguments(arguments),
    component = a.component, 
    handler = a.handler, 
    selector = a.selector,
    cb = a.cb,
    args = a.args,
    level = self.level;

  if(component){
    if(level != self.index){
      return self;
    }
    
    if(self.index < self.components.length){
      if(component.charAt(0) === ':'){
        self.params[component.replace(':','')] = self.components[self.index];
      } else if(component !== self.components[self.index]){
        return self;
      }
      self.index++;
    }else{
      return self;
    }
  }
  
  var promise = new Promise, prevPromise = self.nodePromise;
  
  self.nodePromise = promise;
  
  prevPromise.then(function(){  
    processMiddlewares(self, a.middlewares, function(err){
      if(!err){
        var autoreleasePool = self.node().autoreleasePool;
      
        self._initNode(selector);
  
        if(cb){
          self.level = level + 1;
          cb.call(self, autoreleasePool);
          promise.resolve();
          if(promise.callbacks.length===0){
            self.endPromise.resolve();
          }
        } else {
          curl([handler], function(f){
            args = args || autoreleasePool;
            self.level = level + 1;
            f && f.call(self, self, args, autoreleasePool);
            promise.resolve();
            if(promise.callbacks.length===0){
              self.endPromise.resolve();
            }
          });
        }
      }
    });
  });

  self.level = level;
  return self;
}

/**
  Promise for last initialized node.
  
  Callback can only be called when the promise has been resolved.

  In exec, we have also to wait until the last node promise has been resolved before we can start
  executing.
*/
Request.prototype.before = function(cb){
  this.node().before =  wrap(function(cb){cb()},cb);
  return this;
}
Request.prototype.after = function(cb){
  this.node().after =  wrap(function(cb){cb()},cb);
  return this;
}
Request.prototype.exit = function(name, speed, cb){
  cb = _.last(arguments);
  speed = _.isFunction(speed)?undefined:speed;
  var node = this.node();
  node.exit =  wrap(this._anim,[node, name, speed], cb);
  return this;
}
Request.prototype.enter = function(name, speed, cb){
  cb = _.last(arguments);
  speed = _.isFunction(speed)?undefined:speed;
  var node = this.node();
  node.enter = wrap(this._anim,[node,name,speed], cb);
  return this;
}
Request.prototype.render = function(templateUrl, css, locals, cb){
  cb = _.last(arguments);
  css = _.isFunction(css)?undefined:css;
  locals = _.isFunction(locals)?undefined:locals;
  this.node().render = wrap(this._render,[templateUrl, css, locals], cb);
  return this;
}
Request.prototype.load = function(urls, cb){
  cb = _.last(arguments);
  urls = _.isFunction(urls)?null:urls;
  
  this.node().load = wrap(this._load,[urls], cb);
  return this;
}
// FIX: Only call hide on the nodes that will been "overwritten" by the new request
// and that not have an exit function, and that no node in prev request that has overwritten the
// node and that have own exit function...
Request.prototype.exec = function(prevs){
  var self = this;
  var start, nodes = self.nodes;
    
  start = self.startIndex;
  
  //
  // Check for selector overwrites (prev route overwrite some DOM element from
  // (the common base).
  //
  for(var i=0,len=start;i<len;i++){
    if(findSel(nodes[i].selector, start, prevs)){
      start = i;
      break;
    }
  }
  
  //
  // "Exit" from all the old nodes. We do this in reversed order so that 
  // deeper nodes are exited before the shallower
  //
  for(var i=prevs.length-1;i>=start;i--){
    var node = prevs[i];
    
    node.$el || (node.select && node.select(self));
    node.exit && node.exit(self);
    node.exit || (node.hide && node.hide(self));
    node.drain && node.drain(self);
  }
  
  //
  // Call all the functions for every node that needs it.
  //
  for(var i=start, len=nodes.length;i<len;i++){
    var node = nodes[i],
        prev = prevs[i];
    
    self.index = i+1;
       
    node.select && node.select(self);
    
    node.hide && node.hide(self);
    
    node.before && node.before(self);
    
    node.load && node.load(self);
    node.render && node.render(self);

    node.enter && node.enter(self);
    node.enter || (node.show && node.show(self));
    
    node.after && node.after(self);
  }
}

Request.prototype.resourceRoute = function(resource){
  var base = this._currentSubPath();
  components = resource.split('/');
  return base+'/'+components[components.length-1].split('.')[0]
}

Request.prototype.isLast = function(){
  return this.index >= this.components.length
}
Request.prototype.nextComponent = function(){
  return this.components[this.index];
}
Request.prototype.redirect = function(url, params){
  var self = this;
  self.promise.then(function(){
    if(params){
      url+='?'+$.param(params);
    }
    route.redirect(url);
  });
}
Request.prototype.node = function(){
  var index = this.index-1;
  index = index < 0? 0:index;
  return this.nodes[index];
}

//
// Private methods
// TODO: Generate error if selector returns empty set or more than one DOM node!
Request.prototype._initNode = function(selector){
  var self = this;
  
  (function(node){
     node.select = wrap(function(cb){
       node.$el = self.$el = $(selector);
       cb();
     });
     node.selector = selector;
   
     node.hide = wrap(function(cb){
       node.$el.hide();
       cb();
     });
   
     node.show = wrap(function(cb){
       node.$el.show();
       cb();
     });
     
     node.drain = wrap(function(cb){
       node.autoreleasePool.drain();
       cb();
     });
 })(self.node());
}

Request.prototype._anim = function(node, name, speed, cb){
  node.$el[name](speed || 'fast', cb);
}

// ( templateUrl, [locals, cb])
Request.prototype._render = function(templateUrl, css, locals, cb){
  var self = this;
  
  if(_.isObject(css)){
    cb = locals;
    locals = css;
    css = undefined;
  }else if(_.isFunction(css)){
    cb = css;
    css = undefined;
    locals = undefined;
  }else if(_.isFunction(locals)){
    cb = locals;
    locals = undefined;
  }
      
  var items = ['text!'+templateUrl];
          
  if(css){
    items.push('css!'+css)
  }
      
  curl(items, function(templ){
    var args = {}
    if(_.isString(locals)){
      args[locals] = self.data;
    }else if(_.isObject(locals)){
      args = locals;
    }else if(_.isObject(self.data)){
      args = self.data;
    }
    var html = self.template ? self.template(templ, args) : templ
    self.$el.html(html);
    waitForImages(self.$el, function(){
      cb && cb();
    });
  });
}

function waitForImages($el, cb) {
  var $imgs = $('img', $el),
        len = $imgs.length,
    counter = 0;

  if(len>0){
    $imgs.load(function(){
      counter++;
      if(counter===len){
        cb();
      }
    });
  }else{
    cb && cb();
  }
}

Request.prototype._load = function(urls, cb){
  var base = this._currentSubPath(),
      self = this;
      
  if(urls === null){
    urls = self.data;
  }
      
  if(!_.isArray(urls)){
    urls = [urls];
  }
  
  var _urls = [];
  for(var i=0, len=urls.length;i<len;i++){
    _urls.push('text!'+urls[i])
  }
  
  curl(_urls, function(){
    var args = arguments;
    var objs = [];
    for(var i=0, len=args.length;i<len;i++){
      objs.push(JSON.parse(arguments[i]))
    }
    objs = objs.length===1?objs[0]:objs;
    self.data = objs;
    cb && cb();
  });
}

//
// Utils
//
var findSel = function(selector, start, nodes){
  for(var i=start,len=nodes.length;i<len;i++){
    if(selector === nodes[i].selector){
      return true;
    }
  }
  return false;
}

Request.prototype._currentSubPath = function(){
  var subPath = '';
  for(var i=0, len=this.index;i<len;i++){
    subPath += this.components[i]+'/';
  }
  if(subPath.length>0){
    subPath = subPath.substr(0, subPath.length-1)
  }
  return subPath;
}

//
// Route
//

route.listen = function (cb) {
  var prevNodes = [];

  var fn = function(){
    if(route.prevUrl !== location.hash){
      var prevUrl = location.hash,
          req = new Request(location.hash, prevNodes);
          
      cb && cb(req);
      
      if(prevUrl == location.hash){
        req.endPromise.then(function(){
          if(req.index !== req.nodes.length){
            if(req.notFound && _.isFunction(req.notFound)){
              req.index = 1;
              req._initNode('body')
              req.notFound.call(req, req);
            }else{
              console.log('Undefined route:'+location.hash);
              return;
            }
          }
  
          req.exec(prevNodes);
          prevNodes = req.nodes;
        
          route.prevUrl = prevUrl;
        });
      }
    }
  }

  if (location.hash === '') {
    if (route.root) {
      location.hash = route.root;
    }
  }else{
    fn();
  }

  if ('onhashchange' in window) {
    window.onhashchange = fn;
  } else {
    route.interval = setInterval(fn, 50);
  }
}

route.stop = function(){
  if(route.interval){
    clearInterval(route.interval);
    route.interval = null;
  }
  if ('onhashchange' in window) {
    window.onhashchange = null;
  }
  route.prevUrl = '';
}

route.redirect = function(url) {
  location.hash = url;
  if ('onhashchange' in window) {
    $(window).trigger('onhashchange');
  }
}

route.prevUrl = null;

return route;
  
});
