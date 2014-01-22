/**
  Ground Web Framework (c) 2011-2013 Optimal Bits Sweden AB
  MIT Licensed.
*/

/// <reference path="../log.ts" />
/// <reference path="../viewmodel.ts" />
/// <reference path="twoway.ts" />

/**
@module Gnd
@submodule Binders
*/
module Gnd.Binders {

  // TODO: Add a "done" callback to support asynchronous operations on
  // the callbacks.
interface Callbacks
{
  added?: (node: Node, item: Model) => void;
  removed?: (node: Node) => void;
}

/**
  The Each binder is used to bind collections to HTML Elements. Using this
  binder it is possible to define a dynamic list of elements that are bound
  to their Collection or Sequence counterparts.

  It is possible to define *added* and *removed* event callbacks to perform
  operations such as animations when an item is added or removed to the DOM.

  The binder works by defining a item alias for a collection or sequence,
  after that the alias can be used to bind properties with the *TwoWayBinder*

  Syntax: data-each="collection: itemContextName [| added:callback0] [| removed: callback1]"

  callback signature: 
    added(el: HTMLElement, item: Model);
    removed(el: HTMLElement);

    Example:

    <lu>
      <li>Todos Header</li>
      <li data-each="todos: todo" data-bind="todo.description | added: todo.addedTodo | removed: todo.removedTodo"></li>
    </lu>

  @class EachBinder
  @implements Binder
  @namespace Binders
*/
export class EachBinder implements Binder
{
  private items: Element[] = [];
  private mappings: {[index: string]: Element;} = {};
  private viewModel: ViewModel;
  private parent: Element;
  
  private collection: Collection;
  private addedListener: (item: Model)=>void;
  private removedListener: (item: Model)=>void;
  private refreshListener: ()=>void;
  private updatedListener: (item: Model)=>void;
  private callbacks;
  private el;
  
  bind(el: Element, value: string, viewModel: ViewModel)
  {
    var match = value.match(/((?:\w+\.?\w+)+)\s*:\s*(\w+)/);
    
    if(!match){
      throw new Error("Syntax error in data-each:"+value);
    }
    
    var callbacksRegExp = /\|\s*(added|removed)\s*:\s*(\w+)/g;
    var callbacks: Callbacks = this.callbacks = {};
    var matchArr;
    while(matchArr = callbacksRegExp.exec(value)){
      callbacks[matchArr[1]] = 
        viewModel.resolveContext([matchArr[2]]) || Util.noop;
    }
    
    var
      mappings = this.mappings,
      nextSibling = el.nextSibling || null,
      keyPath = makeKeypathArray(match[1]),
      collection = <Collection> viewModel.resolveContext(keyPath),
      itemContextName = match[2];
      
    var parent = this.parent = <Element> el.parentNode;
      
    this.viewModel = viewModel;
      
    //
    // Use createDocumentFragment http://ejohn.org/blog/dom-documentfragments/
    // Basically, first add all items to the fragment, then add the fragment.
    // 
    if(collection instanceof Container){
      this.collection = collection;
      
      parent.removeChild(el);
      
      this.el = el.cloneNode(true);
      
      el.removeAttribute('data-each');
      el.removeAttribute('id');
      
      var attachNode = (node: Node, nextSibling: Element, item) => {
        if(nextSibling){
          parent.insertBefore(node, nextSibling)
        }else{
          parent.appendChild(node);
        }
        callbacks.added && callbacks.added(node, item);
      }

      var addNode = (item, nextSibling) => {
        var 
          id = item.id(),
          existingNode = mappings[id];

        if(existingNode){
          var oldChild = parent.removeChild(existingNode);
          attachNode(oldChild, nextSibling, item);
        }else{
          var 
            itemNode = <Element> el.cloneNode(true),
            modelListener = (newId) => {
              if(!(newId in mappings)){ // This check is necessary to avoid side-effects.
                delete mappings[id];
                mappings[newId] = itemNode;
                setAttr(itemNode, 'data-item', newId);
              }
            };

          item.retain();

          setAttr(itemNode, 'data-item', id);
          mappings[id] = itemNode;

          attachNode(itemNode, nextSibling, item);

          var context = {};
          context[itemContextName] = item;

          viewModel.pushContext(context);
          itemNode['gnd-bindings'] = viewModel.bindNode(itemNode);
          viewModel.popContext();

          item.on('id', modelListener);

          // Save for unbinding later.
          itemNode['gnd-obj'] = item;
          itemNode['gnd-listener'] = modelListener;
        }
      }

      var update = (item: Model) => {
        var id = item.id();
        var el = mappings[id];

        if(collection.isFiltered(item)){
          // Find new pos.
          var items = collection.getItems();
          var i, j;
          var nextItem = null;
          for(i=0; i<items.length; i++){
            if(items[i] === item){
              for(j=i+1; j<items.length;j++){
                if(collection.isFiltered(items[j])){
                  nextItem = mappings[items[j].id()] || null;
                  if(nextItem) break;
                }
              }
              break;
            }
          }

          nextItem = nextItem || nextSibling;
          if(el){
            parent.insertBefore(el, nextItem);
          }else{
            addNode(item, nextItem);
          }
        }else if(el){
          this.removeNode(id);
        }
      }
      
      var refresh = () => {
        collection.filtered((err: Error, models?: Model[]) => {
          if(!err){
            _.each(models, (model) => {
              update(model);
            });
          }
        });
      }

      refresh();
      
      this.addedListener = (item: Model) => {
        if(collection.isFiltered(item)){
          addNode(item, nextSibling);
        }
      }

      this.removedListener = (item: Model) => {
        if(mappings[item.id()]){
          this.removeNode(item.id());
        }
      }

      this.refreshListener = refresh;
      this.updatedListener = update;

      collection
        .on('added:', this.addedListener)
        .on('removed:', this.removedListener)
        .on('filterFn sorted:', this.refreshListener)
        .on('updated: inserted:', this.updatedListener);
    }else{
      log("Warning: not found a valid collection: ", match[1]);
    }
  }

  unbind(){
    this.collection.off('added:', this.addedListener);
    this.collection.off('removed:', this.removedListener);
    this.collection.off('filterFn sorted:', this.refreshListener);
    this.collection.off('updated: inserted:', this.updatedListener);

    this.removeNodes();
    
    this.parent.appendChild(this.el);
  }
  
  private removeNode(id: string)
  {
    var 
      node = this.mappings[id],
      item = node['gnd-obj'];
    
    this.viewModel.cleanup(node['gnd-bindings']);
    item.off('id', node['gnd-listener']);
    item.release();
    
    delete node['gnd-obj'];
    delete node['gnd-listener'];
    delete node['gnd-bindings'];
    
    // TODO: in order to support animations, the remove callback
    // should have a done callback as last parameter...
    this.callbacks.removed && this.callbacks.removed(node);
    
    this.parent.removeChild(node);
    delete this.mappings[id];
  }
  
  private removeNodes()
  {
    for(var id in this.mappings){
      this.removeNode(id);
    }
  }
}

}