/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  Util Module. Include utility functions used in several parts of
  the framework.
*/

/// <reference path="../third/underscore.browser.d.ts" />

// we can not import due to a bug in tsc.
// import _ = module("underscore");

export function noop(){};

export function assert(cond, msg){
  if(!cond){
    console.log('Assert failed:%s',msg);
  }
};
  
export function uuid(a,b){
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
export function searchFilter(obj, search, fields){
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
 // var deferred = $.Deferred(), 
  var completed = 0;
    
  function iter(item, len){
    fn(item, function(err) {
      if(err){
   //     deferred.reject()
        cb && cb(err);
        cb = noop;
      }else{
        completed++;
        if(completed === len) {
          cb && cb(null);
     //     deferred.resolve()
         }
      }
    });
  }
    
  if(_.isArray(array)){
    if(array.length === 0) {
      cb && cb(null);
     // deferred.resolve()
    }else{
      for(var i=0,len = array.length;i<len;i++) {
        iter(array[i], len);
      }
    }
  }else{
     iter(array, 1);
  }
//  return deferred
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
