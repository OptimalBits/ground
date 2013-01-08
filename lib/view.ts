/**
  Ground Web Framework (c) 2011-2012 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  View Class
  
  This class represents a View in the MVC architecture.  
*/

/// <reference path="base.ts" />
/// <reference path="dom.ts" />

module Gnd {
  
export class View extends Base
{
  public el: DocumentFragment;
  public parent: View;
  public children: View[] = [];
  public root: Element;
  
  constructor(parent?: View)
  {
    super();
    this.el = makeElement('<div>');
    this.parent = parent;
    parent && parent.children.push(this);
  }
  
  render()
  {
    var target = this.parent || this.root || document.body;
    target.appendChild(this.el);
    for(var i=0; i<this.children.length; i++){
      this.children[i].render();
    }
  }
  
  clean()
  {
    var parent = this.el.parentNode;
    parent && parent.removeChild(this.el);
  }
  
  disable(disable)
  {
    console.log(this+" does not implement disable")
  }
  
  hide(duration, easing, callback)
  {
    // TODO: Implement
  }
  
  show(duration, easing, callback) 
  {
    // TODO: Implement
  }
  
  destroy()
  {
    this.clean();
    super.destroy();
  }
}

}
