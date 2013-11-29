/**
  Ground Web Framework (c) 2013 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  Util Module. Include utility functions used in several parts of
  the framework.
*/

/// <reference path="../third/underscore.d.ts" />
/// <reference path="overload.ts" />
/// <reference path="base.ts" />

/**
  @module Gnd
  @submodule Storage
*/
module Gnd.Util {

/**
  Assorted utilities.
    
  @class Util
*/

/**
    @method noop
*/
export function noop(){};

/**
    @method assert
    @param cond {Boolean} condition that must be true.
    @param msg {String} message output if assertion not valid.
*/
export function assert(cond, msg){
  !cond && console.log('Assert failed:%s', msg);
};

/**
  Generates a uuid

  @method uuid
  @return {String} string with a uuid.
*/
export function uuid(a?,b?){
  for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');
  return 'cid-'+b;
};

/**
  Computes the adler32 checksum of a string.
  
  credits: https://gist.github.com/1200559/1c2b2093a661c4727958ff232cd12de8b8fb9db9
  @method adler32
  @param s {String} string from where to compute adler32 checksum.
*/ 
export function adler32(s: string): number
{
  for(var b=65521,c=1,d=0,e=0,f; f=s.charCodeAt(e++); d=(d+c)%b){
    c=(c+f)%b;
  }
  return(d<<16)|c;
}

/**
  Refreshes the browser.
  
  @method refresh
*/
export function refresh(){
  window.location.replace('');
};

/**
  Retains the given objects (see reference count for details).

  @method retain
  @param objs* {Array | Any} object or objects to retain. If any of the objs
  is null or undefined, nothing is done for that obj.
*/
export function retain(objs){
  var items = _.isArray(objs) ? objs :arguments;
  _.each(items, function(obj){
    obj && obj.retain();
  });
};

/**
  Release the given objects (see reference count for details).
 
  @method release
  @param objs* {Array | Any} object or objects to release. If any of the objs
    is null or undefined, nothing is done for that obj.
*/
export function release(...objs: Base[]);
export function release(objs: any){
  var items = _.isArray(objs) ? objs :arguments;
  _.each(items, function(obj){
    obj && obj.release();
  });
};


/**

  http://jsperf.com/test002/5
  
  @method nextTick
  @param 
*/
//
// http://jsperf.com/test002/5
//
declare var process;

export var nextTick: (fn: () => void) => void = noop;
if((typeof process !== 'undefined') && (process.nextTick)){
  nextTick = process.nextTick;
}else{
  nextTick = (fn) => setTimeout(fn, 0);
  /*
  nextTick = (fn) => {
    var script = <HTMLScriptElement>document.createElement('script');
    script.onload = function() {
      document.body.removeChild(script);
      fn();
    }
    script.src = 'data:text/javascript,';
    document.body.appendChild(script);
  }
  */
}

/**
  Trims a string.
  
  @method trim
  @param str {String} the string to trim.
  @param [maxLen] {Number} 
  @param [suffix] {String}
*/
export function trim(str: string, maxLen?: number, suffix?: string): string
{
  str = str.replace(/^\s+|\s+$/g,'');
  if(str && maxLen && str.length > maxLen) {
    var suffixLen = 0;
    if(suffix) suffixLen = suffix.length;
    str = str.substr(0,maxLen-suffixLen) + suffix;
  }
  return str;
};

/**
    @method asyncDebounce
    @deprecated
*/
export function asyncDebounce(fn) {
  fn = fn || noop;
  var delayedFunc = null, executing = null;
  
  return function debounced() {
    var context = this,
      args = arguments,
      nargs = args.length,
      cb = args[nargs-1],
      delayed = function() {
        executing = fn;
        fn.apply(context, args);
      };
  
    args[nargs-1] = function(){
      cb.apply(context, arguments);
      executing = null;
      if(delayedFunc){
        var f = delayedFunc;
        delayedFunc = null;
        f();
      }
    };
  
    if(executing){
      delayedFunc = delayed;
    }else{
      delayed();
    }
  };
};


/**
  Search Filter. returns true if any of the fields of the 
  obj includes the search string.
  
  @method searchFilter
  @param obj {Object} object to check the search string.
  @param search {String} search string.
  @param fields {Array} array of string with the fields to search for.
  @return {Boolean} true if the object includes the search string.
*/ 
export function searchFilter(obj: {}, search: string, fields: string []): boolean
{
  if(search){
    var result = false;
    search = search.toLowerCase();
    for(var i=0,len=fields.length;i<len;i++){
      if(String(obj[fields[i]]).toLowerCase().indexOf(search) != -1){
        result = true;
      }
    }
    return result;
  }else {
    return true;
  }
};

/**
  Apply asynchronous functions to every element in the array in parallel

  @method asyncForEach
  @deprecated
*/
export function asyncForEach(array, fn, cb) {
  var completed = 0;
    
  function iter(item, len){
    fn(item, function(err) {
      if(err){
        cb && cb(err);
        cb = noop;
      }else{
        completed++;
        if(completed === len) {
          cb && cb(null);
         }
      }
    });
  }
    
  if(_.isArray(array)){
    if(array.length === 0) {
      cb && cb(null);
    }else{
      for(var i=0,len = array.length;i<len;i++) {
        iter(array[i], len);
      }
    }
  }else{
     iter(array, 1);
  }
};

/**
    @method asyncForEachSeries
    @deprecated
    
    Credits: https://github.com/caolan/async
*/
export function asyncForEachSeries(arr, fn, cb){
  cb = cb || noop;
  if (!arr.length) {
    return cb();
  }
  var completed = 0;
  function iterate() {
    fn(arr[completed], function (err) {
      if (err) {
        cb(err);
        cb = noop;
      } else {
        completed ++;
        if (completed < arr.length) {
          iterate();
        } else {
          cb();
        }
      }
    });
  };
  iterate();
}

/**
    @method inherits
*/
export function inherits(ctor, superCtor){
  ctor._super = superCtor;
  if(Object.create){
    ctor.prototype = Object.create(superCtor.prototype);
  }else{
    function F(){}
    F.prototype = superCtor;
    ctor.prototype = new F();
  }
};

/**
    @method extend
*/
export function extend(parent: ()=>void, subclass?: (_super?: ()=>void)=>any){
  var methods;
  var d = function Derived(){
    parent.apply(this, arguments);
  }
  
  if(subclass){
    methods = subclass(parent.prototype);
    d = methods.constructor;
  }
  
  inherits(d, parent);
  
  _.extend(d.prototype, methods);
  
  return d;
}

/**
  Expand an object with stringified keys e.g

      {
        'a.b.c': 1,
        'a.b.x': 2,
        'b':3
      }
      =>
      {
        a: {
          b: {
            c: 1,
            x: 2
          }
        },
        b: 3
      }
    
  @method expand
*/
export function expand(args: {}): {}
{
  var obj = {};
  var keys = _.keys(args);
  _.each(keys, function(key){
    expandProperty(obj, key, args[key]);
  });
  return obj;
}
 
/**
  Expand a single property and decorate the object obj with it

  @method expandProperty
*/
export function expandProperty(obj: {}, keyPath: string, value: any): {}
{
  var path = keyPath.split('.');
  var branch = _.reduceRight(path, function(memo, level){
    var tmp = {};
    tmp[level] = memo;
    return tmp;
  }, value);
  deepExtend(obj, branch);
  return obj;
}

//Deply extend an object e.g.
// deepExtend({
//   a: {
//     b: 1
//   }
// }, {
//   a:{
//     c: 2
//   }
// })
// =>
// {
//   a: {
//     b: 1,
//     c: 2
//   }
// }
function deepExtend(doc, args, callFns?: boolean): {}
{
  var keys = _.keys(args);
  _.each(keys, (key) => {
    var dst = doc[key];
    var val = args[key];
    
    if(isVirtualProperty(doc, dst)){
      doc[key](val);
    }else{
      if(_.isPlainObject(val)){
        if(_.isUndefined(dst)){
          doc[key] = val;
        }else if(_.isFunction(dst.set)){
          dst.set(val);
        }else{
          deepExtend(dst, val);
        }
      }else{
        doc[key] = val;
      }
    }
  });
  return doc;
}

/**
  Merge a doc with an object containing unexpanded properties

  @method merge
*/
export function merge(doc, args): {}
{
  return deepExtend(doc, expand(args));
}

/**
    @method extendClone
*/
export function extendClone(a: {}, b: {}): {}
{
  return _.extend(_.clone(a), b);
}

/**
    @method isVirtualProperty
*/
export function isVirtualProperty(obj, key: string): boolean
{
//  return !!(prop && _.isFunction(prop) && obj.isVirtual && obj.isVirtual(key));
  return !!(obj.isVirtual && obj.isVirtual(key));
}



var handlerQueue = [];

/**
  Enqueue a task. If the queue is not currently scheduled to be
  drained, schedule it.
  
  From [whenjs](https://github.com/cujojs/when)
  Shared handler queue processing 
  
  Credit to Twisol (https://github.com/Twisol) for suggesting
  this type of extensible queue + trampoline approach for
  next-tick conflation.
  
  @method enqueue
  @param {function} task
*/
export function enqueue(task) {
  if(handlerQueue.push(task) === 1) {
    nextTick(drainQueue);
  }
}

/**
  Drain the handler queue entirely, being careful to allow the
  queue to be extended while it is being processed, and to continue
  processing until it is truly empty.

  @method drainQueue
*/
export function drainQueue() {
  var task, i = 0;

  while(task = handlerQueue[i++]) {
    task();
  }

  handlerQueue = [];
}


} // Gnd.Util
  