/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/
/**
  View Class
  
  This class represents a View in the MVC architecture.  
*/

/// <reference path="base.ts" />
/// <reference path="dom.ts" />
/// <reference path="using.ts" />


module Gnd {

export interface ViewArgs
{
  html?: string;
  styles?: {[index: string]: string;};
  attr?: {[index: string]: string;};
  templateEngine?: (str: string) => (args: any) => string;
  templateStr?: string;
  templateUrl?: string;
  cssUrl?: string;
}

/**
   View Class
 
   This class encapsulate a view based on HTML and CSS. Views are part of
   a hierarchy. Every view can be attached to a parent view, spawning a 
   tree structure that maps to the DOM.
 
   The view hierarchy works by associating a selector and a parent (both optional)
   to the view.
   
   The selector will be used to find the root node for the given view within
   the parent. Typically the selector is just an id of some div element that 
   is defined on the parent view.
   
   @class View
   @extends Base
   @constructor
   @param [args] {ViewArgs}
 **/
export class View extends Base
{
  private template: (args: any) => string;
  private selector: string;
  private html: string;
  private styles: {[index: string]: string;};
  private attr: {[index: string]: string;};
  private templateStr: string;
  private templateUrl: string;
  private templateEngine: (str: string) => (args: any) => string;
  private cssUrl: string;
  
  private _parent: View;
  
  private isInitialized: bool;
  
  private refreshMutex = Mutex();

  private fragment: DocumentFragment;
  public root: HTMLElement; 
  
  public nodes: HTMLElement[];
  public children: View[] = [];
  
  /**
   Define this property to perform animations or effects when hidding the view.
    
    
    @property onHidding
    @type {Function} (el: Element, args: any, done: () => void) => void
  
  */
  public onHidding: (el: Element, args: any, done: ()=>void) => void;
  
  /**
   Define this property to perform animations or effects when showing the view.
    
    @property onShowing
    @type {Function} (el: Element, args: any, done: () => void) => void
  */
  public onShowing: (el: Element, args: any, done: ()=>void) => void;

  constructor(args?: ViewArgs)
  {
    super();
    
    args = args || {};

    if((args.templateUrl || args.templateStr) && !args.templateEngine){
      throw Error('Template engine required');
    }
    
    args.templateEngine = args.templateEngine || Util.noop;
    
    _.extend(this, args);
    
    this.onShowing = this.onHidding = 
      (el: Element, args: any, done: ()=>void) => done();
  }
  
  destroy()
  {
    this.clean();
    super.destroy();
  }
  
  /**
    Sets the parent for this view. This function creates a father-child 
    relationship between two views, where a DOM element is associated to the
    parent so that this view knows where it should render itself.
  
    @method parent
    @param selector {Element | String}
    @param [parent] {View}
  */
  parent(selector: Element): View;
  parent(selector: string): View;
  parent(selector: any, parent?: View): View
  {
    this.selector = selector;
    
    if(parent){
      var oldParent = this._parent;
      oldParent && oldParent.removeChild(this);
      this._parent = parent;
      parent.children.push(this);
    }
    return this;
  }
  
  /**
    Removes a Child view from this view.
  
    @method removeChild
    @param child {View} child view to be removed from this view.
  **/
  removeChild(child: View): void
  {
    this.children = _.without(this.children, child);
  }
  
  /**
   *
   * Renders this view and all its subviews (if any)
   *
   * @method render
   * @param {Object} context object with arguments needed for the templates or
   * the view models.
   * @returns {Promise}
   */
  render(context?: {}): Promise<HTMLElement>
  {
    context = context || {};
    
    return this.init().then<HTMLElement>(()=>{
      var html;

      if(this.template){
        html = this.template(context);
      }else{
        html = this.html || '<div>';
      }

      this.fragment = $(html)[0];

      if(!this.fragment) throw(Error('Invalid html:\n'+html));

      //
      // TODO: We do not use this for now...
      // waitForImages(el, done);
      //
      var parent = this._parent;
      var parentRoot = parent ? parent.root : null;

      var target = this.root = 
        (this.selector && $(this.selector, parentRoot)[0]) || document.body;

      //
      // we can use cloneNode here on the fragment if we want to keep a copy.
      //
      this.nodes = _.toArray(this.fragment.childNodes);
      
      var styles = _.extend({visibility: 'hidden'}, this.styles);
      this.applyStyles(styles);
      
      if(this.attr){
        _.each(this.nodes, 
          (node) => _.each(this.attr, 
            (value, attr?) => $(node).attr(attr, value)));
      }
      
      
      target.appendChild(this.fragment);
      
      return Promise.map(this.children, (child) => child.render(context))
        .then(() => this.applyStyles({visibility: ''}))
        .then(() => this.nodes[0]);
    });
  }
  
  private applyStyles(styles){
    _.each(this.nodes, (node) => $(node).css(styles));
  }
  
  /**
   Cleans this view removing it from the DOM.
  
   @method clean
  */
  clean()
  {
    if(this.root){
      var nodes = this.nodes;
      for (var i=0, len=nodes.length; i<len; i++){
        try{
          this.root.removeChild(nodes[i]);
        }catch(err){
          // ignore error since it is an unexisting node.
        }
      }
    }
  }
  
  /**
    Refresh the view and subhierarchy, i.e., clean it and re-render again.
    
    @method refresh
    @returns {Promise}
  */
  refresh(): Promise
  {
    return this.refreshMutex(()=>{
      this.clean();
      return this.render();
    });
  }
  
  disable(disable)
  {
    console.log(this+" does not implement disable")
  }
  
  /**
    Hides this view.
    
    @method hide
    @param args {Any} args to be passed to the onHidding callback.
    @param done {Function} called after finalizing hidding the view.
  */
  hide(args, done)
  {
    this.root && this.onHidding(this.root, args, ()=>{
      $(this.root).hide();
      done();
    });
  }
  
  /**
    Shows this view.
    
    @method show
    @param args {Any} args to be passed to the onHidding callback.
    @param done {Function} called after finalizing showing the view.
  */
  show(args, done) 
  {
    this.root && this.onShowing(this.root, args, ()=>{
      $(this.root).show();
      done();
    }); 
  }
    
   /**
    
    Initializes the view.
   
    This method must be called at least once before the view can be rendered.
    Tipically this method will fetch templates and css files from the server
    asynchronously.
   
    @method init
    @return {Promise} resolved after initialization has been completed.
   */
   private init(): Promise<void>
   {
     if(!this.isInitialized){
       this.isInitialized = true;
       
       return Util.fetchTemplate(this.templateUrl, this.cssUrl).then<void>((templ) =>{
         this.template = this.templateEngine(this.templateStr || templ);
    
         return Promise.map(this.children, (subview) => subview.init());
       });
     }else{
       return Promise.resolved();
     }
   }
}

}

