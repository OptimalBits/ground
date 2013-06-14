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

module Gnd
{
  /*
   *  Usage:
   *   $('div');
   *   $('#name');
   *   $('.name');
   *
   */
  
  export function $(element: Window): Query;
  export function $(element: Element): Query;
  export function $(selector: string, context?: HTMLElement): Query;
  export function $(selector: string, context?: string): Query;
  export function $(selectorOrElement: any, context?: HTMLElement): Query
  {
    var ctx = context ? $(context)[0] : document;
    
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
    }else{
      push([selectorOrElement]);
    }
    return query;
  }

export interface QueryNodes{
  [index: number]: HTMLElement;
}

export class Query // implements QueryNodes
{
  public length: number;
  
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
  
  css(styles: {[index: string]: string;})
  {
    _.each(this, (el) => el.style && _.extend(el.style, styles));
    return this;
  }
  
  show()
  {
    _.each(this, (el) => show(el));
    return this;
  }
  
  hide()
  {
    _.each(this, (el) => hide(el));
    return this;
  }
  
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
  
  html(html?: string){
    if(_.isUndefined(html)) return this[0].innerHTML;
    _.each(this, (el) => el.innerHTML = html);
    return this;
  }
  
  remove(){
    // TODO: remove also all events associated to this node.
    _.each(this, (el) => this.removeNode(el));
    return this;
  }
  
  rect(){
    if(this[0]) return this[0].getBoundingClientRect();
  }
  
  private removeNode(el){
    el.parentNode.removeChild(el);
  }
}
  
/*
 * DOM selector
 *
 * Usage:
 *   $('div');
 *   $('#name');
 *   $('.name');
 *
 * http://jsperf.com/simple-jquery-selector-vs-140medley/2
 */

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

module Gnd.Ajax
{   
  export function get(url: string, obj: {}): Promise
  {
    return base('GET', url, obj);
  }
  export function put(url: string, obj: {}): Promise
  {
    return base('PUT', url, obj);
  }
  export function post(url: string, obj: {}): Promise
  {
    return base('POST', url, obj);
  }
  export function del(url: string, obj: {}): Promise
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
  
  function base(method: string, url: string, obj: {}): Promise
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
    xhr.send(JSON.stringify(obj));

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

export function keypressed(str:string, cb?): (evt) => void
{
  var callbacks = [];
  var keys = [];
  
  _.each(str.split(''), (c) => {
    keys.push(c.toUpperCase().charCodeAt(0))
  });
  
  cb && callbacks.push(cb);
  
  var handleEvent = (evt) =>
  {
    var pressed = [];
    
    for(var modifier in modifiers){
      evt[modifier] && pressed.push(modifiers[modifier]);
    }
    
    pressed.push(evt.which);
    pressed = _.unique(pressed);
    
    if(pressed.length === keys.length && !_.difference(keys, pressed).length){
      _.each(callbacks, (cb) => cb());
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
