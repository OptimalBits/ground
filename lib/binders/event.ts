/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/

/// <reference path="../viewmodel.ts" />

/**
@module Gnd
@submodule Binders

*/
module Gnd.Binders {

  /**
    The Event binder is used to bind events to HTML elements.
    
        Syntax: data-event="eventName1: keypath1; eventName2: keypath2; eventName3: keypath3"
    
        Examples: 
          data-bind = "click: todo.createTodo"
  
    @class EventBinder
    @implements Binder
    @namespace Binders
  */
export class EventBinder implements Binder
{
  private bindings: any[][] = [];
  private el: Element;
  
  private static re = /((\s*(\w+)\s*\:\s*((\w+\.*)+)\s*);?)/gi;
  
  private parse(value: string): {[index: string]: string[];}
  {
    var eventBindings = {}, match;
    while(match = EventBinder.re.exec(value)){
      eventBindings[match[3]] = makeKeypathArray(match[4]);
    }
    return eventBindings;
  }
  
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    var eventBindings = this.parse(value);
    
    this.el = el;  
    
    var addEvent = (eventName: string) => {
      var 
        keypath = eventBindings[eventName],
        obj = viewModel.resolveContext(_.initial(keypath));
      
      if(obj instanceof Base){
        var 
          key = _.last(keypath),
          handler = obj[key];
        
        obj.retain();

        if(_.isFunction(handler)){
          var elementListener = (evt) => handler.call(obj, el, evt);
          
          $(el).on(eventName, elementListener);
          
          this.bindings.push([obj, eventName, elementListener]);
        }else{
          console.log("Warning: the given handler is not a function: "+keypath);
        }
        return;
      }else{
        var handler = viewModel.resolveContext(keypath);
        if (_.isFunction(handler)){
          var ctx = 
            obj || 
            _.reduce(viewModel.contexts, (memo, ctx) => _.extend(memo, ctx), {});

          var fn = _.bind(handler, ctx);
          
          var elementListener = (evt) => fn(el, evt);
          $(el).on(eventName, elementListener);
          this.bindings.push([obj, eventName, elementListener]);
          return;
        }
      }
      
      console.log("Warning: not found an object instance of Gnd.Base: "+keypath[0]);
    }
    
    for(var eventName in eventBindings){
      addEvent(eventName);
    }
  }
 
  unbind(){
    _.each(this.bindings, (item) => {
      item[0].release();
      $(this.el).off(item[1], item[2]);
    });
  }
}

}
