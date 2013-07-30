/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/

/// <reference path="../log.ts" />
/// <reference path="../viewmodel.ts" />

// TODO: Allow pipelining formatters.

/**
  @module Binders
*/
module Gnd.Binders {

/**
  Two way binder is used to bind a model property and some attribute on a given
  HTML element.
  Most HTML elements can only bind one way, i.e. change its content based on
  the binding propery, while some others such as *input* elements where the value
  attribute can work in both directions.

  In one data-bind attribute is possible to bind several attributes to 
  different key paths. It is also possible to apply formatters before the
  final attribute is assigned.
  
      Syntax: data-bind = "attr0: keyPath [| formatter0][; attr1: keyPath [| formatter1]...]"

      Examples: 
        data-bind = "text: todo.description"
        data-bind = "alt: todo.shortDesc; href: todo.imgUrl"1
        data-bind = "text: todo.meta.date | dateFormatter"
  
  @class TwoWayBinder
  @implements Binder
*/
export class TwoWayBinder implements Binder
{
  // [ [model, onKeypathFn, eventListener], [...], ...] 
  private bindings: any[][] = [];
  private el: Element;
  private attrBindings: {[index: string]: string[];} = {};
  private attrFormatters: {[index: string]: (input: string)=>string;} = {};
    
  private static re = /((\s*(\w+)\s*\:\s*((\w+\.*)+)\s*(\|\s*(\w+)\s*)?);?)/gi;
  
  private parse(value: string, 
                formatters: {[index: string]: (input: string)=>string;})
  {
    var match, formatter;
    while(match = TwoWayBinder.re.exec(value)){
      var attr = match[3];
      this.attrBindings[attr] = makeKeypathArray(match[4]);
      formatter = formatters[match[7]];
      if(formatter){
        this.attrFormatters[attr] = formatter;
      }
    }
  }
  
  private createBinding(attr: string, el: Element, viewModel: ViewModel)
  {
    var 
      attrBinding = this.attrBindings[attr],
      attrFormatter = this.attrFormatters[attr],
      obj = viewModel.resolveContext(([attrBinding[0]]));
    
    if(obj instanceof Base){
       var 
        keypath = _.rest(attrBinding).join('.'),
        modelListener,
        elemListener = null;
        
      var format = () =>
        attrFormatter ? 
          attrFormatter.call(obj, obj.get(keypath)) : obj.get(keypath);
        
      if(attr === 'text'){
        setText(el, format());
        modelListener = () => setText(el, format());
      }else{
        setAttr(el, attr, format());
        modelListener = () => setAttr(el, attr, format());
        elemListener = (value) => obj.set(keypath, getAttr(el, attr));
      }
      obj.retain();
      obj.on(keypath, modelListener);
      $(el).on('change', elemListener);
        
      this.bindings.push([obj, keypath, modelListener, elemListener]);
    }else{
      log("Warning: not found a valid model: ", attrBinding[0]);
    }
  }
  
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    this.parse(value, viewModel.formatters);
        
    this.el = el;
    
    for(var attr in this.attrBindings){
      this.createBinding(attr, el, viewModel);
    }
  }

  unbind(){
    _.each(this.bindings, (item) => {
      item[0].off(item[1], item[2]);
      item[0].release();
      item[3] && $(this.el).off('change', item[3]);
    });
  }
}

function setText(el: Element, value){
  if(isElement(value)){
    el.parentNode.replaceChild(value, el);
  }else{
    $(el).html(value);
  }
}

}