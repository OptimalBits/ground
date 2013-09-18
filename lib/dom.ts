/**
  Ground Web Framework. DOM Management. (c) OptimalBits 2011-2012.
*/
/**
  DOM Utils.
    
  Simple and lightweight utility functions for cross browser DOM manipulation.
  
  Some functions based or inspired by 140medley
    https://github.com/honza/140medley
  and sizzle
*/

/// <reference path="promise" />

/**
  @module Gnd
*/
module Gnd
{
  /*
   *  Usage:
   *   $('div');
   *   $('#name');
   *   $('.name');
   *
   */
  
   /**
     @class Gnd
     @static
   */
   
   /**
     Query factory method. 
     
     This function is compatible with jQuery $ function (although with much
     less functionality)
   
     @for Gnd
     @method $
     @param selector {String}
   */
  export function $(element: Element[]): Query;
  export function $(element: Query): Query;
  export function $(element: Window): Query;
  export function $(element: Element): Query;
  export function $(selector: string, context?: HTMLElement): Query;
  export function $(selector: string, context?: string): Query;
  export function $(selectorOrElement: any, context?: HTMLElement): Query
  {
    var ctx = context ? $(context)[0] : document;
    
    if(selectorOrElement instanceof Query){
      return selectorOrElement;
    }
    
    var
      query = new Query(),
      el, 
      push = function(elements: any){
        for(var i: number=0; i<elements.length; i++){
          query[i] = elements[i];
        }
        query.length = elements.length;
      }
      
    if(_.isString(selectorOrElement)){
      var selector = selectorOrElement;
    
      switch(selector[0]){
        case '#':
          var id = selector.slice(1);
          el = document.getElementById(id);
          if(el && el.parentNode) {
            // Handle the case where IE, Opera, and Webkit return items
            // by name instead of ID
            if(el.id === id){
              push([el]);
            }
          }
          break;
        case '.': 
          var className = selector.slice(1);
          push(ctx.getElementsByClassName(className));
          break;
        case '<':
          push([makeElement(selector)]);
          break;
        default:
          push((selector != 'document' ? <any>ctx.getElementsByTagName(selector) : [document]));
      }
    }else if(_.isArray(selectorOrElement)){
      push(selectorOrElement);
    }else{
      push([selectorOrElement]);
    }
    return query;
  }

export interface QueryNodes{
  [index: number]: HTMLElement;
}

/**
 * This class implements a minimal subset of jQuery methods, mostly used internally
 * by the framework, but it is exposed publicly for convenience.
 *
 * @class Query
 * @constructor
 */
export class Query // implements QueryNodes
{
  public length: number;
  
  /**
    Appends the specified content to the set of matching elements.
    
    @method append
    @param content {String}
    @chainable
  */
  /**
    Appends the specified content to the set of matching elements.
    
    @method append
    @param content {Element}
    @chainable
  */
  /**
    Appends the specified content to the set of matching elements.
    
    @method append
    @param content {Query}
    @chainable
  */
  append(content)
  {
    _.each(this, (parent) => {
      _.each($(content), (child) => {
        parent.appendChild(child);
      });
    });
    return this;
  }
  
  /**
    Appends the current set of matching elements to the specified target
    
    @method appendTo
    @param content {String}
    @chainable
  */
  /**
    Appends the current set of matching elements to the specified target
    
    @method appendTo
    @param content {Element}
    @chainable
  */
  /**
    Appends the current set of matching elements to the specified target
    
    @method appendTo
    @param content {Query}
    @chainable
  */
  appendTo(target)
  {
    return $(target).append(this);
  }
  
  /**
   * Listen to DOM events.
   *
   * @method on
   * @params eventNames {String} list of events to listen separated by spaces.
   * @params handler {Function} Callback function
   * @chainable
   */
  on(eventNames: string, handler: (evt) => void): Query
  {
    _.each(eventNames.split(' '), (eventName) => {
      _.each(this, (el) => {
        if(el.addEventListener){
          // W3C DOM
          el.addEventListener(eventName, handler);
        }else if (el['attachEvent']){
          // IE DOM 6, 7, 8
          el['attachEvent']("on"+eventName, handler);
        }
      });
    });
    return this;
  }
  
  /**
   * Listen just once to DOM events.
   *
   * @method one
   * @params eventNames {String} list of events to listen separated by spaces.
   * @params handler {Function} Callback function.
   * @chainable
   */
  one(eventNames: string, handler: (evt) => void): Query
  {
    var wrapper = (evt) => {
      handler(evt);
      this.off(eventNames, wrapper);
    }
    return this.on(eventNames, wrapper);
  }
  
  /**
   * Stop listening to DOM events.
   *
   * @method off
   * @params eventNames {String} list of events to stop listen to separated by spaces.
   * @params handler {Function} Callback function.
   * @chainable
   */
  off(eventNames: string, handler: (evt) => void): Query
  {
    _.each(eventNames.split(' '), (eventName) => {
      _.each(this, (el) => {
        if(el.removeEventListener){
          // W3C DOM
          el.removeEventListener(eventName, handler);
        }else if (el['detachEvent']) { 
          // IE DOM 6, 7, 8
          el['detachEvent']("on"+eventName, handler);
        }
      });
    });
    return this;
  }
  
  /**
   * Trigger DOM events.
   *
   * @method trigger
   * @params eventNames {String} list of events to trigger
   * @chainable
   */
  trigger(eventNames: string)
  {
    _.each(eventNames.split(' '), (eventName) => {
      _.each(this, (element) => {
        if (document.createEventObject){
          // dispatch for IE
          var evt = document.createEventObject();
          element.fireEvent('on'+eventName, evt)
        }else{
          // dispatch for firefox + others
          var msEvent = document.createEvent("HTMLEvents");
          msEvent.initEvent(eventName, true, true ); // event type,bubbling,cancelable
          !element.dispatchEvent(msEvent);
        }
      });
    });
    return this;
  }
  
  /**
   * Gets DOM attributes.
   *
   * @method attr
   * @params attr {String} Attribute name to get.
   * @return {Any} attribute value.
   */
  attr(attr: string): any;
  
  /**
   * Sets DOM attributes.
   *
   * @method attr
   * @params attr {String} Attribute name to set.
   * @params value {Any} Attribute value to set.
   * @chainable
   */
  attr(attr: string, value: any): Query;
  
  attr(attr: string, value?: any)
  {
    if(!_.isUndefined(value)){
      _.each(this, (el) => {
        setAttr(el, attr, value);
      })
      return this;
    }else{
      return getAttr(this[0], attr);
    }
  }
  
  /**
   * Sets DOM styles.
   *
   * @method css
   * @params styles {Object} Object mapping styles and its values.
   * @chainable
   */
  css(styles: {[index: string]: string;})
  {
    _.each(this, (el) => el.style && _.extend(el.style, styles));
    return this;
  }
  
  /**
   * Shows DOM Elements
   *
   * @method show
   * @chainable
   */
  show()
  {
    _.each(this, (el) => show(el));
    return this;
  }

  /**
   * Hide DOM Elements
   *
   * @method hide
   * @chainable
   */
  hide()
  {
    _.each(this, (el) => hide(el));
    return this;
  }

  /**
   * Sets a text string as content for the matched set of elements.
   *
   * @method text
   * @param text {String} text to fill the DOM elements with.
   * @chainable
   */
  text(text: string): Query;
  
  /**
   * Gets a text string as content for the first matched element.
   *
   * @method text
   * @return {String} first DOM element content.
   */
  text(): string;
   
  text(text?: string)
  {
    var el = this[0];
    if(el.textContent){
      if(_.isUndefined(text)) return el.textContent;
      _.each(this, (el) => el.textContent = text);
    }else{
      if(_.isUndefined(text)) return el.innerText;
      _.each(this, (el) => el.innerText = text);
    }
    return this;
  }

  /**
   * Sets a html string as content for the matched set of elements.
   *
   * @method html
   * @param text {String} html string to fill the DOM elements with.
   * @chainable
   */
  html(html: string): Query;
  
  /**
   * Gets a html string as content for the first matched element.
   *
   * @method html
   * @return {String} first DOM element content.
   */
  html(): string;

  html(html?: string)
  {
    if(_.isUndefined(html)) return this[0].innerHTML;
    _.each(this, (el) => el.innerHTML = html);
    return this;
  }
  
  /**
   * Remove all matched elements from their parents.
   *
   * @method remove
   * @chainable
   *
   */
  remove(): Query
  {
    // TODO: remove also all events associated to this node.
    _.each(this, (el) => this.removeNode(el));
    return this;
  }

  /**
   * Empty all matched elements.
   *
   * @method empty
   * @chainabe
   *
   */  
  empty(): Query
  {
    _.each(this, (el) => {
      while (el.hasChildNodes()) {
        el.removeChild(el.lastChild);
      }
    });
    return this;
  }
  
  /**
   *
   * Add classnames to the matched set of DOM elements.
   * 
   * @method addClass
   * @params classNames {String} List of classnames separated by spaces.
   * @chainable
   */
  addClass(classNames: string): Query
  {
    _.each(this, (el) => {
      var oldClassNames = el.className ? _.compact(el.className.split(' ')) : [];
      el.className = _.union(oldClassNames, classNames.split(' ')).join(' ');
    });
    return this;
  }
  
  /**
   *
   * Remove classnames from the matched set of DOM elements.
   * 
   * @method removeClass
   *
   * @params classNames {String} List of classnames separated by spaces.
   * @chainable
   */
  removeClass(classNames): Query
  {
    _.each(this, (el) => {
      var oldClassNames = el.className ? _.compact(el.className.split(' ')) : [];
      el.className = 
        _.difference(oldClassNames, classNames.split(' ')).join(' ');
    });
    return this;
  }
  
  /**
   *
   * Calculates the bounding client rectangle of the first matched DOM element.
   * @method rect
   *
   * @return {Object} Returns a object with left, top, width and height
   */
  rect()
  {
    if(this[0]) return this[0].getBoundingClientRect();
  }
  
  /**
   *
   * Get all parents from the matched set of DOM elements.
   * 
   * @params classNames {String} List of classnames separated by spaces.
   * @return {Query} set of parents for all the matched elements.
   * TODO: remove possible duplicates.
   */
  parent(): Query
  {
    return $(_.map(this, (el) => el.parentNode));
  }
  
  private removeNode(el){
    el.parentNode.removeChild(el);
  }
}

export function isElement(object) {
  return object && object.nodeType === Node.ELEMENT_NODE
}

/*
 * Create DOM element
 *
 * Usage:
 *   var el = m('<h1>Hello</h1>');
 *   document.body.appendChild(el);
 *
 *
 *            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
 *                    Version 2, December 2004
 *
 * Copyright (C) 2011 Jed Schmidt <http://jed.is> - WTFPL
 * More: https://gist.github.com/966233
 *
 */
export function makeElement(html: string): DocumentFragment
{
  var 
    child,
    container = document.createElement("div"),
    fragment = document.createDocumentFragment();
    
  container.innerHTML = html;
  
  while (child = <HTMLElement> container.firstChild){
    fragment.appendChild(child);
  } 

  return fragment;
}

/**
  DOM Attributes.

*/
// See: http://www.quirksmode.org/dom/w3c_core.html#attributes
export function setAttr(el: Element, attr: string, value: any){
  if(!_.isUndefined(el[attr])) {
    el[attr] = value;
  }
  if(value){
    el.setAttribute(attr, value);
  }else{
    el.removeAttribute(attr);
  }
}

export function getAttr(el: Element, attr){
  if(!_.isUndefined(el[attr])) {
    return el[attr];
  }else{
    var val = el.getAttribute(attr);
    switch(val){
      case 'true': return true;
      case null:
      case 'false': return false;
      default: return val;
    }
  }
}

/**
  Show / Hide
  
*/
export function show(el: Element)
{
  el['style'].display = getAttr(el, 'data-display') || 'block';
}

export function hide(el: Element)
{
  var oldDisplay = el['style'].display;
  (oldDisplay != 'none') && setAttr(el, 'data-display', oldDisplay);
  el['style'].display = 'none';
}

//
// Serialize object to be used as query string.
// Ref: http://stackoverflow.com/questions/1714786/querystring-encoding-of-a-javascript-object
//
export function serialize(obj) {
  var str = [];
  for(var p in obj)
     str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
  return str.join("&");
}
} // Gnd


//------------------------------------------------------------------------------
//
// Ajax
// 
//------------------------------------------------------------------------------
/**
  @class Ajax
  @static Ajax
*/
module Gnd.Ajax
{
  /**
    Performs a HTTP GET operation.
  
    @method get
    @params url {String} url where to perform the operation.
    @params obj {Object} Plain object with data to send to the server.
    @returns {Promise} Promise with the result of the operation.
  */
  export function get(url: string, obj?: {}): Promise<any>
  {
    return base('GET', url, obj);
  }
  
  /**
    Performs a HTTP PUT operation.
  
    @method put
    @params url {String} url where to perform the operation.
    @params obj {Object} Plain object with data to send to the server.
    @returns {Promise} Promise with the result of the operation.
  */
  export function put(url: string, obj: {}): Promise<any>
  {
    return base('PUT', url, obj);
  }
  
  /**
    Performs a HTTP POST operation.
  
    @method post
    @params url {String} url where to perform the operation.
    @params obj {Object} Plain object with data to send to the server.
    @returns {Promise} Promise with the result of the operation.
  */
  export function post(url: string, obj: {}): Promise<any>
  {
    return base('POST', url, obj);
  }
  
  /**
    Performs a HTTP DELETE operation.
  
    @method get
    @params url {String} url where to perform the operation.
    @params [obj] {Object} Plain object with data to send to the server.
    @returns {Promise} Promise with the result of the operation.
  */
  export function del(url: string, obj?: {}): Promise<any>
  {
    return base('DELETE', url, obj);
  }

  /*
   * Get cross browser xhr object
   *
   *
   *            DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE
   *                    Version 2, December 2004
   *
   * Copyright (C) 2011 Jed Schmidt <http://jed.is>
   * More: https://gist.github.com/993585
   *
  */
  function getXhr(): XMLHttpRequest
  {
    for(var i=0; i<4; i++){
      try{        
        return i ? 
          new ActiveXObject([, "Msxml2", "Msxml3", "Microsoft"][i] + ".XMLHTTP")               
          : new XMLHttpRequest;
      }
      catch(e){
          // ignore when it fails.
      }
    }
  }
  
  function base(method: string, url: string, obj?: {}): Promise<any>
  {
    var promise = new Promise();
    
    var xhr = getXhr();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        xhr.onreadystatechange = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          var res;
          try {
            res = JSON.parse(xhr.responseText || {});
          } catch(e) {};
          promise.resolve(res);
        } else {
          var err = new Error("Ajax Error: "+xhr.responseText);
          err['status'] = xhr.status;
          promise.reject(err);
        }
      } else {
          // still not ready
      }
    }
    xhr.open(method, url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(obj || {}));

    return promise;
  }
} // Ajax

module Gnd {

  var keyMapping = {
    'backspace': 8,
    'enter': 13,
    'caps': 20,
    'esc': 27,
    'space': 32,
    'left': 37,
    'right': 38,
    'up': 39,
    'down': 40,
    'ctrl': 17,
    'alt': 18,
    'window': 91,
    'cmd': 91,
    'shift': 16,
    'tab': 9
  };
  
  var modifiers = {
    'shiftKey': 16,
    'ctrlKey': 17,
    'altKey': 18,
    'metaKey': 91
  };

/**
  This function returns a key handler suitable for DOM keydown events.
  
  It provides a chainable API where the last link should provide a callback
  that is executed when the event matches the key and modifiers.
  
  This function allows to register handlers to key presses including
  key modifiers such as shift, ctrl, alt and meta.
  
  @for Gnd
  @method keypressed
  @example 
      
      // Attaching keydown events directly to the DOM 
      Gnd.$('document').on('keydown', Gnd.keypressed('a').ctrl().alt(function(){
          // Called when a + ctrl + alt is pressed
      });
      
      // Attaching key events to view model events
      room.onKeyPress = Gnd.keypressed().enter(function(evt){
        sendMessage();
      });
      
      var viewModel = new Gnd.ViewModel('#msgbox', { 
        room: room
      });
      
      //
      // <input id="msgbox" type="text" data-event="keypress: room.onKeyPress">
      //

**/
export function keypressed(str?: string, cb?): (evtOrEl, evt?) => void
{
  var callbacks = [];
  var keys = [];
  
  if(_.isString(str)){
    _.each(str.split(''), (c) => {
      keys.push(c.toUpperCase().charCodeAt(0))
    });
  }else{
    cb = str;
  }
  
  cb && callbacks.push(cb);
  
  var handleEvent = (evtOrEl, evt?) =>
  {
    var pressed = [];
    
    evt = !_.isUndefined(evtOrEl.which) ? evtOrEl : evt;
    
    for(var modifier in modifiers){
      evt[modifier] && pressed.push(modifiers[modifier]);
    }
    
    pressed.push(evt.which);
    pressed = _.unique(pressed);
    
    if(pressed.length === keys.length && !_.difference(keys, pressed).length){
      _.each(callbacks, (cb) => cb(evt));
    }
  }
  
  _.each(keyMapping, (keyCode, key?) => handleEvent[key] = (cb) => {
    cb && callbacks.push(cb); 
    keys.push(keyCode);
    return handleEvent;
  });
    
  return handleEvent;
}

}
