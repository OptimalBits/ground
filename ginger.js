/**
   Ground MVC framework v0.1

   Features:
   - Modular design.
   - Builds on top of proven libraries such as jQuery and underscore.
   - Hierarchical routing system.
   - Clean class hierarchies, based on javascript prototypal inheritance.
   - Property bindings.
   - Models with persistence and synchronization.
   - Global and Local Events.
   - Undo/Redo Manager.
   - Keyboard handling.
   - Set of views for common web "widgets".
   - Canvas View.
   - Middleware for express.
  
   Dependencies:
   - jQuery
   - Underscore
   
   Roadmap:
   - namespaces for events and bindings.
   - instantiate classes without new operator.
   - use getter/setters to simplify the events and bindings.
   - validation (willChange is already a validator).
   
   (c) 2011-2012 OptimalBits with selected parts from the internet
   dual licensed as public domain or MIT.
   
   Resources:
   - http://kevinoncode.blogspot.com/2011/04/understanding-javascript-inheritance.html
   - http://javascript.crockford.com/prototypal.html
   - https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/create
   - http://jonathanfine.wordpress.com/2008/09/21/implementing-super-in-javascript/
   - http://blog.willcannings.com/2009/03/19/key-value-coding-with-javascript/
*/

define(['jquery', 'underscore', 'ginger/uuid'], function($, _, uuid){

/**
  Define some useful jQuery plugins.
*/

//
// Populates the options of a select tag
//
(function( $ ){
  $.fn.comboBox = function(items, selected){
    var $comboBox = $('<select>', this)
    var options = ''
    for(var key in items){
      options += '<option '
      if (selected === key){
        options += 'selected="selected" '
      }
      options += 'value="'+key+'">'+items[key]+'</option>'
    }
    
    $comboBox.html(options)
    this.append($comboBox)
    
    return this
  };
})( jQuery );

//
// Polyfills
//

if (!Object.create) {  
  Object.create = function (o) {  
    function F() {}  
    F.prototype = o;  
    return new F();  
  }  
}

//
// Ginger Object
//
var ginger = {}

//
// Utils
//
var noop = ginger.noop = function(){}

ginger.uuid = uuid;

// TODO: Add an optional timeout parameter.
ginger.asyncDebounce = function (fn) {
  var delayedFunc = null, executing = null;

  return function debounced () {
    var context = this,
      args = arguments,
      nargs = args.length,
      cb = args[nargs-1];
        
    var delayed = function() {
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
    }

    if(executing){
      delayedFunc = delayed;
    }else{
      delayed();
    }
  };
};

// TODO: rename to delayedTrigger(fn, triggerStart, triggerEnd, threshold)
ginger.waitTrigger = function(func, start, end, delay){
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
    }
    
    timer = setTimeout(function(){
      waiting = true;
      start();
    }, delay);
    func.apply(this, args);
  }
};

// Search Filter. returns true if any of the fields of the 
// obj includes the search string.
ginger.searchFilter = function(obj, search, fields){
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
}

// Filters the keys of an object.
ginger.filter = function(object, fn){
  var filtered = {}
  for(var key in object){
    var value = object[key]
    var result = fn(key, value)
    filtered[key] = result || value
  }
  return filtered
}

ginger.indexOf = function(array, val, iter, isSorted){
  if(iter){
    //if(isSorted){
      for(var i=0, len=array.length;i<len; i++){
        if(val===iter(array[i])){
          return i
        }
      }
    //}
  }else{
    return _.indexOf(collection, key)
  }
}

// Apply asynchronous functions to every element in the array
var asyncForEach = ginger.asyncForEach = function(array, fn, cb) {
  var deferred = $.Deferred(), completed = 0;
  
  function iter(item, len){
    fn(item, function(err) {
      if(err){
        deferred.reject()
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
}

//
// Event Emitter
// (based on original work by Oliver Caldwell, olivercaldwell.co.uk)
// Dual licensed under the MIT or GPL Version 2 licenses.
// https://github.com/Wolfy87/EventEmitter
//

var EventEmitter = function() {}

EventEmitter.prototype._getListeners = function(){
  this._listeners = this._listeners || {}
  return this._listeners
}

EventEmitter.prototype._getNamespaces = function(){
  this._namespaces = this._namespaces || {}
  return this._namespaces
}

/**
  * Assigns a listener to the specified event
  * 
  * @param {String} eventName Name of the event to assign the listener to
  * @param {Function} listener Function to be executed when the specified event is emitted
  * @returns {Object} The current instance of EventEmitter to allow chaining
  */
EventEmitter.prototype.on = function(eventNames, listener) {
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
}

/**
  * Emits the specified event running all listeners associated with it
  * 
  * @param {String} eventName Name of the event to execute the listeners of
  * @param {Mixed} arguments You can pass as many arguments as you want after the event name. These will be passed to the listeners
  * @returns {Object} The current instance of EventEmitter to allow chaining
  */
EventEmitter.prototype.emit = function(eventName) {
  var listeners = this._getListeners()
  if(listeners['*']){
    this._fire(listeners['*'], arguments)
  }
  if(listeners[eventName]){
    var args = _.rest(arguments)
    this._fire(listeners[eventName], args)
  }		
  return this
}
EventEmitter.prototype._fire = function(eventListeners, args){
  for(var i=0, len=eventListeners.length; i < len; i ++) {
    eventListeners[i].apply(this, args);
  }
}
	
/**
  * Returns an array of listeners for the specified event name
  * 
  * @param {String} eventName Name of the event to get the listeners for
  * @returns {Array} An array of listeners for the specified event
  */
EventEmitter.prototype.listeners = function(eventName) {
  var listeners = this._getListeners()
  return listeners[eventName] = listeners[eventName] || [];
}

/**
  * Assigns a listener to the specified event removes its self after the first run
  * 
  * @param {String} eventName Name of the event to assign the listener to
  * @param {Function} listener Function to be executed when the specified event is emitted
  * @returns {Object} The current instance of EventEmitter to allow chaining
  */
EventEmitter.prototype.once = function(eventName, listener) {
  var ee = this
  
  function wrapper() {
			listener.apply(null, arguments);
      ee.removeListener(eventName, wrapper);
		}
		
		return ee.addListener(eventName, wrapper);
};
	
/**
  * Removes the specified listener
  * 
  * @param [{String}] eventName Name of the event to remove the listener from
  * @param [{Function}] listener Listener function to be removed
  * @returns {Object} The current instance of EventEmitter to allow chaining
  */
EventEmitter.prototype.off = function(eventNames, listener) {
  if(listener){
    var events = eventNames.split(' ')
      
    for(var i=0, len=events.length;i<len;i++){
      this._removeListener(events[i], listener);
    }
  }else{
    this.removeAllListeners(eventNames);
  }
  
  return this;
};

/**
  * Removes all listeners from the specified (namespaced) events
  * 
  * @param {String} eventName Name of the event to remove the listeners from
  * @returns {Object} The current instance of EventEmitter to allow chaining
  */
EventEmitter.prototype.removeAllListeners = function(eventNames) {
  var listeners = this._listeners;
  
  if(listeners){
    if(eventNames){
      var events = eventNames.split(' ')
      for(var i=0, len=events.length;i<len;i++){
        this._removeNamespacedEvent(events[i], listeners)
      }
    }else{
      delete this['_listeners'];
    }
  }
  return this;
}
EventEmitter.prototype.namespace = function(namespace){
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
}
EventEmitter.prototype._removeListener = function(event, listener){
 var listeners = this._listeners, index;
     
  if(listeners && listeners[event]) { 
    index = _.indexOf(listeners[event], listener);
    if(index !== -1) {
      listeners[event].splice(index, 1);
    }
  }
}

EventEmitter.prototype._removeNamespacedEvent = function(event, listeners){
  var namespaces = this._namespaces, eventAndNamespace = event.split('/'), event;
      
  if(eventAndNamespace.length === 1){
    event = eventAndNamespace[0];
    listeners && delete listeners[event]
    namespaces && delete namespaces[event];
  }else if(namespaces){
    var namespace = eventAndNamespace[0];
    event = eventAndNamespace[1];
        
    if(namespaces[namespace]){
      var _listeners;
      if(event == ''){
        var events = namespaces[namespace];
        for(event in events){
          var listeners = events[event];
          for(var i=0, len=listeners.length;i<len;i++){
            this._removeListener(event, listeners[i]);
          }   
        }
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

UndoManager.prototype.beginUndo = function(undoFn, name){
  this._undoFn = undoFn
  this._name = name
}

UndoManager.prototype.endUndo = function(doFn, fn){
  this.action(doFn, this._undoFn, fn, this._name)
  this._undoFn = null
}

UndoManager.prototype.action = function(doFn, undoFn, fn, name){
  this.undones.length = 0
  name = _.isString(fn)?fn:name
  var action = {do:doFn, undo:undoFn, fn:fn, name:name}
  if(_.isNull(this._group)){
    this.actions.push(action)
  }else{
    this._group.push(action)
  }
  doFn(fn);
}

UndoManager.prototype.beginGroup = function(name){
  this._group = {name: name, actions:[]}
}

UndoManager.prototype.endGroup = function(){
  ;(function(group){
    this.action( function(){
      for(var i=0, len = group.length; i<len; i++){
        group[i].action.do(group[i].action.fn)
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
}

UndoManager.prototype.canUndo = function(){
  return this.actions.length > 0;
}
 
UndoManager.prototype.canRedo = function(){
  return this.undones.length > 0;
}
 
UndoManager.prototype.undo = function(){
  var action = this.actions.pop();
  if(action){
    action.undo(action.fn)
    var name = action.name || ''
    this.emit('undo', name)
    this.undones.push(action);
  }
}

UndoManager.prototype.redo = function(){
  var action = this.undones.pop();
  if(action){
    action.do(action.fn)
    var name = action.name || ''
    this.emit('redo', name)
    this.actions.push(action);
  }
}

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
var Storage = ginger.Storage = {}

Storage.create = function(bucket, args, cb){
  var objectId = bucket+'@'+args.cid;
  localStorage[objectId] = JSON.stringify(args)
  cb && cb(null, args.cid);
}
Storage.findById = function(bucket, id, cb){
  var objectId = bucket+'@'+id
  for (var i=0, len=localStorage.length;i<len;i++){
    var key = localStorage.key(i)
    if(key === objectId){
      var doc = JSON.parse(localStorage[key])
      doc._id = doc.cid;
      cb(null, doc);
      return;
    }
  }
  cb();  
}
/*
find:function(bucket, id, collection, query, cb){
  var url = Model.url;
  if(bucket) url += '/' + bucket;
  if(id) url += '/'+id;
  if(collection) url += '/'+collection;
  if(query) url += '?'+$.param(query);
  ajax.get(url, cb);
},
*/
//find:function(bucket, id, collection, query, cb){
Storage.all = function(bucket, parent){
  var collection = []
  var keys = Storage._subCollectionKeys(bucket, parent)
  if(keys){
    for (var i=0, len=keys.length;i<len;i++){
      var obj = localStorage[keys[i]]
      if(obj){
        collection.push(JSON.parse(obj))
      }else{
        localStorage.removeItem(keys[i])
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
Storage.first = function(bucket, parent){
  var keys = Storage._subCollectionKeys(bucket, parent)
  if(keys){
    return localStorage[keys[0]]
  }else{
    for (var i=0, len=localStorage.length;i<len;i++){
      var key = localStorage.key(i)
      if(key.split('@')[0] === bucket){
        var doc = JSON.parse(localStorage[key])
        doc._id = doc.cid;
        return doc;
      }
    }
  }
}
Storage.update = function(bucket, id, args, cb){
  Storage.findById(bucket, id, function(err, obj){
    if(!err){
      if(!obj){
        obj = {};
      }
      _.extend(obj, args)
      Storage.create(bucket, obj, cb);
    }else{
      cb(err);
    }
  })
}
Storage.add = function(bucket, id, collection, objIds, cb){
  // TODO: Implement
},
Storage.remove = function(bucket, id, collection, objIds, cb){
  if(_.isFunction(collection)){
    cb = collection;
    var objectId = bucket+'@'+id
    localStorage.removeItem(objectId)
    cb();    
  } else if(objIds.length>0){
    // TODO: Implement
  }else{
    cb();
  }
}
Storage._subCollectionKeys = function(bucket, parent){
  if(parent){
  var value = localStorage[parent.__bucket+':'+parent.cid+':'+bucket]
  return value?JSON.parse(value):null
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
ServerStorage.ajax = {
  create: function(bucket, args, cb){
    url = Model.url+'/'+bucket;
    ajax.post(url, args, cb);
  },
  find:function(bucket, id, collection, query, cb){
    var url = Model.url;
    if(bucket) url += '/' + bucket;
    if(id) url += '/'+id;
    if(collection) url += '/'+collection;
    if(query) url += '?'+$.param(query);
    ajax.get(url, cb);
  },
  findById:function(bucket, id, cb){
    ajax.get(Model.url+'/'+bucket+'/'+id, cb);
  },
  update:function(bucket, id, args, cb){
    ajax.put(Model.url+'/'+bucket+'/'+id, args, cb);
  },
  add:function(bucket, id, collection, items, cb){
    if(items){
      ajax.put(Model.url+'/'+bucket+'/'+id+'/'+collection, items, cb);
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
  var errorFn = function(){
    cb(new Error('Disconnected'));
  },
    cb = _.last(arguments),
    args = _.rest(arguments),
    proxyCb = function(err, res){
      socket.removeListener('disconnected', errorFn);
      cb(err,res);
    };
  args[args.length-1] = proxyCb;
    
  if(socket.socket.connected){
    socket.once('disconnected', errorFn);    
    socket.emit.apply(socket, args);
  }else{
    errorFn();
  }
}

ServerStorage.socket = {
  create: function(bucket, args, cb){
    safeEmit(Model.socket, 'create', bucket, args, cb);
  },
  find:function(bucket, id, collection, query, cb){
    Model.socket.emit('find', bucket, id, collection, query, cb);
  },
  findById:function(bucket, id, cb){
    Model.socket.emit('read', bucket, id, cb);
  },
  update:function(bucket, id, args, cb){
    Model.socket.emit('update', bucket, id, args, cb);
  },
  add:function(bucket, id, collection, items, cb){
    Model.socket.emit('add', bucket, id, collection, items, cb);
  },
  remove:function(bucket, id, collection, objIds, cb){
    Model.socket.emit('remove', bucket, id, collection, objIds, cb); 
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

  Sub.prototype.super = function(klass, fn){
    return klass.superproto[fn||'constructor'].apply(this, _.rest(arguments, 2))
  }
}

/**
  Declare(Super, [constructor{Function}|methods{Object}, statics{[Function]}, bucket{String}]);
*/
var Declare = ginger.Declare = function(Super, Sub, staticOrName, bucket){
  var methods;
  
  if(_.isObject(Sub)&&!_.isFunction(Sub)){
    methods = Sub;
    console.log(methods);
    if(methods.constructor){
      Sub = methods.constructor;
    }else{
      Sub = null;
    }
  }else if(_.isString(Sub)){
    bucket = Sub;
    Sub = null;
  }
  
  // Sub = makeClass(Sub) // so that new is not necessary...
  if(!Sub){
    Sub = function Ground(){
      Super.prototype.constructor.apply(this, arguments);
    };
  }
  
  _.extend(Sub.prototype, methods);
  _.extend(Sub, Super);
  
  Inherit(Sub, Super)
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
  this._refCounter = 1;
  this._bindings = {}
}

_.extend(Base.prototype, EventEmitter.prototype);

Base.extend = function(Sub, staticOrName, bucket){
  return Declare(this, Sub, staticOrName, bucket);
}

//
// Listening to changed Properties are just expressed as the property name
// All other events should end with : (changed:), (clicked:), etc.
// TODO: Handle namespaces.

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
  
  if( _.isEqual(obj[key], val) == false){
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
  // TODO: set to null all non function properties?
  this.off();
}
Base.prototype.retain = function(){
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
//------------------------------------------------------------------------------
//
// Utility Classes
//
//------------------------------------------------------------------------------

/**
  Interval
  
  Self-correcting Accurate Interval (+/- 1ms accuracy).
  
  Listen to 'time' property for getting the current time at the given
  resolution.
  
  The timer will emit a ended: event when the timer has reached its duration,
  and 'stopped:' if the timer was stopped by the user.
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
    
    Starts a new timer with the given duration in milliseconds.
  */
  start : function(duration){
    clearTimeout(this._timer);
    if(duration){
      this.duration = duration;
      this._baseline = Date.now();
      this._iter();
    }
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
// TODO: Change .cid to .cid() to avoid serialization.
//------------------------------------------------------------------------------
var Model = ginger.Model = Base.extend( function Model(args){
  this.super(Model)
  _.extend(this, args)
  _.defaults(this, {
    _socket:Model.socket,
    __model:true,
    __dirty:false
  })
  this.cid = this._id || this.cid || uuid()
  this.__transport = Model.__transport;
  this.__bucket = this.__bucket || this.constructor.__bucket;
},
{
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
            cb(null, instance)
          })
        }else{
          cb(err)
        }
      })
    }else{
      cb()
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
  set : function(attribute, value){
    switch(attribute){
      case 'socket': this.socket = value;break;
      case 'url': this.url = value;break;
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
        Storage.findById(bucket, id, function(err, doc){
          if(doc){
            instantiate(doc, args, cb);
          }else{
            cb(err);
          }
        })
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
    var self = this, bucket, id;
    if(_.isFunction(parent)){
      var tmp = cb;
      cb = parent;
      parent = tmp;
    }
    if(parent){
      bucket = parent.__bucket;
      id = parent.cid;
    }
    this.fetch(bucket, id, altBucket || this.__bucket, function(err, docs){
      if(docs){
        args && _.each(docs, function(doc){_.extend(doc, args)});
        var collection = docs || Storage.all(bucket, parent);
        Collection.instantiate(self, parent, collection, cb)
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
    if(this._local){
      return this._local
    }else{
      var self = this,
        bucket = this.__bucket;
      this._local = {
        findById : function(id, cb){
          var args = Storage.findById(bucket, id)
          self.create(args, cb)
        },
        all: function(cb, parent){
          var collection = Storage.all(bucket, parent)
          Collection.instantiate(self, parent, collection, cb)
        },
        first: function(cb, parent){
          var args = Storage.first(bucket, parent)
          self.create(args, cb)
        }
      }
      return this._local
    }
  },
  fromJSON : function(args, cb){
    cb(null, new this(args));
  },
  fromArgs : function(args, cb){
    cb(null, new this(args));
  }
})
Model.prototype.transport = function(transport){
  if(transport){
    this.__transport = transport;
  }
  return this.__transport || Model.transport();
}
Model.prototype.key = function(){
  return this.__bucket+':'+this._id
}
Model.prototype.init = function(fn){
  fn(this)
}
Model.prototype.local = function(){
  if(this._local){
    return this._local
  }else{
    var self = this,
      bucket = this.__bucket;
    this._local = {
      save : function(){
        Storage.create(bucket, self.toJSON())
      },
      update: function(args){
        Storage.update(bucket, self.cid, args)
      },
      remove: function(){
        Storage.remove(bucket, self.cid, noop)
      }
    }
    return this._local
  }
}
/**
  Model#all (model, [args{Object}, bucket{String}], cb);
*/
Model.prototype.all = function(model, args, bucket, cb){
  if(_.isString(args)){
    cb = bucket;
    bucket = args;
    args = undefined;
  }
  if(_.isFunction(bucket)){
    cb = bucket;
    bucket = undefined;
  }
  if(_.isFunction(args)){
    cb = args;
    args = undefined;
    bucket = undefined;
  }
  if(this._id){ 
    model.all(cb, this, args, bucket)
  }else{
   cb(null)
  }
}
Model.prototype.toArgs = function(){
  var args = {};
  for(var key in this){
    if( !_.isUndefined(this[key]) && 
        (this[key] != null) && 
        (key[0] !== '_') && 
        !_.isFunction(this[key]) ){
      if(_.isFunction(this[key].toArgs)){
        args[key] = this[key].toArgs();
      }else if(!_.isObject(this[key])){
        args[key] = this[key]
      }
    }
  }
  return args
}
Model.prototype.toJSON = Model.prototype.toArgs

// TODO: Add a __dirty flag so we do not save unncessarily.
// this flag a easily be maintained by listening to the changed: event.
Model.prototype.save = function(transport, cb){
  this.update(this.toArgs(), transport, cb);
}
/*
  update model
  update(args, [transpor, cb])
*/
Model.prototype.update = function(args, transport, cb){
  transport= transport ? transport : this.transport();
  
  if(_.isFunction(transport)){
    cb = transport;
    transport = this.transport();
  }
  
  var self = this, bucket = self.__bucket;
    
  cb = cb || noop;

  if(self._id){
    ServerStorage[transport].update(bucket, self._id, args, function(err){
      if(!err){
        self.local().update(args)
      }
      cb(err)
    })
  }else{
    ServerStorage[transport].create(bucket, args, function(err, id){
      if(!err){
        if(id){
          self.local().remove()
          self.cid = self._id = id
          self.local().save()
          cb(null, id)
        }else{
          self.local().update(args)
          cb(null, self.cid)
        }
      } else {
        cb(err);
      }
    })
  }
}
Model.prototype.delete = function(transport, cb){
  var self = this;
  if(_.isFunction(transport)){
    cb = transport;
    transport = this.transport();
  }
  if(transport){
    ServerStorage[transport].remove(self.__bucket, self._id, function(err){
      !err && self.emit('deleted:', self._id);
      cb && cb(err);
    });
  }else{
    self.emit('deleted:', self._id);
    cb && cb();
  }
};
Model.prototype.keepSynced = function(){
  var self = this;
  if(self._keepSynced===true){
    return;
  }
  
  if(self.transport() === 'socket'){
    var socket = Model.socket;
    
    var newDoc, id = self._id;
    self._keepSynced = true;
    
    socket.emit('sync', id);
    
    socket.on('update:'+id, function(doc){
      newDoc = doc;
      self.set(doc, {sync:'false'});
      self.local().update(doc);
    });
    
    socket.on('delete:'+id, function(){
      self.local().remove();
      self.emit('delete', self._id)
    });
  }
  
  self.on('changed:', function(doc, args){
    if((doc !== newDoc) && (!args || (args.sync != false))){
      self.update(doc, function(res){
        // TODO: Use asyncdebounce to avoid faster updates than we manage to process.
      });
    }
  });
}

Model.prototype.destroy = function(){
  this.super(Model, 'destroy');
  
  var socket = Model.socket;
  if(socket && this._keepSynced){
    var id = this._id;
    socket.emit('unsync', id);
    socket.removeListener('update:'+id);
    socket.removeListener('delete:'+id);
  }
}

/**
  A collection is a set of ordered models. 
  It provides delegation and proxing of events.
**/
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
    parent = items;
    //model = items;
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
    if(self.sortByFn){
      self.items = self.sortBy(self.sortByFn)
    }
    (self.sortOrder == 'desc') && self.items.reverse();
  });
})
Collection.instantiate = function(model, parent, array, cb){
  if(_.isArray(parent)){
    cb = array;
    array = parent;
    parent = null;
  }
  cb = cb || noop;
  
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
        var collection = new Collection(items, model, parent)
        _.each(items, function(item){item.release()});
        
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
Collection.prototype.findById = function(id){
  return this.find(function(item){return item.cid == id});
}

Collection.prototype.save = function(cb){
  var transport = this.model.transport(), self = this;
  
  ServerStorage[transport].remove(self.parent.__bucket, 
                                  self.parent._id,
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
                                       self.parent._id,
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
}
Collection.prototype.add = function(items, cb, opts, pos){
  var self = this;  
  cb = cb ? cb : noop;
  asyncForEach(items, function(item, fn){
    self._add(item, function(err){
      if(!err){
        if(self._keepSynced){
          item.keepSynced();
        }
      }
      fn(err);
    }, opts, pos);
  }, cb);
}
Collection.prototype.insert = function(item, pos, cb){
  if(pos > this.items.length){
    pos = undefined;
  }
  this.add(item, cb, {nosync:false, embedded:true}, pos);
}
Collection.prototype.remove = function(itemIds, cb, nosync){
  var self = this, transport = this.model.transport();
  
  cb = cb || noop;
      
  asyncForEach(itemIds, function(itemId, fn){
    var item, index, items = self.items;
    for(var i=0, len=items.length;i<len;i++){
      if(items[i].cid == itemId){
        item = items[i];
        index = i;
        break;
      }
    }
  
    if(item){
      item.off('changed:', self._updateFn);
      item.off('deleted:', self._deleteFn);
      self.items.splice(index, 1);
      if(item._id){
        if(self._keepSynced){
          if(nosync !== true){
            ServerStorage[transport].remove(
              self.parent.__bucket, 
              self.parent._id,
              self.model.__bucket,
              item._id,
              fn);
          }
        }else{
          self._removed.push(itemId);
          fn(null);
        }
      }else{
        fn(null);
      }
      self.emit('removed:', item, index);
      item.release();
    }else{
      fn(null);
    }
  },cb);
}
Collection.prototype.keepSynced = function(enable){
  if(enable==false||!Model.socket||this._keepSynced){
    return;
  }
  var self = this, 
      socket = self.socket, 
      bucket = self.model.__bucket,
      id = self.parent && self.parent._id;
  
  self._keepSynced = true
  
  socket.emit('sync', id);
  
  self._addListenerFn = _.bind(function(itemId){
    var self = this;
    this.model.findById(itemId, function(err, item){
      if(item){
        item.init(function(){
          self.add(item, noop, {nosync:true});
          item.release();
        })
      }
    })
  }, self);
  
  self._removeListenerFn = _.bind(function(itemId){
    this.remove(itemId, noop, true);
  }, self);
  
  socket.on('add:'+id+':'+bucket, self._addListenerFn)
  socket.on('remove:'+id+':'+bucket, self._removeListenerFn)
  
  this.map(function(item){
    item.keepSynced()
  });

  return this
}
Collection.prototype.toggleSortOrder = function(){
  if(this.sortOrder == 'asc'){
    this.set('sortOrder', 'desc');
  }else{
    this.set('sortOrder', 'asc');
  }
}
Collection.prototype.setFormatters = function(formatters){
  this._formatters = formatters;
  this.each(function(item){
    item.format(formatters);
  });
}
Collection.prototype.filtered = function(optionalItem){
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
}
Collection.prototype.destroy = function(){
  this.super(Collection, 'destroy');
   
  if(this.socket){
    var bucket = this.model.__bucket;
    
    if(this.parent){
      var id = this.parent.cid;
      this.socket.removeListener('add:'+id+':'+bucket, this._addListenerFn);
      this.socket.removeListener('remove:'+id+':'+bucket, this._removeListenerFn);
      this._keepSynced && this.socket.emit('unsync', id);
    }
  }
  this.each(function(item){item.release()});
  this.items = null;
}
Collection.prototype._initItems = function(items){
  var self = this;
  
  items = _.isArray(items)? items:[items];
  for (var i=0,len=items.length; i<len;i++){
    var item = items[i];
    item.retain();
    item.on('changed:', self._updateFn);
    item.on('deleted:', self._deleteFn);
  }
};
Collection.prototype._sortedAdd = function(item){
  (this.sortOrder == 'desc') && this.items.reverse();
  var i = this.sortedIndex(item, this.sortByFn)
  this.items.splice(i, 0, item);
  (this.sortOrder == 'desc') && this.items.reverse();
}
Collection.prototype._add = function(item, cb, opts, pos){
  var self = this;
  
  this._formatters && item.format(this._formatters);
  
  if(self.findById(item.cid)){
    cb && cb(null);
    return;
  }
  
  if(self.sortByFn){
    pos = self._sortedAdd(item);
  }else {
    pos = _.isUndefined(pos)?self.items.length:pos;
    self.items.splice(pos, 0, item);
  }

  self._initItems(item);
  self.emit('added:', item, pos);
    
  if(self._keepSynced){
    var transport = this.model.transport();
    if(!opts || (opts.nosync !== true)){
      function storageAdd(){
        ServerStorage[transport].add(self.parent.__bucket, 
                                     self.parent._id,
                                     item.__bucket,
                                     item._id || item,
                                     function(err, ids){
         if(!err && _.isArray(ids)){
           item.set('_id', ids[0]);
         }
         cb(err);         
       });    
      }  
      if(item._id || (opts && opts.embedded)){
        storageAdd()
      }else{
        item.save(function(err){
          err && cb(err);
          !err && storageAdd();
        });
      }
    }else{
      cb && cb(null);
    }
  }else{
    self._added.push(item); // We need to keep pos as well here...
    cb && cb(null);
  }
}

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
Collection.prototype.reverse = function(){
  this.items.reverse();
  return this;
}
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

// FIX:
// $el.remove will indeed destroy all the DOM nodes in $el including $el
// this means that if we want to be able to re-render a removed node, we need
// to be able to re create the whole sub DOM tree from this view.
// therefore $el must be created in render. But since $el could be something
// different than a div, we will introcude the tag property, which will be used
// in render to create the proper element.
var View = ginger.View = Base.extend(function View(classNames, css){
  var self = this
  self.super(View)
  if(_.isUndefined(self.$el)){
    self.$el = $('<div>')
  }
  if(classNames){
    self.$el.addClass(classNames)
  }
  if(css){
    self.$el.css(css)
  }
  self.classNames = classNames
  self.tag = '<div>'
  self.css = css
})
_.extend(View.prototype, {
  render : function($parent){
    if($parent){
      this.$parent = $parent
    }
    return this.$el.detach().appendTo(this.$parent)
  },
  update : function(){
    // Updates this view.
    /*
      Updating can imply that if this view is composed of subviews, or of
      many DOM elements, that this DOM elements are destroyed and recreated,
      (or subvies are removed and re-rendered), but the most important thing
      is that the element that this view returned in render, is still the same after
      the update.
    */
  },
  clean : function(){
    if(this.$el) this.$el.detach()
  },
  remove : function(){
    if(this.$el) this.$el.remove()
  },
  disable : function(disable){
    console.log(this+" does not implement disable")
  },
  hide : function(duration, easing, callback) {
    this.$el.hide(arguments)
  },
  show : function(duration, easing, callback) {
    this.$el.show(arguments)
  },
  destroy : function(){
    this.remove();
    this.super(View, 'destroy');
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
      this.$canvas = $('<canvas>', {
        css:{width:'100%', height:'100%'}}).appendTo(this.$el)

      this.$canvas[0].width = this.$parent.width()
      this.$canvas[0].height = this.$parent.height()
    }
    this.draw()
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
Views.ComboBox = ComboBox = View.extend(function ComboBox(items, selected){
  this.super(Views.ComboBox)
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
})
ComboBox.prototype.firstValue = function(items){
//  return _.find(items, function(key){return true});
  for(var key in items){
    return key
  }
}
ComboBox.prototype.willChange = function(key, value){
  if((key === 'value')&&(value===null)){
    return this.firstValue(this.items)
  }else{
    return value
  }
}
ComboBox.prototype.add = function(item,selected) {  
  this.items[item.key] = item.value;
  
  var option = '<option value="'+item.key+'">'+item.value+'</option>';
  var $select = $('select', this.$el);
  $select.append(option);
  var view = this;
  view.on('value', function(value){
      $('select',view.$el).val(value)
  })
  if(selected) {
    $select.val(item.key);
  }
}
ComboBox.prototype.remove = function(key) {
  delete this.items[key];
  $('select option[value="'+key+'"]', this.$el).remove();
}
//------------------------------------------------------------------------------
Views.Slider = View.extend( function Slider(options, classNames){
  this.super(Views.Slider, 'constructor', classNames)
  var self = this
  
  self.options = options || {}
  self.value = self.options.value || 0

  var options = _.clone(self.options)
  
  options.start = function(event, ui){
    self.emit('start').emit('started:');
  }
  options.slide = function(event, ui){
    self.set('value', ui.value)
    if(self.options.slide) self.options.slide(event, ui)
  }
  options.stop = function(event, ui){
    self.set('value', ui.value)
    if(self.options.slide) self.options.slide(event, ui)
    self.emit('stop').emit('stopped:');
  }
  
  self.$el.slider(options)
  this.on('options', function(options){
    self.$el.slider(options);
  });
    
  self.on('value', function(value){
    self.$el.slider('value', parseFloat(value))
  })
})
Views.Slider.prototype.disable = function(disable){
  if(disable){
    this.$el.slider('disable');
  }else{
    this.$el.slider('enable');
  }
}
//------------------------------------------------------------------------------
Views.ColorPicker = View.extend( function ColorPicker(options){
  this.super(Views.ColorPicker)
  var view = this
  
  view.$colorPicker = $('<input>').attr({name:"color",
                                         type:"text",
                                         value:'#FFFFFFFF'})
  
  var pickerOptions = {change: function(hex, rgb) {
                        view.set('color', hex)
                      }}
                      
  if(_.isUndefined(options) == false){
    _.extend(pickerOptions, options)
  }
  
  view.$colorPicker.miniColors(pickerOptions)
  
  view.on('color', function(value){
    if(value!=view.$colorPicker.attr('value')){
      view.$colorPicker.miniColors('value', value)
    }
  })
})
Views.ColorPicker.prototype.render = function($parent){
  this.super(Views.ColorPicker, 'render')
  $parent.append(this.$colorPicker)
  return this.$el
}
Views.ColorPicker.prototype.disable = function(disable){
  this.$colorPicker.miniColors('disabled', disable);
}
//------------------------------------------------------------------------------
Views.TextField = View.extend( function TextField(classNames, options){
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
var TableRow = View.extend( function(doc, fields, widths){
  var $tr = $('<tr>').attr('data-id', doc.cid);
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
var Table = Views.Table = View.extend( function Table(collection, options){
  var self = this, 
    $tableWrapper = $('<div>').css({height:'100%', 'overflow-y':'auto'}), 
    $table = $('<table>').appendTo($tableWrapper);
    
  self.$el = $('<div>');
  self.$selected = null;
  self.$tbody = $('<tbody>');
  
  _.extend(self, options);
  _.defaults(self, {widths:[]});
  
  self.super(Views.Table, 'constructor', options.classNames, options.css);
  
  if(self.prebody){
    self.$el.append(self.prebody);
  }
  
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
  self.$el.append($tableWrapper);
  $table.append(self.$tbody);
  self.$tbody.on('click', 'tr', function(event) {
    var $this = $(this), cid = $this.data('id');
    self.emit('clicked:', collection.findById(cid), $this);
  });
  
  self.on('clicked:', function(item, $row){
    self._selectRow($row);
  });
  self._keydownEventName = 'keydown.'+uuid();
  if(!self.ignoreKeyboard){
    $(document).on(self._keydownEventName, function(event){
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
    old && old.release();
    val.retain();
    val.on('updated: added: sortByFn', function(){
      self.populate();
    }).on('removed:', function(val){
      var $row;
      if(self.$selected && self.$selected.data('id') == val._id){
        $row = self.$selected.prev();
        if($row.length == 0){
          $row = self.$selected.next();
        }
      }
      self.populate();
      if($row && $row.length){
        self.select($row.data('id'));
      }else{
        self.set('$selected', null);
      }
    });
  });
  self.set('collection', collection);
  collection.emit('updated:');
  self.on('filterData', function(){
    this.collection.emit('updated:')
  });
});
Table.prototype.populate = function(){
  var self=this;
  self.$tbody.empty();
  self.collection.each(function(item){
    if(!self.filter || self.filter(item, self.filterData, self.fields)){
      self.formatters && item.format(self.formatters);
      var row = new TableRow(item, self.fields, self.widths);
      row.render(self.$tbody);
    }
  });
}
Table.prototype._selectRow = function($row){
  var selected = this.selectedRowClass;
  if(selected){
    this.$selected && this.$selected.removeClass(selected);
  }
  this.set('$selected', $row);
  $row.addClass(selected);
}
Table.prototype.select = function(itemId){
  var $row = $("tr[data-id='" + itemId +"']");
  $row && this._selectRow($row);
}
Table.prototype.destroy = function(){
  this.collection && this.collection.release();
  $(document).off(this._keydownEventName);
  this.super(Table, 'destroy');
}
//------------------------------------------------------------------------------
/* Creates a html structure to use with simplemodal
 * param: obj options
 * options = {title:string,close:bool,content:html,form:obj{input:array[id,name,type,placeholder]}}
 */
Views.Modal = View.extend( function Modal(options){
  this.super(Views.Modal, 'constructor', options.classNames || 'modalForm', options.css);
  var view = this;

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
  
  // content
  var $content = $('<div class="modalContent">');
  $content.append(options.content);
  
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
      var $tr = $('<tr>');
      var $td = $('<td>');
      $td.append($input);
      $tr.append($td);
      view.inputs['$' + item.id] = $input;
      $table.append($tr);
    }
    // Form submit button
    if(options.submitButton) {
      view.$submitButton = $('<button/>', options.submitButton);
      $form.append(view.$submitButton);
    }
    // add content to modal
    $content.prepend($form);
  }

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
})

Views.Modal.prototype.disable = function() {
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
}

Views.Modal.prototype.enable = function() {
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
}
//------------------------------------------------------------------------------
Views.Button = View.extend( function Button(options){
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
})
Views.Button.prototype.enable = function(enable){
  if(enable){
    // Enable button.
  }else{
    // Disable button.
  }
}
//------------------------------------------------------------------------------
var Toolbar = Views.Toolbar = View.extend( function ToolBar(classNames, itemsClassNames){
  this.super(Views.Toolbar, 'constructor', classNames)
  var self = this
  self.itemsClassNames = itemsClassNames
  
  self.clickCallback = function(sender, event){
    self.emit('click', sender, event)
  }
})
Toolbar.prototype.addItems = function(items, leftMargin){
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
var PopUp = Views.PopUp = View.extend( function PopUp(classNames, $parent, options){
  this.super(PopUp, 'constructor', classNames)
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
})
PopUp.prototype.attachTo = function($parent){
  this.$el.detach()
  if(_.isUndefined($parent)){
    this.$parent = $('body')
  }else{
    this.$parent = $parent
  }
  this.$parent.prepend(this.$el)
}
PopUp.prototype.show = function(html, css, anim){
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
}
PopUp.prototype.hide = function(cb){
  var self = this
  self._state = 3
  self.$el.fadeOut(self.endTime, function(){
    self._state = 0
    cb && cb();
  })
}
PopUp.prototype._setFadeOut = function(){
  var self = this
  if(self.showTime>0){
    self._timer = setTimeout(function(){
      self.hide()
    }, self.showTime)
  }
}
//------------------------------------------------------------------------------
/**
  Valid Pos: [w, e, n, s]
*/
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
Views.ToolTip = PopUp.extend( function ToolTip(classNames, 
                                               $target, 
                                               pos, 
                                               $content,
                                               options){
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
})
Views.ToolTip.prototype._updatePosition = function(pos){
  var $el = this.$el,
      $target = this.$target
      $content = this.$content

  var css = $target.offset(),
      ttw = $el.outerWidth(),
      tth = $el.outerHeight(),
      targetWidth = $target.width(),
      targetHeight = $target.height()

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
//------------------------------------------------------------------------------

return ginger
})
