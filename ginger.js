/**
   Ginger MVC framework v0.1

   Features:
   - Modular design.
   - Builds on top of proven libraries such as jQuery, underscore.
   - Clean class hierarchies, based on javascript prototypal inheritance.
   - Property bindings.
   - Models with persistence and synchronization.
   - Global and Local Events.
   - Undo/Redo Manager.
   - Set of views for common web "widgets".
   - Canvas View.

  Roadmap:
    - Seamless synchronization of model data between browser and server. 
  
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

define(['math/uuid'], function(uuid){

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
  var len = array.length;
  for(var i = 0; i < len; i++) {
    fn(array[i], function(err) {
      if(_.isNull(err)||_.isUndefined(err)){
        completed++;
        if(completed === array.length) {
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

UndoManager.prototype.beginUndo = function(undoFn){
  this._undoFn = undoFn
}

UndoManager.prototype.endUndo = function(doFn, fn){
  this.action(doFn, this._undoFn, fn)
  this._undoFn = null
}

UndoManager.prototype.action = function(doFn, undoFn, fn){
  this.undones.length = 0
  var action = {do:doFn, undo:undoFn, fn:fn}
  if(_.isNull(this._group)){
    this.actions.push(action)
  }else{
    this._group.push(action)
  }
  doFn(fn);
}

UndoManager.prototype.beginGroup = function(){
  this._group = []
}

UndoManager.prototype.endGroup = function(){
  ;(function(group){
    this.action( function(){
      for(var i=0, len = group.length; i<len; i++){
        group[i].do(group[i].fn)
      }
    },
    function(){
      for(var i=0, len=group.length; i<len;i++){
        group[i].undo(group[i].fn)
      }
    })
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
    action.undo(action.fn);
    this.undones.push(action);
  }
}

UndoManager.prototype.redo = function(){
  var action = this.undones.pop();
  if(action){
    action.do(action.fn),
    this.actions.push(action);
  }
}

ginger.undoMgr = new UndoManager()


//
// Global events
//

_.extend(ginger, new EventEmitter())

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

ginger.Declare = function(Super, Sub, staticOrName, name){
  Inherit(Sub, Super)
  if(Super.__staticMethods){
    _.extend(Sub, Super.__staticMethods)
  }
  if(staticOrName){
    if(_.isObject(staticOrName)){
      Sub.__staticMethods = staticOrName
      _.extend(Sub, staticOrName)
    }else{
      name = staticOrName
    }
  }
  if(name){
    Sub.__name = Sub.prototype.__name = name
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
    val = this.willChange(key, val)
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
Base.prototype.beginUndoSet = function(key){
  var base = this
  ;(function(value){
    ginger.undoMgr.beginUndo(function(){
      base.set(key, value)
  })}(this[key]))
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
// -----------------------------------------------------------------------------------
//
// Storage
// (requires localStorage)
// -----------------------------------------------------------------------------------
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
  if(parent){
    var key = parent.__name+':'+parent.cid+':'+bucket
    var ids = localStorage[key]
    var parentKey = parent.__name+'@'+parent.cid
    for (var i=0, len=ids.length;i<len;i++){
      var obj = localStorage[ids[i]]
      if(obj){
        collection.push(JSON.parse(obj))
      }else{
        localStorage.removeItem(ids[i])
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

// -----------------------------------------------------------------------------------
//
// Models
//
// -----------------------------------------------------------------------------------
var Model = ginger.Model = ginger.Declare(ginger.Base, function(args){
  this.super(ginger.Model)
  _.extend(this, args)
  _.defaults(this, {
    socket:ginger.Model.socket,
    __model:true
  })
  if(_.isUndefined(this._id) || _.isNull(this._id)){
    this.cid = uuid()
  }else{
    this.cid = this._id
  }
},
{ // TODO: use socket.connected to avoid unnecessary emits.
  findById : function(id, fn){
    var model = this,
        socket = ginger.Model.socket,
        name = this.__name,
        bucket = name+'s'
    if(socket){
      socket.emit('read:'+name, id, function(args){
        args = args !== null ? args : Storage.findById(bucket, id)
        _instantiate(model, args, fn)
      })
    }else{
      var args = Storage.findById(bucket, id)
      _instantiate(this, args, fn)
    }
    return this
  },
  all : function(fn, parent){
    var model = this,
        socket = ginger.Model.socket,
        bucket = ginger.pluralize(this.__name),
        urn = bucket,
        collectionKey = urn,
        collection,
        id = null
    if(parent){
      id = parent.cid
      urn = parent.__name+':'+bucket
      collectionKey = parent.__name+':'+parent.cid+':'+bucket
    }
    if(socket){
      socket.emit('read:'+urn, id, function(array){
        collection = array !== null ? array : Storage.all(bucket, parent)
        
        _instantiateCollection(collectionKey, model, collection, fn)
      })
    }else{
      collection = Storage.all(bucket, parent)
      _instantiateCollection(urn, model, collection, fn)
    }
    return this
  },
  first : function(fn){
    this.all(function(collection){
      fn(collection?collection.first() : null)
    })
  },
  fromJSON : function(args, fn){
    fn(new this(args))
  }
})
var _instantiate = function(model, args, fn){
  if(args){
    model.fromJSON(args, function(instance){
      if(instance){
        instance.init(function(){
          fn(instance)
        })
      }else{
        fn(null)
      }
    })
  }else{
    fn(null)
  }
}
var _instantiateCollection = function(urn, model, array, callback){
  if(array){
    collection = new ginger.Collection(urn, model)
    ginger.asyncForEach(array, function(data, fn){
      _instantiate(model, data, function(instance){
        if(instance){
          collection.add(instance)
          fn()
        }else{
          fn('Error instantiating instance:'+data)
        }
      })
    }, function(err){
      if(err){
        callback(null)
      }else{
        callback(collection)
      }
    })
  }else{
    callback(null)
  }
}
Model.prototype.key = function(){
  return this.__name+':'+this._id
}
Model.prototype.init = function(fn){
  fn(this)
}
Model.prototype.all = function(model, fn){
  if(this._id){
    model.all(fn, this)
  }else{
    fn(null)
  }
}
Model.prototype.save = function(fn){
  var args = this.toArgs()
  this.update(args, fn)
}
Model.prototype.update = function(args, fn){
  var model = this,
      name = this.__name,
      bucket = name+'s',
      socket = ginger.Model.socket
  if(socket){
    if(this._id) {//[this._id, args]
      socket.emit('update:'+name, {id:this._id, attrs:args}, function(){
        ginger.Storage.update(bucket, model._id, args)
        fn?fn(model._id):ginger.noop()
      })
    }else{
      socket.emit('create:'+name, attrs, function(id){
        args.cid = model._id = id
        ginger.Storage.remove(bucket, model.cid)
        ginger.Storage.update(bucket, id, args)
        fn?fn(id):ginger.noop()
      })
    }
  }else{
    ginger.Storage.save(bucket, args.cid, args)
    fn?fn(this.cid):ginger.noop()
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
  var _this = this
  if(this._id){
    var bucket = ginger.pluralize(_this.__name)
    socket.on('update:'+this.key(), function(doc){
      _this.set(doc)
      ginger.Storage.update(bucket, _this._id, doc)
    })
    socket.on('delete:'+this.key(), function(id){
      ginger.Storage.remove(bucket, _this._id)
      _this.emit('delete', id)
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
  
  var _this = this
  this.on('sortByFn', function(fn){
    _this.sortBy(fn)
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
Collection.prototype.first = function(){
  if((this._models)&&(this._models.length>0)){
    return this._models[0]
  }else{
    return null
  }
}
Collection.prototype.lock = function(){
  // Tries to lock this collection so that 
  // no other user can modify it.
}
Collection.prototype.keepSynced = function(){
  var _this = this
  var socket = ginger.Model.socket
  socket.on('add:'+this.urn, function(entry){
    _this.model.fromJSON(entry, function(instance){
      instance.init(function(){
        _this.add(instance)
        _this.emit('add', instance)
      })
    })
  })
  socket.on('remove:'+this.urn, function(entryId){
    _this.remove(entryId)
    _this.emit('remove', entryId)
  })
  this.on('change', function(entry){
    _this.update(entry)
    _this.emit('update', entry)
  })
  this.on('delete', function(entryId){
    _this.remove(entryId)
    _this.emit('remove', entryId)
  })
  this._keepSynced = true
  var models = this._models
  for(var i=0, len=models.length;i<len;i++){
    models[i].keepSynced()
  }
  return this
}
Collection.prototype._add = function(model, sortByFn){
  var _this = this
  if(sortByFn){
    var i = _.sortedIndex(this._models, model, sortByFn)
    this._models.splice(i, 0, model)
  }else{
    this._models.push(model)
  }
  model.on('*', function(){
    _this._proxyEvent.apply(_this, arguments)
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

// -----------------------------------------------------------------------------------

// FIX:
// $el.remove will indeed destroy all the DOM nodes in $el including $el
// this means that if we want to be able to re-render a removed node, we need
// to be able to re create the whole sub DOM tree from this view.
// therefore $el must be created in render. But since $el could be something
// different than a div, we will introcude the tag property, which will be used
// in render to create the proper element.
ginger.View = ginger.Declare(ginger.Base, function(classNames){
  this.super(ginger.View)
  this.$el = $('<div>', {class:classNames})
  
  this.classNames = classNames
  this.tag = '<div>'
})
ginger.View.prototype.render = function($parent){
// this.$el = $(tag, {class:this.classNames})
  this.$parent = $parent
  return this.$el.appendTo($parent)
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
// -----------------------------------------------------------------------------------
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
  
  if(this.$canvas){
    this.$canvas.remove()
  }

  this.$canvas = $('<canvas>', {
    css:{width:'100%', height:'100%'}}).appendTo(this.$el)

  this.$canvas[0].width = $parent.width()
  this.$canvas[0].height = $parent.height()
  
  this.draw()
}

ginger.CanvasView.prototype.draw = function(){
  if(this.$canvas){
    return this.$canvas[0].getContext('2d')
  }else{
    return null
  }
}
// -----------------------------------------------------------------------------------
ginger.Controller = ginger.Declare(ginger.Base, function(view){
  this.super(ginger.Controller)
  this.view = view
})
// -----------------------------------------------------------------------------------
//
// Views
//
// -----------------------------------------------------------------------------------
ginger.Views = {}

// -----------------------------------------------------------------------------------
ginger.Views.ComboBox = ComboBox = ginger.Declare(ginger.View, function(items, selected){
  this.super(ginger.Views.ComboBox)
  var view = this
  
  if(selected){
    view.value = selected
  }else{
    view.value = this.firstValue(items)
  }
  view.items = items

  view.$el.comboBox(view.items, view.value).change(function(event){
    view.set('value', event.target.value)
  }).css({display:'inline'})
  
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
// -----------------------------------------------------------------------------------
ginger.Views.Slider = ginger.Declare(ginger.View, function(options){
  this.super(ginger.Views.Slider)
  var view = this
  
  view.options = _.isUndefined(options) ? {} : options
  view.value = _.isUndefined(view.options.value) ? 0 : view.options.value

  var options = _.clone(view.options)
  var oldSlideFn = options.slide
  
  options.start = function(event, ui){
  
  }
  options.slide = function(event, ui){
    view.set('value', ui.value)
    if(view.options.slide) view.options.slide(event, ui)
  }
  options.stop = function(event, ui){
    view.set('value', ui.value)
    if(view.options.slide) view.options.slide(event, ui)
  }
  
  view.$el.slider(options)
    
  view.on('value', function(value){
    view.$el.slider('value', parseInt(value))
  })
})
ginger.View.prototype.disable = function(disable){
  if(disable){
    this.$el.slider('disable');
  }else{
    this.$el.slider('enable');
  }
}
// -----------------------------------------------------------------------------------
ginger.Views.ColorPicker = ginger.Declare(ginger.View, function(options){
  this.super(ginger.Views.ColorPicker)
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
ginger.Views.ColorPicker.prototype.render = function($parent){
  this.super(ginger.Views.ColorPicker, 'render')
  $parent.append(this.$colorPicker)
  return this.$el
}
ginger.View.prototype.disable = function(disable){
  this.$colorPicker.miniColors('disabled', disable);
}
// -----------------------------------------------------------------------------------
ginger.Views.TextField = ginger.Declare(ginger.View, function(){
  this.super(ginger.Views.TextField)
})
// -----------------------------------------------------------------------------------
ginger.Views.CheckBox = ginger.Declare(ginger.View, function(){
  this.super(ginger.Views.CheckBox)
})
// -----------------------------------------------------------------------------------
ginger.Views.RadioButton = ginger.Declare(ginger.View, function(){
  this.super(ginger.Views.RadioButton)
})
// -----------------------------------------------------------------------------------
ginger.Views.Label = ginger.Declare(ginger.View, function(){
  this.super(ginger.Views.Label)
  var view = this
  this.on('text', function(value){
    view.$el[0].innerHTML = value
  })
})
// -----------------------------------------------------------------------------------
ginger.Views.Button = ginger.Declare(ginger.View, function(options){
  this.super(ginger.Views.Button)
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
    var $label = $('<div>').html('<a href="#">'+this.label+'</a>').css({float:'left'})
    view.$el.append($label)
  }
})
ginger.Views.Button.prototype.enable = function(enable){
  if(enable){
    // Enable button.
  }else{
    // Disable button.
  }
}
// -----------------------------------------------------------------------------------
ginger.Views.Toolbar = ginger.Declare(ginger.View, function(items, classNames){
  this.super(ginger.Views.Toolbar)
  var view = this

  if(classNames){
    view.$el.addClass(classNames)
  }
  view.items = items
  
  var clickCallback = function(sender, event){
    view.emit('click', sender, event)
  }
  
  for(var i=0; i<items.length;i++){
    var $item_container = $('<div>').addClass('ginger_toolbaritem');
    view.$el.append($item_container)
    $item_container.append(items[i].$el)
    items[i].on('click', clickCallback)
  }
})
/*
ginger.Views.Toolbar.prototype.render = function(){
 var $el = this.super(ginger.Views.Toolbar, 'render') 
  for(var i=0; i<this.items.length;i++){
    $el.append(this.items[i].render().css({float:'left'}))
  }
  
  return $el
}
*/
// -----------------------------------------------------------------------------------
ginger.Views.ToolTip = ginger.Declare(ginger.View, function(){
  this.super(ginger.Views.ToolTip)
})
// -----------------------------------------------------------------------------------

return ginger
})
