/**
   Ginger MVC framework v0.1

   Features:
   - Modular design.
   - Builds on top of proven libraries such as jQuery and underscore.
   - Clean class hierarchies, based on javascript prototypal inheritance.
   - Property bindings.
   - Models with persistence and synchronization.
   - Global and Local Events.
   - Undo/Redo Manager.
   - Keyboard handling.
   - Set of views for common web "widgets".
   - Canvas View.
  
   Dependencies:
   - jQuery
   - Underscore
   
   (c) 2011 OptimalBits with selected parts from the internet
   dual licensed as public domain or MIT.
   
   Resources:
   - http://kevinoncode.blogspot.com/2011/04/understanding-javascript-inheritance.html
   - http://javascript.crockford.com/prototypal.html
   - https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/create
   - http://jonathanfine.wordpress.com/2008/09/21/implementing-super-in-javascript/
   - http://blog.willcannings.com/2009/03/19/key-value-coding-with-javascript/
 */

define(['underscore','math/uuid'], function(_, uuid){

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
ginger.noop = function(){}

ginger.asyncDebounce = function (func) {
    var delayedFunc = null,
    executing = false;

    return function debounced () {
        var obj = this,
            args = Array.prototype.slice.call(arguments),
            nargs = args.length,
            callback = args[nargs-1],
            delayed = function() {
              executing = true;
              func.apply(obj, args);
            };

        args[nargs-1] = function(){
            callback.apply(obj, arguments);
            executing = false;
            if(delayedFunc){
                delayedFunc();
            }
            delayedFunc = null;
        }

        if(executing){
            delayedFunc = delayed;
        }else{
            delayed();
        }
    };
};

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

// Filters the keys of an object.
ginger.filter = function(object, fn){
  var filtered = {}
  for(var key in object){
    var value = object[key]
    var result = fn(key, value)
    filtered[key] = result ? result : value
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
ginger.asyncForEach = function(array, fn, callback) {
  var deferred = $.Deferred()
  var completed = 0;
  if(array.length === 0) {
    if(_.isUndefined(callback)===false){
      callback(); // done immediately
    }
    deferred.resolve()
  }
  for(var i=0,len = array.length;i<len;i++) {
    fn(array[i], function(err) {
      if(_.isNull(err)||_.isUndefined(err)){
        completed++;
        if(completed === len) {
          if(_.isUndefined(callback)===false){
            callback();
          }
          deferred.resolve()
        }
      }else{
        deferred.reject()
      }
    });
  }
  return deferred
}

ginger.pluralize = function(noun){
  function suffixStarts(str, suffix){
    return str.indexOf(suffix, str.length - suffix.length)
  }
  var index = suffixStarts(noun, 'y')
  if(index !==-1){
    return noun.slice(0, index)+'ies'
  }else{
    return noun+'s'
  }
}

//
// Event Emitter
// (based on original work by Oliver Caldwell, olivercaldwell.co.uk)
// Dual licensed under the MIT or GPL Version 2 licenses.
// https://github.com/Wolfy87/EventEmitter
//

var EventEmitter = function() {}

EventEmitter.prototype._getListeners = function(){
  if (_.isUndefined(this._listeners)){
    this._listeners = {}
  }
  return this._listeners
}

/**
  * Assigns a listener to the specified event
  * 
  * @param {String} eventName Name of the event to assign the listener to
  * @param {Function} listener Function to be executed when the specified event is emitted
  * @returns {Object} The current instance of EventEmitter to allow chaining
  */
EventEmitter.prototype.on = function(eventNames, listener) {
  var events = eventNames.split(' ')
  var listeners = this._getListeners()
  
  for(var i=0, len=events.length;i<len;i++){
    var event = events[i]
    if(listeners[event]) {
      listeners[event].push(listener);
    }
    else{
      listeners[event] = [listener];
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
    eventListeners[i].apply(null, args);
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
  if(listeners[eventName]) {
    return listeners[eventName];
  }
  else {
    listeners[eventName] = [];
    return listeners[eventName];
  }
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
  * @param {String} eventName Name of the event to remove the listener from
  * @param {Function} listener Listener function to be removed
  * @returns {Object} The current instance of EventEmitter to allow chaining
  */
EventEmitter.prototype.off = function(eventNames, listener) {
  var events = eventNames.split(' ')
  var listeners = this._getListeners()
  
  for(var i=0, len=events.length;i<len;i++){
    var event = events[i]
    if(listeners[event]) { 
      var index = _.indexOf(listeners[event], listener);
      if(index !== -1) {
        listeners[event].splice(index, 1);
			}
		}
		else {
      listeners[event] = [];
		}
  }
  return this;
};
	
/**
  * Removes all listeners from the specified event
  * 
  * @param {String} eventName Name of the event to remove the listeners from
  * @returns {Object} The current instance of EventEmitter to allow chaining
  */
EventEmitter.prototype.removeAllListeners = function(eventNames) {
  var events = eventNames.split(' ')
  var listeners = this._getListeners()
  for(var i=0, len=events.length;i<len;i++){
    listeners[events[i]] = [];
  }
  return this;
}

/**
  Aliases
*/
EventEmitter.prototype.addListener = EventEmitter.prototype.on;
EventEmitter.prototype.addObserver = EventEmitter.prototype.on
EventEmitter.prototype.removeListener = EventEmitter.prototype.off

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
    ginger.noop,
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
    var name = action.name?action.name:''
    this.emit('undo', name)
    this.undones.push(action);
  }
}

UndoManager.prototype.redo = function(){
  var action = this.undones.pop();
  if(action){
    action.do(action.fn)
    var name = action.name?action.name:''
    this.emit('redo', name)
    this.actions.push(action);
  }
}

ginger.undoMgr = new UndoManager()
_.extend(ginger.undoMgr, new EventEmitter())

//------------------------------------------------------------------------------
//
// Ajax
// 
//------------------------------------------------------------------------------

var ajax = ginger.ajax = {}

var ajaxBase = function(url, fn, obj){
  obj = obj ? JSON.stringify(obj) : undefined;
  return {
    url:url,
    data:obj,
    contentType:'application/json',
    dataType:'json',
    success:function(data, textStatus, jqXHR){
      fn(null, data)
    },
    error:function(jqXHR, status, errorThrown){
      fn(jqXHR)
    }
  }
}

ajax.get = function(url, fn, obj){
  var base = ajaxBase(url, fn, obj);
  return $.ajax(base)
}

ajax.put = function(url, fn, obj){
  var base = ajaxBase(url, fn, obj);
  base.type = 'PUT';
  return $.ajax(base);
}

ajax.post = function(url, fn, obj){
  var base = ajaxBase(url, fn, obj);
  base.type = 'POST';
  return $.ajax(base);
}

//------------------------------------------------------------------------------
//
// Storage
// (requires localStorage)
//------------------------------------------------------------------------------
var Storage = ginger.Storage = {}
Storage.findById = function(bucket, id){
  var objectId = bucket+'@'+id
  for (var i=0, len=localStorage.length;i<len;i++){
    var key = localStorage.key(i)
    if(key === objectId){
      return JSON.parse(localStorage[key])
    }
  }
  return null
}
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
        return JSON.parse(localStorage[key])
      }
    }
  }
}
Storage._subCollectionKeys = function(bucket, parent){
  if(parent){
  var value = localStorage[parent.__bucket+':'+parent.cid+':'+bucket]
  return value?JSON.parse(value):null
  }
  return null
}
Storage.update = function(bucket, id, args){
  var obj = Storage.findById(bucket, id)
  if(obj){
    _.extend(obj, args)
    Storage.save(bucket, id, obj)
  }else{
    Storage.save(bucket, id, args)
  }
}
Storage.save = function(bucket, id, args){
  var objectId = bucket+'@'+id
  localStorage[objectId] = JSON.stringify(args)
}
Storage.remove = function(bucket, id){
  var objectId = bucket+'@'+id
  localStorage.removeItem(objectId)
}

//
var ServerStorage = ginger.ServerStorage = {}
// opts = {pagestart:0, pageend:20}}
ServerStorage.all = function(bucket, parent, fn, opts){
  var socket,
         url,
         id = parent?parent.cid:null,
         collectionKey,
         urn = parent?parent.__bucket+':'+bucket:bucket;
  
  collectionKey = parent?parent.__bucket+':'+parent.cid+':'+bucket:urn;
    
  if(socket = ginger.Model.socket){
    socket.emit('read:'+urn, id, function(array){
      fn(null, array, collectionKey);
    })
  }else if(url = ginger.Model.url){
    url = parent?url+'/'+parent.__bucket+'/'+parent.cid+'/'+bucket:
                 url+'/'+bucket;
    ginger.ajax.get(url, function(err, array){
      fn(err, array, collectionKey);
    }, opts)
  }else{
    fn(null, null);
  }
}
ServerStorage.findById = function(bucket, id, fn){
  var socket = ginger.Model.socket,
         url = ginger.Model.url;
  if(socket){
    socket.emit('read:'+bucket, id, function(args){
      fn(null, args);
    })
  }else if(url){
    url = url+'/'+bucket+'/'+id;
    ginger.ajax.get(url, fn);
  }else{
    fn(null, null);
  }
}
ServerStorage.create = function(bucket, args, fn){
  var socket = ginger.Model.socket,
         url = ginger.Model.url;
  
  if(socket){
    socket.emit('create:'+bucket, args, function(id){
      fn(null, id)
    })
  }else if(url){
    url = url+'/'+bucket;
    ginger.ajax.post(url, fn);
  }else{
    fn(null, null);
  }
}
ServerStorage.update = function(bucket, id, args, fn){
  var socket = ginger.Model.socket,
         url = ginger.Model.url;
  
  fn = fn?fn:ginger.noop;
  
  if(socket){
    socket.emit('update:'+bucket, {id:id, attrs:args}, fn)
  }else if(url){
    url = url+'/'+bucket+'/'+id;
    ginger.ajax.put(url, fn);
  }else{
    fn(null, null);
  }
}

ServerStorage.count = function(bucket, fn){
  // TODO: Implement.
  fn(null, 0);
}


//
// Global events
//

_.extend(ginger, new EventEmitter())

//
// Key Handling
//
function keyEventToString(event){
  var s = ''
  s = event.shiftKey?s+':shift':s
  s = event.ctrlKey?s+':ctrl':s
  s = event.altKey?s+':alt':s
  s = event.metaKey?s+':meta':s
  if(event.which>32){
    s += ':'+String.fromCharCode(event.which).toLowerCase()
  }else{
    switch(event.which){
      case 8: s+=':backspace';break;
      case 20: s+=':caps';break;
      case 27: s+=':esc';break;
      case 32: s+=':space';break;
    }
  }
  return s
}

$(document)
  .keydown(function(event){
    ginger.emit('keydown'+keyEventToString(event))
  })
  .keyup(function(event){
    ginger.emit('keyup'+keyEventToString(event))
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
      if(fn) return klass.superproto[fn].apply(this, _.rest(arguments, 2))
      else klass.superproto.constructor.apply(this)
  }
} 

ginger.Declare = function(Super, Sub, staticOrName, bucket){
  Inherit(Sub, Super)
  if(Super.__staticMethods){
    _.extend(Sub, Super.__staticMethods)
  }
  if(staticOrName){
    if(_.isObject(staticOrName)){
      Sub.__staticMethods = staticOrName
      _.extend(Sub, staticOrName)
    }else{
      bucket = staticOrName
    }
  }
  if(bucket){
    Sub.__bucket = Sub.prototype.__bucket = bucket
  }
  return Sub
}

//
//  Base Class - All Ginger classes derive from this one.
//
var Base = ginger.Base = function(){
  this._bindings = {}
}

_.extend(Base.prototype, EventEmitter.prototype)

/**
  set - Sets a property and notifies any listeners attached to it.

*/
Base.prototype._set = function(key, val, args){
  if(this[key]!=val){
    var oldval = this[key]
    var val = this.willChange? this.willChange(key, val):val
    this[key] = val
    this.emit(key, val, oldval, args)
    return true
  }else{
    return false
  }
}
Base.prototype.set = function(keyOrObj, val, args){
  var changed = false
  if(_.isObject(keyOrObj)){
    var obj = keyOrObj
    for(var key in obj){
      changed = this._set(key, obj[key], args)?true:changed
    }
  }else{
    changed = this._set(keyOrObj, val, args)
  }
  if(changed){
    this.emit('change', this)
  }
}
Base.prototype.willChange = function(key, val){
  return val
}
/**
  get - Gets a property. Just declared for symmetry with set.
*/
Base.prototype.get = function(key){
  return this.key
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
  var dstKey = _.isUndefined(objectKey) ? key : objectKey

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
Base.prototype.init = function(err, callback){
  console.log("init method not implemented by:"+this)
}
Base.prototype.deinit = function(){
  console.log("init method not implemented by:"+this)
}
/**
  Begins an undo operation over setting a given key to a value.
*/
Base.prototype.beginUndoSet = function(key, name){
  var base = this
  ;(function(value){
    ginger.undoMgr.beginUndo(function(){
      base.set(key, value)
  }, name)}(this[key]))
}
/**
  Ends an undo operation over setting a given key to a value.
*/
Base.prototype.endUndoSet = function(key, fn){
  var base = this
  ;(function(value){
    ginger.undoMgr.endUndo(function(){
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

//------------------------------------------------------------------------------
//
// Utility Classes
//
//------------------------------------------------------------------------------

/**
  Self-correcting Accurate Interval
*/
var Interval = ginger.Interval = ginger.Declare(ginger.Base, function(){
  this.super(Interval);
  this.timer = null;
});
Interval.prototype.run = function(freq, duration){
  clearTimeout(this.timer);
  this.baseline = Date.now();
  this._iter(freq, duration);
}
Interval.prototype.isRunning = function(){
  return (this.timer!==null);
}
Interval.prototype._iter = function(freq, duration){
  var self = this;
  var error = Date.now() - self.baseline;
  
  if(self.time >= duration){
    self.stop();
    self.emit('ended', self.baseline);
  }else{
    var nextTick = freq - error;
    self.timer = setTimeout(function(){
      self.set('time', self.time+freq);
      self.baseline += freq;
      self._iter(freq, duration);
    }, nextTick>=0?nextTick:0);
  }
}
Interval.prototype.stop = function(){
  clearTimeout(this.timer);
  this.timer = null;
  this.emit('stop', this.baseline);
}
//------------------------------------------------------------------------------
//
// Models
//
//------------------------------------------------------------------------------
var Model = ginger.Model = ginger.Declare(ginger.Base, function(args){
  this.super(ginger.Model)
  _.extend(this, args)
  _.defaults(this, {
    _socket:ginger.Model.socket,
    __model:true
  })
  this.cid = this._id ? this._id : this.cid
  this.cid = _.isUndefined(this.cid) ? uuid() : this.cid
},
{
  findById : function(id, fn){
    var model = this,
        socket = ginger.Model.socket,
        bucket = this.__bucket;
    ServerStorage.findById(bucket, id, function(err, args){
      if(err) fn(err);
      else{
        args = args !== null ? args : Storage.findById(bucket, id)
        _instantiate(model, args, fn)
      }
    })
    return this
  },
  all : function(fn, parent){
    var model = this,
        bucket = this.__bucket;
        
    ServerStorage.all(bucket, parent, function(err, array, key){
      if(err) fn(err);
      else{
        var collection = array !== null ? array : Storage.all(bucket, parent)
        _instantiateCollection(key, model, collection, fn)
      }
    })
    return this
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
        findById : function(id, fn){
          var args = Storage.findById(bucket, id)
          _instantiate(self, args, fn)
        },
        all: function(fn, parent){
          var collection = Storage.all(bucket, parent)
          _instantiateCollection(bucket, self, collection, fn)
        },
        first: function(fn, parent){
          var args = Storage.first(bucket, parent)
          _instantiate(self, args, fn)
        }
      }
      return this._local
    }
  },
  fromJSON : function(args, fn){
    fn(new this(args))
  }
})
var _instantiate = function(model, args, fn){
  if(args){
    model.fromJSON(args, function(instance){
      if(instance){
        instance.__bucket = model.__bucket;
        instance.init(function(){
          fn(null, instance)
        })
      }else{
        fn(null, null)
      }
    })
  }else{
    fn(null, null)
  }
}
var _instantiateCollection = function(urn, model, array, callback){
  if(array){
    collection = new ginger.Collection(urn, model)
    ginger.asyncForEach(array, function(data, fn){
      _instantiate(model, data, function(err, instance){
        if((!err)&&(instance)){
          collection.add(instance)
          fn()
        }else{
          fn('Error instantiating instance:'+err)
        }
      })
    }, function(err){
      if(err){
        callback(err, null)
      }else{
        callback(null, collection)
      }
    })
  }else{
    callback(null, null)
  }
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
        Storage.save(bucket, self.cid, self.toJSON())
      },
      update: function(args){
        Storage.update(bucket, self.cid, args)
      },
      remove: function(){
        Storage.remove(bucket, self.cid)
      }
    }
    return this._local
  }
}
Model.prototype.all = function(model, fn){
  if(this._id){
    model.all(fn, this)
  }else{
    fn(null)
  }
}
Model.prototype.save = function(fn, options){
  var args = this.toArgs()
  this.update(args, fn)
}
Model.prototype.update = function(args, fn){
  var model = this,
     bucket = this.__bucket;
    
  fn = fn?fn:ginger.noop;

  if(this._id){
    ServerStorage.update(bucket, this._id, args, function(err, id){
      if(!err){
        id = id?id:this.cid;
        model.local().update(args)
      }
    })
  }else{
    ServerStorage.create(bucket, args, function(err, id){
      if(!err){
        if(id){
          model.local().remove()
          model.cid = model._id = id
          model.local().save()
          fn(id)
        }else{
          this.local().update(args)
          fn(this.cid)
        }
      }
    })
  }
}
Model.prototype.toArgs = function(){
  var args = {}  
  for(var key in this){
    if((_.isFunction(this[key])===false)&&(key[0] !== '_')){
      args[key] = this[key]
      //TODO: Add support for nested models.
    }
  }
  return args
}
Model.prototype.toJSON = ginger.Model.prototype.toArgs
/**
  This will try to keep this model synchronized with the server.
  Events will be produced when the model is updated.
*/
Model.prototype.keepSynced = function(){
  var socket = ginger.Model.socket
  var self = this
  if(this._id){
    var bucket = self.__bucket
    socket.on('update:'+this.key(), function(doc){
      self.set(doc)
      self.local().update(doc)
    })
    socket.on('delete:'+this.key(), function(id){
      self.local().remove()
      self.emit('delete', id)
    })
  }
}
Model.prototype.destroy = function(){
// clean all the associated events, etc
}
Model.socket = null

/**
  A collection is a set of ordered models. 
  It provides delegation and proxing of events.
**/
var Collection = ginger.Collection = ginger.Declare(ginger.Base, function(urn, model){
  this.super(ginger.Collection)
  this._keepSynced = false
  this._models = []
  this.urn = urn
  this.model = model
  
  var self = this
  this.on('sortByFn', function(fn){
    self.sortBy(fn)
  })
})
Collection.prototype.models = function(){
  return this._models
}
Collection.prototype.add = function(model){
  if(_.isArray(model)){
    for(var i=0, len=model.length;i<len;i++){
      this._add(model[i], this.sortByFn)
    }
  }else{
    this._add(model, this.sortByFn)
  }
}
Collection.prototype.remove = function(modelId){
  var i, len
  var models = this._models
  for(i=0,len=models.length;i<len;i++){
    if(models[i].cid === modelId){
      break;
    }
  }
  if(i!=models.length){
    models[i].off('*', this._proxyEvent)
    models.splice(i,1)
  }
}
Collection.prototype.update = function(model){
  var i = ginger.indexOf(this._models, model._id, function(a){return a._id}, true)
  if(i>=0){
    var updated = _.extend(this._models[i], model)
    if(this.sortByFn){
      this._models.splice(i,1)
      i = _.sortedIndex(this._models, updated, this.sortByFn)
      this._models.splice(i, 0, updated)
    }
  }
}
Collection.prototype.lock = function(){
  // Tries to lock this collection so that 
  // no other user can modify it.
}
Collection.prototype.keepSynced = function(){
  var self = this
  var socket = ginger.Model.socket
  socket.on('add:'+this.urn, function(entry){
    self.model.fromJSON(entry, function(instance){
      instance.init(function(){
        self.add(instance)
        self.emit('add', instance)
      })
    })
  })
  socket.on('remove:'+this.urn, function(entryId){
    self.remove(entryId)
    self.emit('remove', entryId)
  })
  this.on('change', function(entry){
    self.update(entry)
    self.emit('update', entry)
  })
  this.on('delete', function(entryId){
    self.remove(entryId)
    self.emit('remove', entryId)
  })
  this._keepSynced = true
  var models = this._models
  for(var i=0, len=models.length;i<len;i++){
    models[i].keepSynced()
  }
  return this
}
Collection.prototype._add = function(model, sortByFn){
  var self = this
  if(sortByFn){
    var i = _.sortedIndex(this._models, model, sortByFn)
    this._models.splice(i, 0, model)
  }else{
    this._models.push(model)
  }
  model.on('*', function(){
    self._proxyEvent.apply(self, arguments)
  })
  if(this._keepSynced){
    model.keepSynced()
  }
}
Collection.prototype._proxyEvent = function(){
  this.emit.apply(this, arguments)
}
// Underscore methods that we want to implement on the Collection.
var methods = 
  ['forEach', 'each', 'map', 'reduce', 'reduceRight', 'find', 'detect',
    'filter', 'select', 'reject', 'every', 'all', 'some', 'any', 'include',
    'contains', 'invoke', 'max', 'min', 'sortBy', 'sortedIndex', 'toArray', 'size',
    'first', 'rest', 'last', 'without', 'indexOf', 'lastIndexOf', 'isEmpty', 'groupBy']

// Mix in each Underscore method as a proxy to `Collection#_models`.
_.each(methods, function(method) {
  Collection.prototype[method] = function() {
    return _[method].apply(_, [this._models].concat(_.toArray(arguments)))
  }
})

//------------------------------------------------------------------------------

// FIX:
// $el.remove will indeed destroy all the DOM nodes in $el including $el
// this means that if we want to be able to re-render a removed node, we need
// to be able to re create the whole sub DOM tree from this view.
// therefore $el must be created in render. But since $el could be something
// different than a div, we will introcude the tag property, which will be used
// in render to create the proper element.
ginger.View = ginger.Declare(ginger.Base, function(classNames, css){
  var self = this
  self.super(ginger.View)
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
ginger.View.prototype.render = function($parent){
  if($parent){
    this.$parent = $parent
  }
  return this.$el.detach().appendTo(this.$parent)
}
ginger.View.prototype.update = function(){
  // Updates this view.
  /*
    Updating can imply that if this view is composed of subviews, or of
    many DOM elements, that this DOM elements are destroyed and recreated,
    (or subvies are removed and re-rendered), but the most important thing
    is that the element that this view returned in render, is still the same after
    the update.
  */
}
ginger.View.prototype.clean = function(){
  if(this.$el) this.$el.detach()
}

ginger.View.prototype.remove = function(){
  if(this.$el) this.$el.remove()
}

ginger.View.prototype.disable = function(disable){
  console.log(this+" does not implement disable")
}

ginger.View.prototype.hide = function(duration, easing, callback) {
  this.$el.hide(arguments)
}
  
ginger.View.prototype.show = function(duration, easing, callback) {
  this.$el.show(arguments)
}
//------------------------------------------------------------------------------
ginger.CanvasView = ginger.Declare(ginger.View, function(classNames){
  this.super(ginger.CanvasView, 'constructor', classNames)
  this.$canvas = null
  var cv = this
  this.on('change', function(){
    cv.draw()
  })
})
ginger.CanvasView.prototype.render = function($parent){
  this.super(ginger.CanvasView, 'render', $parent)
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
}
ginger.CanvasView.prototype.draw = function(){
  if(this.$canvas){
    return this.$canvas[0].getContext('2d')
  }else{
    return null
  }
}
//------------------------------------------------------------------------------
//
// Views
//
//------------------------------------------------------------------------------
var Views = ginger.Views = {}

//------------------------------------------------------------------------------
Views.ComboBox = ComboBox = ginger.Declare(ginger.View, function(items, selected){
  this.super(Views.ComboBox)
  var view = this
  
  if(selected){
    view.value = selected
  }else{
    view.value = this.firstValue(items)
  }
  view.items = items

  view.$el.comboBox(view.items, view.value).change(function(event){
    view.set('value', event.target.value)
  })
  
  view.on('value', function(value){
      $('select',view.$el).val(value)
  })
})
ComboBox.prototype.firstValue = function(items){
  for(var key in items){
    return items[key]
  }
}
ComboBox.prototype.willChange = function(key, value){
  if((key === 'value')&&(value===null)){
    return this.firstValue(this.items)
  }else{
    return value
  }
}
//------------------------------------------------------------------------------
Views.Slider = ginger.Declare(ginger.View, function(options, classNames){
  this.super(Views.Slider, 'constructor', classNames)
  var view = this
  
  view.options = _.isUndefined(options) ? {} : options
  view.value = _.isUndefined(view.options.value) ? 0 : view.options.value

  var options = _.clone(view.options)
  var oldSlideFn = options.slide
  
  options.start = function(event, ui){
    view.emit('start');
  }
  options.slide = function(event, ui){
    view.set('value', ui.value)
    if(view.options.slide) view.options.slide(event, ui)
  }
  options.stop = function(event, ui){
    view.set('value', ui.value)
    if(view.options.slide) view.options.slide(event, ui)
    view.emit('stop');
  }
  
  view.$el.slider(options)
    
  view.on('value', function(value){
    view.$el.slider('value', parseFloat(value))
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
Views.ColorPicker = ginger.Declare(ginger.View, function(options){
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
Views.TextField = ginger.Declare(ginger.View, function(classNames, options){
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
Views.CheckBox = ginger.Declare(ginger.View, function(css){
  this.super(Views.CheckBox)
  if(css) {
    this.$el.css(css);
  }
  
  this.$checkbox = $('<input type="checkbox">').appendTo(this.$el)
  this.$text = $('<span/>').appendTo(this.$el)
  
  var view = this;
  
  this.checked = function(){
    return view.$checkbox.attr('checked')
  }
  
  this.$checkbox.on('change',function(event){
    if( $(this).is(':checked') ) {
      view.emit('checked',view,event);
    } else {
      view.emit('unchecked',view,event)
    }
  })
  
  this.on('text',function(value) {
    view.$text.html(value)
  })
})
//------------------------------------------------------------------------------
Views.RadioButton = ginger.Declare(ginger.View, function(){
  this.super(Views.RadioButton)
})
//------------------------------------------------------------------------------
Views.Label = ginger.Declare(ginger.View, function(classNames, css){
  this.$el = $('<span>');
  this.super(Views.Label, 'constructor', classNames, css)

  var view = this
  this.on('text', function(value){
    view.$el.html(value)
  })
})
//------------------------------------------------------------------------------
Views.Button = ginger.Declare(ginger.View, function(options){
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
      .html('<a href="#">'+this.label+'</a>')
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
var Toolbar = Views.Toolbar = 
  ginger.Declare(ginger.View, function(classNames, itemsClassNames){
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
var PopUp = Views.PopUp = ginger.Declare(ginger.View, function(classNames, 
                                                               $parent,
                                                               options){
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
PopUp.prototype.hide = function(){
  var self = this
  self._state = 3
  self.$el.fadeOut(self.endTime, function(){
    self._state = 0
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
Views.ToolTip = ginger.Declare(PopUp, function(classNames, 
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
