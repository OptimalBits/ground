/**
  Ground Web Framework (c) 2011-2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  View Class
  
  This class represents a View in a MVC architecture.
  
  Events:
    
*/

/// <reference path="base.ts" />
/// <reference path="../third/jquery.d.ts" />

module Gnd {
export class View extends Base
{
  public tag: string;
  public classNames: string[];
  public $el: JQuery;
  public $parent: JQuery;
  public css: {};
  
  constructor(classNames: string[], css?: {} = {}, tag?: string = 'div')
  {
    super();
    this.classNames = classNames;
    this.css = css;
    this.tag = tag;
    
    this.$el = $(this.tag);
    this.$el.css(this.css);
  }

  render($parent)
  {
    this.$parent = $parent || this.$parent;
    this.$parent && this.$el && this.$el.detach().appendTo(this.$parent);
    return this.$el;
  }
  
  refresh()
  {
    this.$parent && this.render(this.$parent);
  }
  
  clean()
  {
    this.$el.detach();
  }
  
  remove()
  {
    this.$el.remove()
    this.$el = null;
  }
  
  disable(disable)
  {
    console.log(this+" does not implement disable")
  }
  
  hide(duration, easing, callback)
  {
    this.$el.hide(arguments)
  }
  
  show(duration, easing, callback) 
  {
    this.$el.show(arguments)
  }
  
  destroy()
  {
    this.remove();
    super.destroy();
  }
}

}
