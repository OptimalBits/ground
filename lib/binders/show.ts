/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/

/// <reference path="../viewmodel.ts" />

/**
  @module Binders
*/
module Gnd.Binders {

  /**
    The show binder is used to show or hide some HTML Element based on the
    value of the bound property. A trueish value will show the element while a
    falsy value will hide it. 
    
    An optional *bang* operator can be used to reverse the logic, making the binder
    a *hide* binder instead of *show*.
    
        Syntax: data-show="[!]keypath"

        Example: 
          data-show="todo.isCompleted"
          data-show="!todo.notActive"
    
    @class ShowBinder
    @implements Binder
  */
export class ShowBinder implements Binder 
{
  private bindings: any[][] = [];
  
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    var
      _value = value.replace('!', ''),
      negate = _value === value ? false : true,
      keypath = makeKeypathArray(_value),
      model = viewModel.resolveContext(_.initial(keypath));
      
    if(model instanceof Base){
      model.retain();
      
      function setVisibility(visible: bool){
        if(negate ? !visible : visible){
          show(el);
        }else{
          hide(el);
        }
      }
      
      var 
        key = _.last(keypath),
        modelListener = (visible) => setVisibility(visible);
      
      setVisibility(model.get(key));
      
      model.on(key, modelListener);
      this.bindings.push([model, key, modelListener]);
    }else{
      console.log("Warning: not found a valid model: "+value);
    }
  }
  
  unbind(){
    _.each(this.bindings, (item) => {
      item[0].off(item[1], item[2]);
      item[0].release();
    });
  }
}

}
