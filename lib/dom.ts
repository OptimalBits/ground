/**
  Ground Web Framework. Route Management. (c) OptimalBits 2011-2012.
*/
/**
  DOM Utils.
    
  Simple and lightweight utility functions for cross browser DOM manipulation.
*/

module Gnd {
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
export function $$(selector: string, context: Element): Element
{
  var el = context || document;
  switch(selector[0]){
    case '#': return el.getElementById(selector.slice(1));
    case '.': return el.getElementsByClassName(selector.slice(1));
  }
  return el.getElementsByTagName(selector);
}

export function isElement(object) {
  return object && object.nodeType === Node.ELEMENT_NODE
}

/**
  DOM Events
*/
export function addEventListener(el: Element, eventName: string, handler: (evt) => void){
  if(el.addEventListener){
    // W3C DOM
    el.addEventListener(eventName, handler);
  }else if (el['attachEvent']){
    // IE DOM 6, 7, 8
    el['attachEvent']("on"+eventName, handler);
  }
}

export function removeEventListener(el: Element, eventName: string, handler: (evt) => void){
  if(el.removeEventListener){
    // W3C DOM
    el.removeEventListener(eventName, handler);
  }else if (el['detachEvent']) { 
    // IE DOM 6, 7, 8
    el['detachEvent']("on"+eventName, handler);
  }
}

/**
  DOM Attributes.

*/
// See: http://www.quirksmode.org/dom/w3c_core.html#attributes
export function setAttr(el: Element, attr: string, value: any){
  if(el.hasOwnProperty(attr)){
    el[attr] = value;
  }
  if(value){
    el.setAttribute(attr, value);
  }else{
    el.removeAttribute(attr);
  }
}

export function getAttr(el: Element, attr){
  if(el.hasOwnProperty(attr)){
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

} // Gnd
