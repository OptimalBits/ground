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

  /**
    ViewArgs interface.
    
    This interface is used to describe the valid arguments when instantiating
    the View base class.
    
    Note that html, templateString and templateUrl are mutually exclusive
    and can not be used at the same time.
    
    @class ViewArgs
  */
export interface ViewArgs
{
  /**
    HTML string to be used when rendering this view.
    
    @property html
    @type String
  */
  html?: string;
  
  /**
    CSS Styles.
    
    Object pairing style properties and their values as strings.
    
    @property styles
    @type {[index: string]: string;}
  */
  styles?: {[index: string]: string;};
  
  /**
    HTMLElements Attributes.
    
    Attributes to be used on all the elements inside the view.
    
    @property attr
    @type {[index: string]: string}
  */
  attr?: {[index: string]: string;};
  
  /**
    Template engine to be used when renderint the view template (if any).
    Defaults to jquery/underscore/lodash microtemplate.
    
    @property templateEngine
    @type {(str: string) => (args: any) => string}
  */
  templateEngine?: (str: string) => (args: any) => string;
  
  /**
    Template string. This template will be rendered with the template engine
    when rendering the view. The scope/context used for rendering the template
    is given in the view's render method as a parameter
    
    @property templateStr
    @type {String}
  */
  templateStr?: string;
  
  /**
    Template url. Url pointing to a template. Works identically to
    templateString with the difference that the template is fetched dynamically
    from a remote server.
    
    If this property is a DOM id selector, then it will get the template
    accessing its content.
    
    @property templateUrl
    @type {String}
  */
  templateUrl?: string;
  
  /**
    CSS url. Url (or array of urls) pointing to a CSS file. Works similar to the styles property,
    with the main difference that the styles are fetched dynamically from
    a remote server.
  
    @property cssUrl
    @type {String|Array}
  */
  cssUrl?: any;
}

declare var curl;

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
  private cssUrl: any;
  
  private parentView: View;
  
  private isInitialized: Promise<any>;
  private isRendered: Promise<HTMLElement>;
  
  private refreshMutex = Mutex();

  private fragment: DocumentFragment;
  public root: HTMLElement; 
  
  public nodes: HTMLElement[];
  public children: View[] = [];
  
  /**
    @example
  
        fetchTemplate(templateUrl?: string, cssUrl?: string): Promise<string>
          
    @method fetchTemplate
    @static
  */
  static fetchTemplate(templateUrl?: string, cssUrl?: string[]): Promise<string>
  static fetchTemplate(templateUrl?: string, cssUrl?: string): Promise<string>
  static fetchTemplate(templateUrl?: string, cssUrl?: any): Promise<string>
  {
    var items = [];
    
    return new Promise((resolve, reject) => {
      templateUrl && items.push('text!'+templateUrl);
      if(cssUrl){
        cssUrl = _.map(!_.isArray(cssUrl) ? [cssUrl] : cssUrl, function(url){
          //return 'css!'+url;
          return 'style!'+url;
        });
        items = items.concat(cssUrl);
      }
  
      try{
        curl(items, function(templ){
          resolve(templ);
        });
      } catch(err){
        reject(err);
      }  
    });
  }
  
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

  /*
  function waitForImages(el, cb) {
    var
      $images = $('img', el),
      counter = $images.length;
    
    cb = _.once(cb);
    var deferTimeout = _.debounce(cb, 1000);

    if(counter>0){
      deferTimeout(); // start timer
      var loadEvent = function(evt){
        deferTimeout();
        $images.off('load', loadEvent);
        counter--;
        if(counter === 0){
          cb();
        }
      }
      $images.on('load', loadEvent);
    }else{
      cb();
    }
  }
  */

  constructor(args?: ViewArgs)
  {
    super();
    
    args = args || {};
    args.templateEngine = args.templateEngine || using.template || Util.noop;

    if((args.templateUrl || args.templateStr) && !args.templateEngine){
      throw Error('Template engine required');
    }
    
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
      this.parentView && this.parentView.removeChild(this);
      this.parentView = parent;
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
    
    return this.isRendered = this.init().then<HTMLElement>(()=>{
      var html, root;

      if(this.template){
        html = Util.trim(this.template(context)) || '<div>';
      }else{
        html = this.html || '<div>';
      }

      this.fragment = $(html)[0];

      if(!this.fragment) throw(Error('Invalid html:\n'+html));
      
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
      
      root = this.nodes[0];

      //
      // TODO: We do not use this for now...
      // waitForImages(this.fragment, done);
      //
      
      var parent = this.parentView;
      var parentRoot = parent ? parent.root : null;

      var target = this.root = 
        (this.selector && $(this.selector, parentRoot)[0]) || document.body;
        
      target.appendChild(this.fragment);
      
      return Promise.map(this.children, (child) => child.render(context))
        .then(() => {
          this.applyStyles({visibility: ''});
          return root;
        });
    });
  }
  
  private applyStyles(styles){
    _.each(this.nodes, (node) => _.isElement(node) && $(node).css(styles));
  }
  
  /**
   Cleans this view removing it from the DOM.
  
   @method clean
  */
  clean(): void
  {
    if(this.isRendered){
      this.isRendered.cancel();
      
      if(this.root){
        _.each(this.nodes, node => {
          try{
            this.root.removeChild(node);
          }catch(err){
            // ignore error since it is an unexisting node.
          }
        })
      }
    }
  }

  /**
    Refresh the view and subhierarchy, i.e., clean it and re-render again.
    
    @method refresh
    @returns {Promise}
  */
  refresh(context): Promise<any>
  {
    return this.refreshMutex(()=>{
      this.clean();
      return this.render(context);
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
   private init(): Promise<any>
   {
     if(!this.isInitialized || this.isInitialized.isRejected){
       if(_.isUndefined(this.html)){
         this.isInitialized = View.fetchTemplate(this.templateUrl, this.cssUrl).then((templ)=>{
           templ = this.templateStr || templ;
           if(templ) this.template = this.templateEngine(Util.trim(templ));
         }).then(() => this.initChildren());
       }else{
         this.isInitialized = Promise.resolved();
       }
     } else {
       this.isInitialized = this.initChildren();
     }
     return this.isInitialized;
   }
   
   private initChildren(): Promise<any[]>
   {
     return Promise.map(this.children, (subview) => subview.init());
   }
}

}

