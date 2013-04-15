/**
  Ground Web Framework. Route Management. (c) OptimalBits 2011-2013.
*/
/**
  Hierarchical Routing.
  
  Define routes hierarchically creating views by rendering templates at
  the specified DOM nodes in the hierarchy.
*/

/// <reference path="base.ts" />
/// <reference path="task.ts" />
/// <reference path="overload.ts" />
/// <reference path="dom.ts" />
/// <reference path="using.ts" />

/// <reference path="../third/underscore.browser.d.ts" />

declare var curl;

module Gnd.Route {

interface Node
{
  el: Element;
  selector: string;
  select: Task;
  enter: Task;
  hide: Task;
  show: Task;
  drain: Task;
  before: Task;
  after: Task;
  render: Task;
  load: Task;
  autoreleasePool: AutoreleasePool;
}

interface Middleware 
{
  (req: Request, done: (err?:Error)=>{});
}

//
// Route
// Listen to changes in location hash, and routes to the specified routes. 
// route([root='/':String], callback:Function)
//

interface Route {
  listen: (root: String, cb: ()=>void) => void;
};

var interval, 
    req, 
    routeHandler, 
    basepath;
    
export function listen(root, cb) {
  if(_.isFunction(root)){
    cb = root;
    root = '';
  }
  
  routeHandler = cb;
  basepath = location['origin'] + '/' + Util.trim(root);
  
  // Listen to all link clicks.
  $("document").on('click', handleClickUrl);
  
  if(using.historyApi){
    window.addEventListener("popstate", handlePopState);
  }
  var url = getRelativeUrl(location.href);
  executeRoute(url, cb);
}

function findLink(el: HTMLElement): any{
  while(el && el !== document.body){
     if(el.tagName.toLowerCase() === "a"){
       return el;
     }
     el = el.parentElement;
  }
}

function handleClickUrl(evt){
  var link = findLink(evt.target || evt.srcElement);
  if(link){
    var url = link.href;
    
    // check if url is within the basepath
    if(url = getRelativeUrl(url)){
      evt.preventDefault();
      redirect(url);
    }
  }
}

function getRelativeUrl(url: string){
  if(url.indexOf(basepath) === 0){
    url = url.substring(basepath.length).replace(/^#!?/, '');
    return url;
  }
}

function handlePopState(evt){
  routeHandler && executeRoute(location.pathname, routeHandler);
}

function executeRoute(url, routeHandler){
  if(!req || (req.url !== url)){
    req && req.queue.cancel();
  
    req = new Request(url, req && req.nodes || []);
    
    //
    // Starts the recursive route traversing
    //
    var index = req.index;
    
    routeHandler(req);
    
    if(req){
      if(req.index == index ){
        req.isNotFound = true;
        req.queue.end();
      }
    
      req.queue.wait(function(isCancelled){
        if(req.isNotFound){
          if(req.notFoundFn){
            req.index = 1;
            req.initNode('body');
            req.notFoundFn.call(req, req);
            var queue = new TaskQueue();
            enqueueNode(queue, req.node())
          }else{
            console.log('Undefined route:'+url);
            return;
          }
        }
      });
    }
  }
}

export function stop(){
  req = routeHandler = null;
  $("body").off('click', handleClickUrl);
  window.removeEventListener("popstate", handlePopState);
}

export function redirect(url){
  if (using.historyApi){
    history.pushState(null, null, url)
  } else{
    location.hash = '#!'+ url;
  }
  routeHandler && executeRoute(url, routeHandler);
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

export interface PoolEntry
{
  [index: number]: Base;
}

class AutoreleasePool
{ 
  private drained : bool = false;
  private pool : Base[] = [];
  
  public autorelease(...objs:Base[]) : void;
  public autorelease(objs:Base[]) : void;
  
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
var wrap = overload({
  'Function Array Function': function(fn, args, cb) {
    return function(done){
      var _args = _.clone(args);
      _args.push(function(){
        cb(done);
        if(cb.length === 0){
          done();
        }
      });
      fn.apply(null, _args);
    }
  },
  'Function Function': function(fn, cb){
    return wrap(fn, [], cb);
  },
  'Function Array': function(fn, args){
    return wrap(fn, args, Util.noop);
  },
  'Function': function(fn){
    return wrap(fn, []);
  }
})

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

function processMiddlewares(req, middlewares, cb){
  Util.asyncForEach(middlewares, function(fn, cb){
    fn(req, cb);
  },cb);
}

function exitNodes(queue, nodes, start){
  for(var i=nodes.length-1;i>=start;i--){
    var node = nodes[i];
    node.el || queue.append(node.select);
    queue.append(node.exit || node.hide, node.drain, node.leave);
  }
}

function enqueueNode(queue: TaskQueue, node: Node): void {
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
  private el: HTMLElement;
  private notFoundFn;
  private isNotFound: bool;
  private template: (tmpl: string, args:{}) => void;
  
  public data: any[];
  public url: string;
  public nodes: any[] = [];
  public index: number = 0;
  public level: number = 0;
  public params: {} = {};
  public queue: TaskQueue = new TaskQueue();
  public components: string[];
  public startIndex: number;
  public prevNodes: any[];

  constructor(url:string, prevNodes:any[]){
    var self = this, components, i, len, prevLen;
  
    _.extend(self, decomposeUrl(url));
    
    components = self.components;
    len = components.length;
    prevLen = prevNodes.length;
    
    this.url = url;
    this.prevNodes = prevNodes;
    
    //
    // Reuse previous autorelease pools and find the starting index for the new route.
    // (we should generalize this solution...)
    for (i=0; i<len; i++){
      var 
        prev = prevNodes[i],
        prevNext = prevNodes[i+1];
      
      if(prev && 
         (prev.component === components[i]) && 
         (prevLen < len || (prevNext && prev.selector != prevNext.selector) || i < len-1)){
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
  
  public get(cb: ()=>void);
  public get(component: string, cb: ()=>void);
  public get(component: string, selector: string, cb: ()=>void);
  public get(component: string, selector: string, handler: string);
  public get(component: string, selector: string, args: {}, handler: string);
  public get(component: string, selector: string, args: {}, middelwares: {(): void; }[],handler: string);
  public get(component: string, selector: string, args: {}, middelwares: {(): void; }[],cb: ()=>void);
  public get(): Request
  {
    return overload({
      'String String String': function(component, selector, handler){
        return this._get(component, selector, {}, [], handler);
      },
      'String String Array String': function(component, selector, middelwares, handler){
        return this._get(component, selector, {}, middelwares, handler);
      },
      'String String Array Function': function(component, selector, middelwares, cb){
        return this._get(component, selector, {}, middelwares, cb);
      },
      'String String Function': function(component, selector, cb){
        return this._get(component, selector, {}, [], undefined, cb);
      },
      'String String Object String': function(component, selector, args, handler){
        return this._get(component, selector, args, [], handler);
      },
      'String Function': function(component, cb){
        return this._get(component, 'body', {}, [], undefined, cb);
      },
      'Function': function(cb){
        return this._get('', 'body', {}, [], undefined, cb);
      },
      // TODO: Implement middleware's overloading functions
    }).apply(this, arguments);
  }
  
  private _get(component: string,
               selector: string, 
               args: {},
               middelwares:{ (): void; }[],
               handler: string, 
               cb: () => void): Request
  {
    if(this.wantsRedirect || !this.consume(component, this.level)){
      return this;
    }
      
    this.queue.append(
      this.createRouteTask(this.level, selector, args, middelwares, handler, cb)
    );
    
    return this;
  }
  
  private createRouteTask(level, selector, args, middlewares, handler, cb) : Task
  {
    return (done?: TaskCallback) : void =>
    {
      processMiddlewares(this, middlewares, (err) => {
        var
          node = this.node(),
          pool = node.autoreleasePool,
          index = this.index,
          isLastRoute = index === this.components.length;
        
          if(index == this.startIndex){
            exitNodes(this.queue, this.prevNodes, this.startIndex);
          }
          this.initNode(selector, node);

          if(cb){
            this.enterNode(cb, node, index, level, {}, pool, isLastRoute);
            done();
          }else{
            curl([handler], (cb) => {
              this.enterNode(cb, node, index, level, args, pool, isLastRoute);
              done();
            });
          }
      });
    };
  }
  
  // TODO: Generate error if selector returns empty set or more than one DOM node!
  private initNode(selector: string, node : Node){
  
    ((node: Node) => {
      node.select = wrap((done) => {
        node.el = this.el = $(selector)[0];
        done();
      });
      node.selector = selector;
   
      node.hide = wrap((done) => {
        node.el && hide(node.el);
        done();
      });
   
      node.show = wrap((done) => {
        node.el && show(node.el);
        done();
      });
     
      node.drain = wrap((done) => {
        node.autoreleasePool.drain();
        done();
      });
    })(node || this.node());
  }
  
  private enterNode(fn, node, index, level, args, pool, isLastRoute){
    this.level = level + 1;
    if(arguments.length==7){
      fn && fn.call(this, pool, args);
    }else{
      fn && fn.call(this, args);
      isLastRoute = pool;
    }
  
    this.isNotFound = (index >= this.index) && !isLastRoute;
    if(!this.isNotFound && index > this.startIndex){
      enqueueNode(this.queue, node);
    }
          
    if(this.isNotFound || isLastRoute){
      this.queue.end();
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
    var index = this.index;
  
    if(expr){
      if((level != index) || (index >= this.components.length)){
        return false
      }
      var comp = this.components[index];
      if(!parseParams(expr, comp, this.params) && expr !== comp){
        return false;
      }
    }
    this.index++;
    return true;
  }
  
  private notFound(fn){
    this.notFoundFn = fn;
  }
  
  public node(){
    return this.nodes[this.index<=0 ? 0:(this.index-1)];
  }
  
  public isLast(){
    return this.index >= this.components.length;
  }

  public nextComponent(){
    return this.components[this.index];
  }
  
  public redirect(url, params){
    url = params ? url+'?'+serialize(params) : url;
    this.queue.wait(function(){
      redirect(url);
    })
    this.wantsRedirect = true;
  }
  
  public before(cb): Request {
    this.node().before = wrap((cb)=>{cb()}, cb);
    return this;
  }
  
  public after(cb): Request {
    this.node().after = wrap((cb)=>{cb()}, cb);
    return this;
  }
  
  public enter(fn: (el: HTMLElement, done?: ()=>void) => void): Request
  {
    var node = this.node();
    node.enter = wrap(function(done){
      node.el && fn(node.el, done);
      (fn.length==1) && done();
    });
    return this;
  }
  
  public exit(fn: (el: HTMLElement, done?: ()=>void) => void): Request
  {
    var node = this.node();
    node.exit = wrap(function(done){
      node.el && fn(node.el, done);
      (fn.length==1) && done();
    });
    return this;
  }
  
  public leave(cb:(done?:()=>void) =>void): Request 
  {
    this.node().leave = wrap((cb)=>{cb()}, cb);
    return this;
  }
  
  public render(templateUrl: string): Request;
  public render(templateUrl: string, cb?: (err?: Error)=>void): Request;
  public render(templateUrl: string, locals: {}, cb?: (err?: Error)=>void): Request;
  public render(templateUrl: string, css: string, cb?: (err?: Error)=>void): Request;
  public render(templateUrl: string, css?: string, locals?: {}, cb?: (err?: Error)=>void): Request {
    return overload({
      "String String Object Function": function(templateUrl, css, locals, cb){
        var fn = _.bind(this._render, this);
        this.node().render = wrap(fn, [templateUrl, css, locals], cb);
        return this;
      },
      "String String Function": function(templateUrl, css, cb){
        return this.render(templateUrl, css, {}, cb);
      },
      "String String": function(templateUrl, css){
        return this.render(templateUrl, css, {}, Util.noop);
      },
      "String String Object": function(templateUrl, css, locals){
        return this.render(templateUrl, css, locals, Util.noop);
      },
      "String Object": function(templateUrl, locals){
        return this.render(templateUrl, "", locals, Util.noop);
      },
      "String Object Function": function(templateUrl, locals, cb){
        return this.render(templateUrl, "", locals, cb);
      },
      "String Function": function(templateUrl, cb){
        return this.render(templateUrl, "", {}, cb);
      },
      "String": function(templateUrl){
        return this.render(templateUrl, Util.noop);
      },
    }).apply(this, arguments);
  }

  public load(urls?, cb?): Request 
  {
    if(_.isFunction(urls)){
      cb = urls;
      urls = null;
    }
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
      }else if(_.isObject(locals) && !_.isEmpty(locals)){
        args = locals;
      }else if(_.isObject(self.data)){
        args = self.data;
      }else{
        args = {};
      }
      var html = using.template(templ)(args);
      
      if(self.el){
        self.el.innerHTML = html;
        waitForImages(self.el, cb);
      }else{
        cb();
      }
    }

    function waitForImages(el, cb) {
      var
        $images = $('img', el),
        counter = $images.length;
      
      cb = _.once(cb);
      var deferTimeout = _.debounce(cb, 1000);

      if(counter>0){
        deferTimeout(); // start timer
        var loadEvent = function(evt){
          deferTimeout();
          $images.off('load', loadEvent);
          counter--;
          if(counter === 0){
            cb();
          }
        }
        $images.on('load', loadEvent);
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
        try{
          objs.push(JSON.parse(arguments[i]));
        }catch(e){
          console.log("Error parsing data: "+e.name+"::"+e.message);
        }
      }
      objs = objs.length===1?objs[0]:objs;
      self.data = objs;
      cb && cb();
    });
  }
}

}
