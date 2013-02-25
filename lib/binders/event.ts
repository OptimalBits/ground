/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/

/// <reference path="../viewmodel.ts" />

module Gnd {

export class EventBinder implements Binder
{
  private bindings: any[][] = [];
  private el: Element;
  
  static private re = /((\s*(\w+)\s*\:\s*((\w+\.*)+)\s*);?)/gi;
  
  private parse(value: string): {[index: string]: string[];}
  {
    var eventBindings = {}, match;
    while(match = TwoWayBinder.re.exec(value)){
      eventBindings[match[3]] = makeKeypathArray(match[4]);
    }
    return eventBindings;
  }
  
  //
  // Syntax: data-event="eventName1: keypath1; eventName2: keypath2; eventName3: keypath3"
  //
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
          eventKeypath = _.rest(keypath).join('.'),
          handler = obj.get(eventKeypath);
        
        obj.retain();

        if(_.isFunction(handler)){
          var elementListener = (evt) => {
            handler.call(obj, el, evt);
          }
          
          $(el).on(eventName, elementListener);
          
          this.bindings.push([obj, eventName, elementListener]);
        }else{
          console.log("Warning: the given handler is not a function: "+keypath);
        }
      }else{
        console.log("Warning: not found an object instance of Gnd.Base: "+keypath[0]);
      }
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
