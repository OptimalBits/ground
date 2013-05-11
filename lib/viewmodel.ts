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

export class ViewModel extends Base 
{  
  private binders: {[index: string]: IBinder;};
  private contexts: {}[] = [];
  private boundBinders: Binder[] = [];
  
  public formatters: {[index: string]: (input: string)=>string;} = {};
  
  constructor(el: Element, 
              context: {}, 
              formatters?: {[index: string]: (input: string)=>string;},
              binders?: IBinder[])
  {
    super();
    
    this.formatters =  formatters || this.formatters;
    
    this.binders = {
      bind: TwoWayBinder,
      each: EachBinder,
      show: ShowBinder,
      'class': ClassBinder,
      event: EventBinder
    }
    
    _.extend(this.binders, binders);
    
    this.pushContext(context);
    this.boundBinders = this.bindNode(_.isString(el) ? $(el)[0] : el);
  }

  destroy()
  {
    this.unbind();
    super.destroy();
  }
  
  unbind(bindings?: Binder[])
  {
    _.each(bindings || this.boundBinders, (binder) => {
      binder.unbind();
    });
    !bindings && (this.boundBinders = []);
  }

  resolveContext(keyPath: string[]): Base
  { 
    var 
      root = keyPath[0],
      context = this.findContext(root);
      
    if(context){
      return this.resolveKeypath(context[root], _.rest(keyPath))
    }
  }
  
  findContext(prop: string): any
  {
    for(var i=this.contexts.length-1; i >= 0; i--){
      if (this.contexts[i][prop]){
        return this.contexts[i];
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
      obj = obj[keyPath[i]];
      if(!obj) return null;      
    }
    return obj;
  }
}

// --- Helpers

export function makeKeypathArray(keypath: string): string[]
{
  var arr = Util.trim(keypath).split('.');
  for(var i=0; i<arr.length; i++){
    arr[i] = Util.trim(arr[i]);
  }
  return arr;
}

} // module Gnd

