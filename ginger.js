/**
   Ground Web Framework v0.1.0

   Features:
   - Modular design.
   - Builds on top of proven libraries such as jQuery and underscore.
   - Hierarchical routing system.
   - Clean class hierarchies, based on javascript prototypal inheritance.
   - Property bindings.
   - Models with persistence and clients/servers synchronization.
   - Global and Local Events.
   - Undo/Redo Manager.
   - Keyboard handling.
   - Set of views for common web "widgets".
   - Canvas View.
  
   Dependencies:
   - jQuery
   - Underscore / LoDash

   (c) 2011-2012 OptimalBits - Licensed as MIT.
   
   Resources:
   - http://kevinoncode.blogspot.com/2011/04/understanding-javascript-inheritance.html
   - http://javascript.crockford.com/prototypal.html
   - https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/create
   - http://jonathanfine.wordpress.com/2008/09/21/implementing-super-in-javascript/
   - http://blog.willcannings.com/2009/03/19/key-value-coding-with-javascript/
*/

define(['jquery', 'underscore'], function($, _){

/**
  Define some useful jQuery plugins.
*/

//
// Populates the options of a select tag
//
// Merge into ComboBox view.
(function( $ ){
  $.fn.comboBox = function(items, selected){
    var $comboBox = $('<select>', this), options = '';
    for(var key in items){
      options += '<option ';
      if (selected === key){
        options += 'selected="selected" ';
      }
      options += 'value="'+key+'">'+items[key]+'</option>';
    }
    
    $comboBox.html(options);
    this.append($comboBox);
    
    return this;
  };
})( jQuery );

//
// Polyfills
//

if (!Object.create) {
  Object.create = function (parent) {
    function F(){}
    F.prototype = parent;
    return new F();
  };
}

//
// Ginger Object
//

var ginger = {
  noop : function(){},
  assert : function(cond, msg){
    if(!cond){
      console.log('Assert failed:%s',msg);
    }
  },
  uuid : function(a,b){for(b=a='';a++<36;b+=a*51&52?(a^15?8^Math.random()*(a^20?16:4):4).toString(16):'-');return b;},
  refresh : function(){
    window.location.replace('');
  },
  retain : function(objs){
    var items = _.isArray(objs) ? objs :arguments;
    _.each(items, function(obj){
      obj && obj.retain();
    });
  },
  release : function(objs){
    var items = _.isArray(objs) ? objs :arguments;
    _.each(items, function(obj){
      obj && obj.release();
    });
  },
  nextTick : function(fn){
    setTimeout(fn, 0);
  },
  // TODO: Add an optional timeout parameter.
  asyncDebounce : function (fn) {
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
  },
  
  // TODO: rename to delayedTrigger(fn, triggerStart, triggerEnd, threshold)
  waitTrigger : function(func, start, end, delay){
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
  },
  // Search Filter. returns true if any of the fields of the
  // obj includes the search string.
  searchFilter : function(obj, search, fields){
    if(search){
      result = false;
      search = search.toLowerCase();
      for(var i=0,len=fields.length;i<len;i++){
        result |= String(obj[fields[i]]).toLowerCase().indexOf(search) != -1;
      }
      return result;
    }else {
      return true;
    }
  },
  
  // Apply asynchronous functions to every element in the array in parallel
  asyncForEach : function(array, fn, cb) {
    var deferred = $.Deferred(), completed = 0;
    
    function iter(item, len){
      fn(item, function(err) {
        if(err){
          deferred.reject();
          cb && cb(err);
          cb = noop;
        }else{
          completed++;
          if(completed === len) {
            cb && cb(null);
            deferred.resolve()
           }
        }
      });
    }
    
    if(_.isArray(array)){
      if(array.length === 0) {
        cb && cb(null);
        deferred.resolve()
      }else{
        for(var i=0,len = array.length;i<len;i++) {
          iter(array[i], len);
        }
      }
    }else{
      iter(array, 1);
    }
    return deferred
  },
  
  // Credits: https://github.com/caolan/async
  asyncForEachSeries : function(arr, fn, cb){
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
};

//
// Shortcuts
//
var noop = ginger.noop,
  nextTick = ginger.nextTick,
  assert = ginger.assert,
  makeArray = function(obj){return _.isArray(obj) ? obj : [obj]},
  asyncForEach = ginger.asyncForEach;

//
// Promise (Minimal promise implementation).
//
ginger.Promise = function(){
  this.callbacks = [];
  this.resolved = null;
};
_.extend(ginger.Promise.prototype,{
  then : function(cb){
    if(this.resolved){
      this._fire(cb);
    }else{
      this.callbacks.push(cb);
    }
  },
  resolve : function(){
    if(this.isAborted) return;
    this.resolved = arguments;
    this._fireCallbacks(); 
  },
  abort : function(){
    this.isAborted = true;
  },
  _fire : function(cb){
    cb.apply(this, this.resolved);
  },
  _fireCallbacks : function(){
    var len = this.callbacks.length;
    if(len>0){
      for(var i=0;i<len;i++){
        this._fire(this.callbacks[i]);
      }
    }
  }
});
ginger.PromiseQueue = function(){
  this._promises = _.toArray(arguments);
}
_.extend(ginger.PromiseQueue.prototype, {
  abort : function(){
    _.invoke(this._promises, 'abort');
  },
  then : function(cb){
    ginger.asyncForEachSeries(this._promises, function(promise, done){
      promise && promise.then(done);
    }, cb)
  }
});
ginger.TaskQueue = function(){
  this._tasks = [];
  this.endPromise = new ginger.Promise();
}
_.extend(ginger.TaskQueue.prototype, {
  /**
    Appends one or several tasks to the queue. The tasks are executed in order. A task is just a
    function with an optional callback. 
    
    Note that this call accepts also null or undefined values as inputs, they will just be ignored.
    
    TODO: 
    The callback can return an error and results.
    The result can be anything and it will be passed as input parameter to the next task.
    append(function([function(err, callback)]))    
  */
  append : function(){
    var self = this;
    if(self.isEnded){
      throw new Error("TaskQueue already ended");
    }
    self._tasks.push.apply(self._tasks, _.compact(arguments));
    self._executeTasks();
    return self;
  },
  
  //
  //  Cancels the execution of the task queue.
  //
  cancel : function(){
    this.isCancelled = true;
  },
  
  //
  // Ends this task queue. This function just mark this queue as ended,
  // so no nore tasks can be appended to it.
  end : function(){
    var self = this;
    self.isEnded = true;
    if(!self.isExecuting){
      self.endPromise.resolve();
    }
    return self;
  },
  
  //
  // Waits for this task queue to finalize processing
  //
  then : function(cb){
    this.endPromise.then(cb);
  },
  
  _executeTasks : function(){
    var self = this;
    if(self._tasks.length>0 && !self.isCancelled && !self.isExecuting){
      self.isExecuting = true;
      var fn = self._tasks.splice(0,1)[0];
      fn(function(){
        self.isExecuting = false;
        self._executeTasks();
      });
    }else if(self.isEnded || self.isCancelled){
      self.endPromise.resolve(self.isCancelled);
    }
  }
});


//
// Event Emitter
// (based on original work by Oliver Caldwell, olivercaldwell.co.uk)
// Dual licensed under the MIT or GPL Version 2 licenses.
// https://github.com/Wolfy87/EventEmitter
//
var EventEmitter = function() {};
_.extend(EventEmitter.prototype,{

  _getListeners : function(){
    this._listeners = this._listeners || {}
    return this._listeners
  },

  _getNamespaces : function(){
    this._namespaces = this._namespaces || {}
    return this._namespaces
  },

  /**
    * Assigns a listener to the specified event
    * 
    * @param {String} eventName Name of the event to assign the listener to
    * @param {Function} listener Function to be executed when the specified event is emitted
    * @returns {Object} The current instance of EventEmitter to allow chaining
    */
  on : function(eventNames, listener) {
    var events = eventNames.split(' '), listeners = this._getListeners();
  
    for(var i=0, len=events.length;i<len;i++){
      var eventAndNamespace = events[i].split('/'), event, namespace;
    
      if(eventAndNamespace.length > 1){
        namespace = eventAndNamespace[0];
        event = eventAndNamespace[1];
      }else{
        namespace = null;
        event = eventAndNamespace[0];
      }
    
      if(listeners[event]) {
        listeners[event].push(listener);
      }else{
        listeners[event] = [listener];
      }
    
      if(namespace){
        var namespaces = this._getNamespaces();
        namespaces[namespace] = namespaces[namespace] || {}
        if(namespaces[namespace][event]){
          namespaces[namespace][event].push(listener);
        }else{
          namespaces[namespace][event] = [listener];
        }
      }
    
      this.emit('newListener', event, listener);
    }
    return this;
  },

  /**
    * Emits the specified event running all listeners associated with it
    * 
    * @param {String} eventName Name of the event to execute the listeners of
    * @param {Mixed} arguments You can pass as many arguments as you want after the event name. These will be passed to the listeners
    * @returns {Object} The current instance of EventEmitter to allow chaining
    */
  emit : function(eventName) {
    var listeners = this._getListeners()
    if(listeners['*']){
      this._fire(listeners['*'], arguments)
    }
    if(listeners[eventName]){
      var args = _.rest(arguments)
      this._fire(listeners[eventName], args)
    }		
    return this
  },
  /**
    * Returns an array of listeners for the specified event name
    * 
    * @param {String} eventName Name of the event to get the listeners for
    * @returns {Array} An array of listeners for the specified event
    */
  listeners : function(eventName) {
    var listeners = this._getListeners()
    return listeners[eventName] = listeners[eventName] || [];
  },

  /**
    * Assigns a listener to the specified event removes its self after the first run
    * 
    * @param {String} eventName Name of the event to assign the listener to
    * @param {Function} listener Function to be executed when the specified event is emitted
    * @returns {Object} The current instance of EventEmitter to allow chaining
    */
  once : function(eventName, listener) {
    var self = this
  
    function wrapper() {
      self.off(eventName, wrapper);
      listener.apply(this, arguments);
    }
		return self.on(eventName, wrapper);
  },
	
  /**
    * Removes the specified listener
    * 
    * @param [{String}] eventName Name of the event to remove the listener from
    * @param [{Function}] listener Listener function to be removed
    * @returns {Object} The current instance of EventEmitter to allow chaining
    */
  off : function(eventNames, listener) {
    if(listener){
      var events = eventNames.split(' ')
      
      for(var i=0, len=events.length;i<len;i++){
        if(this._removeListener(events[i], listener)){
          break;
        }
      }
    }else{
      this.removeAllListeners(eventNames);
    }
    return this;
  },

  /**
    * Removes all listeners from the specified (namespaced) events
    * 
    * @param {String} eventName Name of the event to remove the listeners from
    * @returns {Object} The current instance of EventEmitter to allow chaining
  */
  removeAllListeners : function(eventNames) {
    var listeners = this._listeners;
  
    if(listeners){
      if(eventNames){
        var events = eventNames.split(' ')
        for(var i=0, len=events.length;i<len;i++){
          this._removeNamespacedEvent(events[i], listeners)
        }
      }else{
        delete this._listeners;
      }
    }
    return this;
  },
  
  namespace : function(namespace){
    var self = this;
    var namespaced = {
      self:self, 
      namespace:namespace, 
      on:function(event, listener){
        this.self.on(this.namespace+'/'+event, listener);
        return namespaced;
      },
      off:function(event){
        var eventName = this.namespace+'/';
        event && (eventName += event);
        this.self.off(eventName);
        return namespaced;
      }
    }
    return namespaced;
  },
  
  _fire : function(eventListeners, args){
    var listeners = [], i, len=eventListeners.length;
    for(i=0;i<len;i++){
      listeners[i] = eventListeners[i];
    }
    for(i=0; i < len; i ++) {
      listeners[i].apply(this, args);
    }
  },
  
  _removeListener : function(event, listener){
   var listeners = this._listeners, index;
     
    if(listeners && listeners[event]) { 
      index = _.indexOf(listeners[event], listener);
      if(index !== -1) {
        listeners[event].splice(index, 1);
        return true;
      }
    }
    return false;
  },

  _removeNamespacedEvent : function(event, listeners){
    var self = this, namespaces = self._namespaces, eventAndNamespace = event.split('/');
      
    if(eventAndNamespace.length === 1){
      event = eventAndNamespace[0];
      listeners && delete listeners[event]
      namespaces && delete namespaces[event];
    }else if(namespaces){
      var namespace = eventAndNamespace[0];
      event = eventAndNamespace[1];
        
      if(namespaces[namespace]){
        var _listeners;
        if(event === ''){
          var events = namespaces[namespace];
          
          _.each(events, function(listeners, event){
            for(var i=0, len=listeners.length;i<len;i++){
              self._removeListener(event, listeners[i]);
            }
          });
        }else{
          _listeners = _.union(_listeners, namespaces[namespace][event]);
          if(_listeners){
            for(var i=0, len=listeners.length;i<len;i++){
              this._removeListener(event, _listeners[i]);
            }
          }
        }
      }
    }
  }
});

/**
  Aliases
*/
EventEmitter.prototype.addListener = EventEmitter.prototype.on;
EventEmitter.prototype.addObserver = EventEmitter.prototype.on;
EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

//
// Undo Manager
//

var UndoManager = function(){
  this.undones = []
  this.actions = []
  this._undoFn = null
  this._group = null
}

_.extend(UndoManager.prototype,{
  beginUndo : function(undoFn, name){
    this._undoFn = undoFn
    this._name = name
  },
  
  endUndo : function(doFn, fn){
    this.action(doFn, this._undoFn, fn, this._name)
    this._undoFn = null
  },

  action : function(doFn, undoFn, fn, name){
    this.undones.length = 0
    name = _.isString(fn)?fn:name
    var action = {'do':doFn, undo:undoFn, fn:fn, name:name}
    if(this._group){
      this.actions.push(action)
    }else{
      this._group.push(action)
    }
    doFn(fn);
  },

  beginGroup : function(name){
    this._group = {name: name, actions:[]}
  },

  endGroup : function(){
    ;(function(group){
      this.action( function(){
        for(var i=0, len = group.length; i<len; i++){
          group[i].action['do'](group[i].action.fn)
        }
      },
      function(){
        for(var i=0, len=group.length; i<len;i++){
          group[i].action.undo(group[i].action.fn)
        }
      },
      noop,
      group.name)
    }(this._group))
  
    this._group = null
  },

  canUndo : function(){
    return this.actions.length > 0;
  },
 
  canRedo : function(){
    return this.undones.length > 0;
  },

  undo : function(){
    var action = this.actions.pop();
    if(action){
      action.undo(action.fn)
      var name = action.name || ''
      this.emit('undo', name)
      this.undones.push(action);
    }
  },

  redo : function(){
    var action = this.undones.pop();
    if(action){
      action['do'](action.fn)
      var name = action.name || ''
      this.emit('redo', name)
      this.actions.push(action);
    }
  }
});

var undoMgr = ginger.undoMgr = new UndoManager()
_.extend(undoMgr, new EventEmitter())

//------------------------------------------------------------------------------
//
// Ajax
// 
//------------------------------------------------------------------------------

var ajaxBase = function(method, url, obj, cb){
  cb = _.isFunction(obj) ? obj : cb;
  obj = _.isFunction(obj) ? undefined : JSON.stringify(obj);
  return {
    type:method,
    url:url,
    data:obj,
    contentType:'application/json',
    dataType:'json',
    success:function(data, textStatus, jqXHR){
      cb(null, data)
    },
    error:function(jqXHR, status, errorThrown){
      cb(jqXHR)
    }
  }
}
var ajax = ginger.ajax = {
  get:function(url, obj, cb){
    return $.ajax(ajaxBase('GET', url, obj, cb))
  },
  put:function(url, obj, cb){
    return $.ajax(ajaxBase('PUT', url, obj, cb));
  },
  post:function(url, obj, cb){
    return $.ajax(ajaxBase('POST', url, obj, cb));
  },
  del:function(url, obj, cb){
    return $.ajax(ajaxBase('DELETE', url, obj, cb));
  }
}

//------------------------------------------------------------------------------
//
// Storage
// (requires localStorage)
//------------------------------------------------------------------------------

/**  
  Storage should be a generic storage that will always try to save on server
  if possible, if not enqueue the operation and try to save it at a later time.
  It always caches the reads and writes of data so that it can work in offline
  mode.
*/
var Storage = ginger.Storage = {};

// Rename to translateId
Storage.moved = function(bucket, oldId, newId){
  localCache.setItem(bucket+'@'+oldId, JSON.stringify(bucket+'@'+newId));
}
// Rename to save
Storage.create = function(bucket, args, cb){
  localCache.setItem(bucket+'@'+args.cid, JSON.stringify(args));
  cb && cb();
}
Storage.findById = function(bucket, id, cb){
  Storage._findById(bucket+'@'+id, cb);
}
Storage._findById= function(key, cb){
  var doc = localCache.getItem(key);

  if (doc){
    doc = JSON.parse(doc);
    // Translate?
    if (_.isString(doc)){
      Storage._findById(doc, cb);
    } else {
      if (doc.__persisted){
        doc._id = doc.cid;  // unsure why this is still needed...
      }
      cb(null, doc);
    }
  } else {
    cb(new Error('No local object available'));  
  }
}
Storage.all = function(bucket, parent){ //OBSOLETE?
  var collection = []
  var keys = Storage._subCollectionKeys(bucket, parent)
  if(keys){
    for (var i=0, len=keys.length;i<len;i++){
      var obj = localCache.getItem(keys[i]);
      if(obj){
        collection.push(JSON.parse(obj))
      }else{
        localCache.removeItem(keys[i])
      }
    }
  }else{
    for (var i=0, len=localStorage.length;i<len;i++){
      var key = localStorage.key(i)
      if(key.split('@')[0] === bucket){
        collection.push(JSON.parse(localStorage[key]))
      }
    }
  }
  return collection
}

// Note: This works because Storage is not asynchronous (and atomic).
// Missing error reporting.
Storage.find = function(bucket, id, collection, cb){
  Storage.findById(bucket, id+'@'+collection, function(err, items){
    var result = [];
    items = items || [];
    for (var i=0, len=items.length;i<len;i++){
      Storage._findById(items[i], function(err, doc){
        doc && result.push(doc)
      });
    }
    cb(err, result);
  });
}
Storage.first = function(bucket, parent){
  var keys = Storage._subCollectionKeys(bucket, parent)
  if(keys){
    return localCache.getItem(keys[0]);
  }else{
    return localCache.each(function(key){
      var s = key.split('@'); 
      if((s[0] === bucket) && (s.length == 2)){
        var doc = JSON.parse(localCache.getItem(key))
        doc._id = doc.cid;
        return doc;
      }
    });
  }
}
Storage.update = function(bucket, id, args, cb){
  Storage.findById(bucket, id, function(err, obj){
    // we safely ignore errors here
    obj = obj || {cid:id};
    _.extend(obj, args)
    Storage.create(bucket, obj, cb);
  })
}
Storage.collection = function(bucket, id, collection, items){
  Storage._collection(bucket, id, collection,
    _.map(items, function(item){return collection+'@'+item.cid}));
}
Storage._collection = function(bucket, id, collection, items){
  localCache.setItem(bucket+'@'+id+'@'+collection, JSON.stringify(items));
}
// FIXME: the collection in the key and the collection in the array could be different...
Storage.add = function(bucket, id, collection, ids, cb){
  Storage.findById(bucket, id+'@'+collection, function(err, items){
    items = items || [];
    if(_.isArray(ids)){
      items = _.union(items, _.map(ids, function(id){return collection+'@'+id}));
    }else{
      items = _.union(items, [collection+'@'+ids]);
    }
    Storage._collection(bucket, id, collection, items);
    cb && cb();
  });
}
Storage.remove = function(bucket, id, collection, ids, cb){
  var keys;
  if(_.isFunction(collection)){
    localCache.removeItem(bucket+'@'+id);
    collection();
  }else{
    Storage.findById(bucket, id+'@'+collection, function(err, items){
      if (!err){
        if(_.isArray(ids)){
          keys = _.map(ids, function(id){return collection+'@'+id});
        }else{
          keys = [collection+'@'+ids];
        }
        items = _.difference(items, keys);
        Storage._collection(bucket, id, collection, items);
      }
      cb(err);
    });
  }
}
Storage._subCollectionKeys = function(bucket, parent){
  if(parent){
    var value = localCache.getItem(parent.__bucket+':'+parent.cid+':'+bucket);
    return value ? JSON.parse(value):null
  }
  return null
}
//
var ServerStorage = ginger.ServerStorage = {}

ServerStorage.local = Storage;

/**
  Add should accept models. 
  If the model has an _id then we send the complete object.

*/

function appendQuery(url, query){
  var q = Model.urlQuery(url)
  if(query){
    q = _.extend(q, query);
  }
  if(!_.isEmpty(q)){
    return url + '?' + $.param(q);
  }else{
    return url;
  }
}

// AJAX IS DEPRECATED.
ServerStorage.ajax = {
  create: function(bucket, args, cb){
    url = appendQuery(Model.url+'/'+bucket);
    ajax.post(url, args, cb);
  },
  find:function(bucket, id, collection, query, cb){
    var url = Model.url;
    if(bucket) url += '/' + bucket;
    if(id) url += '/'+id;
    if(collection) url += '/'+collection;
    url = appendQuery(url, query);
    ajax.get(url, cb);
  },
  findById:function(bucket, id, cb){
    ajax.get(appendQuery(Model.url+'/'+bucket+'/'+id), cb);
  },
  update:function(bucket, id, args, cb){
    ajax.put(appendQuery(Model.url+'/'+bucket+'/'+id), args, cb);
  },
  add:function(bucket, id, collection, items, cb){
    if(items){
      ajax.put(appendQuery(Model.url+'/'+bucket+'/'+id+'/'+collection), items, cb);
    }else{
      cb();
    }
  },
  remove:function(bucket, id, collection, objIds, cb){
    if(_.isFunction(collection)){
      ajax.del(Model.url+'/'+bucket+'/'+id, collection);
    } else if(objIds.length>0){
      ajax.del(Model.url+'/'+bucket+'/'+id+'/'+collection, objIds, cb);
    }else{
      cb();
    }
  },
  count:function(bucket, cb){
    cb();
  }
}

function safeEmit(socket){
  var cb = _.last(arguments), args = _.rest(arguments);
   
  function errorFn(){
    cb(new Error('Socket disconnected'));
  };
  function proxyCb(err, res){
    Model.socket.removeListener('disconnect', errorFn);
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

ServerStorage.socket = {
  create: function(bucket, args, cb){
    var wrapCb = function(err, id){
      if(err){
        Storage.create(bucket, args, function(err){
          !err && storageQueue.createCmd('socket', bucket, args.cid, args);
          cb(err, id);
        });
      }else{
        assert(id, 'Missing object ID after successful creation');
        args.cid = args._id = id;
        args.__persisted = true;
        Storage.update(bucket, id, args);
        cb(err, id);
      }
    }
    this._create(bucket, args, wrapCb);
  },
  _create: function(bucket, args, cb){
    safeEmit(Model.socket, 'create', bucket, args, function(err, id){
      id && ginger.emit('created:'+args.cid, id);
      cb(err, id);
    });
  },
  find:function(bucket, id, collection, query, cb){
    var wrapCb = function(err, items) {
      if (err){
        Storage.find(bucket, id, collection, cb);
      } else {
        if(items.length){
          var ids = [], args;
          collection = collection || bucket;
          for(var i=0, len=items.length;i<len;i++){
            args = items[i];
            args.cid = args._id || args.cid;
            args.__persisted = true;
            ids.push(args.cid);
            Storage.update(collection, args.cid, args);// we safely ignore errors.
          }
          id && Storage.add(bucket, id, collection, ids);
        }
        cb(null, items);
      }
    }
    safeEmit(Model.socket,'find', bucket, id, collection, query, wrapCb);
  },
  findById:function(bucket, id, cb){
    var wrapCb = function(err, item) {
      if (err||!item){
        Storage.findById(bucket, id, cb);
      } else {
        item.cid = id;
        item.__persisted = true;
        Storage.update(bucket, id, item, function(err){
          cb(err, item);
        });
      }
    }
    safeEmit(Model.socket,'read', bucket, id, wrapCb);
  },
  update:function(parent, parentId, bucket, id, args, cb){
    if(arguments.length===4){
      cb = id; args = bucket; id = parentId; bucket = parent;
      safeEmit(Model.socket, 'update', bucket, id, args, cb);
    }else if (arguments.length === 6){
      safeEmit(Model.socket, 'embedded:update', parent, parentId, 
                        bucket, id, args, cb);
    }
  },
  add:function(bucket, id, collection, items, cb){
    var wrapCb = function(err, ids) {
      Storage.add(bucket, id, collection, items, function(err2){
        err && storageQueue.addCmd('socket', bucket, id, collection, items);
        cb(err2, ids);  
      });
    }
    ServerStorage.socket._add(bucket, id, collection, items, wrapCb);
  },
  _add:function(bucket, id, collection, items, cb){
    safeEmit(Model.socket,'add', bucket, id, collection, items, cb);
  },
  remove:function(bucket, id, collection, items, cb){
    if(arguments.length==3){
      safeEmit(Model.socket,'remove', bucket, id, collection);
    }else{
      var wrapCb = function(err, ids) {
        Storage.remove(bucket, id, collection, items, function(err2){
          err && storageQueue.removeCmd('socket', bucket, id, collection, items);
          cb(err2, ids);
        });
      }
      ServerStorage.socket._remove(bucket, id, collection, items, wrapCb);
    }
  },
  _remove:function(bucket, id, collection, items, cb){
    safeEmit(Model.socket,'remove', bucket, id, collection, items, cb);
  },

  count:function(bucket, cb){
    cb(); 
  }
}

//
// Global events
//

_.extend(ginger, new EventEmitter())

//
// Key Handling
//
function keyToString(key){
  switch (key) {
    case 8:  return 'backspace';
    case 13: return 'enter';
    case 20: return 'caps';
    case 27: return 'esc';
    case 32: return 'space';
    case 37: return 'left';
    case 38: return 'up';
    case 39: return 'right';
    case 40: return 'down';
    default: 
      return String.fromCharCode(key).toLowerCase();
  }
}
function keyEventToString(event){
  var keys = [];
  
  event.shiftKey && keys.push('shift');
  event.ctrlKey && keys.push('ctrl');
  event.altKey && keys.push('alt');
  event.metaKey && keys.push('meta');
  
  keys.push(keyToString(event.which));
  
  return keys.join(':');
}
$(document).keydown(function(event){
  ginger.emit('keydown:'+keyEventToString(event))
}).keyup(function(event){
  ginger.emit('keyup:'+keyEventToString(event))
})

//
// Classes
//

function Inherit(Sub, Super){
  var newSub = Object.create(Super.prototype)
  newSub.constructor = Sub
  Sub.prototype = newSub
  Sub.superproto = Super.prototype

  // TODO: try to deprecate klass
  Sub.prototype.super = function(klass, fn){
    //console.log(arguments.callee.caller === klass);
    return klass.superproto[fn||'constructor'].apply(this, _.rest(arguments, 2));
  }
}

/**
  Declare(Super, [constructor{Function}|methods{Object}, statics{[Function]}, bucket{String}]);
*/
var Declare = ginger.Declare = function(Super, Sub, staticOrName, bucket){
  var methods;
  
  if(_.isObject(Sub)&&!_.isFunction(Sub)){
    methods = Sub;
    if(methods.constructor != Object){
      Sub = methods.constructor;
    }else{
      Sub = null;
    }
  }else if(_.isString(Sub)){
    bucket = Sub;
    Sub = null;
  }
  
  if(!Sub){
    Sub = function Gnd(){
      var self = this;
      if(!(self instanceof Gnd)){
        return new Gnd(arguments);
      }else{
        return Super.prototype.constructor.apply(self, arguments);
      }
    };
  }
  _.extend(Sub, Super);
  Inherit(Sub, Super);
  
  _.extend(Sub.prototype, methods);
  if(staticOrName){
    if(_.isObject(staticOrName)){
      _.extend(Sub, staticOrName);
    }else{
      bucket = staticOrName
    }
  }
  bucket && Sub.bucket(bucket);
  return Sub
}

//
//  Base Class - All Ginger classes derive from this one.
//
var Base = ginger.Base = function Base(){
  if(!(this instanceof Base)){
    return new Base();
  }
  this._refCounter = 1;
  this._bindings = {};
}

// Extend 
_.extend(Base.prototype, EventEmitter.prototype);

Base.extend = function(Sub, staticOrName, bucket){
  return Declare(this, Sub, staticOrName, bucket);
}

//
// Listening to changed Properties are just expressed as the property name
// All other events should end with : (changed:), (clicked:), etc.

// This is experimental stuff for now. (As far as we now, it works)
/*
Base.prototype.on = function(eventNames, listener){
  var events = eventNames.split(' '),
      self = this,
      prop, pprop;
      
  for(var i=0, len=events.length;i<len;i++){
    prop = events[i].split(':')
    if(prop.length===1){
      prop = prop[0]
      var desc = Object.getOwnPropertyDescriptor(self, prop)
      if (desc && !desc.set){
        pprop = '_'+prop
        self[pprop] = self[prop]
        Object.defineProperty(self, prop, {
          set:_.bind(self.set, self, pprop),
          get:function(){return self[pprop]}
          });
        
        console.log(typeof self[prop])
      }
    }
  }
  return EventEmitter.prototype.on.apply(this, arguments);
}
*/

/**
  set - Sets a property and notifies any listeners attached to it if changed.
*/
Base.prototype._set = function(keypath, val, options){
  var path = keypath.split('.'), obj = this, len=path.length-1, key = path[len];
  
  for(var i=0;i<len;i++){
    var t = obj[path[i]];
    if (!t){
      obj = obj[path[i]] ={};
    }else{
      obj = t;
    }
  }
  
  if((_.isEqual(obj[key], val) == false) || (options && options.force)){
    var oldval = obj[key],
      val = this.willChange ? this.willChange(key, val):val;
    obj[key] = val
    this.emit(keypath, val, oldval, options)
    return true
  }else{
    return false
  }
}
Base.prototype.set = function(keyOrObj, val, options){
  var changed = false, obj, self = this;
  
  if(typeof keyOrObj == 'object'){
    options = val;
    obj = keyOrObj;
    _.each(obj, function(val, key){
      changed = self._set(key, val, options)?true:changed;
    });
  }else{
    changed = self._set(keyOrObj, val, options)
  }
  if(changed){
    if(!obj){
      obj = {}
      obj[keyOrObj] = val;
    }
    self.emit('changed:', obj, options);
  }
  return this;
}
Base.prototype.willChange = function(key, val){
  return val;
}

/**
  get - Gets a property. Accepts key paths for accessing deep properties.
*/
Base.prototype.get = function(key){
  var path = key.split('.'), result;
  
  result = this[path[0]];
  for(var i=1, len=path.length;i<len;i++){
    if(!_.isObject(result)) break;
    result = result[path[i]];
  }
  return result;
}
/**
 * bind - Creates a binding between two keys.
 * 
 * @param {String} key Key to bind in the source object
 * @param {Object} object Target object to bind this objects key
 * @param [{String}] objectKey The key in the destination object to bind the key
 *
 * Note: If the keys have different values when binding, the caller will get
 * the value of the target object key
 */
Base.prototype.bind = function(key, object, objectKey){
  var dstKey = objectKey || key

  this.unbind(key)
  
  var dstListener = _.bind(object.set, object, dstKey)
  this.on(key, dstListener)
  
  var srcListener = _.bind(this.set, this, key)
  object.on(dstKey, srcListener)
  
  this._bindings[key] = [dstListener, object, dstKey, srcListener];
  
  // sync
  this.set(key, object[dstKey])
  
  return this
}
/**
  unbind - Removes a binding.

*/
Base.prototype.unbind = function(key){
  var bindings = this._bindings
  if( (bindings!=null) && (bindings[key]) ){
    var binding = bindings[key]
    this.removeListener(key, binding[0])
    binding[1].removeListener(binding[2], binding[3])
    delete bindings[key]
  }
}
Base.prototype.format = function(property, fn){
  if(arguments.length==1){
    if(_.isObject(property)){
      if(!this._formatters){
        this._formatters = {};
      }
      _.extend(this._formatters, property);
    } else if((this._formatters)&&(property in this._formatters)){
      var val = this.get(property);
      if(_.isFunction(val)){
        val = val.call(this);
      }
      return this._formatters[property].call(this, val);
    }else{
      return this.get(property);
    }
  }else{
    if(!this._formatters){
      this._formatters = {};
    }
    this._formatters[property] = fn;
  }
}
/**
  Begins an undo operation over setting a given key to a value.
*/
Base.prototype.beginUndoSet = function(key, name){
  var base = this
  ;(function(value){
    undoMgr.beginUndo(function(){
      base.set(key, value)
  }, name)}(this[key]))
}
/**
  Ends an undo operation over setting a given key to a value.
*/
Base.prototype.endUndoSet = function(key, fn){
  var base = this
  ;(function(value){
    undoMgr.endUndo(function(){
      base.set(key, value)
  })}(this[key]))
}
/**
  Sets a key value while registering it as an undo operation
*/
Base.prototype.undoSet = function(key, value, fn){
  this.beginUndoSet(key)
  this.set(key, value)
  this.endUndoSet(key, fn)
}
Base.prototype.destroy = function(){
  this.off();
  // We should nullify this object.
}
Base.prototype.retain = function(){
  if(this._destroyed){
    console.log(new Error("Cannot retain destroyed object"));
  }
  this._refCounter++;
  return this;
}
Base.prototype.release = function(){
  this._refCounter--;
  if(this._refCounter===0){
    this.emit('destroy:');
    this.destroy();
    this._destroyed = true;
    this._destroyedTrace = new Error().stack;
  }else if(this._refCounter < 0){
    var msg;
    if(this._destroyed){
      msg = "Object has already been released";
      if(this._destroyedTrace){
        msg += '\n'+this._destroyedTrace;
      }
      throw new Error(msg);
    }else{
      msg = "Invalid reference count!";
    }
    throw new Error(msg);
  }
  return this;
}
Base.prototype.isDestroyed = function(){
  return this._refCounter === 0;
}

/**
  Local Storage Cache.
  
  This Object spawns a cache mechanism on top of the Local Storage.
  
  It acts as a middle layer between the local storage and the user.
  Every key written includes a timestamp that is later used for 
  the LRU replacement policy.
  
  The API mimics local storage API so that it is as interchangeble
  as possible, the main differences is that instead of key() it 
  provides each() for faster iteration, and there are no getters
  and setters using [] syntax, it just provides getItem and setItem.
  
  Impl. Notes:
  The Cache keeps a map object for quick translation of given
  key to special key+timestamp in the local storage.
  This cache is converted to an array and sorted when room
  is needed. This conversion is a candidate for optimization.
*/
var ls = localStorage;

var Cache = ginger.Base.extend({
  constructor : function Cache(maxSize){ 
    this.super(Cache);
    this._populate();
    this._maxSize = maxSize || 5*1024*1024;
  },
  each:function(cb){
    var result;
    for(var key in this.map){
      result = cb(key);
      if(result) return result;
    }
  },
  getItem:function(key){
    var old = this.map[key], value;
    if(old){
      value = ls[this._key(key, old.time)];
      this.setItem(key, value); // Touch to update timestamp.
    }
    return value;
  },
  setItem:function(key, value){
    var time = Date.now(), old = this.map[key], requested = value.length;
    
    if(old){
      requested -= old.size;
    }
    if(this._makeRoom(requested)){
      this.size += requested;
    
      ls[this._key(key, time)] = value;

      if(old){
        // Avoid remove the set item
        if(old.time != time){ 
          this._remove(key, old.time);
        }
      }else{
        this.length++;
      }
      this.map[key] = {time:time, size:value.length};
    }
  },
  removeItem:function(key){
    var item = this.map[key];
    if(item){
      this._remove(key, item.time);
      this.size -= item.size;
      delete this.map[key];
      this.length--;
    }
  },
  clear:function(){
    for(var key in this.map){
      this.removeItem(key);
    }
    this.length = 0;
    this.size = 0;
  },
  setMaxSize:function(size){
    this._maxSize = size;
  },
  _key:function(key, timestamp){
    return key+'|'+timestamp;
  },
  _remove:function(key, timestamp){
    var key = this._key(key,timestamp);
    delete ls[key];
  },
  _populate:function(){
    var i, len, key, s, k, size;
    this.size = 0;
    this.map = {};
    for (i=0, len=ls.length;i<len;i++){
      key = ls.key(i);
      if (key.indexOf('|') != -1){
        size = ls[key].length;
        s = key.split('|');
        // avoid possible duplicated keys due to previous error
        k = s[0];
        if(!this.map[k] || this.map[k].time > s[1]){
          this.map[k] = {time : s[1], size : size}
        }
        this.size += size;
      }
    }
    this.length = _.size(this.map);
  },
  // Remove items until required size available
  _makeRoom:function(size){
    var target = this._maxSize - size;
    if(this.size > target){
      if(target<0){
        return false;
      }else{
        // TODO: We need to optimize this.(move to populate and keep sorted in order).
        var list = _.map(this.map, function(item, key){return {time:item.time, key:key}});
        var sorted = _.sortBy(list, function(item){return item.time;});
        var index = sorted.length-1;
    
        while ((this.size > target) && (index >= 0)){
          this.removeItem(sorted[index--].key);
        }
      }
    }
    return true;
  }
});

// We can only have one local cache.
var localCache = ginger.localCache = new Cache();

//------------------------------------------------------------------------------
// Local Model Queue
// This Object is used...
//------------------------------------------------------------------------------
var Queue = ginger.Base.extend({
  'constructor' : function Queue(args){
    var self = this;
    self.super(Queue);
  
    var savedQueue = ls.storageQueue;
    
    self._queue = (savedQueue && JSON.parse(savedQueue)) || [];
    self._createList = {};
    self._syncFn = _.bind(self.synchronize, self);
  },
  init : function(socket){
    socket.removeListener('connect', this._syncFn);
    socket.on('connect', this._syncFn);
  },
  queue:function(queue){
    this._queue = queue;
  },
  add:function(obj){
    //OPTIMIZATION: MERGE UPDATES FOR A GIVEN ID TOGETHER INTO ONE UPDATE.
    this._queue.push(obj);
    ls.storageQueue = JSON.stringify(this._queue);
  },
  createCmd:function(transport, bucket, id, args){
    this.add({cmd:'create',bucket:bucket,id:id,args:args,transport:transport});
  },
  updateCmd:function(transport, bucket, id, args){
    this.add({cmd:'update',bucket:bucket, id:id, args:args,transport:transport});
  },
  deleteCmd:function(transport, bucket, id){
    this.add({cmd:'delete', transport:transport, bucket:bucket, id:id});
  },
  addCmd:function(transport, bucket, id, collection, items){
    this.add({bucket:bucket, id:id,cmd:'add', transport:transport, collection:collection,items:items});
  },
  removeCmd:function(transport, bucket, id, collection, items){
    this.add({bucket:bucket, id:id, cmd:'remove', transport:transport, collection:collection,items:items});
  },
  updateIds:function(oldId, newId){
    _.each(this._queue, function(obj){
      if (obj.id == oldId){
        obj.id = newId;
      } 
      if (obj.items && obj.items == oldId){
        obj.items = newId;
      }
    });
    ls.storageQueue = JSON.stringify(this._queue);
  },
  success:function(err) {
    this._currentTransfer = null;
    if(!err || (err.status >= 400 && err.status < 500)){
      this._queue.shift();
      
      // Note: since we cannot have an atomic operation for updating the server and the
      // execution queue, the same command could be executed 2 or more times.
      ls.storageQueue = JSON.stringify(this._queue);
      nextTick(_.bind(this.synchronize, this));
    }
  },
  synchronize:function(){
    var self = this, done = _.bind(self.success, self);
    
    if (!self._currentTransfer){
      if (self._queue.length){
        var obj = self._currentTransfer = self._queue[0],
          store = ServerStorage[obj.transport];
        
        (function(cmd, bucket, id, items, collection, args){
          // FIXME: Persistent errors will  block the queue forever.(we need a watchdog).
          switch (cmd){
            case 'add':
              store._add(bucket, id, collection, items, done);
              break;
            case 'remove':
              store._remove(bucket, id, collection, items, done);
              break;
            case 'update':
              store.update(bucket, id, args, done);
              break;
            case 'create':
              store._create(bucket, args, function(err, sid){
                if (err){
                  done(err);
                } else {
                  args.cid = sid;
                  Storage.create(bucket, args, function(){
                    Storage.moved(bucket, id, sid);
                    self.updateIds(id, sid);
                    done();
                  });
                }
              });
              break;
            case 'delete':
              store.remove(bucket, id, done);
              break;
          }
        })(obj.cmd, obj.bucket, obj.id, obj.items, obj.collection, obj.args);
        
      } else {
        ginger.emit('inSync:', self);
        self.emit('synced:', self);
      }
    } else{
      console.log('busy with ', self._currentTransfer);
    }
  }
});

//------------------------------------------------------------------------------
//
// Utility Classes
//
//------------------------------------------------------------------------------

/**
  Interval
  
  Self-correcting Accurate Timer (+/- 1ms accuracy).
  
  Listen to 'time' property for getting the current time at the given
  resolution.
  
  The timer will emit a ended: event when the timer has reached its duration,
  and 'stopped:' if the timer was stopped by the user.
  
  TODO: Rename to Timer.
*/
var Interval = ginger.Interval = Base.extend(function Interval(resolution){
  this.super(Interval);
  this.time = 0;
  this._timer = null;
  this._resolution = resolution;
});

_.extend(Interval.prototype, {
  destroy : function(){
    this.stop();
    this.super(Interval, 'destroy');
  },
  
  /**
    start(resolution, duration)
    
    Starts a new timer with the given optionally duration in milliseconds.
  */
  start : function(duration){
    clearTimeout(this._timer);
    if(duration){
      this.duration = duration;
      this._baseline = Date.now();
    }
    this.duration && this._iter();
  },
  isRunning : function(){
    return (this._timer!==null);
  },
  stop : function(){
    clearTimeout(this._timer);
    this._timer = null;
    this.emit('stopped:', this._baseline);
  },
  _iter : function(){
    var self = this, 
      error = Date.now() - self._baseline;
  
    if(self.time >= self.duration){
      self.stop();
      self.emit('ended:', self._baseline);
    }else{
      var nextTick = self._resolution - error;
      self._timer = setTimeout(function(){
        self.set('time', self.time + self._resolution);
        self._baseline += self._resolution;
        self._iter();
      }, nextTick>=0 ? nextTick:0);
    }
  }
});

//------------------------------------------------------------------------------
//
// Models
// TODO: Change .cid to .id() to avoid serialization. (and only keep a _id
// that can be a client id or server id depending on the __persisted property).
//------------------------------------------------------------------------------

/**
  This object keeps models synchronized with the server.
*/
var SyncManager = Base.extend({
  constructor: function SyncManager(){
    var self = this;
    self.objs = {}; // {id:[model, ...]}
    
    this._connectFn = function(){
      // Call resync for all models in this manager...
      _.each(self.objs, function(models, id){
        var model = models[0];
        
        // we need to re-sync here since we have a new socket sid.(TODO: integrate in resync).
        self._socket.emit('sync', id);
        
        safeEmit(self._socket, 'resync', model.__bucket, id, function(err, doc){
          if(!err){
            doc && (delete doc.cid); // Hack needed since cid is almost always outdated in server.
            for(var i=0, len=models.length;i<len;i++){
              models[i].set(doc, {sync:'false'});
              models[i].id(id);
            }
            model.local().update(doc);
          } else {
            console.log('Error resyncing %s@%s, %s', model.__bucket, id, err)
          }
        });
      });
    }
  },
  init: function(socket){
    this._socket = socket;
    socket.on('connect', this._connectFn);
   // socket.on('reconnect', this._connectFn);
  },
  deinit: function(){
    var socket = this._socket;
    if(socket){
      socket.removeListener('connect', this._connectFn);
      socket.removeListener('reconnect', this._connectFn);
    }
  },
  startSync: function(model){
    var self = this, id = model.id(), socket = this._socket;

    if(model.transport() !== 'socket') return;
    
    if(!self.objs[id]){
      self.objs[id] = [model];
      socket.emit('sync', id);
      console.log('Start synching:'+id);
      socket.on('update:'+id, function(doc){
        _.each(self.objs[id], function(model){
          model.set(doc, {sync:false, doc:doc});
          model.local().update(doc);
        });
      });
      socket.on('delete:'+id, function(){
        _.each(self.objs[id], function(model){
          model.local().remove();
          model.emit('deleted:', id);
        });
      });
    }else{
      self.objs[id].push(model);
    }
  },
  endSync: function(model){
    if (!model._keepSynced) return;
    
    var socket = this._socket, id = model.id(), models = this.objs[id];
    
    if(models){
      models = _.reject(models, function(item){return item === model;});
      if(models.length===0){
        console.log('Stop synching:'+id);
        socket.emit('unsync', id);
        socket.removeAllListeners('update:'+id);
        socket.removeAllListeners('delete:'+id);
        delete this.objs[id];
      }else{
        this.objs[id] = models;
      }
    }
  }
});

/**
  An abstract class representing a synchronizable object.
*/
var Synchronizable = ginger.Synchronizable = Base.extend({
  /**
    KeepSynced - Enables/Disables synchronization.
  */
  keepSynced: noop,
  shouldSync: noop,
  update: noop,
});

var Model = ginger.Model = Base.extend(function Model(args){
  this.super(Model);
  
  _.extend(this, args);

  _.defaults(this, {
    __persisted:false,
    __rev:0,
    __dirty:false,
    __transport : Model.__transport,
    __bucket : this.__bucket || this.constructor.__bucket,
    _socket:Model.socket,
    _embedded:false
  });

  this.cid = this._id || this.cid || ginger.uuid();
},
{
  States : {
    INSTANCED:0,    // INSTANCED It has been instantiated but not yet persisten in local nor server storage.
    CREATED:1,     // CREATED but its not yet persistent.
    PERSISTENT:2   // PERSISTENT, there is a copy in the server.
  },
  syncManager : new SyncManager(),
  create : function(args, keepSynced, cb){
    if(_.isFunction(keepSynced)){
      cb = keepSynced;
    }
    var self = this;
    if(args){
      this.fromJSON(args, function(err, instance){
        if(instance){
          _.defaults(instance, {__bucket:self.__bucket});
          if(keepSynced == true){
            instance.keepSynced();
          }
          instance.init(function(){
            cb(null, instance);
          })
        }else{
          cb(err);
        }
      })
    }else{
      cb();
    }
    return this;
  },
  transport : function(transport){
    if(transport){
      this.__transport = transport;
    }
    return this.__transport || 
           Model.__transport ||
           (this.socket?'socket':Model.socket?'socket':this.url?'ajax':Model.url?'ajax':'local');
  },
  use : function(attr, value){
    switch(attr){
      case 'transport':
        value = (value==='ajax')||(value=='socket')?value:undefined;
        this.__transport = this.prototype.__transport = value;
        break;
    }
    return this;
  },
  set : function(attr, value){
    switch(attr){
      case 'socket': 
        this.socket = value;
        value && storageQueue.init(value);
        value && this.syncManager.init(value);
        break;
      case 'url': 
        this.url = value;
        break;
    }
    return this;
  },
  bucket : function(bucket){
    this.__bucket = this.prototype.__bucket = bucket
    return this;
  },
  update : function(id, args, cb){
    // TODO Implement.
  },
  /**
    findById(id, cb)
    findById(id, keepSynced, cb)
    findById(id, args, cb)
    findById(id, keepSynced, args, cb)
  */
  findById : function(id, keepSynced, args, cb){
    switch(arguments.length){
      case 2:
        cb = keepSynced;break;
      case 3:
        cb = args;
        if(_.isObject(keepSynced)){
          args = keepSynced;
        }else{
          args = undefined;
        }
        break;
    }
    var self = this, bucket = self.__bucket, transport = self.transport(),
      instantiate = function(doc, args, cb){
        args && _.extend(doc, args);
        self.create(doc, keepSynced, cb)
      }
    ServerStorage[transport].findById(bucket, id, function(err, doc){
      if(doc){
        instantiate(doc, args, cb);
      }else{
        cb(err);
      }
    })
    return this;
  },
  /*
    fetch(cb)
    fetch(query, cb)
    fetch(bucket, id, cb)
    fetch(bucket, id, query, cb)
    fetch(bucket, id, collection, cb)
    fetch(bucket, id, collection, query, cb)
  */
  fetch : function(bucket, id, collection, query, cb){
    switch(arguments.length){
      case 1:
        cb = bucket; 
        bucket = this.__bucket;
        break;
      case 2: 
        query = bucket;
        cb = id;
        id = undefined;
        bucket = this.__bucket;
        break;
      case 3:
        cb = collection;
        query = undefined;
        break;
      case 4:
        cb = query;
        if(_.isObject(collection)){
          query = collection;
          collection = undefined;
        }else{
          query = undefined;
        }
        break;
    }
    ServerStorage[this.transport()].find(bucket, id, collection, query, cb);
  },
  all : function(cb, parent, args, altBucket){
    var self = this, bucket, id, collection;
    if(_.isFunction(parent)){
      var tmp = cb;
      cb = parent;
      parent = tmp;
    }
    
    if(parent){
      bucket = parent.__bucket;
      id = parent.id();
      collection = altBucket || this.__bucket;
    }else{
      bucket = this.__bucket;
    }
    
    this.fetch(bucket, id, collection, function(err, docs){
      if(docs){
        args && _.each(docs, function(doc){_.extend(doc, args)});
        Storage.collection(bucket, id, collection, docs)
        Collection.instantiate(self, parent, docs, cb);
      }else{
        cb(err);
      }
    });
    
    return this;
  },
  first : function(fn, parent){
    this.local().first(fn, parent)
  },
  local : function(){
    if(!this._local){
      var self = this, bucket = this.__bucket;
      this._local = {
        findById : function(id, cb){
          self.create(Storage.findById(bucket, id), cb)
        },
        // OBSOLETE?
        all: function(cb, parent){
          var collection = Storage.all(bucket, parent)
          Collection.instantiate(self, parent, collection, cb)
        },
        first: function(cb, parent){
          self.create(Storage.first(bucket, parent), cb);
        }
      }
    }
    return this._local
  },
  fromJSON : function(args, cb){
    cb(null, new this(args));
  },
  fromArgs : function(args, cb){
    cb(null, new this(args));
  }
})

_.extend(Model.prototype,{
  destroy : function(){
    Model.syncManager.endSync(this);
    this.super(Model, 'destroy');
  },
  id : function(id){
    if(id){
      this.cid = this._id = id;
      this.__persisted = true;
      this.emit('id', id);
    }
    return this._id || this.cid;
  },
  isPersisted : function(){
    return this.__persisted || this._id;
  },
  transport : function(transport){
    if(transport){
      this.__transport = transport;
    }
    return this.__transport || Model.transport();
  },
  key : function(){
    return this.__bucket+':'+this._id
  },
  init : function(fn){
    fn(this)
  },
  local : function(){
    if(this._local){
      return this._local
    }else{
      var self = this,
        bucket = self.__bucket;
      self._local = {
        save : function(){
          Storage.create(bucket, self.toJSON())
        },
        update: function(args){
          Storage.update(bucket, self.id(), args, noop)
        },
        remove: function(){
          Storage.remove(bucket, self.id(), noop)
        }
      }
      return this._local
    }
  },
  /**
    Model#all (model, [args{Object}, bucket{String}], cb);
  */
  all : function(model, args, bucket, cb){
    if(_.isString(args)){
      this._all2(model, args, bucket);
    }else if(_.isFunction(bucket)){
      this._all3(model, args, bucket);
    }else if(_.isFunction(args)){
      model.all(args, this);
    }else{
      model.all(cb, this, args, bucket);
    }
  },
  _all2 : function(model, bucket, cb){
    model.all(cb, this, undefined, bucket)
  },
  _all3 : function(model, args, cb){
    model.all(cb, this, args)
  },
  toArgs : function(){
    var args = {__persisted:this.__persisted};
    for(var key in this){
      if(!_.isUndefined(this[key]) &&  
         !_.isNull(this[key]) &&
         (key[0] !== '_') && 
         !_.isFunction(this[key])){
        if(_.isFunction(this[key].toArgs)){
          args[key] = this[key].toArgs();
        }else if(!_.isObject(this[key])){
          args[key] = this[key]
        }
      }
    }
    return args
  },

// TODO: Add a __dirty flag so we do not save unncessarily.
// this flag a easily be maintained by listening to the changed: event.
  save : function(transport, cb){
    this.update(this.toArgs(), transport, cb);
  },
  /*
    Updates a model with the given args and optional transport mechanism.

    update(args, [transpor, cb])
  
    TODO: This method needs to be throtled so that it does not call the
    server too often. Therefore it should queue the calls and merge the
    arguments (could be implemented at Storage Queue).
  */
  update : function(args, transport, cb){
    if(_.isFunction(transport)){
      cb = transport;
      transport = null;
    }
    transport = transport || this.transport();
  
    var self = this, bucket = self.__bucket, store = ServerStorage[transport];
    
    cb = cb || noop;

    if(self.isPersisted()){
      if(self._embedded){
        var parentBucket = self.parent.__bucket;
        store.update(parentBucket, self.parent.id(), bucket, self.id(), args, function(err){
          self.local().update(args);
          //TODO: THIS DOES MOST PROBABLY NOT PRODUCE THE EXPECTED RESULT!!!
          err && storageQueue.updateCmd(transport, bucket, self.id(), args);
          cb();
        });
      }else{
        store.update(bucket, self.id(), args, function(err){
          self.local().update(args)
          err && storageQueue.updateCmd(transport, bucket, self.id(), args);
          cb()
        });
      }
    }else{
      // FIXME: this can lead to several creations of the same object because create
      // could be called several times before finishing previous time we need states!
      store.create(bucket, args, function(err, id){
        id && self.id(id);
        cb(err);
      })
    }
  },
  delete : function(transport, cb){
    var self = this;
    
    self.local().remove();
  
    function wrapCb(err){
      Model.syncManager.endSync(self);
      self.emit('deleted:', self.id());
      cb && cb(err);
    }
    
    if(_.isFunction(transport)||arguments.length==0){
      cb = transport;
      transport = this.transport();
    }
    if(transport){
      ServerStorage[transport].remove(self.__bucket, self.id(), function(err){
        err && storageQueue.deleteCmd(transport, self.__bucket, self.id());
        wrapCb(err);
      });
    }else{
      wrapCb();
    }
  },
  keepSynced : function(){
    var self = this;
  
    if(self._keepSynced) return;
  
    self._keepSynced = true;
  
    if (self.isPersisted()){
      Model.syncManager.startSync(self);
    } else {
      ginger.once('created:'+self.id(), function(id){
        self.id(id);
        Model.syncManager.startSync(self);
      });
    }
  
    self.on('changed:', function(doc, options){
      if(!options || ((options.sync != 'false') && !_.isEqual(doc, options.doc))){
        // TODO: Use async debounce to avoid faster updates than we manage to process.
        // (we will need to merge all incoming data).
        self.update(doc);
      }
    });
  },
});

Model.prototype.toJSON = Model.prototype.toArgs;

/**
  Function to add query params before calling to the server.
  Useful for  adding for example authentication.
*/
Model.urlQuery = function(url){
  return {};
}
//-----------------------------------------------------------------------------
/**
  A sequence is a ordered set of models. The main difference is that the order
  of the sequence is persisted in the storage (whereas collections are 
  stored in unordered form). A sequence can also include multiple copies of the
  same model.
*/
//-----------------------------------------------------------------------------
function arrayify(x){return _.isArray(x)?x:[x]};

var Sequence = Base.extend(function Sequence(items, model, parent){
  this.super(Sequence, 'cosntructor', items, model, parent);
  this._items = [];
})
_.extend(Sequence.prototype, {
  /**
    Adds a model (or models) to the sequence. If index is omitted,
    the model is appended at the end of the sequence.
        
    add(items{Array|Model}, [index{Integer}, opts{Object}]);  
    
    Available opts and their defaults:
      sync : false Determines if the operation should be synced with the Storage
  */
  add: function(items, index, opts){
    if(_.isObject(index)){
      opts = index;
      index = undefined;
    }
    if(_.isUndefined(index)){
      index = self.items.length;
    }
    items = arrayify(items);
    for(var i=0;i<items.length;i++){
      this._addOne(items[i], index++, opts);
    }
  },
  _addOne: function(item, index, opts){
    var self = this;
    self.items.splice(index, 0, item);
    
    if(self.shouldSync()){
      if(item.shouldPersist()){
        Storage.create(self.bucket(), item);
      }
      self.update();
    }
    self.emit('added:', item, index, opts);
  },
  /**
    Removes a model (or models) from the sequence.
  */
  remove: function(items, opts){
    
  },
  /**
    Gets the model at the given index
  */
  getAt: function(index){
    return this._items[index];
  },
  
  /**
    Returns a jsonfiable representation of this sequence.
  */
  toArgs : function(){
    return this._items;
  }
});
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
/**
  A collection is a set of optionally ordered models. 
  It provides delegation and proxing of events.
**/
//-----------------------------------------------------------------------------
var Collection = ginger.Collection = Base.extend(function Collection(items, model, parent, sortByFn){
  this.super(Collection);
  
  var self = this;
  
  self._updateFn = function(args){
    if(self.sortByFn){
      var i = self.indexOf(this);
      self.items.splice(i,1);
      self._sortedAdd(this);
    }
    self.emit('updated:', this, args);
  };
  
  self._deleteFn = _.bind(function(itemId){
    self.remove(itemId);
  }, self);
  
  if(_.isArray(items)){
    self.items = items;
    self._initItems(items);
  }else {
    self.items = [];
    parent = model;
    model = items;
  }
  
  _.defaults(self, {
    _keepSynced : false,
    _added : [],
    _removed : [],
    parent:parent,
    sortByFn:sortByFn,
    filterFn:ginger.searchFilter,
    model : model || Model,
    sortOrder : 'asc',
    socket : Model.socket
  });
  self.on('sortByFn sortOrder', function(fn){
    var oldItems = self.items;
    if(self.sortByFn){
      self.items = self.sortBy(self.sortByFn)
    }
    (self.sortOrder == 'desc') && self.items.reverse();
    self.emit('sorted:', self.items, oldItems)
  });
})

Collection.instantiate = function(model, parent, array, cb){
  if(_.isArray(parent)){
    cb = array;
    array = parent;
    parent = null;
  }
  cb = cb || noop;
  
  if(array){
    var items = [];
    asyncForEach(array, function(args, fn){
      model.create(args, function(err, instance){
        if(instance){
          items.push(instance);
        }
        fn(err);
      })
    }, function(err){
      if(err){
        cb(err, null)
      }else{
        var collection = new Collection(items, model, parent);
        ginger.release(items);
        
        if(parent){
          collection.keepSynced(parent._keepSynced);
        }
        cb(null, collection)
      }
    })
  }else{
    cb(null, null)
  }
}
_.extend(Collection.prototype, {
  findById : function(id){
    return this.find(function(item){return item.id() == id});
  },
  save : function(cb){
    var transport = this.model.transport(), self = this;
  
    ServerStorage[transport].remove(self.parent.__bucket, 
                                    self.parent.id(),
                                    self.model.__bucket, 
                                    self._removed,
                                    function(err){
      if(err){
        cb(err);
      }else{
        self._removed = []
        asyncForEach(self.items, function(item, cb){
          item.save(cb);
        }, function(err){
          if((!err)&&(self._added.length>0)){
            var items = _.filter(self._added, function(item){
              if(_.isUndefined(item._id)){
                return item;
              }else{
                return item._id;
              }
            });
        
            ServerStorage[transport].add(self.parent.__bucket, 
                                         self.parent.id(),
                                         self.model.__bucket, 
                                         item._id || item,
                                         function(err){
              if(!err){
                self._added = [];
              }
              cb(err);
            });
          }else{
            cb(err);
          }
        });
      }                     
    });
  },
  add : function(items, cb, opts, pos){
    var self = this;  
    cb = cb || noop;
    asyncForEach(items, function(item, done){
      self._add(item, function(err){
        !err && self._keepSynced && !item._keepSynced && item.keepSynced();
        done(err);
      }, opts, pos);
    }, cb);
  },
  insert : function(item, pos, cb){
    if(this.items){
      if(pos > this.items.length){
        pos = undefined;
      }
      this.add(item, cb, {nosync:false, embedded:true}, pos);
    }else{
      cb();
    }
  },
  remove : function(itemIds, cb, nosync){
    var self = this, transport = this.model.transport(), 
      item, items = self.items, index, len, 
      parent = self.parent,
      bucket = self.model.__bucket;
  
    cb = cb || noop;
    
    items = _.isArray(itemIds) && itemIds.length > 1 ? _.clone(items) : items; 
    len = items.length;
      
    asyncForEach(itemIds, function(itemId, fn){
      item = 0;
      for(index=0; index<len; index++){
        if(items[index].id() == itemId){
          item = items[index];
          break;
        }
      }
  
      if(item){
        item.off('changed:', self._updateFn);
        item.off('deleted:', self._deleteFn);
        self.items.splice(index, 1);
        if(item.isPersisted()){
          if(self._keepSynced && (nosync !== true) && parent){
            ServerStorage[transport].remove(
              parent.__bucket, 
              parent.id(),
              bucket,
              item.id(),
              fn);
          }else{
            self._removed.push(itemId);
            fn();
          }
        }else{
          fn();
        }
        self.emit('removed:', item, index);
        item.release();
      }else{
        fn();
      }
    }, function(err){
      if(!err && parent){
        Storage.remove(parent.__bucket, parent.id(), bucket, makeArray(itemIds), cb);
      }else{
        cb(err);
      }
    });
  },
  keepSynced : function(){
    if(!Model.socket) return;
    
    !this._keepSynced && this._startSync();
  
    this.map(function(item){
      item.keepSynced()
    });
  },
  _startSync : function(){
    var self = this,
      socket = Model.socket,
      bucket = self.model.__bucket,
      id;
    
    self._keepSynced = true;
        
    if (!self.parent) return;
    
    id = self.parent.id();
    
    Model.syncManager.startSync(self.parent);
      
    self._addListenerFn = _.bind(function(items){
      // TODO: refactor add and _add so that we do not need this special code here, and
      // this function becomes as simple as removeListenerFn.
      function addItem(item, args){
        if(item){
          self.add(item, noop, {nosync:true});
          
          // Cache for offline use.
          Storage.update(bucket, item.id(), args, function(){
            Storage.add(self.parent.__bucket, id, bucket, item.id(), function(){
              item.release();
            });
          });
        }
      }

      asyncForEach(items, function(args, done){
        if(_.isObject(args)){
          if(!self.findById(args._id)){
            self.model.create(args, function(err, item){
              addItem(item, args);
              done();
            });
          }
        }else{
          if(!self.findById(args)){
            self.model.findById(args, function(err, item){
              addItem(item, args);
              done();
            })
          }
        }
      }, noop);
    }, self);
    
    self._removeListenerFn = _.bind(function(itemId){
      this.remove(itemId, noop, true);
    }, self);
    
    socket.on('add:'+id+':'+bucket, self._addListenerFn)
    socket.on('remove:'+id+':'+bucket, self._removeListenerFn)
  },
  _endSync : function(){
    var self = this, socket = self.socket, bucket = self.model.__bucket;
    if(socket && self.parent){
        var id = self.parent.id();
        socket.removeListener('add:'+id+':'+bucket, self._addListenerFn);
        socket.removeListener('remove:'+id+':'+bucket, self._removeListenerFn);
        Model.syncManager.endSync(self.parent);
    }
  },
  toggleSortOrder : function(){
    this.set('sortOrder', this.sortOrder == 'asc' ? 'desc' : 'asc');
  },
  setFormatters : function(formatters){
    this._formatters = formatters;
    this.each(function(item){
      item.format(formatters);
    });
  },
  filtered : function(optionalItem){
    var items = this.items;
    if(this.filterFn && this.filterData){
      var data = this.filterData || '';
          
      if(optionalItem){
        return this.filterFn(optionalItem, data, fields);
      }else{
        var filtered = [], item;
        for(var i=0, len=items.length;i<len;i++){
          item = items[i];
          if(this.filterFn(items[i], data, this.filterFields || _.keys(item))){
            filtered.push(items[i]);
          }
        }
        return filtered;
      }
    }else{
      return optionalItem || items;
    }
  },
  reverse : function(){
    this.items.reverse();
    return this;
  },
  destroy : function(){
    this._keepSynced && this._endSync();
    ginger.release(this.items);
    this.items = null;
    this.super(Collection, 'destroy');
  },
  _initItems : function(items){
    var self = this;
  
    items = _.isArray(items)? items:[items];
    for (var i=0,len=items.length; i<len;i++){
      var item = items[i];
      item.retain();
      item.on('changed:', self._updateFn);
      item.on('deleted:', self._deleteFn);
    }
  },
  _sortedAdd : function(item){
    (this.sortOrder == 'desc') && this.items.reverse();
    var i = this.sortedIndex(item, this.sortByFn)
    this.items.splice(i, 0, item);
    (this.sortOrder == 'desc') && this.items.reverse();
    return i;
  },
  _add : function(item, cb, opts, pos){
    var self = this;
  
    cb = cb || noop;
    
    if(self.findById(item.id())) return cb();
    
    // What is this for?
    this._formatters && item.format(this._formatters);

    if(self.sortByFn){
      pos = self._sortedAdd(item);
    }else {
      pos = _.isUndefined(pos) ? self.items.length : pos;
      self.items.splice(pos, 0, item);
    }

    self._initItems(item);
    
    self.emit('added:', item, pos);
    
    if(self._keepSynced){
      var transport = this.model.transport();
      if(!opts || (opts.nosync !== true)){
        function storageAdd(doc){
          if(self.parent){
            ServerStorage[transport].add(self.parent.__bucket, 
                                         self.parent.id(),
                                         item.__bucket,
                                         doc,
                                         function(err, ids){
              if(!err && _.isArray(ids)){
                item.id(ids[0]);
              }
              cb(err);         
            });
          }else{
           cb();
          }
        }
      
        if(opts && opts.embedded){
          storageAdd(item);
        }else if(item.isPersisted()){
          storageAdd(item.id());
        }else{
          item.save(function(err){
            if(!err){
              storageAdd(item.id());
            }else{
              cb();
            }
          });
        }
      }else{
        cb(null);
      }
    }else{
      self._added.push(item); // We need to keep pos as well here...
      cb(null);
    }
  }
});

// Underscore methods that we want to implement on the Collection.
var methods = 
  ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find', 'detect', 'pluck',
    'filter', 'select', 'reject', 'every', 'all', 'some', 'any', 'include',
    'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex', 'toArray', 'size',
    'first', 'rest', 'last', 'without', 'indexOf', 'lastIndexOf', 'isEmpty', 'groupBy']

// Mix in each Underscore method as a proxy to `Collection#items`.
_.each(methods, function(method) {
  Collection.prototype[method] = function() {
    return _[method].apply(_, [this.items].concat(_.toArray(arguments)))
  }
})
/*
// Human sort from: http://my.opera.com/GreyWyvern/blog/show.dml/1671288
Array.prototype.humanSort = function() {
  return this.sort(function(a, b) {
    aa = a.split(/(\d+)/);
    bb = b.split(/(\d+)/);

    for(var x = 0, len=Math.max(aa.length, bb.length); x < len; x++) {
      if(aa[x] != bb[x]) {
        var cmp1 = (isNaN(parseInt(aa[x],10)))? aa[x] : parseInt(aa[x],10);
        var cmp2 = (isNaN(parseInt(bb[x],10)))? bb[x] : parseInt(bb[x],10);
        if(cmp1 == undefined || cmp2 == undefined)
          return aa.length - bb.length;
        else
          return (cmp1 < cmp2) ? -1 : 1;
      }
    }
    return 0;
  });
}
*/

//------------------------------------------------------------------------------
/**
TODO: Add keyboard & mouse events. Ex: 
 ('keydown:a', modifiers ['shift', 'ctrl', 'alt', 'cmd'])
 ('mouseenter:')
 ('mousedown:')
*/
var View = ginger.View = Base.extend({
  constructor : function View(classNames, css, tag){
    var self = this;
    self.super(View)
    self.classNames = classNames;
    self.tag = tag || '<div>';
    self.css = css;
    
    self._createElement();
    
    self.classNames && self.$el.addClass(self.classNames)
    self.css && self.$el.css(self.css);
  },
  render : function($parent){
    this.$parent = $parent || this.$parent;
    this.$parent && this.$el && this.$el.detach().appendTo(this.$parent);
    
    return this.$el;
  },
  refresh : function(){
    this.$parent && this.render(this.$parent);
  },
  clean : function(){
    this.$el && this.$el.detach();
  },
  remove : function(){
    this.$el && this.$el.remove()
    this.$el = null;
  },
  disable : function(disable){
    console.log(this+" does not implement disable")
  },
  hide : function(duration, easing, callback) {
    this.$el && this.$el.hide(arguments)
  },
  show : function(duration, easing, callback) {
    this.$el && this.$el.show(arguments)
  },
  destroy : function(){
    this.remove();
    this.super(View, 'destroy');
  },
  _createElement: function(){
    if(!this.$el){
      this.$el = $(this.tag);
    }
  }
});
//------------------------------------------------------------------------------
var CanvasView = ginger.CanvasView = View.extend(function CanvasView(classNames){
  this.super(CanvasView, 'constructor', classNames)
  this.$canvas = null
  var cv = this
  this.on('changed:', function(){
    cv.draw()
  })
});
_.extend(CanvasView.prototype,{
  render : function($parent){
    this.super(CanvasView, 'render', $parent)
    if(this.$parent){
      if(this.$canvas){
        this.$canvas.remove()
      }
      this.$canvas = $('<canvas>', {css:{width:'100%', height:'100%'}})
        .appendTo(this.$el)

      this.$canvas[0].width = this.$parent.width()
      this.$canvas[0].height = this.$parent.height()
    }
    this.draw();
  },
  draw : function(){
    if(this.$canvas){
      return this.$canvas[0].getContext('2d')
    }else{
      return null
    }
  }
});

//------------------------------------------------------------------------------
//
// Views
//
//------------------------------------------------------------------------------
var Views = ginger.Views = {}
//------------------------------------------------------------------------------
Views.ComboBox = View.extend({
  constructor : function ComboBox(items, selected){
    this.super(Views.ComboBox);
    var view = this
  
    if(selected){
      view.value = selected
    }else{
      view.value = this.firstValue(items)
    }
    view.items = items || {};

    view.$el.comboBox(view.items, view.value).change(function(event){
      view.set('value', event.target.value)
    })
  
    view.on('value', function(value){
      $('select',view.$el).val(value)
    })
  },
  firstValue : function(items){
  //  return _.find(items, function(key){return true});
    for(var key in items){
      return key
    }
  },
  willChange : function(key, value){
    if((key === 'value')&&(value===null)){
      return this.firstValue(this.items)
    }else{
      return value
    }
  },
  add : function(item,selected) {  
    this.items[item.key] = item.value;
  
    var self = this,
      option = '<option value="'+item.key+'">'+item.value+'</option>',
      $select = $('select', self.$el);
    
    $select.append(option);
    
    self.on('value', function(value){
      $('select', self.$el).val(value)
    })
    if(selected) {
      $select.val(item.key);
    }
  },
  remove : function(key) {
    delete this.items[key];
    $('select option[value="'+key+'"]', this.$el).remove();
  }
});
//------------------------------------------------------------------------------
Views.Slider = View.extend({
  constructor : function Slider(options, classNames){
    var self = this;
    this.super(Views.Slider, 'constructor', classNames);
    
    function setOptions(options){
      self.options = _.clone(options) || {};
      _.extend(self.options, {
        start : function(event, ui){
          self.emit('start').emit('started:');
        },
        slide : function(event, ui){
          self.set('value', ui.value)
          options.slide && self.options.slide(event, ui)
        },
        stop : function(event, ui){
          self.set('value', ui.value)
          options.slide && self.options.slide(event, ui)
          self.emit('stop').emit('stopped:');
        }
      });
      self.value = self.options.value || self.value || 0;
      self.$el.slider(self.options);
      self.$el.slider('value', self.value);
    }
    
    setOptions(options);
    
    this.on('options', function(options){
      setOptions(options);
    });
    
    self.on('value', function(value){
      self.$el.slider('value', parseFloat(value))
    })
  },
  disable : function(disable){
    if(disable){
      this.$el.slider('disable');
    }else{
      this.$el.slider('enable');
    }
  }
});
//------------------------------------------------------------------------------
Views.ColorPicker = View.extend({
  constructor : function ColorPicker(options){
    this.super(Views.ColorPicker)
    var view = this
  
    view.$colorPicker = $('<input>').attr({name:"color",
                                           type:"text",
                                           value:'#FFFFFFFF'})
  
    var pickerOptions = {
      change: function(hex, rgb) {
        view.set('color', hex)
      }
    }
                      
    if(_.isUndefined(options) == false){
      _.extend(pickerOptions, options)
    }
  
    view.$colorPicker.miniColors(pickerOptions)
  
    view.on('color', function(value){
      if(value!=view.$colorPicker.attr('value')){
        view.$colorPicker.miniColors('value', value)
      }
    })
  },
  render : function($parent){
    this.super(Views.ColorPicker, 'render')
    $parent.append(this.$colorPicker)
    return this.$el
  },
  disable : function(disable){
    this.$colorPicker.miniColors('disabled', disable);
  }
});
//------------------------------------------------------------------------------
Views.TextField = View.extend(function TextField(classNames, options){
  var $el
  if((options)&&(options.area)){
    $el = this.$el = $('<textarea>')
  }else{
    $el = this.$el = $('<input>')
  }
  this.super(Views.TextField, 'constructor', classNames)
  
  _.extend(this, options)
  _.defaults(this, {
    rows:1,
    cols:20,
    text:'',
    outline:false,
    keypress:false
  })
  
  if(this.outline===false){
    $el.attr('outline','none')
  }
  
  var self = this
  $el.html(self.text)
  $el.change(function(event){
    self.set('text', event.target.value)
  })
  
  if(this.keypress){
    $el.keyup(function(){
      self.set('text', $el.val())
    })
  }
  
  this.on('text', function(text){
    $el.html(text)
  })
})
//------------------------------------------------------------------------------
Views.CheckBox = View.extend( function CheckBox(css){
  this.super(Views.CheckBox)
  if(css) {
    this.$el.css(css);
  }
  
  this.$checkbox = $('<input type="checkbox">').appendTo(this.$el)
  this.$text = $('<span/>').appendTo(this.$el)
  
  var self = this;
  this.$checkbox.on('changed:',function(event){
    self.set('checked',  $(this).is(':checked'));
  })
  
  this.on('text',function(value) {
    self.$text.html(value)
  })
})
//------------------------------------------------------------------------------
Views.RadioButton = View.extend( function(){
  this.super(Views.RadioButton)
})
//------------------------------------------------------------------------------
Views.Label = View.extend( function(classNames, css){
  this.$el = $('<span>');
  this.super(Views.Label, 'constructor', classNames, css)

  var view = this
  this.on('text', function(value){
    view.$el.html(value)
  })
})
//------------------------------------------------------------------------------
var TableRow = View.extend(function(doc, fields, widths){
  var $tr = $('<tr>').attr('data-id', doc.id());
  fields = fields || _.keys(doc);
  
  for(var i=0, len=fields.length;i<len;i++){
    var value = doc.format(fields[i]) || 'undefined';
    var $td = $('<td>').append(value).appendTo($tr).attr('width', widths[i]||0);
  }
  this.$el = $tr;
});

/**
  options:
    headers : ['header1', 'header2', ...] (html text or jquery or DOM
    fields : ['username', 'account.plan.storage', ...]
    formatters : { prop1: fn1, prop2: fn2 ... }
    widths : [ '10%', '20%', '15%', ... ],
    css : { },
    classNames : 'name1 name2 ...'
    selectRowClass: 'wqeqwe'
    filter : fn(doc, filterData)
*/
function compareItems(a, b){
  var len = a.length;
  if (a === b) return true;
  if (len !== b.length) return false;
  for (var i=0;i<len;i++){
    if(a[i].id() !== b[i].id()) return false;
  }
  return true;
}

Views.Table = View.extend({
  constructor : function Table(collection, options){
    var self = this,
      $tableWrapper = $('<div>').css({height:'100%', 'overflow-y':'auto'}), 
      $table = $('<table>').appendTo($tableWrapper);
    
    self.$tableWrapper = $tableWrapper;
    self.$el = $('<div>').attr('tabindex',0);
    self.$el.mouseenter(function(){
      $(this).focus();
    }).mouseleave(function(){
      $(this).blur();
    });
  
    self.$selected = null;
    self.$tbody = $('<tbody>');
  
    _.extend(self, options);
    _.defaults(self, {widths:[]});
  
    self.super(Views.Table, 'constructor', options.classNames, options.css);
  
    if(self.widths){
      $colgroups = [];
      for(var i=0,len=self.widths.length;i<len;i++){
        var $col = $('<colgroup>').attr('width', self.widths[i]);
        $colgroups.push($col);
      }
    }
    if(self.headers){
      var $headerTable = $('<table>'), $row = $('<tr>'), $header = $('<thead>').appendTo($headerTable);
      $header.append($row);
      for(var i=0, len=self.headers.length;i<len;i++){
        var header = self.headers[i];
        $('<th>').append(header).appendTo($row).attr('width', self.widths[i]||0);
      }
      self.$el.append($headerTable);
    }
  
    if(self.prebody){
      self.$el.append(self.prebody);
    }
  
    self.$el.append(self.$tableWrapper);
    $table.append(self.$tbody);
    self.$tbody.on('click', 'tr', function(event) {
      var $this = $(this), cid = $this.data('id');
      self.emit('clicked:', collection.findById(cid), $this);
    });

    self.on('clicked:', function(item, $row){
      self._selectRow($row);
    });
    if(!self.ignoreKeyboard){
      self.$el.keydown(function(event){
        if(self.$selected){
          switch (keyToString(event.which)){
            case 'down':
              var $next = self.$selected.next();
              ($next.length>0) && self._selectRow($next);
            break;
            case 'up':
              var $prev = self.$selected.prev();
              ($prev.length>0) && self._selectRow($prev);
            break;
            default: return true; 
          }
        }
        return false;
      });
    }
    self.on('collection', function(val, old){
      ginger.release(old);
      val.retain()
      .on('sorted:', function(items, oldItems){
        if(!compareItems(items, oldItems)){
          self.populate(self.index, self.limit);
        }
      })
      .on('added:', function(){
        self.populate(self.index, self.limit);
      })
      .on('removed:', function(val){
        var $row;
        if(self.$selected && self.$selected.data('id') == val.id()){
          $row = self.$selected.prev();
          if($row.length == 0){
            $row = self.$selected.next();
          }
        }
        self.populate(self.index,self.limit);
        if($row && $row.length){
          self.select($row.data('id'));
        }else{
          self.set('$selected', null);
        }
      })
      .on('updated:', function(item){
        var 
          $oldRow = $("tr[data-id='" + item.id() +"']"),
          row = new TableRow(item, self.fields, self.widths);
        $oldRow.replaceWith(row.$el);
        (self.$selected[0] === $oldRow[0]) && self._selectRow(row.$el);
      })
    });
    self.set('collection', collection);
    self.populate(self.index, self.limit);
    self.on('filterData', function(){
      self.populate(self.index, self.limit);
    });
  },
  makeFooter : function(shownItems) {
    $('.table-footer', this.$el).remove();
    var $textContainer = $('<div class="table-footer-text-container">').append('Showing ' + shownItems);
    if(shownItems < this.collection.items.length) {
      $textContainer.append(' of ' + this.collection.items.length);
    } 
     if(this.collection.items.length == 1) {
      $textContainer.append(' entry');
    } else {
      $textContainer.append(' entries');
    } 

    var $footer = $('<div class="table-footer">').append($textContainer);                                                  
    this.$el.append($footer);
  },
  populate : function(index,limit){
    var self=this;
    self.$tbody.empty();
    var indexStart = index || 0;
    var indexLast = limit ? limit+indexStart : self.collection.items.length;

    var items = self.collection.items.slice(indexStart, indexLast);
    var shownItems = 0;
    _.each(items, function(item){
      if(!self.filter || 
        self.filter(item, self.filterData, self.searchFields || self.fields)) {
          self.formatters && item.format(self.formatters);
          var row = new TableRow(item, self.fields, self.widths);
          row.render(self.$tbody);
          shownItems++;
      }
    });
    
    if (self.footer) {
      self.makeFooter(shownItems);
    }
    self.select();
  },
  _selectRow : function($row){
    var selected = this.selectedRowClass;
    if(selected){
      this.$selected && this.$selected.removeClass(selected);
    }
    this.set('$selected', $row);
    $row.addClass(selected);
  },
  select : function(itemId){
    itemId = itemId || this.selectedItemId;
    if(itemId){
      var $row = $("tr[data-id='" + itemId +"']"), index, selectedRowHeight;
      if($row.length){
        // animate if needed.
        if (this.$tableWrapper[0].scrollHeight > this.$tableWrapper[0].clientHeight ) {
          index = $('tr', this.$body).index($row);
          selectedRowHeight = $row.height()*index;
          this.$tableWrapper.stop().animate({
            scrollTop: selectedRowHeight - (this.$tableWrapper.height()/2)
          }, 400);
        }
        this.selectedItemId = itemId;
        $row && this._selectRow($row);
      }
    }
  },
  destroy : function(){
    ginger.release(this.collection);
    this.super(Views.Table, 'destroy');
  }
});

//------------------------------------------------------------------------------
/* Creates a html structure to use with simplemodal
 * param: obj options
 * options = {title:string,close:bool,content:html,form:obj{input:array[id,name,type,placeholder]}}
 */
Views.Modal = View.extend({
  constructor : function Modal(options){
    this.super(Views.Modal, 'constructor', options.classNames || 'modalForm', options.css);
    var view = this;
    var $content;

    // header
    var $header = $('<div class="modalTop">');
    var $title = $('<h3 class="modalTitle">').text(options.title);
    $header.append($title);
  
    // close
    if(options.close) {
      view.$close = $('<div class="modalClose">');
      view.$close.html('<div class="circularButton"><div class="buttonContent">X</div></div></div>');
    
      $header.prepend(view.$close);
    }

    // Content
    this.$content = $content = $('<div class="modalContent">');
    
    // preface
    if(options.preface) $content.append(options.preface);
  
    // form
    if (options.form) {
      view.inputs = {};
      var $form = $('<form>');
      view.$form = $form;

      // error handling
      view.$errorForm = $('<div id="formError">').html('<div id="errorIcon"><span>?</span></div></div>');
      view.$errorText = $('<span id="errorText"></span>');
      view.$errorForm.append(view.$errorText);
      $form.append(view.$errorForm).attr('id',options.form.id);
    
      // inputs
      var $table = $('<table border="0" cellspacing="5" cellpadding="0"/>');
      $form.append($table);
    
      for(var i = 0;i<options.form.inputs.length;i++) {
        var item = options.form.inputs[i];
        if (item instanceof jQuery) {
          var $input = item;
        } else {
          var $input = $('<input/>',item);
        }
        var $tr = $('<tr>'), $td = $('<td>');
        $td.append($input);
        $tr.append($td);
        view.inputs['$' + $input.attr('id')] = $input;
        $table.append($tr);
      }
      // Form submit button
      if(options.submitButton) {
        view.$submitButton = $('<button/>', options.submitButton);
        $form.append(view.$submitButton);
      }
      // add content to modal
      $content.append($form);
    }

    // content
    $content.append(options.content);
  
    // buttons
    if(options.cancelButton) {
      view.$cancelButton = $('<button/>',options.cancelButton);
      $content.append(view.$cancelButton);
    }
    if(options.acceptButton) {
      view.$acceptButton = $('<button/>',options.acceptButton);
      $content.append(view.$acceptButton);
    }
  
    // bottom
    if(options.bottom) {
      $content.append(options.bottom)
    }
  
    // make the modal
    view.$el.prepend($header);
    view.$el.append($content);
  },
  disable : function() {
    var view = this;
    for (var key in view.inputs) {
      var $input = view.inputs[key];
      $input.attr("disabled", "disabled"); 
    }
    if(view.$submitButton) {
      view.$submitButton.css('opacity', 0.6).attr("disabled", "disabled");
    }
    if(view.$acceptButton) {
      view.$acceptButton.css('opacity', 0.6).attr("disabled", "disabled");
    }
    if(view.$cancelButton) {
      view.$cancelButton.css('opacity', 0.6).attr("disabled", "disabled");
    }
  },
  enable : function() {
    var view = this;
    for(var i = 0;i<view.inputs.length;i++) {
      var $input = view.form.inputs[i];
      $input.removeAttr("disabled", "disabled");
    }
    if(view.$submitButton) {
      view.$submitButton.css('opacity', 1).removeAttr("disabled", "disabled");
    }
    if(view.$acceptButton) {
      view.$acceptButton.css('opacity', 1).removeAttr("disabled", "disabled");
    }
    if(view.$cancelButton) {
      view.$cancelButton.css('opacity', 1).removeAttr("disabled", "disabled");
    }
  },
  content : function(content){
    this.$content.html(content);
  },
  /* Empty all modal forms*/
  empty : function() {
    this.$el.find(':input').each(function() {
      switch(this.type) {
        case 'password':
        case 'select-multiple':
        case 'select-one':
        case 'text':
        case 'textarea':
          $(this).val('');
          break;
        case 'checkbox':
        case 'radio':
          this.checked = false;
      }
    });
  }
});
//------------------------------------------------------------------------------
Views.Button = View.extend({
  constructor : function Button(options){
    this.super(Views.Button)
    var view = this
    _.extend(this, options)
  
    view.$el.click(function(event){
      view.emit('click', view, event) 
    })
  
    view.$el.css({
      width:'100%',
      height:'100%',
      cursor:'pointer'
    })
 
    if(this.icons){
      this.$icons = {}

      var $icon
      for(var i=0;i<this.icons.length;i++){
        $icon = $('<div>', {
          class:this.icons[i],
          css:{float:'left'}
        })
        this.$icons[this.icons[i]] = $icon
      }
      this.icon = this.icons[0]
      view.$el.append(view.$icons[this.icon])
  
      this.on('icon', function(icon, prev){
        $('.'+prev, view.$el).detach()
        view.$el.append(view.$icons[icon])
      })
    }

    if(this.label){
      var $label = $('<div>')
        .html('<a>'+this.label+'</a>')
        .css({float:'left'})
      view.$el.append($label)
    }
  },
  enable : function(enable){
    if(enable){
      // Enable button.
    }else{
      // Disable button.
    }
  }
});
//------------------------------------------------------------------------------
Views.Toolbar = View.extend({
  constructor : function ToolBar(classNames, itemsClassNames){
    this.super(Views.Toolbar, 'constructor', classNames)
    var self = this
    self.itemsClassNames = itemsClassNames
  
    self.clickCallback = function(sender, event){
      self.emit('click', sender, event)
    }
  },
  addItems : function(items, leftMargin){
    var self = this
    items = _.isArray(items)?items:[items]
    for(var i=0, len=items.length; i<len;i++){
      var $itemContainer = $('<div>').append(items[i].$el)
      if(this.itemsClassNames){
        $itemContainer.addClass(this.itemsClassNames)
      }
      if(leftMargin&&(i===0)){
        $itemContainer.css('margin-left',leftMargin+'px')
      }
      self.$el.append($itemContainer)
      items[i].on('click', self.clickCallback)
    }
  }
});
/*
ginger.Views.Toolbar.prototype.render = function(){
 var $el = this.super(ginger.Views.Toolbar, 'render') 
  for(var i=0; i<this.items.length;i++){
    $el.append(this.items[i].render().css({float:'left'}))
  }
  return $el
}
*/
//------------------------------------------------------------------------------
Views.PopUp = View.extend({
  constructor : function PopUp(classNames, $parent, options){
    this.super(Views.PopUp, 'constructor', classNames)
    this.$el.css({position: 'absolute', display:'none'})
  
    _.extend(this, options)
    _.defaults(this,{
      startTime:500,
      endTime:300,
      showTime:500,
      center:false
    })
    this._timer = null
    this._fadingIn = false
    this._fadingOut = false
    this._state = 0 // 0 = hidden, 1 = fadeIn, 2 = show, 3 = fadeOut
    this.attachTo()
    this.$parent = $parent
  },
  attachTo : function($parent){
    this.$el.detach()
    if(_.isUndefined($parent)){
      this.$parent = $('body')
    }else{
      this.$parent = $parent
    }
    this.$parent.prepend(this.$el)
  },
  show : function(html, css, anim){
    var self = this
    if (_.isString(html)){
      self.$el.html(html)
    }else{
      self.$el.empty()
      self.$el.append(html)
    }
  
    clearTimeout(this._timer)
    if(css){
      self.$el.css(css)
    }
  
    if(self.$parent){
      var left, top
      if(self.center){
        var pos = self.$parent.offset()
        left = pos.left + (self.$parent.width()- self.$el.outerWidth())/2
        top = pos.top + (self.$parent.height() - self.$el.outerHeight())/2
        self.$el.css({left:left, top:top})
      }
    }
  
    switch(self._state){
      case 3: self.$el.stop(false,true)

      case 0: self._state = 1
              self.$el.fadeIn(self.startTime, anim, function(){
                self._state = 2
                self._setFadeOut()
              })
              break;
      case 2: self._setFadeOut()
      default:
    }
  },
  hide : function(cb){
    var self = this
    self._state = 3
    self.$el.fadeOut(self.endTime, function(){
      self._state = 0
      cb && cb();
    })
  },
  _setFadeOut : function(){
    var self = this
    if(self.showTime>0){
      self._timer = setTimeout(function(){
        self.hide()
      }, self.showTime)
    }
  }
});
//------------------------------------------------------------------------------
/**
  Valid Pos: [w, e, n, s]
*/
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
Views.ToolTip = Views.PopUp.extend({
  constructor : function ToolTip(classNames, $target, pos, $content, options){
    var self = this
    self.super(Views.ToolTip, 'constructor', classNames, $target, {showTime:0})

    _.extend(self, options)
    _.defaults(self, {
      delay:500
    })
    var $el = self.$el
    self.$target = $target
    self.$content = $content
  
    $target.append($el.append($content))

    self._timer = null
  
    $target.hover(
      function(event){
        clearTimeout(self._delayTimer)
        self._delayTimer = setTimeout(function(){
          self._updatePosition(pos)
          $el.fadeIn(self.startTime)
        }, self.delay)
      },
      function(event){
        clearTimeout(self._delayTimer)
        $el.fadeOut(self.endTime)
      }
    )
  },
  _updatePosition : function(pos){
    var $el = this.$el,
        $target = this.$target,
        $content = this.$content,
        css = $target.offset(),
        ttw = $el.outerWidth(),
        tth = $el.outerHeight(),
        targetWidth = $target.width(),
        targetHeight = $target.height();

    switch(pos){
      case 'n':
        css.top -=tth
        css.left -=(ttw-targetWidth)/2
      break;
      case 'w':
        css.left -=ttw
      break;
      case 'e':
        css.left += targetWidth+5
      break;
      case 's':
        css.top += $target.height()
        css.left -=(ttw-targetWidth)/2
      break;
    }
    $el.css(css)
  }
});
//------------------------------------------------------------------------------
//
// Singletones
//
//------------------------------------------------------------------------------

var storageQueue = new Queue();

return ginger
})
