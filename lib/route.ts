/**
  Ground Web Framework. Route Management. (c) OptimalBits 2011-2013.
*/
/**
  Hierarchical Routing.

  Define routes hierarchically creating views by rendering templates at
  the specified DOM nodes in the hierarchy.
*/

/// <reference path="log.ts" />
/// <reference path="base.ts" />
/// <reference path="view.ts" />
/// <reference path="task.ts" />
/// <reference path="overload.ts" />
/// <reference path="dom.ts" />
/// <reference path="promise.ts" />
/// <reference path="using.ts" />

declare var curl;

/**
  @module Gnd
*/
module Gnd {

export interface RouteNode
{
  el: Element;
  selector: string;
  select: Task<void>;
  enter: Task<void>;
  hide: Task<void>;
  show: Task<void>;
  drain: Task<void>;
  before: Task<void>;
  after: Task<void>;
  render: Task<void>;
  load: Task<void>;
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
/**
  Url Route management.

  This static class provides hierarchical url routing that maps the hierarchical
  structure of the DOM.

  For a complete description of the route manager check the [guide](http://gnd.io/#Routing)

  @class Route
*/
export class Router
{
  private interval;
  private req: Request;
  private routeHandler;

  private handlePopStateFn;
  private handleClickUrlFn;

  private basepath: string;

  public route: Route = new Route();

  constructor(){
    this.handlePopStateFn = (evt) => {
      this.routeHandler && this.executeRoute(location.pathname, this.routeHandler);
    }

    this.handleClickUrlFn = (evt) => {
      var link = findLink(evt.target || evt.srcElement);
      if(link){
        var url = link.href;

        // check if url is within the basepath
        if(url = getRelativeUrl(url, this.basepath)){
          evt.preventDefault();
          this.redirect(url);
        }
      }
    }
  }

  /**
    Listen to changes in the url and calls the route handler accordingly.

    @method listen
    @param [root=""] {String} specify the root url.
    @param cb {Function} route handler.
  */
  public listen(root: string, cb: ()=>void)
  public listen(cb: ()=>void)
  public listen(root?, cb?)
  {
    if(_.isFunction(root)){
      cb = root;
      root = '';
    }

    this.routeHandler = cb;
    this.basepath = location['origin'] + '/' + Util.trim(root);

    var url;
    if(using.historyApi){
      // Listen to all link clicks.
      $("document").on('click', this.handleClickUrlFn);

      window.addEventListener("popstate", this.handlePopStateFn);
      url = getRelativeUrl(location.href, this.basepath);
    }else{
      url = location.hash.replace(/^#!?/, '');
      var fn = () => this.executeRoute(location.hash.replace(/^#!?/, ''), cb);
      if ('onhashchange' in window) {
        window.onhashchange = fn;
      } else {
        this.interval = setInterval(fn, 50);
      }
    }

    this.executeRoute(url, cb);
  }

  /**
    Stop listening for url changes.

    @method stop
  */
  public stop(){
    this.req = this.routeHandler = null;
    $("body").off('click', this.handleClickUrlFn);
    window.removeEventListener("popstate", this.handlePopStateFn);
    delete window.onhashchange;
    clearInterval(this.interval);
  }

  /**
    Redirect to given url.

    @method redirect
    @param url {String} url to redirect to.
    @param [opts] {Object} Object with some options (force and forceLast)
  */
  public redirect(url, opts?){
    if (using.historyApi){
      history.pushState(null, null, url)
    } else{
      location.hash = '#!'+ url;
    }
    this.routeHandler && this.executeRoute(url, this.routeHandler, opts);
  }

  private executeRoute(url, routeHandler, opts?){
    if(!this.req || (this.req.url !== url)){
      this.req && this.req.queue.cancel();

      var req = new Request(url, this.req && this.req.nodes || [], opts);

      this.route.notifyRouteChange(this.req, req);

      this.req = req;

      //
      // Starts the recursive route traversing
      //
      var index = req.index;

      routeHandler(req);

      if(req.index == index ){
        req.isNotFound = true;
        req.queue.end();
      }

      req.queue.wait().then(() => {
        if(req.isNotFound){
          if(req.notFoundFn){
            req.index = 1;
            req.initNode('body');
            req.notFoundFn.call(req, req);
            var queue = new TaskQueue<void>();
            enqueueNode(queue, req.node())
          }else{
            log('Undefined route:', url);
            return;
            }
          }
      });
    }
  }
}

export class Route extends Base
{
  notifyRouteChange(prevReq: Request, req: Request)
  {
    // TODO: This should be performed not at once but during route traversal.
    var index = 0;
    var components = req.components;

    if(prevReq){
      var prevComponents = prevReq.components;
      var maxLen = Math.min(prevComponents.length, components.length);

      // ignore common components
      for(;index < maxLen; index++){
        if(prevComponents[index] != components[index]){
          break;
        }
      }

      if(index < prevComponents.length){
        // clean old components
        var start = prevComponents[0] != '' ? 0 : 1;
        for(var i=prevComponents.length; i>=index+start; i--){
          this.set(prevComponents.slice(start, i).join('.'), false);
        }
      }
    }

    if(index < components.length){
      // set new components
      if(components[index] == '') index++;
      for(var i=index ; i<components.length; i++){
        this.set(components.slice(index, i+1).join('.'), true);
      }
    }
  }
}

function findLink(el: HTMLElement): any{
  while(el && el !== document.body){
     if(el.tagName.toLowerCase() === "a"){
       return el;
     }
     el = el.parentElement;
  }
}

function getRelativeUrl(url: string, basepath: string){
  if(url.indexOf(basepath) === 0){
    url = url.substring(basepath.length).replace(/^#!?/, '');
    return url;
  }
}

export var router = new Router();

/**
  Parses A query string and returns an object with key, value pairs.
*/
export var parseQuery = function(queryString : string){
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

export class AutoreleasePool
{
  private drained : boolean = false;
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
      try{
        var obj = this.pool[i];
        obj.release();
      }catch(err){
        log('Error releasing object', obj, err);
      }
    }
    this.pool = [];
    this.drained = true;
  }
}

//
// Decompose URL into components and query object.
//
export var decomposeUrl = function(url){
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

function enqueueNode(queue: TaskQueue<void>, node: RouteNode): void {
  queue.append(node.select,
               node.hide,
               node.before,
               node.load,
               node.render,
               node.enter || node.show,
               node.after);
}

/**
  Represents a request operation in the routing system.

  Instances of this class are created by Route.listen and are used to define
  the route to be consumed and to act upon.

*/
export class Request {

  private wantsRedirect: boolean;
  private el: HTMLElement;

  private template: (tmpl: string, args:{}) => void;

  public isNotFound: boolean;
  public notFoundFn;

  public data: any[];
  public url: string;
  public nodes: any[] = [];
  public index: number = 0;
  public level: number = 0;
  public params: {} = {};
  public queue: TaskQueue<void> = new TaskQueue<void>();
  public components: string[];
  public startIndex: number;
  public prevNodes: any[];

  constructor(url:string, prevNodes:any[], opts?){
    var components, i, len, prevLen;

    opts = opts || {};

    _.extend(this, decomposeUrl(url));

    components = this.components;
    len = components.length;
    prevLen = prevNodes.length;

    this.url = url;
    this.prevNodes = prevNodes;

    //
    // Reuse previous autorelease pools and find the starting index for the new route.
    ///
    for (i=0; i<len; i++){
      var
        prev = prevNodes[i],
        prevNext = prevNodes[i+1];

      if(opts.forceLast && i === len-1) break;

      if(prev && (prev.component === components[i])){
        if((i+1 < prevLen) && _.findWhere(prevNodes.slice(i+1), {'selector': prev.selector})){
          break;
        }

        this.nodes.push({
          component:components[i],
          autoreleasePool:prev.autoreleasePool
        });
      }else{
        break;
      }
    }
    this.startIndex = i;

    //
    // Create new nodes
    //
    for (i=this.startIndex; i<len; i++){
      this.nodes.push({component:components[i], autoreleasePool: new AutoreleasePool()});
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
        return this._get(component, selector, {}, middelwares, undefined, cb);
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

  private createRouteTask(level, selector, args, middlewares, handler, cb) : Task<void>
  {
    return () => {
      return new Promise<void>((resolve) => {
        processMiddlewares(this, middlewares, (err) => {
          var
            node = this.node(),
            pool = node.autoreleasePool,
            index = this.index,
            isLastRoute = index === this.components.length;

          if (index == this.startIndex) {
            exitNodes(this.queue, this.prevNodes, this.startIndex);
          }
          this.initNode(selector, node);

          if (cb) {
            this.enterNode(cb, node, index, level, {}, pool, isLastRoute);
            resolve(void 0);
          } else {
            curl([handler], (cb) => {
              this.enterNode(cb, node, index, level, args, pool, isLastRoute);
              resolve(void 0);
            });
          }
        });
      });
    };
  }

  // TODO: Generate error if selector returns empty set or more than one DOM node!
  public initNode(selector: string, node?: RouteNode){

    ((node: RouteNode) => {
      node.select = () => {
        node.el = this.el = $(selector)[0];
        return Promise.resolved(void 0);
      };
      node.selector = selector;

      node.hide = () => {
        node.el && hide(node.el);
        return Promise.resolved(void 0);
      };

      node.show = () => {
        node.el && show(node.el);
        return Promise.resolved(void 0);
      };

      node.drain = () => {
        node.autoreleasePool.drain();
        return Promise.resolved(void 0);
      };
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

  private consume(expr, level) : boolean {
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

  public redirect(url, params?, opts?){
    url = params ? url+'?'+serialize(params) : url;
    this.queue.wait().then(() => {
      router.redirect(url, opts);
    })
    this.wantsRedirect = true;
  }

  public before(cb): Request {
    this.node().before = cb;
    return this;
  }

  public after(cb): Request {
    this.node().after = cb;
    return this;
  }

  public enter(fn: (el: HTMLElement) => Promise<void>): Request
  {
    var node = this.node();
    node.enter = () => {
      if(node.el){
        return fn(node.el);
      } else {
        return Promise.resolved(void 0);
      }
    };
    return this;
  }

  public exit(fn: (el: HTMLElement) => Promise<void>): Request
  {
    var node = this.node();
    node.exit = () => {
      if(node.el){
        return fn(node.el);
      } else {
        return Promise.resolved(void 0);
      }
    };
    return this;
  }

  public leave(cb:() => Promise<void>): Request
  {
    this.node().leave = cb;
    return this;
  }

  /**
    Renders a template into the current DOM node.

    @method render
    @param templateUrlOrSelector {String} An url or a selector id where to
    fetch the template.
    @param [locals] {Object} local properties to be used in the template.
    @param [css] {String} An url to a css file
    @param [cb] {Function} Callback called when the rendering has been completed.
  */
  public render(templateUrl: string): Request;
  public render(view: View, cb?: (err?: Error)=>void): Request;
  public render(templateUrl: string, cb?: (err?: Error)=>void): Request;
  public render(templateUrl: string, locals: {}, cb?: (err?: Error)=>void): Request;
  public render(templateUrl: string, css: string, cb?: (err?: Error)=>void): Request;
  public render(templateUrl: string, css: string[], cb?: (err?: Error)=>void): Request;
  public render(templateUrl, css?: any, locals?: {}, cb?: (err?: Error)=>void): Request {
    return overload({
      "String Array Object Function": function(url, css, locals, cb){
        this.node().render = () => {
          return this._render({templateUrl: url, cssUrl: css}, locals, cb);
        }
        return this;
      },
      "String String Object Function": function(url, css, locals, cb){
        css = css ? [css] : [];
        return this.render(templateUrl, css, locals, cb);
      },
      "Object": function(view){
        return this.render(view, Util.noop);
      },
      "Object Function": function(view, cb){
        return this.render(view, {}, cb);
      },
      "Object Object": function(view, locals){
        return this.render(view, locals, Util.noop);
      },
      "Object Object Function": function(view, locals, cb){
        this.node().render = () => {
          return this._render(view, locals, cb);
        }
        return this;
      },
      "String String Function": function(templateUrl, css, cb){
        return this.render(templateUrl, css, {}, cb);
      },
      "String Array Function": function(templateUrl, css, cb){
        return this.render(templateUrl, css, {}, cb);
      },
      "String String": function(templateUrl, css){
        return this.render(templateUrl, css, {}, Util.noop);
      },
      "String Array": function(templateUrl, css){
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
    this.node().load = () => {
      return this._load(urls, cb);
    }
    return this;
  }

  private _render(args, locals, cb){
    if(args.templateUrl && args.templateUrl[0] == '#'){
      args.templateStr = Gnd.$(args.templateUrl).text();
      args.templateUrl = null;
    }

    var ctx = _.extend({}, locals, this.data);

    var view: View = args instanceof View ? <View>args.retain() : new View(args);

    // we need to get the pool for this node
    // this.autoreleasePool.autorelease(view);

    $(this.el).empty();
    return view.parent(this.el).render(ctx).then(function(){
      cb && cb(null);
    });
  }

  private _load(urls, cb){
    var base = this.currentSubPath(),
        i,
        len;
    var args = arguments;

    if(urls === null){
      urls = this.data;
    }

    if(!_.isArray(urls)){
      urls = [urls];
    }

    var _urls = [];
    for(i=0, len=urls.length;i<len;i++){
      _urls.push('text!'+urls[i]);
    }

    return new Promise((resolve, reject) => {
      curl(_urls, (...args: any[]) => {
        var objs = [];
        for(i=0, len=args.length;i<len;i++){
          try{
            objs.push(JSON.parse(args[i]));
          }catch(err){
            log("Error parsing data: "+err.name+"::"+err.message);
            reject(err)
          }
        }
        objs = objs.length===1?objs[0]:objs;
        this.data = objs;
        cb && cb();
        resolve();
      });
    });
  }
}

}
