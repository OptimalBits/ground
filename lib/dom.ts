/**
  Ground Web Framework. Route Management. (c) OptimalBits 2011-2012.
*/
/**
  DOM Utils.
    
  Simple and lightweight utility functions for cross browser DOM manipulation.
  
  Some functions based or inspired by 140medley:
  https://github.com/honza/140medley
*/

module Gnd
{
  
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

export function $$(selector: string, context?: Element): HTMLElement
{
  var el = context || document;
  switch(selector[0]){
    case '#': return el.getElementById(selector.slice(1));
    case '.': return el.getElementsByClassName(selector.slice(1));
  }
  return el.getElementsByTagName(selector)[0];
}

export function $$$(tagName: string, context?: Element): NodeList
{
  var el = context || document;
  return el.getElementsByTagName(tagName);
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
  var container = document.createElement("p");      // create a container element,
  var fragment = document.createDocumentFragment(); // create a fragment.
  container.innerHTML = html;                       // write the HTML to it, and
  
  while (container = <HTMLElement> container.firstChild){ // the container element has a first child
    fragment.appendChild(container);             // append the child to the fragment,
  } 

  return fragment;
}

/**
  DOM Events
*/

export function $$on(el: Element, eventName: string, handler: (evt) => void){
  if(el.addEventListener){
    // W3C DOM
    el.addEventListener(eventName, handler);
  }else if (el['attachEvent']){
    // IE DOM 6, 7, 8
    el['attachEvent']("on"+eventName, handler);
  }
}

export function $$off(el: Element, eventName: string, handler: (evt) => void){
  if(el.removeEventListener){
    // W3C DOM
    el.removeEventListener(eventName, handler);
  }else if (el['detachEvent']) { 
    // IE DOM 6, 7, 8
    el['detachEvent']("on"+eventName, handler);
  }
}

export function fireEvent(element, event){
  if (document.createEventObject){
    // dispatch for IE
    var evt = document.createEventObject();
    return element.fireEvent('on'+event,evt)
  }else{
    // dispatch for firefox + others
    var msEvent = document.createEvent("HTMLEvents");
    msEvent.initEvent(event, true, true ); // event type,bubbling,cancelable
    return !element.dispatchEvent(msEvent);
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

/**
  Show / Hide
  
*/

export function show(el: Element)
{
  el['style'].display = getAttr(el, 'data-display') || 'block';
}

export function hide(el: Element)
{
  setAttr(el, 'data-display', el['style'].display);
  el['style'].display = "none";
  
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

//------------------------------------------------------------------------------
//
// Ajax
// 
//------------------------------------------------------------------------------

module Gnd.Ajax
{ 
  export interface AjaxCallback
  {
    (err?: Error, doc?:{}): void;
  }
  
  export function get(url: string, obj: {}, cb: AjaxCallback)
  {
    base('GET', url, obj, cb);
  }
  export function put(url: string, obj: {}, cb: AjaxCallback)
  {
    base('PUT', url, obj, cb);
  }
  export function post(url: string, obj: {}, cb: AjaxCallback)
  {
    base('POST', url, obj, cb);
  }
  export function del(url: string, obj: {}, cb: AjaxCallback)
  {
    base('DELETE', url, obj, cb);
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
  
  function base(method: string, url: string, obj: {}, cb: AjaxCallback)
  {
    var xhr = getXhr();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        xhr.onreadystatechange = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          var res;
          try{
            res = JSON.parse(xhr.responseText || {});
          }catch(e){};
          cb(null, res);
        } else {
          cb(new Error("Ajax Error: "+xhr.responseText));
        }
      } else {
          // still not ready
      }
    }
    xhr.open(method, url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify(obj));
  }
} // Ajax

} // Gnd
