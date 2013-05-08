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
/// <reference path="using.ts" />


module Gnd {

export interface ViewArgs
{
  html?: string;
  style?: string;
  templateEngine?: (str: string) => (args: any) => string;
  templateStr?: string;
  templateUrl?: string;
  cssUrl?: string;
}

/**
 *
 *  View Class
 *
 *  This class encapsulate a view based on HTML and CSS. Views are part of
 *  a hierarchy. Every view can be attached to a parent view, spawning a 
 *  tree structure that maps the DOM.
 *
 *  The mechanics works by giving a selector and a parent (both optional).
 *  The selector will be used to find the root node for the given view within
 *  the parent. Typically the selector is just an id of some div element that 
 *  is defined on the parent view.
 *
 */
export class View extends Base
{
  private template: (args: any) => string;
  private selector: string;
  private html: string;
  private styles: {[index: string]: string;};
  private templateStr: string;
  private templateUrl: string;
  private templateEngine: (str: string) => (args: any) => string;
  private cssUrl: string;
  
  private isInitialized: bool;

  public root: HTMLElement; 
  public fragment: DocumentFragment;
  public parent: View;
  public children: View[] = [];
  
  public onHidding: (el: Element, args: any, done: ()=>void) => void;
  public onShowing: (el: Element, args: any, done: ()=>void) => void;

  constructor(selector: string, parent?: View, args?: ViewArgs)
  {
    super();

    if((args.templateUrl || args.templateStr) && !args.templateEngine){
      throw new Error('Template engine required');
    }

    this.selector = selector;
    
    if(parent){
      if(parent instanceof View){
        this.parent = parent;
        parent.children.push(this);
      }else{
        args = args || parent;
      }
    }   
    
    _.extend(this, args);
    
    this.onShowing = this.onHidding = 
      (el: Element, args: any, done: ()=>void) => {
        done();
    }
  }
  
  /**
   *
   * Renders this view and all its subviews (if any)
   *
   * Note: This method can only be called after being initialized.
   *
   *
   * @param {Object} context object with arguments needed for the templates or
   * the view models.
   *
   */
  render(context?: {}, cb?: ()=>{})
  {
    this.init((err?)=>{
      var html;

      if(this.template){
        html = this.template(context);
      }else{
        html = this.html || '<div>';
      }

      this.fragment = $(html)[0];

      if(!this.fragment) throw(new Error('Invalid html:\n'+html));

      //
      // TODO: We do not use this for now...
      // waitForImages(el, done);
      //
      var parentRoot = this.parent ? this.parent.root : null;

      var target = this.root = (this.selector && $(this.selector, parentRoot)[0]) || 
      document.body;

      if(this.styles){
        $(target).css(this.styles);
      }

      //
      // we can use cloneNode here on the fragment if we want to keep a copy.
      //
      target.appendChild(this.fragment);
      _.each(this.children, (subview) => {
        subview.render(context);
      });
      cb && cb();
    });
  }
  
  clean()
  {
    if(this.root){
      $(this.root).html('');
    }
  }
  
  disable(disable)
  {
    console.log(this+" does not implement disable")
  }
  
  hide(args, done)
  {
    this.root && this.onHidding(this.root, args, ()=>{
      $(this.root).hide();
      done();
    });
  }
  
  show(args, done) 
  {
    this.root && this.onShowing(this.root, args, ()=>{
      $(this.root).show();
      done();
    }); 
  }
  
  destroy()
  {
    this.clean();
    super.destroy();
  }
  
  /**
   * 
   * Initializes the view.
   *
   * This method must be called at least once before the view can be rendered.
   * Tipically this method will fetch templates and css files from the server
   * asynchronously.
   * 
   * @param {Function} done Callback called after initialization has been 
   * completed.
   */
  private init(done: (err?: Error)=>void)
  {
    if(!this.isInitialized){
      this.isInitialized = true;
      
      Util.fetchTemplate(this.templateUrl, this.cssUrl, (err?, templ?) => {
        if(templ){
          this.template = this.templateEngine(this.templateStr || templ);
      
          Util.asyncForEach(this.children, (subview, cb) => {
            subview.init(cb);
          }, done);
        }else{
          done(err);
        }
      });
    }else{
      done();
    }
  }
  
}

}

