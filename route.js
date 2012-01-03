define(['showdown', 'underscore', 'js!jade.js'], function(showdown, _){

var counter = 0;

var jade = require('jade');

require.register('showdown.js', function(module, exports, require){
  module.exports = showdown;  
});

var ginger = {};

var route = ginger.route= {};

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
  this.id = counter;
  counter++;
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
  this.callbacks.push(cb);
  this._fireCallbacks();
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
// Request (TODO: Rename to Request).
//
var Request = function(url, prevUrl){
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
  
  this.url = url;
  this.prevUrl = prevUrl;
  this.query = parseQuery(s[1]);
  this.params = {};
  this.components = components;
  this.promise = new Promise();
  this.promise.accept();
}

// TODO: Add queries.
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
  
  self.promise.then(function(){
    self.$el = $(selector);
    self.promise = new Promise();
    self.promise.accept();
    cb && cb.call(self, self);
  });
  
  return self;
}

Request.prototype.enter = function(cb){
  var self = this;
      promise = new Promise();

  (function(done){
    self.promise.then(function(){
      if(self.needRender()){
        cb.call(self, done);
      }else{
        promise.accept();
      }
    });
  })(_.bind(promise.accept, promise));
  
  self.promise = promise;
  return self;
}

// ( templateUrl, [locals, cb])
Request.prototype.render = function(templateUrl, css, locals, cb){
  var self = this;
          
  if(_.isObject(css)){
    cb = locals;
    locals = css;
    css = undefined;
  }else if(_.isFunction(css)){
    cb = css;
    css = undefined;
  }
  if(isFunction(locals)){
    cb = locals;
  }
  
  if(self.needRender()){
    var promise = new Promise(),  
      items = ['text!'+templateUrl];
      
    if(css){
      items.push('css!'+css)
    }
    (function(done){
      self.promise.then(function(){
        curl(items, function(t){
          var args = {}
          if(locals){
            args[locals] = self.data;
          }
          var fn = jade.compile(t,{locals:args});
          self.$el.html(fn(args));
          if(cb){
            cb.call(self, done);
          }else{
            done();
          }
        });
      });
    })(_.bind(promise.accept, promise));
    self.promise = promise;
  }else{
    cb && cb.call(self, function(){}); 
  }
  return self;
}

Request.prototype.load = function(urls, cb){
  var base = this._currentSubPath(),
      self = this,
      promise = new Promise();
  
  if(!_.isArray(urls)){
    urls = [urls];
  }
  
  var _urls = [];
  for(var i=0, len=urls.length;i<len;i++){
    _urls.push('text!'+urls[i])
  }
  
  (function(done){
    self.promise.then(function(){ 
      curl(_urls, function(){
        var args = arguments;
        var objs = [];
        for(var i=0, len=args.length;i<len;i++){
          objs.push(JSON.parse(arguments[i]))
        }
        objs = objs.length===1?objs[0]:objs;
        self.data = objs;
        if(cb){
          cb.call(self, done);
        }else{
          done();  
        }
      });
    });
  })(_.bind(promise.accept, promise));
    
  self.promise = promise;
  
  return self;
}

Request.prototype.resourceRoute = function(resource){
  var base = this._currentSubPath();
  components = resource.split('/');
  return base+'/'+components[components.length-1].split('.')[0]
}

Request.prototype.isLast = function(){
  return this.index >= this.components.length
}

Request.prototype.needRender = function(){
  if(this.prevUrl){
    var subPath = this._currentSubPath()
    
    if(subPath === this.prevUrl.substring(0, subPath.length)){
      if(this.index<this.components.length){
        return false;
      }
    }
  }
  return true;
}

Request.prototype.redirect = function(url){
  this.promise.then(function(){ 
    route.redirect(url);
  });
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

route.listen = function (cb) {
  var fn = function(){
    if(route.prevUrl !== location.hash){
      var prevUrl = location.hash;
      cb && cb(new Request(location.hash, route.prevUrl));
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

return ginger;
  
});
