/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  ViewModel class
  
  This class provides declarative bindings for binding views to
  models.
*/

/// <reference path="base.ts" />
/// <reference path="model.ts" />
/// <reference path="dom.ts" />

/// <reference path="binders/twoway.ts" />
/// <reference path="binders/each.ts" />
/// <reference path="binders/show.ts" />
/// <reference path="binders/class.ts" />
/// <reference path="binders/event.ts" />

module Gnd {

var dataBindingReqExp = /^data-/;

export interface Binder
{
  bind(el: Element, value: string, viewModel: ViewModel);
  unbind();
}

export interface IBinder {
  new (): Binder;
}

/**
  This class represents the Model of the View. 
  
  It is used to cleanly separate the view from the model by defining bindings
  using special attributes in the views HTML code.
  
  Most methods in this function are just utility methods used by the binders
  and never used directly.

  @class ViewModel
  @constructor
  @param el {HTMLElement} The root element where the view is rendered.
  @param context {Object} object containing mappings of properties to values
  that are passed to the ViewModel.
  @param [formatters] {Object} object containing properties and formatter functions 
  as values. A formatter function takes a value as only argument and returns the
  re-formatted value.
  @param [binders] {IBinder} optional extra binders.
  
  @example
  
*/
export class ViewModel extends Base 
{  
  private binders: {[index: string]: IBinder;};
  private boundBinders: Binder[] = [];
  public  contexts: {get?;}[] = [];
  
  public formatters: {[index: string]: (input: string)=>string;} = {};
  
  constructor(el: Element, 
              context: {}, 
              formatters?: {[index: string]: (input: string)=>string;},
              binders?: IBinder[])
  {
    super();
    
    this.formatters =  formatters || this.formatters;
    
    this.binders = {
      bind: Binders.TwoWayBinder,
      each: Binders.EachBinder,
      show: Binders.ShowBinder,
      'class': Binders.ClassBinder,
      event: Binders.EventBinder
    }
    
    _.extend(this.binders, binders);
    
    this.pushContext(context);
    this.boundBinders = this.bindNode(_.isString(el) ? $(el)[0] : el);
  }

  destroy()
  {
    this.cleanup();
    super.destroy();
  }
  
  /**
    Cleans all the bindings.
  
    @method cleanup
    @param [bindings] {Binder[]} optional array of binders, if none given
    it will clean the bound binders available in the view model.
  */
  cleanup(bindings?: Binder[])
  {
    _.each(bindings || this.boundBinders, (binder) => {
      binder.unbind();
    });
    !bindings && (this.boundBinders = []);
  }

  /**
    Resolves a keypath by traversing all available contexts.
    
    @method resolveContext
    @param keyPath {String[]} An array with properties defining a keyPath.
    @return {Base} A base object or undefined if none found.
  */
  resolveContext(keyPath: string[]): Base
  { 
    var 
      root = keyPath[0],
      context = this.findContext(root);
      
    if(context){
      return this.resolveKeypath(getValue(context, root), _.rest(keyPath))
    }
  }
  
  /**
    Finds a context with the given property. Contexts are always examined from
    top to bottom, meaning that last pushed contexts takes precedence on context
    at the bottom of the stack.
    
    @method findContext
    @param prop {String}
    @return {Any} context containing the requested property.
  */
  findContext(prop: string): any
  {
    for(var i=this.contexts.length-1; i >= 0; i--){
      if(getValue(this.contexts[i], prop)){
        return this.contexts[i];
      }
      /*
      var context = this.contexts[i];
      if (context[prop] || (context.get && context.get(prop))){
        return context;
      }*/
    }
  }
  
  /**
    push a context in the context stack.
    
    @method pushContext
    @param context {Object}
  */
  pushContext(context: {})
  {
    this.contexts.push(context);
  }

  /**
    pop a context from the context stack.
    
    @method popContext
  */
  popContext()
  {
    this.contexts.pop();
  }
    
  /**
    Binds a node and all of its children recursively.

    @method bindNode
    @param node {Element}
    @return {Binder[]} An array with all the created bindings
  */
  bindNode(node: Element): Binder[]
  {
    var binders = [];
    
    if(node.attributes){
      var attributes = node.attributes;
      for(var j=0;j<attributes.length;j++){
        if(dataBindingReqExp.test(attributes[j].name)){
          var type = attributes[j].name.replace(dataBindingReqExp, '');
          var value = attributes[j].value;
          if(this.binders[type]){
            var binder: Binder = new this.binders[type]();
            binder.bind(node, value, this);
            binders.push(binder);
          }
        }
      }
    }
    
    if(node.hasChildNodes()){
      // clone children array to avoid side-effects.
      var children = _.toArray(node.childNodes);
 
      for (var i=0; i<children.length; i++){
        if(isElement(children[i])){
          binders.push.apply(binders, this.bindNode(<Element> children[i]));
        }
      }
    }
    
    return binders;
  }
  
  private resolveKeypath(obj, keyPath): Base
  {
    for(var i=0; i<keyPath.length; i++){
      //obj = obj[keyPath[i]];
      obj = getValue(obj, keyPath[i]);
      if(!obj) return null;      
    }
    return obj;
  }
}

// --- Helpers

function getValue(obj, prop)
{
  return obj.get ? obj.get(prop) : obj[prop];
}

export function makeKeypathArray(keypath: string): string[]
{
  var arr = Util.trim(keypath).split('.');
  for(var i=0; i<arr.length; i++){
    arr[i] = Util.trim(arr[i]);
  }
  return arr;
}

} // module Gnd

