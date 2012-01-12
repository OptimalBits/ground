define(['underscore', 'js!jade.js'], function(_){

var jade = require('jade');

var route = {};

var parseQuery = function(keyValues){
  return {}
}

//
// Promise
// (Note: If used wrongly, the same callback can be called multiple times.
// This is because we fire the callbacks when queueing, if the queued promise
// so far already fired, it will fire every time a new promise is enqueued).
var Promise = function(){
  this.results = [];  
  this.callbacks = [];
  this.counter = 0;
  this.accepted = null;
};
Promise.prototype.queue = function(promise){
  var index = this.results.length,
      self = this;
  
  results.push(null);
  
  (function(index){
    promise.then(function(){
      self.counter++;
      self.results[index] = arguments;
      if(self.counter===self.promises.length){
        self.accepted = self.results;
        self._fireCallbacks();
      }
    })
  })(index);
}
Promise.prototype.then = function(cb){
  if(this.accepted === null){
    this.callbacks.push(cb);
  }else{
    cb(this.accepted);
  }
}
Promise.prototype.accept = function(){
  this.accepted = arguments;
  this._fireCallbacks(); 
}
Promise.prototype._fireCallbacks = function(){
  var args = this.accepted;
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
  
    (function(done){
      ctx.promise.then(function(){
        args.push(function(){
          cb && cb(done);
          !cb && done();
        });
        fn.apply(ctx, args);
      });
    })(_.bind(promise.accept, promise));
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
  this.promise.accept();
}

Request.prototype.node = function(){
  var index = this.index-1;
  index = index < 0? 0:index;
  return this.nodes[index];
}

// TODO: Add queries.

//
// Commands
//
Request.prototype.get = function(component, selector, cb){
  var self = this;

  if(_.isString(component)){
    if(component.charAt(0) === ':'){
      self.params[component.replace(':','')] = self.components[self.index];
    } else if(component !== self.components[self.index]){
       return;
    }
    self.index++;
  }else{
    selector = ('body');
    cb = component;
  }
  
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
  })(self.node());
  
  cb && cb.call(self, self);
  
  return self;
}

Request.prototype.custom = function(cb){
  this.node().custom =  wrap(function(cb){cb()},[],cb);
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

Request.prototype.exec = function(prevs){
  var start,
     nodes = this.nodes;
  
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
    
    !node.$el && node.select && node.select(this);
    node.exit && node.exit(this);
    !node.exit && node.hide(this);
  }
  
  //
  // Call all the functions for every node that needs it.
  //
  for(var i=start, len=nodes.length;i<len;i++){
    var node = nodes[i],
        prev = prevs[i];
    
    this.index = i+1;
       
    node.select && node.select(this);
    
  //  prev && prev.exit && prev.exit(this);
    node.hide && node.hide(this);    
    
    node.custom && node.custom(this);
    
    node.load && node.load(this);
    node.render && node.render(this);
    node.enter && node.enter(this); 
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
  this.promise.then(function(){ 
    route.redirect(url);
  });
}

//
// Private methods
//

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
      
  curl(items, function(t){
    var args = {}
    if(locals){
      args[locals] = self.data;
    }
    var fn = jade.compile(t,{locals:args});
    self.$el.load(function(){
      cb && cb();
    });
    self.$el.html(fn(args));
  });
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

      req.exec(prevNodes);
      prevNodes = req.nodes;
        
      route.prevUrl = prevUrl;
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
