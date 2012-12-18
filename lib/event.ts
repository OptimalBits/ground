/**
  Ground Web Framework (c) 2012 Optimal Bits Sweden AB
  MIT Licensed.
*/

/**
  Events Module. Includes an EventEmitter that can be used to extend 
  any other class.
*/

//
// Event Emitter
// (based on original work by Oliver Caldwell, olivercaldwell.co.uk)
// Dual licensed under the MIT or GPL Version 2 licenses.
// https://github.com/Wolfy87/EventEmitter
//

/// <reference path="../third/underscore.browser.d.ts" />

module Gnd {

export class EventEmitter {
  private _listeners;
  private _namespaces;
  
  private getListeners(){
    this._listeners = this._listeners || {}
    return this._listeners
  }

  private getNamespaces(){
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
  on(eventNames, listener) {
    var events = eventNames.split(' '), listeners = this.getListeners();
  
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
        var namespaces = this.getNamespaces();
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
  emit(eventName, ...args:any[]) {
    var listeners = this.getListeners()
    if(listeners['*']){
      this._fire(listeners['*'], arguments)
    }
    if(listeners[eventName]){
      //var args = _.rest(arguments)
      this._fire(listeners[eventName], args)
    }		
    return this
  }
  
  /**
    * Removes the specified listener
    * 
    * @param [{String}] eventName Name of the event to remove the listener from
    * @param [{Function}] listener Listener function to be removed
    * @returns {Object} The current instance of EventEmitter to allow chaining
    */
  off(eventNames?, listener?) {
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
  }
  
  /**
    * Returns an array of listeners for the specified event name
    * 
    * @param {String} eventName Name of the event to get the listeners for
    * @returns {Array} An array of listeners for the specified event
    */
  listeners(eventName) {
    var listeners = this.getListeners()
    return listeners[eventName] = listeners[eventName] || [];
  }
  
  /**
    * Assigns a listener to the specified event removes its self after the first run
    * 
    * @param {String} eventName Name of the event to assign the listener to
    * @param {Function} listener Function to be executed when the specified event is emitted
    * @returns {Object} The current instance of EventEmitter to allow chaining
    */
  once(eventName, listener) {
    var self = this
  
    function wrapper() {
      self.off(eventName, wrapper);
      listener.apply(this, arguments);
    }
		return self.on(eventName, wrapper);
  }
  
  /**
    * Removes all listeners from the specified (namespaced) events
    * 
    * @param {String} eventName Name of the event to remove the listeners from
    * @returns {Object} The current instance of EventEmitter to allow chaining
  */
  removeAllListeners(eventNames) {
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
  }
  
  namespace(namespace) {
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
  
  _fire(eventListeners, args){
    var listeners = [], i, len=eventListeners.length;
    for(i=0;i<len;i++){
      listeners[i] = eventListeners[i];
    }
    for(i=0; i < len; i ++) {
      listeners[i].apply(this, args);
    }
  }
  
  _removeListener(event, listener){
   var listeners = this._listeners, index;
     
    if(listeners && listeners[event]) { 
      index = _.indexOf(listeners[event], listener);
      if(index !== -1) {
        listeners[event].splice(index, 1);
        return true;
      }
    }
    return false;
  }

  _removeNamespacedEvent(event, listeners){
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
  addListener;
  addObserver;
  removeListener;
  removeObserver;
}

/**
  Aliases
*/
EventEmitter.prototype.addListener = EventEmitter.prototype.on;
EventEmitter.prototype.addObserver = EventEmitter.prototype.on;
EventEmitter.prototype.removeListener = EventEmitter.prototype.off;
EventEmitter.prototype.removeObserver = EventEmitter.prototype.off;

}
