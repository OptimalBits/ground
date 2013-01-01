/**
  Ground Web Framework (c) 2011-2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  ViewModel class
  
  This class provides declarative bindings for binding views to
  models.
*/

/// <reference path="../third/underscore.browser.d.ts" />

/// <reference path="base.ts" />
/// <reference path="model.ts" />

// TODO: Refactor and implement unbind on the Binder classes.

module Gnd {

var dataBindingReqExp = /^data-/;

export class ViewModel {
  
  private binders: {};
  private contexts: {}[] = [];
  
  constructor(el: Element, context: {})
  {
    this.binders = {
      bind: TwoWayBinder,
      each: EachBinder,
      show: ShowBinder,
      class: ClassBinder,
      event: EventBinder
    }
    
    this.pushContext(context);
    
    this.bindNode(el);
  }

  resolveContext(keyPath: string[]): Base
  {
    var root = keyPath[0], context;
    for(var i=this.contexts.length-1; i >= 0; i--){
      context = this.contexts[i][root];
      if(context){
        return this.resolveKeypath(context, _.rest(keyPath));
      }
    }
  }
  
  pushContext(context: {})
  {
    this.contexts.push(context);
  }
  
  popContext()
  {
    this.contexts.pop();
  }
    
  /**
    Binds a node and all of its children recursively.
  */
  bindNode(node: Element)
  {
    if(node.attributes){
      var attributes = node.attributes;
      for(var j=0;j<attributes.length;j++){
        if(dataBindingReqExp.test(attributes[j].name)){
          var type = attributes[j].name.replace(dataBindingReqExp, '');
          var value = attributes[j].value;
          if(this.binders[type]){
            var binder = new this.binders[type]();
            binder.bind(node, value, this);
          }
        }
      }
    }
    
    if(node.hasChildNodes()){
      // clone children array to avoid side-effects.
      var children = _.toArray(node.childNodes);
 
      for (var i=0; i<children.length; i++){
        if(children[i].nodeType === Node.ELEMENT_NODE){
          this.bindNode(<Element> children[i]);
        }
      }
    }
  }
  
  private resolveKeypath(obj, keyPath): Base
  {
    for(var i=0; i<keyPath.length; i++){
      obj = obj[keyPath[i]];
      if(!obj) return null;      
    }
    return obj;
  }
}

interface Binder
{
  bind(el: Element, value: string, viewModel: ViewModel);
  unbind();
}

//
// Syntax: "attr0: keyPath; attr1: keyPath; "
//
class TwoWayBinder implements Binder
{
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    var 
      attributes = value.trim().split(';'),
      attrBindings = {};
      
    for(var i=0; i<attributes.length; i++){
      var attrKeyPath = attributes[i].trim().split(':');
      if(attrKeyPath.length===2){
        attrBindings[attrKeyPath[0].trim()] = makeKeypathArray(attrKeyPath[1]);
      }else{
        console.log("Warning: syntax error in data-bind:"+value);
      }
    }
    
    for(var attr in attrBindings){
      var 
        keypath = attrBindings[attr],
        model = viewModel.resolveContext(_.initial(keypath));
      
      if(model instanceof Gnd.Base){
        var keypath = _.rest(attrBindings[attr]).join('.');
        if(attr === 'text'){
          setValue(el, model.get(keypath)); // model.format(keypath));
          model.on(keypath, function(){
            setValue(el, model.get(keypath)); // model.format(keypath));
          });
          
          listenChange(el, function(value){
            setValue(el, value);
          })
        }else{
          setAttr(el, attr, model.get(keypath)); //model.format(keypath)
          model.on(keypath, function(){
            setAttr(el, attr, model.get(keypath)); //model.format(keypath)
          });
          listenChange(el, function(value){
            model.set(keypath, getAttr(el, attr));
          })
        }
      }else{
        console.log("Warning: not found a valid model: "+keypath[0]);
      }
    }
  }

  unbind(){
    // TODO: Implement
  }
}

class EachBinder implements Binder
{
  private items: Element[] = [];
  private mappings: {} = {};
  
  //
  //  Syntax: data-each="collection: itemContextName"
  //  Ex: data-each="todos: todo" data-bind="todo.description"
  //
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    var arr = value.trim().split(':');
    
    if(arr.length !== 2){
      console.log("Warning: syntax error in data-each:"+value);
      return;
    }
    
    var
      mappings = this.mappings,
      parent = el.parentNode,
      nextSibling = el.nextSibling,
      keyPath = makeKeypathArray(arr[0]),
      collection = <Gnd.Collection> viewModel.resolveContext(keyPath),
      itemContextName = arr[1].trim();
    
    if(collection instanceof Gnd.Collection){
      parent.removeChild(el);
      el.removeAttribute('data-each');
    
      var addNode = (item, nextSibling) => {
        var itemNode = <Element> el.cloneNode(true), id = item.id();
        itemNode.setAttribute('data-item', id);
      
        mappings[id] = itemNode;

        if(nextSibling){
          parent.insertBefore(itemNode, nextSibling)
        }else{
          parent.appendChild(itemNode);
        }
      
        var context = {};
        context[itemContextName] = item;
      
        viewModel.pushContext(context);
        viewModel.bindNode(itemNode);
        viewModel.popContext();
      
        item.on('id', (newId) => {
          delete mappings[id];
          id = newId;
          mappings[id] = itemNode;
          itemNode.setAttribute('data-item', newId);
        });
      }
      
      var removeNode = (id) => {
        parent.removeChild(mappings[id]);
        delete mappings[id];
      }
    
      var addNodes = () => {
        collection.filtered((err: Error, models?: Model[]) => {
          _.each(models, function(item){
            addNode(item, nextSibling);
          });
        });
      }
    
      addNodes();
    
      collection.on('added:', function(item){
        if(this.isFiltered(item)){
          addNode(item, nextSibling);
        }
      })
      .on('removed:', function(id){
        if(mappings[id]){
          removeNode(id);
        }
        // TODO: Unbind nodes recursively to avoid event and memory leaks.
      })
      .on('filterFn sorted:', function(){
        // TODO: Only remove items not in filtered collection.
        for(var id in mappings){
          removeNode(id);
        }
        addNodes();
      });
    }else{
      console.log("Warning: not found a valid collection: "+arr[0]);
    }
  }
  
  unbind(){
    // TODO: Implement
  }
}

class ShowBinder implements Binder 
{
  //
  // Syntax: data-show="keypath"
  // Example: data-show="todo.isCompleted"
  //
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    var 
      keypath = makeKeypathArray(value),
      model = viewModel.resolveContext(_.initial(keypath)),
      display = el['style'].display;
    
    function setVisibility(visible){
      if(visible){
        el['style'].display = display;
      }else{
        el['style'].display = "none";
      }
    }
      
    if(model instanceof Gnd.Model){
      var key = _.rest(keypath).join('.');
      setVisibility(model.get(key));
      model.on(key, function(value){
        setVisibility(value);
      });
    }else{
      console.log("Warning: not found a valid model: "+value);
    }
  }
  
  unbind(){
    // TODO: Implement
    // model.release(), model.off()
  };
}

class ClassBinder implements Binder
{
  //
  // Syntax: data-class="className0 className1 ... classNameN: keypath1; className10 className11 ... className1N: keypath2 ..."
  //
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    var 
      classMappings = {}, // Maps class sets to keypaths.
      classSets = value.split(';'),
      classNames = el['className'] === '' ? [] : el['className'].split(' '),
      usedClassNameSets = {};
      
    function processMapping(keypath){
      var
          keypathArray = makeKeypathArray(keypath),
          model = viewModel.resolveContext(_.initial(keypathArray));
          
      if(model instanceof Gnd.Model){
        // model.retain();
          
        var key = _.rest(keypathArray).join('.');
        if(model.get(key)){
          usedClassNameSets[keypath] = keypath;
        }
            
        model.on(key, function(value){
          if(value){
            usedClassNameSets[keypath] = keypath;
          }else{
            delete usedClassNameSets[keypath];
          }
          updateClassNames();
        });
      }else{
        console.log("Warning: not found a valid model: "+value);
      }
    }
    
    function updateClassNames(){
      var newClassNames = classNames;
      for(var key in usedClassNameSets){
        newClassNames = _.union(newClassNames, classMappings[key]);
      }
      el['className'] = newClassNames.join(' ');
    }
      
    for(var i=0; i<classSets.length; i++){
      var keyVal = classSets[i].split(':');
      if(keyVal.length === 2){
        var 
          classes = keyVal[0].trim().split(' '),
          keypath = keyVal[1].trim();
           
        classMappings[keypath] = [];
        for(var j=0; j<classes.length; j++){
          classMappings[keypath].push(classes[j].trim());
        }
    
        //
        // Set classes and start listeners
        //
        for(var keypath in classMappings){
          processMapping(keypath);
        }
         
        updateClassNames();
        
      }else{
        console.log("Warning: Syntax error in "+classSets[i]);
      }
    }
  }
  
  unbind(){
    // TODO: Implement
    // model.release();
    // removeListener();
  };
}

class EventBinder implements Binder
{
  //
  // Syntax: data-event="eventName1: keypath1; eventName2: keypath2; eventName3: keypath3"
  //
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    // NOTE: this piece of parsing code is the same as in the TwoWayBinder...
    var 
      events = value.trim().split(';'),
      eventBindings = {};
      
    for(var i=0; i<events.length; i++){
      var eventKeyPath = events[i].trim().split(':');
      if(eventKeyPath.length===2){
        eventBindings[eventKeyPath[0].trim()] = makeKeypathArray(eventKeyPath[1]);
      }else{
        console.log("Warning: syntax error in data-bind:"+value);
      }
    }
    
    for(var event in eventBindings){
      var 
        keypath = eventBindings[event],
        obj = viewModel.resolveContext(_.initial(keypath));
      
      if(obj instanceof Gnd.Base){
        var eventKeypath = _.rest(keypath).join('.');
        
        el.addEventListener(event, (evt) => {
          var handler = obj.get(eventKeypath);
          if(_.isFunction(handler)){
            handler(el, evt);
          }else{
            console.log("Warning: the given handler is not a function: "+keypath);
          }
        });
      }else{
        console.log("Warning: not found an object instance of Gnd.Base: "+keypath[0]);
      }
    }
  }
 
  unbind(){
    // TODO: Implement
    // model.release();
    // removeListener();
  }
}

// --- Helpers

if(!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g,'');
  };
}


function isElement(object) {
  return object && object.nodeType == 1
}

// See: http://www.quirksmode.org/dom/w3c_core.html#attributes
function setAttr(el, attr, value){
  if(el.hasOwnProperty(attr)){
    el[attr] = value;
  }
  if(value){
    el.setAttribute(attr, value);
  }else{
    el.removeAttribute(attr);
  }
}

function getAttr(el, attr){
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

function setValue(node, value){
  if(isElement(value)){
    node.parentNode.replaceChild(value, node);
  }else{
    if(node.textContent){
      node.textContent = value;
    }else{
      node.innerText = value;
    }
  }
}

function listenChange(node, cb){
  node.addEventListener('change', cb);
}

function makeKeypathArray(keypath: string): string[]
{
  var arr = keypath.trim().split('.');
  for(var i=0; i<arr.length; i++){
    arr[i] = arr[i].trim();
  }
  return arr;
}

} // module Gnd

