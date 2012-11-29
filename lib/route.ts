/**
  Ground Web Framework. Route Management. (c) OptimalBits 2011-2012.
*/
/**
  Hierarchical Routing.
  
  Define routes hierarchically creating views by rendering templates at
  the specified DOM nodes in the hierarchy.
  
*/
/// <reference path="../third/underscore.browser.d.ts" />
/// <reference path="../third/jquery.d.ts" />

declare var curl;

import Util = module('./util');
import TM = module('./task');
import Base = module('./base');
import Overload = module('./overload');

interface Node {
  $el: JQuery;
  selector: JQuery;
  select: TM.Task;
  enter: TM.Task;
  hide: TM.Task;
  show: TM.Task;
  drain: TM.Task;
  before: TM.Task;
  after: TM.Task;
  render: TM.Task;
  load: TM.Task;
  autoreleasePool: AutoreleasePool;
}

//
// Route
// Listen to changes in location hash, and routes to the specified routes. 
// route([root='/':String], callback:Function)
//

interface Route {
  listen: (root: String, cb: ()=>void) => void;
};

var interval;

export function listen(root, cb) {
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
          req.isNotFound = true;
          req.queue.end();
        }
        
        req.queue.wait(function(isCancelled){
          if(req.isNotFound){
            if(req.notFoundFn){
              req.index = 1;
              req.initNode('body');
              req.notFoundFn.call(req, req);
              var queue = new TM.TaskQueue();
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
    interval = setInterval(fn, 50);
  }
}

export function stop(){
  if(interval){
    clearInterval(interval);
    interval = null;
  }
  if ('onhashchange' in window) {
    window.onhashchange = null;
  }
}

export function redirect(url) {
  // TODO: Investigate if we should wait until current route is totally resolved or not...
  // The issue is that the new route execution may assume there is a certain node tree
  // but if we just cancel the previous execution this tree may not be there...
  location.hash = url;
  if ('onhashchange' in window) {
    $(window).trigger('onhashchange');
  }
}



/**
  Parses A query string and returns an object with key, value pairs.

*/
var parseQuery = function(queryString : string){
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
  Parses parameters in the get string.
*/
function parseParams(expr, component, params){
  if(expr.charAt(0) === ':'){
    params[expr.replace(':','')] = component;
    return true;
  }
  return false;
}

class AutoreleasePool {
  private drained : bool = false;
  public pool : Base.Base[] = [];
  
  public autorelease(...objs:Base.Base[]) : void;  
  public autorelease(objs:Base.Base[]) : void;
  
  public autorelease(){
    var pool = this.pool;
    _.each(arguments, function(obj){
      if(_.isArray(obj)){
        pool.push.apply(pool, obj);
      }else{
        pool.push(obj);
      }
    });
    this.drained && this.drain();
  }
  
  public drain(){
    for(var i=0, len=this.pool.length;i<len;i++){
      this.pool[i].release();
    }
    this.pool = [];
    this.drained = true;
  }
}

/**
  A Task factory for route actions.
*/
var wrap = Overload.overload({
  'Function Array Function': function(fn, args, cb) {
    return function(done){
      (function(args){
        args.push(function(){
          cb(done);
          if(cb.length === 0){
            done();
          }
        });
        fn.apply(null, args);
      })(_.clone(args));
    }
  },
  'Function Function': function(fn, cb){
    return wrap(fn, [], cb);
  },
  'Function': function(fn){
    return wrap(fn, [], Util.noop);
  }
})

/*
function wrap(fn: (done: ()=>void)=>void, cb?: (done?: TM.TaskCallback)=>void): TM.Task;
function wrap(fn: (done: ()=>void)=>void, args?: any[], cb?: (done?: TM.TaskCallback)=>void): TM.Task {
  if(_.isFunction(args)){
    cb = <(done?: TM.TaskCallback)=>void> args;
    args = [];
  }
  cb = _.isFunction(cb) ? cb : Util.noop;
  
  return function(done?: TM.TaskCallback): void{    
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
*/

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

function parseGetArguments(args){
  var result = {
    middlewares:[], 
    selector:'body',
    cb: undefined,
    component: undefined,
    handler: undefined,
    args: undefined
  }, i = 0, len=args.length;
  
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
  Util.asyncForEach(middlewares, function(fn, cb){
    fn(req, cb);
  },cb);
}

function exitNodes(queue, nodes, start){
  for(var i=nodes.length-1;i>=start;i--){
    var node = nodes[i];
    node.$el || queue.append(node.select);
    queue.append(node.exit || node.hide, node.drain, node.leave);
  }
}

function enqueueNode(queue: TM.TaskQueue, node: Node): void {
  queue.append(node.select, 
               node.hide, 
               node.before, 
               node.load, 
               node.render, 
               node.enter || node.show, 
               node.after);
}

class Request {
  
  private wantsRedirect: bool;
  private $el: JQuery; // This may be obsolete...
  private notFoundFn;
  private isNotFound: bool;
  private template: (tmpl: string, args:{}) => void;
  
  public data: any[];
  public url: string;
  public nodes: any[] = [];
  public index: number = 0;
  public level: number = 0;
  public params: {} = {};
  public queue: TM.TaskQueue = new TM.TaskQueue();
  public components: string[];
  public startIndex: number;
  public prevNodes: any[];

  constructor(url:string, prevNodes:any[]){
    var self = this, components, i, len;
  
    _.extend(self, decomposeUrl(url));
    
    components = self.components;
    len = components.length;
    
    this.url = url;
    this.prevNodes = prevNodes;
    
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
  
  private currentSubPath(){
    var subPath = '';
    for(var i=0, len=this.index;i<len;i++){
      subPath += this.components[i]+'/';
    }
    if(subPath.length>0){
      subPath = subPath.substr(0, subPath.length-1)
    }
    return subPath;
  }
  
  private consume(expr, level) : bool {
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
  
  // TODO: Generate error if selector returns empty set or more than one DOM node!
  private initNode(selector, node : Node){
    var self = this;
  
    (function(node: Node){
      node.select = wrap(function(done):void{
        node.$el = self.$el = $(selector);
        done();
      });
      node.selector = selector;
   
      node.hide = wrap(function(done):void{
        node.$el.hide();
        done();
      });
   
      node.show = wrap(function(done):void{
        node.$el.show();
        done();
      });
     
      node.drain = wrap(function(cb){
        node.autoreleasePool.drain();
        cb();
      });
    })(node || self.node());
  }
  
  private enterNode(fn, node, index, level, args, pool, isLastRoute){
    var self = this;
    self.level = level + 1;
    if(arguments.length==7){
      fn && fn.call(self, pool, args);
    }else{
      fn && fn.call(self, args);
      isLastRoute = pool;
    }
  
    self.isNotFound = (index >= self.index) && !isLastRoute;
    if(!self.isNotFound && index > self.startIndex){
      enqueueNode(self.queue, node);
    }
          
    if(self.isNotFound || isLastRoute){
      self.queue.end();
    }
  }
  
  private notFound(fn){
    this.notFoundFn = fn;
  }
  
  /**
    use - Define plugins to be used for different tasks.
  
    use(kind, plugin)
  
    kind can be one of several:
      'template'    
  */
  public use(kind, plugin: (tmpl: string, args:{}) => void){
    switch(kind){
      case 'template':
        this.template = plugin;
      break;
    }
  }
  
  public node(){
    return this.nodes[this.index<=0 ? 0:(this.index-1)];
  }
  
  public get() : Request {
    var
      self = this, 
      args = parseGetArguments(arguments),
      component = args.component,
      handler = args.handler, 
      selector = args.selector,
      cb = args.cb,
      level = self.level;

    if(self.wantsRedirect || !self.consume(component, level)){
      return self;
    }
  
    //
    // Create a task for entering this subroute
    //
    var task = function(done?: TM.TaskCallback) : void {
      processMiddlewares(self, args.middlewares, function(err){
        var
          node = self.node(),
          pool = node.autoreleasePool,
          index = self.index,
          isLastRoute = index === self.components.length;
        
          if(index == self.startIndex){
            exitNodes(self.queue, self.prevNodes, self.startIndex);
          }
          self.initNode(selector, node);
    
          if(cb){
            self.enterNode(cb, node, index, level, {}, pool, isLastRoute);
            done();
          }else{
            curl([handler], function(cb){
              self.enterNode(cb, node, index, level, args.args, pool, isLastRoute);
              done();
            });
          }
      })
    };
    
    self.queue.append(task);
    
    self.level = level;
    return self;
  }
  
  public isLast(){
    return this.index >= this.components.length;
  }

  public nextComponent(){
    return this.components[this.index];
  }

  public redirect(url, params){
    url = params ? url+'?'+$.param(params) : url;
    this.queue.wait(function(){
      redirect(url);
    })
    this.wantsRedirect = true;
  }
  
  private anim(node, name, speed, cb){
    node.$el[name](speed || 'fast', cb);
  }
  
  public before(cb): Request {
    // Is this bind really needed?
    var fn = _.bind(function(cb){cb()}, this);
    this.node().before = wrap(fn, cb);
    return this;
  }
  
  public after(cb): Request {
    // Is this bind really needed?
    var fn = _.bind(function(cb){cb()}, this);
    this.node().after = wrap(fn, cb);
    return this;
  }
  
  public exit(name, speed?, cb?): Request {
    cb = _.isFunction(speed)? speed : cb;
    speed = _.isFunction(speed)? undefined : speed;
    var node = this.node();
    var fn = _.bind(this.anim, this);
    node.exit = wrap(fn, [node, name, speed], cb);
    return this;
  }
  
  public enter(name, speed?, cb?): Request {
    cb = _.isFunction(speed)? speed : cb;
    speed = _.isFunction(speed)? undefined : speed;
    var node = this.node();
    var fn = _.bind(this.anim, this);
    node.enter = wrap(fn, [node,name,speed], cb);
    return this;
  }
  
  public leave(cb): Request {
    var fn = _.bind(function(cb){cb()}, this);
    this.node().leave = wrap(fn, cb);
    return this;
  }
  
  public render(templateUrl: string, css?: string, locals?: {}, cb?: (err?: Error)=>void): Request {
    return Overload.overload({
      "String String Object Function": function(templateUrl, css, locals, cb){
        var fn = _.bind(this.render, this);
        this.node().render = wrap(fn, [templateUrl, css, locals], cb);
        return this;
      },
      "String String Function": function(templateUrl, css, cb){
        return this.render(templateUrl, css, undefined, cb);
      },
      "String Object Function": function(templateUrl, locals, cb){
        return this.render(templateUrl, undefined, locals, cb);
      },
      "String Function": function(templateUrl, cb){
        return this.render(templateUrl, undefined, undefined, cb);
      },
      "String Function": function(templateUrl){
        return this.render(templateUrl, Util.noop);
      },
    })(arguments)
  }

  public load(urls?, cb?): Request {
    var fn = _.bind(this._load, this);
    this.node().load = wrap(fn,[urls], cb);
    return this;
  }
  
  // ( templateUrl, [locals, cb])
  private _render(templateUrl, css, locals, cb){
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
  
    cb = cb || Util.noop;
  
    var items = ['text!'+templateUrl];
    css && items.push('css!'+css);
  
    curl(items, function(templ){
      applyTemplate(templ);
    });
  
    function applyTemplate(templ){
      var args;
      if(_.isString(locals)){
        args[locals] = self.data;
      }else if(_.isObject(locals)){
        args = locals;
      }else if(_.isObject(self.data)){
        args = self.data;
      }else{
        args = {};
      }
      var html = self.template ? self.template(templ, args) : templ;
      self.$el.html(html);
      waitForImages(self.$el, cb);
    }
  
    function waitForImages($el, cb) {
      var $imgs = $('img', $el),
            len = $imgs.length,
        counter = 0;

      if(len>0){
        $imgs.one('load', function(){
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
  
  private _load(urls, cb){
    var base = this.currentSubPath(),
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
}

Request.prototype.render = 

Request.prototype.load = Overload.overload({
  "String String Object Function": Request.prototype.load,
  
  "Function": function(cb){
    return this.load([], cb);
  },
  "": function(){
    return this.load([], Util.noop);
  }
});

/*
Request.prototype.resourceRoute = function(resource){
  var base = this._currentSubPath();
  var components = resource.split('/');
  return base+'/'+components[components.length-1].split('.')[0];
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
*/
