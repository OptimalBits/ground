/**
  Ground Web Framework. Route Management. (c) OptimalBits 2011-2012.
*/
/**
  Hierarchical Routing.
  
  Define routes hierarchically creating views by rendering templates at
  the specified DOM nodes in the hierarchy.
  
*/
define(['jquery', 'underscore', 'ginger'], function($,_, ginger){

/**
  Parses A query string and returns an object with key, value pairs.

*/
var parseQuery = function(queryString){
  if(queryString){
    var keyValues = queryString.split('&'),
        i,
        len = keyValues.length;
  
    var obj = {};
  
    for(i=0;i<len;i++){
      var keyValue = keyValues[i].split('=');
      obj[decodeURIComponent(keyValue[0])] = keyValue[1] ? decodeURIComponent(keyValue[1]):'';
    }
    return obj;
  }else{
    return {};
  }
}

/**
  Pool of objects that will be autoreleased when leaving a route.
*/
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
  this._drained && this.drain();
}
AutoreleasePool.prototype.drain = function(){
  for(var i=0, len=this.pool.length;i<len;i++){
    this.pool[i].release();
  }
  this.pool = [];
  this._drained = true;
}

/**
  A Task factory for route actions.
*/
var wrap = function(fn, args, cb){
  return function(done){
    if(_.isFunction(args)){
      cb = args;
      args = [];
    }
    cb = _.isFunction(cb) ? cb : ginger.noop;
    
    (function(args){
      args = args || [];
      args.push(function(){
        cb(done);
        if(cb.length === 0){
          done();
        }
      });
      fn.apply(null, args);
    })(_.clone(args));
  }
}

//
// Decompose URL into components and query object.
//
var decomposeUrl = function(url){
  var s = url.split('?'), components, len;
  
  components = s[0].split('/');
  len = components.length
  if(_.last(components) === '' && len > 1){
    components.splice(len-1, 1);
  }
  return {components:components, query:parseQuery(s[1])};
}

//
// Request
//
var Request = function(url, prevNodes){
  var self = this, components, i, len;
  
  _.extend(self, decomposeUrl(url));
  components = self.components;
  len = components.length;
  
  _.extend(self, {
    nodes : [],
    index : 0,
    level : 0,
    params : {},
    url : url,
    queue : new ginger.TaskQueue(),
    prevNodes : prevNodes
  });
  
  //
  // Reuse previous autorelease pools and find the starting index for the new route.
  //
  for (i=0; i<len; i++){
    var prev = prevNodes[i];
    if(prev && (prev.component === components[i])){
      self.nodes.push({
        component:components[i],
        autoreleasePool:prev.autoreleasePool
      });
    }else{
      break;
    }
  }
  
  //
  // Create new nodes
  //
  self.startIndex = i;
  for (i=self.startIndex; i<len; i++){
    self.nodes.push({component:components[i], autoreleasePool: new AutoreleasePool()});
  }
  
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

function parseParams(expr, component, params){
  if(expr.charAt(0) === ':'){
    params[expr.replace(':','')] = component;
    return true;
  }
  return false;
}

Request.prototype._consume = function(expr, level){
  var 
    self = this,
    index = self.index;
  
  if(expr){
    if((level != index) || (index >= self.components.length)){
      return false
    }
    var comp = self.components[index];
    if(!parseParams(expr, comp, self.params) && expr !== comp){
      return false;
    }
  }
  self.index++;
  return true;
}

Request.prototype.get = function(){
  var
    self = this, 
    args = parseGetArguments(arguments),
    component = args.component, 
    handler = args.handler, 
    selector = args.selector,
    cb = args.cb,
    level = self.level;

  if(self._wantsRedirect || !self._consume(component, level)){
    return self;
  }
  
  //
  // Create a task for entering this subroute
  //
  self.queue.append(function(done){
    processMiddlewares(self, args.middlewares, function(err){
      var
        node = self.node(),
        pool = node.autoreleasePool,
        index = self.index,
        isLastRoute = index === self.components.length;
        
        if(index == self.startIndex){
          exitNodes(self.queue, self.prevNodes, self.startIndex);
        }
        self._initNode(selector, node);
    
        if(cb){
          self._enterNode(cb, node, index, level, pool, isLastRoute);
          done();
        }else{
          curl([handler], function(cb){
            self._enterNode(cb, node, index, level, args.args, pool, isLastRoute);
            done();
          });
        }
    });
  });
  self.level = level;
  return self;
}

/**
  Callback can only be called when the promise has been resolved.

  In exec, we have also to wait until the last node promise has been resolved 
  before we can start executing.
*/
Request.prototype.before = function(cb){
  var fn = _.bind(function(cb){cb()}, this);
  this.node().before = wrap(fn, cb);
  return this;
}
Request.prototype.after = function(cb){
  var fn = _.bind(function(cb){cb()}, this);
  this.node().after = wrap(fn, cb);
  return this;
}
Request.prototype.exit = function(name, speed, cb){
  cb = _.last(arguments);
  speed = _.isFunction(speed)?undefined:speed;
  var node = this.node();
  var fn = _.bind(this._anim, this);
  node.exit = wrap(fn, [node, name, speed], cb);
  return this;
}
Request.prototype.enter = function(name, speed, cb){
  cb = _.last(arguments);
  speed = _.isFunction(speed)?undefined:speed;
  var node = this.node();
  var fn = _.bind(this._anim, this);
  node.enter = wrap(fn, [node,name,speed], cb);
  return this;
}
Request.prototype.leave = function(cb){
  var fn = _.bind(function(cb){cb()}, this);
  this.node().leave = wrap(fn, cb);
  return this;
}
Request.prototype.render = function(templateUrl, css, locals, cb){
  cb = _.last(arguments);
  css = _.isFunction(css)?undefined:css;
  locals = _.isFunction(locals)?undefined:locals;
  var fn = _.bind(this._render, this);
  this.node().render = wrap(fn, [templateUrl, css, locals], cb);
  return this;
}
Request.prototype.load = function(urls, cb){
  cb = _.last(arguments);
  urls = _.isFunction(urls)?null:urls;
  var fn = _.bind(this._load, this);
  this.node().load = wrap(fn,[urls], cb);
  return this;
}

Request.prototype.notFound = function(fn){
  this.notFoundFn = fn;
}

Request.prototype._enterNode = function(fn, node, index, level, args, pool, isLastRoute){
  var self = this;
  self.level = level + 1;
  if(arguments.length==7){
    // This is just for backwards compatibility... should be: fn.call(self, self, pool, [args]);
    fn && fn.call(self, self, args || pool, pool);
  }else{
    fn && fn.call(self, args);
    isLastRoute = pool;
  }
  
  self._notFound = (index >= self.index) && !isLastRoute;
  if(!self._notFound && index > self.startIndex){
    enqueueNode(self.queue, node);
  }
          
  if(self._notFound || isLastRoute){
    self.queue.end();
  }
}

function exitNodes(queue, nodes, start){
  for(var i=nodes.length-1;i>=start;i--){
    var node = nodes[i];
    node.$el || queue.append(node.select);
    queue.append(node.exit || node.hide, node.drain, node.leave);
  }
}

function enqueueNode(queue, node){
  queue.append(node.select, 
               node.hide, 
               node.before, 
               node.load, 
               node.render, 
               node.enter || node.show, 
               node.after);
}

/**
  Executes the route.
  Exits from the previous route calling the relevant callbacks 
  and calls the callbacks on the needed nodes in the new route.
  (OBSOLETE and not used, left for reference...)
*/
Request.prototype.exec = function(prevs, cb){
  var self = this, start, i, len, node, nodes = self.nodes;
  
  start = self.startIndex;
    
  //
  // Check for selector overwrites (prev route overwrite some DOM element from
  // the common base).
  //
  for(i=0,len=start;i<len;i++){
    if(findSel(nodes[i].selector, start, prevs)){
      start = i;
      break;
    }
  }
  
  //
  // We have a non-cancelable task queue for exiting the previous route.
  //
  var exitQueue = new ginger.TaskQueue();
  
  //
  // "Exit" from all the old nodes. We do this in reversed order so that 
  // deeper nodes are exited before the shallower
  //
  exitNodes(exitQueue, prevs, start);
  
  exitQueue.end().then(function(){

    //
    // Append all the functions for every node that needs it.
    // 
    
    var queue = new ginger.TaskQueue();

    for(i=start, len=nodes.length;i<len;i++){      
      enqueueNode(queue, nodes[i]);      
    }
    queue.end().then(cb);
  })
}
Request.prototype.resourceRoute = function(resource){
  var base = this._currentSubPath();
  components = resource.split('/');
  return base+'/'+components[components.length-1].split('.')[0];
}
Request.prototype.isLast = function(){
  return this.index >= this.components.length;
}
Request.prototype.nextComponent = function(){
  return this.components[this.index];
}
Request.prototype.redirect = function(url, params){
  var self = this;
  url = params ? url+'?'+$.param(params) : url;
  self.queue.then(function(){
    route.redirect(url);
  })
  self._wantsRedirect = true;
}
Request.prototype.node = function(){
  return this.nodes[this.index<=0 ? 0:(this.index-1)];
}

//
// Private methods
// TODO: Generate error if selector returns empty set or more than one DOM node!
Request.prototype._initNode = function(selector, node){
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
 })(node || self.node());
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
  
  cb = cb || ginger.noop;
  
  var items = ['text!'+templateUrl];
  css && items.push('css!'+css);
  
  curl(items, function(templ){
    applyTemplate(templ);
  });
  
  function applyTemplate(templ){
    var args = {};
    if(_.isString(locals)){
      args[locals] = self.data;
    }else if(_.isObject(locals)){
      args = locals;
    }else if(_.isObject(self.data)){
      args = self.data;
    }
    var html = self.template ? self.template(templ, args) : templ;
    self.$el.html(html);
    waitForImages(self.$el, cb);
  }
  
  function waitForImages($el, cb) {
    var $imgs = $('img', $el),
          len = $imgs.length,
      counter = 0;

    cb = _.once(cb);
    var deferTimeout = _.debounce(cb, 200); //sensible?

    if(len>0){
      deferTimeout(); //start timer
      $imgs.load(function(){
        deferTimeout();
        counter++;
        if(counter===len){
          cb();
        }
      });
    }else{
      cb();
    }
  }
}

Request.prototype._load = function(urls, cb){
  var base = this._currentSubPath(),
      self = this,
      i,
      len;
      
  if(urls === null){
    urls = self.data;
  }
      
  if(!_.isArray(urls)){
    urls = [urls];
  }
  
  var _urls = [];
  for(i=0, len=urls.length;i<len;i++){
    _urls.push('text!'+urls[i]);
  }
  
  curl(_urls, function(){
    var args = arguments;
    var objs = [];
    for(i=0, len=args.length;i<len;i++){
      objs.push(JSON.parse(arguments[i]));
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
// Listen to changes in location hash, and routes to the specified routes. 
// route([root='/':String], callback:Function)
//
var route = function (root, cb) {
  if(_.isFunction(root)){
    cb = root;
    root = '/';
  }
  
  var req, fn = function(){
      var url = location.hash.replace(/^#!?/, '');
      if(!req || (req.url !== url)){
        req && req.queue.cancel();
      
        req = new Request(url, req && req.nodes || []);
        
        //
        // Starts the recursive route traversing
        // (TODO: improve this copy paste stuff...
        //
        var index = req.index;
        cb(req);
        if(index == req.index){
          req._notFound = true;
          req.queue.end();
        }
        
        req.queue.then(function(isCancelled){
          if(req._notFound){
            if(req.notFoundFn){
              req.index = 1;
              req._initNode('body');
              req.notFoundFn.call(req, req);
              var queue = new ginger.TaskQueue();
              enqueueNode(queue, req.node())
            }else{
              console.log('Undefined route:'+location.hash);
              return;
            }
          }
        });
      }
    }

  if (location.hash === '') {
    if (root) {
      location.hash = '!' + root;
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
  route.prevReq = null;
}

route.redirect = function(url) {
  // TODO: Investigate if we should wait until current route is totally resolved or not...
  // The issue is that the new route execution may assume there is a certain node tree
  // but if we just cancel the previous execution this tree may not be there...
  location.hash = url;
  if ('onhashchange' in window) {
    $(window).trigger('onhashchange');
  }
}

return route;
  
});
