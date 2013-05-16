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
/// <reference path="promise.ts" />



module Gnd.Util {

export function noop(){};

export function assert(cond, msg){
  if(!cond){
    console.log('Assert failed:%s', msg);
  }
};

export function uuid(a?,b?){
  for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');
  return b;
};

export function refresh(){
    window.location.replace('');
};

export function retain(objs){
  var items = _.isArray(objs) ? objs :arguments;
  _.each(items, function(obj){
    obj && obj.retain();
  });
};

export function release(...objs: Base[]);
export function release(objs: any){
  var items = _.isArray(objs) ? objs :arguments;
  _.each(items, function(obj){
    obj && obj.release();
  });
};

//
// http://jsperf.com/test002/5
//
declare var process;

var nextTick;
if((typeof process !== 'undefined') && (process.nextTick)){
  nextTick = process.nextTick;
}else{
  nextTick = (fn) => {
    setTimeout(fn, 0);
  }
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

export var nextTick;

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

// TODO: Add an optional timeout parameter.
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
/*
export function debounce(task: ()=>Promise): Promise
{
  var 
    delayedFunc = null,
    executing = null;
  
  return function debounced() {
    var context = this,
      args = arguments,
      nargs = args.length,
      cb = args[nargs-1],
      delayed = function() {
        executing = task;
        task.apply(context, args).then(){
        
        });
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
}
*/

export 
function delayed(task: Promise, start: ()=>void, end: ()=>void, delay: number): Promise
{
  var waiting;

  var timer = setTimeout(() => {
    waiting = true;
    start();
  }, delay);
  
  return task.then(()=>{
    clearTimeout(timer);
    waiting && end();
  });
}
 
// Search Filter. returns true if any of the fields of the 
// obj includes the search string.
export function searchFilter(obj: {}, search: string, fields: string []): bool
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
  
// Apply asynchronous functions to every element in the array in parallel
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
  
// Credits: https://github.com/caolan/async
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

export function extend(parent: ()=>void, subclass?: (_super?: ()=>void)=>any){
  var methods;
  var d = function Derived(){
    parent.apply(this, arguments);
  }
  
  if(subclass){
    methods = subclass(parent.prototype);
    d = methods.constructor;
  }
  function __() { this.constructor = d; }
  __.prototype = parent.prototype;
  d.prototype = new __();
  
  _.extend(d.prototype, methods);
  
  return d;
}

/**
  A safe emit wrapper for socket.io that handles connection errors.
*/
export function safeEmit(socket, ...args:any[]): Promise
{
  var promise = new Promise();
   
  function errorFn(){
    var err = new Error('Socket disconnected');
    promise.reject(err);
  };
  
  function proxyCb(err, res){
    socket.removeListener('disconnect', errorFn);
    if(err){
      err = new Error(err);
      promise.reject(err);
    }else{
      promise.resolve(res);
    }
  };
  
  //args[args.length-1] = proxyCb;
  args.push(proxyCb)
  
  if(socket.socket.connected){
    socket.once('disconnect', errorFn);
    socket.emit.apply(socket, args);
  }else{
    errorFn();
  }
  
  return promise;
}

declare var curl;

export function fetchTemplate(templateUrl?: string, 
                              cssUrl?: string, 
                              done?:(err?: Error, templ?: string)=>void)
{
  var items = [];
  templateUrl && items.push('text!'+templateUrl);
  cssUrl && items.push('css!'+cssUrl);
  done = done || Util.noop;
  
  try{
    curl(items, function(templ){
      done(null, templ);
    });
  } catch(e){
    done(e);
  }
}

// Expand an object with stringified keys e.g
// {
//   'a.b.c': 1,
//   'a.b.x': 2,
//   'b':3
// }
// =>
// {
//   a: {
//     b: {
//       c: 1,
//       x: 2
//     }
//   },
//   b: 3
// }
export function expand(args: {}): {}
{
  var obj = {};
  var keys = _.keys(args);
  _.each(keys, function(key){
    expandProperty(obj, key, args[key]);
  });
  return obj;
}

// Expand a single property and decorate the object obj with it
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
function deepExtend(doc, args, callFns?: bool): {}
{
  var keys = _.keys(args);
  _.each(keys, function(key){
    if(isVirtualProperty(doc[key])){
      doc[key].call(this, args[key]);
    }else{
      // TODO: use isPlainObject to avoid special cases.
      if(doc[key] && 
         args[key] && 
         typeof args[key] === 'object' &&
         !(args[key] instanceof Date)){
        deepExtend(doc[key], args[key]);
      }else{
        doc[key] = args[key];
      }
    }
  });
  return doc;
}

// Merge a doc with an object containing unexpanded properties
export function merge(doc, args): {}
{
  return deepExtend(doc, expand(args));
}

export function extendClone(a: {}, b: {}): {}
{
  return _.extend(_.clone(a), b);
}

export function isVirtualProperty(prop: any): bool
{
  return !!(prop && _.isFunction(prop) && prop.isVirtual);
}

} // Gnd.Util
