/**
   Ginger MVC framework
   License: MIT or GPL as desired.

   Goals:
   - Based on CommonJS AMD modules.
   - Seamless synchronization of model data between browser and server. 
   - Designed for asynchronizity from the group up.
   - Builds on top of proven libraries such as jQuery, underscore and socket.io
   - Clean class hierarchies, based on javascript prototypal inheritance.
  
   Dependencies:
   - jQuery
   - Underscore
   - EventEmitter
   - Socket.io
   
   (c) 2011 OptimalBits with selected parts from the internet
   licensed as public domain or MIT.
   
   Resources:
   - http://kevinoncode.blogspot.com/2011/04/understanding-javascript-inheritance.html
   - http://javascript.crockford.com/prototypal.html
   - https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Object/create
   - http://jonathanfine.wordpress.com/2008/09/21/implementing-super-in-javascript/
 */

define(function(){

/**
  Define some useful jQuery plugins.
*/

// Populates the options of a select tag
(function( $ ){
  $.fn.comboBox = function(items, selected){
    var $comboBox = $('<select>', this)
    var options = ''
    for(var value in items){
      options += '<option '
      if (selected === value){
        options += 'selected="selected" '
      }
      options += 'value="'+value+'">'+items[value]+'</option>'
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
//
//
var ginger = {}

ginger.getEventEmitter = _.once(function() {
  return new EventEmitter()
})

function Inherit(Sub, Super){
  var newSub = Object.create(Super.prototype)
  newSub.constructor = Sub
  Sub.prototype = newSub
  Sub.superproto = Super.prototype
  Sub.prototype.super = function(klass, fn){
    if(fn) return klass.superproto[fn].apply(this, _.rest(arguments))
    else klass.superproto.constructor.apply(this, _.rest(arguments))
  }  
} 

ginger.Declare = function( Super, Sub ){
  Inherit(Sub, Super)  
  return Sub
}

//
//  Base Class - All Ginger classes derive from this one.
//
ginger.Base = function(){
  this.observers = null
  this.bindings = null
}

ginger.Base.prototype._notifyObservers = function(key, type, newVal, oldVal){
  var observers = this.observers
  if(key in observers){
    var keyObservers = observers[key]
    if (_.isArray(keyObservers)){
      for(var i=0; i<keyObservers.length;i++){
        var fn = keyObservers[i][type]
        if(fn){
          fn(newVal, oldVal)
        }
      }
    }else{
      keyObservers[type](newVal, oldVal)
    }
  }
}      
      
ginger.Base.prototype._addBinding = function(key, observer1, object, observer2){
  if(this.bindings == null){
    this.bindings = {};
  }
  this.bindings[key] = [observer1, object, observer2];
}
      
ginger.Base.prototype._removeBinding = function(key){
  var bindings = this.bindings
  if( (bindings!=null) && (bindings[key]) ){
    this.removeObserver(bindings[key][0])
    bindings[key][1].removeObserver(bindings[key][2])
  }
}
  
/**
  set - Sets a property and notifies any observers attached to it.

*/
ginger.Base.prototype.set = function(key, val){
  var observers = this.observers
  if ((this[key] != val) && (observers != null) && (observers[key] != null)){
    var oldval = this[key]
    this._notifyObservers(key, 0, val, oldval)
    this[key] = val
    this._notifyObservers(key, 1, val, oldval)
  }else{
    this.key = val
  }
}

/**
  get - Gets a property. Just declared for symetry with set.
*/
ginger.Base.prototype.get = function(key){
  return this.key
}

/**
 * Adds an observer for a key.
 * 
 * @param {String} key Key to listen for.
 * @param {Function} didChangeFn Function to call when the value in the key has changed
 * @param {Function} willChangeFn Function to call when the value in the key has changed
 * @return {Object} A handle to be used in order to remove this observer.
*/
ginger.Base.prototype.addObserver = function(key, didChangeFn, willChangeFn){
  observer = [willChangeFn, didChangeFn]
  if(this.observers == null){
    this.observers = {};
  }
  if(this.observers[key] == null){
    this.observers[key] = [observer];
  }else{
    this.observers[key].push(observer);
  }
  return observer
}
  
ginger.Base.prototype.removeObserver = function(observer){
  var observers = this.observers
  for (var key in observers){
    var keyObservers = observers[key]
    for(var i=0;i<keyObservers.length;i++){
      if(keyObservers[i] === observer){
        keyObservers.splice(i,1)
        if(keyObservers.length===0){
          delete observers[key]
        }
        break
      }
    }
  }
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
ginger.Base.prototype.bind = function(key, object, objectKey){
  var base = this
    
  var targetKey = _.isUndefined(objectKey) ? key : objectKey

  base.unbind(key)
  base[key] = object[targetKey]
    
  var observer1 = this.addObserver(key, function(newval, oldval){
    object.set(targetKey, newval)
  })
  var observer2 = object.addObserver(targetKey, function(newval, oldval){
    base.set(key, newval)
  })
  this._addBinding(key, observer1, object, observer2)
}

/**
  unbind - Removes a binding.

*/
ginger.Base.prototype.unbind = function(key){
  this._removeBinding(key)
}

ginger.Base.prototype.init = function(err, callback){
  console.log("init method not implemented by:"+this)
}

ginger.Base.prototype.deinit = function(){
  console.log("init method not implemented by:"+this)
}


// -----------------------------------------------------------------------------------

ginger.View = ginger.Declare(ginger.Base, function(){
  this.super(ginger.View)
  this.$el = null
})

ginger.View.prototype.render = function(){
  return this.$el
}
    
ginger.View.prototype.remove = function(){
    this.$el.remove()
}

// -----------------------------------------------------------------------------------
ginger.Controller = ginger.Declare(ginger.Base, function(view){
  this.super(ginger.Controller)
  this.view = view
})

// -----------------------------------------------------------------------------------
ginger.Model = ginger.Declare(ginger.Base, function(){
  this.super(ginger.Model)
})

// -----------------------------------------------------------------------------------
//
// Views
//
// -----------------------------------------------------------------------------------
ginger.Views = {}

// -----------------------------------------------------------------------------------
ginger.Views.ComboBox = ginger.Declare(ginger.View, function(items, selected){
  this.super(ginger.Views.ComboBox)
  this.value = selected
  this.items = items
})
  
ginger.Views.ComboBox.prototype.init =function(){
  var view = this
  view.$el = $('<div>').comboBox(this.items, view.value).change(function(event){
    view.set('value', event.target.value)
  })
  view.addObserver('value', function(value){
      $('select',view.$el).val(value)
  })
}

// -----------------------------------------------------------------------------------
ginger.Views.Slider = ginger.Declare(ginger.View, function(options){
  this.super(ginger.Views.Slider)
  this.value = _.isUndefined(options.value) ? 0 : options.value
  this.options = options
})

ginger.Views.Slider.prototype.init =function(){
  var view = this
  view.$el = $('<div>').comboBox(this.items, view.value).change(function(event){
    view.set('value', event.target.value)
  })
  view.addObserver('value', function(value){
      $('select',view.$el).val(value)
  })
  
  var options = _.clone(view.options)
  var oldSlideFn = options.slide

  options.slide = function(event, ui){
    view.set('value', ui.value)
    if(view.options.slide) view.options.slide(event, ui)
  }
  
  view.$el = $('<div>').slider(options)
    
  view.addObserver('value', function(value){
    view.$el.slider('value', value)
  })
}
// -----------------------------------------------------------------------------------
ginger.Views.TextField = ginger.Declare(ginger.View, function(){
  this.super(ginger.Views.TextField)
})

// -----------------------------------------------------------------------------------

return ginger
})

