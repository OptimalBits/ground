/**
  Ground Web Framework (c) 2011-2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  ViewModel class
  
  This class provides declarative bindings for binding views to
  models.
*/

/// <reference path="../third/jquery.d.ts" />
/// <reference path="../third/underscore.browser.d.ts" />

/// <reference path="base.ts" />
/// <reference path="model.ts" />

module Gnd {

var dataBindingReqExp = /^data-/;

export class ViewModel {
  
  private binders: {};
  private contexts: {}[];
  
  constructor(el: Element, context: {})
  {
    this.binders = {
      bind: TwoWayBinder,
      each: EachBinder,
      show: ShowBinder,
      class: ClassBinder
    }
    
    this.pushContext(context);
  }

  resolveContext(keyPath: string[]): Base
  {
    var obj = keyPath[0];
    for(var i=this.contexts.length-1; i >= 0; i--){
      if(this.contexts[obj]){
        return this.resolveKeypath(this.contexts[obj], _.rest(keyPath));
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
  
  private resolveKeypath(obj, keyPath): Base
  {
    for(var i=0; i<keyPath.length; i++){
      obj = obj[keyPath[i]];
      if(!obj) return null;      
    }
    return obj;
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
            this.binders[type](node, type, this);
          }
        }
      }
    }
    
    if(node.hasChildNodes()){
      var children = node.childNodes;
 
      for (var i=0; i<children.length; i++){
        this.bindNode(<Element> children[i]);
      }
    }
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
    var attributes = value.trim().split(';');
    var attrBindings = {};
    for(var i=0; i<attributes.length; i++){
      var attrKeyPath = attributes[i].trim().split(':');
      if(attrKeyPath.length===2){
        attrBindings[attrKeyPath[0].trim()] = makeKeypathArray(attrKeyPath[1]);
      }else{
        console.log("Warning: syntax error in data-bind:"+value);
      }
    }
    
    var $node = $(el);
    for(var attr in attrBindings){
      var model = viewModel.resolveContext(attrBindings[attr]);
      if(model){
        var keypath = _.rest(attrBindings[attr]).join('.');
        if(attr === 'text'){
          //setValue($node, model.format(keypath));
          setValue($node, model.get(keypath));
          model.on(keypath, function(){
//            setValue($node, model.format(keypath));
            setValue($node, model.get(keypath));
          });
    
          $node.change(function(){
            model.set(keypath, $node.val());
          });
          /*
          $node.keypress(function(e){
            // if(e.keyCode == 13){
              $node.blur();
            // }
          });
          */
        }else{
          //$node.attr(attr, model.format(keypath));
          $node.attr(attr, model.get(keypath));
          model.on(keypath, function(){
            //$node.attr(attr, model.format(keypath));
            $node.attr(attr, model.get(keypath));
          });
        }
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
    var arr = value.trim().split(':'), collection;
    if(arr.length !== 2){
      console.log("Warning: syntax error in data-each:"+value);
      return;
    }
    
    var 
      collection = viewModel.resolveContext(makeKeypathArray(arr[0])),
      itemContextName = arr[1],
      mappings = this.mappings,
      parent = el.parentNode,
      nextSibling = el.nextSibling;
    
    parent.removeChild(el);
    
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
      _.each(collection.filtered(), function(item){
        addNode(item, nextSibling);
      });
    }
    
    addNodes();
    
    collection.on('added:', function(item){
      addNode(item, nextSibling);
      // if(this.filtered(item)){}
    })
    .on('removed:', function(id){
      if(mappings[id]){
        removeNode(id);
      }
      // TODO: Unbind nodes recursively to avoid event and memory leaks.
    })
    .on('filterData', function(){
      for(var id in mappings){
        removeNode(id);
      }
      addNodes();
    });
  }
  
  unbind(){
    // TODO: Implement
  }
}

class ShowBinder implements Binder 
{
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    
  }
  
  unbind(){};
}

class ClassBinder implements Binder
{
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    
  }
  
  unbind(){};
}

// --- Helpers

if(!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g,'');
  };
}

function setValue($node, value){
  if (value && value.hasOwnProperty && value instanceof $){
    $node.replaceWith(value);
  }else{
    if($node.is(':input')){
      $node.val(value);
    }else{
      $node.text(value);
    }
  }
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

