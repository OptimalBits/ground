/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  Base Class.
  
  Most classes extends the base class in order to be observable,
  get property bindings and reference counting.
*/

/// <reference path="../third/underscore.browser.d.ts" />

import Event = module("./event");
import Undo = module("./undo");

// TODO: we need a portable stack trace.
/*declare class Error {
  stack : string;
}
*/
// Error.prototype.stack = Error.prototype.stack || '';

export class Base extends Event.Emitter{
  private refCounter: number = 1;
  private bindings: any = {};
  private formatters;
  private destroyed: bool;
  private destroyedTrace: string;
  private undoMgr: Undo.Manager = new Undo.Manager();
  
  constructor (){
    super();
    if(!(this instanceof Base)){
      return new Base();
    }
  }
  
  private _set(keypath, val, options) {
    var path = keypath.split('.'), obj, len=path.length-1, key = path[len];
  
    for(var i=0;i<len;i++){
      var t = this[path[i]];
      if (!t){
        obj = this[path[i]] = {};
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
  
  /**
    set - Sets a property and notifies any listeners attached to it if changed.
  */
  private set(keyOrObj, val, options?) {
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
  
  willChange(key, val) {
    return val;
  }
  
  /**
    get - Gets a property. Accepts key paths for accessing deep properties.
  */
  get(key){
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
  bind(key, object, objectKey){
    var dstKey = objectKey || key

    this.unbind(key)
  
    var dstListener = _.bind(object.set, object, dstKey)
    this.on(key, dstListener)
  
    var srcListener = _.bind(this.set, this, key)
    object.on(dstKey, srcListener)
  
    this.bindings[key] = [dstListener, object, dstKey, srcListener];
  
    // sync
    this.set(key, object[dstKey])
  
    return this
  }
  /**
    unbind - Removes a binding.

  */
  unbind(key){
    var bindings = this.bindings
    if( (bindings!=null) && (bindings[key]) ){
      var binding = bindings[key]
      this.removeListener(key, binding[0])
      binding[1].removeListener(binding[2], binding[3])
      delete bindings[key]
    }
  }
  format(property, fn){
    if(arguments.length==1){
      if(_.isObject(property)){
        if(!this.formatters){
          this.formatters = {};
        }
        _.extend(this.formatters, property);
      } else if((this.formatters)&&(property in this.formatters)){
        var val = this.get(property);
        if(_.isFunction(val)){
          val = val.call(this);
        }
        return this.formatters[property].call(this, val);
      }else{
        return this.get(property);
      }
    }else{
      if(!this.formatters){
        this.formatters = {};
      }
      this.formatters[property] = fn;
    }
  }
  /**
    Begins an undo operation over setting a given key to a value.
  */
  beginUndoSet(key){
    var base = this
    ;(function(value){
      this.undoMgr.beginUndo(function(){
        base.set(key, value)
    }, name)}(this[key]))
  }
  /**
    Ends an undo operation over setting a given key to a value.
  */
  endUndoSet(key, fn){
    var base = this
    ;(function(value){
      this.undoMgr.endUndo(function(){
        base.set(key, value)
    })}(this[key]))
  }
  /**
    Sets a key value while registering it as an undo operation
  */
  undoSet(key, value, fn){
    this.beginUndoSet(key)
    this.set(key, value)
    this.endUndoSet(key, fn)
  }
  destroy(){
    this.off();
    // We should nullify this object.
  }
  
  retain(){
    if(this.destroyed){
      throw new Error("Cannot retain destroyed object");
    }
    this.refCounter++;
    return this;
  }
  release(){
    this.refCounter--;
    if(this.refCounter===0){
      this.emit('destroy:');
      this.destroy();
      this.destroyed = true;
      this.destroyedTrace = "";//new Error().stack;
    }else if(this.refCounter < 0){
      var msg;
      if(this.destroyed){
        msg = "Object has already been released";
        if(this.destroyedTrace){
          msg += '\n'+this.destroyedTrace;
        }
        throw new Error(msg);
      }else{
        msg = "Invalid reference count!";
      }
      throw new Error(msg);
    }
    return this;
  }
  
  isDestroyed(){
    return this.refCounter === 0;
  }
}
