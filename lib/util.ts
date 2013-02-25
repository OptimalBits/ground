/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  Util Module. Include utility functions used in several parts of
  the framework.
*/

/// <reference path="../third/underscore.browser.d.ts" />
/// <reference path="dom.ts" />
/// <reference path="overload.ts" />
/// <reference path="using.ts" />


module Gnd.Util {

export function noop(){};

export function assert(cond, msg){
  if(!cond){
    console.log('Assert failed:%s',msg);
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

export function release(objs){
  var items = _.isArray(objs) ? objs :arguments;
  _.each(items, function(obj){
    obj && obj.release();
  });
};

export function nextTick(fn){
  setTimeout(fn, 0);
};

export function trim(str: string){
  return str.replace(/^\s+|\s+$/g,'');
};

// TODO: Add an optional timeout parameter.
export function asyncDebounce(fn) {
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
  
// TODO: rename to delayedTrigger(fn, triggerStart, triggerEnd, threshold)
export function waitTrigger(func, start, end, delay){
  return function waiter(){
    var obj = this,
    waiting = false,
    timer = null,
    args = Array.prototype.slice.call(arguments),
    nargs = args.length,
    callback = args[nargs-1];
  
    args[nargs-1] = function(){
      clearTimeout(timer);
      if(waiting){
        end();
      }
      callback.apply(obj, arguments);
    };
      
    timer = setTimeout(function(){
      waiting = true;
      start();
    }, delay);
    func.apply(this, args);
  };
};
 
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
export function safeEmit(socket, ...args:any[]): void
{
  var cb = _.last(args);
   
  function errorFn(){
    cb(new Error('Socket disconnected'));
  };
  
  function proxyCb(err, res){
    socket.removeListener('disconnect', errorFn);
    if(err){
      err = new Error(err);
    }
    cb(err,res);
  };
  
  args[args.length-1] = proxyCb;
  
  if(socket.socket.connected){
    socket.once('disconnect', errorFn);
    socket.emit.apply(socket, args);
  }else{
    errorFn();
  }
}

export function waitForImages(el, cb)
{
  var
    $images = $('img', el),
    counter = $images.length;
    
  if(counter>0){        
    var loadEvent = function(evt){
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

} // Gnd.Util
