define(['underscore'], function(_){

// TODO: 
// Remove jade dependency, provide a .use kind of api to register external 
// plugins.

var route = {};

var parseQuery = function(queryString){
  if(queryString){
    var keyValues = queryString.split('&'),
        i,
        len = keyValues.length;
  
    var obj = {}
  
    for(i=0;i<len;i++){
      var keyValue = keyValues[i].split('=');
      obj[keyValue[0]] = keyValue[1] ? keyValue[1]:'';
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

//
// Node Command wrapper.
// This wrapping allows us to chain asynchronous commands after each other.
//
var wrap = function(fn, args, cb){
  return function(ctx){
    var promise = new Promise();
  
    (function(done, args ){
      ctx.promise.then(function(){
        args.push(function(){
          cb || done();
          cb && cb(done);
          cb && cb.length === 0 && done();
        });
        fn.apply(ctx, args);
      });
    })(_.bind(promise.resolve,promise), _.clone(args));
    ctx.promise = promise;
  }
}

//
// Request
//
var Request = function(url){
  var s = url.split('?'), components, last;
  
  components = s[0].split('/')
  if(components[0] === '#'){
    this.index = 1;
  }else{
    this.index = 0;
  }
  
  if(components[last=components.length-1] === ''){
    components.splice(last, 1);
  }
  
  this.nodes = [];
  for (var i=0, len=components.length;i<len;i++){
    var node = {component:components[i]};
    this.nodes.push(node);
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
  
  get(cb:{Function})
  
  get(component:{String}, selector:{String}, cb:{Function})
  
  get(component:{String}, selector:{String}, handler:{String})
  
  Handler is a AMD module that returns a function with the signature: function(req).

*/
Request.prototype.get = function(component, selector, cb){
  var self = this;

  if(_.isFunction(component)){
    selector = ('body');
    cb = component;
  }else{
    if(component.charAt(0) === ':'){
      self.params[component.replace(':','')] = self.components[self.index];
    } else if(component !== self.components[self.index]){
       return self;
    }
    self.index++;
  }
  
  self.nodePromise.then(function(){
    self.nodePromise = new Promise();
    ;(function(promise){
      self._initNode(selector);
  
      if(_.isFunction(cb)){
        cb && cb.call(self, self);
        promise.resolve();
        if(promise.callbacks.length===0){
          self.endPromise.resolve();
        }
      } else {
        curl([cb], function(f){
          f && f.call(self, self);
          promise.resolve();
          if(promise.callbacks.length===0){
            self.endPromise.resolve();
          }
        });
      }
    })(self.nodePromise);
  });
  
  return self;
}

/**
  Promise for last initialized node.
  
  Callback can only be called when the promise has been resolved.

  In exec, we have also to wait until the last node promise has been resolved before we can start
  executing.
*/

Request.prototype.before = function(cb){
  this.node().before =  wrap(function(cb){cb()},[],cb);
  return this;
}

Request.prototype.after = function(cb){
  this.node().after =  wrap(function(cb){cb()},[],cb);
  return this;
}

Request.prototype.exit = function(name, speed, cb){
  var node = this.node();
  node.exit =  wrap(this._anim,[node, name, speed], cb);
  return this;
}

Request.prototype.enter = function(name, speed, cb){
  var node = this.node();
  node.enter = wrap(this._anim,[node,name,speed], cb);
  return this;
}

Request.prototype.render = function(templateUrl, css, locals, cb){
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
  
  //
  // Find first index where re-rendering is needed. (common base).
  //
  for(start=0,len=nodes.length;start<len;start++){
    var node = nodes[start],
        prev = prevs[start];
        
    if(!prev || (prev.component !== node.component)){
      break;
    }
  }
  
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
  // "Exit" from all the old nodes
  //
  for(var i=start, len=prevs.length;i<len;i++){
    var node = prevs[i];
    
    node.$el || (node.select && node.select(self));
    node.exit && node.exit(self);
    node.exit || (node.hide && node.hide(self));
  }
  
  //
  // Call all the functions for every node that needs it.
  //
  for(var i=start, len=nodes.length;i<len;i++){
    var node = nodes[i],
        prev = prevs[i];
    
    self.index = i+1;
       
    node.select && node.select(self);
    
    //prev && prev.exit && prev.exit(this);
    node.hide && node.hide(self);
    
    node.before && node.before(self);
    
    node.load && node.load(self);
    node.render && node.render(self);

    node.enter && node.enter(self);
    node.enter || node.show(self);
    
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

Request.prototype.redirect = function(url){
  var self = this;
  self.promise.then(function(){
    self.nodes = [];
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
     }, []);
     node.selector = selector;
   
     node.hide = wrap(function(cb){
       node.$el.hide();
       cb();
     }, []);
   
     node.show = wrap(function(cb){
       node.$el.show();
       cb();
     }, []);
 })(self.node());
}

Request.prototype._anim = function(node, name, speed, cb){
  node.$el[name](speed || 'slow', cb);
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
  }
  if(_.isFunction(locals)){
    cb = locals;
  }
      
  var items = ['text!'+templateUrl];
          
  if(css){
    items.push('css!'+css)
  }
      
  curl(items, function(templ){
    var args = {}
    if(locals){
      args[locals] = self.data;
    }
    var html = self.template ? self.template(templ, {locals:args}) : templ
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
          req = new Request(location.hash);
          
      cb && cb(req);
      
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
    setInterval(fn, 50);
  }
}

route.redirect = function(url) {
  route.prevUrl = location.hash;
  location.hash = url;
  if ('onhashchange' in window) {
    $(window).trigger('onhashchange');
  }
}

route.prevUrl = null;

return route;
  
});
